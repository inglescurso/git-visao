// Persistência da raspagem do WhatsApp: configuração, cursor, trava e log de decisões.
// Fica separado de db.ts para não mexer no schema/backup do catálogo.

import { getKV } from './db.ts';
import type { Env } from './types.ts';

export type IngestStatus = 'added' | 'pending' | 'ignored' | 'error' | 'requested';

export interface IngestGroup {
  jid: string;
  name: string;
  enabled: boolean;
}

export interface IngestConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  instance: string;
  groups: IngestGroup[];
  /** Orçamento por execução: sondar = 1 ponto, resumir/gravar = 3 pontos (limite de subrequests). */
  maxUnitsPerRun: number;
  maxPagesPerRun: number;
  pageSize: number;
  lookbackDays: number;
}

export const DEFAULT_INGEST_CONFIG: IngestConfig = {
  enabled: false,
  baseUrl: '',
  apiKey: '',
  instance: '',
  groups: [],
  maxUnitsPerRun: 12,
  maxPagesPerRun: 8,
  pageSize: 200,
  lookbackDays: 14
};

export interface IngestRunItem {
  repo: string;
  status: IngestStatus;
  reason: string;
}

export interface IngestRunSummary {
  trigger: 'cron' | 'manual';
  startedAt: string;
  finishedAt: string;
  skipped?: string;
  groups: number;
  messagesScanned: number;
  candidates: number;
  added: number;
  pending: number;
  ignored: number;
  errors: number;
  alreadyKnown: number;
  truncated: boolean; // parou por orçamento; o restante continua na próxima execução
  gap: boolean; // a janela de leitura não alcançou o cursor (mensagens antigas não lidas)
  rateLimited: boolean;
  fatalError?: string;
  items: IngestRunItem[];
}

export interface IngestState {
  cursors: Record<string, number>;
  lastRun: IngestRunSummary | null;
}

export interface IngestLogRow {
  repo_key: string;
  full_name: string;
  status: IngestStatus;
  reason: string;
  license_spdx: string;
  license_type: string;
  stars: number;
  description: string;
  source: string;
  sender: string;
  message_ts: number;
  attempts: number;
  first_seen_at: string;
  updated_at: string;
}

export const MAX_ERROR_ATTEMPTS = 3;

const CREATE_INGEST_LOG_SQL = `
CREATE TABLE IF NOT EXISTS ingest_log (
    repo_key TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT DEFAULT '',
    license_spdx TEXT DEFAULT '',
    license_type TEXT DEFAULT '',
    stars INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    source TEXT DEFAULT '',
    sender TEXT DEFAULT '',
    message_ts INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    first_seen_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
)`;

const CREATE_SETTINGS_SQL = `
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
)`;

const schemaReady = new WeakSet<object>();

export async function ensureIngestSchema(db: D1Database): Promise<void> {
  if (schemaReady.has(db)) return;
  await db.prepare(CREATE_SETTINGS_SQL).run();
  await db.prepare(CREATE_INGEST_LOG_SQL).run();
  await db
    .prepare('CREATE INDEX IF NOT EXISTS idx_ingest_log_status ON ingest_log(status, updated_at DESC)')
    .run();
  schemaReady.add(db);
}

// ---------------------------------------------------------------- configuração

const CONFIG_KEY = 'ingest_config';
const STATE_KEY = 'ingest_state';
const LOCK_KEY = 'ingest_lock';
const KV_CONFIG_KEY = 'admin:ingest';

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.trunc(n), min), max);
}

export function normalizeIngestConfig(raw: unknown): IngestConfig {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const groups: IngestGroup[] = Array.isArray(src.groups)
    ? (src.groups as Array<Record<string, unknown>>)
        .filter((g) => g && typeof g.jid === 'string' && g.jid.endsWith('@g.us'))
        .map((g) => ({
          jid: String(g.jid),
          name: String(g.name || g.jid),
          enabled: g.enabled !== false
        }))
    : [];
  return {
    enabled: src.enabled === true,
    baseUrl: typeof src.baseUrl === 'string' ? src.baseUrl.trim().replace(/\/+$/, '') : '',
    apiKey: typeof src.apiKey === 'string' ? src.apiKey.trim() : '',
    instance: typeof src.instance === 'string' ? src.instance.trim() : '',
    groups,
    maxUnitsPerRun: clampInt(src.maxUnitsPerRun, 4, 400, DEFAULT_INGEST_CONFIG.maxUnitsPerRun),
    maxPagesPerRun: clampInt(src.maxPagesPerRun, 1, 60, DEFAULT_INGEST_CONFIG.maxPagesPerRun),
    pageSize: clampInt(src.pageSize, 20, 200, DEFAULT_INGEST_CONFIG.pageSize),
    lookbackDays: clampInt(src.lookbackDays, 1, 365, DEFAULT_INGEST_CONFIG.lookbackDays)
  };
}

