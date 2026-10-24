import { SEED_REPOSITORIES } from './seed.ts';
import type {
  Env,
  GeneratedVisaoSummary,
  GitHubRepoMetadata,
  RepoRecord,
  RuntimeSettings
} from './types.ts';

export interface RepoSearchFilters {
  q?: string;
  category?: string;
  templateType?: string;
  sort?: 'recent' | 'stars' | 'name';
  limit?: number;
}

export interface SerializedRepo
  extends Omit<RepoRecord, 'topics_json' | 'features_json' | 'scenario_steps_json'> {
  topics: string[];
  features: string[];
  scenario_steps: string[];
}

function safeParseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item));
    }
  } catch {
    // ignore malformed JSON
  }
  return [];
}

export function serializeRepoRecord(row: RepoRecord): SerializedRepo {
  const { topics_json, features_json, scenario_steps_json, ...rest } = row;
  return {
    ...rest,
    stars: Number(row.stars ?? 0),
    forks: Number(row.forks ?? 0),
    topics: safeParseStringArray(topics_json),
    features: safeParseStringArray(features_json),
    scenario_steps: safeParseStringArray(scenario_steps_json)
  };
}

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS repositories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_key TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    repo_url TEXT NOT NULL,
    description TEXT DEFAULT '',
    stars INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    language TEXT DEFAULT '',
    topics_json TEXT DEFAULT '[]',
    last_commit_at TEXT DEFAULT '',
    category TEXT NOT NULL,
    template_type TEXT NOT NULL,
    hook_title TEXT NOT NULL,
    intro_text TEXT NOT NULL,
    warning_note TEXT DEFAULT '',
    features_json TEXT NOT NULL,
    scenario_title TEXT NOT NULL,
    scenario_intro TEXT NOT NULL,
    scenario_prompt TEXT NOT NULL,
    scenario_steps_json TEXT NOT NULL,
    scenario_outro TEXT DEFAULT '',
    killer_title TEXT NOT NULL,
    killer_text TEXT NOT NULL,
    summary_text TEXT NOT NULL,
    punchline TEXT NOT NULL,
    whatsapp_text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
)`;

const CREATE_SETTINGS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
)`;

const CREATE_INDEXES_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_repositories_repo_key ON repositories(repo_key)',
  'CREATE INDEX IF NOT EXISTS idx_repositories_category ON repositories(category)',
  'CREATE INDEX IF NOT EXISTS idx_repositories_template_type ON repositories(template_type)',
  'CREATE INDEX IF NOT EXISTS idx_repositories_stars ON repositories(stars DESC)',
  'CREATE INDEX IF NOT EXISTS idx_repositories_created_at ON repositories(created_at DESC)'
];

