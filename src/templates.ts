import type { CategoryName, GeneratedVisaoSummary, GitHubRepoMetadata, TemplateType } from './types.ts';

export interface TemplateMetadata {
  id: TemplateType;
  label: string;
  badgeEmoji: string;
  defaultCategory: CategoryName;
  featureLeadIn: string;
  scenarioHeader: string;
  stepsLeadIn: string;
  killerHeader: string;
  summaryHeader: string;
  description: string;
}

export const TEMPLATE_VARIATIONS: Record<TemplateType, TemplateMetadata> = {
  'ai-agent-automation': {
    id: 'ai-agent-automation',
    label: '1. Agentes & Automações de IA',
    badgeEmoji: '🤖',
    defaultCategory: 'Agentes & Automação IA',
    featureLeadIn: 'Ele funciona integrado ao seu fluxo e pode:',
    scenarioHeader: '🧠 PENSE ASSIM:',
    stepsLeadIn: 'E o agente pode:',
    killerHeader: '🤯 A parte mais interessante?',
    summaryHeader: '📌 RESUMINDO',
    description: 'Focado em agentes autônomos, MCPs, assistentes e automações inteligentes.'
  },
  'self-hosted-saas': {
    id: 'self-hosted-saas',
    label: '2. Sistema Self-Hosted / SaaS Open Source',
    badgeEmoji: '🏢',
    defaultCategory: 'SaaS & CRM Self-Hosted',
    featureLeadIn: 'Ele faz, por exemplo:',
    scenarioHeader: '🧠 PENSE ASSIM:',
    stepsLeadIn: 'E a automação pode:',
    killerHeader: '🔓 O que muda o jogo (Zero Mensalidade)?',
    summaryHeader: '📌 RESUMINDO',
    description: 'Ideal para CRMs, ERPs, painéis de atendimento e substitutos open source de SaaS pagos.'
  },
  'infra-gateway': {
    id: 'infra-gateway',
    label: '3. Infraestrutura / Gateway / DevOps',
    badgeEmoji: '🔀',
    defaultCategory: 'Infra, Gateways & Edge',
    featureLeadIn: 'Ele faz por você:',
    scenarioHeader: '🧠 PENSE ASSIM:',
    stepsLeadIn: 'E o gateway pode:',
    killerHeader: '🛡️ O pulo do gato na arquitetura?',
    summaryHeader: '📌 RESUMINDO',
    description: 'Para gateways de IA, proxies, Workers, Docker e redes.'
  },
  'app-tool': {
    id: 'app-tool',
    label: '4. App / Ferramenta Pronta (Desktop/Web)',
    badgeEmoji: '🖥️',
    defaultCategory: 'Apps & Produtividade',
    featureLeadIn: 'O que ele entrega pronto para usar:',
    scenarioHeader: '⚡ NA PRÁTICA, VOCÊ FAZ ASSIM:',
    stepsLeadIn: 'E a ferramenta faz:',
    killerHeader: '💡 O grande diferencial?',
    summaryHeader: '📌 RESUMINDO',
    description: 'Para aplicativos desktop, extensões de navegador, editores e utilitários prontos.'
  },
  'dev-lib-cli': {
    id: 'dev-lib-cli',
    label: '5. Biblioteca / SDK / CLI para Devs',
    badgeEmoji: '🛠️',
    defaultCategory: 'Libs, SDKs & CLI Dev',
    featureLeadIn: 'Por que colocar essa ferramenta na sua stack:',
    scenarioHeader: '💻 IMAGINE NO SEU PROJETO:',
    stepsLeadIn: 'E a biblioteca resolve:',
    killerHeader: '🚀 Por que os devs estão adotando?',
    summaryHeader: '📌 RESUMINDO',
    description: 'Para pacotes npm/PyPI, frameworks, CLIs de terminal e bibliotecas de código.'
  }
};

export const CATEGORIES: CategoryName[] = [
  'Agentes & Automação IA',
  'SaaS & CRM Self-Hosted',
  'Infra, Gateways & Edge',
  'Apps & Produtividade',
  'Libs, SDKs & CLI Dev',
  'Outros'
];

const STEP_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];