async function readSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db
    .prepare('SELECT value FROM app_settings WHERE key = ?')
    .bind(key)
    .first<{ value: string }>();
  return row ? String(row.value) : null;
}

async function writeSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    )
    .bind(key, value)
    .run();
}

export async function getIngestConfig(db: D1Database, env?: Env): Promise<IngestConfig> {
  await ensureIngestSchema(db);
  const raw = await readSetting(db, CONFIG_KEY);
  if (raw) {
    try {
      return normalizeIngestConfig(JSON.parse(raw));
    } catch {
      // cai para o espelho no KV
    }
  }
  const kv = getKV(env);
  if (kv) {
    try {
      const mirrored = await kv.get(KV_CONFIG_KEY);
      if (mirrored) return normalizeIngestConfig(JSON.parse(mirrored));
    } catch {
      // ignora
    }
  }
  return { ...DEFAULT_INGEST_CONFIG };
}

export interface IngestConfigPatch extends Partial<Omit<IngestConfig, 'groups'>> {
  groups?: IngestGroup[];
  clearApiKey?: boolean;
}

export async function saveIngestConfig(
  db: D1Database,
  patch: IngestConfigPatch,
  env?: Env
): Promise<IngestConfig> {
  const current = await getIngestConfig(db, env);
  const next: Record<string, unknown> = { ...current };

  for (const key of [
    'enabled',
    'baseUrl',
    'instance',
    'maxUnitsPerRun',
    'maxPagesPerRun',
    'pageSize',
    'lookbackDays',
    'groups'
  ] as const) {
    if (patch[key] !== undefined) next[key] = patch[key];
  }

  if (patch.clearApiKey === true) {
    next.apiKey = '';
  } else if (
    typeof patch.apiKey === 'string' &&
    patch.apiKey.trim() &&
    !patch.apiKey.includes('...')
  ) {
    next.apiKey = patch.apiKey.trim();
  }

  const normalized = normalizeIngestConfig(next);
  const json = JSON.stringify(normalized);
  await writeSetting(db, CONFIG_KEY, json);

  const kv = getKV(env);
  if (kv) {
    try {
      await kv.put(KV_CONFIG_KEY, json);
    } catch (err) {
      console.warn('Erro ao espelhar configuração da raspagem no KV:', err);
    }
  }
  return normalized;
}

export function maskIngestConfig(config: IngestConfig) {
  const key = config.apiKey;
  return {
    ...config,
    apiKey: '',
    hasApiKey: Boolean(key),
    apiKeyMasked: !key ? '' : key.length <= 8 ? '****' : `${key.slice(0, 4)}...${key.slice(-4)}`
  };
}

// ---------------------------------------------------------------- estado e trava

export async function getIngestState(db: D1Database): Promise<IngestState> {
  await ensureIngestSchema(db);
  const raw = await readSetting(db, STATE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        cursors:
          parsed && typeof parsed.cursors === 'object' && parsed.cursors ? parsed.cursors : {},
        lastRun: parsed?.lastRun ?? null
      };
    } catch {
      // estado corrompido: recomeça
    }
  }
  return { cursors: {}, lastRun: null };
}

export async function saveIngestState(db: D1Database, state: IngestState): Promise<void> {
  await ensureIngestSchema(db);
  await writeSetting(db, STATE_KEY, JSON.stringify(state));
}

