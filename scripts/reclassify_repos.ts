#!/usr/bin/env node
/**
 * Script de Reclassificação e Auditoria em Lote - Git-Visão
 * 
 * Funcionalidades:
 * - Consulta repositórios cadastrados via GET /api/repos (com paginação por cursor)
 * - Extrai e reclassifica Licença (Permissiva, Copyleft, Source-Available, Sem Licença)
 * - Extrai e detecta Modelo de Custos (100% Grátis & Local, BYOK IA, Freemium, Infra Paga)
 * - Extrai e infere Grau de Instalação (Fácil Plug&Play, Médio Docker/.env, Avançado K8s/GPU)
 * - Reconstrói o whatsapp_text com o bloco oficial de FICHA TÉCNICA
 * - Suporta --dry-run para auditoria local sem alterar banco
 * - Suporta --target <url>, --password <senha>, --limit <n>, --force
 * - Mantém checkpoint em scripts/reclassify_progress.json (tolerante a interrupções)
 * - Emite relatório consolidado com estatísticas completas ao final
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  classifyLicense,
  classifyDeployDifficulty,
  classifyCostModel,
  fetchGitHubRepoMetadata,
  type LicenseType,
  type CostModel,
  type DeployDifficulty
} from '../src/github.ts';

import {
  buildWhatsAppText,
  detectCategory,
  detectTemplateType,
  type RepoTechnicalInfo
} from '../src/templates.ts';

import type { GitHubRepoMetadata, GeneratedVisaoSummary, CategoryName, TemplateType } from '../src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface CliConfig {
  targetUrl: string;
  adminPassword: string;
  limit?: number;
  delayMs: number;
  dryRun: boolean;
  force: boolean;
  progressFile: string;
  githubToken?: string;
}

export interface ReclassifyRecord {
  status: 'success' | 'error' | 'skipped';
  repo: string;
  category?: string;
  licenseType?: LicenseType | string;
  licenseSpdx?: string;
  licenseBadge?: string;
  isFree?: boolean;
  costModel?: CostModel | string;
  costBadge?: string;
  deployDifficulty?: DeployDifficulty | string;
  deployBadge?: string;
  error?: string;
  updatedAt: string;
}

export interface ReclassifyStats {
  total: number;
  success: number;
  skipped: number;
  errors: number;
  byLicense: Record<string, number>;
  byCost: Record<string, number>;
  byDifficulty: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface ProgressStore {
  lastRunAt: string;
  targetUrl: string;
  records: Record<string, ReclassifyRecord>;
  stats?: Partial<ReclassifyStats>;
}

// ============================================================================
// PARSE DE ARGUMENTOS DA LINHA DE COMANDO
// ============================================================================

export function parseCliArgs(argv: string[] = process.argv.slice(2)): CliConfig {
  const getArg = (flag: string): string | undefined => {
    const idx = argv.findIndex((a) => a === flag || a.startsWith(`${flag}=`));
    if (idx === -1) return undefined;
    const item = argv[idx];
    if (item.includes('=')) {
      return item.split('=')[1];
    }
    return argv[idx + 1];
  };

  const hasFlag = (flag: string): boolean => {
    return argv.some((a) => a === flag || a.startsWith(`${flag}=`));
  };

  const rawTarget =
    getArg('--target') ||
    process.env.TARGET_URL ||
    'https://vision.24hs.eu.org';
  const targetUrl = rawTarget.replace(/\/+$/, '');

  const adminPassword =
    getArg('--password') || process.env.ADMIN_PASSWORD || '12131415';

  const rawLimit = getArg('--limit') || process.env.LIMIT;
  const limit = rawLimit ? parseInt(rawLimit, 10) : undefined;

  const rawDelay = getArg('--delay') || process.env.DELAY_MS;
  const delayMs = rawDelay ? parseInt(rawDelay, 10) : 1200;

  const dryRun =
    hasFlag('--dry-run') || process.env.DRY_RUN === 'true' || false;

  const force =
    hasFlag('--force') || process.env.FORCE === 'true' || false;

  const progressFile =
    getArg('--progress') ||
    process.env.PROGRESS_FILE ||
    path.join(__dirname, 'reclassify_progress.json');

  const githubToken =
    getArg('--github-token') || process.env.GITHUB_TOKEN || undefined;

  return {
    targetUrl,
    adminPassword,
    limit: limit && !isNaN(limit) && limit > 0 ? limit : undefined,
    delayMs: isNaN(delayMs) || delayMs < 0 ? 1200 : delayMs,
    dryRun,
    force,
    progressFile,
    githubToken
  };
}

// ============================================================================
// GERENCIAMENTO DE CHECKPOINT
// ============================================================================

export function loadProgress(filePath: string, targetUrl: string): ProgressStore {
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.records === 'object') {
        return parsed as ProgressStore;
      }
    } catch {
      console.warn(`⚠️ Aviso: Checkpoint corrompido em ${filePath}. Criando novo.`);
    }
  }

  return {
    lastRunAt: new Date().toISOString(),
    targetUrl,
    records: {}
  };
}

export function saveProgress(filePath: string, store: ProgressStore): void {
  try {
    store.lastRunAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error(`❌ Erro ao salvar checkpoint em ${filePath}:`, err);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// BUSCA DE REPOSITÓRIOS CADASTRADOS (COM PAGINAÇÃO)
// ============================================================================

export interface RemoteRepoItem {
  id?: number;
  repo_key?: string;
  full_name?: string;
  name?: string;
  owner?: string;
  repo_url?: string;
  description?: string;
  stars?: number;
  forks?: number;
  language?: string;
  topics?: string[];
  last_commit_at?: string;
  category?: CategoryName;
  template_type?: TemplateType;
  hook_title?: string;
  intro_text?: string;
  warning_note?: string;
  features?: string[];
  scenario_title?: string;
  scenario_intro?: string;
  scenario_prompt?: string;
  scenario_steps?: string[];
  scenario_outro?: string;
  killer_title?: string;
  killer_text?: string;
  summary_text?: string;
  punchline?: string;
  whatsapp_text?: string;
  [key: string]: unknown;
}

export async function fetchAllCatalogRepos(
  config: CliConfig
): Promise<RemoteRepoItem[]> {
  const allRepos: RemoteRepoItem[] = [];
  let cursor: string | null = null;
  let hasMore = true;
  let page = 1;

  console.log(`📡 Consultando catálogo cadastrado em ${config.targetUrl}/api/repos...`);

  while (hasMore) {
    const url = new URL(`${config.targetUrl}/api/repos`);
    url.searchParams.set('limit', '100');
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    try {
      const res = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'git-visao-reclassifier'
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as {
        ok?: boolean;
        items?: RemoteRepoItem[];
        total?: number;
        hasMore?: boolean;
        nextCursor?: string | null;
      };

      if (!data.items || !Array.isArray(data.items)) {
        break;
      }

      for (const item of data.items) {
        allRepos.push(item);
        if (config.limit && allRepos.length >= config.limit) {
          hasMore = false;
          break;
        }
      }

      console.log(`   📄 Página ${page}: recuperados ${data.items.length} repos (Total acumulado: ${allRepos.length})`);

      if (data.hasMore && data.nextCursor && (!config.limit || allRepos.length < config.limit)) {
        cursor = data.nextCursor;
        page++;
        await sleep(300);
      } else {
        hasMore = false;
      }
    } catch (err: any) {
      console.warn(`   ⚠️ Falha ao consultar /api/repos na página ${page}: ${err.message}`);
      break;
    }
  }

  // Fallback: se a API remota não respondeu ou retornou vazia, tentar ler import_progress.json
  if (allRepos.length === 0) {
    const localImportProgress = path.join(__dirname, 'import_progress.json');
    if (fs.existsSync(localImportProgress)) {
      console.log(`ℹ️ Usando scripts/import_progress.json como fonte local de fallback...`);
      try {
        const raw = fs.readFileSync(localImportProgress, 'utf-8');
        const parsed = JSON.parse(raw);
        const records = parsed.records || {};
        for (const [key, item] of Object.entries(records) as [string, any][]) {
          const repoName = item.repo || key;
          allRepos.push({
            repo_key: key.toLowerCase(),
            full_name: repoName,
            name: repoName.split('/')[1] || repoName,
            owner: repoName.split('/')[0] || '',
            repo_url: `https://github.com/${repoName}`,
            description: '',
            stars: item.stars || 0,
            category: item.category || 'Outros'
          });
          if (config.limit && allRepos.length >= config.limit) break;
        }
      } catch (err: any) {
        console.warn(`⚠️ Não foi possível carregar fallback local: ${err.message}`);
      }
    }
  }

  return allRepos;
}

// ============================================================================
// AUDITORIA E RECLASSIFICAÇÃO POR REPOSITÓRIO
// ============================================================================

export async function reclassifySingleRepo(
  item: RemoteRepoItem,
  config: CliConfig
): Promise<{
  success: boolean;
  record: ReclassifyRecord;
  whatsappText: string;
}> {
  const fullName = (item.full_name || item.name || item.repo_key || '').trim();
  const repoKey = fullName.toLowerCase();

  // 1. Tenta obter metadados ricos do GitHub com fallback gracioso aos campos locais
  let meta: GitHubRepoMetadata;
  try {
    meta = await fetchGitHubRepoMetadata(fullName, config.githubToken);
  } catch {
    // Se a API do GitHub der rate limit ou falhar, roda heurísticas nos dados locais
    const desc = item.description || '';
    const topics = Array.isArray(item.topics) ? item.topics : [];
    const licenseClass = classifyLicense(null, `${desc}\n${topics.join(' ')}`);
    const deployClass = classifyDeployDifficulty([], desc, desc);
    const costClass = classifyCostModel(desc, desc, licenseClass.licenseType);

    meta = {
      repoKey,
      fullName,
      owner: item.owner || fullName.split('/')[0] || '',
      name: item.name || fullName.split('/')[1] || fullName,
      repoUrl: item.repo_url || `https://github.com/${fullName}`,
      description: desc,
      stars: Number(item.stars || 0),
      forks: Number(item.forks || 0),
      language: item.language || 'Open Source',
      topics,
      lastCommitAt: item.last_commit_at || new Date().toISOString(),
      readmeExcerpt: '',
      licenseSpdx: licenseClass.licenseSpdx,
      licenseType: licenseClass.licenseType,
      licenseBadge: licenseClass.licenseBadge,
      isFree: costClass.isFree,
      costModel: costClass.costModel,
      costBadge: costClass.costBadge,
      costNotes: costClass.costNotes,
      deployDifficulty: deployClass.deployDifficulty,
      deployBadge: deployClass.deployBadge,
      deployMethod: deployClass.deployMethod
    };
  }

  // 2. Classificação de Categoria e Template
  const templateType = item.template_type || detectTemplateType(meta);
  const category = item.category || detectCategory(meta, templateType);

  // 3. Reconstruir whatsapp_text com a Ficha Técnica
  const summaryForTemplate: Omit<GeneratedVisaoSummary, 'whatsappText'> & RepoTechnicalInfo = {
    category,
    templateType,
    hookTitle: item.hook_title || `🔥 ${meta.name}: Nova ferramenta open-source catalogada`,
    introText: item.intro_text || meta.description || 'Solução moderna para turbinar sua operação.',
    warningNote: item.warning_note || '',
    features: Array.isArray(item.features) && item.features.length ? item.features : [
      '⚡ Operação de alta performance e código aberto',
      '🔒 Segurança e controle total sobre a infraestrutura',
      '🚀 Rápida adoção com excelente custo-benefício'
    ],
    scenarioTitle: item.scenario_title || '',
    scenarioIntro: item.scenario_intro || '',
    scenarioPrompt: item.scenario_prompt || '',
    scenarioSteps: Array.isArray(item.scenario_steps) && item.scenario_steps.length ? item.scenario_steps : [
      'Conecte o serviço com seu fluxo de trabalho',
      'Execute as rotinas automatizadas com estabilidade',
      'Monitore os resultados em tempo real'
    ],
    scenarioOutro: item.scenario_outro || '',
    killerTitle: item.killer_title || '',
    killerText: item.killer_text || 'A combinação perfeita entre liberdade tecnológica e controle absoluto.',
    summaryText: item.summary_text || 'Ideal para quem busca máxima eficiência sem pagar mensalidades absurdas.',
    punchline: item.punchline || '🚀 Coloque no seu radar e teste ainda hoje!',
    licenseBadge: meta.licenseBadge,
    costBadge: meta.costBadge,
    costNotes: meta.costNotes,
    deployBadge: meta.deployBadge,
    deployMethod: meta.deployMethod
  };

  const whatsappText = buildWhatsAppText(meta, summaryForTemplate);

  const record: ReclassifyRecord = {
    status: 'success',
    repo: fullName,
    category,
    licenseType: meta.licenseType,
    licenseSpdx: meta.licenseSpdx,
    licenseBadge: meta.licenseBadge,
    isFree: Boolean(meta.isFree),
    costModel: meta.costModel,
    costBadge: meta.costBadge,
    deployDifficulty: meta.deployDifficulty,
    deployBadge: meta.deployBadge,
    updatedAt: new Date().toISOString()
  };

  // 4. Se não for dry-run, atualiza no servidor via POST /api/repos com force: true
  if (!config.dryRun) {
    try {
      const updateRes = await fetch(`${config.targetUrl}/api/repos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': config.adminPassword
        },
        body: JSON.stringify({
          repo: fullName,
          password: config.adminPassword,
          force: true
        })
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        record.status = 'error';
        record.error = `HTTP ${updateRes.status}: ${errText.slice(0, 200)}`;
        return { success: false, record, whatsappText };
      }
    } catch (err: any) {
      record.status = 'error';
      record.error = err.message || 'Falha de rede ao atualizar repositório';
      return { success: false, record, whatsappText };
    }
  }

  return { success: true, record, whatsappText };
}

// ============================================================================
// RELATÓRIO ESTATÍSTICO CONSOLIDADO
// ============================================================================

export function printConsolidatedReport(stats: ReclassifyStats, isDryRun: boolean): void {
  console.log(`\n======================================================================`);
  console.log(`📊 RELATÓRIO ESTATÍSTICO DE RECLASSIFICAÇÃO & QUALIDADE QA`);
  console.log(`======================================================================`);
  console.log(`• Modo de execução     : ${isDryRun ? 'DRY-RUN (Auditoria e Análise)' : 'PRODUÇÃO (Atualizado no D1/KV)'}`);
  console.log(`• Total analisados     : ${stats.total}`);
  console.log(`• Concluídos com êxito : ${stats.success}`);
  console.log(`• Pulados (Checkpoint) : ${stats.skipped}`);
  console.log(`• Falhas / Erros       : ${stats.errors}`);
  console.log(`----------------------------------------------------------------------`);

  // 1. Licenças
  console.log(`\n⚖️  DISTRIBUIÇÃO POR TIPO DE LICENÇA:`);
  const totalLic = Object.values(stats.byLicense).reduce((a, b) => a + b, 0) || 1;
  const licenseOrder = [
    { key: 'permissive', label: '🟢 Permissiva (MIT, Apache, BSD)' },
    { key: 'copyleft', label: '🟡 Copyleft (AGPL, GPL, LGPL)' },
    { key: 'source-available', label: '🔴 Source-Available (BSL, Fair-code)' },
    { key: 'unlicensed', label: '⚪ Sem Licença (All Rights Reserved)' },
    { key: 'unspecified', label: '❓ Não Especificada' }
  ];
  for (const item of licenseOrder) {
    const count = stats.byLicense[item.key] || 0;
    const pct = ((count / totalLic) * 100).toFixed(1);
    console.log(`   ${item.label.padEnd(46)}: ${String(count).padStart(4)} (${pct}%)`);
  }

  // 2. Custos
  console.log(`\n💰 DISTRIBUIÇÃO POR MODELO DE CUSTOS REAIS:`);
  const totalCost = Object.values(stats.byCost).reduce((a, b) => a + b, 0) || 1;
  const costOrder = [
    { key: 'free-local', label: '🟢 100% Grátis & Local (Ollama, SQLite)' },
    { key: 'byok', label: '🟡 Grátis com BYOK (Chaves de IA)' },
    { key: 'freemium', label: '🟠 Freemium / Open Core (Enterprise)' },
    { key: 'paid-external', label: '🔴 Custos Externos (Cloud/WhatsApp API)' },
    { key: 'unknown', label: '❓ Custo Desconhecido' }
  ];
  for (const item of costOrder) {
    const count = stats.byCost[item.key] || 0;
    const pct = ((count / totalCost) * 100).toFixed(1);
    console.log(`   ${item.label.padEnd(46)}: ${String(count).padStart(4)} (${pct}%)`);
  }

  // 3. Dificuldade de Instalação
  console.log(`\n⚙️  DISTRIBUIÇÃO POR DIFICULDADE DE INSTALAÇÃO:`);
  const totalDiff = Object.values(stats.byDifficulty).reduce((a, b) => a + b, 0) || 1;
  const diffOrder = [
    { key: 'easy', label: '🟢 Fácil (Plug & Play / 1-Click / CLI)' },
    { key: 'medium', label: '🟡 Médio (Docker Compose / .env)' },
    { key: 'advanced', label: '🔴 Avançado (K8s / Compilação / GPU)' }
  ];
  for (const item of diffOrder) {
    const count = stats.byDifficulty[item.key] || 0;
    const pct = ((count / totalDiff) * 100).toFixed(1);
    console.log(`   ${item.label.padEnd(46)}: ${String(count).padStart(4)} (${pct}%)`);
  }

  // 4. Categorias
  console.log(`\n🏷️  DISTRIBUIÇÃO POR MACRO-CATEGORIA:`);
  for (const [cat, count] of Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / stats.total) * 100).toFixed(1);
    console.log(`   ${cat.padEnd(40)}: ${String(count).padStart(4)} (${pct}%)`);
  }

  console.log(`======================================================================\n`);
}

// ============================================================================
// EXECUÇÃO PRINCIPAL
// ============================================================================

export async function main(): Promise<void> {
  const config = parseCliArgs();

  console.log(`\n============================================================`);
  console.log(`🚀 RECLASSIFICADOR EM LOTE - GIT-VISÃO (LICENÇAS, CUSTOS & QA)`);
  console.log(`============================================================`);
  console.log(`• Alvo da API    : ${config.targetUrl}`);
  console.log(`• Modo Dry-Run   : ${config.dryRun ? 'SIM (Apenas auditoria/estatísticas)' : 'NÃO (Gravação ativa no D1)'}`);
  console.log(`• Limite         : ${config.limit ? config.limit : 'Todos os repositórios'}`);
  console.log(`• Forçar tudo    : ${config.force ? 'SIM' : 'NÃO (Usa checkpoint)'}`);
  console.log(`• Checkpoint     : ${config.progressFile}`);
  console.log(`• Delay entre req: ${config.delayMs}ms`);
  console.log(`============================================================\n`);

  const progressStore = loadProgress(config.progressFile, config.targetUrl);

  // Manipulador de interrupção (Ctrl+C)
  process.on('SIGINT', () => {
    console.log(`\n\n⚠️ Interrupção detectada (SIGINT/Ctrl+C). Salvando checkpoint e encerrando...`);
    saveProgress(config.progressFile, progressStore);
    process.exit(0);
  });

  const repos = await fetchAllCatalogRepos(config);
  const total = repos.length;

  if (total === 0) {
    console.error(`❌ Nenhum repositório encontrado para reclassificar.`);
    process.exit(1);
  }

  console.log(`\n📦 Total de repositórios para processar: ${total}\n`);

  const stats: ReclassifyStats = {
    total,
    success: 0,
    skipped: 0,
    errors: 0,
    byLicense: {},
    byCost: {},
    byDifficulty: {},
    byCategory: {}
  };

  for (let i = 0; i < total; i++) {
    const item = repos[i];
    const fullName = (item.full_name || item.name || item.repo_key || '').trim();
    if (!fullName) continue;

    const repoKey = fullName.toLowerCase();
    const currentNum = i + 1;
    const pct = Math.round((currentNum / total) * 100);
    const prefix = `[${currentNum}/${total}] (${pct}%)`;

    // 1. Verificação de Checkpoint
    const existing = progressStore.records[repoKey];
    if (!config.force && existing && existing.status === 'success') {
      console.log(`${prefix} ⏭️ Pulando ${fullName} (Já reclassificado anteriormente)`);
      stats.skipped++;

      // Acumula estatísticas existentes
      const lic = existing.licenseType || 'unspecified';
      stats.byLicense[lic] = (stats.byLicense[lic] || 0) + 1;
      const cst = existing.costModel || 'unknown';
      stats.byCost[cst] = (stats.byCost[cst] || 0) + 1;
      const diff = existing.deployDifficulty || 'medium';
      stats.byDifficulty[diff] = (stats.byDifficulty[diff] || 0) + 1;
      const cat = existing.category || 'Outros';
      stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
      continue;
    }

    // 2. Executar Reclassificação
    process.stdout.write(`${prefix} 🔍 Analisando ${fullName}... `);

    const { success, record } = await reclassifySingleRepo(item, config);

    progressStore.records[repoKey] = record;
    saveProgress(config.progressFile, progressStore);

    if (success) {
      stats.success++;
      const lic = record.licenseType || 'unspecified';
      stats.byLicense[lic] = (stats.byLicense[lic] || 0) + 1;

      const cst = record.costModel || 'unknown';
      stats.byCost[cst] = (stats.byCost[cst] || 0) + 1;

      const diff = record.deployDifficulty || 'medium';
      stats.byDifficulty[diff] = (stats.byDifficulty[diff] || 0) + 1;

      const cat = record.category || 'Outros';
      stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;

      console.log(`✅ [${record.licenseBadge}] [${record.costBadge}] [${record.deployBadge}]`);
    } else {
      stats.errors++;
      console.log(`❌ Erro: ${record.error}`);
    }

    if (config.delayMs > 0 && i < total - 1) {
      await sleep(config.delayMs);
    }
  }

  // 3. Emitir relatório consolidado
  printConsolidatedReport(stats, config.dryRun);
}

// Executar quando invocado diretamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
  });
}
