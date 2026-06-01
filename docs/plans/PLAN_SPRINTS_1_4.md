# Plano de Implementação — Sprints 1 a 4

> **Objetivo:** Evoluir o fork do Kutt de uma instalação vanilla v3.2.3 para uma plataforma de encurtamento personalizada, com deploy atualizado, API completa, nó N8N e integração com a plataforma Lovable.

---

## Visão Geral das Sprints

| Sprint | Foco | Resultado entregável |
|---|---|---|
| 1 | Base e Deploy | Fork rodando v3.2.5 no EasyPanel, CI/CD configurado |
| 2 | API + N8N | Endpoints completos + nó N8N funcional |
| 3 | UTMs + Métricas | Dashboard global, UTM builder, export CSV |
| 4 | Integração Lovable | SDK JS + implementação na plataforma |

---

## Sprint 1 — Base e Deploy

**Meta:** Ter o fork customizado rodando em produção, sem perda de dados, com pipeline de CI/CD automatizado.

### 1.1 — GitHub Actions: Build e Push da imagem Docker

**Arquivos a criar:**
- `.github/workflows/docker-build.yml`

**O que fazer:**
```yaml
# Trigger: push na branch main
# Steps:
# 1. checkout
# 2. docker/setup-buildx-action
# 3. Login no ghcr.io (GitHub Container Registry) com GITHUB_TOKEN
# 4. Build multi-plataforma (amd64 + arm64)
# 5. Push com tags: latest, v{version}, {sha-curto}
```

**Variáveis necessárias no GitHub:**
- `GITHUB_TOKEN` — automático, sem configuração

**Imagem resultante:**
```
ghcr.io/helbertparanhos/kutt:latest
ghcr.io/helbertparanhos/kutt:v3.2.5
```

**Arquivos relevantes no repo:**
- `Dockerfile` — já existe, sem modificações necessárias
- `package.json` → ler versão automaticamente para a tag

---

### 1.2 — Deploy no EasyPanel (v3.2.3 → v3.2.5 com dados)

**Pré-requisito:** CI/CD da etapa anterior gerando imagem.

**Protocolo de deploy seguro:**

```
Passo 1 — Backup dos dados (CRÍTICO)
  No terminal do EasyPanel ou SSH:
  docker exec <container-kutt> cp /app/db/data.db /app/db/data.backup-$(date +%Y%m%d).db
  
  Verificar que o backup existe antes de continuar.

Passo 2 — Alterar imagem no EasyPanel
  Fonte: Imagem Docker
  De: kutt/kutt:v3.2.3
  Para: ghcr.io/helbertparanhos/kutt:latest
  
  (ou usar Dockerfile apontando para github.com/helbertparanhos/kutt)

Passo 3 — Verificar variáveis de ambiente
  Adicionar novas variáveis da v3.2.4:
  - OIDC_ENABLED=false (manter desabilitado por ora)
  - DISALLOW_LOGIN_FORM=false
  
  Manter todas as existentes intactas.

Passo 4 — Deploy
  Clicar em "Implantar"
  Acompanhar logs — migrations rodam automaticamente no startup
  
Passo 5 — Validação pós-deploy
  curl https://seu-dominio.com/api/v2/health
  → Verificar que retorna { "status": "ok" }
  
  Acessar admin panel e verificar links existentes
  Testar redirecionamento de 2-3 links existentes
```

**Migrations que serão aplicadas (v3.2.3 → v3.2.5):**
- Nenhuma migration nova entre 3.2.3 e 3.2.5 (apenas patches de segurança)
- Zero risco de perda de dados

---

### 1.3 — Configuração de ambiente de desenvolvimento local

**Arquivo a criar:** `.env` (baseado em `.example.env`)

**Arquivo a criar:** `docs/DEVELOPMENT.md` (já existe — verificar se está atualizado)

**Script de setup rápido a criar:** `scripts/setup-dev.sh`
```bash
#!/bin/bash
cp .example.env .env
npm install
npm run migrate
echo "Setup completo. Rode: npm run dev"
```

**Checklist de validação do Sprint 1:**
- [ ] GitHub Actions buildando imagem a cada push em main
- [ ] Imagem disponível no ghcr.io
- [ ] EasyPanel rodando a nova imagem
- [ ] Dados existentes intactos
- [ ] Health check retornando 200
- [ ] Admin panel acessível
- [ ] Pelo menos 3 links existentes redirecionando corretamente

---

