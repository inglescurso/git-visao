import test from 'node:test';
import assert from 'node:assert/strict';

import { parseGitHubRepoInput } from '../src/github.ts';
import {
  TEMPLATE_VARIATIONS,
  buildWhatsAppText,
  detectCategory,
  detectTemplateType,
  formatDatePtBr,
  formatStarsPtBr
} from '../src/templates.ts';
import { generateFallbackSummary } from '../src/ai.ts';
import { extractAdminPassword, verifyAdminPassword } from '../src/auth.ts';
import worker from '../src/index.ts';
import type { Env, GitHubRepoMetadata, RepoRecord } from '../src/types.ts';

function createInMemoryD1(): D1Database {
  const rows = new Map<string, RepoRecord>();
  const settings = new Map<string, string>();
  let autoId = 1;

  function buildPreparedStatement(sql: string, boundArgs: unknown[] = []) {
    const normalizedSql = sql.replace(/\s+/g, ' ').trim();

    return {
      bind(...args: unknown[]) {
        return buildPreparedStatement(sql, args);
      },

      async run() {
        if (
          normalizedSql.startsWith('CREATE TABLE') ||
          normalizedSql.startsWith('CREATE INDEX')
        ) {
          return { success: true, meta: {} };
        }

        if (normalizedSql.includes('INTO app_settings')) {
          const isIgnore = normalizedSql.startsWith('INSERT OR IGNORE');
          const key = String(boundArgs[0] ?? '');
          const value = String(boundArgs[1] ?? '');
          if (isIgnore && settings.has(key)) {
            return { success: true, meta: { changes: 0 } };
          }
          if (key) {
            settings.set(key, value);
          }
          return { success: true, meta: { changes: 1 } };
        }

        if (
          normalizedSql.startsWith('INSERT OR IGNORE INTO repositories') ||
          normalizedSql.startsWith('INSERT INTO repositories')
        ) {
          const isIgnore = normalizedSql.startsWith('INSERT OR IGNORE');
          const repoKey = String(boundArgs[0] || '').toLowerCase();
          if (isIgnore && rows.has(repoKey)) {
            return { success: true, meta: { changes: 0 } };
          }

          const existing = rows.get(repoKey);
          const now = new Date().toISOString();
          const record: RepoRecord = {
            id: existing ? existing.id : autoId++,
            repo_key: repoKey,
            full_name: String(boundArgs[1] ?? ''),
            owner: String(boundArgs[2] ?? ''),
            name: String(boundArgs[3] ?? ''),
            repo_url: String(boundArgs[4] ?? ''),
            description: String(boundArgs[5] ?? ''),
            stars: Number(boundArgs[6] ?? 0),
            forks: Number(boundArgs[7] ?? 0),
            language: String(boundArgs[8] ?? ''),
            topics_json: String(boundArgs[9] ?? '[]'),
            last_commit_at: String(boundArgs[10] ?? ''),
            category: boundArgs[11] as RepoRecord['category'],
            template_type: boundArgs[12] as RepoRecord['template_type'],
            hook_title: String(boundArgs[13] ?? ''),
            intro_text: String(boundArgs[14] ?? ''),
            warning_note: String(boundArgs[15] ?? ''),
            features_json: String(boundArgs[16] ?? '[]'),
            scenario_title: String(boundArgs[17] ?? ''),
            scenario_intro: String(boundArgs[18] ?? ''),
            scenario_prompt: String(boundArgs[19] ?? ''),
            scenario_steps_json: String(boundArgs[20] ?? '[]'),
            scenario_outro: String(boundArgs[21] ?? ''),
            killer_title: String(boundArgs[22] ?? ''),
            killer_text: String(boundArgs[23] ?? ''),
            summary_text: String(boundArgs[24] ?? ''),
            punchline: String(boundArgs[25] ?? ''),
            whatsapp_text: String(boundArgs[26] ?? ''),
            created_at: existing ? existing.created_at : now,
            updated_at: now
          };

          rows.set(repoKey, record);
          return { success: true, meta: { changes: 1 } };
        }

        if (normalizedSql.startsWith('DELETE FROM repositories WHERE repo_key = ?')) {
          const key = String(boundArgs[0] || '').toLowerCase();
          const deleted = rows.delete(key);
          return { success: true, meta: { changes: deleted ? 1 : 0 } };
        }

        return { success: true, meta: {} };
      },

      async first<T = unknown>(): Promise<T | null> {
        if (normalizedSql.includes('SELECT COUNT(*) as total FROM repositories')) {
          return { total: rows.size } as unknown as T;
        }

        if (normalizedSql.includes('FROM app_settings') && normalizedSql.includes('WHERE key = ?')) {
          const key = String(boundArgs[0] ?? '');
          if (!settings.has(key)) return null;
          return { key, value: settings.get(key)! } as unknown as T;
        }

        if (normalizedSql.startsWith('SELECT * FROM repositories WHERE repo_key = ?')) {
          const key = String(boundArgs[0] || '').toLowerCase();
          return (rows.get(key) ?? null) as unknown as T | null;
        }

        return null;
      },

      async all<T = unknown>(): Promise<{ results: T[]; success: boolean; meta: Record<string, unknown> }> {
        if (normalizedSql.includes('FROM app_settings')) {
          const results = Array.from(settings.entries()).map(([key, value]) => ({
            key,
            value
          })) as unknown as T[];
          return { results, success: true, meta: {} };
        }

        if (normalizedSql === 'SELECT category, template_type FROM repositories') {
          const results = Array.from(rows.values()).map((r) => ({
            category: r.category,
            template_type: r.template_type
          })) as unknown as T[];
          return { results, success: true, meta: {} };
        }

        if (normalizedSql.startsWith('SELECT * FROM repositories')) {
          let list = Array.from(rows.values());
          let argIndex = 0;

          if (normalizedSql.includes('LOWER(full_name) LIKE ?')) {
            const rawLike = String(boundArgs[argIndex] || '').replace(/^%|%$/g, '').toLowerCase();
            argIndex += 7;
            list = list.filter((r) => {
              const hay = [
                r.full_name,
                r.description,
                r.hook_title,
                r.intro_text,
                r.features_json,
                r.summary_text,
                r.topics_json
              ]
                .join(' ')
                .toLowerCase();
              return hay.includes(rawLike);
            });
          }

          if (normalizedSql.includes('category = ?')) {
            const cat = String(boundArgs[argIndex++] || '');
            list = list.filter((r) => r.category === cat);
          }

          if (normalizedSql.includes('template_type = ?')) {
            const tpl = String(boundArgs[argIndex++] || '');
            list = list.filter((r) => r.template_type === tpl);
          }

          if (normalizedSql.includes('ORDER BY stars DESC')) {
            list.sort((a, b) => b.stars - a.stars);
          } else if (normalizedSql.includes('ORDER BY full_name ASC')) {
            list.sort((a, b) => a.full_name.localeCompare(b.full_name));
          } else {
            list.sort((a, b) => b.id - a.id);
          }

          const limitArg = Number(boundArgs[argIndex] ?? 100);
          if (Number.isFinite(limitArg) && limitArg > 0) {
            list = list.slice(0, limitArg);
          }

          return { results: list as unknown as T[], success: true, meta: {} };
        }

        return { results: [], success: true, meta: {} };
      }
    };
  }

  return {
    prepare(sql: string) {
      return buildPreparedStatement(sql);
    }
  } as unknown as D1Database;
}

