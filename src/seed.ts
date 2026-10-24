import type { RepoRecord } from './types.ts';

export const SEED_REPOSITORIES: Omit<RepoRecord, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    repo_key: 'browseros-ai/browseros',
    full_name: 'browseros-ai/BrowserOS',
    owner: 'browseros-ai',
    name: 'BrowserOS',
    repo_url: 'https://github.com/browseros-ai/BrowserOS',
    description:
      'Navegador open source feito para os seus agentes de IA trabalharem na web no seu lugar, usando as suas contas reais.',
    stars: 14100,
    forks: 1240,
    language: 'TypeScript',
    topics_json: JSON.stringify(['ai-agents', 'browser', 'mcp', 'automation', 'open-source', 'privacy']),
    last_commit_at: '2026-10-23T12:00:00Z',
    category: 'Agentes & Automação IA',
    template_type: 'ai-agent-automation',
    hook_title: '🌐 E SE SEU AGENTE DE IA GANHASSE UM NAVEGADOR SÓ PARA ELE?',
    intro_text:
      'Conheça o BrowserOS neo, um navegador open source feito para os seus agentes de IA trabalharem na web no seu lugar, usando as suas contas reais.',
    warning_note: '',
    features_json: JSON.stringify([
      '📥 Importar seus logins do Chrome com um clique',
      '🔌 Conectar Claude Code, Codex, Cursor, VS Code e outros agentes com um clique',
      '📱 Publicar conteúdo nas suas redes sociais (LinkedIn e Twitter/X)',
      '📧 Limpar sua caixa de entrada e cancelar inscrições de e-mails indesejados',
      '📊 Atualizar seu CRM, lançar despesas e puxar relatórios de ferramentas internas',
      '👀 Mostrar em tempo real o que cada agente está fazendo',
      '🎬 Gravar cada sessão para você rever depois, como um vídeo'
    ]),
    scenario_title: '🧠 PENSE ASSIM:',
    scenario_intro: 'Você não precisa mais fazer tudo isso manualmente.\n\nVocê pode pedir ao seu agente:',
    scenario_prompt: 'Me encontre a passagem mais barata para Londres.',
    scenario_steps_json: JSON.stringify([
      'Abrir uma aba nova no navegador',
      'Usar suas contas já logadas',
      'Pesquisar as opções',
      'Executar a tarefa',
      'Mostrar tudo ao vivo para você acompanhar',
      'Salvar a sessão para você rever depois'
    ]),
    scenario_outro: 'Vários agentes podem trabalhar ao mesmo tempo, cada um na sua aba.',
    killer_title: '🤯 A parte mais interessante?',
    killer_text:
      'Diferente de navegadores automatizados comuns, que abrem um Chrome vazio, sem login, o BrowserOS neo roda na sua máquina e usa suas contas reais. Suas sessões, capturas de tela e histórico ficam salvos no seu computador e não são enviados para a nuvem.',
    summary_text:
      'Vale a pena para quem usa agentes de IA e quer que eles executem tarefas reais em sites onde você já está logado, sem deixar a máquina ou abrir mão da privacidade.',
    punchline: '🚀 IA que não só responde. IA que navega por você.',
    whatsapp_text: `🌐 E SE SEU AGENTE DE IA GANHASSE UM NAVEGADOR SÓ PARA ELE?

Conheça o BrowserOS neo, um navegador open source feito para os seus agentes de IA trabalharem na web no seu lugar, usando as suas contas reais.

🔗 https://github.com/browseros-ai/BrowserOS
⭐ 14,1 mil estrelas no GitHub
🕒 Último commit em 23/10/2026

Ele funciona como um segundo navegador, ao lado do Chrome, e pode:

📥 Importar seus logins do Chrome com um clique
🔌 Conectar Claude Code, Codex, Cursor, VS Code e outros agentes com um clique
📱 Publicar conteúdo nas suas redes sociais (LinkedIn e Twitter/X)
📧 Limpar sua caixa de entrada e cancelar inscrições de e-mails indesejados
📊 Atualizar seu CRM, lançar despesas e puxar relatórios de ferramentas internas
👀 Mostrar em tempo real o que cada agente está fazendo
🎬 Gravar cada sessão para você rever depois, como um vídeo

━━━━━━━━━━━━━━━━━━

🧠 PENSE ASSIM:

Você não precisa mais fazer tudo isso manualmente.

Você pode pedir ao seu agente:

"Me encontre a passagem mais barata para Londres."

E o agente pode:

1️⃣ Abrir uma aba nova no navegador
2️⃣ Usar suas contas já logadas
3️⃣ Pesquisar as opções
4️⃣ Executar a tarefa
5️⃣ Mostrar tudo ao vivo para você acompanhar
6️⃣ Salvar a sessão para você rever depois

Vários agentes podem trabalhar ao mesmo tempo, cada um na sua aba.

━━━━━━━━━━━━━━━━━━

🤯 A parte mais interessante?

Diferente de navegadores automatizados comuns, que abrem um Chrome vazio, sem login, o BrowserOS neo roda na sua máquina e usa suas contas reais. Suas sessões, capturas de tela e histórico ficam salvos no seu computador e não são enviados para a nuvem.

━━━━━━━━━━━━━━━━━━

📌 RESUMINDO

Vale a pena para quem usa agentes de IA e quer que eles executem tarefas reais em sites onde você já está logado, sem deixar a máquina ou abrir mão da privacidade.

🚀 IA que não só responde. IA que navega por você.`
  },
  {
    repo_key: 'arnasdon/wacrm',
    full_name: 'ArnasDon/wacrm',
    owner: 'ArnasDon',
    name: 'wacrm',
    repo_url: 'https://github.com/ArnasDon/wacrm',
    description:
      'Modelo de CRM open source para WhatsApp que você hospeda na sua própria conta, personaliza como quiser e usa com toda a sua equipe.',
    stars: 2600,
    forks: 390,
    language: 'TypeScript',
    topics_json: JSON.stringify(['whatsapp', 'crm', 'self-hosted', 'saas', 'mcp', 'ai-assistant']),
    last_commit_at: '2026-10-19T12:00:00Z',
    category: 'SaaS & CRM Self-Hosted',
    template_type: 'self-hosted-saas',
    hook_title: '💬 E SE SEU WHATSAPP VIRASSE UM CRM COM A CARA DA SUA MARCA?',
    intro_text:
      'Conheça o wacrm, um modelo de CRM open source para WhatsApp que você hospeda na sua própria conta, personaliza como quiser e usa com toda a sua equipe.',
    warning_note: '',
    features_json: JSON.stringify([
      '📥 Caixa de entrada compartilhada, para vários atendentes responderem pelo mesmo número',
      '👥 Contatos com etiquetas, campos personalizados e importação de planilha',
      '📊 Funil de vendas visual, com negociações ligadas às conversas',
      '📢 Disparos em massa com modelos aprovados pela Meta, com acompanhamento de entrega e leitura',
      '⚙️ Automações sem código, disparadas por mensagem, palavra-chave, novo contato ou agenda',
      '🤖 Assistente de IA que sugere respostas e pode responder sozinho, com passagem para humano',
      '📈 Painel em tempo real com tempo de resposta, volume diário e valor do funil',
      '🔌 API pública e servidor MCP para conectar ao Claude, Cursor e outros assistentes de IA'
    ]),
    scenario_title: '🧠 PENSE ASSIM:',
    scenario_intro:
      'Você não precisa mais olhar mensagem por mensagem para identificar quem está pronto para comprar.\n\nVocê pode montar uma regra assim:',
    scenario_prompt:
      "Quando o cliente escrever 'orçamento', marque como cliente quente e envie os dados para o meu sistema.",
    scenario_steps_json: JSON.stringify([
      'Identificar a palavra "orçamento" na mensagem',
      'Aplicar a etiqueta "quente" no contato',
      'Esperar o tempo que você definir',
      'Enviar as informações para outro sistema'
    ]),
    scenario_outro: 'Tudo montado em um painel visual.',
    killer_title: '🤯 A parte mais interessante?',
    killer_text:
      'Você é dono de tudo: código, banco de dados, domínio e dados dos clientes. Nada fica preso a uma mensalidade de plataforma.\n\nE o assistente de IA usa a sua própria chave da OpenAI ou da Anthropic, com a base de conhecimento da sua empresa (FAQs, políticas e produtos) para responder com o seu conteúdo.',
    summary_text:
      'Para equipes que atendem pelo WhatsApp e querem um CRM próprio, personalizável e sem depender de um SaaS fechado. A publicação é simples: o projeto recomenda a Hostinger, com poucos cliques.',
    punchline: '🚀 Seu WhatsApp, seu CRM, sua marca.',
    whatsapp_text: `E SE SEU WHATSAPP VIRASSE UM CRM COM A CARA DA SUA MARCA?

Conheça o wacrm, um modelo de CRM open source para WhatsApp que você hospeda na sua própria conta, personaliza como quiser e usa com toda a sua equipe.

🔗 https://github.com/ArnasDon/wacrm
⭐ 2,6 mil estrelas no GitHub
🕒 Último commit em 19/10/2026

Ele faz, por exemplo:

📥 Caixa de entrada compartilhada, para vários atendentes responderem pelo mesmo número
👥 Contatos com etiquetas, campos personalizados e importação de planilha
📊 Funil de vendas visual, com negociações ligadas às conversas
📢 Disparos em massa com modelos aprovados pela Meta, com acompanhamento de entrega e leitura
⚙️ Automações sem código, disparadas por mensagem, palavra-chave, novo contato ou agenda
🤖 Assistente de IA que sugere respostas e pode responder sozinho, com passagem para humano
📈 Painel em tempo real com tempo de resposta, volume diário e valor do funil
🔌 API pública e servidor MCP para conectar ao Claude, Cursor e outros assistentes de IA

━━━━━━━━━━━━━━━━━━

🧠 PENSE ASSIM:

Você não precisa mais olhar mensagem por mensagem para identificar quem está pronto para comprar.

Você pode montar uma regra assim:

"Quando o cliente escrever 'orçamento', marque como cliente quente e envie os dados para o meu sistema."

E a automação pode:

1️⃣ Identificar a palavra "orçamento" na mensagem
2️⃣ Aplicar a etiqueta "quente" no contato
3️⃣ Esperar o tempo que você definir
4️⃣ Enviar as informações para outro sistema

Tudo montado em um painel visual.

━━━━━━━━━━━━━━━━━━

🤯 A parte mais interessante?

Você é dono de tudo: código, banco de dados, domínio e dados dos clientes. Nada fica preso a uma mensalidade de plataforma.

E o assistente de IA usa a sua própria chave da OpenAI ou da Anthropic, com a base de conhecimento da sua empresa (FAQs, políticas e produtos) para responder com o seu conteúdo.

━━━━━━━━━━━━━━━━━━

📌 RESUMINDO

Para equipes que atendem pelo WhatsApp e querem um CRM próprio, personalizável e sem depender de um SaaS fechado. A publicação é simples: o projeto recomenda a Hostinger, com poucos cliques.

🚀 Seu WhatsApp, seu CRM, sua marca.`
  },
  {
    repo_key: 'samucamg/veroroute-edge',
    full_name: 'samucamg/veroroute-edge',
    owner: 'samucamg',
    name: 'veroroute-edge',
    repo_url: 'https://github.com/samucamg/veroroute-edge',
    description:
      'Gateway de IA que funciona como um intermediário inteligente entre seus aplicativos e vários provedores de IA na nuvem da Cloudflare.',
    stars: 12,
    forks: 4,
    language: 'TypeScript',
    topics_json: JSON.stringify(['cloudflare-workers', 'ai-gateway', 'openai', 'anthropic', 'failover', 'rag']),
    last_commit_at: '2026-10-09T12:00:00Z',
    category: 'Infra, Gateways & Edge',
    template_type: 'infra-gateway',
    hook_title: '🔀 E SE SEUS APPS DE IA NUNCA FICASSEM SEM RESPOSTA?',
    intro_text:
      'Conheça o VeroRoute Edge, um gateway de IA que funciona como um intermediário inteligente entre seus aplicativos e vários provedores de IA. Ele roda na nuvem da Cloudflare, então você não precisa manter servidor.',
    warning_note:
      '⚠️ O projeto está em beta ativo. Não use o botão "Deploy to Cloudflare" de um clique, porque ele cria uma instalação que não recebe atualizações. Faça sempre um fork do repositório.',
    features_json: JSON.stringify([
      '🔄 Troca de provedor sozinho quando um deles falha ou atinge o limite',
      '🔑 Distribui as requisições entre um conjunto de chaves de API',
      '🔌 Trabalha com os formatos das APIs da OpenAI e da Anthropic',
      '🔎 Faz busca na web e RAG, que é buscar informações para a IA usar na resposta',
      '🗜️ Compressão de contexto para economizar tokens',
      '⚡ Cache de respostas na borda para pedidos repetidos',
      '🎛️ Painel administrativo com combos de rotas, chaves virtuais e estimativa de uso e custo'
    ]),
    scenario_title: '🧠 PENSE ASSIM:',
    scenario_intro:
      'Você não precisa mais escolher um único provedor e torcer para ele não cair.\n\nVocê pode pedir no seu app, do jeito de sempre:',
    scenario_prompt: 'Gere uma resposta para este cliente no WhatsApp.',
    scenario_steps_json: JSON.stringify([
      'Receber o pedido',
      'Escolher o provedor conforme a estratégia que você configurou',
      'Se der erro de limite ou falha no servidor, tentar o próximo automaticamente',
      'Pausar temporariamente o provedor que falhou',
      'Devolver a resposta para o seu app, sem você precisar trocar nada'
    ]),
    scenario_outro: '',
    killer_title: '🤯 A parte mais interessante?',
    killer_text:
      'Segundo o projeto, as requisições saem pelos IPs compartilhados da própria Cloudflare, sem usar proxies. A ideia é que o tráfego se misture com aplicativos corporativos legítimos, o que reduz o risco de bloqueio por IP, sem você precisar gerenciar uma frota de proxies.',
    summary_text:
      'Para quem usa IA em atendimento, automações ou apps e não quer depender de um único provedor. Não exige VPS e tem guia de instalação, além de vídeo tutorial em português no canal Samuca Tutoriais.',
    punchline: '🚀 IA que não para quando um provedor cai.',
    whatsapp_text: `🔀 E SE SEUS APPS DE IA NUNCA FICASSEM SEM RESPOSTA?

Conheça o VeroRoute Edge, um gateway de IA que funciona como um intermediário inteligente entre seus aplicativos e vários provedores de IA. Ele roda na nuvem da Cloudflare, então você não precisa manter servidor.

🔗 https://github.com/samucamg/veroroute-edge
⭐ 12 estrelas no GitHub
🕒 Último commit em 09/10/2026

⚠️ O projeto está em beta ativo. Não use o botão "Deploy to Cloudflare" de um clique, porque ele cria uma instalação que não recebe atualizações. Faça sempre um fork do repositório.

Ele faz por você:

🔄 Troca de provedor sozinho quando um deles falha ou atinge o limite
🔑 Distribui as requisições entre um conjunto de chaves de API
🔌 Trabalha com os formatos das APIs da OpenAI e da Anthropic
🔎 Faz busca na web e RAG, que é buscar informações para a IA usar na resposta
🗜️ Compressão de contexto para economizar tokens
⚡ Cache de respostas na borda para pedidos repetidos
🎛️ Painel administrativo com combos de rotas, chaves virtuais e estimativa de uso e custo

━━━━━━━━━━━━━━━━━━

🧠 PENSE ASSIM:

Você não precisa mais escolher um único provedor e torcer para ele não cair.

Você pode pedir no seu app, do jeito de sempre:

"Gere uma resposta para este cliente no WhatsApp."

E o gateway pode:

1️⃣ Receber o pedido
2️⃣ Escolher o provedor conforme a estratégia que você configurou
3️⃣ Se der erro de limite ou falha no servidor, tentar o próximo automaticamente
4️⃣ Pausar temporariamente o provedor que falhou
5️⃣ Devolver a resposta para o seu app, sem você precisar trocar nada

━━━━━━━━━━━━━━━━━━

🤯 A parte mais interessante?

Segundo o projeto, as requisições saem pelos IPs compartilhados da própria Cloudflare, sem usar proxies. A ideia é que o tráfego se misture com aplicativos corporativos legítimos, o que reduz o risco de bloqueio por IP, sem você precisar gerenciar uma frota de proxies.

━━━━━━━━━━━━━━━━━━

📌 RESUMINDO

Para quem usa IA em atendimento, automações ou apps e não quer depender de um único provedor. Não exige VPS e tem guia de instalação, além de vídeo tutorial em português no canal Samuca Tutoriais.

🚀 IA que não para quando um provedor cai.`
  },
  {
    repo_key: 'usebruno/bruno',
    full_name: 'usebruno/bruno',
    owner: 'usebruno',
    name: 'bruno',
    repo_url: 'https://github.com/usebruno/bruno',
    description:
      'Cliente de API open source rápido e Git-friendly que salva suas coleções diretamente em pastas no seu computador.',
    stars: 31400,
    forks: 1450,
    language: 'JavaScript',
    topics_json: JSON.stringify(['api-client', 'rest', 'graphql', 'git-friendly', 'desktop-app', 'open-source']),
    last_commit_at: '2026-10-21T15:30:00Z',
    category: 'Apps & Produtividade',
    template_type: 'app-tool',
    hook_title: '🖥️ E SE SUAS COLEÇÕES DE API VIVESSEM DENTRO DO SEU REPOSITÓRIO GIT?',
    intro_text:
      'Conheça o Bruno, um cliente de API open source leve e rápido que substitui Postman e Insomnia salvando suas requisições como arquivos de texto puro direto na sua máquina.',
    warning_note: '',
    features_json: JSON.stringify([
      '📁 Salva coleções em arquivos .bru legíveis direto numa pasta do seu projeto',
      '🌿 Versionamento nativo com Git: faça Pull Request das suas rotas junto com o código',
      '🔒 100% offline por padrão, sem exigir conta em nuvem ou sincronização forçada',
      '⚡ Suporte completo a REST, GraphQL, gRPC e variáveis de ambiente locais',
      '🧪 Testes automatizados em JavaScript e execução via terminal com o Bruno CLI',
      '📦 Importação rápida de coleções do Postman, Insomnia e especificações OpenAPI'
    ]),
    scenario_title: '⚡ NA PRÁTICA, VOCÊ FAZ ASSIM:',
    scenario_intro:
      'Você não precisa mais exportar JSON gigante ou pagar licença por usuário só para compartilhar endpoints com o time.\n\nVocê pode simplesmente:',
    scenario_prompt: 'Versionar a pasta /api-collections junto com o backend no GitHub.',
    scenario_steps_json: JSON.stringify([
      'Abrir a pasta do projeto direto no aplicativo desktop do Bruno',
      'Testar os endpoints locais usando variáveis e tokens de ambiente',
      'Salvar as alterações como arquivos de texto limpos',
      'Dar git commit e compartilhar com toda a equipe instantaneamente'
    ]),
    scenario_outro: 'Qualquer dev que clonar o repositório já recebe os testes de API prontos para rodar.',
    killer_title: '💡 O grande diferencial?',
    killer_text:
      'Enquanto ferramentas tradicionais obrigam você a fazer login e guardam suas chaves e rotas na nuvem deles, o Bruno nunca envia seus dados para lugar nenhum. Tudo é arquivo local sob o seu controle.',
    summary_text:
      'Indicado para desenvolvedores e times que testam APIs todos os dias e querem velocidade, privacidade total e integração nativa com Git.',
    punchline: '🚀 Suas APIs no seu disco, versionadas no seu Git.',
    whatsapp_text: `🖥️ E SE SUAS COLEÇÕES DE API VIVESSEM DENTRO DO SEU REPOSITÓRIO GIT?

Conheça o Bruno, um cliente de API open source leve e rápido que substitui Postman e Insomnia salvando suas requisições como arquivos de texto puro direto na sua máquina.

🔗 https://github.com/usebruno/bruno
⭐ 31,4 mil estrelas no GitHub
🕒 Último commit em 21/10/2026

O que ele entrega pronto para usar:

📁 Salva coleções em arquivos .bru legíveis direto numa pasta do seu projeto
🌿 Versionamento nativo com Git: faça Pull Request das suas rotas junto com o código
🔒 100% offline por padrão, sem exigir conta em nuvem ou sincronização forçada
⚡ Suporte completo a REST, GraphQL, gRPC e variáveis de ambiente locais
🧪 Testes automatizados em JavaScript e execução via terminal com o Bruno CLI
📦 Importação rápida de coleções do Postman, Insomnia e especificações OpenAPI

━━━━━━━━━━━━━━━━━━

⚡ NA PRÁTICA, VOCÊ FAZ ASSIM:

Você não precisa mais exportar JSON gigante ou pagar licença por usuário só para compartilhar endpoints com o time.

Você pode simplesmente:

"Versionar a pasta /api-collections junto com o backend no GitHub."

E a ferramenta faz:

1️⃣ Abrir a pasta do projeto direto no aplicativo desktop do Bruno
2️⃣ Testar os endpoints locais usando variáveis e tokens de ambiente
3️⃣ Salvar as alterações como arquivos de texto limpos
4️⃣ Dar git commit e compartilhar com toda a equipe instantaneamente

Qualquer dev que clonar o repositório já recebe os testes de API prontos para rodar.

━━━━━━━━━━━━━━━━━━

💡 O grande diferencial?

Enquanto ferramentas tradicionais obrigam você a fazer login e guardam suas chaves e rotas na nuvem deles, o Bruno nunca envia seus dados para lugar nenhum. Tudo é arquivo local sob o seu controle.

━━━━━━━━━━━━━━━━━━

📌 RESUMINDO

Indicado para desenvolvedores e times que testam APIs todos os dias e querem velocidade, privacidade total e integração nativa com Git.

🚀 Suas APIs no seu disco, versionadas no seu Git.`
  },
  {
    repo_key: 'honojs/hono',
    full_name: 'honojs/hono',
    owner: 'honojs',
    name: 'hono',
    repo_url: 'https://github.com/honojs/hono',
    description:
      'Framework web ultrarrápido, leve e construído sobre Web Standards para Cloudflare Workers, Deno, Bun e Node.js.',
    stars: 22800,
    forks: 680,
    language: 'TypeScript',
    topics_json: JSON.stringify(['typescript', 'cloudflare-workers', 'edge', 'framework', 'web-standards', 'bun']),
    last_commit_at: '2026-10-22T18:10:00Z',
    category: 'Libs, SDKs & CLI Dev',
    template_type: 'dev-lib-cli',
    hook_title: '🛠️ E SE SUA API RODASSE EM QUALQUER RUNTIME COM ZERO DEPENDÊNCIAS?',
    intro_text:
      'Conheça o Hono, um micro-framework web em TypeScript criado sobre padrões Web nativos que roda em Cloudflare Workers, Bun, Deno e Node.js sem mudar uma linha de código.',
    warning_note: '',
    features_json: JSON.stringify([
      '⚡ Roteador RegExpRouter ultrarrápido com pacote minúsculo (menos de 14kB)',
      '🌍 Roda em Cloudflare Workers, Fastly, Deno, Bun, AWS Lambda e Node.js',
      '🔒 Tipagem fim-a-fim com Hono RPC: compartilhe tipos da API direto com o frontend',
      '🧩 Middlewares prontos para JWT, CORS, compressão, cache, Zod e OpenAPI',
      '🎨 Suporte nativo a JSX no servidor para renderizar interfaces rápidas sem build complexo'
    ]),
    scenario_title: '💻 IMAGINE NO SEU PROJETO:',
    scenario_intro:
      'Você não precisa mais configurar dezenas de pacotes pesados para subir uma API tipada na borda.\n\nNo seu arquivo principal você escreve:',
    scenario_prompt: "app.get('/api/repos', (c) => c.json({ ok: true }))",
    scenario_steps_json: JSON.stringify([
      'Definir as rotas e validações com autocompletar completo em TypeScript',
      'Plugar banco D1, KV ou qualquer serviço externo no contexto da requisição',
      'Exportar o cliente RPC tipado para o frontend consumir sem erro de contrato',
      'Publicar na borda da Cloudflare em poucos segundos com cold start zero'
    ]),
    scenario_outro: '',
    killer_title: '🚀 Por que os devs estão adotando?',
    killer_text:
      'Diferente do Express, que nasceu preso a APIs antigas do Node.js, o Hono usa apenas Request e Response nativos da Web. Isso garante performance máxima na borda e portabilidade total entre qualquer nuvem.',
    summary_text:
      'Perfeito para desenvolvedores TypeScript que constroem APIs modernas, microsserviços serverless ou aplicações full-stack em Cloudflare Workers.',
    punchline: '🚀 Leve como uma pena, rápido como a borda.',
    whatsapp_text: `🛠️ E SE SUA API RODASSE EM QUALQUER RUNTIME COM ZERO DEPENDÊNCIAS?

Conheça o Hono, um micro-framework web em TypeScript criado sobre padrões Web nativos que roda em Cloudflare Workers, Bun, Deno e Node.js sem mudar uma linha de código.

🔗 https://github.com/honojs/hono
⭐ 22,8 mil estrelas no GitHub
🕒 Último commit em 22/10/2026

Por que colocar essa ferramenta na sua stack:

⚡ Roteador RegExpRouter ultrarrápido com pacote minúsculo (menos de 14kB)
🌍 Roda em Cloudflare Workers, Fastly, Deno, Bun, AWS Lambda e Node.js
🔒 Tipagem fim-a-fim com Hono RPC: compartilhe tipos da API direto com o frontend
🧩 Middlewares prontos para JWT, CORS, compressão, cache, Zod e OpenAPI
🎨 Suporte nativo a JSX no servidor para renderizar interfaces rápidas sem build complexo

━━━━━━━━━━━━━━━━━━

💻 IMAGINE NO SEU PROJETO:

Você não precisa mais configurar dezenas de pacotes pesados para subir uma API tipada na borda.

No seu arquivo principal você escreve:

"app.get('/api/repos', (c) => c.json({ ok: true }))"

E a biblioteca resolve:

1️⃣ Definir as rotas e validações com autocompletar completo em TypeScript
2️⃣ Plugar banco D1, KV ou qualquer serviço externo no contexto da requisição
3️⃣ Exportar o cliente RPC tipado para o frontend consumir sem erro de contrato
4️⃣ Publicar na borda da Cloudflare em poucos segundos com cold start zero

━━━━━━━━━━━━━━━━━━

🚀 Por que os devs estão adotando?

Diferente do Express, que nasceu preso a APIs antigas do Node.js, o Hono usa apenas Request e Response nativos da Web. Isso garante performance máxima na borda e portabilidade total entre qualquer nuvem.

━━━━━━━━━━━━━━━━━━

📌 RESUMINDO

Perfeito para desenvolvedores TypeScript que constroem APIs modernas, microsserviços serverless ou aplicações full-stack em Cloudflare Workers.

🚀 Leve como uma pena, rápido como a borda.`
  }
];