## Sprint 2 — API completa + Nó N8N

**Meta:** API com todos os endpoints necessários, documentada via OpenAPI, e um nó N8N custom funcional com as operações principais.

### 2.1 — Novos endpoints da API

#### 2.1.1 — Bulk Create Links

**Endpoint:** `POST /api/v2/links/bulk`

**Request:**
```json
{
  "links": [
    { "target": "https://...", "description": "Link 1" },
    { "target": "https://...", "description": "Link 2" }
  ]
}
```

**Response:**
```json
{
  "created": 2,
  "errors": 0,
  "data": [ { "id": "...", "address": "abc123", "link": "https://..." }, ... ]
}
```

**Arquivos a modificar:**
- `server/routes/link.routes.js` — adicionar rota `POST /bulk`
- `server/handlers/links.handler.js` — adicionar função `bulkCreate`
- `server/queries/link.queries.js` — adicionar `insertMany`

---

#### 2.1.2 — Stats com filtro de data customizado

**Endpoint:** `GET /api/v2/links/:id/stats?from=2024-01-01&to=2024-12-31`

**O que muda:**
- `server/queries/visit.queries.js` — `find()` aceita `from`/`to` nos parâmetros
- `server/handlers/links.handler.js` — extrair `from`/`to` da query e repassar

---

#### 2.1.3 — Stats globais da conta

**Endpoint:** `GET /api/v2/stats`

**Response:**
```json
{
  "total_links": 42,
  "total_clicks": 1500,
  "top_links": [
    { "address": "abc123", "clicks": 300, "target": "..." }
  ],
  "clicks_today": 45,
  "clicks_this_week": 210
}
```

**Arquivos a criar/modificar:**
- `server/routes/link.routes.js` — nova rota `GET /stats` (sem `:id`)
- `server/handlers/links.handler.js` — nova função `globalStats`
- `server/queries/visit.queries.js` — nova query `globalSummary(userId)`

---

#### 2.1.4 — Export de dados

**Endpoint:** `GET /api/v2/links/export?format=csv`

**Formatos:** `csv` e `json`

**Arquivos a modificar:**
- `server/routes/link.routes.js`
- `server/handlers/links.handler.js` — função `exportLinks`

---

### 2.2 — Documentação OpenAPI (Swagger)

**O que existe:** `docs/api/` com gerador customizado em `generate.js`

**O que fazer:**
- Atualizar `docs/api/api.js` com todos os endpoints (existentes + novos)
- Adicionar UI Swagger via `redoc` (já está nas devDependencies!)
- Servir a documentação em `/docs` ou `/api/docs`

**Arquivo a criar:** `server/routes/docs.routes.js`
```js
// Serve o HTML do Redoc
// Serve o api.js (spec OpenAPI) como JSON estático
```

**Arquivo a modificar:** `server/routes/routes.js` — registrar nova rota

---

### 2.3 — Nó N8N customizado

**Estrutura:** pacote npm separado, publicado no GitHub Packages ou npm.

**Repositório a criar:** `github.com/helbertparanhos/n8n-nodes-kutt`

**Estrutura do projeto N8N node:**
```
n8n-nodes-kutt/
├── nodes/
│   └── Kutt/
│       ├── Kutt.node.ts          # Node principal
│       ├── KuttTrigger.node.ts   # Trigger (webhook)
│       └── kutt.svg              # Ícone
├── credentials/
│   └── KuttApi.credentials.ts   # API Key credential
├── package.json
└── tsconfig.json
```

**Operations a implementar:**

| Resource | Operation | Endpoint usado |
|---|---|---|
| Link | Create | `POST /api/v2/links` |
| Link | Create Bulk | `POST /api/v2/links/bulk` |
| Link | Get | `GET /api/v2/links/:id` |
| Link | List | `GET /api/v2/links` |
| Link | Update | `PATCH /api/v2/links/:id` |
| Link | Delete | `DELETE /api/v2/links/:id` |
| Link | Get Stats | `GET /api/v2/links/:id/stats` |
| Stats | Global | `GET /api/v2/stats` |
| Stats | Export | `GET /api/v2/links/export` |

**Trigger:**
- `On Link Clicked` — via webhook registrado no Kutt (depende do endpoint de webhooks, que vai em Sprint futuro; por ora, usar polling)

**Como instalar no N8N:**
```bash
# Via npm (após publicação)
npm install n8n-nodes-kutt

# Ou via Community Nodes no painel N8N
# Settings → Community Nodes → Install → n8n-nodes-kutt
```

