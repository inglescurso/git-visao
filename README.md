# 👁️ GitVisão • Catálogo Inteligente "Pega a Visão" para Repositórios GitHub

O **GitVisão** é uma aplicação completa rodando 100% na borda da **Cloudflare (Workers + D1 SQLite)** integrada ao **OmniRoute (com modelos Gemini)** para catalogar, categorizar, buscar e gerar resumos virais no estilo **"Pega a Visão"** para grupos de WhatsApp e comunidades de tecnologia.

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Navegador / Interface Web                        │
│   • Checagem instantânea de URLs do GitHub (sem senha se já existir)    │
│   • Geração sob demanda com Senha de Admin + Escolha de Template        │
│   • Busca Full-Text, Filtro por 6 Categorias, 5 Templates e Estrelas    │
│   • Modal Lado a Lado + Botão 1-Clique "Copiar Resumo p/ WhatsApp"      │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Cloudflare Worker (src/index.ts)                     │
├──────────────────────┬───────────────────────────┬──────────────────────┤
│   Cloudflare D1 DB   │     GitHub REST API       │  OmniRoute AI (LLM)  │
│  (SQLite Serverless) │  Metadados, Estrelas,     │  Endpoint OpenAI-    │
│  Cache permanente de │  Último Commit, Tópicos   │  compatible usando   │
│  repositórios        │  e README.md completo     │  gemini-2.5-flash    │
└──────────────────────┴───────────────────────────┴──────────────────────┘
```

### 🎨 As 5 Variações de Template "Pega a Visão"

Em vez de gerar textos engessados sempre com a mesma estrutura, o **GitVisão** analisa o repositório e seleciona automaticamente (ou permite escolher manualmente) uma das **5 variações**:

1. **`ai-agent-automation` (Agentes de IA & Automação — Estilo *BrowserOS*)**
   - Gancho: `🌐 E SE SEU AGENTE DE IA GANHASSE...`
   - Bloco mental: `🧠 PENSE ASSIM:` focado em delegar tarefas reais ao agente passo a passo.
2. **`self-hosted-saas` (SaaS, CRM & Plataformas Self-Hosted — Estilo *wacrm*)**
   - Gancho: `🏢 E SE VOCÊ TIVESSE SEU PRÓPRIO...`
   - Bloco mental: `🧠 PENSE ASSIM:` focado em regras de negócio, soberania de dados e zero mensalidade de SaaS fechado.
3. **`infra-gateway` (Infraestrutura, Gateways, Proxy & Edge — Estilo *VeroRoute Edge*)**
   - Gancho: `🔀 E SE SEUS APPS NUNCA FICASSEM SEM...`
   - Bloco mental: `🧠 PENSE ASSIM:` focado em alta disponibilidade, failover automático, cache na borda e resiliência.
4. **`app-tool` (Apps Desktop/Web & Produtividade)**
   - Gancho: `⚡ JÁ PENSOU EM RESOLVER ... EM SEGUNDOS?`
   - Bloco mental: `🎯 NA PRÁTICA, FUNCIONA ASSIM:` focado no fluxo de produtividade diário sem fricção.
5. **`dev-lib-cli` (Bibliotecas, SDKs, Frameworks & CLIs Dev)**
   - Gancho: `🛠️ CANSADO DE ESCREVER BOILERPLATE PARA...?`
   - Bloco mental: `💻 COMO FICA NO SEU FLUXO DEV:` focado em Developer Experience (DX), performance e integração rápida.

### 🗂️ As 6 Categorias Automáticas

- `Agentes & Automação IA`
- `SaaS & CRM Self-Hosted`
- `Infra, Gateways & Edge`
- `Apps & Produtividade`
- `Libs, SDKs & CLI Dev`
- `Outros`

---

## 🛠️ Pré-requisitos e Configuração do Banco Cloudflare D1

### 1. Instalar dependências locais

```bash
npm install
```

### 2. Criar o banco de dados D1 na Cloudflare

Autentique-se na Cloudflare e crie o banco `git-visao-db`:

```bash
npx wrangler login
npx wrangler d1 create git-visao-db
```

O comando retornará um bloco semelhante a este:

```toml
[[d1_databases]]
binding = "DB"
database_name = "git-visao-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copie o `database_id` gerado e atualize o arquivo [`wrangler.toml`](./wrangler.toml):

```toml
name = "git-visao"
main = "src/index.ts"
compatibility_date = "2025-02-01"

[vars]
OMNIROUTE_MODEL = "gemini-2.5-flash"
PUBLIC_APP_TITLE = "GitVisão • Catálogo de Repositórios"

[[d1_databases]]
binding = "DB"
database_name = "git-visao-db"
database_id = "SEU_DATABASE_ID_AQUI"
migrations_dir = "migrations"
```

### 3. Aplicar as migrações do banco D1

Para desenvolvimento local:

