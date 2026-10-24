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
    featureLeadIn: '🤖 O que seu agente passa a fazer por você:',
    scenarioHeader: '🧠 PENSE ASSIM (COMO VOCÊ PEDE AO AGENTE):',
    stepsLeadIn: 'E o agente executa na prática:',
    killerHeader: '🤯 O pulo do gato na automação?',
    summaryHeader: '📌 VALE A PENA PARA QUEM:',
    description: 'Focado em agentes autônomos, MCPs, assistentes e automações inteligentes.'
  },
  'self-hosted-saas': {
    id: 'self-hosted-saas',
    label: '2. Sistema Self-Hosted / SaaS Open Source',
    badgeEmoji: '🏢',
    defaultCategory: 'SaaS & CRM Self-Hosted',
    featureLeadIn: '🏢 O que ele entrega pronto pra sua operação:',
    scenarioHeader: '💰 PENSE NA ECONOMIA (E NA LIBERDADE):',
    stepsLeadIn: 'E o sistema orquestra sozinho:',
    killerHeader: '🔓 O que muda o jogo (Adeus Mensalidade em Dólar)?',
    summaryHeader: '📌 QUEM DEVERIA RODAR ISSO AMANHÃ:',
    description: 'Ideal para CRMs, ERPs, painéis de atendimento e substitutos open source de SaaS pagos.'
  },
  'infra-gateway': {
    id: 'infra-gateway',
    label: '3. Infraestrutura / Gateway / DevOps',
    badgeEmoji: '🔀',
    defaultCategory: 'Infra, Gateways & Edge',
    featureLeadIn: '🛡️ O que ele segura nos bastidores da sua stack:',
    scenarioHeader: '⚙️ CENÁRIO REAL DE PRODUÇÃO:',
    stepsLeadIn: 'E a infraestrutura responde no milissegundo:',
    killerHeader: '🛡️ A sacada genial de arquitetura?',
    summaryHeader: '📌 INDISPENSÁVEL PARA QUEM:',
    description: 'Para gateways de IA, proxies, Workers, Docker e redes.'
  },
  'app-tool': {
    id: 'app-tool',
    label: '4. App / Ferramenta Pronta (Desktop/Web)',
    badgeEmoji: '🖥️',
    defaultCategory: 'Apps & Produtividade',
    featureLeadIn: '⚡ O que ele resolve no seu dia a dia com zero atrito:',
    scenarioHeader: '🎯 VEJA A PRATICIDADE NO USO REAL:',
    stepsLeadIn: 'E o aplicativo resolve em poucos cliques:',
    killerHeader: '💡 Por que ele supera alternativas fechadas e pesadas?',
    summaryHeader: '📌 PERFEITO PARA QUEM:',
    description: 'Para aplicativos desktop, extensões de navegador, editores e utilitários prontos.'
  },
  'dev-lib-cli': {
    id: 'dev-lib-cli',
    label: '5. Biblioteca / SDK / CLI para Devs',
    badgeEmoji: '🛠️',
    defaultCategory: 'Libs, SDKs & CLI Dev',
    featureLeadIn: '🛠️ Superpoderes que ele injeta no seu código:',
    scenarioHeader: '💻 COMO FICA O CÓDIGO NO SEU PROJETO:',
    stepsLeadIn: 'E a biblioteca entrega de bandeja:',
    killerHeader: '🚀 Por que a comunidade dev está adotando em massa?',
    summaryHeader: '📌 COLOQUE NO SEU RADAR SE VOCÊ:',
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

  const scenarioTitle = (summary.scenarioTitle && summary.scenarioTitle.trim()) || tpl.scenarioHeader;
  lines.push(scenarioTitle);
  lines.push('');

  const scenarioIntro = (summary.scenarioIntro || '').trim();
  const cleanPrompt = (summary.scenarioPrompt || '').trim().replace(/^["“”]+|["“”]+$/g, '');

  if (scenarioIntro) {
    lines.push(scenarioIntro);
    lines.push('');
  }

  if (cleanPrompt && !scenarioIntro.includes(cleanPrompt)) {
    lines.push(`"${cleanPrompt}"`);
    lines.push('');
  }

  lines.push(tpl.stepsLeadIn);
  lines.push('');

  if (Array.isArray(summary.scenarioSteps) && summary.scenarioSteps.length > 0) {
    summary.scenarioSteps.forEach((step, idx) => {
      const cleanStep = step.replace(/^(?:[0-9]️⃣|[0-9]+[.)\-:])\s*/, '').trim();
      if (cleanStep) {
        const emoji = STEP_EMOJIS[idx] || `${idx + 1}️⃣`;
        lines.push(`${emoji} ${cleanStep}`);
      }
    });
  }

  if (summary.scenarioOutro && summary.scenarioOutro.trim()) {
    lines.push('');
    lines.push(summary.scenarioOutro.trim());
  }

  lines.push('');
  lines.push('━━━━━━━━━━━━━━━━━━');
  lines.push('');

  const killerTitle = (summary.killerTitle && summary.killerTitle.trim()) || tpl.killerHeader;
  lines.push(killerTitle);
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