test('1. parseGitHubRepoInput faz parse de diferentes formatos de URL do GitHub', () => {
  const fullUrl = parseGitHubRepoInput('https://github.com/browseros-ai/BrowserOS');
  assert.ok(fullUrl);
  assert.equal(fullUrl.owner, 'browseros-ai');
  assert.equal(fullUrl.name, 'BrowserOS');
  assert.equal(fullUrl.repoKey, 'browseros-ai/browseros');
  assert.equal(fullUrl.repoUrl, 'https://github.com/browseros-ai/BrowserOS');

  const shortInput = parseGitHubRepoInput('ArnasDon/wacrm');
  assert.ok(shortInput);
  assert.equal(shortInput.fullName, 'ArnasDon/wacrm');
  assert.equal(shortInput.repoKey, 'arnasdon/wacrm');

  const gitSuffixAndBranch = parseGitHubRepoInput(
    'https://www.github.com/samucamg/veroroute-edge.git/tree/main?tab=readme#instalacao'
  );
  assert.ok(gitSuffixAndBranch);
  assert.equal(gitSuffixAndBranch.fullName, 'samucamg/veroroute-edge');
  assert.equal(gitSuffixAndBranch.repoKey, 'samucamg/veroroute-edge');

  assert.equal(parseGitHubRepoInput(''), null);
  assert.equal(parseGitHubRepoInput('apenas-um-nome'), null);
});

