# 👁️ GitVisão • Catálogo Inteligente "Pega a Visão" na Borda da Cloudflare

O **GitVisão** é uma aplicação completa **100% Serverless na Borda da Cloudflare (Workers + D1 SQLite)** integrada ao **OmniRoute (com modelos Gemini)** para catalogar, categorizar, buscar e gerar resumos virais no formato **"Pega a Visão"** para grupos de WhatsApp e comunidades de tecnologia.

Projetado com a mesma filosofia **Zero-Terminal / 1-Step Deploy** do [`DriveFlin`](https://github.com/samucamg/DriveFlin) e [`veroroute-edge`](https://github.com/samucamg/veroroute-edge): **você faz o deploy direto pelo painel web da Cloudflare sem instalar Node.js, sem rodar comandos no terminal e sem perder suas configurações ao atualizar o fork!**

---

## ⚡ Deploy em 1 Único Passo pelo Painel da Cloudflare (Zero Terminal / Zero CLI)

Esqueça `wrangler d1 create`, copiar `database_id` manualmente ou rodar migrações via CLI:

1. **Auto-Provisioning do Banco D1 (`git_visao_db`)**: O arquivo [`wrangler.toml`](./wrangler.toml) utiliza o recurso oficial de **Auto-Provisioning do Wrangler v4**. No seu primeiro deploy conectado ao GitHub, a própria Cloudflare cria e vincula automaticamente o banco D1 `git_visao_db` na sua conta.
2. **Auto-Seed e Auto-Migração (`ensureDatabaseInitialized`)**: No primeiro acesso à aplicação, o Worker cria automaticamente as tabelas (`repositories` e `app_settings`), índices de performance e popula os **5 exemplos iniciais** do formato *"Pega a Visão"*.
3. **Configuração 100% via Interface Web (`⚙️ Configurar IA & Senha`)**: Todas as credenciais — **URL do OmniRoute**, **API Key**, **Modelo Gemini** (`gemini-2.5-flash`), **GitHub Token** e a **Senha de Admin** — são configuradas direto pelo modal **⚙️ Configurar IA & Senha** na interface web e salvas com segurança na tabela `app_settings` dentro do banco D1 (além de contar com `keep_vars = true` no `wrangler.toml`).
4. **Atualizações Limpas (`Sync fork`)**: Quando sair uma nova versão do GitVisão, basta clicar em **Sync fork** no GitHub. A Cloudflare fará o rebuild automático **sem apagar seu banco D1 e sem perder nenhuma senha ou chave de API!**

> [!WARNING]
> **⚠️ IMPORTANTE: Não use botões de "Deploy to Cloudflare" de 1 clique!**
>
> Assim como no `veroroute-edge` e no `DriveFlin`, o botão "Deploy to Cloudflare" clona um repositório isolado na sua conta sem vínculo com o repositório original, dificultando atualizações futuras via `Sync fork`.
>
> **Siga sempre o fluxo oficial em 2 cliques abaixo:**
> 1. **Faça um Fork** deste repositório para a sua conta do GitHub (ou use seu próprio repositório).
> 2. No painel da Cloudflare, acesse **Compute (Workers & Pages)** → **Create** → aba **Workers** → **Import a repository**, selecione `git-visao` e clique em **Deploy**!

---

## 🚀 Passo a Passo do Deploy Oficial (Sem Terminal)

1. Faça um **Fork** deste repositório no GitHub.
2. Acesse o [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Compute (Workers & Pages)** → **Create**.
3. Na aba **Workers**, clique em **Import a repository** e selecione o seu fork `git-visao`.
4. Mantenha os comandos padrão (`Deploy command: npx wrangler deploy`) e clique em **Deploy**.
   - *A Cloudflare criará automaticamente o Worker e provisionará o banco D1 `git_visao_db`.*

---

## ⏱️ Primeiro Acesso em 30 Segundos

Assim que o deploy terminar na Cloudflare:

1. Abra a URL gerada para o seu Worker (ex: `https://git-visao.<sua-conta>.workers.dev`).
2. Clique no botão **⚙️ Configurar IA & Senha** no topo direito da página.
3. No campo **Senha Atual de Admin**, digite a senha inicial padrão:
   ```text
   admin
   ```
4. Defina a sua **Nova Senha de Admin**, preencha a **URL Base do OmniRoute** (ex: `https://seu-omniroute.seudominio.com/v1`), sua **API Key do OmniRoute** e o **Modelo Rápido** (recomendado: `gemini-2.5-flash` para resposta instantânea).
5. *(Opcional)* Informe um **GitHub Personal Access Token (`ghp_...`)** para aumentar o limite da API do GitHub de 60 para 5.000 requisições/hora.
6. Clique em **Salvar no Banco D1**. Pronto! Seu catálogo inteligente já está 100% operacional.

---

## 🏗️ Arquitetura e Fluxo de Cache Inteligente

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Navegador / Interface Web                        │
│   • Checagem instantânea de URLs do GitHub (aberta p/ todo o grupo)     │
│   • Geração sob demanda com Senha de Admin + Escolha de Template        │
│   • Painel Web de Configuração (⚙️ OmniRoute, Gemini, GitHub e Senha)   │
│   • Busca Full-Text, Filtro por 6 Categorias, 5 Templates e Estrelas    │
│   • Modal Lado a Lado + Botão 1-Clique "Copiar Resumo p/ WhatsApp"      │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Cloudflare Worker (src/index.ts)                     │
├──────────────────────┬───────────────────────────┬──────────────────────┤
│   Cloudflare D1 DB   │     GitHub REST API       │  OmniRoute AI (LLM)  │
│  (`git_visao_db`)    │  Metadados, Estrelas,     │  Endpoint OpenAI-    │
│  Repositórios +      │  Último Commit, Tópicos   │  compatible usando   │
│  `app_settings`      │  e README.md completo     │  gemini-2.5-flash    │
└──────────────────────┴───────────────────────────┴──────────────────────┘
```

### 🛡️ Leitura Aberta para o Grupo vs. Geração Protegida por Senha

O **GitVisão** foi desenhado para ser compartilhado livremente no grupo de WhatsApp sem risco de consumo indevido de tokens da sua IA:

- **Consulta e Checagem 100% Abertas (Sem Senha)**: Qualquer membro do grupo pode pesquisar no catálogo, filtrar por categoria/template, colar uma URL do GitHub para checar se o repositório já foi analisado (`/api/check`) e copiar o resumo formatado para WhatsApp.
- **Cache Inteligente no D1**: Se alguém colar um repositório que já está no banco D1, o sistema exibe o card imediatamente sem chamar a IA e sem pedir senha.
- **Cadastro Novo e Regeração Protegidos**: Apenas quando o repositório **ainda não existe** no catálogo (ou quando você marca a opção de **Forçar regeração via IA**) o sistema solicita a **Senha de Admin** antes de consultar a API do GitHub e acionar o OmniRoute.

---

## 🎨 As 5 Variações Dinâmicas de Template "Pega a Visão"

Em vez de gerar textos engessados sempre com a mesma estrutura, o **GitVisão** analisa a arquitetura e o propósito do repositório no GitHub e seleciona automaticamente (ou permite escolher manualmente) uma das **5 variações virais**:

1. **`ai-agent-automation` (Agentes de IA & Automação — Estilo *BrowserOS*)**
   - **Gancho**: `🌐 E SE SEU AGENTE DE IA GANHASSE...`
   - **Bloco mental**: `🧠 PENSE ASSIM:` focado em delegar tarefas reais ao agente passo a passo.
2. **`self-hosted-saas` (SaaS, CRM & Plataformas Self-Hosted — Estilo *wacrm*)**
   - **Gancho**: `🏢 E SE VOCÊ TIVESSE SEU PRÓPRIO...`
   - **Bloco mental**: `🧠 PENSE ASSIM:` focado em regras de negócio, soberania de dados e zero mensalidade de SaaS fechado.
3. **`infra-gateway` (Infraestrutura, Gateways, Proxy & Edge — Estilo *VeroRoute Edge*)**
   - **Gancho**: `🔀 E SE SEUS APPS NUNCA FICASSEM SEM...`
   - **Bloco mental**: `🧠 PENSE ASSIM:` focado em alta disponibilidade, failover automático, cache na borda e resiliência.
4. **`app-tool` (Apps Desktop/Web & Produtividade)**
   - **Gancho**: `⚡ JÁ PENSOU EM RESOLVER ... EM SEGUNDOS?`
   - **Bloco mental**: `🎯 NA PRÁTICA, FUNCIONA ASSIM:` focado no fluxo de produtividade diário sem fricção.
5. **`dev-lib-cli` (Bibliotecas, SDKs, Frameworks & CLIs Dev)**
   - **Gancho**: `🛠️ CANSADO DE ESCREVER BOILERPLATE PARA...?`
   - **Bloco mental**: `💻 COMO FICA NO SEU FLUXO DEV:` focado em Developer Experience (DX), performance e integração rápida.

### 🗂️ As 6 Categorias Automáticas

- `Agentes & Automação IA`
- `SaaS & CRM Self-Hosted`
- `Infra, Gateways & Edge`
- `Apps & Produtividade`
- `Libs, SDKs & CLI Dev`
- `Outros`

---

## 🔌 Rotas da API REST

| Método | Rota | Autenticação | Descrição |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/health` | Pública | Status do banco D1, modelo OmniRoute ativo, categorias e templates disponíveis. |
| `GET` | `/api/repos` | Pública | Lista e filtra repositórios (`?q=`, `?category=`, `?template=`, `?sort=recent\|stars\|name`). |
| `GET` | `/api/check?repo=...` | Pública | Verifica instantaneamente se um repositório (`owner/repo` ou URL) já existe no catálogo D1. |
| `POST` | `/api/repos` | Pública (se em cache) / **Senha Admin** (novo ou `force: true`) | Retorna do cache D1 se já existir, ou busca no GitHub + gera resumo via OmniRoute e salva no D1. |
| `DELETE` | `/api/repos/:owner/:name` | **Senha Admin** | Remove um repositório do catálogo D1. |
| `GET` | `/api/settings` | Pública (mascarado) | Retorna o status das configurações salvas no banco D1 (`app_settings`) sem expor chaves secretas. |
| `POST` | `/api/settings` | **Senha Admin** | Salva/atualiza URL do OmniRoute, API Key, Modelo Gemini, GitHub Token e Senha de Admin direto no banco D1. |

---

## 💻 Desenvolvimento Local e Testes Automatizados (Opcional)

Se desejar rodar localmente ou executar a suíte de testes automatizados (`node:test`):

```bash
npm install
npm test
npm run dev
```
