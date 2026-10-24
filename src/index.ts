import { generateRepoVisaoSummary } from './ai.ts';
import { extractAdminPassword, verifyAdminPassword } from './auth.ts';
import {
  deleteRepository,
  ensureDatabaseInitialized,
  findRepoByKey,
  listRepositories,
  upsertRepository
} from './db.ts';
import { fetchGitHubRepoMetadata, parseGitHubRepoInput } from './github.ts';
import { CATEGORIES, TEMPLATE_VARIATIONS } from './templates.ts';
import type { Env, TemplateType } from './types.ts';
import { renderAppHtml } from './ui.ts';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
        return new Response(renderAppHtml(env), {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...CORS_HEADERS
          }
        });
      }

      // 2. Healthcheck & Config Metadata
      if (request.method === 'GET' && pathname === '/api/health') {
        await ensureDatabaseInitialized(env.DB);
        return jsonResponse({
          ok: true,
          database: 'connected',
          omnirouteConfigured: Boolean(env.OMNIROUTE_BASE_URL && env.OMNIROUTE_API_KEY),
          omnirouteModel: env.OMNIROUTE_MODEL || 'omniroute/auto',
          adminProtected: Boolean(env.ADMIN_PASSWORD),
          categories: CATEGORIES,
          templates: Object.values(TEMPLATE_VARIATIONS)
        });
      }

      // 3. List & Search Repositories
      if (request.method === 'GET' && pathname === '/api/repos') {
        await ensureDatabaseInitialized(env.DB);
        const sortParam = searchParams.get('sort');
        const sort =
          sortParam === 'stars' || sortParam === 'name' || sortParam === 'recent'
            ? sortParam
            : 'recent';

        const limitParam = searchParams.get('limit');
        const limit = limitParam ? Number(limitParam) : undefined;

        const data = await listRepositories(env.DB, {
          q: searchParams.get('q') || undefined,
          category: searchParams.get('category') || undefined,
          templateType:
            searchParams.get('template') || searchParams.get('templateType') || undefined,
          sort,
          limit
        });

        return jsonResponse({
          ok: true,
          ...data
        });
      }

      // 4. Open Check Endpoint (100% public, no password required)
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

        await ensureDatabaseInitialized(env.DB);
        const existing = await findRepoByKey(env.DB, parsed.repoKey);

        return jsonResponse({
          ok: true,
          exists: Boolean(existing),
          parsed,
          repo: existing
        });
      }

      // 5. Register / Summarize Repository
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

        await ensureDatabaseInitialized(env.DB);
        const existing = await findRepoByKey(env.DB, parsed.repoKey);

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
        const isAuthorized = await verifyAdminPassword(providedPassword, env.ADMIN_PASSWORD);
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

        const meta = await fetchGitHubRepoMetadata(parsed.fullName, env.GITHUB_TOKEN);
        const summary = await generateRepoVisaoSummary(meta, env, body.templateType);
        const saved = await upsertRepository(env.DB, meta, summary);

        return jsonResponse({
          ok: true,
          cached: false,
          message: 'Repositório catalogado e resumido com sucesso!',
          repo: saved
        });
      }

      // 6. Delete Repository (Admin Only)
      if (request.method === 'DELETE' && pathname.startsWith('/api/repos/')) {
        const parts = pathname.replace(/^\/api\/repos\//, '').split('/').filter(Boolean);
        if (parts.length < 2) {
          return jsonResponse(
            { ok: false, error: 'Informe owner e name na rota /api/repos/:owner/:name.' },
            400
          );
        }

        const repoKey = `${decodeURIComponent(parts[0])}/${decodeURIComponent(parts[1])}`.toLowerCase();
        const providedPassword = extractAdminPassword(request);
        const isAuthorized = await verifyAdminPassword(providedPassword, env.ADMIN_PASSWORD);

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

        await ensureDatabaseInitialized(env.DB);
        const deleted = await deleteRepository(env.DB, repoKey);
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
