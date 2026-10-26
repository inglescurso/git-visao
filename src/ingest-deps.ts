// Dependências reais (rede + IA + D1) usadas pela raspagem em produção.
// Nos testes, `IngestDeps` é substituído por dublês.

import { generateRepoVisaoSummary } from './ai.ts';
import { upsertRepository } from './db.ts';
import { fetchEvolutionMessagesPage } from './evolution.ts';
import { fetchGitHubRepoMetadata, probeGitHubRepo } from './github.ts';
import type { IngestDeps } from './ingest.ts';
import type { Env } from './types.ts';

export function createIngestDeps(env: Env, effectiveEnv: Env): IngestDeps {
  const token = effectiveEnv.GITHUB_TOKEN;
  return {
    fetchPage: (config, jid, page, pageSize) =>
      fetchEvolutionMessagesPage(config, jid, page, pageSize),
    probe: (fullName) => probeGitHubRepo(fullName, token),
    fetchMeta: (fullName) => fetchGitHubRepoMetadata(fullName, token),
    summarize: (meta) => generateRepoVisaoSummary(meta, effectiveEnv),
    save: (meta, summary) => upsertRepository(env.DB, meta, summary, env),
    nowMs: () => Date.now()
  };
}
