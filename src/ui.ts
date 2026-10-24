import type { Env } from './types.ts';

function escapeHtmlServer(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderAppHtml(env: Partial<Env> = {}): string {
  const appTitle = escapeHtmlServer(env.PUBLIC_APP_TITLE || 'GitVisão • Pega a Visão');
  const modelName = escapeHtmlServer(env.OMNIROUTE_MODEL || 'gemini-2.5-flash');
  const omnirouteActive = Boolean(env.OMNIROUTE_BASE_URL && env.OMNIROUTE_API_KEY);

  return `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'system-ui', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          },
          colors: {
            bg: {
              950: '#07090e',
              900: '#0d1117',
              850: '#131922',
              800: '#161b22',
              700: '#21262d',
            },
            brand: {
              400: '#38bdf8',
              500: '#0ea5e9',
              600: '#0284c7',
            }
          }
        }
      }
    };
  </script>
  <style>
    body {
      background-color: #07090e;
      background-image:
        radial-gradient(at 15% 0%, rgba(14, 165, 233, 0.12) 0px, transparent 45%),
        radial-gradient(at 85% 5%, rgba(16, 185, 129, 0.10) 0px, transparent 45%);
      color: #e6edf3;
    }
    .glass-panel {
      background: rgba(19, 25, 34, 0.82);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .card-hover {
      transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
    }
    .card-hover:hover {
      transform: translateY(-2px);
      border-color: rgba(56, 189, 248, 0.45);
      box-shadow: 0 12px 32px -10px rgba(14, 165, 233, 0.22);
    }
    .whatsapp-preview {
      background-color: #0b141a;
      background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0);
      background-size: 20px 20px;
    }
    .whatsapp-bubble {
      background-color: #005c4b;
      color: #e9edef;
      border-radius: 12px 12px 12px 2px;
    }
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #0d1117;
    }
    ::-webkit-scrollbar-thumb {
      background: #21262d;
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #30363d;
    }
  </style>
</head>
<body class="min-h-screen font-sans antialiased selection:bg-sky-500/30 selection:text-sky-200">

  <!-- Notificação Toast -->
  <div id="toast-container" class="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"></div>

  <!-- Cabeçalho -->
  <header class="sticky top-0 z-30 border-b border-white/10 bg-[#07090e]/85 backdrop-blur-xl">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-sky-500/20 text-lg font-extrabold text-slate-950">
          👁️
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 id="app-title-heading" class="text-base sm:text-lg font-bold tracking-tight text-white">${appTitle}</h1>
            <span class="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/25">
              5 Templates IA
            </span>
          </div>
          <p class="text-xs text-slate-400 hidden sm:block">
            Catálogo inteligente de repositórios GitHub prontos para compartilhar no WhatsApp
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:gap-3">
        <!-- Status OmniRoute + D1 -->
        <div id="health-badge" class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900/90 border border-white/10 text-slate-300">
          <span id="health-dot" class="w-2 h-2 rounded-full ${omnirouteActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
          <span id="health-text" class="font-mono text-[11px]">
            ${omnirouteActive ? `OmniRoute (${modelName}) + D1` : `Modo Smart (${modelName}) + D1`}
          </span>
        </div>

        <!-- Contador Total -->
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-500/10 border border-sky-500/30 text-sky-300">
          <span>📦</span>
          <span id="total-repos-count">0</span>
          <span class="hidden md:inline">repositórios</span>
        </div>

        <!-- Botão Painel de Configuração no Próprio App (Zero CLI) -->
        <button
          id="open-settings-btn"
          type="button"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800/90 hover:bg-slate-700 border border-white/15 text-white transition cursor-pointer shadow-sm"
        >
          <span>⚙️ Configurar IA &amp; Senha</span>
        </button>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

    <!-- Banner de Primeiro Acesso / Configuração Zero CLI -->
    <div id="first-access-banner" class="hidden rounded-2xl border border-amber-500/35 bg-amber-950/25 px-4 py-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <p class="text-xs sm:text-sm text-amber-200/95 leading-relaxed">
        💡 Primeiro acesso: a senha inicial de admin é <code class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 font-mono font-bold">admin</code>. Clique em <button id="banner-open-settings-btn" type="button" class="font-bold text-amber-300 underline hover:text-white cursor-pointer">⚙️ Configurar IA &amp; Senha</button> para conectar seu OmniRoute e definir sua senha definitiva (salva no banco D1, à prova de atualizações do GitHub).
      </p>
      <button
        id="banner-settings-cta-btn"
        type="button"
        class="shrink-0 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-xs transition cursor-pointer"
      >
        ⚙️ Configurar IA &amp; Senha
      </button>
    </div>

    <!-- Painel Principal: Checar ou Cadastrar Repositório -->
    <section class="glass-panel rounded-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
      <div class="absolute -right-20 -top-20 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <span class="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-sky-400 mb-1">
            ⚡ Consulta Instantânea &amp; Geração "Pega a Visão"
          </span>
          <h2 class="text-xl sm:text-2xl font-bold text-white">
            Checar ou Cadastrar Repositório do GitHub
          </h2>
          <p class="text-sm text-slate-400 mt-0.5">
            Cole o link de um repositório. Se já estiver no banco D1, você copia na hora sem senha. Se for inédito, gere com IA!
          </p>
        </div>
      </div>

      <!-- Barra de Verificação -->
      <form id="check-form" class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
            🔗
          </span>
          <input
            id="repo-input"
            type="text"
            required
            placeholder="Ex: https://github.com/browseros-ai/BrowserOS ou owner/repo"
            class="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/90 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 font-mono"
          />
        </div>
        <button
          id="check-submit-btn"
          type="submit"
          class="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-sky-500/20 transition flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <span>🔎 Verificar / Buscar</span>
        </button>
      </form>

      <!-- Resultado quando JÁ EXISTE no catálogo -->
      <div id="check-exists-panel" class="hidden mt-5 rounded-xl border border-emerald-500/40 bg-emerald-950/25 p-4 sm:p-5">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ✅ Este repositório já está no catálogo!
              </span>
              <span id="exists-repo-name" class="font-mono text-sm font-bold text-white"></span>
              <span id="exists-repo-template" class="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-300 font-mono"></span>
            </div>
            <p id="exists-repo-hook" class="text-sm font-semibold text-emerald-200 pt-1"></p>
            <p id="exists-repo-intro" class="text-xs text-slate-300 line-clamp-2"></p>
          </div>

          <div class="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="exists-copy-btn"
              type="button"
              class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              📲 Copiar Resumo p/ WhatsApp
            </button>
            <button
              id="exists-view-btn"
              type="button"
              class="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs sm:text-sm transition cursor-pointer"
            >
              👁️ Ver Visão Completa
            </button>
            <button
              id="exists-regenerate-toggle-btn"
              type="button"
              class="px-3 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-white/10 text-xs font-medium transition cursor-pointer"
            >
              🔄 Regerar com IA (Admin)
            </button>
          </div>
        </div>
      </div>

      <!-- Painel para GERAR RESUMO INÉDITO (ou Regerar com Admin) -->
      <div id="check-generate-panel" class="hidden mt-5 rounded-xl border border-sky-500/35 bg-slate-900/80 p-4 sm:p-5 space-y-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <span id="generate-badge-status" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              🆕 Repositório inédito no catálogo
            </span>
            <h3 class="text-base font-bold text-white mt-1">
              Gerar Resumo "Pega a Visão" para <span id="generate-repo-label" class="font-mono text-sky-400"></span>
            </h3>
            <p class="text-xs text-slate-400">
              Informe a senha de administrador e escolha a variação de template (ou deixe no modo Automático para a IA decidir).
            </p>
          </div>
          <button id="close-generate-panel" type="button" class="text-slate-400 hover:text-white text-sm px-2 py-1">✕</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label for="admin-password-input" class="block text-xs font-medium text-slate-300 mb-1">
              🔑 Senha de Admin
            </label>
            <input
              id="admin-password-input"
              type="password"
              placeholder="Digite a senha ADMIN_PASSWORD..."
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 font-mono"
            />
          </div>

          <div>
            <label for="template-type-select" class="block text-xs font-medium text-slate-300 mb-1">
              🎨 Variação de Template (5 Estilos)
            </label>
            <select
              id="template-type-select"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-sky-400"
            >
              <option value="auto">🤖 Automático (IA decide o melhor formato)</option>
              <option value="ai-agent-automation">1. Agente IA &amp; Automação (Estilo BrowserOS)</option>
              <option value="self-hosted-saas">2. SaaS &amp; CRM Self-Hosted (Estilo wacrm)</option>
              <option value="infra-gateway">3. Infra, Gateway &amp; Edge (Estilo VeroRoute)</option>
              <option value="app-tool">4. App Desktop / Web &amp; Produtividade</option>
              <option value="dev-lib-cli">5. Biblioteca, SDK, Framework &amp; CLI Dev</option>
            </select>
          </div>

          <div class="flex items-end">
            <button
              id="generate-submit-btn"
              type="button"
              class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              ✨ Gerar Resumo Pega a Visão
            </button>
          </div>
        </div>
        <p id="generate-error-msg" class="hidden text-xs text-rose-400 font-medium"></p>
      </div>
    </section>

    <!-- Barra de Busca, Categorias e Filtros -->
    <section class="space-y-4">
      <div class="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <!-- Input de busca instantânea -->
        <div class="relative flex-1">
          <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
            🔍
          </span>
          <input
            id="search-input"
            type="search"
            placeholder="Buscar no catálogo por nome, descrição, funcionalidade, tópico ou linguagem..."
            class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
          />
        </div>

        <!-- Seletores de Variação de Template e Ordenação -->
        <div class="flex flex-col sm:flex-row gap-2.5">
          <select
            id="filter-template-select"
            aria-label="Filtrar por variação de template"
            class="px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-sky-400"
          >
            <option value="">🎨 Todos os 5 Templates</option>
            <option value="ai-agent-automation">🤖 Agente IA &amp; Automação</option>
            <option value="self-hosted-saas">🏢 SaaS &amp; CRM Self-Hosted</option>
            <option value="infra-gateway">⚡ Infra, Gateway &amp; Edge</option>
            <option value="app-tool">💻 App &amp; Ferramenta Prática</option>
            <option value="dev-lib-cli">🛠️ Lib, SDK &amp; CLI Dev</option>
          </select>

          <select
            id="sort-select"
            aria-label="Ordenar repositórios"
            class="px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-sky-400"
          >
            <option value="recent">🕒 Mais Recentes</option>
            <option value="stars">⭐ Mais Estrelas ⭐</option>
            <option value="alpha">🔤 Ordem Alfabética A-Z</option>
          </select>
        </div>
      </div>

      <!-- Pílulas de Categoria -->
      <div id="category-pills" class="flex items-center gap-2 overflow-x-auto pb-1">
        <!-- Renderizado via JS com contadores -->
      </div>
    </section>

    <!-- Grid de Cards de Repositórios -->
    <section>
      <div id="repos-loading" class="py-16 text-center text-slate-400 text-sm">
        Carregando catálogo de repositórios...
      </div>

      <div id="repos-empty" class="hidden glass-panel rounded-2xl p-12 text-center space-y-3">
        <div class="text-4xl">📭</div>
        <h3 class="text-lg font-bold text-white">Nenhum repositório encontrado</h3>
        <p class="text-sm text-slate-400 max-w-md mx-auto">
          Cole uma URL do GitHub no painel acima para inaugurar ou expandir o seu catálogo "Pega a Visão"!
        </p>
      </div>

      <div id="repos-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"></div>

      <div id="pagination-container" class="mt-8 flex flex-col items-center justify-center gap-3">
        <div id="pagination-status" class="text-xs sm:text-sm text-slate-400 font-mono">
          Exibindo <span id="displayed-repos-count" class="font-bold text-sky-400">0</span> de <span id="filtered-repos-count" class="font-bold text-white">0</span> repositórios
        </div>
        <button
          id="load-more-btn"
          type="button"
          class="hidden px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-sky-500/20 transition cursor-pointer flex items-center gap-2"
        >
          <span>⬇️ Carregar Mais Repositórios</span>
        </button>
        <div id="load-more-loading" class="hidden text-xs text-sky-400 font-mono animate-pulse">
          ⏳ Carregando mais repositórios...
        </div>
        <div id="all-loaded-msg" class="hidden text-xs text-slate-500 font-mono">
          🎉 Todos os repositórios foram carregados!
        </div>
      </div>
    </section>
  </main>

  <!-- Modal "Pega a Visão" Completa + Preview WhatsApp Lado a Lado -->
  <div id="visao-modal" class="fixed inset-0 z-50 hidden items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
    <div class="glass-panel w-full max-w-5xl max-h-[92vh] rounded-2xl border border-white/15 shadow-2xl flex flex-col overflow-hidden">
      <!-- Topo do Modal -->
      <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-4 bg-slate-950/60">
        <div class="flex flex-wrap items-center gap-2">
          <span id="modal-category-badge" class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30"></span>
          <span id="modal-template-badge" class="px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/10 text-slate-300"></span>
          <h3 id="modal-repo-title" class="text-base sm:text-lg font-bold font-mono text-white"></h3>
        </div>
        <button id="modal-close-btn" type="button" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 flex items-center justify-center cursor-pointer">
          ✕
        </button>
      </div>

      <!-- Corpo do Modal Lado a Lado -->
      <div class="p-5 sm:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Coluna 1: Resumo Estruturado -->
        <div class="space-y-4">
          <div>
            <span class="text-[11px] font-mono uppercase tracking-wider text-sky-400">Gancho Principal</span>
            <h4 id="modal-hook-title" class="text-lg font-extrabold text-white mt-0.5"></h4>
            <p id="modal-intro-text" class="text-sm text-slate-300 mt-2 leading-relaxed"></p>
          </div>

          <div id="modal-warning-box" class="hidden p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200"></div>

          <div class="flex flex-wrap gap-2 text-xs font-mono text-slate-300">
            <span id="modal-stars" class="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10"></span>
            <span id="modal-commit" class="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10"></span>
            <span id="modal-language" class="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10"></span>
          </div>

          <div>
            <h5 class="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">O que ele faz na prática</h5>
            <ul id="modal-features-list" class="space-y-1.5 text-sm text-slate-200"></ul>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
            <h5 id="modal-scenario-title" class="text-xs font-bold uppercase tracking-wider text-sky-400"></h5>
            <p id="modal-scenario-intro" class="text-xs text-slate-300"></p>
            <blockquote id="modal-scenario-prompt" class="p-2.5 rounded-lg bg-slate-950 border-l-2 border-sky-400 text-xs font-mono text-sky-200"></blockquote>
            <ol id="modal-scenario-steps" class="space-y-1 text-xs text-slate-200 pt-1"></ol>
            <p id="modal-scenario-outro" class="text-xs text-slate-400 italic pt-1"></p>
          </div>

          <div class="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/25 space-y-1">
            <h5 id="modal-killer-title" class="text-xs font-bold text-emerald-300"></h5>
            <p id="modal-killer-text" class="text-xs text-slate-200 leading-relaxed"></p>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/70 border border-white/10 space-y-1.5">
            <h5 class="text-xs font-bold text-slate-300">📌 RESUMINDO</h5>
            <p id="modal-summary-text" class="text-xs text-slate-300 leading-relaxed"></p>
            <p id="modal-punchline" class="text-sm font-bold text-sky-300 pt-1"></p>
          </div>
        </div>

        <!-- Coluna 2: Preview Exato do WhatsApp -->
        <div class="flex flex-col h-full">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              📲 Preview Exato no WhatsApp
            </span>
            <button
              id="modal-copy-whatsapp-btn"
              type="button"
              class="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              📲 Copiar Texto p/ WhatsApp
            </button>
          </div>

          <div class="whatsapp-preview flex-1 rounded-2xl p-4 border border-white/10 overflow-y-auto max-h-[540px]">
            <div class="whatsapp-bubble p-4 shadow-md text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap font-sans select-all" id="modal-whatsapp-text"></div>
          </div>

          <div class="mt-3 flex items-center justify-between gap-3">
            <a
              id="modal-github-link"
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition"
            >
              🔗 Abrir Repositório no GitHub ↗
            </a>
            <button
              id="modal-regenerate-btn"
              type="button"
              class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 transition cursor-pointer"
            >
              🔄 Regerar este Resumo (Admin)
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Administrativo: Configurar IA & Senha no Banco D1 (Zero CLI) -->
  <div id="settings-modal" class="fixed inset-0 z-50 hidden items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
    <div class="glass-panel w-full max-w-2xl max-h-[92vh] rounded-2xl border border-white/15 shadow-2xl flex flex-col overflow-hidden">
      <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-4 bg-slate-950/60">
        <div>
          <span class="text-[11px] font-mono uppercase tracking-wider text-sky-400">Persistência Direta no Cloudflare D1 • Zero CLI</span>
          <h3 class="text-base sm:text-lg font-bold text-white">⚙️ Configurar IA &amp; Senha</h3>
        </div>
        <button id="settings-close-btn" type="button" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 flex items-center justify-center cursor-pointer">
          ✕
        </button>
      </div>

      <form id="settings-form" class="p-5 sm:p-6 overflow-y-auto space-y-4">
        <div class="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-xs text-sky-200 leading-relaxed">
          🔒 Todas as configurações abaixo são salvas na tabela <code class="font-mono font-bold text-white">app_settings</code> do seu banco D1. Elas nunca são perdidas quando você faz <code class="font-mono">git push</code> ou atualiza o código pelo GitHub.
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label for="settings-current-password" class="block text-xs font-semibold text-slate-200 mb-1">
              🔑 Senha Atual de Admin <span class="text-amber-300 font-mono font-normal">(Padrão inicial: admin)</span>
            </label>
            <input
              id="settings-current-password"
              type="password"
              required
              placeholder="Padrão inicial: admin"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 font-mono"
            />
          </div>

          <div>
            <label for="settings-new-password" class="block text-xs font-semibold text-slate-200 mb-1">
              🛡️ Nova Senha de Admin <span class="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              id="settings-new-password"
              type="password"
              placeholder="Em branco mantém a senha atual"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 font-mono"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-white/10">
          <div class="sm:col-span-2">
            <label for="settings-omniroute-url" class="block text-xs font-semibold text-slate-200 mb-1">
              🌐 URL do OmniRoute <span class="text-slate-400 font-normal">(endpoint compatível com OpenAI /v1)</span>
            </label>
            <input
              id="settings-omniroute-url"
              type="text"
              placeholder="https://seu-omniroute.seudominio.com/v1"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 font-mono"
            />
          </div>

          <div>
            <label for="settings-omniroute-key" class="block text-xs font-semibold text-slate-200 mb-1">
              🔐 API Key do OmniRoute
            </label>
            <input
              id="settings-omniroute-key"
              type="password"
              placeholder="Deixe em branco para manter a chave já salva"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 font-mono"
            />
          </div>

          <div>
            <label for="settings-omniroute-model" class="block text-xs font-semibold text-slate-200 mb-1">
              🤖 Modelo de IA <span class="text-slate-400 font-normal">(padrão: gemini-2.5-flash)</span>
            </label>
            <input
              id="settings-omniroute-model"
              type="text"
              value="${modelName}"
              placeholder="gemini-2.5-flash"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 font-mono"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-white/10">
          <div>
            <label for="settings-github-token" class="block text-xs font-semibold text-slate-200 mb-1">
              🐙 GitHub Token (Opcional) <span class="text-slate-400 font-normal">(5.000 req/h)</span>
            </label>
            <input
              id="settings-github-token"
              type="password"
              placeholder="ghp_... (em branco mantém o atual)"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 font-mono"
            />
          </div>

          <div>
            <label for="settings-app-title" class="block text-xs font-semibold text-slate-200 mb-1">
              🏷️ Título do Catálogo
            </label>
            <input
              id="settings-app-title"
              type="text"
              value="${appTitle}"
              placeholder="GitVisão • Pega a Visão"
              class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
            />
          </div>
        </div>

        <p id="settings-error-msg" class="hidden text-xs text-rose-400 font-semibold"></p>

        <div class="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            id="settings-cancel-btn"
            type="button"
            class="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs sm:text-sm font-semibold text-slate-300 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            id="settings-submit-btn"
            type="submit"
            class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-sky-500/20 transition cursor-pointer"
          >
            💾 Salvar no Banco D1
          </button>
        </div>
      </form>
    </div>
  </div>

  <script>
    const ALL_CATEGORIES = [
      'Agentes & Automação IA',
      'SaaS & CRM Self-Hosted',
      'Infra, Gateways & Edge',
      'Apps & Produtividade',
      'Libs, SDKs & CLI Dev',
      'Outros'
    ];

    const TEMPLATE_LABELS = {
      'ai-agent-automation': '🤖 Agente IA & Automação',
      'self-hosted-saas': '🏢 SaaS & CRM Self-Hosted',
      'infra-gateway': '⚡ Infra, Gateway & Edge',
      'app-tool': '💻 App & Produtividade',
      'dev-lib-cli': '🛠️ Lib, SDK & CLI Dev'
    };

    let allRepos = [];
    let nextCursor = null;
    let hasMore = false;
    let totalFilteredCount = 0;
    let globalTotalCount = 0;
    let categoryCounts = {};
    const PAGE_LIMIT = 30;
    let isLoading = false;
    let activeCategory = '';
    let activeTemplate = '';
    let activeSort = 'recent';
    let searchQuery = '';
    let currentCheckedRepo = null;
    let forceRegenerateMode = false;
    let searchDebounceTimer = null;

    function escapeHtml(str) {
      return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function safeJsonArray(val) {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string' && val.trim()) {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    }

    function formatStarsPt(stars) {
      const n = Number(stars || 0);
      if (n >= 1000) {
        const formatted = (n / 1000).toFixed(1).replace('.', ',').replace(',0', '');
        return formatted + ' mil estrelas';
      }
      return n + (n === 1 ? ' estrela' : ' estrelas');
    }

    function formatDatePt(iso) {
      if (!iso) return 'N/D';
      if (/^\\d{2}\\/\\d{2}\\/\\d{4}$/.test(iso)) return iso;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return String(iso);
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return day + '/' + month + '/' + year;
    }

    function normalizeRepo(raw) {
      if (!raw) return null;
      return {
        id: raw.id || 0,
        repoKey: raw.repo_key || raw.repoKey || (raw.full_name ? raw.full_name.toLowerCase() : ''),
        fullName: raw.full_name || raw.fullName || raw.repo_key || '',
        owner: raw.owner || '',
        name: raw.name || '',
        repoUrl: raw.repo_url || raw.repoUrl || ('https://github.com/' + (raw.full_name || raw.repo_key || '')),
        description: raw.description || '',
        stars: Number(raw.stars || 0),
        forks: Number(raw.forks || 0),
        language: raw.language || 'Open Source',
        topics: safeJsonArray(raw.topics || raw.topics_json),
        lastCommitAt: raw.last_commit_at || raw.lastCommitAt || '',
        category: raw.category || 'Outros',
        templateType: raw.template_type || raw.templateType || 'app-tool',
        hookTitle: raw.hook_title || raw.hookTitle || '',
        introText: raw.intro_text || raw.introText || '',
        warningNote: raw.warning_note || raw.warningNote || '',
        features: safeJsonArray(raw.features || raw.features_json),
        scenarioTitle: raw.scenario_title || raw.scenarioTitle || '🧠 PENSE ASSIM:',
        scenarioIntro: raw.scenario_intro || raw.scenarioIntro || '',
        scenarioPrompt: raw.scenario_prompt || raw.scenarioPrompt || '',
        scenarioSteps: safeJsonArray(raw.scenarioSteps || raw.scenario_steps || raw.scenario_steps_json),
        scenarioOutro: raw.scenario_outro || raw.scenarioOutro || '',
        killerTitle: raw.killer_title || raw.killerTitle || '🤯 A parte mais interessante?',
        killerText: raw.killer_text || raw.killerText || '',
        summaryText: raw.summary_text || raw.summaryText || '',
        punchline: raw.punchline || '',
        whatsappText: raw.whatsapp_text || raw.whatsappText || '',
        createdAt: raw.created_at || raw.createdAt || '',
        updatedAt: raw.updated_at || raw.updatedAt || ''
      };
    }

    function showToast(message, type = 'success') {
      const container = document.getElementById('toast-container');
      const toast = document.createElement('div');
      const bg = type === 'error'
        ? 'bg-rose-600 text-white border-rose-400'
        : 'bg-emerald-500 text-slate-950 border-emerald-300';
      toast.className = 'px-4 py-2.5 rounded-xl border font-bold text-xs sm:text-sm shadow-xl transition-all ' + bg;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 250);
      }, 2800);
    }

    async function copyToClipboard(text, btnEl, labelAfter = '✅ Copiado!') {
      try {
        await navigator.clipboard.writeText(text);
        if (btnEl) {
          const original = btnEl.innerHTML;
          btnEl.innerHTML = labelAfter;
          setTimeout(() => { btnEl.innerHTML = original; }, 1800);
        }
        showToast('📲 Resumo "Pega a Visão" copiado para o WhatsApp!');
      } catch {
        showToast('Erro ao copiar automaticamente. Selecione o texto no modal.', 'error');
      }
    }

    async function loadHealth() {
      try {
        const res = await fetch('/api/health');
        if (!res.ok) return;
        const data = await res.json();
        const dot = document.getElementById('health-dot');
        const text = document.getElementById('health-text');
        const banner = document.getElementById('first-access-banner');
        const model = data.model || data.omnirouteModel || 'gemini-2.5-flash';
        const omni = Boolean(data.omnirouteConfigured ?? data.omniroute);
        const usingDefaultPassword = Boolean(data.usingDefaultPassword);

        dot.className = 'w-2 h-2 rounded-full ' + (omni ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400');
        text.textContent = (omni ? 'OmniRoute (' + model + ') + D1' : 'Smart Fallback (' + model + ') + D1');

        if (usingDefaultPassword || !omni) {
          banner.classList.remove('hidden');
        } else {
          banner.classList.add('hidden');
        }

        const titleFromApi = data.publicAppTitle || data.appTitle;
        if (titleFromApi) {
          document.title = titleFromApi;
          const headingEl = document.getElementById('app-title-heading');
          if (headingEl) headingEl.textContent = titleFromApi;
          const titleInput = document.getElementById('settings-app-title');
          if (titleInput && !titleInput.dataset.touched) titleInput.value = titleFromApi;
        }

        if (data.omnirouteBaseUrl && data.omnirouteBaseUrl !== '(configurado)') {
          const urlInput = document.getElementById('settings-omniroute-url');
          if (urlInput && !urlInput.dataset.touched) urlInput.value = data.omnirouteBaseUrl;
        }
        if (usingDefaultPassword) {
          const currentPassInput = document.getElementById('settings-current-password');
          if (currentPassInput && !currentPassInput.value) {
            currentPassInput.value = 'admin';
          }
          const genPassInput = document.getElementById('admin-password-input');
          if (genPassInput && !genPassInput.value) {
            genPassInput.value = 'admin';
          }
        }
        if (model) {
          const modelInput = document.getElementById('settings-omniroute-model');
          if (modelInput && !modelInput.dataset.touched) modelInput.value = model;
        }
      } catch {
        // Ignora silenciosamente
      }
    }

    async function fetchRepos(reset = false) {
      if (isLoading) return;
      isLoading = true;

      const loadingEl = document.getElementById('repos-loading');
      const loadMoreBtn = document.getElementById('load-more-btn');
      const loadMoreLoading = document.getElementById('load-more-loading');
      const allLoadedMsg = document.getElementById('all-loaded-msg');
      const emptyEl = document.getElementById('repos-empty');

      if (reset) {
        nextCursor = null;
        hasMore = false;
        allRepos = [];
        if (loadingEl) loadingEl.classList.remove('hidden');
        if (emptyEl) emptyEl.classList.add('hidden');
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
        if (loadMoreLoading) loadMoreLoading.classList.add('hidden');
        if (allLoadedMsg) allLoadedMsg.classList.add('hidden');
      } else {
        if (loadMoreLoading) loadMoreLoading.classList.remove('hidden');
        if (loadMoreBtn) {
          loadMoreBtn.disabled = true;
          loadMoreBtn.classList.add('opacity-70', 'cursor-not-allowed');
        }
      }

      try {
        const params = new URLSearchParams();
        params.set('limit', String(PAGE_LIMIT));
        const sortVal = activeSort === 'alpha' ? 'name' : activeSort;
        params.set('sort', sortVal);

        if (searchQuery.trim()) {
          params.set('q', searchQuery.trim());
        }
        if (activeCategory) {
          params.set('category', activeCategory);
        }
        if (activeTemplate) {
          params.set('template', activeTemplate);
        }
        if (!reset && nextCursor) {
          params.set('cursor', nextCursor);
        }

        const res = await fetch('/api/repos?' + params.toString());
        const data = await res.json();

        nextCursor = data.nextCursor || null;
        hasMore = Boolean(data.hasMore);
        totalFilteredCount = Number(data.total || 0);

        if (data.byCategory && typeof data.byCategory === 'object') {
          categoryCounts = data.byCategory;
        }

        if (!activeCategory && !activeTemplate && !searchQuery.trim()) {
          globalTotalCount = totalFilteredCount;
        }

        const rawList = data.items || data.repos || data.data || (Array.isArray(data) ? data : []);
        const newItems = rawList.map(normalizeRepo).filter(Boolean);

        if (reset) {
          allRepos = newItems;
        } else {
          allRepos = allRepos.concat(newItems);
        }

        // Atualiza contadores na tela
        const totalCountEl = document.getElementById('total-repos-count');
        if (totalCountEl) {
          totalCountEl.textContent = String(globalTotalCount || totalFilteredCount);
        }
        const displayedEl = document.getElementById('displayed-repos-count');
        if (displayedEl) {
          displayedEl.textContent = String(allRepos.length);
        }
        const filteredEl = document.getElementById('filtered-repos-count');
        if (filteredEl) {
          filteredEl.textContent = String(totalFilteredCount);
        }

        renderCategoryPills();
        renderRepoGrid();

        // Controla o botão de "Carregar Mais"
        if (hasMore && nextCursor) {
          if (loadMoreBtn) loadMoreBtn.classList.remove('hidden');
          if (allLoadedMsg) allLoadedMsg.classList.add('hidden');
        } else if (!hasMore && allRepos.length > 0) {
          if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
          if (allLoadedMsg) allLoadedMsg.classList.remove('hidden');
        } else {
          if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
          if (allLoadedMsg) allLoadedMsg.classList.add('hidden');
        }
      } catch (err) {
        console.error('Erro ao carregar repositórios:', err);
        showToast('Erro ao carregar repositórios.', 'error');
      } finally {
        isLoading = false;
        if (loadingEl) loadingEl.classList.add('hidden');
        if (loadMoreLoading) loadMoreLoading.classList.add('hidden');
        if (loadMoreBtn) {
          loadMoreBtn.disabled = false;
          loadMoreBtn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
      }
    }

    function renderCategoryPills() {
      const container = document.getElementById('category-pills');
      const counts = {};
      const hasBackendCounts = categoryCounts && Object.keys(categoryCounts).length > 0;

      for (const cat of ALL_CATEGORIES) {
        counts[cat] = hasBackendCounts ? (Number(categoryCounts[cat]) || 0) : 0;
      }
      if (!hasBackendCounts) {
        for (const r of allRepos) {
          counts[r.category] = (counts[r.category] || 0) + 1;
        }
      }

      const totalAll = globalTotalCount || totalFilteredCount || allRepos.length;

      const pills = [
        { label: 'Todas as Categorias', value: '', count: totalAll },
        ...ALL_CATEGORIES.map((c) => ({ label: c, value: c, count: counts[c] || 0 }))
      ];

      container.innerHTML = pills.map((p) => {
        const isActive = activeCategory === p.value;
        const cls = isActive
          ? 'bg-sky-500 text-slate-950 font-bold border-sky-400 shadow-md shadow-sky-500/20'
          : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 border-white/10';
        return '<button type="button" data-category="' + escapeHtml(p.value) + '" class="category-pill shrink-0 px-3.5 py-1.5 rounded-full text-xs border transition flex items-center gap-1.5 cursor-pointer ' + cls + '">' +
          '<span>' + escapeHtml(p.label) + '</span>' +
          '<span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono ' + (isActive ? 'bg-slate-950/25 text-slate-950' : 'bg-white/10 text-slate-300') + '">' + p.count + '</span>' +
        '</button>';
      }).join('');

      container.querySelectorAll('.category-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeCategory = btn.getAttribute('data-category') || '';
          fetchRepos(true);
        });
      });
    }

    function renderRepoGrid(highlightRepoKey = '') {
      const grid = document.getElementById('repos-grid');
      const emptyEl = document.getElementById('repos-empty');
      const list = allRepos;

      if (list.length === 0) {
        grid.innerHTML = '';
        emptyEl.classList.remove('hidden');
        return;
      }
      emptyEl.classList.add('hidden');

      grid.innerHTML = list.map((r) => {
        const isHighlighted = highlightRepoKey && r.repoKey === highlightRepoKey.toLowerCase();
        const borderCls = isHighlighted
          ? 'border-emerald-400 ring-2 ring-emerald-400/30'
          : 'border-white/10';
        const templateBadge = TEMPLATE_LABELS[r.templateType] || r.templateType;
        const topFeatures = (r.features || []).slice(0, 3);

        return '<article id="card-' + escapeHtml(r.repoKey.replace('/', '-')) + '" class="glass-panel card-hover rounded-2xl p-5 flex flex-col justify-between border ' + borderCls + '">' +
          '<div class="space-y-3">' +
            '<div class="flex flex-wrap items-center justify-between gap-1.5">' +
              '<span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/25">' + escapeHtml(r.category) + '</span>' +
              '<span class="px-2 py-0.5 rounded-md text-[11px] font-mono bg-white/5 text-slate-300 border border-white/10">' + escapeHtml(templateBadge) + '</span>' +
            '</div>' +

            '<div>' +
              '<div class="flex items-center justify-between gap-2">' +
                '<a href="' + escapeHtml(r.repoUrl) + '" target="_blank" rel="noopener noreferrer" class="font-mono text-sm font-bold text-sky-400 hover:underline truncate">' +
                  escapeHtml(r.fullName) +
                '</a>' +
                '<span class="text-xs font-mono text-amber-300 shrink-0">⭐ ' + escapeHtml(formatStarsPt(r.stars)) + '</span>' +
              '</div>' +
              '<div class="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-0.5">' +
                '<span>🕒 Commit: ' + escapeHtml(formatDatePt(r.lastCommitAt)) + '</span>' +
                (r.language ? '<span>• 💻 ' + escapeHtml(r.language) + '</span>' : '') +
              '</div>' +
            '</div>' +

            '<h3 class="text-sm sm:text-base font-extrabold text-white leading-snug">' +
              escapeHtml(r.hookTitle) +
            '</h3>' +

            '<p class="text-xs text-slate-300 leading-relaxed line-clamp-3">' +
              escapeHtml(r.introText) +
            '</p>' +

            '<ul class="space-y-1 pt-1 border-t border-white/5">' +
              topFeatures.map((f) => '<li class="text-xs text-slate-300 line-clamp-1">' + escapeHtml(f) + '</li>').join('') +
            '</ul>' +
          '</div>' +

          '<div class="pt-4 mt-4 border-t border-white/10 flex items-center gap-2">' +
            '<button type="button" data-action="view" data-repo="' + escapeHtml(r.repoKey) + '" class="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition cursor-pointer">' +
              '👁️ Ver Visão Completa' +
            '</button>' +
            '<button type="button" data-action="copy" data-repo="' + escapeHtml(r.repoKey) + '" class="py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition cursor-pointer">' +
              '📲 Copiar WhatsApp' +
            '</button>' +
            '<a href="' + escapeHtml(r.repoUrl) + '" target="_blank" rel="noopener noreferrer" class="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-white/10 text-xs transition" title="Abrir no GitHub">' +
              '🔗 GitHub' +
            '</a>' +
          '</div>' +
        '</article>';
      }).join('');

      grid.querySelectorAll('button[data-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-repo');
          const action = btn.getAttribute('data-action');
          const repo = allRepos.find((item) => item.repoKey === key);
          if (!repo) return;
          if (action === 'view') {
            openVisaoModal(repo);
          } else if (action === 'copy') {
            copyToClipboard(repo.whatsappText, btn);
          }
        });
      });
    }

    function openVisaoModal(repo) {
      currentCheckedRepo = repo;
      document.getElementById('modal-category-badge').textContent = repo.category;
      document.getElementById('modal-template-badge').textContent = TEMPLATE_LABELS[repo.templateType] || repo.templateType;
      document.getElementById('modal-repo-title').textContent = repo.fullName;
      document.getElementById('modal-hook-title').textContent = repo.hookTitle;
      document.getElementById('modal-intro-text').textContent = repo.introText;

      const warnBox = document.getElementById('modal-warning-box');
      if (repo.warningNote) {
        warnBox.textContent = repo.warningNote;
        warnBox.classList.remove('hidden');
      } else {
        warnBox.classList.add('hidden');
      }

      document.getElementById('modal-stars').textContent = '⭐ ' + formatStarsPt(repo.stars);
      document.getElementById('modal-commit').textContent = '🕒 Último commit em ' + formatDatePt(repo.lastCommitAt);
      document.getElementById('modal-language').textContent = '💻 ' + (repo.language || 'Open Source');

      document.getElementById('modal-features-list').innerHTML = (repo.features || [])
        .map((f) => '<li class="leading-relaxed">' + escapeHtml(f) + '</li>')
        .join('');

      document.getElementById('modal-scenario-title').textContent = repo.scenarioTitle || '🧠 PENSE ASSIM:';
      document.getElementById('modal-scenario-intro').textContent = repo.scenarioIntro || '';
      document.getElementById('modal-scenario-prompt').textContent = repo.scenarioPrompt || '';
      document.getElementById('modal-scenario-steps').innerHTML = (repo.scenarioSteps || [])
        .map((s) => '<li>' + escapeHtml(s) + '</li>')
        .join('');
      document.getElementById('modal-scenario-outro').textContent = repo.scenarioOutro || '';

      document.getElementById('modal-killer-title').textContent = repo.killerTitle || '🤯 A parte mais interessante?';
      document.getElementById('modal-killer-text').textContent = repo.killerText || '';
      document.getElementById('modal-summary-text').textContent = repo.summaryText || '';
      document.getElementById('modal-punchline').textContent = repo.punchline || '';
      document.getElementById('modal-whatsapp-text').textContent = repo.whatsappText || '';
      document.getElementById('modal-github-link').href = repo.repoUrl;

      const modal = document.getElementById('visao-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeVisaoModal() {
      const modal = document.getElementById('visao-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    // Eventos do Formulário de Verificação
    document.getElementById('check-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const inputEl = document.getElementById('repo-input');
      const rawRepo = inputEl.value.trim();
      if (!rawRepo) return;

      const btn = document.getElementById('check-submit-btn');
      const existsPanel = document.getElementById('check-exists-panel');
      const generatePanel = document.getElementById('check-generate-panel');
      const errEl = document.getElementById('generate-error-msg');
      errEl.classList.add('hidden');

      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Verificando...</span>';

      try {
        const res = await fetch('/api/check?repo=' + encodeURIComponent(rawRepo));
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'URL de repositório inválida.', 'error');
          existsPanel.classList.add('hidden');
          generatePanel.classList.add('hidden');
          return;
        }

        if (data.exists && (data.repo || data.record || data.item)) {
          const found = normalizeRepo(data.repo || data.record || data.item);
          currentCheckedRepo = found;
          forceRegenerateMode = false;

          document.getElementById('exists-repo-name').textContent = found.fullName;
          document.getElementById('exists-repo-template').textContent = TEMPLATE_LABELS[found.templateType] || found.templateType;
          document.getElementById('exists-repo-hook').textContent = found.hookTitle;
          document.getElementById('exists-repo-intro').textContent = found.introText;

          existsPanel.classList.remove('hidden');
          generatePanel.classList.add('hidden');
          renderRepoGrid(found.repoKey);
          showToast('✅ Repositório já cadastrado! Pronto para copiar.');
        } else {
          currentCheckedRepo = null;
          forceRegenerateMode = false;
          const targetLabel = (data.parsed && data.parsed.fullName) || data.fullName || data.repoKey || rawRepo;
          document.getElementById('generate-badge-status').textContent = '🆕 Repositório inédito no catálogo';
          document.getElementById('generate-repo-label').textContent = targetLabel;
          existsPanel.classList.add('hidden');
          generatePanel.classList.remove('hidden');
          document.getElementById('admin-password-input').focus();
        }
      } catch (err) {
        showToast('Falha ao consultar a API.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🔎 Verificar / Buscar</span>';
      }
    });

    document.getElementById('exists-copy-btn').addEventListener('click', (e) => {
      if (currentCheckedRepo) {
        copyToClipboard(currentCheckedRepo.whatsappText, e.currentTarget);
      }
    });

    document.getElementById('exists-view-btn').addEventListener('click', () => {
      if (currentCheckedRepo) {
        openVisaoModal(currentCheckedRepo);
      }
    });

    document.getElementById('exists-regenerate-toggle-btn').addEventListener('click', () => {
      if (!currentCheckedRepo) return;
      forceRegenerateMode = true;
      document.getElementById('generate-badge-status').textContent = '🔄 Regerar Resumo com IA (Admin)';
      document.getElementById('generate-repo-label').textContent = currentCheckedRepo.fullName;
      document.getElementById('check-generate-panel').classList.remove('hidden');
      document.getElementById('admin-password-input').focus();
    });

    document.getElementById('close-generate-panel').addEventListener('click', () => {
      document.getElementById('check-generate-panel').classList.add('hidden');
    });

    document.getElementById('generate-submit-btn').addEventListener('click', async () => {
      const rawRepo = document.getElementById('repo-input').value.trim() || (currentCheckedRepo && currentCheckedRepo.fullName) || '';
      const password = document.getElementById('admin-password-input').value;
      const templateChoice = document.getElementById('template-type-select').value;
      const errEl = document.getElementById('generate-error-msg');
      const btn = document.getElementById('generate-submit-btn');

      if (!rawRepo) {
        errEl.textContent = 'Informe a URL do repositório do GitHub.';
        errEl.classList.remove('hidden');
        return;
      }

      errEl.classList.add('hidden');
      btn.disabled = true;
      btn.innerHTML = '⏳ Analisando README & Gerando Visão...';

      try {
        const payload = {
          repo: rawRepo,
          repoUrl: rawRepo,
          password,
          adminPassword: password,
          templateType: templateChoice === 'auto' ? undefined : templateChoice,
          force: forceRegenerateMode,
          forceRegenerate: forceRegenerateMode
        };

        const res = await fetch('/api/repos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': password,
            'Authorization': password ? ('Bearer ' + password) : ''
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          errEl.textContent = data.error || 'Erro ao gerar resumo (verifique a senha de Admin).';
          errEl.classList.remove('hidden');
          showToast(errEl.textContent, 'error');
          return;
        }

        const saved = normalizeRepo(data.repo || data.record || data.item || data);
        await fetchRepos(true);
        document.getElementById('check-generate-panel').classList.add('hidden');

        if (saved && saved.repoKey) {
          currentCheckedRepo = saved;
          document.getElementById('exists-repo-name').textContent = saved.fullName;
          document.getElementById('exists-repo-template').textContent = TEMPLATE_LABELS[saved.templateType] || saved.templateType;
          document.getElementById('exists-repo-hook').textContent = saved.hookTitle;
          document.getElementById('exists-repo-intro').textContent = saved.introText;
          document.getElementById('check-exists-panel').classList.remove('hidden');
          renderRepoGrid(saved.repoKey);
          openVisaoModal(saved);
        }
        showToast('✨ Resumo "Pega a Visão" salvo no D1 com sucesso!');
      } catch (err) {
        errEl.textContent = 'Falha de comunicação com o Worker.';
        errEl.classList.remove('hidden');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '✨ Gerar Resumo Pega a Visão';
      }
    });

    // Filtros e Busca
    document.getElementById('search-input').addEventListener('input', (e) => {
      searchQuery = e.target.value || '';
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        fetchRepos(true);
      }, 300);
    });

    document.getElementById('filter-template-select').addEventListener('change', (e) => {
      activeTemplate = e.target.value || '';
      fetchRepos(true);
    });

    document.getElementById('sort-select').addEventListener('change', (e) => {
      activeSort = e.target.value || 'recent';
      fetchRepos(true);
    });

    // Botão de Carregar Mais
    const loadMoreBtnEl = document.getElementById('load-more-btn');
    if (loadMoreBtnEl) {
      loadMoreBtnEl.addEventListener('click', () => {
        fetchRepos(false);
      });
    }

    // Modal
    document.getElementById('modal-close-btn').addEventListener('click', closeVisaoModal);
    document.getElementById('visao-modal').addEventListener('click', (e) => {
      if (e.target.id === 'visao-modal') closeVisaoModal();
    });
    document.getElementById('modal-copy-whatsapp-btn').addEventListener('click', (e) => {
      if (currentCheckedRepo) {
        copyToClipboard(currentCheckedRepo.whatsappText, e.currentTarget);
      }
    });
    document.getElementById('modal-regenerate-btn').addEventListener('click', () => {
      if (!currentCheckedRepo) return;
      closeVisaoModal();
      document.getElementById('repo-input').value = currentCheckedRepo.repoUrl;
      forceRegenerateMode = true;
      document.getElementById('generate-badge-status').textContent = '🔄 Regerar Resumo com IA (Admin)';
      document.getElementById('generate-repo-label').textContent = currentCheckedRepo.fullName;
      document.getElementById('check-generate-panel').classList.remove('hidden');
      document.getElementById('admin-password-input').focus();
    });

    // Modal de Configurações (Zero CLI / Persistência D1)
    async function openSettingsModal() {
      const errEl = document.getElementById('settings-error-msg');
      errEl.classList.add('hidden');

      try {
        const candidatePass = document.getElementById('settings-current-password').value.trim() || 'admin';
        const res = await fetch('/api/settings', {
          headers: {
            'X-Admin-Password': candidatePass
          }
        });
        if (res.ok) {
          const data = await res.json();
          const cfg = data.settings || data;
          if (cfg.omnirouteBaseUrl !== undefined) {
            document.getElementById('settings-omniroute-url').value = cfg.omnirouteBaseUrl || '';
          }
          if (cfg.omnirouteModel) {
            document.getElementById('settings-omniroute-model').value = cfg.omnirouteModel;
          }
          if (cfg.publicAppTitle || cfg.appTitle) {
            document.getElementById('settings-app-title').value = cfg.publicAppTitle || cfg.appTitle;
          }
        }
      } catch {
        // Usa valores já carregados via /api/health
      }

      const modal = document.getElementById('settings-modal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.getElementById('settings-current-password').focus();
    }

    function closeSettingsModal() {
      const modal = document.getElementById('settings-modal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    document.getElementById('open-settings-btn').addEventListener('click', openSettingsModal);
    document.getElementById('banner-open-settings-btn').addEventListener('click', openSettingsModal);
    document.getElementById('banner-settings-cta-btn').addEventListener('click', openSettingsModal);
    document.getElementById('settings-close-btn').addEventListener('click', closeSettingsModal);
    document.getElementById('settings-cancel-btn').addEventListener('click', closeSettingsModal);
    document.getElementById('settings-modal').addEventListener('click', (e) => {
      if (e.target.id === 'settings-modal') closeSettingsModal();
    });

    document.getElementById('settings-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('settings-current-password').value.trim();
      const newPassword = document.getElementById('settings-new-password').value.trim();
      const omnirouteBaseUrl = document.getElementById('settings-omniroute-url').value.trim();
      const omnirouteApiKey = document.getElementById('settings-omniroute-key').value.trim();
      const omnirouteModel = document.getElementById('settings-omniroute-model').value.trim() || 'gemini-2.5-flash';
      const githubToken = document.getElementById('settings-github-token').value.trim();
      const publicAppTitle = document.getElementById('settings-app-title').value.trim();

      const errEl = document.getElementById('settings-error-msg');
      const submitBtn = document.getElementById('settings-submit-btn');
      errEl.classList.add('hidden');

      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Salvando no Banco D1...';

      try {
        const payload = {
          password: currentPassword,
          currentPassword,
          newPassword: newPassword || undefined,
          omnirouteBaseUrl,
          omnirouteApiKey: omnirouteApiKey || undefined,
          omnirouteModel,
          githubToken: githubToken || undefined,
          publicAppTitle: publicAppTitle || undefined
        };

        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': currentPassword,
            'Authorization': currentPassword ? ('Bearer ' + currentPassword) : ''
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          errEl.textContent = data.error || 'Erro ao salvar configurações (verifique a Senha Atual de Admin).';
          errEl.classList.remove('hidden');
          showToast(errEl.textContent, 'error');
          return;
        }

        document.getElementById('settings-current-password').value = newPassword || currentPassword;
        document.getElementById('settings-new-password').value = '';
        document.getElementById('settings-omniroute-key').value = '';
        document.getElementById('settings-github-token').value = '';
        document.getElementById('admin-password-input').value = newPassword || currentPassword;

        await loadHealth();
        closeSettingsModal();
        showToast('💾 Configurações salvas no Banco D1 com sucesso!');
      } catch {
        errEl.textContent = 'Falha de comunicação ao salvar configurações no Worker.';
        errEl.classList.remove('hidden');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Salvar no Banco D1';
      }
    });

    // Inicialização
    loadHealth();
    fetchRepos(true);
  </script>
</body>
</html>`;
}
