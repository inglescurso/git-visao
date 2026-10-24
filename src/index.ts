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

      // 7. Register / Summarize Repository
      if (request.method === 'POST' && pathname === '/api/repos') {
        let body: {
          repo?: string;
          password?: string;
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

        const rawRepo = body.repo || '';
        const parsed = safeParseRepo(rawRepo);
        if (!parsed) {
          return jsonResponse(
            {
              ok: false,
              error:
                'Repositório inválido. Use o formato owner/repo ou a URL completa do GitHub.'
            },
            400
          );
        }

        const { settings, effectiveEnv } = await loadEffectiveContext(env);
        const existing = await findRepoByKey(env.DB, parsed.repoKey, env);

        // If already cataloged in D1 and not forcing regeneration, return immediately without requiring password
        if (existing && !body.force) {
          return jsonResponse({
            ok: true,
            cached: true,
            message: 'Repositório já cadastrado no catálogo!',
            repo: existing
          });
        }

        // New repository or forced regeneration requires Admin Password
        const providedPassword = extractAdminPassword(request, body.password);
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
                'Senha de administrador inválida ou ausente. Para cadastrar um novo repositório ou regerar resumo via IA, informe a senha correta.'
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