/** Trava com validade: impede o cron e o botão "Rodar agora" de rodarem juntos. */
export async function acquireIngestLock(
  db: D1Database,
  nowMs: number,
  ttlMs = 10 * 60 * 1000
): Promise<boolean> {
  await ensureIngestSchema(db);
  const result = await db
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
       WHERE CAST(app_settings.value AS INTEGER) < ?`
    )
    .bind(LOCK_KEY, String(nowMs + ttlMs), nowMs)
    .run();
  return Number(result?.meta?.changes ?? 0) > 0;
}

export async function releaseIngestLock(db: D1Database): Promise<void> {
  await db.prepare('UPDATE app_settings SET value = ? WHERE key = ?').bind('0', LOCK_KEY).run();
}

// ---------------------------------------------------------------- log de decisões

const CHUNK = 50;

export interface KnownKeys {
  catalog: Set<string>;
  log: Map<string, { status: IngestStatus; attempts: number }>;
}

export async function lookupKnownKeys(db: D1Database, keys: string[]): Promise<KnownKeys> {
  await ensureIngestSchema(db);
  const unique = [...new Set(keys.map((k) => k.trim().toLowerCase()).filter(Boolean))];
  const known: KnownKeys = { catalog: new Set(), log: new Map() };

  for (let i = 0; i < unique.length; i += CHUNK) {
    const slice = unique.slice(i, i + CHUNK);
    const marks = slice.map(() => '?').join(',');

    const repos = await db
      .prepare(`SELECT repo_key FROM repositories WHERE repo_key IN (${marks})`)
      .bind(...slice)
      .all<{ repo_key: string }>();
    for (const row of repos?.results ?? []) known.catalog.add(String(row.repo_key));

    const logged = await db
      .prepare(`SELECT repo_key, status, attempts FROM ingest_log WHERE repo_key IN (${marks})`)
      .bind(...slice)
      .all<{ repo_key: string; status: IngestStatus; attempts: number }>();
    for (const row of logged?.results ?? []) {
      known.log.set(String(row.repo_key), {
        status: row.status,
        attempts: Number(row.attempts || 0)
      });
    }
  }
  return known;
}

export interface IngestLogInput {
  repoKey: string;
  fullName: string;
  status: IngestStatus;
  reason?: string;
  licenseSpdx?: string;
  licenseType?: string;
  stars?: number;
  description?: string;
  source?: string;
  sender?: string;
  messageTs?: number;
}

export async function upsertIngestLog(db: D1Database, input: IngestLogInput): Promise<void> {
  await ensureIngestSchema(db);
  await db
    .prepare(
      `INSERT INTO ingest_log (
         repo_key, full_name, status, reason, license_spdx, license_type, stars,
         description, source, sender, message_ts, attempts, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(repo_key) DO UPDATE SET
         full_name = excluded.full_name,
         status = excluded.status,
         reason = excluded.reason,
         license_spdx = CASE WHEN excluded.license_spdx != '' THEN excluded.license_spdx ELSE ingest_log.license_spdx END,
         license_type = CASE WHEN excluded.license_type != '' THEN excluded.license_type ELSE ingest_log.license_type END,
         stars = CASE WHEN excluded.stars > 0 THEN excluded.stars ELSE ingest_log.stars END,
         description = CASE WHEN excluded.description != '' THEN excluded.description ELSE ingest_log.description END,
         attempts = CASE WHEN excluded.status = 'error' THEN ingest_log.attempts + 1 ELSE 0 END,
         updated_at = datetime('now')`
    )
    .bind(
      input.repoKey.trim().toLowerCase(),
      input.fullName,
      input.status,
      input.reason || '',
      input.licenseSpdx || '',
      input.licenseType || '',
      Number(input.stars || 0),
      input.description || '',
      input.source || '',
      input.sender || '',
      Number(input.messageTs || 0),
      input.status === 'error' ? 1 : 0
    )
    .run();
}

export async function getIngestLogRow(
  db: D1Database,
  repoKey: string
): Promise<IngestLogRow | null> {
  await ensureIngestSchema(db);
  const row = await db
    .prepare('SELECT * FROM ingest_log WHERE repo_key = ? LIMIT 1')
    .bind(repoKey.trim().toLowerCase())
    .first<IngestLogRow>();
  return row ?? null;
}

export async function listIngestLog(
  db: D1Database,
  options: { status?: IngestStatus; limit?: number } = {}
): Promise<IngestLogRow[]> {
  await ensureIngestSchema(db);
  const limit = clampInt(options.limit, 1, 500, 100);
  // Pendentes/ignorados/erros que o admin já catalogou por outro caminho saem da lista.
  const notInCatalog = 'AND repo_key NOT IN (SELECT repo_key FROM repositories)';
  const result = options.status
    ? await db
        .prepare(
          `SELECT * FROM ingest_log WHERE status = ? ${
            options.status === 'added' ? '' : notInCatalog
          } ORDER BY updated_at DESC, repo_key LIMIT ?`
        )
        .bind(options.status, limit)
        .all<IngestLogRow>()
    : await db
        .prepare('SELECT * FROM ingest_log ORDER BY updated_at DESC, repo_key LIMIT ?')
        .bind(limit)
        .all<IngestLogRow>();
  return result?.results ?? [];
}

export async function countIngestLog(db: D1Database): Promise<Record<IngestStatus, number>> {
  await ensureIngestSchema(db);
  const result = await db
    .prepare(
      `SELECT status, COUNT(*) AS total FROM ingest_log
       WHERE status = 'added' OR repo_key NOT IN (SELECT repo_key FROM repositories)
       GROUP BY status`
    )
    .all<{ status: IngestStatus; total: number }>();
  const counts: Record<IngestStatus, number> = { added: 0, pending: 0, ignored: 0, error: 0, requested: 0 };
  for (const row of result?.results ?? []) {
    if (row.status in counts) counts[row.status] = Number(row.total || 0);
  }
  return counts;
}

/** Consulta pública sobre repo fora do catálogo: só guarda o pedido para o admin decidir (nunca sobrescreve registro existente). */
export async function recordVisitorRequest(
  db: D1Database,
  repoKey: string,
  fullName: string
): Promise<void> {
  await ensureIngestSchema(db);
  await db
    .prepare(
      `INSERT OR IGNORE INTO ingest_log (repo_key, full_name, status, reason, source, attempts, updated_at)
       VALUES (?, ?, 'requested', 'Consultado por visitante.', 'visitante', 0, datetime('now'))`
    )
    .bind(repoKey.trim().toLowerCase(), fullName)
    .run();
}
