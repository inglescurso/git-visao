import type { CostModel, DeployDifficulty, GitHubRepoMetadata, LicenseType } from './types.ts';

export interface LicenseClassification {
  licenseSpdx: string;
  licenseType: LicenseType;
  licenseBadge: string;
}

export interface DeployClassification {
  deployDifficulty: DeployDifficulty;
  deployBadge: string;
  deployMethod: string;
}

export interface CostClassification {
  isFree: boolean;
  costModel: CostModel;
  costBadge: string;
  costNotes: string;
}

export interface ParsedGitHubRepo {
  owner: string;
  name: string;
  repoKey: string;
  fullName: string;
  repoUrl: string;
}

export function parseGitHubRepoInput(input: string): ParsedGitHubRepo | null {
  if (!input || typeof input !== 'string') return null;

  let cleaned = input.trim();
  if (!cleaned) return null;

  // Remove URL protocol and domain if present
  cleaned = cleaned
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/^github\.com\//i, '')
    .replace(/^\/+/, '');

  // Strip query string and hash
  cleaned = cleaned.split('?')[0].split('#')[0];

  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const owner = parts[0].trim();
  const rawName = parts[1].trim().replace(/\.git$/i, '');

  const validSegment = /^[a-zA-Z0-9._-]+$/;
  if (!owner || !rawName || !validSegment.test(owner) || !validSegment.test(rawName)) {
    return null;
  }

  const fullName = `${owner}/${rawName}`;
  const repoKey = fullName.toLowerCase();
  const repoUrl = `https://github.com/${fullName}`;

  return {
    owner,
    name: rawName,
    repoKey,
    fullName,
    repoUrl
  };
}