test('2. Detecção das 5 variações de template e formatação WhatsApp conforme INSTRUCOES.md', () => {
  assert.equal(formatStarsPtBr(14100), '14,1 mil');
  assert.equal(formatStarsPtBr(2600), '2,6 mil');
  assert.equal(formatStarsPtBr(12), '12');
  assert.equal(formatDatePtBr('2026-10-23T12:00:00Z'), '23/10/2026');

  const baseMeta: GitHubRepoMetadata = {
    repoKey: 'org/repo',
    fullName: 'org/repo',
    owner: 'org',
    name: 'repo',
    repoUrl: 'https://github.com/org/repo',
    description: '',
    stars: 14100,
    forks: 100,
    language: 'TypeScript',
    topics: [],
    lastCommitAt: '2026-10-23T00:00:00Z',
    readmeExcerpt: ''
  };

  assert.equal(
    detectTemplateType({ ...baseMeta, description: 'Autonomous AI agent with MCP server' }),
    'ai-agent-automation'
  );
  assert.equal(
    detectTemplateType({ ...baseMeta, description: 'Open source WhatsApp CRM self-hosted' }),
    'self-hosted-saas'
  );
  assert.equal(
    detectTemplateType({ ...baseMeta, description: 'Cloudflare Worker AI Gateway and failover proxy' }),
    'infra-gateway'
  );
  assert.equal(
    detectTemplateType({ ...baseMeta, description: 'TypeScript SDK library and CLI package for npm' }),
    'dev-lib-cli'
  );
  assert.equal(
    detectTemplateType({ ...baseMeta, description: 'Fast desktop note-taking productivity app' }),
    'app-tool'
  );

  // Valida que todas as 5 variações geram texto de WhatsApp no formato do INSTRUCOES.md
  const allTemplates = [
    'ai-agent-automation',
    'self-hosted-saas',
    'infra-gateway',
    'app-tool',
    'dev-lib-cli'
  ] as const;

  for (const tpl of allTemplates) {
    const summary = generateFallbackSummary(baseMeta, tpl);
    assert.equal(summary.templateType, tpl);
    assert.equal(summary.category, detectCategory(baseMeta, tpl));

    const text = buildWhatsAppText(baseMeta, summary);
    assert.ok(text.includes('🔗 https://github.com/org/repo'));
    assert.ok(text.includes('⭐ 14,1 mil estrelas no GitHub'));
    assert.ok(text.includes('🕒 Último commit em 23/10/2026'));
    assert.ok(text.includes('━━━━━━━━━━━━━━━━━━'));
    assert.ok(text.includes('1️⃣ '));
    assert.ok(text.includes(TEMPLATE_VARIATIONS[tpl].summaryHeader));
    assert.ok(text.includes('🚀 '));
  }
});

test('3. Autenticação de admin (verifyAdminPassword e extractAdminPassword)', async () => {
  assert.equal(await verifyAdminPassword('senha-correta-123', 'senha-correta-123'), true);
  assert.equal(await verifyAdminPassword('senha-errada', 'senha-correta-123'), false);
  assert.equal(await verifyAdminPassword('', 'senha-correta-123'), false);
  assert.equal(await verifyAdminPassword('senha-correta-123', ''), false);

  const reqWithHeader = new Request('https://example.com/api/repos', {
    method: 'POST',
    headers: { 'x-admin-password': 'secret-header-pass' }
  });
  assert.equal(extractAdminPassword(reqWithHeader, 'body-pass'), 'secret-header-pass');

  const reqWithBearer = new Request('https://example.com/api/repos', {
    method: 'POST',
    headers: { Authorization: 'Bearer bearer-token-pass' }
  });
  assert.equal(extractAdminPassword(reqWithBearer), 'bearer-token-pass');
});