export function formatStarsPtBr(stars: number): string {
  if (!Number.isFinite(stars) || stars < 0) return '0';
  if (stars >= 1000) {
    const k = (stars / 1000).toFixed(1).replace('.', ',').replace(',0', '');
    return `${k} mil`;
  }
  return `${Math.round(stars)}`;
}

export function formatDatePtBr(isoDate: string): string {
  if (!isoDate) return 'data recente';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoDate.trim())) {
    return isoDate.trim();
  }
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function detectTemplateType(meta: GitHubRepoMetadata): TemplateType {
  const hay = `${meta.fullName} ${meta.description} ${meta.topics.join(' ')} ${meta.readmeExcerpt}`.toLowerCase();
  if (/(gateway|worker|cloudflare|proxy|router|veroroute|omniroute|edge|docker|kubernetes|devops|servidor|cdn|tunnel|load-balancer|failover)/.test(hay)) {
    return 'infra-gateway';
  }
  if (/(crm|wacrm|whatsapp|saas|self-hosted|selfhosted|erp|dashboard|painel|atendimento|multiatendimento|kanban|helpdesk|chatwoot)/.test(hay)) {
    return 'self-hosted-saas';
  }
  if (/(agent|agente|browseros|mcp|autonomous|autônomo|cursor|claude|workflow|automation|automação|llm-agent|browser-use)/.test(hay)) {
    return 'ai-agent-automation';
  }
  if (/(sdk|cli|library|biblioteca|framework|package|npm|pip|cargo|plugin|hook|api client| compiler|runtime| ORM )/.test(hay)) {
    return 'dev-lib-cli';
  }
  return 'app-tool';
}

export function detectCategory(meta: GitHubRepoMetadata, templateType?: TemplateType): CategoryName {
  const resolvedTemplate = templateType || detectTemplateType(meta);
  const tpl = TEMPLATE_VARIATIONS[resolvedTemplate];
  if (tpl && tpl.defaultCategory) {
    return tpl.defaultCategory;
  }
  return 'Outros';
}

export function buildWhatsAppText(
  meta: GitHubRepoMetadata,
  summary: Omit<GeneratedVisaoSummary, 'whatsappText'>
): string {
  const tpl = TEMPLATE_VARIATIONS[summary.templateType] || TEMPLATE_VARIATIONS['app-tool'];
  const starsText = formatStarsPtBr(meta.stars);
  const commitDate = formatDatePtBr(meta.lastCommitAt);

  const lines: string[] = [];
  lines.push(summary.hookTitle.trim());
  lines.push('');
  lines.push(summary.introText.trim());
  lines.push('');
  lines.push(`🔗 ${meta.repoUrl}`);
  lines.push(`⭐ ${starsText} estrelas no GitHub`);
  lines.push(`🕒 Último commit em ${commitDate}`);
  lines.push('');

  if (summary.warningNote && summary.warningNote.trim()) {
    lines.push(summary.warningNote.trim());
    lines.push('');
  }

  lines.push(tpl.featureLeadIn);
  lines.push('');
  for (const feat of summary.features) {
    if (feat && feat.trim()) {
      lines.push(feat.trim());
    }
  }
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push(summary.scenarioTitle.trim() || tpl.scenarioHeader);
  lines.push('');
  lines.push(summary.scenarioIntro.trim());
  lines.push('');

  const cleanPrompt = summary.scenarioPrompt.trim().replace(/^["“”]+|["“”]+$/g, '');
  lines.push(`"${cleanPrompt}"`);
  lines.push('');
  lines.push(tpl.stepsLeadIn);
  lines.push('');

  summary.scenarioSteps.forEach((step, idx) => {
    const cleanStep = step.replace(/^(?:[0-9]️⃣|[0-9]+[.)\-:])\s*/, '').trim();
    const emoji = STEP_EMOJIS[idx] || `${idx + 1}️⃣`;
    lines.push(`${emoji} ${cleanStep}`);
  });

  if (summary.scenarioOutro && summary.scenarioOutro.trim()) {
    lines.push('');
    lines.push(summary.scenarioOutro.trim());
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push(summary.killerTitle.trim() || tpl.killerHeader);
  lines.push('');
  lines.push(summary.killerText.trim());
  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push(tpl.summaryHeader);
  lines.push('');
  lines.push(summary.summaryText.trim());
  lines.push('');
  lines.push(summary.punchline.trim());

  return lines.join('\n');
}