**Checklist do Sprint 2:**
- [ ] `POST /api/v2/links/bulk` funcionando
- [ ] `GET /api/v2/links/:id/stats?from=&to=` funcionando
- [ ] `GET /api/v2/stats` funcionando
- [ ] `GET /api/v2/links/export?format=csv` funcionando
- [ ] Swagger UI acessível em `/api/docs`
- [ ] Nó N8N instalável e com credencial Kutt configurável
- [ ] Pelo menos Create, List e Get Stats testados no N8N

---

## Sprint 3 — UTMs + Métricas

**Meta:** Formulário de criação de links com builder de UTM, dashboard global e export de analytics.

### 3.1 — UTM Builder no formulário de links

#### 3.1.1 — Nenhuma migration necessária

Os parâmetros UTM são parte da URL de destino (`target`). O banco já armazena o `target` completo. Não há necessidade de novos campos no schema.

#### 3.1.2 — UI: campos UTM no formulário de criação

**Arquivo a modificar:** `server/views/partials/shortener.hbs`

**O que adicionar:**
- Seção expansível "Parâmetros UTM" (toggle via HTMX ou JS puro)
- Campos: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- Preview da URL final montada em tempo real
- Botão "Limpar UTMs"

**Arquivo a modificar:** `static/scripts/main.js`
- Função `buildUTMUrl(base, params)` — monta a URL com os parâmetros
- Event listener nos campos UTM → atualizar preview

#### 3.1.3 — Templates de UTM

**Migration a criar:** `npm run migrate:make -- utm_templates`

```js
// Schema da tabela utm_templates
table.increments("id");
table.integer("user_id").references("users.id").onDelete("CASCADE");
table.string("name").notNullable();          // "Instagram Orgânico"
table.string("utm_source").defaultTo("");
table.string("utm_medium").defaultTo("");
table.string("utm_campaign").defaultTo("");
table.string("utm_content").defaultTo("");
table.string("utm_term").defaultTo("");
table.timestamps(true, true);
```

**Endpoints a criar:**
- `GET /api/v2/utm-templates` — listar templates do usuário
- `POST /api/v2/utm-templates` — salvar template
- `DELETE /api/v2/utm-templates/:id` — deletar template

**UI:** dropdown "Aplicar template" no formulário de criação → preenche os campos automaticamente.

---

### 3.2 — Dashboard Global de Métricas

**Arquivo a criar:** `server/views/partials/dashboard/` (nova seção na homepage ou página dedicada)

**Arquivo a criar:** `server/views/dashboard.hbs`

**O que mostrar:**
- Total de links ativos
- Total de cliques (hoje / semana / mês)
- Top 5 links por cliques
- Gráfico de tendência geral (últimos 30 dias)
- Distribuição de países (top 5)
- Distribuição de browsers

**Endpoint a criar:** `GET /api/v2/stats` (feito no Sprint 2)

**Rota de renderização:** adicionar em `server/routes/renders.routes.js`
```js
router.get("/dashboard", auth.isAuthenticated, renders.dashboard);
```

---

### 3.3 — Export de Analytics

**Formatos:**
- CSV: `id, address, target, created_at, total_clicks, top_country, top_browser`
- JSON: estrutura completa com stats aninhadas

**Endpoint:** `GET /api/v2/links/export?format=csv&from=&to=` (feito no Sprint 2)

**UI:** botão "Exportar" na página de links e na página de stats

---

### 3.4 — Melhorias na página de Stats por link

**Arquivo a modificar:** `server/views/stats.hbs` e `server/views/partials/stats.hbs`

**Adicionar:**
- Seletor de período customizado (date range picker — usar `<input type="date">` nativo)
- Métrica de unique clicks (estimar por hash de IP truncado)
- Compartilhar stats (link público de stats sem login)

**Checklist do Sprint 3:**
- [ ] Formulário de criação com campos UTM visíveis
- [ ] Preview da URL final em tempo real
- [ ] Templates de UTM: salvar, listar, aplicar
- [ ] Página `/dashboard` com métricas globais
- [ ] Export CSV funcionando via UI e API
- [ ] Stats por link com filtro de data customizado

---

## Sprint 4 — Integração com Lovable

**Meta:** Documentação completa de integração, SDK JS e implementação da feature de criação de links na plataforma Lovable.

### 4.1 — Documentação de integração

