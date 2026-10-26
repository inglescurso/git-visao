import { generateRepoVisaoSummary } from './ai.ts';
import { extractAdminPassword, verifyAdminPassword } from './auth.ts';
import {
  deleteRepository,
  ensureDatabaseInitialized,
  findRepoByKey,
  getRuntimeSettings,
  listRepositories,
  saveRuntimeSettings,
  type RuntimeSettingsUpdates,
  upsertRepository
} from './db.ts';
import { fetchGitHubRepoMetadata, parseGitHubRepoInput } from './github.ts';
import { CATEGORIES, TEMPLATE_VARIATIONS } from './templates.ts';
import type { Env, RuntimeSettings, TemplateType } from './types.ts';
import { renderAppHtml } from './ui.ts';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Password'
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS
    }
  });
}

function safeParseRepo(input: string) {
  try {
    return parseGitHubRepoInput(input);
  } catch {
    return null;
  }
}

function maskSecret(secret: string): string {
  const clean = (secret || '').trim();
  if (!clean) return '';
  if (clean.length <= 8) return '****';
  return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

function buildPublicSettingsView(settings: RuntimeSettings) {
  return {
    usingDefaultPassword: settings.usingDefaultPassword,
    publicAppTitle: settings.publicAppTitle,
    omnirouteBaseUrl: settings.omnirouteBaseUrl,
    omnirouteModel: settings.omnirouteModel,
    hasOmnirouteApiKey: Boolean(settings.omnirouteApiKey),
    omnirouteApiKeyMasked: maskSecret(settings.omnirouteApiKey),
    hasGithubToken: Boolean(settings.githubToken),
    githubTokenMasked: maskSecret(settings.githubToken)
  };
}

async function loadEffectiveContext(env: Env): Promise<{
  settings: RuntimeSettings;
  effectiveEnv: Env;
}> {
  await ensureDatabaseInitialized(env.DB, env);
  const settings = await getRuntimeSettings(env.DB, env);
  const effectiveEnv: Env = {
    ...env,
    ADMIN_PASSWORD: settings.adminPassword,
    OMNIROUTE_BASE_URL: settings.omnirouteBaseUrl,
    OMNIROUTE_API_KEY: settings.omnirouteApiKey,
    OMNIROUTE_MODEL: settings.omnirouteModel,
    GITHUB_TOKEN: settings.githubToken,
    PUBLIC_APP_TITLE: settings.publicAppTitle
  };
  return { settings, effectiveEnv };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    try {
      // 1. Frontend SPA
      if (request.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
        let effectiveEnv = env;
        if (env.DB) {
          try {
            const ctx = await loadEffectiveContext(env);
            effectiveEnv = ctx.effectiveEnv;
          } catch {
            // Fallback to raw env if DB is not ready during static HTML render
          }
        }
        return new Response(renderAppHtml(effectiveEnv), {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...CORS_HEADERS
          }
        });
      }

      // 2. Healthcheck & Config Metadata
      if (request.method === 'GET' && pathname === '/api/health') {
        const { settings } = await loadEffectiveContext(env);
        return jsonResponse({
          ok: true,
          database: 'connected',
          omnirouteConfigured: Boolean(
            settings.omnirouteBaseUrl && settings.omnirouteApiKey
          ),
          omnirouteBaseUrl: settings.omnirouteBaseUrl ? '(configurado)' : '',
          omnirouteModel: settings.omnirouteModel || 'gemini-2.5-flash',
          githubTokenConfigured: Boolean(settings.githubToken),
          adminProtected: Boolean(settings.adminPassword),
          usingDefaultPassword: settings.usingDefaultPassword,
          publicAppTitle: settings.publicAppTitle,
          categories: CATEGORIES,
          templates: Object.values(TEMPLATE_VARIATIONS)
        });
      }

      // 3. Get Runtime Settings (Admin Only)
      if (request.method === 'GET' && pathname === '/api/settings') {
        const { settings } = await loadEffectiveContext(env);
        const providedPassword = extractAdminPassword(request);
        const isAuthorized = await verifyAdminPassword(
          providedPassword,
          settings.adminPassword
        );

        if (!isAuthorized) {
          return jsonResponse(
            {
              ok: false,
              requiresPassword: true,
              error: 'Senha de administrador inválida ou ausente para visualizar configurações.'
            },
            401
          );
        }

        const view = buildPublicSettingsView(settings);
        return jsonResponse({
          ok: true,
          ...view,
          settings: view
        });
      }

      // 4. Save Runtime Settings in D1 (Admin Only - survives GitHub Sync Fork)
      if (
        (request.method === 'POST' || request.method === 'PUT') &&
        pathname === '/api/settings'
      ) {
        let body: {
          currentPassword?: string;
          password?: string;
          newPassword?: string;
          adminPassword?: string;
          omnirouteBaseUrl?: string;
          omnirouteApiKey?: string;
          omnirouteModel?: string;
          githubToken?: string;
          publicAppTitle?: string;
          clearOmnirouteApiKey?: boolean;
          clearGithubToken?: boolean;
        } = {};

        try {
          body = (await request.json()) as typeof body;
        } catch {
          return jsonResponse(
            { ok: false, error: 'Corpo da requisição JSON inválido.' },
            400
          );
        }

        const { settings } = await loadEffectiveContext(env);
        const providedPassword = extractAdminPassword(
          request,
          body.currentPassword || body.password
        );
        const isAuthorized = await verifyAdminPassword(
          providedPassword,
          settings.adminPassword
        );

        if (!isAuthorized) {
          return jsonResponse(
            {
              ok: false,
              requiresPassword: true,
              error: 'Senha de administrador atual inválida.'
            },
            401
          );
        }

        const updates: Partial<RuntimeSettingsUpdates> = {};

        const candidateNewPassword =
          typeof body.newPassword === 'string' && body.newPassword.trim()
            ? body.newPassword.trim()
            : typeof body.adminPassword === 'string' && body.adminPassword.trim()
              ? body.adminPassword.trim()
              : '';

        if (candidateNewPassword) {
          updates.adminPassword = candidateNewPassword;
        }

        if (typeof body.omnirouteBaseUrl === 'string') {
          updates.omnirouteBaseUrl = body.omnirouteBaseUrl.trim();
        }

        if (body.clearOmnirouteApiKey === true) {
          updates.omnirouteApiKey = '';
        } else if (
          typeof body.omnirouteApiKey === 'string' &&
          body.omnirouteApiKey.trim() &&
          !body.omnirouteApiKey.includes('...')
        ) {
          updates.omnirouteApiKey = body.omnirouteApiKey.trim();
        }

        if (typeof body.omnirouteModel === 'string' && body.omnirouteModel.trim()) {
          updates.omnirouteModel = body.omnirouteModel.trim();
        }

        if (body.clearGithubToken === true) {
          updates.githubToken = '';
        } else if (
          typeof body.githubToken === 'string' &&
          body.githubToken.trim() &&
          !body.githubToken.includes('...')
        ) {
          updates.githubToken = body.githubToken.trim();
        }

        if (typeof body.publicAppTitle === 'string' && body.publicAppTitle.trim()) {
          updates.publicAppTitle = body.publicAppTitle.trim();
        }

        await saveRuntimeSettings(env.DB, updates, env);
        const updatedSettings = await getRuntimeSettings(env.DB, env);
        const view = buildPublicSettingsView(updatedSettings);

        return jsonResponse({
          ok: true,
          message:
            'Configurações salvas no banco D1! Elas estão protegidas mesmo se você atualizar o fork pelo GitHub.',
          ...view,
          settings: view
        });
      }

      // 5. List & Search Repositories
      if (request.method === 'GET' && pathname === '/api/repos') {
        await loadEffectiveContext(env);
        const sortParam = searchParams.get('sort');
        const sort =
          sortParam === 'stars' || sortParam === 'name' || sortParam === 'recent'
            ? sortParam
            : 'recent';

        const limitParam = searchParams.get('limit');
        const limit = limitParam ? Number(limitParam) : 30;
        const cursor = searchParams.get('cursor') || undefined;

        const data = await listRepositories(env.DB, {
          q: searchParams.get('q') || undefined,
          category: searchParams.get('category') || undefined,
          templateType:
            searchParams.get('template') || searchParams.get('templateType') || undefined,
          sort,
          limit,
          cursor
        });

        return jsonResponse({
          ok: true,
          ...data
        });
      }

      // 6. Open Check Endpoint (100% public, no password required)
      if (request.method === 'GET' && pathname === '/api/check') {
        const rawRepo = searchParams.get('repo') || '';
        const parsed = safeParseRepo(rawRepo);
        if (!parsed) {
          return jsonResponse(
            {
              ok: false,
              error:
                'Informe um repositório GitHub válido (ex: owner/repo ou https://github.com/owner/repo).'
            },
            400
          );
        }

        await loadEffectiveContext(env);
        const existing = await findRepoByKey(env.DB, parsed.repoKey, env);

        return jsonResponse({
          ok: true,
          exists: Boolean(existing),
          parsed,
          repo: existing
        });
      }

      // 7.0. Telegram Webhook Nativo (para canal https://t.me/mundoautomatik ou bots)
      if (request.method === 'POST' && pathname === '/api/telegram-webhook') {
        let update: any = {};
        try {
          update = await request.json();
        } catch {
          return jsonResponse({ ok: false, error: 'Payload JSON inválido.' }, 400);
        }

        const msg = update.channel_post || update.message || update.edited_channel_post;
        if (!msg) {
          return jsonResponse({ ok: true, ignored: true, message: 'Nenhum post/mensagem recebida no update.' });
        }

        let rawText = (typeof msg.text === 'string' ? msg.text : '') || (typeof msg.caption === 'string' ? msg.caption : '');
        const entities = Array.isArray(msg.entities) ? msg.entities : Array.isArray(msg.caption_entities) ? msg.caption_entities : [];
        for (const ent of entities) {
          if (ent && ent.type === 'text_link' && typeof ent.url === 'string') {
            rawText += ` ${ent.url}`;
          }
        }

        const parsed = safeParseRepo(rawText);
        if (!parsed) {
          return jsonResponse({ ok: true, ignored: true, message: 'Nenhum repositório do GitHub identificado no post.' });
        }

        const { effectiveEnv } = await loadEffectiveContext(env);
        const existing = await findRepoByKey(env.DB, parsed.repoKey, env);
        let saved = existing;

        if (!existing) {
          const meta = await fetchGitHubRepoMetadata(parsed.fullName, effectiveEnv.GITHUB_TOKEN);
          const summary = await generateRepoVisaoSummary(meta, effectiveEnv);
          saved = await upsertRepository(env.DB, meta, summary, env);
        }

        const originUrl = url.origin || 'https://vision.24hs.eu.org';
        const catalogUrl = `${originUrl}/?q=${encodeURIComponent(parsed.fullName)}`;
        const resAny = saved as any;

        return jsonResponse({
          ok: true,
          cached: Boolean(existing),
          message: existing ? 'Repositório já existia no catálogo.' : 'Novo repositório catalogado com sucesso via Telegram!',
          fullName: saved.fullName || resAny.full_name,
          catalogUrl,
          whatsappText: resAny.whatsappText || resAny.whatsapp_text || '',
          repo: saved
        });
      }

      // 7. Register / Summarize Repository (Porta de Entrada Pública & Webhooks para Bots)
      if (
        request.method === 'POST' &&
        (pathname === '/api/repos' || pathname === '/api/webhook' || pathname === '/api/ingest')
      ) {
        let body: {
          repo?: string;
          url?: string;
          link?: string;
          text?: string;
          message?: string;
          password?: string;
          token?: string;
          apiKey?: string;
          key?: string;
          templateType?: TemplateType;
          force?: boolean;
        } = {};

        try {
          body = (await request.json()) as typeof body;
        } catch {
          return jsonResponse(
            { ok: false, error: 'Corpo da requisição JSON inválido.' },
            400
          );
        }

        const rawRepo =
          body.repo ||
          body.url ||
          body.link ||
          body.text ||
          body.message ||
          searchParams.get('repo') ||
          searchParams.get('url') ||
          '';
        const parsed = safeParseRepo(rawRepo);
        if (!parsed) {
          return jsonResponse(
            {
              ok: false,
              error:
                'Repositório ou link do GitHub não encontrado. Envie um formato válido (ex: owner/repo, https://github.com/owner/repo ou mensagem contendo o link).'
            },
            400
          );
        }

        const { settings, effectiveEnv } = await loadEffectiveContext(env);
        const existing = await findRepoByKey(env.DB, parsed.repoKey, env);
        const originUrl = url.origin || 'https://vision.24hs.eu.org';
        const catalogUrl = `${originUrl}/?q=${encodeURIComponent(parsed.fullName)}`;

        // Se já cadastrado no D1 e não está forçando regeração, retorna cache imediatamente (não precisa de senha)
        if (existing && !body.force) {
          const exAny = existing as any;
          const whatsappText = exAny.whatsappText || exAny.whatsapp_text || '';
          const hookTitle = exAny.hookTitle || exAny.hook_title || '';
          const licenseBadge = exAny.licenseBadge || exAny.license_badge || 'Open Source';
          const costBadge = exAny.costBadge || exAny.cost_badge || '100% Grátis';
          const deployBadge = exAny.deployBadge || exAny.deploy_badge || 'Fácil';

          return jsonResponse({
            ok: true,
            cached: true,
            message: 'Repositório já cadastrado no catálogo!',
            fullName: existing.fullName || exAny.full_name,
            repoKey: existing.repoKey || exAny.repo_key,
            catalogUrl,
            whatsappText,
            hookTitle,
            category: existing.category,
            stars: existing.stars,
            licenseBadge,
            costBadge,
            deployBadge,
            repo: existing
          });
        }

        // Repositório inédito ou regeração forçada requer autenticação (Senha/Token/API Key)
        const candidateSecret = body.password || body.token || body.apiKey || body.key;
        const providedPassword = extractAdminPassword(request, candidateSecret);
        const isAuthorized = await verifyAdminPassword(
          providedPassword,
          settings.adminPassword
        );
        if (!isAuthorized) {
          return jsonResponse(
            {
              ok: false,
              requiresPassword: true,
              error:
                'Senha de administrador ou API Key inválida/ausente. Passe no Header (Authorization: Bearer <senha>, X-API-Key ou X-Admin-Password), no corpo JSON ou na URL (?key=<senha>).'
            },
            401
          );
        }

        const meta = await fetchGitHubRepoMetadata(
          parsed.fullName,
          effectiveEnv.GITHUB_TOKEN
        );
        const summary = await generateRepoVisaoSummary(
          meta,
          effectiveEnv,
          body.templateType
        );
        const saved = await upsertRepository(env.DB, meta, summary, env);

        return jsonResponse({
          ok: true,
          cached: false,
          message: 'Repositório catalogado e resumido com sucesso!',
          fullName: saved.fullName,
          repoKey: saved.repoKey,
          catalogUrl,
          whatsappText: saved.whatsappText,
          hookTitle: saved.hookTitle,
          category: saved.category,
          stars: saved.stars,
          licenseBadge: saved.licenseBadge,
          costBadge: saved.costBadge,
          deployBadge: saved.deployBadge,
          repo: saved
        });
      }

      // 8. Delete Repository (Admin Only)
      if (request.method === 'DELETE' && pathname.startsWith('/api/repos/')) {
        const parts = pathname.replace(/^\/api\/repos\//, '').split('/').filter(Boolean);
        if (parts.length < 2) {
          return jsonResponse(
            { ok: false, error: 'Informe owner e name na rota /api/repos/:owner/:name.' },
            400
          );
        }

        const repoKey = `${decodeURIComponent(parts[0])}/${decodeURIComponent(parts[1])}`.toLowerCase();
        const { settings } = await loadEffectiveContext(env);
        const providedPassword = extractAdminPassword(request);
        const isAuthorized = await verifyAdminPassword(
          providedPassword,
          settings.adminPassword
        );

        if (!isAuthorized) {
          return jsonResponse(
            {
              ok: false,
              requiresPassword: true,
              error: 'Senha de administrador inválida para excluir repositório.'
            },
            401
          );
        }

        const deleted = await deleteRepository(env.DB, repoKey, env);
        if (!deleted) {
          return jsonResponse(
            { ok: false, error: 'Repositório não encontrado no catálogo.' },
            404
          );
        }

        return jsonResponse({
          ok: true,
          deleted: true,
          repoKey
        });
      }

      return jsonResponse({ ok: false, error: 'Rota não encontrada.' }, 404);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro interno no Worker.';
      return jsonResponse({ ok: false, error: message }, 500);
    }
  }
};
