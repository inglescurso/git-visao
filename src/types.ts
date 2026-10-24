export type TemplateType =
  | 'app-tool'
  | 'self-hosted-saas'
  | 'infra-gateway'
  | 'dev-lib-cli'
  | 'ai-agent-automation';

export type CategoryName =
  | 'Agentes & Automação IA'
  | 'SaaS & CRM Self-Hosted'
  | 'Infra, Gateways & Edge'
  | 'Apps & Produtividade'
  | 'Libs, SDKs & CLI Dev'
  | 'Outros';

export interface Env {
  DB: D1Database;
  GITVISAO_KV?: KVNamespace;
  OMNI_KEYS?: KVNamespace;
  ADMIN_PASSWORD?: string;
  OMNIROUTE_BASE_URL?: string;
  OMNIROUTE_API_KEY?: string;
  OMNIROUTE_MODEL?: string;
  GITHUB_TOKEN?: string;
  PUBLIC_APP_TITLE?: string;
}

export interface RuntimeSettings {
  adminPassword: string;
  usingDefaultPassword: boolean;
  omnirouteBaseUrl: string;
  omnirouteApiKey: string;
  omnirouteModel: string;
  githubToken: string;
  publicAppTitle: string;
}

export interface GitHubRepoMetadata {
  repoKey: string;
  fullName: string;
  owner: string;
  name: string;
  repoUrl: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  lastCommitAt: string;
  readmeExcerpt: string;
}

export interface GeneratedVisaoSummary {
  category: CategoryName;
  templateType: TemplateType;
  hookTitle: string;
  introText: string;
  warningNote?: string;
  features: string[];
  scenarioTitle: string;
  scenarioIntro: string;
  scenarioPrompt: string;
  scenarioSteps: string[];
  scenarioOutro?: string;
  killerTitle: string;
  killerText: string;
  summaryText: string;
  punchline: string;
  whatsappText: string;
}

export interface RepoRecord {
  id: number;
  repo_key: string;
  full_name: string;
  owner: string;
  name: string;
  repo_url: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  topics_json: string;
  last_commit_at: string;
  category: CategoryName;
  template_type: TemplateType;
  hook_title: string;
  intro_text: string;
  warning_note: string;
  features_json: string;
  scenario_title: string;
  scenario_intro: string;
  scenario_prompt: string;
  scenario_steps_json: string;
  scenario_outro: string;
  killer_title: string;
  killer_text: string;
  summary_text: string;
  punchline: string;
  whatsapp_text: string;
  created_at: string;
  updated_at: string;
}
