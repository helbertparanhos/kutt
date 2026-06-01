# Plano de Implementações Futuras

> Features de médio e longo prazo para evoluir o Kutt fork além do encurtamento básico. Cada item inclui valor de negócio, complexidade técnica, dependências e especificação de implementação.

---

## Mapa de Prioridades

```
ALTO VALOR / BAIXA COMPLEXIDADE  →  Implementar logo
ALTO VALOR / ALTA COMPLEXIDADE   →  Planejar com cuidado
BAIXO VALOR / BAIXA COMPLEXIDADE →  Fácil de fazer quando houver tempo
BAIXO VALOR / ALTA COMPLEXIDADE  →  Evitar por ora
```

| Feature | Valor | Complexidade | Prioridade |
|---|---|---|---|
| Tags / grupos de links | Alto | Média | 1 |
| Webhooks de clique | Alto | Média | 2 |
| QR Code personalizado | Alto | Baixa | 3 |
| Expiração por cliques | Médio | Baixa | 4 |
| Branded 404 / expired page | Médio | Baixa | 5 |
| Link preview (OG tags custom) | Alto | Média | 6 |
| Pixel de retargeting | Alto | Média | 7 |
| Link rotation / A-B testing | Alto | Alta | 8 |
| Bulk import (CSV) | Médio | Média | 9 |
| Domain health check | Médio | Média | 10 |
| GDPR / Privacy mode | Médio | Média | 11 |
| SSO via OIDC | Alto | Baixa | 12 |
| N8N webhook trigger | Alto | Alta | 13 |
| AI auto-tagging | Médio | Alta | 14 |
| Workspace / Times | Alto | Muito Alta | 15 |

---

## Feature 1 — Tags e Grupos de Links

**Valor:** Organizar links por campanha, cliente, projeto ou canal. Essencial conforme o volume cresce.

### Schema

**Migration:** `npm run migrate:make -- tags`

```js
// Tabela tags
table.increments("id");
table.integer("user_id").references("users.id").onDelete("CASCADE");
table.string("name").notNullable();
table.string("color").defaultTo("#6366f1");  // cor da tag para UI
table.timestamps(true, true);
table.unique(["user_id", "name"]);

// Tabela link_tags (N:M)
table.increments("id");
table.integer("link_id").references("links.id").onDelete("CASCADE");
table.integer("tag_id").references("tags.id").onDelete("CASCADE");
table.unique(["link_id", "tag_id"]);
```

### API

```
GET    /api/v2/tags              → listar tags do usuário
POST   /api/v2/tags              → criar tag
DELETE /api/v2/tags/:id          → deletar tag
GET    /api/v2/links?tag=slug    → filtrar links por tag
POST   /api/v2/links/:id/tags    → adicionar tag a um link
DELETE /api/v2/links/:id/tags/:tagId → remover tag
```

### UI

- Tags como chips coloridos na tabela de links
- Filtro rápido no header da tabela (clicar na tag filtra)
- Seletor de tags no formulário de criação/edição
- Página de gerenciamento de tags em Settings

### N8N

- Nova operation no nó: `Add Tag to Link`, `Filter Links by Tag`

---

## Feature 2 — Webhooks de Clique

**Valor:** Permite automações em tempo real. Quando um link é clicado → N8N recebe o evento → dispara fluxo (ex: registrar lead, atualizar CRM, notificar Slack).

### Schema

**Migration:** `npm run migrate:make -- webhooks`

```js
// Tabela webhooks
table.increments("id");
table.integer("user_id").references("users.id").onDelete("CASCADE");
table.integer("link_id").references("links.id").onDelete("CASCADE").nullable(); // null = todos os links
table.string("url").notNullable();
table.string("event").defaultTo("click");  // "click" | "banned" | "expired"
table.boolean("active").defaultTo(true);
table.string("secret").defaultTo("");      // para assinar os requests (HMAC)
table.timestamps(true, true);
```

### Payload enviado ao webhook

```json
{
  "event": "click",
  "timestamp": "2024-01-15T14:30:00Z",
  "link": {
    "id": "uuid",
    "address": "abc123",
    "target": "https://...",
    "link": "https://seu-dominio.com/abc123"
  },
  "visit": {
    "country": "BR",
    "browser": "chrome",
    "os": "windows",
    "referrer": "instagram.com",
    "device": "mobile"
  }
}
```

### Implementação

- `server/queues/webhook.js` — worker que dispara o webhook assincronamente (não bloqueia o redirect)
- Retry com backoff exponencial (3 tentativas)
- Assinatura HMAC-SHA256 no header `X-Kutt-Signature`
- Log de entregas em tabela `webhook_deliveries`