test('4. Rotas da API do Worker (/api/health, /api/repos, /api/check e POST /api/repos com cache e senha)', async () => {
  const env: Env = {
    DB: createInMemoryD1(),
    ADMIN_PASSWORD: 'admin-visao-secret',
    OMNIROUTE_MODEL: 'gemini-2.5-flash',
    PUBLIC_APP_TITLE: 'GitVisão Teste'
  };

  // GET /api/health
  const healthRes = await worker.fetch(new Request('https://gitvisao.local/api/health'), env);
  assert.equal(healthRes.status, 200);
  const healthData = (await healthRes.json()) as { ok: boolean; database: string; categories: string[] };
  assert.equal(healthData.ok, true);
  assert.equal(healthData.database, 'connected');
  assert.equal(healthData.categories.length, 6);

  // GET /api/repos (deve conter os 5 repositórios iniciais do seed)
  const listRes = await worker.fetch(new Request('https://gitvisao.local/api/repos'), env);
  assert.equal(listRes.status, 200);
  const listData = (await listRes.json()) as { ok: boolean; total: number; items: Array<{ repo_key: string }> };
  assert.equal(listData.ok, true);
  assert.ok(listData.total >= 5);

  // GET /api/check para repositório que JÁ EXISTE no seed (BrowserOS)
  const checkExistingRes = await worker.fetch(
    new Request('https://gitvisao.local/api/check?repo=https://github.com/browseros-ai/BrowserOS'),
    env
  );
  assert.equal(checkExistingRes.status, 200);
  const checkExistingData = (await checkExistingRes.json()) as {
    ok: boolean;
    exists: boolean;
    repo: { full_name: string; whatsapp_text: string };
  };
  assert.equal(checkExistingData.ok, true);
  assert.equal(checkExistingData.exists, true);
  assert.equal(checkExistingData.repo.full_name, 'browseros-ai/BrowserOS');
  assert.ok(checkExistingData.repo.whatsapp_text.includes('BrowserOS'));

  // GET /api/check para repositório INÉDITO
  const checkNewRes = await worker.fetch(
    new Request('https://gitvisao.local/api/check?repo=owner-inedito/repo-inedito'),
    env
  );
  assert.equal(checkNewRes.status, 200);
  const checkNewData = (await checkNewRes.json()) as { ok: boolean; exists: boolean };
  assert.equal(checkNewData.ok, true);
  assert.equal(checkNewData.exists, false);

  // POST /api/repos para repositório JÁ EXISTENTE deve retornar cache (200) SEM exigir senha!
  const postCachedRes = await worker.fetch(
    new Request('https://gitvisao.local/api/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: 'ArnasDon/wacrm' })
    }),
    env
  );
  assert.equal(postCachedRes.status, 200);
  const postCachedData = (await postCachedRes.json()) as {
    ok: boolean;
    cached: boolean;
    repo: { repo_key: string };
  };
  assert.equal(postCachedData.ok, true);
  assert.equal(postCachedData.cached, true);
  assert.equal(postCachedData.repo.repo_key, 'arnasdon/wacrm');

  // POST /api/repos para repositório INÉDITO sem senha ou com senha errada deve retornar 401
  const postUnauthorizedRes = await worker.fetch(
    new Request('https://gitvisao.local/api/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: 'novo-org/novo-repo', password: 'senha-incorreta' })
    }),
    env
  );
  assert.equal(postUnauthorizedRes.status, 401);
  const postUnauthorizedData = (await postUnauthorizedRes.json()) as {
    ok: boolean;
    requiresPassword: boolean;
  };
  assert.equal(postUnauthorizedData.ok, false);
  assert.equal(postUnauthorizedData.requiresPassword, true);

  // POST /api/repos para repositório INÉDITO com senha correta (mockando fetch do GitHub)
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('api.github.com/repos/novo-org/novo-repo/commits')) {
      return new Response(
        JSON.stringify([{ commit: { committer: { date: '2026-10-24T10:00:00Z' } } }]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url.includes('api.github.com/repos/novo-org/novo-repo/readme')) {
      return new Response(
        '# Novo Repo\n- Integração rápida com agentes MCP\n- Execução segura local sem nuvem\n- Automação completa no navegador',
        { status: 200, headers: { 'Content-Type': 'text/plain' } }
      );
    }
    if (url.includes('api.github.com/repos/novo-org/novo-repo')) {
      return new Response(
        JSON.stringify({
          full_name: 'novo-org/novo-repo',
          name: 'novo-repo',
          owner: { login: 'novo-org' },
          html_url: 'https://github.com/novo-org/novo-repo',
          description: 'Agente autônomo de IA com suporte a MCP',
          stargazers_count: 3500,
          forks_count: 210,
          language: 'TypeScript',
          topics: ['ai-agent', 'mcp'],
          pushed_at: '2026-10-24T10:00:00Z'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('Not found', { status: 404 });
  };

  try {
    const postAuthorizedRes = await worker.fetch(
      new Request('https://gitvisao.local/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: 'https://github.com/novo-org/novo-repo',
          password: 'admin-visao-secret',
          templateType: 'ai-agent-automation'
        })
      }),
      env
    );
    assert.equal(postAuthorizedRes.status, 200);
    const postAuthorizedData = (await postAuthorizedRes.json()) as {
      ok: boolean;
      cached: boolean;
      repo: { repo_key: string; template_type: string; whatsapp_text: string };
    };
    assert.equal(postAuthorizedData.ok, true);
    assert.equal(postAuthorizedData.cached, false);
    assert.equal(postAuthorizedData.repo.repo_key, 'novo-org/novo-repo');
    assert.equal(postAuthorizedData.repo.template_type, 'ai-agent-automation');
    assert.ok(postAuthorizedData.repo.whatsapp_text.includes('3,5 mil estrelas no GitHub'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('5. Painel Zero-CLI (/api/settings): senha padrão "admin" inicial e persistência de senha + OmniRoute no D1', async () => {
  // Instalação limpa sem variáveis de ambiente (apenas banco D1)
  const cleanEnv: Env = {
    DB: createInMemoryD1()
  };

  // 1. Verifica que instalação limpa usa a senha padrão "admin" e omnirouteConfigured = false
  const initialHealthRes = await worker.fetch(
    new Request('https://gitvisao.local/api/health'),
    cleanEnv
  );
  assert.equal(initialHealthRes.status, 200);
  const initialHealth = (await initialHealthRes.json()) as {
    ok: boolean;
    usingDefaultPassword: boolean;
    omnirouteConfigured: boolean;
  };
  assert.equal(initialHealth.ok, true);
  assert.equal(initialHealth.usingDefaultPassword, true);
  assert.equal(initialHealth.omnirouteConfigured, false);

  // 2. Verifica que GET /api/settings aceita a senha padrão "admin"
  const getSettingsInitialRes = await worker.fetch(
    new Request('https://gitvisao.local/api/settings', {
      headers: { 'X-Admin-Password': 'admin' }
    }),
    cleanEnv
  );
  assert.equal(getSettingsInitialRes.status, 200);

  // 3. POST /api/settings autenticado com "admin" altera a senha para "minha-nova-senha" e configura OmniRoute no D1
  const updateSettingsRes = await worker.fetch(
    new Request('https://gitvisao.local/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: 'admin',
        newPassword: 'minha-nova-senha',
        omnirouteBaseUrl: 'https://omniroute.seudominio.com/v1',
        omnirouteApiKey: 'sk-omniroute-secret-9999',
        omnirouteModel: 'gemini-2.5-flash',
        publicAppTitle: 'GitVisão Custom D1'
      })
    }),
    cleanEnv
  );
  assert.equal(updateSettingsRes.status, 200);
  const updateSettingsData = (await updateSettingsRes.json()) as {
    ok: boolean;
    usingDefaultPassword: boolean;
    hasOmnirouteApiKey: boolean;
    omnirouteBaseUrl: string;
    publicAppTitle: string;
  };
  assert.equal(updateSettingsData.ok, true);
  assert.equal(updateSettingsData.usingDefaultPassword, false);
  assert.equal(updateSettingsData.hasOmnirouteApiKey, true);
  assert.equal(updateSettingsData.omnirouteBaseUrl, 'https://omniroute.seudominio.com/v1');
  assert.equal(updateSettingsData.publicAppTitle, 'GitVisão Custom D1');

  // 4. Verifica que a senha antiga "admin" passa a ser recusada (401)
  const oldPasswordRes = await worker.fetch(
    new Request('https://gitvisao.local/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: 'admin',
        publicAppTitle: 'Tentativa Inválida'
      })
    }),
    cleanEnv
  );
  assert.equal(oldPasswordRes.status, 401);

  // 5. Verifica que a nova senha "minha-nova-senha" passa a ser aceita (200)
  const newPasswordRes = await worker.fetch(
    new Request('https://gitvisao.local/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: 'minha-nova-senha',
        omnirouteModel: 'gemini-2.5-pro'
      })
    }),
    cleanEnv
  );
  assert.equal(newPasswordRes.status, 200);
  const newPasswordData = (await newPasswordRes.json()) as {
    ok: boolean;
    omnirouteModel: string;
  };
  assert.equal(newPasswordData.ok, true);
  assert.equal(newPasswordData.omnirouteModel, 'gemini-2.5-pro');

  // 6. Healthcheck reflete OmniRoute configurado e senha definitiva ativa
  const finalHealthRes = await worker.fetch(
    new Request('https://gitvisao.local/api/health'),
    cleanEnv
  );
  const finalHealth = (await finalHealthRes.json()) as {
    usingDefaultPassword: boolean;
    omnirouteConfigured: boolean;
    omnirouteModel: string;
  };
  assert.equal(finalHealth.usingDefaultPassword, false);
  assert.equal(finalHealth.omnirouteConfigured, true);
  assert.equal(finalHealth.omnirouteModel, 'gemini-2.5-pro');
});

