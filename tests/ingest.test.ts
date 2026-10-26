import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractGitHubRepoLinks,
  extractMessageText,
  normalizeMessage
} from '../src/evolution.ts';
import { classifyLicense, isOpenSourceLicense, type RepoProbeResult } from '../src/github.ts';
import {
  acquireIngestLock,
  countIngestLog,
  getIngestLogRow,
  getIngestState,
  listIngestLog,
  saveIngestConfig,
  upsertIngestLog
} from '../src/ingest-db.ts';
import { reviewIngestItem, runIngest, type IngestDeps } from '../src/ingest.ts';
import type { GeneratedVisaoSummary, GitHubRepoMetadata, LicenseType } from '../src/types.ts';
import { createSqliteD1, insertCatalogRepo } from './helpers/sqlite-d1.ts';

const NOW_MS = Date.UTC(2026, 9, 26, 22, 0, 0);
const NOW = Math.floor(NOW_MS / 1000);
const JID = '120363000000000001@g.us'; // identificador fictício

// ------------------------------------------------------------------ montagem do cenário

function rec(id: string, ts: number, text: string, sender = 'Fulano') {
  return { key: { id }, messageTimestamp: ts, pushName: sender, message: { conversation: text } };
}

function okProbe(fullName: string, licenseType: LicenseType | null, spdx = ''): RepoProbeResult {
  return {
    kind: 'ok',
    fullName,
    repoKey: fullName.toLowerCase(),
    archived: false,
    stars: 42,
    description: `desc ${fullName}`,
    licenseSpdx: spdx,
    licenseType
  };
}

function meta(fullName: string, licenseType: LicenseType, spdx = ''): GitHubRepoMetadata {
  const [owner, name] = fullName.split('/');
  return {
    repoKey: fullName.toLowerCase(),
    fullName,
    owner,
    name,
    repoUrl: `https://github.com/${fullName}`,
    description: '',
    stars: 42,
    forks: 1,
    language: 'TypeScript',
    topics: [],
    lastCommitAt: '2026-10-01T00:00:00Z',
    readmeExcerpt: '',
    licenseType,
    licenseSpdx: spdx
  };
}

interface World {
  messages: ReturnType<typeof rec>[];
  probes: Record<string, RepoProbeResult | (() => RepoProbeResult) | Error>;
  metas: Record<string, GitHubRepoMetadata>;
}

function makeDeps(world: World) {
  const calls = { pages: 0, probes: [] as string[], metas: [] as string[], saved: [] as string[] };
  const deps: IngestDeps = {
    async fetchPage(_config, _jid, page, pageSize) {
      calls.pages++;
      const sorted = [...world.messages].sort((a, b) => b.messageTimestamp - a.messageTimestamp);
      const start = (page - 1) * pageSize;
      return {
        records: sorted.slice(start, start + pageSize),
        pages: Math.max(1, Math.ceil(sorted.length / pageSize)),
        total: sorted.length
      };
    },
    async probe(fullName) {
      calls.probes.push(fullName.toLowerCase());
      const entry = world.probes[fullName.toLowerCase()];
      if (!entry) return { kind: 'not_found' };
      if (entry instanceof Error) throw entry;
      return typeof entry === 'function' ? entry() : entry;
    },
    async fetchMeta(fullName) {
      calls.metas.push(fullName.toLowerCase());
      const found = world.metas[fullName.toLowerCase()];
      if (!found) throw new Error(`sem meta para ${fullName}`);
      return found;
    },
    async summarize() {
      return {} as GeneratedVisaoSummary;
    },
    async save(m) {
      calls.saved.push(m.fullName.toLowerCase());
    },
    nowMs: () => NOW_MS
  };
  return { deps, calls };
}

async function setup(overrides: Record<string, unknown> = {}) {
  const sqlite = createSqliteD1();
  await saveIngestConfig(sqlite.db, {
    enabled: true,
    baseUrl: 'https://evolution.test',
    apiKey: 'chave-secreta',
    instance: 'instancia-teste',
    groups: [{ jid: JID, name: 'Grupo de Teste', enabled: true }],
    pageSize: 20,
    ...overrides
  });
  return sqlite;
}

// ------------------------------------------------------------------ extração de links