### API

```
GET    /api/v2/webhooks          → listar webhooks
POST   /api/v2/webhooks          → criar webhook
DELETE /api/v2/webhooks/:id      → deletar
GET    /api/v2/webhooks/:id/deliveries → histórico de entregas
```

### N8N Trigger

Com webhooks implementados, o nó N8N ganha o trigger real:
- `On Link Clicked` → registra URL do N8N como webhook no Kutt → recebe eventos

---

## Feature 3 — QR Code Personalizado

**Valor:** QR codes com a identidade visual do usuário (cor, logo centralizado).

**O que existe hoje:** qrcode.min.js já está em `static/libs/` — gera QR básico.

### Melhorias

- **Cor customizável:** foreground e background
- **Logo centralizado:** upload de imagem que fica no centro do QR
- **Tamanho configurável:** pequeno / médio / grande
- **Download:** PNG e SVG
- **QR por link:** disponível na tabela de links (botão já existe) e via API

### API

```
GET /api/v2/links/:id/qr?color=6366f1&bg=ffffff&size=300&logo=url
→ Retorna imagem PNG
```

### Implementação

- No frontend: painel de opções de QR na tabela de links (HTMX)
- No backend: endpoint que aceita params e retorna imagem gerada
- Biblioteca: `qrcode` (npm) no servidor para maior controle que a lib client-side atual

---

## Feature 4 — Expiração por Cliques

**Valor:** "Este link funciona apenas para as primeiras 100 pessoas."

### Schema

**Migration:** `npm run migrate:make -- expire_by_clicks`

```js
// Adicionar à tabela links:
table.integer("max_clicks").nullable();  // null = sem limite
```

### Implementação

No `links.handler.js`, função `redirect`:

```js
// Antes de redirecionar, verificar:
if (link.max_clicks !== null && link.visit_count >= link.max_clicks) {
  return res.redirect("/expired");  // ou 410 Gone
}
```

### UI

- Campo "Expirar após X cliques" no formulário de criação/edição
- Indicador na tabela: "47/100 cliques utilizados"
- Barra de progresso opcional

---

## Feature 5 — Branded 404 / Página de Link Expirado

**Valor:** Experiência controlada quando um link não existe, expirou ou atingiu o limite de cliques.

### Tipos de página customizável

- `/404` — link não encontrado
- `/expired` — link expirado (por data ou por cliques)
- `/banned` — link banido (já existe, mas pode ser melhorada)
- `/protected` — link com senha (já existe)

### Customização

Via `custom/views/`:
- `custom/views/404.hbs` — sobrescreve a página padrão
- `custom/views/expired.hbs` — página de link expirado (nova)

**Sem migration necessária.** Apenas lógica no handler e template.

### Redirect customizado no expirado

```js
// env.js — nova variável
EXPIRED_REDIRECT_URL: str({ default: "" })
// Se configurado, redireciona para essa URL em vez de mostrar página

// links.handler.js
if (link.expire_in && isAfter(new Date(), link.expire_in)) {
  if (env.EXPIRED_REDIRECT_URL) return res.redirect(env.EXPIRED_REDIRECT_URL);
  return res.redirect("/expired");
}
```

---

## Feature 6 — Link Preview (OG Tags Customizadas)

**Valor:** Controlar o que aparece quando o link é compartilhado no WhatsApp, Twitter, etc.

**Hoje:** O redirect é `301` direto — o preview mostra as OG tags do destino.

### Abordagem: página intermediária opcional

- Nova variável por link: `preview_enabled: boolean`
- Se ativado: antes de redirecionar, servir uma página HTML com OG tags customizadas + meta refresh
- OG tags configuráveis: `og_title`, `og_description`, `og_image`

### Schema

**Migration:** `npm run migrate:make -- link_preview`

```js
// Adicionar à tabela links:
table.boolean("preview_enabled").defaultTo(false);
table.string("og_title").nullable();
table.string("og_description").nullable();
table.string("og_image").nullable();
```

### Template

`server/views/preview.hbs`:
```html
<meta property="og:title" content="{{og_title}}" />
<meta property="og:description" content="{{og_description}}" />
<meta property="og:image" content="{{og_image}}" />
<meta http-equiv="refresh" content="0;url={{target}}" />
```

---

## Feature 7 — Pixel de Retargeting

**Valor:** Marcar visitantes de links para retargeting em Facebook Ads, Google Ads.

### Como funciona

Quando um usuário clica no link:
1. Antes do redirect, servir uma página HTML intermediária (1-2ms)
2. A página dispara os pixels configurados
3. `meta refresh` redireciona para o destino

