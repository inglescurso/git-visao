import type { GitHubRepoMetadata } from './types.ts';

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

export async function fetchGitHubRepoMetadata(
  input: string,
  githubToken?: string
): Promise<GitHubRepoMetadata> {
  const parsed = parseGitHubRepoInput(input);
  if (!parsed) {
    throw new Error('URL ou identificador do GitHub inválido. Informe algo como https://github.com/owner/repo ou owner/repo.');
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

  let readmeExcerpt = '';
  if (readmeSettled && readmeSettled.ok) {
    try {
      const contentType = readmeSettled.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const readmeJson = (await readmeSettled.json()) as { content?: string; encoding?: string };
        if (readmeJson.content && readmeJson.encoding === 'base64') {
          readmeExcerpt = decodeBase64Utf8(readmeJson.content);
        }
      } else {
        readmeExcerpt = await readmeSettled.text();
      }
    } catch {
      readmeExcerpt = '';
    }
  }

  // Clean and limit README to at most 6000 chars to save memory/tokens at the edge
  readmeExcerpt = readmeExcerpt
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 6000);

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
    readmeExcerpt
  };
}