test('1. extractGitHubRepoLinks acha todos os links, sem lixo e sem duplicar', () => {
  const text = [
    'olha https://github.com/acme/open-lib e também https://github.com/Acme/Second.git!',
    'bold *https://github.com/foo/bar* e www.github.com/baz/qux/issues/12.',
    'repetido https://github.com/ACME/open-lib/tree/main',
    'gist https://gist.github.com/someone/abcdef e raw https://raw.githubusercontent.com/a/b/c',
    'páginas do site: https://github.com/sponsors/fulano https://github.com/orgs/acme/people https://github.com/topics/ai',
    'github.com/trending'
  ].join('\n');

  assert.deepEqual(extractGitHubRepoLinks(text), [
    'acme/open-lib',
    'Acme/Second',
    'foo/bar',
    'baz/qux'
  ]);
  assert.deepEqual(extractGitHubRepoLinks(''), []);
});

test('2. extractMessageText lê só o texto do autor (não a mensagem citada) e mensagens embrulhadas', () => {
  assert.equal(extractMessageText({ message: { conversation: 'oi' } }), 'oi');
  assert.equal(
    extractMessageText({ message: { imageMessage: { caption: 'print do https://github.com/a/b' } } }),
    'print do https://github.com/a/b'
  );
  assert.equal(
    extractMessageText({
      message: { ephemeralMessage: { message: { extendedTextMessage: { text: 'efemera' } } } }
    }),
    'efemera'
  );
  const quoted = {
    message: {
      extendedTextMessage: {
        text: 'concordo',
        contextInfo: { quotedMessage: { conversation: 'https://github.com/citado/repo' } }
      }
    }
  };
  assert.equal(extractMessageText(quoted), 'concordo');

  const normalized = normalizeMessage(rec('X1', 1793055024, 'texto', 'Maria'));
  assert.deepEqual(normalized, { id: 'X1', ts: 1793055024, sender: 'Maria', text: 'texto' });
  assert.equal(normalizeMessage({ messageTimestamp: 0 }), null);
});

test('3. critério de open source: permissiva/copyleft entram; source-available e sem licença não', () => {
  const spdx = (id: string) => classifyLicense({ spdx_id: id, key: id.toLowerCase() }, '');
  for (const id of ['MIT', 'Apache-2.0', 'Zlib', 'CC0-1.0']) {
    assert.equal(spdx(id).licenseType, 'permissive', id);
  }
  for (const id of ['AGPL-3.0', 'GPL-3.0', 'MPL-2.0', 'EPL-2.0', 'LGPL-3.0-only']) {
    assert.equal(spdx(id).licenseType, 'copyleft', id);
  }
  assert.equal(spdx('BSL-1.1').licenseType, 'source-available');
  assert.equal(spdx('SSPL-1.0').licenseType, 'source-available');
  assert.equal(classifyLicense(null, '').licenseType, 'unlicensed');

  assert.equal(isOpenSourceLicense('permissive'), true);
  assert.equal(isOpenSourceLicense('copyleft'), true);
  for (const t of ['source-available', 'unlicensed', 'unspecified', null, undefined] as const) {
    assert.equal(isOpenSourceLicense(t), false, String(t));
  }
});

// ------------------------------------------------------------------ raspagem