### Schema

```js
// Tabela pixels (por usuário, reutilizáveis em múltiplos links)
table.increments("id");
table.integer("user_id").references("users.id").onDelete("CASCADE");
table.string("name");                           // "Pixel FB - Campanha X"
table.string("type");                           // "facebook" | "google" | "custom"
table.string("pixel_id");                       // ID do pixel
table.text("custom_code").nullable();           // Para pixels customizados

// Tabela link_pixels (N:M)
table.integer("link_id").references("links.id").onDelete("CASCADE");
table.integer("pixel_id").references("pixels.id").onDelete("CASCADE");
```

### Implementação

- Adicionar `pixel_ids` ao formulário de criação de links
- `links.handler.js` → `redirect()`: se link tem pixels, servir página intermediária
- A página intermediária tem os snippets de pixel + redirect automático

---

## Feature 8 — Link Rotation / A-B Testing

**Valor:** Um único slug que rotaciona entre múltiplos destinos. Útil para A/B testing de landing pages.

### Schema

**Migration:** `npm run migrate:make -- link_targets`

```js
// Tabela link_targets (múltiplos destinos por link)
table.increments("id");
table.integer("link_id").references("links.id").onDelete("CASCADE");
table.string("target").notNullable();
table.integer("weight").defaultTo(1);  // peso para distribuição proporcional
table.integer("click_count").defaultTo(0);
```

### Estratégias de rotação

- **Round-robin:** alterna sequencialmente
- **Weighted:** distribuição proporcional pelos pesos
- **A/B:** 50/50 com tracking separado por variante

### UI

- Formulário expandido com "Adicionar destino alternativo"
- Percentual por destino (ex: 70% / 30%)
- Stats por variante na página de analytics

---

## Feature 9 — Bulk Import (CSV)

**Valor:** Importar centenas de links de uma planilha existente.

### Formato CSV esperado

```csv
target,description,custom_slug,utm_source,utm_medium,utm_campaign
https://exemplo.com,Página principal,,google,cpc,black-friday
https://produto.com,Produto X,produto-x,instagram,organic,
```

### Implementação

- Endpoint `POST /api/v2/links/import` (multipart/form-data com arquivo CSV)
- Parser CSV no servidor (sem dependência externa — usar split/parse manual ou `csv-parse`)
- Validação linha a linha com report de erros
- Response com `created`, `errors`, `skipped`

### UI

- Página `/import` com drag-and-drop de CSV
- Preview das primeiras 5 linhas antes de confirmar
- Download do template CSV

---

## Feature 10 — Domain Health Check

**Valor:** Alertar quando links de destino saem do ar (404, timeout, domínio expirado).

### Implementação

- Job no `server/cron.js`: verificar amostra de links a cada 6h
- Para cada link: `fetch(target, { timeout: 5000 })` — verificar status HTTP
- Se status >= 400 ou timeout: marcar `link.health_status = "broken"`
- Enviar email de notificação se `MAIL_ENABLED=true`

### Schema

```js
// Adicionar à tabela links:
table.string("health_status").defaultTo("ok");  // "ok" | "broken" | "unknown"
table.timestamp("health_checked_at").nullable();
```

### UI

- Indicador visual na tabela (ícone verde/vermelho)
- Filtro "Mostrar apenas links quebrados"
- Badge de aviso no dashboard global

---

## Feature 11 — GDPR / Privacy Mode

**Valor:** Conformidade com LGPD/GDPR. Não rastrear IPs, oferecer opt-out.

### Implementação

**Variáveis de ambiente:**
```
ANONYMIZE_IPS=true        # Truncar último octeto do IP antes de armazenar
DO_NOT_TRACK=true         # Respeitar header DNT
GDPR_CONSENT_BANNER=true  # Mostrar banner de consentimento
```

**No handler de visitas:**
```js
// Anonymize IP: 192.168.1.123 → 192.168.1.0
if (env.ANONYMIZE_IPS) {
  const parts = ip.split(".");
  parts[3] = "0";
  ip = parts.join(".");
}

// Respeitar DNT
if (env.DO_NOT_TRACK && req.headers["dnt"] === "1") {
  return; // não registrar a visita
}
```

---

## Feature 12 — SSO via OIDC (já disponível na v3.2.4!)

**Valor:** Login com Google Workspace, Microsoft Azure AD, Keycloak, Auth0.

**Já está implementado no upstream v3.2.4** — apenas precisa ser configurado.

### Variáveis a configurar