function decodeBase64Utf8(base64: string): string {
  try {
    const clean = base64.replace(/\s+/g, '');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

export function classifyLicense(
  apiLicense?: { spdx_id?: string | null; key?: string | null; name?: string | null } | null,
  inspectionText = ''
): LicenseClassification {
  let spdxId = (apiLicense?.spdx_id || '').trim();
  const licenseKey = (apiLicense?.key || '').toLowerCase().trim();

  // If license is null, "NOASSERTION", or "other", inspect raw license or README text
  if (!spdxId || spdxId === 'NOASSERTION' || licenseKey === 'other') {
    if (/sustainable use|business source license|bsl-1\.1|busl-1\.1/i.test(inspectionText)) {
      spdxId = 'BSL-1.1';
    } else if (/mit license|the mit license/i.test(inspectionText)) {
      spdxId = 'MIT';
    } else if (/apache license|apache-2\.0|apache 2\.0/i.test(inspectionText)) {
      spdxId = 'Apache-2.0';
    } else if (/gnu affero general public license|agpl-3\.0|agpl/i.test(inspectionText)) {
      spdxId = 'AGPL-3.0';
    } else if (/gnu general public license|gpl-3\.0|gpl-2\.0/i.test(inspectionText)) {
      spdxId = 'GPL-3.0';
    } else if (/fair-code/i.test(inspectionText)) {
      spdxId = 'Fair-code';
    }
  }

  const spdxUpper = spdxId.toUpperCase();
  const PERMISSIVE_SPDX = [
    'MIT',
    'APACHE-2.0',
    'BSD-2-CLAUSE',
    'BSD-3-CLAUSE',
    'ISC',
    '0BSD',
    'UNLICENSE'
  ];

  const COPYLEFT_SPDX = [
    'AGPL-3.0',
    'AGPL-3.0-ONLY',
    'AGPL-3.0-OR-LATER',
    'GPL-3.0',
    'GPL-3.0-ONLY',
    'GPL-3.0-OR-LATER',
    'GPL-2.0',
    'GPL-2.0-ONLY',
    'GPL-2.0-OR-LATER',
    'LGPL-3.0',
    'LGPL-2.1',
    'EUPL-1.2',
    'MPL-2.0'
  ];

  const SOURCE_AVAILABLE_SPDX = [
    'BSL-1.1',
    'BUSL-1.1',
    'SSPL-1.0',
    'ELASTIC-2.0',
    'FAIR-CODE'
  ];

  if (
    PERMISSIVE_SPDX.includes(spdxUpper) ||
    ['mit', 'apache-2.0', 'isc', 'unlicense', 'bsd-2-clause', 'bsd-3-clause', '0bsd'].includes(licenseKey)
  ) {
    const displaySpdx = spdxId && spdxId !== 'NOASSERTION' ? spdxId : 'MIT';
    return {
      licenseSpdx: displaySpdx,
      licenseType: 'permissive',
      licenseBadge: `🟢 ${displaySpdx} (Open Source Permissivo)`
    };
  }

  if (
    COPYLEFT_SPDX.includes(spdxUpper) ||
    ['gpl-3.0', 'gpl-2.0', 'agpl-3.0', 'lgpl-3.0'].includes(licenseKey)
  ) {
    return {
      licenseSpdx: spdxId || 'AGPL-3.0',
      licenseType: 'copyleft',
      licenseBadge: '🟡 Copyleft (AGPL/GPL)'
    };
  }

  if (
    SOURCE_AVAILABLE_SPDX.includes(spdxUpper) ||
    ['bsl-1.1', 'sspl-1.0', 'elastic-2.0'].includes(licenseKey) ||
    /sustainable use|business source license|fair-code/i.test(inspectionText)
  ) {
    return {
      licenseSpdx: spdxId || 'BSL-1.1',
      licenseType: 'source-available',
      licenseBadge: '🔴 Source-Available (Não-OSI)'
    };
  }

  return {
    licenseSpdx: spdxId && spdxId !== 'NOASSERTION' ? spdxId : 'None',
    licenseType: 'unlicensed',
    licenseBadge: '⚪ Sem Licença (All Rights Reserved)'
  };
}

export function classifyDeployDifficulty(
  filePaths: string[] = [],
  rawReadme = '',
  description = ''
): DeployClassification {
  const lowerPaths = filePaths.map((p) => p.toLowerCase());
  const combinedText = `${description}\n${rawReadme}`.toLowerCase();

  // Nível 3 - Avançado
  const hasK8s =
    lowerPaths.some(
      (p) =>
        p.includes('k8s/') ||
        p.startsWith('k8s/') ||
        p.includes('kubernetes/') ||
        p.startsWith('kubernetes/') ||
        p.includes('helm/') ||
        p.startsWith('helm/') ||
        p.endsWith('chart.yaml') ||
        p === 'chart.yaml'
    ) || /\bk8s\b|\bkubernetes\b|\bhelm chart\b/i.test(rawReadme);

  const hasCMake =
    lowerPaths.some((p) => p.endsWith('cmakelists.txt') || p === 'cmakelists.txt') ||
    /cmakelists\.txt/i.test(rawReadme);

  const hasCudaGpu =
    /\bcuda\b|nvidia gpu|torch\.cuda|requires gpu|gpu required|cuda-enabled/i.test(combinedText);

  const composeImageMatches = rawReadme.match(/image:\s*|container_name:\s*/gi) || [];
  const has4ServicesInReadme = composeImageMatches.length >= 4;

  if (hasK8s || hasCMake || hasCudaGpu || has4ServicesInReadme) {
    return {
      deployDifficulty: 'advanced',
      deployBadge: '🔴 Avançado (K8s / Compilação / GPU)',
      deployMethod: 'Cluster / Compilação Nativa'
    };
  }

  // Nível 1 - Fácil / Plug & Play
  const has1ClickConfig = lowerPaths.some(
    (p) =>
      p.endsWith('wrangler.toml') ||
      p === 'wrangler.toml' ||
      p.endsWith('wrangler.jsonc') ||
      p === 'wrangler.jsonc' ||
      p.endsWith('vercel.json') ||
      p === 'vercel.json' ||
      p.endsWith('netlify.toml') ||
      p === 'netlify.toml' ||
      p.endsWith('manifest.json') ||
      p === 'manifest.json'
  );

  const hasQuickInstall =
    /npm (i|install) -g|pip install|brew install|cargo install|\.exe\b|\.dmg\b|\.appimage\b|chrome web store|deploy with vercel|deploy to netlify|deploy to cloudflare/i.test(
      rawReadme
    );

  if (has1ClickConfig || hasQuickInstall) {
    return {
      deployDifficulty: 'easy',
      deployBadge: '🟢 Fácil (Plug & Play / 1-Click)',
      deployMethod: '1-Click Deploy / Binário'
    };
  }

  // Nível 2 - Médio (Docker Compose / Local / .env / package.json sem 1-click)
  return {
    deployDifficulty: 'medium',
    deployBadge: '🟡 Médio (Docker / Configuração .env)',
    deployMethod: 'Docker Compose / Local'
  };
}

export function classifyCostModel(
  rawReadme = '',
  description = '',
  licenseType: LicenseType = 'permissive'
): CostClassification {
  const scanText = `${description}\n${rawReadme}`.toLowerCase();

  // Infraestrutura Paga (Tarifada externa)
  const hasPaidInfra =
    scanText.includes('whatsapp cloud api') ||
    scanText.includes('meta cloud api') ||
    scanText.includes('meta whatsapp') ||
    scanText.includes('twilio') ||
    scanText.includes('vps dedicada') ||
    scanText.includes('dedicated vps') ||
    scanText.includes('supabase pago') ||
    scanText.includes('supabase pro');

  if (hasPaidInfra) {
    return {
      isFree: false,
      costModel: 'paid-external',
      costBadge: '🔴 Custos Externos Obrigatórios',
      costNotes: 'Exige serviços de nuvem ou APIs pagas de terceiros.'
    };
  }

  // Freemium / Open Core
  const hasFreemium =
    scanText.includes('enterprise edition') ||
    scanText.includes('enterprise version') ||
    scanText.includes('sustainable use license') ||
    scanText.includes('cloud pricing') ||
    scanText.includes('free tier') ||
    scanText.includes('commercial license') ||
    licenseType === 'source-available';

  if (hasFreemium) {
    return {
      isFree: false,
      costModel: 'freemium',
      costBadge: '🟠 Freemium / Open Core',
      costNotes: 'Uso básico/pessoal grátis; recursos corporativos exigem plano pago.'
    };
  }

  // Grátis com Chaves Próprias (BYOK)
  const hasAiKeys =
    scanText.includes('openai_api_key') ||
    scanText.includes('anthropic_api_key') ||
    scanText.includes('gemini_api_key') ||
    scanText.includes('groq_api_key') ||
    scanText.includes('deepseek_api_key') ||
    scanText.includes('mistral_api_key') ||
    scanText.includes('openrouter_api_key') ||
    scanText.includes('cohere_api_key');

  if (hasAiKeys) {
    return {
      isFree: true,
      costModel: 'byok',
      costBadge: '🟡 Grátis (BYOK Chaves de IA)',
      costNotes: 'Código grátis; consome créditos de API de IA contratados separadamente.'
    };
  }

  // 100% Grátis & Local (Ollama, Localhost, SQLite, Offline)
  return {
    isFree: true,
    costModel: 'free-local',
    costBadge: '🟢 100% Grátis & Local',
    costNotes: 'Roda offline no seu computador sem chaves de API nem assinaturas.'
  };
}

export async function fetchGitHubRepoMetadata(
  input: string,
  githubToken?: string
): Promise<GitHubRepoMetadata> {
  const parsed = parseGitHubRepoInput(input);
  if (!parsed) {
    throw new Error(
      'URL ou identificador do GitHub inválido. Informe algo como https://github.com/owner/repo ou owner/repo.'
    );
  }

  const headers: Record<string, string> = {
    'User-Agent': 'git-visao-cloudflare-worker',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  if (githubToken && githubToken.trim()) {
    headers.Authorization = `Bearer ${githubToken.trim()}`;
  }

  const baseApiUrl = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}`;

  const [repoRes, commitsSettled, readmeSettled] = await Promise.all([
    fetch(baseApiUrl, { headers }),
    fetch(`${baseApiUrl}/commits?per_page=1`, { headers }).catch(() => null),
    fetch(`${baseApiUrl}/readme`, {
      headers: {
        ...headers,
        Accept: 'application/vnd.github.raw+json'
      }
    }).catch(() => null)
  ]);

  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new Error(`Repositório "${parsed.fullName}" não encontrado no GitHub (404). Verifique se ele é público.`);
    }
    if (repoRes.status === 403 || repoRes.status === 429) {
      throw new Error(
        `Limite de requisições da API do GitHub atingido (${repoRes.status}). Configure GITHUB_TOKEN nas variáveis do Worker.`
      );
    }
    throw new Error(`Falha ao consultar API do GitHub (${repoRes.status}).`);
  }

  const repoData = (await repoRes.json()) as {
    full_name?: string;
    name?: string;
    owner?: { login?: string };
    html_url?: string;
    description?: string | null;
    stargazers_count?: number;
    forks_count?: number;
    language?: string | null;
    topics?: string[];
    pushed_at?: string;
    updated_at?: string;
    default_branch?: string;
    license?: {
      key?: string;
      name?: string;
      spdx_id?: string;
      url?: string;
    } | null;
  };

  let lastCommitAt = repoData.pushed_at || repoData.updated_at || new Date().toISOString();
  if (commitsSettled && commitsSettled.ok) {
    try {
      const commitsData = (await commitsSettled.json()) as Array<{
        commit?: {
          committer?: { date?: string };
          author?: { date?: string };
        };
      }>;
      const commitDate =
        commitsData?.[0]?.commit?.committer?.date || commitsData?.[0]?.commit?.author?.date;
      if (commitDate) {
        lastCommitAt = commitDate;
      }
    } catch {
      // Keep fallback pushed_at
    }
  }

  let rawReadme = '';
  if (readmeSettled && readmeSettled.ok) {
    try {
      const contentType = readmeSettled.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const readmeJson = (await readmeSettled.json()) as { content?: string; encoding?: string };
        if (readmeJson.content && readmeJson.encoding === 'base64') {
          rawReadme = decodeBase64Utf8(readmeJson.content);
        }
      } else {
        rawReadme = await readmeSettled.text();
      }
    } catch {
      rawReadme = '';
    }
  }

  // Clean and limit README to at most 6000 chars for LLM / summary consumption
  const readmeExcerpt = rawReadme
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 6000);

  // Fetch repository tree (recursive) to detect configuration files and deployment signals
  const defaultBranch = repoData.default_branch || 'main';
  let filePaths: string[] = [];
  try {
    const treeRes = await fetch(
      `${baseApiUrl}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
      { headers }
    ).catch(() => null);
    if (treeRes && treeRes.ok) {
      const treeData = (await treeRes.json()) as { tree?: Array<{ path?: string }> };
      if (Array.isArray(treeData?.tree)) {
        filePaths = treeData.tree.map((t) => t.path || '').filter(Boolean);
      }
    }
  } catch {
    // Graceful fallback if 404 or rate limit
  }

  // Fallback check for LICENSE file if repoData.license is missing or NOASSERTION / other
  let licenseFileContent = '';
  if (
    !repoData.license ||
    !repoData.license.spdx_id ||
    repoData.license.spdx_id === 'NOASSERTION' ||
    repoData.license.key === 'other'
  ) {
    try {
      const licRes = await fetch(`${baseApiUrl}/license`, {
        headers: {
          ...headers,
          Accept: 'application/vnd.github.raw+json'
        }
      }).catch(() => null);
      if (licRes && licRes.ok) {
        licenseFileContent = await licRes.text();
      }
    } catch {
      // Graceful fallback
    }
  }

  const inspectionText = `${licenseFileContent}\n${rawReadme}`;
  const licenseClassification = classifyLicense(repoData.license, inspectionText);
  const deployClassification = classifyDeployDifficulty(
    filePaths,
    rawReadme,
    repoData.description || ''
  );
  const costClassification = classifyCostModel(
    rawReadme,
    repoData.description || '',
    licenseClassification.licenseType
  );

  const owner = repoData.owner?.login || parsed.owner;
  const name = repoData.name || parsed.name;
  const fullName = repoData.full_name || `${owner}/${name}`;
  const repoKey = fullName.toLowerCase();
  const repoUrl = repoData.html_url || `https://github.com/${fullName}`;

  return {
    repoKey,
    fullName,
    owner,
    name,
    repoUrl,
    description: (repoData.description || '').trim(),
    stars: Number(repoData.stargazers_count || 0),
    forks: Number(repoData.forks_count || 0),
    language: repoData.language || 'Open Source',
    topics: Array.isArray(repoData.topics) ? repoData.topics.slice(0, 12) : [],
    lastCommitAt,
    readmeExcerpt,
    licenseSpdx: licenseClassification.licenseSpdx,
    licenseType: licenseClassification.licenseType,
    licenseBadge: licenseClassification.licenseBadge,
    isFree: costClassification.isFree,
    costModel: costClassification.costModel,
    costBadge: costClassification.costBadge,
    costNotes: costClassification.costNotes,
    deployDifficulty: deployClassification.deployDifficulty,
    deployBadge: deployClassification.deployBadge,
    deployMethod: deployClassification.deployMethod,
    license_spdx: licenseClassification.licenseSpdx,
    license_type: licenseClassification.licenseType,
    license_badge: licenseClassification.licenseBadge,
    is_free: costClassification.isFree ? 1 : 0,
    cost_model: costClassification.costModel,
    cost_badge: costClassification.costBadge,
    cost_notes: costClassification.costNotes,
    deploy_difficulty: deployClassification.deployDifficulty,
    deploy_badge: deployClassification.deployBadge,
    deploy_method: deployClassification.deployMethod
  };
}