test('4. raspagem: cataloga só open source, separa pendentes/ignorados e não repete trabalho', async () => {
  const { db, raw } = await setup();
  insertCatalogRepo(raw, 'acme/already');

  const world: World = {
    messages: [
      rec('m1', NOW - 500, 'olha https://github.com/acme/open-lib e https://github.com/acme/closed-core'),
      rec('m2', NOW - 400, 'https://github.com/acme/no-license'),
      rec('m3', NOW - 300, 'https://github.com/acme/already e https://gist.github.com/x/y'),
      rec('m4', NOW - 200, 'https://github.com/ghost/missing'),
      rec('m5', NOW - 100, 'de novo https://github.com/ACME/Open-Lib')
    ],
    probes: {
      'acme/open-lib': okProbe('acme/open-lib', 'permissive', 'MIT'),
      'acme/closed-core': okProbe('acme/closed-core', 'source-available', 'BSL-1.1'),
      'acme/no-license': okProbe('acme/no-license', null)
    },
    metas: {
      'acme/open-lib': meta('acme/open-lib', 'permissive', 'MIT'),
      'acme/no-license': meta('acme/no-license', 'unlicensed', 'None')
    }
  };
  const { deps, calls } = makeDeps(world);

  const run = await runIngest(db, undefined, deps, { trigger: 'cron' });

  assert.equal(run.skipped, undefined);
  assert.equal(run.messagesScanned, 5);
  assert.equal(run.candidates, 4);
  assert.equal(run.added, 1);
  assert.equal(run.ignored, 2); // closed-core + ghost/missing
  assert.equal(run.pending, 1); // no-license
  assert.equal(run.errors, 0);
  assert.equal(run.alreadyKnown, 1);
  assert.equal(run.truncated, false);
  assert.equal(run.gap, false);

  assert.deepEqual(calls.saved, ['acme/open-lib']);
  // fonte fechada é descartada com 1 chamada, sem buscar README nem gastar IA
  assert.deepEqual(calls.metas.sort(), ['acme/no-license', 'acme/open-lib']);

  const closed = await getIngestLogRow(db, 'acme/closed-core');
  assert.equal(closed?.status, 'ignored');
  assert.match(closed?.reason || '', /BSL-1\.1/);
  assert.equal((await getIngestLogRow(db, 'acme/no-license'))?.status, 'pending');
  assert.equal((await getIngestLogRow(db, 'ghost/missing'))?.status, 'ignored');
  assert.equal((await getIngestLogRow(db, 'acme/open-lib'))?.status, 'added');
  assert.equal((await getIngestLogRow(db, 'acme/open-lib'))?.sender, 'Fulano');

  const state = await getIngestState(db);
  assert.equal(state.cursors[JID], NOW - 100);
  assert.equal(state.lastRun?.added, 1);

  // segunda rodada: nada novo => nenhuma chamada ao GitHub
  const probesBefore = calls.probes.length;
  const second = await runIngest(db, undefined, deps, { trigger: 'cron' });
  assert.equal(second.messagesScanned, 0);
  assert.equal(second.candidates, 0);
  assert.equal(calls.probes.length, probesBefore);
});

test('5. orçamento por execução: processa em lotes, sem pular e sem duplicar', async () => {
  const { db } = await setup({ maxUnitsPerRun: 4 }); // 1 repositório novo por rodada
  const names = ['acme/r1', 'acme/r2', 'acme/r3'];
  const world: World = {
    messages: names.map((n, i) => rec(`b${i}`, NOW - 300 + i * 100, `https://github.com/${n}`)),
    probes: Object.fromEntries(names.map((n) => [n, okProbe(n, 'permissive', 'MIT')])),
    metas: Object.fromEntries(names.map((n) => [n, meta(n, 'permissive', 'MIT')]))
  };
  const { deps, calls } = makeDeps(world);

  const first = await runIngest(db, undefined, deps, { trigger: 'cron' });
  assert.equal(first.added, 1);
  assert.equal(first.truncated, true);
  assert.deepEqual(calls.saved, ['acme/r1']);
  // o cursor para logo antes da mensagem que ficou pendente
  assert.equal((await getIngestState(db)).cursors[JID], NOW - 201);

  const second = await runIngest(db, undefined, deps, { trigger: 'cron' });
  assert.equal(second.added, 1);
  assert.equal(second.truncated, true);

  const third = await runIngest(db, undefined, deps, { trigger: 'cron' });
  assert.equal(third.added, 1);
  assert.equal(third.truncated, false);

  const fourth = await runIngest(db, undefined, deps, { trigger: 'cron' });
  assert.equal(fourth.candidates, 0);
  assert.deepEqual(calls.saved, ['acme/r1', 'acme/r2', 'acme/r3']);
});

test('6. limite de taxa do GitHub: para sem registrar e retoma na rodada seguinte', async () => {
  const { db } = await setup();
  let limited = true;
  const world: World = {
    messages: [rec('a1', NOW - 100, 'https://github.com/acme/one')],
    probes: {
      'acme/one': () => (limited ? { kind: 'rate_limited' } : okProbe('acme/one', 'permissive', 'MIT'))
    },
    metas: { 'acme/one': meta('acme/one', 'permissive', 'MIT') }
  };
  const { deps, calls } = makeDeps(world);

  const first = await runIngest(db, undefined, deps, { trigger: 'cron' });
  assert.equal(first.rateLimited, true);
  assert.equal(first.added, 0);
  assert.equal(await getIngestLogRow(db, 'acme/one'), null);
  assert.ok((await getIngestState(db)).cursors[JID] < NOW - 100);

  limited = false;
  const second = await runIngest(db, undefined, deps, { trigger: 'cron' });
  assert.equal(second.added, 1);
  assert.deepEqual(calls.saved, ['acme/one']);
});

