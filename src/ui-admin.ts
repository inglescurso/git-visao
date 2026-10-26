// Painel /admin: configuração, inclusão manual, raspagem do WhatsApp (Evolution API) e fila de revisão.
// (Atenção: o script embutido não pode usar `${...}` nem barras invertidas.)

function escapeHtmlServer(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderAdminHtml(defaultModel?: string): string {
  return ADMIN_TEMPLATE.split('__MODEL__').join(escapeHtmlServer(defaultModel || 'gemini-2.5-flash'));
}

const ADMIN_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>GitVisão • Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background:#07090e; color:#e6edf3; font-family: Inter, system-ui, sans-serif; }
    .panel { background: rgba(19,25,34,.9); border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:20px; }
    .inp { width:100%; padding:10px 14px; border-radius:12px; background:#020617; border:1px solid rgba(255,255,255,.15); color:#fff; font-size:14px; }
    .inp:focus { outline:none; border-color:#38bdf8; }
    .btn { padding:9px 16px; border-radius:12px; font-weight:700; font-size:13px; cursor:pointer; background:linear-gradient(90deg,#0ea5e9,#10b981); color:#020617; }
    .btn:disabled { opacity:.6; cursor:not-allowed; }
    .btn2 { padding:8px 14px; border-radius:12px; font-weight:600; font-size:12px; cursor:pointer; background:rgba(255,255,255,.1); color:#fff; }
    .lbl { display:block; font-size:12px; font-weight:600; color:#cbd5e1; margin-bottom:4px; }
    .tab { padding:8px 14px; border-radius:999px; font-size:13px; font-weight:600; cursor:pointer; border:1px solid rgba(255,255,255,.1); color:#cbd5e1; }
    .tab.on { background:#0ea5e9; color:#020617; border-color:#38bdf8; }
  </style>
</head>
<body class="min-h-screen">
  <div id="toast-container" class="fixed bottom-5 right-5 z-50 flex flex-col gap-2"></div>

  <div id="login-view" class="min-h-screen flex items-center justify-center p-4">
    <form id="login-form" class="panel w-full max-w-sm space-y-4">
      <h1 class="text-lg font-bold">🔐 GitVisão • Admin</h1>
      <div>
        <label class="lbl" for="login-password">Senha de administrador</label>
        <input id="login-password" type="password" required autocomplete="current-password" class="inp font-mono" />
      </div>
      <p id="login-error" class="hidden text-xs text-rose-400 font-semibold"></p>
      <button class="btn w-full" type="submit">Entrar</button>
      <a href="/" class="block text-center text-xs text-slate-400 underline">← Voltar ao catálogo</a>
    </form>
  </div>

  <div id="app-view" class="hidden max-w-5xl mx-auto px-4 py-6 space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-lg font-bold">⚙️ GitVisão • Administração</h1>
      <div class="flex items-center gap-3 text-xs">
        <a href="/" class="text-slate-400 underline">Ver catálogo</a>
        <button id="logout-btn" class="btn2" type="button">Sair</button>
      </div>
    </header>

    <div id="default-pass-warning" class="hidden p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-sm text-rose-200">
      ⚠️ Este painel ainda usa a senha padrão. Troque agora na aba Configurações.
    </div>

    <div class="flex flex-wrap gap-2" id="tabs">
      <button class="tab on" data-tab="queue" type="button">📥 Fila de revisão</button>
      <button class="tab" data-tab="scrape" type="button">📡 Raspagem (WhatsApp)</button>
      <button class="tab" data-tab="add" type="button">➕ Incluir repositório</button>
      <button class="tab" data-tab="settings" type="button">🔧 Configurações</button>
    </div>

    <!-- Fila -->
    <section id="tab-queue" class="panel space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-bold">Fila de revisão</h2>
          <p class="text-xs text-slate-400">Consultas de visitantes, repositórios sem licença aberta (em espera) e erros da raspagem.</p>
        </div>
        <div class="flex flex-wrap gap-2" id="queue-filters"></div>
      </div>
      <div id="queue-list" class="space-y-2"></div>
    </section>

    <!-- Raspagem -->
    <section id="tab-scrape" class="hidden space-y-5">
      <div class="panel space-y-4">
        <h2 class="font-bold">Evolution API</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label class="lbl" for="ev-url">URL da Evolution</label><input id="ev-url" class="inp font-mono" placeholder="https://sua-evolution.exemplo.com" /></div>
          <div><label class="lbl" for="ev-key">Chave (apikey)</label><input id="ev-key" type="password" class="inp font-mono" placeholder="Em branco mantém a atual" autocomplete="off" /><p id="ev-key-hint" class="text-[11px] text-slate-500 mt-1"></p></div>
          <div><label class="lbl" for="ev-instance">Instância</label><input id="ev-instance" class="inp font-mono" placeholder="nome-da-instancia" /></div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><label class="lbl" for="ev-units">Orçamento por execução</label><input id="ev-units" type="number" min="1" max="40" class="inp" /></div>
          <div><label class="lbl" for="ev-pages">Páginas por execução</label><input id="ev-pages" type="number" min="1" max="20" class="inp" /></div>
          <div><label class="lbl" for="ev-size">Mensagens por página</label><input id="ev-size" type="number" min="20" max="500" class="inp" /></div>
          <div><label class="lbl" for="ev-lookback">Dias na 1ª leitura</label><input id="ev-lookback" type="number" min="1" max="365" class="inp" /></div>
        </div>
        <label class="flex items-center gap-2 text-sm"><input id="ev-enabled" type="checkbox" /> Ativar leitura automática (cron a cada 30 minutos)</label>
        <div class="flex flex-wrap gap-2">
          <button id="ev-save" class="btn" type="button">💾 Salvar</button>
          <button id="ev-groups" class="btn2" type="button">📋 Carregar grupos</button>
        </div>
      </div>

      <div class="panel space-y-3">
        <h2 class="font-bold">Grupos monitorados</h2>
        <div id="groups-box" class="space-y-1.5 text-sm"></div>
        <p class="text-xs text-slate-500">Marque os grupos e clique em Salvar. A lista de grupos pode levar ~10 s para carregar.</p>
      </div>

      <div class="panel space-y-3">
        <h2 class="font-bold">Execução</h2>
        <div class="flex flex-wrap gap-2">
          <button id="run-now" class="btn" type="button">▶️ Rodar agora</button>
          <button id="run-full" class="btn2" type="button">🗂️ Varrer histórico completo</button>
        </div>
        <div id="last-run" class="text-sm text-slate-300 space-y-1"></div>
      </div>
    </section>

    <!-- Incluir -->
    <section id="tab-add" class="hidden panel space-y-4">
      <h2 class="font-bold">Incluir repositório manualmente</h2>
      <p class="text-xs text-slate-400">Gera o resumo com IA e grava no catálogo. É a única porta de entrada manual.</p>
      <form id="add-form" class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div class="sm:col-span-2"><label class="lbl" for="add-repo">Link ou owner/repo</label><input id="add-repo" required class="inp font-mono" placeholder="https://github.com/owner/repo" /></div>
        <div>
          <label class="lbl" for="add-template">Template</label>
          <select id="add-template" class="inp">
            <option value="">🤖 Automático</option>
            <option value="ai-agent-automation">Agente IA &amp; Automação</option>
            <option value="self-hosted-saas">SaaS &amp; CRM Self-Hosted</option>
            <option value="infra-gateway">Infra, Gateway &amp; Edge</option>
            <option value="app-tool">App &amp; Ferramenta</option>
            <option value="dev-lib-cli">Lib, SDK &amp; CLI</option>
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm sm:col-span-2"><input id="add-force" type="checkbox" /> Regerar se já existir</label>
        <button id="add-btn" class="btn" type="submit">✨ Gerar e salvar</button>
      </form>
      <p id="add-result" class="text-sm"></p>
      <hr class="border-white/10" />
      <h3 class="font-bold text-sm">Remover do catálogo</h3>
      <form id="del-form" class="flex gap-3">
        <input id="del-repo" required class="inp font-mono" placeholder="owner/repo" />
        <button class="btn2" type="submit" style="background:#be123c">Remover</button>
      </form>
    </section>

    <!-- Configurações -->
    <section id="tab-settings" class="hidden panel space-y-4">
      <h2 class="font-bold">Configurações (salvas no banco D1)</h2>
      <form id="settings-form" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="sm:col-span-2"><label class="lbl" for="st-url">URL do OmniRoute (endpoint /v1 compatível com OpenAI)</label><input id="st-url" class="inp font-mono" placeholder="https://seu-omniroute.exemplo.com/v1" /></div>
          <div><label class="lbl" for="st-key">API Key do OmniRoute</label><input id="st-key" type="password" class="inp font-mono" autocomplete="off" placeholder="Em branco mantém a atual" /><p id="st-key-hint" class="text-[11px] text-slate-500 mt-1"></p></div>
          <div><label class="lbl" for="st-model">Modelo de IA</label><input id="st-model" class="inp font-mono" value="__MODEL__" /></div>
          <div><label class="lbl" for="st-gh">GitHub Token (opcional)</label><input id="st-gh" type="password" class="inp font-mono" autocomplete="off" placeholder="Em branco mantém o atual" /><p id="st-gh-hint" class="text-[11px] text-slate-500 mt-1"></p></div>
          <div><label class="lbl" for="st-title">Título do catálogo</label><input id="st-title" class="inp" /></div>
          <div class="sm:col-span-2"><label class="lbl" for="st-newpass">Nova senha de admin (opcional)</label><input id="st-newpass" type="password" class="inp font-mono" autocomplete="new-password" placeholder="Em branco mantém a atual" /></div>
        </div>
        <button id="st-save" class="btn" type="submit">💾 Salvar configurações</button>
      </form>
    </section>
  </div>

  <script>
    var TOKEN_KEY = 'gitvisao_admin_token';
    var statusCache = null, queueStatus = 'requested', groupsLoaded = null;

    function $(id) { return document.getElementById(id); }
    function esc(s) {
      return String(s == null ? '' : s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;').split("'").join('&#39;');
    }
    function getToken() { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
    function setToken(t) { try { if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} }
    function toast(msg, type) {
      var el = document.createElement('div');
      el.className = 'px-4 py-2.5 rounded-xl border font-bold text-xs shadow-xl ' + (type === 'error' ? 'bg-rose-600 text-white border-rose-400' : 'bg-emerald-500 text-slate-950 border-emerald-300');
      el.textContent = msg;
      $('toast-container').appendChild(el);
      setTimeout(function () { el.remove(); }, 3500);
    }
    function api(path, method, body) {
      var opts = { method: method || 'GET', headers: { 'X-Admin-Password': getToken() } };
      if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
      return fetch(path, opts).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (res.status === 401) { setToken(''); showLogin(); throw new Error('Sessão expirada. Entre novamente.'); }
          if (!res.ok || data.ok === false) throw new Error(data.error || data.message || ('Erro ' + res.status));
          return data;
        });
      });
    }
    function busy(btn, on, label) { if (!btn) return; btn.disabled = on; if (label) btn.textContent = label; }

    function showLogin() { $('app-view').classList.add('hidden'); $('login-view').classList.remove('hidden'); }
    function showApp() { $('login-view').classList.add('hidden'); $('app-view').classList.remove('hidden'); loadStatus(); }

    $('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var pw = $('login-password').value;
      fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) })
        .then(function (res) { if (!res.ok) throw new Error('Senha incorreta.'); setToken(pw); $('login-password').value = ''; $('login-error').classList.add('hidden'); showApp(); })
        .catch(function (err) { $('login-error').textContent = err.message; $('login-error').classList.remove('hidden'); });
    });
    $('logout-btn').addEventListener('click', function () { setToken(''); showLogin(); });

    document.querySelectorAll('#tabs .tab').forEach(function (t) {
      t.addEventListener('click', function () {
        document.querySelectorAll('#tabs .tab').forEach(function (x) { x.classList.remove('on'); });
        t.classList.add('on');
        ['queue', 'scrape', 'add', 'settings'].forEach(function (n) { $('tab-' + n).classList.toggle('hidden', n !== t.getAttribute('data-tab')); });
      });
    });

    function loadStatus() {
      return api('/api/admin/status').then(function (d) {
        statusCache = d;
        $('default-pass-warning').classList.toggle('hidden', !d.settings.usingDefaultPassword);
        var ing = d.ingest;
        $('ev-url').value = ing.baseUrl || ''; $('ev-instance').value = ing.instance || '';
        $('ev-units').value = ing.maxUnitsPerRun; $('ev-pages').value = ing.maxPagesPerRun;
        $('ev-size').value = ing.pageSize; $('ev-lookback').value = ing.lookbackDays;
        $('ev-enabled').checked = !!ing.enabled;
        $('ev-key-hint').textContent = ing.hasApiKey ? 'Chave salva: ' + ing.apiKeyMasked : 'Nenhuma chave salva.';
        var s = d.settings;
        $('st-url').value = s.omnirouteBaseUrl || ''; $('st-model').value = s.omnirouteModel || $('st-model').value;
        $('st-title').value = s.publicAppTitle || '';
        $('st-key-hint').textContent = s.hasOmnirouteApiKey ? 'Chave salva: ' + s.omnirouteApiKeyMasked : 'Nenhuma chave salva.';
        $('st-gh-hint').textContent = s.hasGithubToken ? 'Token salvo: ' + s.githubTokenMasked : 'Nenhum token salvo.';
        renderGroups(ing.groups || [], null);
        renderLastRun(d.lastRun);
        renderQueueFilters(d.counts, d.catalogTotal);
        loadQueue();
      }).catch(function (err) { toast(err.message, 'error'); });
    }

    var STATUS_LABEL = { requested: '👀 Consultados', pending: '⏳ Em espera', error: '⚠️ Erros', ignored: '🚫 Ignorados', added: '✅ Adicionados' };
    function renderQueueFilters(counts, total) {
      $('queue-filters').innerHTML = ['requested', 'pending', 'error', 'ignored', 'added'].map(function (k) {
        return '<button type="button" data-st="' + k + '" class="tab ' + (queueStatus === k ? 'on' : '') + '">' + STATUS_LABEL[k] + ' (' + (counts[k] || 0) + ')</button>';
      }).join('') + '<span class="text-xs text-slate-500 self-center">Catálogo: ' + total + '</span>';
      $('queue-filters').querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () { queueStatus = b.getAttribute('data-st'); renderQueueFilters(counts, total); loadQueue(); });
      });
    }

    function loadQueue() {
      return api('/api/admin/ingest/items?status=' + queueStatus).then(function (d) {
        var box = $('queue-list');
        if (!d.items.length) { box.innerHTML = '<p class="text-sm text-slate-500">Nada por aqui.</p>'; return; }
        box.innerHTML = d.items.map(function (it) {
          var canApprove = it.status !== 'added';
          return '<div class="p-3 rounded-xl bg-slate-900/70 border border-white/10 flex flex-wrap items-center justify-between gap-3">' +
            '<div class="min-w-0"><a class="font-mono text-sm font-bold text-sky-400 underline" target="_blank" rel="noopener noreferrer" href="https://github.com/' + esc(it.full_name) + '">' + esc(it.full_name) + '</a>' +
            ' <span class="text-xs text-slate-400">' + (it.license_spdx ? esc(it.license_spdx) + ' • ' : '') + (it.stars ? '⭐ ' + it.stars + ' • ' : '') + esc(it.source || '') + '</span>' +
            '<p class="text-xs text-slate-400">' + esc(it.reason || '') + '</p></div>' +
            '<div class="flex gap-2 shrink-0">' +
            (canApprove ? '<button class="btn" data-act="approve" data-key="' + esc(it.repo_key) + '" type="button">✅ Incluir</button>' : '') +
            (it.status === 'error' ? '<button class="btn2" data-act="retry" data-key="' + esc(it.repo_key) + '" type="button">🔁 Tentar de novo</button>' : '') +
            (it.status !== 'ignored' && it.status !== 'added' ? '<button class="btn2" data-act="dismiss" data-key="' + esc(it.repo_key) + '" type="button">🚫 Dispensar</button>' : '') +
            '</div></div>';
        }).join('');
        box.querySelectorAll('button[data-act]').forEach(function (b) {
          b.addEventListener('click', function () {
            var act = b.getAttribute('data-act');
            busy(b, true, '⏳...');
            api('/api/admin/ingest/review', 'POST', { repoKey: b.getAttribute('data-key'), action: act })
              .then(function (r) { toast(r.message || 'Feito.'); return loadStatus(); })
              .catch(function (err) { toast(err.message, 'error'); busy(b, false); });
          });
        });
      }).catch(function (err) { toast(err.message, 'error'); });
    }

    function renderGroups(saved, available) {
      var map = {};
      (available || []).forEach(function (g) { map[g.jid] = { jid: g.jid, name: g.name, enabled: false }; });
      saved.forEach(function (g) { map[g.jid] = { jid: g.jid, name: g.name, enabled: g.enabled }; });
      var list = Object.keys(map).map(function (k) { return map[k]; });
      groupsLoaded = list;
      $('groups-box').innerHTML = list.length ? list.map(function (g, i) {
        return '<label class="flex items-center gap-2"><input type="checkbox" data-i="' + i + '" ' + (g.enabled ? 'checked' : '') + ' /> ' + esc(g.name) + '</label>';
      }).join('') : '<p class="text-slate-500">Nenhum grupo selecionado. Salve a conexão e clique em "Carregar grupos".</p>';
    }

    function renderLastRun(r) {
      if (!r) { $('last-run').textContent = 'Nenhuma execução registrada ainda.'; return; }
      var lines = ['Última execução (' + r.trigger + ') em ' + new Date(r.startedAt).toLocaleString('pt-BR')];
      if (r.skipped) lines.push('Pulada: ' + r.skipped);
      if (r.fatalError) lines.push('Erro: ' + r.fatalError);
      lines.push('Mensagens lidas: ' + r.messagesScanned + ' • Links: ' + r.candidates + ' • Adicionados: ' + r.added + ' • Em espera: ' + r.pending + ' • Ignorados: ' + r.ignored + ' • Erros: ' + r.errors + ' • Já conhecidos: ' + r.alreadyKnown);
      if (r.truncated) lines.push('Parou pelo orçamento; continua na próxima execução.');
      if (r.gap) lines.push('Atenção: havia mensagens antigas fora da janela lida. Use "Varrer histórico completo".');
      if (r.rateLimited) lines.push('Limite da API do GitHub atingido; configure um token em Configurações.');
      $('last-run').innerHTML = lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('');
    }

    function collectGroups() {
      var out = [];
      document.querySelectorAll('#groups-box input[type=checkbox]').forEach(function (c) {
        var g = groupsLoaded[Number(c.getAttribute('data-i'))];
        if (g) out.push({ jid: g.jid, name: g.name, enabled: c.checked });
      });
      return out.filter(function (g) { return g.enabled; });
    }

    $('ev-save').addEventListener('click', function () {
      var btn = $('ev-save'); busy(btn, true);
      var payload = {
        enabled: $('ev-enabled').checked, baseUrl: $('ev-url').value.trim(), instance: $('ev-instance').value.trim(),
        maxUnitsPerRun: Number($('ev-units').value), maxPagesPerRun: Number($('ev-pages').value),
        pageSize: Number($('ev-size').value), lookbackDays: Number($('ev-lookback').value), groups: collectGroups()
      };
      var k = $('ev-key').value.trim(); if (k) payload.apiKey = k;
      api('/api/admin/ingest/config', 'POST', payload).then(function () { $('ev-key').value = ''; toast('Configuração da raspagem salva.'); return loadStatus(); })
        .catch(function (err) { toast(err.message, 'error'); }).then(function () { busy(btn, false); });
    });

    $('ev-groups').addEventListener('click', function () {
      var btn = $('ev-groups'); busy(btn, true, '⏳ Carregando...');
      api('/api/admin/ingest/groups', 'POST', {}).then(function (d) {
        renderGroups((statusCache && statusCache.ingest.groups) || [], d.groups);
        toast(d.groups.length + ' grupos encontrados.');
      }).catch(function (err) { toast(err.message, 'error'); }).then(function () { busy(btn, false, '📋 Carregar grupos'); });
    });

    function runIngest(full, btn, label) {
      busy(btn, true, '⏳ Executando...');
      api('/api/admin/ingest/run', 'POST', { fullBackfill: full }).then(function (d) {
        renderLastRun(d.summary); toast('Execução concluída.'); return loadStatus();
      }).catch(function (err) { toast(err.message, 'error'); }).then(function () { busy(btn, false, label); });
    }
    $('run-now').addEventListener('click', function () { runIngest(false, $('run-now'), '▶️ Rodar agora'); });
    $('run-full').addEventListener('click', function () {
      if (confirm('Ler todo o histórico do grupo pode levar várias execuções e consome a API do GitHub. Continuar?')) runIngest(true, $('run-full'), '🗂️ Varrer histórico completo');
    });

    $('add-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('add-btn'); busy(btn, true, '⏳ Gerando...');
      var body = { repo: $('add-repo').value.trim(), force: $('add-force').checked };
      if ($('add-template').value) body.templateType = $('add-template').value;
      api('/api/repos', 'POST', body).then(function (d) {
        var r = d.repo || {};
        $('add-result').textContent = (d.cached ? 'Já estava no catálogo: ' : 'Incluído: ') + (r.fullName || r.full_name || body.repo);
        $('add-repo').value = ''; return loadStatus();
      }).catch(function (err) { $('add-result').textContent = err.message; toast(err.message, 'error'); })
        .then(function () { busy(btn, false, '✨ Gerar e salvar'); });
    });

    $('del-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var key = $('del-repo').value.trim().toLowerCase();
      var parts = key.split('/');
      if (parts.length !== 2 || !parts[0] || !parts[1]) { toast('Use o formato owner/repo.', 'error'); return; }
      if (!confirm('Remover ' + key + ' do catálogo?')) return;
      api('/api/repos/' + encodeURIComponent(parts[0]) + '/' + encodeURIComponent(parts[1]), 'DELETE')
        .then(function () { toast('Removido.'); $('del-repo').value = ''; return loadStatus(); })
        .catch(function (err) { toast(err.message, 'error'); });
    });

    $('settings-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('st-save'); busy(btn, true);
      var body = { password: getToken(), omnirouteBaseUrl: $('st-url').value.trim(), omnirouteModel: $('st-model').value.trim(), publicAppTitle: $('st-title').value.trim() };
      if ($('st-key').value.trim()) body.omnirouteApiKey = $('st-key').value.trim();
      if ($('st-gh').value.trim()) body.githubToken = $('st-gh').value.trim();
      var np = $('st-newpass').value.trim(); if (np) body.newPassword = np;
      api('/api/settings', 'POST', body).then(function () {
        if (np) setToken(np);
        ['st-key', 'st-gh', 'st-newpass'].forEach(function (id) { $(id).value = ''; });
        toast('Configurações salvas.'); return loadStatus();
      }).catch(function (err) { toast(err.message, 'error'); }).then(function () { busy(btn, false); });
    });

    if (getToken()) showApp(); else showLogin();
  </script>
</body>
</html>`;
