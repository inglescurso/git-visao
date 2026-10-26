#!/usr/bin/env node
/**
 * Script de Importação em Lote para o Git-Visão com Proteção Anti-429 e Checkpoint
 * 
 * Funcionalidades:
 * - Lê scripts/repos_to_import.json (150 repositórios únicos higienizados)
 * - Checkpoint persistente em scripts/import_progress.json (pula com segurança os já concluídos)
 * - Verificação prévia via GET /api/check para evitar gasto desnecessário de tokens de IA
 * - Proteção com backoff exponencial contra HTTP 429 (Rate Limit) e HTTP 503
 * - Feedback visual no console em tempo real e relatório consolidado ao final
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolvendo caminhos de diretório compatíveis com ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RepoInputItem {
  repo_key?: string;
  full_name?: string;
  name?: string;
  owner?: string;
  repo_url?: string;
  url?: string;
  exists_in_catalog?: boolean;
  status?: string;
  [key: string]: unknown;
}

type ProgressStatus = 'success' | 'error' | 'skipped';

interface ProgressItem {
  status: ProgressStatus;
  repo: string;
  category?: string;
  stars?: number;
  reason?: string;
  error?: string;
  updatedAt: string;
}

interface ProgressStore {
  lastRunAt: string;
  targetUrl: string;
  records: Record<string, ProgressItem>;
}

// ============================================================================
// PARSE DE ARGUMENTOS E CONFIGURAÇÕES
// ============================================================================

function parseCliArgs(): {
  targetUrl: string;
  adminPassword: string;
  delayMs: number;
  force: boolean;
  dryRun: boolean;
  inputFile: string;
  progressFile: string;
} {
  const args = process.argv.slice(2);
  const getArg = (flag: string): string | undefined => {
    const idx = args.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
    if (idx === -1) return undefined;
    const item = args[idx];
    if (item.includes('=')) {
      return item.split('=')[1];
    }
    return args[idx + 1];
  };

  const hasFlag = (flag: string): boolean => {
    return args.some((a) => a === flag || a.startsWith(`${flag}=`));
  };

  const targetUrl = (
    getArg('--target') ||
    process.env.TARGET_URL ||
    'http://localhost:8787'
  ).replace(/\/+$/, '');

  const adminPassword =
    getArg('--password') || process.env.ADMIN_PASSWORD || '';

  const delayMs = Number(
    getArg('--delay') || process.env.DELAY_MS || '3000'
  );

  const force =
    hasFlag('--force') || process.env.FORCE === 'true' || false;

  const dryRun =
    hasFlag('--dry-run') || process.env.DRY_RUN === 'true' || false;

  const inputFile =
    getArg('--file') ||
    process.env.INPUT_FILE ||
    path.join(__dirname, 'repos_to_import.json');

  const progressFile =
    getArg('--progress') ||
    process.env.PROGRESS_FILE ||
    path.join(__dirname, 'import_progress.json');

  return {
    targetUrl,
    adminPassword,
    delayMs: isNaN(delayMs) || delayMs < 0 ? 3000 : delayMs,
    force,
    dryRun,
    inputFile,
    progressFile
  };
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatStars(count: number): string {
  if (typeof count !== 'number' || isNaN(count)) return '0 ⭐';
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M ⭐`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k ⭐`;
  }
  return `${count} ⭐`;
}

function loadProgress(filePath: string, targetUrl: string): ProgressStore {
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.records === 'object') {
        return parsed as ProgressStore;
      }
      if (parsed && typeof parsed === 'object') {
        // Formato legado de mapa direto
        return {
          lastRunAt: new Date().toISOString(),
          targetUrl,
          records: parsed as Record<string, ProgressItem>
        };
      }
    } catch (err) {
      console.warn(`⚠️ Aviso: Não foi possível ler ${filePath}. Um novo arquivo será gerado.`);
    }
  }

  return {
    lastRunAt: new Date().toISOString(),
    targetUrl,
    records: {}
  };
}

function saveProgress(filePath: string, store: ProgressStore): void {
  try {
    store.lastRunAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error(`❌ Erro ao salvar progresso em ${filePath}:`, err);
  }
}

// ============================================================================
// FETCH RESILIENTE COM PROTEÇÃO ANTI-429 (RATE LIMIT & 503)
// ============================================================================

interface HttpResponse<T = any> {
  ok: boolean;
  status: number;
  statusText: string;
  data: T;
}

async function fetchWithRetry<T = any>(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<HttpResponse<T>> {
  let attempt = 0;
  const backoffDelays = [10000, 20000, 40000]; // 10s, 20s, 40s conforme especificação

  while (true) {
    try {
      const res = await fetch(url, options);

      // Status 429 (Rate Limit) ou 503 (Service Unavailable): aplicar retry com backoff
      if (res.status === 429 || res.status === 503) {
        attempt++;
        if (attempt <= maxRetries) {
          const retryAfterHeader = res.headers.get('retry-after');
          const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0;
          const waitTime = retryAfterSec > 0
            ? Math.max(retryAfterSec * 1000, backoffDelays[attempt - 1])
            : backoffDelays[attempt - 1];

          console.log(
            `\n   ⚠️ Rate limit / indisponibilidade (HTTP ${res.status}). Aguardando ${waitTime / 1000}s antes da tentativa ${attempt}/${maxRetries}...`
          );
          await sleep(waitTime);
          continue;
        }
      }

      let parsedData: any = null;
      const text = await res.text();
      try {
        parsedData = JSON.parse(text);
      } catch {
        parsedData = { raw: text };
      }

      return {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        data: parsedData
      };
    } catch (networkError: any) {
      attempt++;
      if (attempt <= maxRetries) {
        const waitTime = backoffDelays[attempt - 1];
        console.log(
          `\n   ⚠️ Falha na conexão de rede (${networkError?.message || 'Network error'}). Retentando em ${waitTime / 1000}s (${attempt}/${maxRetries})...`
        );
        await sleep(waitTime);
        continue;
      }

      return {
        ok: false,
        status: 0,
        statusText: networkError?.message || 'Falha de rede após retentativas',
        data: { error: networkError?.message || 'Network error' } as any
      };
    }
  }
}

// ============================================================================
// PROCESSO PRINCIPAL
// ============================================================================

async function main() {
  const config = parseCliArgs();

  console.log(`\n============================================================`);
  console.log(`🚀 IMPORTADOR EM LOTE - GIT-VISÃO (ANTI-429 & RESILIENTE)`);
  console.log(`============================================================`);
  console.log(`• Alvo da API    : ${config.targetUrl}`);
  console.log(`• Intervalo (ms) : ${config.delayMs}ms`);
  console.log(`• Forçar regerar : ${config.force ? 'SIM (--force ativo)' : 'NÃO'}`);
  console.log(`• Modo Dry-Run   : ${config.dryRun ? 'SIM (Apenas simulação)' : 'NÃO'}`);
  console.log(`• Arquivo entrada: ${config.inputFile}`);
  console.log(`• Checkpoint     : ${config.progressFile}`);
  console.log(`============================================================\n`);

  if (!fs.existsSync(config.inputFile)) {
    console.error(`❌ Erro: Arquivo de repositórios não encontrado em: ${config.inputFile}`);
    process.exit(1);
  }

  let reposList: RepoInputItem[] = [];
  try {
    const rawData = fs.readFileSync(config.inputFile, 'utf-8');
    reposList = JSON.parse(rawData);
    if (!Array.isArray(reposList)) {
      throw new Error('O conteúdo de repos_to_import.json deve ser uma lista JSON.');
    }
  } catch (err: any) {
    console.error(`❌ Falha ao carregar repos_to_import.json:`, err.message);
    process.exit(1);
  }

  const total = reposList.length;
  console.log(`📦 Carregados ${total} repositórios para processamento.\n`);

  const progressStore = loadProgress(config.progressFile, config.targetUrl);

  // Tratamento de interrupção (Ctrl+C) para salvar checkpoint
  process.on('SIGINT', () => {
    console.log(`\n\n⚠️ Interrupção detectada (SIGINT/Ctrl+C). Salvando checkpoint e encerrando com segurança...`);
    saveProgress(config.progressFile, progressStore);
    process.exit(0);
  });

  let countSuccess = 0;
  let countSkipped = 0;
  let countFailed = 0;
  let countDryRun = 0;

  for (let i = 0; i < total; i++) {
    const item = reposList[i];
    const fullName = (
      typeof item === 'string'
        ? item
        : item.full_name || item.name || item.repo_key || ''
    ).trim();

    if (!fullName) {
      continue;
    }

    const repoKey = fullName.toLowerCase();
    const currentNum = i + 1;
    const pct = Math.round((currentNum / total) * 100);
    const prefix = `[${currentNum}/${total}] (${pct}%)`;

    // 1. Verificação de Checkpoint local
    const existingProgress = progressStore.records[repoKey];
    if (!config.force && existingProgress && existingProgress.status === 'success') {
      const starsStr = existingProgress.stars !== undefined ? ` - ${formatStars(existingProgress.stars)}` : '';
      const catStr = existingProgress.category ? ` (${existingProgress.category}${starsStr})` : '';
      console.log(`${prefix} ⏭️ Pulando ${fullName} (Já importado anteriormente pelo checkpoint)${catStr}`);
      countSkipped++;
      continue;
    }

    // 2. Verificação prévia no catálogo via GET /api/check (100% pública e sem custo de IA)
    if (!config.force) {
      const checkUrl = `${config.targetUrl}/api/check?repo=${encodeURIComponent(fullName)}`;
      const checkRes = await fetchWithRetry<{
        ok: boolean;
        exists: boolean;
        repo?: { category?: string; stars?: number };
      }>(checkUrl, { method: 'GET' });

      if (checkRes.ok && checkRes.data && checkRes.data.exists === true) {
        const cat = checkRes.data.repo?.category || 'Catálogo';
        const stars = checkRes.data.repo?.stars ?? 0;
        console.log(`${prefix} ⏭️ Pulando ${fullName} (Já cadastrado no catálogo - ${cat} - ${formatStars(stars)})`);

        progressStore.records[repoKey] = {
          status: 'skipped',
          repo: fullName,
          reason: 'skipped_already_exists',
          category: cat,
          stars,
          updatedAt: new Date().toISOString()
        };
        saveProgress(config.progressFile, progressStore);
        countSkipped++;

        // Delay breve para respeitar requisições de check
        await sleep(Math.min(config.delayMs, 1000));
        continue;
      }
    }

    // 3. Caso de Dry-Run (apenas simulação)
    if (config.dryRun) {
      console.log(`${prefix} 🔍 [DRY-RUN] Importaria ${fullName} (Novo repositório detectado)`);
      countDryRun++;
      await sleep(300);
      continue;
    }

    // 4. Executar Importação e Geração de Visão via POST /api/repos
    process.stdout.write(`${prefix} ⏳ Importando ${fullName}... `);

    const postUrl = `${config.targetUrl}/api/repos`;
    const postRes = await fetchWithRetry<{
      ok: boolean;
      cached?: boolean;
      message?: string;
      error?: string;
      repo?: { category?: string; stars?: number; fullName?: string };
    }>(postUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': config.adminPassword
      },
      body: JSON.stringify({
        repo: fullName,
        password: config.adminPassword,
        force: config.force
      })
    });

    if (postRes.ok && postRes.data && postRes.data.ok) {
      const cat = postRes.data.repo?.category || 'Geral';
      const stars = postRes.data.repo?.stars ?? 0;
      console.log(`✅ OK (${cat} - ${formatStars(stars)})`);

      progressStore.records[repoKey] = {
        status: 'success',
        repo: fullName,
        category: cat,
        stars,
        updatedAt: new Date().toISOString()
      };
      saveProgress(config.progressFile, progressStore);
      countSuccess++;
    } else {
      const errMsg =
        postRes.data?.error ||
        postRes.statusText ||
        `Erro HTTP ${postRes.status}`;
      console.log(`❌ Erro: ${errMsg}`);

      progressStore.records[repoKey] = {
        status: 'error',
        repo: fullName,
        error: errMsg,
        updatedAt: new Date().toISOString()
      };
      saveProgress(config.progressFile, progressStore);
      countFailed++;
    }

    // Delay configurado entre requisições de importação
    if (config.delayMs > 0 && currentNum < total) {
      await sleep(config.delayMs);
    }
  }

  // ============================================================================
  // RELATÓRIO FINAL
  // ============================================================================
  console.log(`\n============================================================`);
  console.log(`📊 RELATÓRIO CONSOLIDADO DE IMPORTAÇÃO - GIT-VISÃO`);
  console.log(`============================================================`);
  console.log(`• Total no lote             : ${total}`);
  if (config.dryRun) {
    console.log(`• Identificados no Dry-Run  : ${countDryRun}`);
  }
  console.log(`• Sucessos (novos gravados) : ${countSuccess}`);
  console.log(`• Já existentes (pulados)   : ${countSkipped}`);
  console.log(`• Falhas                    : ${countFailed}`);
  console.log(`------------------------------------------------------------`);
  console.log(`💾 Checkpoint salvo em: ${config.progressFile}`);
  console.log(`============================================================\n`);
}

main().catch((err) => {
  console.error('\n❌ Erro fatal durante a execução:', err);
  process.exit(1);
});