test('7. cron desativado, sem configuração e trava de execução simultânea', async () => {
  const world: World = { messages: [], probes: {}, metas: {} };
  const { deps, calls } = makeDeps(world);

  const fresh = createSqliteD1();
  const notConfigured = await runIngest(fresh.db, undefined, deps, { trigger: 'manual' });
  assert.match(notConfigured.skipped || '', /não configurada/);

  const { db } = await setup({ enabled: false });
  const cron = await runIngest(db, undefined, deps, { trigger: 'cron' });
  assert.match(cron.skipped || '', /desativada/);
  assert.equal(calls.pages, 0);

  const manual = await runIngest(db, undefined, deps, { trigger: 'manual' });
  assert.equal(manual.skipped, undefined);
  assert.equal(calls.pages, 1);

  assert.equal(await acquireIngestLock(db, NOW_MS), true);
  const blocked = await runIngest(db, undefined, deps, { trigger: 'manual' });
  assert.match(blocked.skipped || '', /em andamento/);
});

test('8. revisão do admin: aprovar, dispensar e tentar de novo', async () => {
  const { db, raw } = await setup();
  const world: World = {
    messages: [],
    probes: { 'acme/flaky': okProbe('acme/flaky', 'permissive', 'MIT') },
    metas: {
      'acme/draft': meta('acme/draft', 'unlicensed', 'None'),
      'acme/flaky': meta('acme/flaky', 'permissive', 'MIT')
    }
  };
  const { deps, calls } = makeDeps(world);

  await upsertIngestLog(db, { repoKey: 'acme/draft', fullName: 'acme/draft', status: 'pending', reason: 'x' });
  await upsertIngestLog(db, { repoKey: 'acme/noise', fullName: 'acme/noise', status: 'pending', reason: 'x' });
  await upsertIngestLog(db, { repoKey: 'acme/flaky', fullName: 'acme/flaky', status: 'error', reason: 'timeout' });

  const approved = await reviewIngestItem(db, deps, 'acme/draft', 'approve');
  assert.equal(approved.ok, true);
  assert.deepEqual(calls.saved, ['acme/draft']);
  assert.equal((await getIngestLogRow(db, 'acme/draft'))?.status, 'added');

  const dismissed = await reviewIngestItem(db, deps, 'acme/noise', 'dismiss');
  assert.equal(dismissed.ok, true);
  assert.equal((await getIngestLogRow(db, 'acme/noise'))?.status, 'ignored');
  assert.equal(calls.saved.length, 1);

  const retried = await reviewIngestItem(db, deps, 'acme/flaky', 'retry');
  assert.equal(retried.ok, true);
  assert.equal((await getIngestLogRow(db, 'acme/flaky'))?.status, 'added');
  assert.deepEqual(calls.saved, ['acme/draft', 'acme/flaky']);

  const missing = await reviewIngestItem(db, deps, 'nao/existe', 'approve');
  assert.equal(missing.ok, false);

  // o que já está no catálogo sai das listas de pendentes/erros
  await upsertIngestLog(db, { repoKey: 'acme/manual', fullName: 'acme/manual', status: 'pending', reason: 'x' });
  assert.equal((await listIngestLog(db, { status: 'pending' })).length, 1);
  insertCatalogRepo(raw, 'acme/manual');
  assert.equal((await listIngestLog(db, { status: 'pending' })).length, 0);
  assert.equal((await countIngestLog(db)).pending, 0);
});

test('9. janela curta demais para alcançar o cursor é sinalizada como lacuna', async () => {
  const { db } = await setup({ maxPagesPerRun: 2 });
  const messages = Array.from({ length: 45 }, (_, i) => rec(`g${i}`, NOW - 1000 + i, 'sem links'));
  const { deps, calls } = makeDeps({ messages, probes: {}, metas: {} });

  const run = await runIngest(db, undefined, deps, { trigger: 'manual' });
  assert.equal(run.gap, true);
  assert.equal(calls.pages, 2);
  assert.equal(run.messagesScanned, 40);

  // varredura completa lê o histórico todo
  const full = await runIngest(db, undefined, deps, { trigger: 'manual', fullBackfill: true });
  assert.equal(full.gap, false);
  assert.equal(full.messagesScanned, 45);
});