**Arquivo a criar:** `docs/integrations/LOVABLE.md`

**Conteúdo:**
- Autenticação via API Key
- Como obter a API Key (print da UI + passos)
- Endpoints usados pela integração
- Exemplos de código em fetch/axios
- Tratamento de erros
- Rate limits

---

### 4.2 — SDK JavaScript (cliente)

**Arquivo a criar:** `docs/integrations/sdk/kutt-client.js`

```js
class KuttClient {
  constructor({ apiKey, baseUrl }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl; // ex: "https://seu-kutt.com"
  }

  async createLink({ target, description, customSlug, password, expiresAt, utmSource, utmMedium, utmCampaign, utmContent, utmTerm }) {
    // Monta URL com UTMs se fornecidos
    // POST /api/v2/links
    // Retorna { id, address, link, target, ... }
  }

  async getLink(id) { /* GET /api/v2/links/:id */ }
  async updateLink(id, data) { /* PATCH /api/v2/links/:id */ }
  async deleteLink(id) { /* DELETE /api/v2/links/:id */ }
  async getLinkStats(id, { from, to } = {}) { /* GET /api/v2/links/:id/stats */ }
  async listLinks({ limit = 10, skip = 0, search } = {}) { /* GET /api/v2/links */ }
  async getGlobalStats() { /* GET /api/v2/stats */ }
}

module.exports = KuttClient;
// ou: export default KuttClient; (ESM)
```

---

### 4.3 — Prompt e documentação para implementação no Lovable

**Arquivo a criar:** `docs/integrations/LOVABLE_PROMPT.md`

Este arquivo contém o prompt completo para o Lovable implementar a feature de criação de links. Estrutura:

```
CONTEXTO:
- Descrição da API do Kutt
- URL base e autenticação

FEATURE A IMPLEMENTAR:
- Componente "Criar Link Curto"
- Campos: URL de destino, slug personalizado (opcional), UTM params (opcional)
- Comportamento: POST → mostrar link gerado → copiar para clipboard

COMPONENTE ESPERADO:
- CreateShortLinkModal.tsx (ou .jsx)
- Hook useKutt.ts para chamadas à API
- Tratamento de erro (URL inválida, slug já em uso)

EXEMPLO DE CÓDIGO:
[incluir exemplos completos de fetch]

VARIÁVEIS DE AMBIENTE:
VITE_KUTT_API_KEY=sua_api_key
VITE_KUTT_BASE_URL=https://seu-dominio.com
```

---

### 4.4 — Implementação no Lovable

**Sequência de trabalho:**

```
Fase 1 — Preparação
  → Gerar API Key no Kutt (Settings → API Key)
  → Configurar variáveis de ambiente no Lovable
  → Testar conexão com curl

Fase 2 — Implementação básica (Lovable)
  → Usar prompt de LOVABLE_PROMPT.md
  → Implementar hook useKutt
  → Implementar componente CreateShortLinkModal

Fase 3 — UTMs na integração
  → Adicionar campos UTM no componente
  → Usar KuttClient.createLink com UTM params

Fase 4 — Exibição de stats
  → Widget de stats inline (total de cliques do link)
  → Link para a página de stats completa
```

**Validação:**
- [ ] Criar link funciona na plataforma Lovable
- [ ] Link gerado é copiável com um clique
- [ ] UTMs são passados corretamente
- [ ] Erros tratados (URL inválida, slug duplicado, falha de rede)
- [ ] Stats do link visíveis no contexto da plataforma

---

## Checklist Final (Sprints 1–4)

```
Sprint 1
  [ ] GitHub Actions build + push ghcr.io
  [ ] Deploy v3.2.5 EasyPanel sem perda de dados
  [ ] Health check e validação pós-deploy

Sprint 2
  [ ] POST /api/v2/links/bulk
  [ ] GET /api/v2/links/:id/stats?from=&to=
  [ ] GET /api/v2/stats (global)
  [ ] GET /api/v2/links/export
  [ ] Swagger UI em /api/docs
  [ ] Nó N8N instalável com Create, List, Stats

Sprint 3
  [ ] UTM builder no formulário de criação
  [ ] Templates de UTM (salvar/aplicar)
  [ ] Dashboard global /dashboard
  [ ] Export CSV via UI

Sprint 4
  [ ] SDK JS documentado e testado
  [ ] Prompt Lovable completo
  [ ] Feature de criação de links funcionando na plataforma
```
