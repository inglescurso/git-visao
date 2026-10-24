import type {
  CategoryName,
  Env,
  GeneratedVisaoSummary,
  GitHubRepoMetadata,
  TemplateType
} from './types.ts';
import {
  CATEGORIES,
  TEMPLATE_VARIATIONS,
  buildWhatsAppText,
  detectCategory,
  detectTemplateType
} from './templates.ts';

function extractReadmeHighlights(readme: string, meta?: GitHubRepoMetadata): string[] {
  const highlights: string[] = [];
  if (readme) {
    const lines = readme.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('- ') && !line.startsWith('* ')) continue;
      const cleaned = line
        .replace(/^[-*]\s+/, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[`*_~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (
        cleaned.length >= 18 &&
        cleaned.length <= 130 &&
        !/^(license|contributing|installation|table of contents|contents|changelog|roadmap|prerequisites|requirements)/i.test(
          cleaned
        )
      ) {
        highlights.push(cleaned);
      }
      if (highlights.length >= 6) break;
    }
  }

  // Minerar fatos técnicos específicos do texto caso faltem bullets
  if (highlights.length < 4 && readme) {
    const hay = readme.toLowerCase();
    if (hay.includes('docker compose') || hay.includes('docker-compose')) {
      highlights.push('Deploy descomplicado com suporte nativo a Docker e Docker Compose');
    }
    if (hay.includes('mcp') || hay.includes('model context protocol')) {
      highlights.push('Compatível com Model Context Protocol (MCP) para conectar em agentes e IDEs');
    }
    if (hay.includes('prometheus') || hay.includes('grafana') || hay.includes('metrics')) {
      highlights.push('Métricas e observabilidade prontas para exportar para Prometheus/Grafana');
    }
    if (hay.includes('sqlite') || hay.includes('postgres') || hay.includes('postgresql')) {
      highlights.push('Persistência flexível com suporte a banco de dados próprio (SQLite/PostgreSQL)');
    }
    if (hay.includes('webhook') || hay.includes('webhooks')) {
      highlights.push('Gatilhos em tempo real via Webhooks para integração com outros sistemas');
    }
    if (hay.includes('cloudflare') || hay.includes('worker') || hay.includes('edge')) {
      highlights.push('Execução rápida e escalável na borda com arquitetura Serverless');
    }
  }

  return highlights;
}

function selectFallbackHook(templateType: TemplateType, meta: GitHubRepoMetadata): string {
  const hay = `${meta.name} ${meta.description} ${meta.topics.join(' ')} ${meta.readmeExcerpt}`.toLowerCase();
  const upName = meta.name.toUpperCase();

  switch (templateType) {
    case 'ai-agent-automation': {
      if (hay.includes('mcp') || hay.includes('cursor') || hay.includes('claude')) {
        return `🔥 O SERVIDOR MCP QUE FALTAVA NO SEU AMBIENTE DE IA: ${upName}`;
      }
      if (hay.includes('browser') || hay.includes('web') || hay.includes('navegador')) {
        return `🌐 E SE SEU AGENTE DE IA GANHASSE UM NAVEGADOR PRÓPRIO COM O ${upName}?`;
      }
      if (hay.includes('memory') || hay.includes('memoria') || hay.includes('context')) {
        return `🧠 O QUE ACONTECE QUANDO SEU AGENTE GANHA MEMÓRIA INFINITA COM ${upName}?`;
      }
      return `🤖 DÊ OLHOS, MÃOS E AUTONOMIA REAL PARA SEU AGENTE COM ${upName}!`;
    }

    case 'self-hosted-saas': {
      if (hay.includes('whatsapp') || hay.includes('zap') || hay.includes('wpp')) {
        return `💸 E SE SEU WHATSAPP VIRASSE UM CRM COMPLETO NA SUA VPS COM ${upName}?`;
      }
      if (
        hay.includes('multiatendimento') ||
        hay.includes('atendimento') ||
        hay.includes('chatwoot') ||
        hay.includes('ticket')
      ) {
        return `🔓 MULTIATENDIMENTO EM EQUIPE SEM PAGAR NENHUM ASSENTO COM ${upName}:`;
      }
      if (hay.includes('erp') || hay.includes('financeiro') || hay.includes('faturamento')) {
        return `🏢 GESTÃO COMPLETA SEM MENSALIDADE: CONHEÇA O ${upName}!`;
      }
      return `🏢 CHEGA DE PAGAR MENSALIDADE EM DÓLAR: RODE O ${upName} NA SUA PRÓPRIA INFRA!`;
    }

    case 'infra-gateway': {
      if (hay.includes('gateway') || hay.includes('proxy') || hay.includes('router') || hay.includes('roteador')) {
        return `⚡ O GATEWAY QUE SALVA A VIDA DA SUA INFRAESTRUTURA: ${upName}!`;
      }
      if (
        hay.includes('secret') ||
        hay.includes('auth') ||
        hay.includes('token') ||
        hay.includes('security') ||
        hay.includes('senha')
      ) {
        return `🔒 E SE NENHUMA SENHA OU CHAVE DE API NUNCA MAIS VAZASSE COM O ${upName}?`;
      }
      if (hay.includes('worker') || hay.includes('edge') || hay.includes('cloudflare')) {
        return `🌐 EXECUÇÃO NA BORDA EM MILISSEGUNDOS: BLINDE SUA ARQUITETURA COM ${upName}!`;
      }
      return `🛡️ PARE DE SER ACORDADO DE MADRUGADA: O ${upName} BLINDA SUA INFRAESTRUTURA!`;
    }

    case 'app-tool': {
      if (hay.includes('terminal') || hay.includes('cli') || hay.includes('tui')) {
        return `🎯 RESOLVA ISSO DIRETO NO TERMINAL EM SEGUNDOS COM O ${upName}:`;
      }
      if (hay.includes('note') || hay.includes('markdown') || hay.includes('git') || hay.includes('doc')) {
        return `📝 SEUS DADOS EM TEXTO PURO E SEM NUVEM OBRIGATÓRIA: TESTE O ${upName}!`;
      }
      if (hay.includes('electron') || hay.includes('lightweight') || hay.includes('fast') || hay.includes('rápido')) {
        return `⚡ ADEUS APLICATIVOS PESADOS E CHEIOS DE TELEMETRIA: ${upName}!`;
      }
      return `🖥️ O CLIENTE / APP QUE VAI DESTRAVAR SUA PRODUTIVIDADE: ${upName}!`;
    }

    case 'dev-lib-cli':
    default: {
      if (hay.includes('cli') || hay.includes('command') || hay.includes('terminal')) {
        return `💻 O UTILITÁRIO DE TERMINAL QUE TODO DEV DEVERIA CONHECER: ${upName}!`;
      }
      if (hay.includes('sdk') || hay.includes('api client') || hay.includes('library') || hay.includes('framework')) {
        return `🚀 A BIBLIOTECA QUE VAI TURBINAR SUA STACK EM POUCOS MINUTOS: ${upName}!`;
      }
      if (hay.includes('speed') || hay.includes('fast') || hay.includes('performance') || hay.includes('benchmark')) {
        return `⚡ EXECUÇÃO EM MILISSEGUNDOS: COMO O ${upName} DESTRUIU O GARGALO!`;
      }
      return `🛠️ CANSADO DE ESCREVER 50 LINHAS DE CÓDIGO BOILERPLATE? O ${upName} RESOLVE!`;
    }
  }
}

function selectFallbackIntro(templateType: TemplateType, meta: GitHubRepoMetadata, shortDesc: string): string {
  const lang = meta.language ? `desenvolvido em ${meta.language}` : 'open source';
  switch (templateType) {
    case 'ai-agent-automation':
      return `Se você constrói ou utiliza agentes autônomos no seu fluxo, vai pirar no ${meta.name}: ${shortDesc}`;
    case 'self-hosted-saas':
      return `Projetado para quem quer dar adeus às mensalidades em dólar e retomar o controle dos seus dados, o ${meta.name} é ${shortDesc}`;
    case 'infra-gateway':
      return `Construído especificamente para resolver gargalos de resiliência e tráfego crítico, o ${meta.name} (${lang}) entrega ${shortDesc}`;
    case 'app-tool':
      return `O ${meta.name} é uma daquelas ferramentas diretas ao ponto que você instala e não vive mais sem: ${shortDesc}`;
    case 'dev-lib-cli':
    default:
      return `Se você desenvolve em ${meta.language || 'código aberto'} e preza por ergonomia sem peso extra, o ${meta.name} resolve: ${shortDesc}`;
  }
}

export function generateFallbackSummary(
  meta: GitHubRepoMetadata,
  preferredTemplate?: TemplateType
): GeneratedVisaoSummary {
  const templateType: TemplateType =
    preferredTemplate && TEMPLATE_VARIATIONS[preferredTemplate]
      ? preferredTemplate
      : detectTemplateType(meta);

  const category: CategoryName = detectCategory(meta, templateType);
  const tpl = TEMPLATE_VARIATIONS[templateType];
  const shortDesc =
    meta.description ||
    `Projeto open source ${meta.fullName} desenvolvido em ${meta.language || 'código aberto'}.`;

  const extractedBullets = extractReadmeHighlights(meta.readmeExcerpt, meta);
  const topicList = meta.topics.length > 0 ? meta.topics.slice(0, 5).join(', ') : meta.language;

  const warningNote =
    /(wip|work in progress|alpha|beta|experimental|em desenvolvimento|não use em produção|not ready for production)/i.test(
      meta.readmeExcerpt
    )
      ? '⚠️ Projeto em fase experimental/beta. Teste em ambiente seguro antes de adotar em produção.'
      : /(proof of concept|poc|prototype)/i.test(meta.readmeExcerpt)
        ? '⚠️ Prova de conceito (PoC). Verifique o estágio das funcionalidades antes de rodar em missão crítica.'
        : '';

  const defaultFeaturesByTemplate: Record<TemplateType, string[]> = {
    'ai-agent-automation': [
      `🤖 Autonomia com supervisão: executa tarefas complexas usando ${meta.name}`,
      `🔌 Integração flexível com servidores MCP, APIs e ecossistema de IA (${topicList})`,
      `⚡ Reduz passos manuais repetitivos com automação orientada a contexto`,
      `🔒 Código aberto em ${meta.language} para auditar e rodar no seu próprio ambiente`,
      `📊 Rastreabilidade total com logs detalhados de cada etapa executada`
    ],
    'self-hosted-saas': [
      `🏢 Hospedagem própria (Self-Hosted) com controle total dos dados e banco de dados`,
      `👥 Multiatendimento em equipe sem cobrança abusiva por assento ou atendente`,
      `⚙️ Recursos práticos prontos em ${meta.language} (${topicList})`,
      `🔌 Conexão direta com canais de mensagem, webhooks e automações de IA`,
      `🔓 Zero aprisionamento: seus leads, conversas e regras são 100% seus`
    ],
    'infra-gateway': [
      `🔄 Arquitetura resiliente focada em performance, roteamento inteligente e failover`,
      `🔑 Controle centralizado de conexões, políticas de segurança e credenciais`,
      `⚡ Baixa latência e execução enxuta construída em ${meta.language}`,
      `🔎 Observabilidade em tempo real com suporte a métricas e diagnósticos`,
      `🛡️ Mais segurança e previsibilidade para manter seus serviços no ar sem sustos`
    ],
    'app-tool': [
      `⚡ Interface e experiência diretas para resolver a tarefa sem fricção`,
      `📦 Projeto open source escrito em ${meta.language} (${topicList})`,
      `🔒 Execução local mantendo seus arquivos e dados sob seu estrito controle`,
      `🔌 Fácil de encaixar na rotina diária de produtividade e foco`,
      `🚀 Validado pela comunidade com ${meta.stars} estrelas no GitHub`
    ],
    'dev-lib-cli': [
      `💻 API limpa e ergonômica pensada para desenvolvedores ${meta.language}`,
      `⚡ Leve, rápida e fácil de adicionar ao projeto com zero dependências inúteis`,
      `🧩 Compatível com fluxos modernos de desenvolvimento (${topicList})`,
      `📖 Código-fonte auditável com exemplos práticos no README`,
      `🛠️ Economiza horas de código boilerplate repetitivo em cada projeto`
    ]
  };

  const featureEmojis = ['📥', '🔌', '⚙️', '⚡', '🔒', '📊', '🛡️'];
  const features =
    extractedBullets.length >= 3
      ? extractedBullets.slice(0, 6).map((item, idx) => {
          const emoji = featureEmojis[idx % featureEmojis.length];
          return /^[\p{Emoji}]/u.test(item) ? item : `${emoji} ${item}`;
        })
      : defaultFeaturesByTemplate[templateType];

  const scenarioIntroByTemplate: Record<TemplateType, string> = {
    'ai-agent-automation':
      'Você não precisa mais executar etapas repetitivas na mão ou colar contexto entre janelas.\n\nNa prática, você instrui seu agente assim:',
    'self-hosted-saas':
      'Chega de pagar dezenas de dólares por cada novo atendente ou ficar refém de planos caros.\n\nVocê configura a regra direto no sistema:',
    'infra-gateway':
      'Esqueça o medo de derrubar a produção ou perder requisições em horários de pico.\n\nBasta apontar suas chamadas para o gateway:',
    'app-tool':
      'Nada de abrir navegadores pesados ou ferramentas cheias de telas confusas.\n\nNo seu dia a dia você simplesmente dispara:',
    'dev-lib-cli':
      'Pare de reinventar a roda ou copiar utilitários frágeis entre projetos.\n\nNo seu código você resolve com uma instrução direta:'
  };

  const scenarioPromptByTemplate: Record<TemplateType, string> = {
    'ai-agent-automation':
      'Inspecione os últimos commits do repositório, identifique funções sem cobertura de testes e gere os casos de teste compatíveis com a suite atual.',
    'self-hosted-saas':
      'Quando o cliente falar "preço" ou "orçamento" no WhatsApp, tagueie como Lead Quente, cadastre no CRM e transfira para o atendente de plantão.',
    'infra-gateway':
      'Adicione monitor para api.meusite.com a cada 20s; se a latência passar de 500ms ou der erro 5xx, ative o failover para o backup e avise no Telegram.',
    'app-tool':
      'Importe os arquivos da pasta local, organize por tags hierárquicas e gere a visualização sem enviar nenhum byte para a nuvem.',
    'dev-lib-cli':
      `npm install ${meta.name.toLowerCase()} && declare o pipeline com tipagem estrita para processar os dados em 3 linhas.`
  };

  const scenarioStepsByTemplate: Record<TemplateType, string[]> = {
    'ai-agent-automation': [
      `Interpretar a instrução e inspecionar o contexto do repositório/ambiente`,
      `Conectar às ferramentas e servidores MCP configurados`,
      `Executar as ações automatizadas etapa por etapa com validação de segurança`,
      `Entregar o relatório final com log detalhado e alterações prontas para revisão`
    ],
    'self-hosted-saas': [
      `Receber a mensagem em tempo real pelo conector oficial (WhatsApp, Telegram ou Webhook)`,
      `Registrar o contato e histórico no seu próprio banco de dados sem intermediários`,
      `Disparar a automação de tags, pipeline e regras de negócio configuradas`,
      `Distribuir o atendimento para a equipe conectada em um painel único sem custo por assento`
    ],
    'infra-gateway': [
      `Receber a requisição na borda antes de sobrecarregar sua aplicação principal`,
      `Aplicar regras de rate limiting, validação de chaves e sanitização de tráfego`,
      `Garantir entrega com baixa latência e failover automático caso a ponta falhe`,
      `Emitir métricas em tempo real para seu painel de observabilidade ou Prometheus`
    ],
    'app-tool': [
      `Iniciar instantaneamente na máquina local sem serviços ocultos consumindo memória`,
      `Ler os arquivos mantendo 100% da privacidade e sem telemetria invasiva`,
      `Executar a tarefa com interface direta, atalhos de teclado e pré-visualização`,
      `Exportar o resultado no formato desejado direto no seu disco ou repositório Git`
    ],
    'dev-lib-cli': [
      `Adicionar o pacote ao projeto em poucos segundos com o gerenciador da sua stack`,
      `Declarar a chamada com tipagem estrita e autocomplete perfeito no editor`,
      `Executar a lógica com alta performance e footprint mínimo de recursos`,
      `Substituir dezenas de linhas de boilerplate por uma solução limpa e manutenível`
    ]
  };

  const killerTextByTemplate: Record<TemplateType, string> = {
    'ai-agent-automation': `O ${meta.name} é 100% open source (${meta.fullName}) e resolve o maior dilema de quem cria agentes: dar autonomia real e controlada sem transformar o fluxo em uma caixa-preta. Você audita o código, mantém suas chaves de API sob sua guarda e integra diretamente aos modelos e ferramentas que preferir.`,
    'self-hosted-saas': `O grande diferencial do ${meta.name} é a soberania total sobre seus dados. Diferente de plataformas proprietárias que cobram centenas de dólares por assento e bloqueiam dados em caso de cancelamento, aqui o banco de dados é seu, a infraestrutura é sua e sua equipe opera com liberdade absoluta.`,
    'infra-gateway': `O pulo do gato do ${meta.name} está na arquitetura resiliente desenvolvida em ${meta.language}. Ele funciona como um escudo inteligente na frente dos seus serviços: se uma API externa oscilar ou cair de madrugada, ele comuta o tráfego e absorve picos sem derrubar sua operação.`,
    'app-tool': `Enquanto a maioria dos utilitários modernos virou aplicativo inchado com navegadores embutidos e telemetria invasiva, o ${meta.name} entrega exatamente o que promete: velocidade instantânea, respeito à privacidade local e praticidade sem atritos.`,
    'dev-lib-cli': `Construído em ${meta.language} e validado pela comunidade com ${meta.stars} estrelas no GitHub, o ${meta.name} elimina o código repetitivo que todo dev odeia escrever. Ele entrega uma API moderna, tipada e extremamente leve para você focar nas regras de negócio.`
  };

  const summaryTextByTemplate: Record<TemplateType, string> = {
    'ai-agent-automation': `Vale muito a pena explorar o ${meta.fullName} se você quer levar seus agentes além do básico e dar ferramentas reais para automação em ${meta.language}.`,
    'self-hosted-saas': `Excelente alternativa open source para quem busca independência de plataformas fechadas e quer operar um sistema robusto na própria infraestrutura.`,
    'infra-gateway': `Indispensável para quem precisa de estabilidade, observabilidade e controle de tráfego profissional sem depender de soluções de terceiros caras.`,
    'app-tool': `Recomendado para quem valoriza ferramentas rápidas, locais e sem enrolação para otimizar o dia a dia de trabalho.`,
    'dev-lib-cli': `Adição certeira para sua stack se você busca código mais limpo, menos boilerplate e máxima performance em ${meta.language}.`
  };

  const punchlineByTemplate: Record<TemplateType, string> = {
    'ai-agent-automation': `🚀 Autonomia, controle e inteligência real com ${meta.name}.`,
    'self-hosted-saas': `🚀 Seus dados, sua operação e adeus mensalidades com ${meta.name}.`,
    'infra-gateway': `🚀 Resiliência de alto nível e paz de espírito na infra com ${meta.name}.`,
    'app-tool': `🚀 Produtividade máxima e respeito aos seus dados com ${meta.name}.`,
    'dev-lib-cli': `🚀 Menos código boilerplate e muito mais velocidade com ${meta.name}.`
  };

  const partialSummary: Omit<GeneratedVisaoSummary, 'whatsappText'> = {
    category,
    templateType,
    hookTitle: selectFallbackHook(templateType, meta),
    introText: selectFallbackIntro(templateType, meta, shortDesc),
    warningNote,
    features,
    scenarioTitle: tpl.scenarioHeader,
    scenarioIntro: scenarioIntroByTemplate[templateType],
    scenarioPrompt: scenarioPromptByTemplate[templateType],
    scenarioSteps: scenarioStepsByTemplate[templateType],
    scenarioOutro: '',
    killerTitle: tpl.killerHeader,
    killerText: killerTextByTemplate[templateType],
    summaryText: summaryTextByTemplate[templateType],
    punchline: punchlineByTemplate[templateType]
  };

  return {
    ...partialSummary,
    whatsappText: buildWhatsAppText(meta, partialSummary)
  };
}

function resolveOmniRouteEndpoint(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions')) {
    return trimmed;
  }
  if (trimmed.endsWith('/v1') || trimmed.endsWith('/openai')) {
    return `${trimmed}/chat/completions`;
  }
  return `${trimmed}/v1/chat/completions`;
}

function extractJsonObject(rawText: string): Record<string, unknown> | null {
  if (!rawText) return null;
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function generateRepoVisaoSummary(
  meta: GitHubRepoMetadata,
  env: Env,
  preferredTemplate?: TemplateType
): Promise<GeneratedVisaoSummary> {
  const baseUrl = env.OMNIROUTE_BASE_URL?.trim();
  const apiKey = env.OMNIROUTE_API_KEY?.trim();
  const model = env.OMNIROUTE_MODEL?.trim() || 'gemini-2.5-flash';

  if (!baseUrl || !apiKey) {
    return generateFallbackSummary(meta, preferredTemplate);
  }

  const endpoint = resolveOmniRouteEndpoint(baseUrl);
  const autoDetectedTemplate =
    preferredTemplate && TEMPLATE_VARIATIONS[preferredTemplate]
      ? preferredTemplate
      : detectTemplateType(meta);

  const systemPrompt = `Você é o curador especialista do canal e grupo "Pega a Visão", famoso por transformar repositórios do GitHub em resumos virais, diretos, didáticos, divertidos e de altíssima utilidade prática em Português do Brasil para WhatsApp.

Sua missão: analisar minuciosamente os metadados e o README do repositório GitHub fornecido e devolver ESTRITAMENTE um objeto JSON válido (sem blocos markdown \`\`\`json em volta) com a estrutura solicitada.

Existem 5 variações de template ("templateType"):
1. "ai-agent-automation" -> Para agentes de IA, MCPs, automações inteligentes, navegadores para agentes, frameworks multiagente. Categoria padrão: "Agentes & Automação IA"
2. "self-hosted-saas" -> Para CRMs, ERPs, sistemas multiatendimento WhatsApp, plataformas open source que substituem SaaS pagos. Categoria padrão: "SaaS & CRM Self-Hosted"
3. "infra-gateway" -> Para gateways de IA, proxies, Cloudflare Workers, roteadores de tráfego, Docker, DevOps, segurança de chaves. Categoria padrão: "Infra, Gateways & Edge"
4. "app-tool" -> Para aplicativos desktop/web, clientes visuais, ferramentas locais de produtividade, utilitários prontos. Categoria padrão: "Apps & Produtividade"
5. "dev-lib-cli" -> Para bibliotecas, frameworks, SDKs, pacotes de código e CLIs para desenvolvedores. Categoria padrão: "Libs, SDKs & CLI Dev"

Categorias válidas ("category"):
- "Agentes & Automação IA"
- "SaaS & CRM Self-Hosted"
- "Infra, Gateways & Edge"
- "Apps & Produtividade"
- "Libs, SDKs & CLI Dev"
- "Outros"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 DIRETRIZES DE OURO (SEM MONOTONIA E COM FOCO EM UTILIDADE REAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. PROIBIÇÃO DE REPETIÇÃO MONÓTONA:
- PROIBIDO começar todos os ganchos sempre com "E SE VOCÊ...". Cada categoria possui sua própria personalidade, dor principal e tom de chamada!
- PROIBIDO começar "introText" sempre com "Conheça o <Nome>...". Varie o início para prender a atenção do leitor imediatamente.

2. GANCHOS ("hookTitle") IMPACTANTES E ESPECÍFICOS POR CATEGORIA:
Deve ser SEMPRE em MAIÚSCULAS, iniciando com 1 emoji temático impactante. Escolha o gancho adequado ao nicho do projeto:

* Agentes & Automação IA:
  Ganchos provocativos sobre autonomia, memória persistente, servidores MCP, visão computacional ou mãos para o agente:
  - "🤖 E SE SEU AGENTE DE IA GANHASSE UM NAVEGADOR SÓ PARA ELE?"
  - "🧠 O QUE ACONTECE QUANDO SEU AGENTE GANHA MEMÓRIA INFINITA?"
  - "🔥 O SERVIDOR MCP QUE FALTAVA NO SEU CURSOR / CLAUDE:"
  - "⚡ DÊ OLHOS E MÃOS PARA SEU AGENTE DE IA COM O <NOME>:"
  - "🎯 PARE DE COPIAR E COLAR: SEU AGENTE AGORA RESOLVE ISSO SOZINHO!"

* SaaS & CRM Self-Hosted:
  Ganchos sobre independência de plataformas fechadas, adeus custo por atendente/lead em dólar, controle total do WhatsApp e banco próprio:
  - "🏢 CHEGA DE PAGAR MENSALIDADE EM DÓLAR POR ATENDENTE!"
  - "💸 E SE SEU WHATSAPP VIRASSE UM CRM COMPLETO NA SUA VPS?"
  - "🔓 MULTIATENDIMENTO EM EQUIPE SEM PAGAR NENHUM ASSENTO:"
  - "🛡️ SEUS DADOS, SEU BANCO: O SISTEMA QUE NENHUM SAAS PODE TE CANCELAR!"
  - "🚀 MONTE SEU PRÓPRIO SISTEMA DE ATENDIMENTO COM ZERO MENSALIDADE:"

* Infra, Gateways & Edge:
  Ganchos sobre resiliência, não ser acordado de madrugada por serviço fora do ar, segredos vazados, proxies inteligentes, failover, Workers na borda:
  - "🛡️ PARE DE SER ACORDADO DE MADRUGADA POR SERVIÇO FORA DO AR!"
  - "⚡ O GATEWAY QUE SALVA A VIDA DA SUA INFRAESTRUTURA:"
  - "🔒 E SE NENHUMA SENHA OU CHAVE DE API NUNCA MAIS VAZASSE?"
  - "🚦 ROTEAMENTO INTELIGENTE DE TRÁFEGO COM ZERO DOWNTIME:"
  - "🌐 SUBA NA BORDA EM SEGUNDOS: O ESCUDO QUE FALTA NA SUA ARQUITETURA:"

* Apps & Produtividade:
  Ganchos sobre velocidade instantânea, dados guardados em texto/Git puro, adeus aplicativos pesados em Electron cheios de telemetria:
  - "🖥️ O CLIENTE / APLICATIVO QUE VAI DESTRAVAR SUA PRODUTIVIDADE:"
  - "⚡ ADEUS APLICATIVOS PESADOS E CHEIOS DE TELEMETRIA:"
  - "🎯 RESOLVA ISSO DIRETO NO SEU COMPUTADOR EM SEGUNDOS:"
  - "📝 SUAS NOTAS E TAREFAS 100% SUAS, RÁPIDAS E SEM NUVEM OBRIGATÓRIA!"
  - "🚀 A FERRAMENTA DESKTOP QUE SUBSTITUI TRÊS APPS LENTOS:"

* Libs, SDKs & CLI Dev:
  Ganchos sobre menos código boilerplate, tipagem de ponta, performance pura, economia de horas de trabalho dev:
  - "🛠️ CANSADO DE ESCREVER 50 LINHAS DE CÓDIGO BOILERPLATE?"
  - "🚀 A BIBLIOTECA QUE VAI TURBINAR SUA STACK EM POUCOS MINUTOS:"
  - "💻 O PACOTE QUE TODO DEV DEVERIA CONHECER:"
  - "⚡ EXECUÇÃO EM MILISSEGUNDOS: COMO ESSA LIB DESTRUIU O GARGALO:"
  - "🧩 TIPAGEM PERFEITA E ZERO DEPENDÊNCIAS PESADAS NO SEU PROJETO:"

3. MINERAÇÃO DO README POR DETALHES REAIS E CURIOSOS:
NÃO gere resumos genéricos. O leitor do "Pega a Visão" ama FATOS TÉCNICOS E CURIOSIDADES REAIS extraídos do README:
- Como roda na prática? (ex: 'Roda num binário único em Go/Rust de 15MB', 'Deploy com 1 comando via docker compose up -d', 'Roda direto como Cloudflare Worker na borda sem servidor').
- Quais protocolos, integrações ou tecnologias reais ele suporta? (ex: Docker, Prometheus, MCP, Webhooks, SQLite, PostgreSQL, Ollama, OpenAI, Redis).
- Limitações reais e 'letras miúdas' (ex: 'Não suporta NFS, requer disco local', 'Em fase alfa/experimental', 'Ainda sem interface mobile nativa'). Quando houver aviso crítico ou limitação, registre em "warningNote" começando com "⚠️ ". Se não houver, retorne "".
- Benchmarks ou números impressionantes (ex: 'Processa 50k req/s com 20MB de RAM', '5x mais rápido que a alternativa tradicional').
- Explicações didáticas com analogias divertidas em Português do Brasil! (ex: 'Pense nele como um porteiro inteligente que valida os crachás antes de deixar a requisição entrar no prédio').

4. VARIEDADE NA INTRODUÇÃO ("introText"):
Varie o estilo de abertura do primeiro parágrafo:
- "Se você usa X no dia a dia, vai pirar no <Nome>: ..."
- "Construído especificamente para resolver <problema>, o <Nome> é ..."
- "O <Nome> é uma daquelas ferramentas que você instala e não vive mais sem: ..."
- "Desenvolvido em <linguagem> com foco em <benefício>, o <Nome> entrega ..."
- "Para quem quer se livrar de <solução proprietária/fechada>, o <Nome> surge como ..."
- "O <Nome> transforma a forma como você lida com <tarefa>: ..."

5. CENÁRIO PRÁTICO REALISTA ("scenarioPrompt"):
O "scenarioPrompt" NUNCA deve ser algo genérico como 'Executar tarefa'. Deve soar como uma instrução, prompt, comando de terminal ou regra de negócio REAL do dia a dia de quem usa a ferramenta!
Exemplos realistas:
- Agentes: "Pesquise os últimos 5 bugs reportados no repositório, identifique as causas raízes e envie um PR corrigindo os testes automaticamente."
- CRM / Atendimento: "Quando o cliente falar 'preço' ou 'orçamento' no WhatsApp, tagueie como Lead Quente, registre no CRM e transfira para o atendente de plantão."
- Gateway / Infra: "Adicione monitor para api.meusite.com a cada 20s; se a latência passar de 500ms ou der erro 5xx, ative o failover para o backup e avise no Telegram."
- App / Ferramenta: "Importe os 300 arquivos de notas em Markdown, organize por tags hierárquicas e gere a visualização em grafo sem enviar nenhum byte para a nuvem."
- Lib / CLI: "npx repo-cli optimize --input ./assets --quality 80 --output ./dist --watch"

6. REGRAS PARA CADA CHAVE DO JSON:
- "category": Uma das 5 categorias válidas (ou "Outros").
- "templateType": Um dos 5 IDs de template válidos.
- "hookTitle": O gancho temático todo em MAIÚSCULAS com 1 emoji inicial.
- "introText": Parágrafo introdutório vibrante e variado.
- "warningNote": String opcional com aviso/limitação real ("⚠️ ...") ou "" se não houver.
- "features": Array com 5 a 7 strings curtas destacando recursos reais. Cada item DEVE começar com 1 emoji expressivo (ex: "📥 ...", "🔌 ...", "⚡ ...", "🔒 ...", "📊 ...").
- "scenarioTitle": Cabeçalho do cenário prático (ex: "🧠 PENSE ASSIM:", "⚡ NA PRÁTICA, VOCÊ FAZ ASSIM:", "💻 IMAGINE NO SEU PROJETO:").
- "scenarioIntro": 1 ou 2 frases curtas introduzindo a dor resolvida e preparando a instrução prática.
- "scenarioPrompt": A instrução prática ou comando real entre aspas.
- "scenarioSteps": Array com 4 a 6 passos curtos no infinitivo mostrando o que o sistema faz nos bastidores (NÃO inclua emojis numéricos 1️⃣..6️⃣ no início de cada item, apenas o texto).
- "scenarioOutro": Frase curta opcional de fechamento do cenário (ou "").
- "killerTitle": Título provocativo destacando o diferencial matador (ex: "🤯 A parte mais interessante?", "🔓 O que muda o jogo (Zero Mensalidade)?", "🛡️ O pulo do gato na arquitetura?", "🚀 Por que os devs estão adotando?").
- "killerText": 1 ou 2 parágrafos curtos explicando o verdadeiro pulo do gato (soberania de dados, arquitetura, velocidade, economia, privacidade).
- "summaryText": 1 parágrafo curto recomendando para quem vale a pena e como dar o primeiro passo.
- "punchline": Frase final de efeito curta, entusiasmada, começando com "🚀 ".`;

  const userPrompt = `Analise este repositório do GitHub e gere o JSON:

Repositório: ${meta.fullName}
URL: ${meta.repoUrl}
Descrição: ${meta.description || 'Sem descrição curta'}
Estrelas: ${meta.stars}
Forks: ${meta.forks}
Linguagem principal: ${meta.language}
Tópicos: ${meta.topics.join(', ') || 'nenhum'}
Último commit: ${meta.lastCommitAt}
Template sugerido/preferido: ${preferredTemplate ? `${preferredTemplate} (OBRIGATÓRIO USAR ESTE)` : `${autoDetectedTemplate} (sugerido, mas você pode ajustar se outro dos 5 fizer muito mais sentido)`}

Trecho do README:
${meta.readmeExcerpt || 'README não disponível.'}

INSTRUÇÕES EXTRAS DE EXTRAÇÃO:
- Minere o trecho do README por detalhes técnicos reais: Docker, protocolos suportados (MCP, Prometheus, Webhooks, etc.), limitações práticas (warningNote), benchmarks ou números reais.
- Evite frases repetitivas. Não use "E SE VOCÊ..." em tudo. Use o tom exato da categoria selecionada.
- Garanta que o "scenarioPrompt" seja um comando ou instrução prática real do cotidiano.

Retorne APENAS o JSON válido com as chaves:
{
  "category": "...",
  "templateType": "...",
  "hookTitle": "...",
  "introText": "...",
  "warningNote": "",
  "features": ["..."],
  "scenarioTitle": "...",
  "scenarioIntro": "...",
  "scenarioPrompt": "...",
  "scenarioSteps": ["..."],
  "scenarioOutro": "",
  "killerTitle": "...",
  "killerText": "...",
  "summaryText": "...",
  "punchline": "..."
}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      return generateFallbackSummary(meta, preferredTemplate);
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const content = data?.choices?.[0]?.message?.content || '';
    const parsed = extractJsonObject(content);
    if (!parsed) {
      return generateFallbackSummary(meta, preferredTemplate);
    }

    const fallback = generateFallbackSummary(meta, preferredTemplate);

    const rawTemplate = String(parsed.templateType || '');
    const templateType: TemplateType =
      preferredTemplate && TEMPLATE_VARIATIONS[preferredTemplate]
        ? preferredTemplate
        : (rawTemplate in TEMPLATE_VARIATIONS ? (rawTemplate as TemplateType) : fallback.templateType);

    const rawCategory = String(parsed.category || '');
    const category: CategoryName = CATEGORIES.includes(rawCategory as CategoryName)
      ? (rawCategory as CategoryName)
      : detectCategory(meta, templateType);

    const features =
      Array.isArray(parsed.features) && parsed.features.length > 0
        ? parsed.features.map((f) => String(f).trim()).filter(Boolean)
        : fallback.features;

    const scenarioSteps =
      Array.isArray(parsed.scenarioSteps) && parsed.scenarioSteps.length > 0
        ? parsed.scenarioSteps.map((s) => String(s).trim()).filter(Boolean)
        : fallback.scenarioSteps;

    const partialSummary: Omit<GeneratedVisaoSummary, 'whatsappText'> = {
      category,
      templateType,
      hookTitle: String(parsed.hookTitle || fallback.hookTitle).trim(),
      introText: String(parsed.introText || fallback.introText).trim(),
      warningNote: parsed.warningNote ? String(parsed.warningNote).trim() : fallback.warningNote || '',
      features,
      scenarioTitle: String(parsed.scenarioTitle || fallback.scenarioTitle).trim(),
      scenarioIntro: String(parsed.scenarioIntro || fallback.scenarioIntro).trim(),
      scenarioPrompt: String(parsed.scenarioPrompt || fallback.scenarioPrompt).trim(),
      scenarioSteps,
      scenarioOutro: parsed.scenarioOutro ? String(parsed.scenarioOutro).trim() : '',
      killerTitle: String(parsed.killerTitle || fallback.killerTitle).trim(),
      killerText: String(parsed.killerText || fallback.killerText).trim(),
      summaryText: String(parsed.summaryText || fallback.summaryText).trim(),
      punchline: String(parsed.punchline || fallback.punchline).trim()
    };

    return {
      ...partialSummary,
      whatsappText: buildWhatsAppText(meta, partialSummary)
    };
  } catch {
    return generateFallbackSummary(meta, preferredTemplate);
  }
}