export async function ensureDatabaseInitialized(db: D1Database): Promise<void> {
  await db.prepare(CREATE_TABLE_SQL).run();
  await db.prepare(CREATE_SETTINGS_TABLE_SQL).run();
  for (const indexSql of CREATE_INDEXES_SQL) {
    await db.prepare(indexSql).run();
  }

  const countRow = await db
    .prepare('SELECT COUNT(*) as total FROM repositories')
    .first<{ total: number }>();
  const total = Number(countRow?.total ?? 0);

  if (total === 0 && SEED_REPOSITORIES.length > 0) {
    const insertSql = `
      INSERT OR IGNORE INTO repositories (
        repo_key, full_name, owner, name, repo_url, description,
        stars, forks, language, topics_json, last_commit_at,
        category, template_type, hook_title, intro_text, warning_note,
        features_json, scenario_title, scenario_intro, scenario_prompt,
        scenario_steps_json, scenario_outro, killer_title, killer_text,
        summary_text, punchline, whatsapp_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const item of SEED_REPOSITORIES) {
      await db
        .prepare(insertSql)
        .bind(
          item.repo_key.trim().toLowerCase(),
          item.full_name,
          item.owner,
          item.name,
          item.repo_url,
          item.description || '',
          Number(item.stars ?? 0),
          Number(item.forks ?? 0),
          item.language || '',
          item.topics_json || '[]',
          item.last_commit_at || '',
          item.category,
          item.template_type,
          item.hook_title,
          item.intro_text,
          item.warning_note || '',
          item.features_json || '[]',
          item.scenario_title,
          item.scenario_intro,
          item.scenario_prompt,
          item.scenario_steps_json || '[]',
          item.scenario_outro || '',
          item.killer_title,
          item.killer_text,
          item.summary_text,
          item.punchline,
          item.whatsapp_text
        )
        .run();
    }
  }
}

export async function findRepoByKey(
  db: D1Database,
  repoKey: string
): Promise<SerializedRepo | null> {
  const normalizedKey = repoKey.trim().toLowerCase();
  if (!normalizedKey) return null;

  const row = await db
    .prepare('SELECT * FROM repositories WHERE repo_key = ? LIMIT 1')
    .bind(normalizedKey)
    .first<RepoRecord>();

  if (!row) return null;
  return serializeRepoRecord(row);
}

export async function listRepositories(
  db: D1Database,
  filters: RepoSearchFilters = {}
): Promise<{
  items: SerializedRepo[];
  total: number;
  byCategory: Record<string, number>;
  byTemplate: Record<string, number>;
}> {
  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (filters.q && filters.q.trim()) {
    const q = `%${filters.q.trim().toLowerCase()}%`;
    whereClauses.push(
      `(
        LOWER(full_name) LIKE ? OR
        LOWER(description) LIKE ? OR
        LOWER(hook_title) LIKE ? OR
        LOWER(intro_text) LIKE ? OR
        LOWER(features_json) LIKE ? OR
        LOWER(summary_text) LIKE ? OR
        LOWER(topics_json) LIKE ?
      )`
    );
    params.push(q, q, q, q, q, q, q);
  }

  if (
    filters.category &&
    filters.category.trim() &&
    filters.category !== 'all' &&
    filters.category !== 'Todas'
  ) {
    whereClauses.push('category = ?');
    params.push(filters.category.trim());
  }

  if (
    filters.templateType &&
    filters.templateType.trim() &&
    filters.templateType !== 'all' &&
    filters.templateType !== 'Todos'
  ) {
    whereClauses.push('template_type = ?');
    params.push(filters.templateType.trim());
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  let orderBySql = 'ORDER BY updated_at DESC, id DESC';
  if (filters.sort === 'stars') {
    orderBySql = 'ORDER BY stars DESC, updated_at DESC';
  } else if (filters.sort === 'name') {
    orderBySql = 'ORDER BY full_name ASC';
  }

  const limit = Math.min(Math.max(Number(filters.limit) || 100, 1), 500);
  const querySql = `SELECT * FROM repositories ${whereSql} ${orderBySql} LIMIT ?`;

  const result = await db
    .prepare(querySql)
    .bind(...params, limit)
    .all<RepoRecord>();

  const rows = result?.results ?? [];
  const items = rows.map(serializeRepoRecord);

  const allStatsResult = await db
    .prepare('SELECT category, template_type FROM repositories')
    .all<{ category: string; template_type: string }>();

  const byCategory: Record<string, number> = {};
  const byTemplate: Record<string, number> = {};

  for (const r of allStatsResult?.results ?? []) {
    if (r.category) {
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    }
    if (r.template_type) {
      byTemplate[r.template_type] = (byTemplate[r.template_type] || 0) + 1;
    }
  }

  return {
    items,
    total: items.length,
    byCategory,
    byTemplate
  };
}

export async function upsertRepository(
  db: D1Database,
  meta: GitHubRepoMetadata,
  summary: GeneratedVisaoSummary
): Promise<SerializedRepo> {
  const repoKey = (meta.repoKey || meta.fullName).trim().toLowerCase();
  const topicsJson = JSON.stringify(meta.topics ?? []);
  const featuresJson = JSON.stringify(summary.features ?? []);
  const scenarioStepsJson = JSON.stringify(summary.scenarioSteps ?? []);

  const sql = `
    INSERT INTO repositories (
      repo_key, full_name, owner, name, repo_url, description,
      stars, forks, language, topics_json, last_commit_at,
      category, template_type, hook_title, intro_text, warning_note,
      features_json, scenario_title, scenario_intro, scenario_prompt,
      scenario_steps_json, scenario_outro, killer_title, killer_text,
      summary_text, punchline, whatsapp_text, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(repo_key) DO UPDATE SET
      full_name = excluded.full_name,
      owner = excluded.owner,
      name = excluded.name,
      repo_url = excluded.repo_url,
      description = excluded.description,
      stars = excluded.stars,
      forks = excluded.forks,
      language = excluded.language,
      topics_json = excluded.topics_json,
      last_commit_at = excluded.last_commit_at,
      category = excluded.category,
      template_type = excluded.template_type,
      hook_title = excluded.hook_title,
      intro_text = excluded.intro_text,
      warning_note = excluded.warning_note,
      features_json = excluded.features_json,
      scenario_title = excluded.scenario_title,
      scenario_intro = excluded.scenario_intro,
      scenario_prompt = excluded.scenario_prompt,
      scenario_steps_json = excluded.scenario_steps_json,
      scenario_outro = excluded.scenario_outro,
      killer_title = excluded.killer_title,
      killer_text = excluded.killer_text,
      summary_text = excluded.summary_text,
      punchline = excluded.punchline,
      whatsapp_text = excluded.whatsapp_text,
      updated_at = datetime('now')
  `;

  await db
    .prepare(sql)
    .bind(
      repoKey,
      meta.fullName,
      meta.owner,
      meta.name,
      meta.repoUrl,
      meta.description || '',
      Number(meta.stars ?? 0),
      Number(meta.forks ?? 0),
      meta.language || '',
      topicsJson,
      meta.lastCommitAt || '',
      summary.category,
      summary.templateType,
      summary.hookTitle,
      summary.introText,
      summary.warningNote || '',
      featuresJson,
      summary.scenarioTitle,
      summary.scenarioIntro,
      summary.scenarioPrompt,
      scenarioStepsJson,
      summary.scenarioOutro || '',
      summary.killerTitle,
      summary.killerText,
      summary.summaryText,
      summary.punchline,
      summary.whatsappText
    )
    .run();

  const saved = await findRepoByKey(db, repoKey);
  if (!saved) {
    throw new Error(`Falha ao recuperar repositório salvo: ${repoKey}`);
  }
  return saved;
}

export async function deleteRepository(db: D1Database, repoKey: string): Promise<boolean> {
  const normalizedKey = repoKey.trim().toLowerCase();
  if (!normalizedKey) return false;

  const existing = await findRepoByKey(db, normalizedKey);
  if (!existing) {
    return false;
  }

  await db.prepare('DELETE FROM repositories WHERE repo_key = ?').bind(normalizedKey).run();
  return true;
}

export interface RuntimeSettingsUpdates {
  adminPassword?: string;
  omnirouteBaseUrl?: string;
  omnirouteApiKey?: string;
  omnirouteModel?: string;
  githubToken?: string;
  publicAppTitle?: string;
}

const SETTING_KEY_MAP: Record<keyof RuntimeSettingsUpdates, string> = {
  adminPassword: 'admin_password',
  omnirouteBaseUrl: 'omniroute_base_url',
  omnirouteApiKey: 'omniroute_api_key',
  omnirouteModel: 'omniroute_model',
  githubToken: 'github_token',
  publicAppTitle: 'public_app_title'
};

export async function saveRuntimeSettings(
  db: D1Database,
  updates: Partial<RuntimeSettingsUpdates>
): Promise<void> {
  await db.prepare(CREATE_SETTINGS_TABLE_SQL).run();

  const upsertSql = `
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = datetime('now')
  `;

  for (const [propKey, dbKey] of Object.entries(SETTING_KEY_MAP) as Array<
    [keyof RuntimeSettingsUpdates, string]
  >) {
    const val = updates[propKey];
    if (val !== undefined) {
      await db.prepare(upsertSql).bind(dbKey, String(val)).run();
    }
  }
}

export async function getRuntimeSettings(
  db: D1Database,
  env: Env
): Promise<RuntimeSettings> {
  await db.prepare(CREATE_SETTINGS_TABLE_SQL).run();

  const rowsResult = await db
    .prepare('SELECT key, value FROM app_settings')
    .all<{ key: string; value: string }>();

  const settingsMap = new Map<string, string>();
  for (const row of rowsResult?.results ?? []) {
    if (row && typeof row.key === 'string') {
      settingsMap.set(row.key, String(row.value ?? ''));
    }
  }

  const readKey = (...candidates: string[]): string | undefined => {
    for (const k of candidates) {
      if (settingsMap.has(k)) {
        return settingsMap.get(k);
      }
    }
    return undefined;
  };

  let dbAdminPassword = readKey('admin_password', 'adminPassword', 'ADMIN_PASSWORD');
  let dbOmnirouteBaseUrl = readKey(
    'omniroute_base_url',
    'omnirouteBaseUrl',
    'OMNIROUTE_BASE_URL'
  );
  let dbOmnirouteApiKey = readKey(
    'omniroute_api_key',
    'omnirouteApiKey',
    'OMNIROUTE_API_KEY'
  );
  let dbOmnirouteModel = readKey('omniroute_model', 'omnirouteModel', 'OMNIROUTE_MODEL');
  let dbGithubToken = readKey('github_token', 'githubToken', 'GITHUB_TOKEN');
  let dbPublicAppTitle = readKey(
    'public_app_title',
    'publicAppTitle',
    'PUBLIC_APP_TITLE'
  );

  // Auto-persist non-default env vars to D1 app_settings so Sync Fork on GitHub never wipes secrets
  const autoPersistUpdates: Partial<RuntimeSettingsUpdates> = {};

  const envAdminPassword = (env.ADMIN_PASSWORD || '').trim();
  if (
    dbAdminPassword === undefined &&
    envAdminPassword &&
    envAdminPassword !== 'admin'
  ) {
    autoPersistUpdates.adminPassword = envAdminPassword;
    dbAdminPassword = envAdminPassword;
  }

  const envOmnirouteBaseUrl = (env.OMNIROUTE_BASE_URL || '').trim();
  if (dbOmnirouteBaseUrl === undefined && envOmnirouteBaseUrl) {
    autoPersistUpdates.omnirouteBaseUrl = envOmnirouteBaseUrl;
    dbOmnirouteBaseUrl = envOmnirouteBaseUrl;
  }

  const envOmnirouteApiKey = (env.OMNIROUTE_API_KEY || '').trim();
  if (dbOmnirouteApiKey === undefined && envOmnirouteApiKey) {
    autoPersistUpdates.omnirouteApiKey = envOmnirouteApiKey;
    dbOmnirouteApiKey = envOmnirouteApiKey;
  }

  const envGithubToken = (env.GITHUB_TOKEN || '').trim();
  if (dbGithubToken === undefined && envGithubToken) {
    autoPersistUpdates.githubToken = envGithubToken;
    dbGithubToken = envGithubToken;
  }

  if (Object.keys(autoPersistUpdates).length > 0) {
    await saveRuntimeSettings(db, autoPersistUpdates);
  }

  const adminPassword =
    (dbAdminPassword && dbAdminPassword.trim()) ||
    envAdminPassword ||
    'admin';

  const omnirouteBaseUrl =
    dbOmnirouteBaseUrl !== undefined
      ? dbOmnirouteBaseUrl.trim()
      : envOmnirouteBaseUrl;

  const omnirouteApiKey =
    dbOmnirouteApiKey !== undefined
      ? dbOmnirouteApiKey.trim()
      : envOmnirouteApiKey;

  const omnirouteModel =
    (dbOmnirouteModel && dbOmnirouteModel.trim()) ||
    (env.OMNIROUTE_MODEL && env.OMNIROUTE_MODEL.trim()) ||
    'gemini-2.5-flash';

  const githubToken =
    dbGithubToken !== undefined
      ? dbGithubToken.trim()
      : envGithubToken;

  const publicAppTitle =
    (dbPublicAppTitle && dbPublicAppTitle.trim()) ||
    (env.PUBLIC_APP_TITLE && env.PUBLIC_APP_TITLE.trim()) ||
    'GitVisão • Catálogo Pega a Visão';

  return {
    adminPassword,
    usingDefaultPassword: adminPassword === 'admin',
    omnirouteBaseUrl,
    omnirouteApiKey,
    omnirouteModel,
    githubToken,
    publicAppTitle
  };
}

