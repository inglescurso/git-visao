# Passagem de bastão — GitVisão ("Pega a Visão")

> Documento público: **não escreva aqui** senhas, chaves, IDs de conta, e-mails, domínios pessoais, JIDs de grupos ou nomes de instâncias. Esses valores ficam só no painel `/admin` (banco D1) e no painel da Cloudflare.

## 1. O que é

Catálogo de repositórios GitHub open source, com resumo em formato de WhatsApp gerado por IA. Roda como Cloudflare Worker (+ D1, com espelho/backup em KV).

- **Home pública (`/`)**: só consulta. Busca, filtros (licença, custo, instalação, categoria), detalhe do repositório, botão de copiar o texto de WhatsApp e o campo "consultar repositório", que apenas diz se existe ou não no catálogo.
- **`/admin`**: toda a gestão — configurações, inclusão manual, raspagem do WhatsApp e fila de revisão.
- Visitantes **não geram resumos** nem gastam IA. Se alguém consulta um repositório que não está no catálogo, o pedido é guardado na fila do admin (status `requested`) para ser aprovado ou dispensado.

## 2. Arquitetura

| Arquivo | Papel |
|---|---|
| `src/index.ts` | Rotas HTTP e handler `scheduled` (cron) |
| `src/ui-public.ts` / `src/ui-admin.ts` | HTML das duas páginas |
| `src/db.ts` | D1/KV: catálogo, `app_settings`, backup e restauração |
| `src/github.ts` | Metadados, classificação de licença (`classifyLicense`) e `probeGitHubRepo` |
| `src/ai.ts` | Resumo via OmniRoute (endpoint compatível com OpenAI) com fallback local |
| `src/evolution.ts` | Cliente da Evolution API (grupos e mensagens) e extração de links do GitHub |
| `src/ingest.ts` | Raspagem: cursor, orçamento por execução, trava, revisão manual |
| `src/ingest-db.ts` | Config, estado, trava e `ingest_log` da raspagem |
| `src/ingest-deps.ts` | Dependências reais da raspagem (rede, IA, D1) |

Variáveis em `wrangler.toml` são só valores iniciais; o que for salvo no `/admin` fica no D1 (e KV) e tem precedência, então sobrevive a deploys e ao "Sync fork". `keep_vars = true` preserva variáveis definidas no painel da Cloudflare.

## 3. Rotas

Públicas: `GET /`, `GET /api/health` (só `ok` e título), `GET /api/repos`, `GET /api/check?repo=`.

Admin (senha em `X-Admin-Password`, `X-API-Key` ou `Authorization: Bearer`; no corpo JSON só em `/api/settings` e `/api/auth/verify`; **nunca na URL**):
`POST /api/auth/verify`, `GET|POST /api/settings`, `POST /api/repos` (inclusão manual), `DELETE /api/repos/:owner/:name`, `GET /api/admin/status`, `POST /api/admin/ingest/config`, `POST /api/admin/ingest/groups`, `POST /api/admin/ingest/run`, `GET /api/admin/ingest/items?status=`, `POST /api/admin/ingest/review`.

Novos itens entram **somente** por `/admin` (manual) ou pela raspagem configurada lá. Webhooks de bots e Telegram foram removidos.

## 4. Raspagem do WhatsApp (Evolution API)

- Configurada no `/admin` → aba "Raspagem": URL, chave e instância da Evolution, grupos monitorados, limites e liga/desliga.
- O cron (`*/30 * * * *`, definido em `wrangler.toml`) lê as mensagens novas de cada grupo marcado (paginação, da mais nova para a mais antiga, com cursor por grupo), extrai links `github.com/owner/repo` e decide:
  - já no catálogo → ignora;
  - licença permissiva ou copyleft → resume e **inclui**;
  - sem licença → **em espera** (fila do admin);
  - source-available → ignorado; repositório inexistente/bloqueado → ignorado;
  - erro transitório → `error`, com novas tentativas (máx. 3).
- Orçamento por execução (padrão 12 pontos; sondar = 1, resumir/gravar = 3) respeita os limites de subrequests/CPU do Worker; o que sobra continua na próxima execução. Para o plano gratuito, mantenha valores baixos.
- "Rodar agora" executa na hora; "Varrer histórico completo" ignora o cursor (use só quando o painel avisar que houve lacuna).
- Pré-requisito: a instância da Evolution precisa persistir o histórico de mensagens.
- Um token do GitHub (aba Configurações) evita o limite de 60 requisições/h.

## 5. Banco de dados

- `repositories`: catálogo (campos de resumo, ficha técnica e auditoria).
- `app_settings`: chave/valor (senha de admin, OmniRoute, token do GitHub, título, `ingest_config`, `ingest_state`, `ingest_lock`).
- `ingest_log`: decisões da raspagem e pedidos de visitantes (`added`, `pending`, `ignored`, `error`, `requested`).
- Backup: alterações são espelhadas no KV; se o D1 iniciar vazio, o catálogo é restaurado do KV.

## 6. Testes e verificação

```
npm test          # worker.test.ts + ingest.test.ts (SQLite real como D1 fake)
npx tsc --noEmit
```

Os testes usam apenas valores fictícios. Um hook local de `pre-push` (não versionado) bloqueia padrões de segredos/dados pessoais; recrie-o se clonar de novo.

## 7. Scripts

`scripts/import_repos.ts` e `scripts/reclassify_repos.ts` usam `POST /api/repos` com a senha vinda de `--password` ou da variável `ADMIN_PASSWORD`, e `--target` para a URL (padrão `http://localhost:8787`). Não há senha nem domínio embutidos.

## 8. Operação

- Primeiro acesso: a senha inicial é `admin`; **troque imediatamente** no `/admin` (aba Configurações). O painel exibe um aviso enquanto a senha padrão estiver em uso.
- Deploy: push para o repositório conectado à Cloudflare (Workers Builds) ou sincronizar o fork. Confirme no painel da Cloudflare os bindings D1/KV e o Cron Trigger.
- Se a senha de admin ou o Deploy Hook já tiverem aparecido em algum commit público, gere novos.
