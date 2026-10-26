// Cliente da Evolution API (WhatsApp) + extração de repositórios do GitHub nas mensagens.
// Somente funções puras e chamadas HTTP; nada aqui toca em banco de dados.

export interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  instance: string;
}

export interface EvolutionGroup {
  jid: string;
  name: string;
  size: number;
}

export interface EvolutionMessage {
  id: string;
  ts: number; // segundos (epoch)
  sender: string;
  text: string;
}

export interface EvolutionMessagesPage {
  records: unknown[];
  pages: number;
  total: number;
}

export class EvolutionError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'EvolutionError';
    this.status = status;
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

// Páginas "de sistema" do github.com que parecem owner/repo mas não são repositórios.
const RESERVED_OWNERS = new Set([
  'about', 'apps', 'blog', 'codespaces', 'collections', 'contact', 'copilot', 'customer-stories',
  'dashboard', 'discussions', 'education', 'enterprise', 'events', 'explore', 'features',
  'github-copilot', 'issues', 'join', 'login', 'logout', 'marketplace', 'mobile', 'models',
  'new', 'nonprofit', 'notifications', 'organizations', 'orgs', 'pages', 'partners', 'premium-support',
  'pricing', 'pulls', 'readme', 'resources', 'search', 'security', 'sessions', 'settings', 'signup',
  'site', 'sitemap', 'solutions', 'sponsors', 'stars', 'team', 'topics', 'trending',
  'user-attachments', 'users', 'watching'
]);

// A fronteira antes de "github.com" exclui "gist.github.com", "notgithub.com" etc.
const GITHUB_LINK_REGEX =
  /(?:^|[^A-Za-z0-9.-])(?:www\.)?github\.com\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_.-]+)/gi;

/** Todos os repositórios "owner/repo" citados no texto, sem duplicar (case-insensitive). */
export function extractGitHubRepoLinks(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const found = new Map<string, string>();

  for (const match of text.matchAll(GITHUB_LINK_REGEX)) {
    const owner = match[1];
    let name = match[2].replace(/\.git$/i, '').replace(/\.+$/, '');
    if (!owner || !name) continue;
    if (RESERVED_OWNERS.has(owner.toLowerCase())) continue;
    if (owner.length > 39 || name.length > 100) continue;
    const full = `${owner}/${name}`;
    const key = full.toLowerCase();
    if (!found.has(key)) found.set(key, full);
  }

  return [...found.values()];
}

type AnyRecord = Record<string, any>;

// Mensagens podem vir embrulhadas (efêmeras, "ver uma vez", editadas, documento com legenda).
function unwrapMessage(message: AnyRecord | null | undefined): AnyRecord {
  let current: AnyRecord = message && typeof message === 'object' ? message : {};
  for (let depth = 0; depth < 5; depth++) {
    const inner =
      current.ephemeralMessage?.message ||
      current.viewOnceMessage?.message ||
      current.viewOnceMessageV2?.message ||
      current.documentWithCaptionMessage?.message ||
      current.editedMessage?.message ||
      current.protocolMessage?.editedMessage;
    if (!inner || typeof inner !== 'object') break;
    current = inner;
  }
  return current;
}

/** Texto do próprio autor da mensagem (ignora o trecho citado de outra mensagem). */
export function extractMessageText(record: unknown): string {
  const rec = (record && typeof record === 'object' ? record : {}) as AnyRecord;
  const msg = unwrapMessage(rec.message);
  const parts: unknown[] = [
    msg.conversation,
    msg.extendedTextMessage?.text,
    msg.extendedTextMessage?.matchedText,
    msg.imageMessage?.caption,
    msg.videoMessage?.caption,
    msg.documentMessage?.caption
  ];
  return parts.filter((p): p is string => typeof p === 'string' && p.trim() !== '').join('\n');
}

function parseTimestamp(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.floor(raw);
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) return Number(raw.trim());
  if (raw && typeof raw === 'object' && typeof (raw as AnyRecord).low === 'number') {
    return Math.floor((raw as AnyRecord).low);
  }
  return 0;
}

export function normalizeMessage(record: unknown): EvolutionMessage | null {
  if (!record || typeof record !== 'object') return null;
  const rec = record as AnyRecord;
  const ts = parseTimestamp(rec.messageTimestamp);
  if (!ts) return null;
  const sender = String(
    rec.pushName ||
      String(rec.key?.participantAlt || rec.key?.participant || '').split('@')[0] ||
      ''
  );
  return {
    id: String(rec.key?.id || rec.id || ''),
    ts,
    sender,
    text: extractMessageText(rec)
  };
}

function buildUrl(config: EvolutionConfig, path: string): string {
  const base = config.baseUrl.trim().replace(/\/+$/, '');
  return `${base}${path}`;
}

async function evolutionRequest(
  config: EvolutionConfig,
  path: string,
  init: RequestInit,
  fetchImpl: FetchLike,
  timeoutMs: number
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(buildUrl(config, path), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        apikey: config.apiKey,
        ...(init.headers || {})
      },
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new EvolutionError(`Não foi possível falar com a Evolution API: ${reason}`);
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new EvolutionError('Evolution API recusou a chave (apikey inválida).', res.status);
    }
    if (res.status === 404) {
      throw new EvolutionError('Instância ou rota não encontrada na Evolution API.', res.status);
    }
    throw new EvolutionError(`Evolution API respondeu HTTP ${res.status}.`, res.status);
  }

  try {
    return await res.json();
  } catch {
    throw new EvolutionError('Resposta da Evolution API não é um JSON válido.', res.status);
  }
}

export function isEvolutionConfigured(config: Partial<EvolutionConfig> | null | undefined): boolean {
  return Boolean(config?.baseUrl?.trim() && config?.apiKey?.trim() && config?.instance?.trim());
}

/** Lista os grupos da instância (a Evolution demora ~10 s nessa chamada). */
export async function fetchEvolutionGroups(
  config: EvolutionConfig,
  fetchImpl: FetchLike = fetch
): Promise<EvolutionGroup[]> {
  const data = await evolutionRequest(
    config,
    `/group/fetchAllGroups/${encodeURIComponent(config.instance)}?getParticipants=false`,
    { method: 'GET' },
    fetchImpl,
    45000
  );
  if (!Array.isArray(data)) {
    throw new EvolutionError('Lista de grupos em formato inesperado.');
  }
  return (data as AnyRecord[])
    .filter((g) => typeof g?.id === 'string' && g.id.endsWith('@g.us'))
    .map((g) => ({
      jid: String(g.id),
      name: String(g.subject || g.id),
      size: Number(g.size || 0)
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/** Uma página de mensagens do grupo, da mais nova para a mais antiga (page começa em 1). */
export async function fetchEvolutionMessagesPage(
  config: EvolutionConfig,
  jid: string,
  page: number,
  pageSize: number,
  fetchImpl: FetchLike = fetch
): Promise<EvolutionMessagesPage> {
  const data = (await evolutionRequest(
    config,
    `/chat/findMessages/${encodeURIComponent(config.instance)}`,
    {
      method: 'POST',
      body: JSON.stringify({ where: { key: { remoteJid: jid } }, page, offset: pageSize })
    },
    fetchImpl,
    25000
  )) as AnyRecord;

  const block = data?.messages;
  if (!block || !Array.isArray(block.records)) {
    throw new EvolutionError(
      'Histórico indisponível: a instância não devolveu mensagens (verifique se ela salva o histórico no banco).'
    );
  }
  return {
    records: block.records,
    pages: Number(block.pages || 1),
    total: Number(block.total || block.records.length)
  };
}