```bash
npm run db:migrate:local
```

Para o banco de produção na Cloudflare:

```bash
npm run db:migrate:remote
```

---

## 🔐 Configuração de Variáveis e Secrets (`wrangler secret`)

O Worker utiliza as seguintes variáveis/secrets:

| Nome da Variável / Secret | Obrigatório? | Descrição |
| :--- | :---: | :--- |
| `ADMIN_PASSWORD` | **Sim** | Senha exigida para cadastrar novos repositórios ou forçar regeração com IA. Consultas a repositórios já existentes são públicas. |
| `OMNIROUTE_BASE_URL` | Recomendado | URL base do seu gateway OmniRoute compatível com OpenAI (ex: `https://seu-omniroute.seudominio.com/v1`). |
| `OMNIROUTE_API_KEY` | Recomendado | Chave de API do OmniRoute (ou chave compatível) para chamar o modelo Gemini. |
| `OMNIROUTE_MODEL` | Opcional | Definido em `wrangler.toml` (padrão: `gemini-2.5-flash`). |
| `GITHUB_TOKEN` | Opcional | Token pessoal do GitHub (`ghp_...`) para elevar o limite de requisições da API do GitHub de 60/h para 5.000/h. |
| `PUBLIC_APP_TITLE` | Opcional | Título exibido no cabeçalho da aplicação web. |

Configure os secrets em produção executando:

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put OMNIROUTE_BASE_URL
npx wrangler secret put OMNIROUTE_API_KEY
npx wrangler secret put GITHUB_TOKEN
```

> **💡 Dica para ambiente local (`.dev.vars`):**
> Crie um arquivo `.dev.vars` na raiz do projeto para rodar `npm run dev`:
> ```env
> ADMIN_PASSWORD=sua_senha_super_secreta
> OMNIROUTE_BASE_URL=https://seu-omniroute.exemplo.com/v1
> OMNIROUTE_API_KEY=sk-omniroute-xxxx
> GITHUB_TOKEN=ghp_xxxx
> ```

---

## 🚀 Como Subir para o GitHub e Fazer o Deploy na Cloudflare

Primeiro, crie um repositório no GitHub e envie o código:

```bash
git init
git add .
git commit -m "feat: sistema completo GitVisão com Cloudflare Workers, D1 e OmniRoute"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/git-visao.git
git push -u origin main
```

Você pode escolher **qualquer uma das duas opções abaixo** para manter o deploy automático a cada `git push`:

---

### Opção A: Integração Nativa da Cloudflare (Workers Builds conectado direto ao GitHub)

Ideal se você quer gerenciar tudo pelo painel da Cloudflare sem configurar secrets no GitHub:

1. Acesse o [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Compute (Workers & Pages)**.
2. Clique em **Create** → **Workers** → **Import a repository** (Conectar ao GitHub).
3. Selecione o repositório `git-visao` e a branch de produção `main`.
4. Em **Build configuration**:
   - **Build command**: `npx wrangler d1 migrations apply git-visao-db --remote` (ou deixe em branco caso já tenha aplicado a migração)
   - **Deploy command**: `npx wrangler deploy`
5. Após a criação, vá na aba **Settings** → **Variables and Secrets** do Worker no painel da Cloudflare e adicione:
   - `ADMIN_PASSWORD` (Secret)
   - `OMNIROUTE_BASE_URL` (Secret ou Text)
   - `OMNIROUTE_API_KEY` (Secret)
   - `GITHUB_TOKEN` (Secret opcional)
6. Pronto! Todo `push` na branch `main` fará o deploy automático na Cloudflare.

---

### Opção B: Deploy Automático via GitHub Actions (`.github/workflows/deploy.yml`)

O projeto já inclui o workflow [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) que executa os testes automatizados (`npm test`), aplica as migrações no banco D1 remoto e publica o Worker.

1. No painel da Cloudflare, gere um **API Token** (My Profile → API Tokens → Create Token → use o template **Edit Cloudflare Workers** e inclua permissão de **D1:Edit**).
2. Copie também o seu **Account ID** na página inicial de Workers & Pages da Cloudflare.
3. No seu repositório do GitHub, acesse **Settings** → **Secrets and variables** → **Actions** → **New repository secret** e cadastre:
   - `CLOUDFLARE_API_TOKEN`: Seu token da API da Cloudflare.
   - `CLOUDFLARE_ACCOUNT_ID`: Seu ID de conta da Cloudflare.
4. Faça qualquer `push` para a branch `main` (ou acione manualmente na aba **Actions** → **Deploy GitVisão to Cloudflare Workers** → **Run workflow**).

---

## 🧪 Rodando os Testes Automatizados

O projeto possui suíte de testes nativa com `node:test` validando o parser de URLs do GitHub, as 5 variações de template "Pega a Visão", a autenticação por senha e todas as rotas da API do Worker + cache D1:

```bash
npm test
```
