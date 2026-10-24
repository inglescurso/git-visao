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

function extractReadmeHighlights(readme: string): string[] {
  if (!readme) return [];
  const lines = readme.split('\n');
  const bullets: string[] = [];

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
      cleaned.length <= 120 &&
      !/^(license|contributing|installation|table of contents|contents|changelog|roadmap)/i.test(cleaned)
    ) {
      bullets.push(cleaned);
    }
    if (bullets.length >= 6) break;
  }

  return bullets;
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

  const extractedBullets = extractReadmeHighlights(meta.readmeExcerpt);
  const topicList = meta.topics.length > 0 ? meta.topics.slice(0, 5).join(', ') : meta.language;

  const hookByTemplate: Record<TemplateType, string> = {
    'ai-agent-automation': `🤖 E SE ${meta.name.toUpperCase()} AUTOMATIZASSE O TRABALHO DOS SEUS AGENTES DE IA?`,
    'self-hosted-saas': `🏢 E SE VOCÊ RODASSE O ${meta.name.toUpperCase()} NA SUA PRÓPRIA CONTA SEM MENSALIDADE?`,
    'infra-gateway': `🔀 E SE SUA INFRAESTRUTURA CONTASSE COM O ${meta.name.toUpperCase()} NOS BASTIDORES?`,
    'app-tool': `🖥️ E SE VOCÊ TIVESSE O ${meta.name.toUpperCase()} PRONTO PARA USAR NO SEU FLUXO DIÁRIO?`,
    'dev-lib-cli': `🛠️ E SE O ${meta.name.toUpperCase()} ACELERASSE O DESENVOLVIMENTO DO SEU PRÓXIMO PROJETO?`
  };

  const defaultFeaturesByTemplate: Record<TemplateType, string[]> = {
    'ai-agent-automation': [
      `🤖 Executa fluxos e tarefas inteligentes usando ${meta.name}`,
      `🔌 Integração flexível com agentes, APIs e ferramentas do ecossistema (${topicList})`,
      `⚡ Reduz passos manuais repetitivos com automação orientada a contexto`,
      `🔒 Código aberto em ${meta.language} para auditar e adaptar ao seu ambiente`,
      `📊 Acompanhamento claro da execução das tarefas de ponta a ponta`
    ],
    'self-hosted-saas': [
      `🏢 Hospedagem própria (Self-Hosted) com controle total dos dados e banco`,
      `👥 Pensado para operação em equipe e personalização com a sua marca`,
      `⚙️ Recursos práticos prontos em ${meta.language} (${topicList})`,
      `🔌 Possibilidade de integrar com webhooks, APIs externas e assistentes de IA`,
      `🔓 Zero aprisionamento em mensalidades caras de plataformas fechadas`
    ],
    'infra-gateway': [
      `🔄 Arquitetura resiliente focada em performance, roteamento e disponibilidade`,
      `🔑 Controle centralizado de conexões, políticas e credenciais`,
      `⚡ Baixa latência e execução enxuta construída em ${meta.language}`,
      `🔎 Observabilidade e diagnóstico simplificados para ambientes de produção`,
      `🛡️ Mais segurança e previsibilidade para suas aplicações`
    ],
    'app-tool': [
      `⚡ Interface e experiência diretas para resolver o problema sem fricção`,
      `📦 Projeto open source escrito em ${meta.language} (${topicList})`,
      `🔒 Execução transparente mantendo seus arquivos e dados sob seu controle`,
      `🔌 Fácil de encaixar na rotina diária de trabalho e produtividade`,
      `🚀 Comunidade ativa no GitHub com ${meta.stars} estrelas`
    ],
    'dev-lib-cli': [
      `💻 API limpa e ergonômica pensada para desenvolvedores ${meta.language}`,
      `⚡ Leve, rápida e fácil de adicionar ao projeto em poucos comandos`,
      `🧩 Compatível com fluxos modernos de desenvolvimento (${topicList})`,
      `📖 Código-fonte aberto no GitHub com exemplos práticos no README`,
      `🛠️ Economiza horas de código boilerplate repetitivo`
    ]
  };

  const featureEmojis = ['📥', '🔌', '⚙️', '⚡', '🔒', '📊'];
  const features =
    extractedBullets.length >= 3
      ? extractedBullets.slice(0, 6).map((item, idx) => {
          const emoji = featureEmojis[idx % featureEmojis.length];
          return /^[\p{Emoji}]/u.test(item) ? item : `${emoji} ${item}`;
        })
      : defaultFeaturesByTemplate[templateType];

  const scenarioIntroByTemplate: Record<TemplateType, string> = {
    'ai-agent-automation':
      'Você não precisa mais executar cada etapa na mão.\n\nVocê pode acionar o fluxo assim:',
    'self-hosted-saas':
      'Você não precisa mais depender de uma ferramenta fechada cobrando por usuário.\n\nVocê pode configurar uma operação assim:',
    'infra-gateway':
      'Você não precisa mais sofrer com gargalos ou falhas inesperadas na comunicação.\n\nSua aplicação faz a chamada normal:',
    'app-tool':
      'Você não precisa mais improvisar com várias ferramentas separadas.\n\nNo dia a dia você só precisa:',
    'dev-lib-cli':
      'Você não precisa mais reescrever essa base do zero em todo repositório.\n\nNo seu projeto você declara:'
  };

  const scenarioPromptByTemplate: Record<TemplateType, string> = {
    'ai-agent-automation': `Executar tarefa automatizada com ${meta.name} usando minhas configurações.`,
    'self-hosted-saas': `Subir minha própria instância do ${meta.name} e centralizar o atendimento da equipe.`,
    'infra-gateway': `Processar e rotear requisições críticas passando pelo ${meta.name}.`,
    'app-tool': `Abrir o ${meta.name} e executar o fluxo principal em poucos cliques.`,
    'dev-lib-cli': `Importar ${meta.name} no projeto e usar os recursos prontos em produção.`
  };

  const scenarioStepsByTemplate: Record<TemplateType, string[]> = {
    'ai-agent-automation': [
      `Receber a instrução e carregar o contexto necessário`,
      `Conectar às ferramentas e credenciais configuradas`,
      `Executar as ações automaticamente etapa por etapa`,
      `Entregar o resultado pronto para revisão`
    ],
    'self-hosted-saas': [
      `Fazer o deploy do ${meta.name} no seu servidor ou nuvem preferida`,
      `Personalizar regras, acessos e integrações do seu negócio`,
      `Conectar seus canais e banco de dados próprio`,
      `Operar com toda a equipe sem custo por assento`
    ],
    'infra-gateway': [
      `Receber a requisição da sua aplicação em tempo real`,
      `Aplicar as regras de roteamento, segurança ou cache`,
      `Garantir a entrega mesmo sob alta demanda ou falha parcial`,
      `Retornar a resposta limpa para o cliente final`
    ],
    'app-tool': [
      `Instalar ou abrir o ${meta.name} a partir do repositório oficial`,
      `Carregar seus arquivos ou configurações locais`,
      `Executar a tarefa com visualização imediata`,
      `Exportar ou salvar o resultado sem complicação`
    ],
    'dev-lib-cli': [
      `Instalar o pacote ou utilitário do ${meta.name} no ambiente`,
      `Configurar as opções principais em poucas linhas`,
      `Integrar com o restante da sua stack ${meta.language}`,
      `Rodar em desenvolvimento e produção com alta performance`
    ]
  };

  const killerTextByTemplate: Record<TemplateType, string> = {
    'ai-agent-automation': `O ${meta.name} é 100% open source (${meta.fullName}) e permite que você audite como seus agentes operam, mantendo controle sobre suas chaves de API, dados e privacidade.`,
    'self-hosted-saas': `Com o ${meta.name}, você é dono do código, do banco de dados e das regras de negócio. Nada fica preso em um SaaS fechado e você adapta tudo para a realidade da sua operação.`,
    'infra-gateway': `Por ser código aberto em ${meta.language}, o ${meta.name} dá transparência total sobre o que acontece no meio do caminho das suas requisições, sem caixa-preta na infraestrutura.`,
    'app-tool': `Diferente de alternativas proprietárias pesadas, o ${meta.name} entrega exatamente o que você precisa com código aberto (${meta.fullName}) e foco total em praticidade.`,
    'dev-lib-cli': `Construído em ${meta.language} e validado pela comunidade (${meta.stars} estrelas no GitHub), o ${meta.name} resolve um problema complexo com uma interface enxuta e direta.`
  };

  const punchlineByTemplate: Record<TemplateType, string> = {
    'ai-agent-automation': `🚀 Automação inteligente com ${meta.name} trabalhando por você.`,
    'self-hosted-saas': `🚀 Seu sistema com ${meta.name}, seus dados, suas regras.`,
    'infra-gateway': `🚀 Infraestrutura mais forte e inteligente com ${meta.name}.`,
    'app-tool': `🚀 Mais produtividade no dia a dia com ${meta.name}.`,
    'dev-lib-cli': `🚀 Menos boilerplate e mais velocidade na stack com ${meta.name}.`
  };

  const partialSummary: Omit<GeneratedVisaoSummary, 'whatsappText'> = {
    category,
    templateType,
    hookTitle: hookByTemplate[templateType],
    introText: `Conheça o ${meta.name}: ${shortDesc}`,
    warningNote: '',
    features,
    scenarioTitle: tpl.scenarioHeader,
    scenarioIntro: scenarioIntroByTemplate[templateType],
    scenarioPrompt: scenarioPromptByTemplate[templateType],
    scenarioSteps: scenarioStepsByTemplate[templateType],
    scenarioOutro: '',
    killerTitle: tpl.killerHeader,
    killerText: killerTextByTemplate[templateType],
    summaryText: `Vale a pena conhecer o ${meta.fullName} se você busca uma solução em ${meta.language} na área de ${category}.`,
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

  const systemPrompt = `Você é o curador especialista do grupo "Pega a Visão", famoso por transformar repositórios do GitHub em resumos virais, diretos, didáticos e empolgantes em Português do Brasil para WhatsApp.

Sua missão: analisar os metadados e o README do repositório GitHub fornecido e devolver ESTRITAMENTE um objeto JSON válido (sem blocos markdown em volta) com a estrutura abaixo.

Existem 5 variações de template ("templateType"):
1. "ai-agent-automation" -> Para agentes de IA, MCPs, automações inteligentes, navegadores para agentes. Categoria padrão: "Agentes & Automação IA"
2. "self-hosted-saas" -> Para CRMs, ERPs, sistemas multiatendimento, SaaS open source self-hosted. Categoria padrão: "SaaS & CRM Self-Hosted"
3. "infra-gateway" -> Para gateways de IA, proxies, Cloudflare Workers, roteadores, Docker, DevOps. Categoria padrão: "Infra, Gateways & Edge"
4. "app-tool" -> Para aplicativos desktop/web, clientes de API, ferramentas visuais e utilitários prontos. Categoria padrão: "Apps & Produtividade"
5. "dev-lib-cli" -> Para bibliotecas, frameworks, SDKs, pacotes e CLIs para desenvolvedores. Categoria padrão: "Libs, SDKs & CLI Dev"

Categorias válidas ("category"):
- "Agentes & Automação IA"
- "SaaS & CRM Self-Hosted"
- "Infra, Gateways & Edge"
- "Apps & Produtividade"
- "Libs, SDKs & CLI Dev"
- "Outros"

Regras de escrita obrigatórias:
- Escreva 100% em Português do Brasil claro, natural, sem jargão desnecessário (quando usar termo técnico como RAG ou MCP, explique em meia frase simples).
- "hookTitle": Uma pergunta provocativa toda em MAIÚSCULAS começando com 1 emoji temático (ex: "🌐 E SE SEU AGENTE DE IA GANHASSE UM NAVEGADOR SÓ PARA ELE?").
- "introText": 1 parágrafo curto começando com "Conheça o <Nome>, ..." explicando o que é e o que faz de forma direta.
- "warningNote": String opcional com aviso importante se o projeto estiver em beta ou exigir cuidado especial (comece com "⚠️ "). Se não houver, retorne "".
- "features": Array com 5 a 7 strings curtas. Cada item DEVE começar com 1 emoji expressivo (ex: "📥 ...", "🔌 ...", "⚡ ...").
- "scenarioTitle": Cabeçalho do exemplo prático (ex: "🧠 PENSE ASSIM:", "⚡ NA PRÁTICA, VOCÊ FAZ ASSIM:", "💻 IMAGINE NO SEU PROJETO:").
- "scenarioIntro": Duas frases curtas introduzindo a dor que ele resolve e preparando o comando/ação (ex: "Você não precisa mais fazer tudo isso manualmente.\\n\\nVocê pode pedir ao seu agente:").
- "scenarioPrompt": Uma frase curta entre aspas simulando o pedido, regra ou comando real do usuário.
- "scenarioSteps": Array com 4 a 6 passos curtos no infinitivo mostrando o que o projeto faz nos bastidores (NÃO inclua os emojis 1️⃣..6️⃣ no início de cada item, apenas o texto do passo).
- "scenarioOutro": Frase curta opcional fechando o cenário prático (ou "").
- "killerTitle": Pergunta curta destacando o diferencial matador (ex: "🤯 A parte mais interessante?", "💡 O grande diferencial?", "🚀 Por que os devs estão adotando?").
- "killerText": 1 ou 2 parágrafos curtos explicando o verdadeiro pulo do gato (privacidade, zero mensalidade, arquitetura, velocidade, etc.).
- "summaryText": 1 parágrafo curto dizendo para quem vale a pena e como começar.
- "punchline": Frase final de efeito curta começando com "🚀 ".`;

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
      warningNote: parsed.warningNote ? String(parsed.warningNote).trim() : '',
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