```env
OIDC_ENABLED=true
OIDC_ISSUER=https://accounts.google.com
OIDC_CLIENT_ID=seu-client-id.apps.googleusercontent.com
OIDC_CLIENT_SECRET=seu-client-secret
OIDC_SCOPE=openid profile email
OIDC_EMAIL_CLAIM=email

# Opcional: ocultar o formulário de login local
DISALLOW_LOGIN_FORM=true
```

### Provedores testados

| Provedor | OIDC Issuer |
|---|---|
| Google | `https://accounts.google.com` |
| Microsoft | `https://login.microsoftonline.com/{tenant}/v2.0` |
| Keycloak | `https://seu-keycloak.com/realms/seu-realm` |
| Auth0 | `https://seu-tenant.auth0.com` |

**Complexidade: baixa — já está no código, só configurar.**

---

## Feature 13 — N8N Webhook Trigger (real-time)

**Dependência:** Feature 2 (Webhooks de Clique) deve estar implementada.

**O que adiciona ao nó N8N:**
- Trigger `On Link Clicked`: N8N registra uma URL de webhook no Kutt automaticamente
- O Kutt dispara o POST para o N8N a cada clique
- N8N processa o evento e dispara os workflows configurados

**Implementação no nó:**
```typescript
// KuttTrigger.node.ts
// No activate(): registrar webhook via POST /api/v2/webhooks
// No deactivate(): deletar webhook via DELETE /api/v2/webhooks/:id
// No execute(): processar o payload recebido
```

---

## Feature 14 — AI Auto-Tagging

**Valor:** Ao criar um link, sugerir automaticamente tags baseadas na URL de destino (ex: "e-commerce", "landing-page", "produto").

### Abordagem

- Chamar a API do Claude (ou outro modelo) com a URL de destino
- Retornar sugestões de tags
- Usuário confirma/rejeita as sugestões

### Implementação

```js
// server/utils/ai-tags.js
async function suggestTags(targetUrl) {
  // Fetch da URL para extrair título e descrição (meta tags)
  // Enviar para Claude API: "Sugira 3-5 tags curtas para categorizar este link: {url} - {title} - {description}"
  // Retornar array de strings
}
```

**Variáveis de ambiente:**
```
AI_TAGGING_ENABLED=false
ANTHROPIC_API_KEY=
```

---

## Feature 15 — Workspace / Times

**Valor:** Múltiplos usuários colaborando em um mesmo espaço de trabalho compartilhado.

**Complexidade: muito alta.** Requer refatoração profunda do modelo de dados.

### Schema (visão geral)

```js
// Tabela workspaces
table.increments("id");
table.string("name");
table.integer("owner_id").references("users.id");
table.string("plan").defaultTo("free");  // para billing futuro

// Tabela workspace_members
table.integer("workspace_id").references("workspaces.id");
table.integer("user_id").references("users.id");
table.string("role").defaultTo("member");  // "owner" | "admin" | "member"

// Todas as tabelas (links, domains, tags) ganham workspace_id
// Links deixam de ser apenas "do usuário" e passam a ser "do workspace"
```

### Fases de implementação

```
Fase 1: Schema + migration (sem quebrar backward compat)
Fase 2: UI de criação e gerenciamento de workspace
Fase 3: Convites por email (depende de MAIL_ENABLED)
Fase 4: Permissões por role
Fase 5: Billing / limites por plano
```

**Recomendação:** só implementar quando houver demanda real de múltiplos usuários no mesmo ambiente.

---

## Roadmap Visual

```
Curto prazo (próximos 2 meses após Sprint 4)
  ├── Feature 3: QR Code personalizado       [baixa complexidade]
  ├── Feature 4: Expiração por cliques       [baixa complexidade]
  ├── Feature 5: Branded 404 / expired page  [baixa complexidade]
  └── Feature 12: OIDC SSO                   [já implementado, só configurar]

Médio prazo (2-4 meses)
  ├── Feature 1: Tags e grupos               [impacto alto na organização]
  ├── Feature 2: Webhooks de clique          [habilita automações N8N]
  ├── Feature 6: Link preview OG             [experiência de compartilhamento]
  └── Feature 9: Bulk import CSV             [produtividade]

Longo prazo (4-8 meses)
  ├── Feature 7: Pixel de retargeting        [alto valor para marketing]
  ├── Feature 8: Link rotation / A-B         [alto valor para otimização]
  ├── Feature 10: Domain health check        [monitoramento]
  ├── Feature 11: GDPR / Privacy mode        [conformidade]
  └── Feature 13: N8N webhook trigger        [depende da Feature 2]

Futuro distante (quando houver demanda)
  ├── Feature 14: AI auto-tagging
  └── Feature 15: Workspace / Times
```
