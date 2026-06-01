# Arquitetura do Kutt

## Visão Geral do Fluxo

```
Cliente (Browser)
    │
    ▼
Express (server.js)
    ├── /static           → assets estáticos (CSS, JS, fontes)
    ├── /css              → custom/css (override de temas)
    ├── /images           → custom/images (override de logo)
    │
    ├── Helmet (security headers)
    ├── Cookie-parser
    ├── Rate Limiter (opcional, via express-rate-limit)
    ├── Passport.js (JWT + Local + API Key + OIDC)
    │
    ├── GET  /               → renders.routes → homepage.hbs
    ├── GET  /settings       → renders.routes → settings.hbs
    ├── GET  /admin          → renders.routes → admin.hbs
    ├── POST /api/v2/links   → link.routes → links.handler → queries → Knex → DB
    ├── GET  /:id            → links.handler.redirect → Knex → DB → 301 redirect
    └── *                   → 404
```

---

## Camadas da Aplicação

### 1. Entry Point (`server/server.js`)
- Inicializa Express, middlewares globais, Passport
- Registra Handlebars helpers
- Inicia cron jobs apenas na instância 0 (cluster-safe)
- Escuta na porta `PORT`

### 2. Rotas (`server/routes/`)

| Arquivo | Prefixo | Responsabilidade |
|---|---|---|
| `renders.routes.js` | `/` | Renderizar páginas HTML completas |
| `auth.routes.js` | `/api/v2/auth` | Login, registro, OIDC callback |
| `link.routes.js` | `/api/v2/links` | CRUD de links, stats |
| `domain.routes.js` | `/api/v2/domains` | Gerenciamento de domínios customizados |
| `user.routes.js` | `/api/v2/users` | Perfil, API key, alterar email/senha |
| `health.routes.js` | `/api/v2/health` | Health check endpoint |

### 3. Handlers (`server/handlers/`)

| Arquivo | Responsabilidade |
|---|---|
| `auth.handler.js` | Lógica de autenticação (JWT, sessão OIDC) |
| `links.handler.js` | Criação, edição, deleção, redirecionamento e stats |
| `domains.handler.js` | Validação e gestão de domínios personalizados |
| `users.handler.js` | Perfil, senha, API key, email |
| `renders.handler.js` | Renderização das páginas HBS com dados |
| `locals.handler.js` | Injeção de variáveis globais no contexto HBS |
| `helpers.handler.js` | Error handler global e utilitários |
| `validators.handler.js` | Regras de validação express-validator |

### 4. Queries (`server/queries/`)
Funções puras de acesso ao banco usando Knex. Cada entidade tem seu arquivo:
- `link.queries.js` — busca, criação, atualização, contagem de links
- `visit.queries.js` — registro e agregação de visitas/analytics
- `user.queries.js` — busca e gestão de usuários
- `domain.queries.js` — domínios customizados
- `host.queries.js` / `ip.queries.js` — controle de abuso (ban)

### 5. Models (`server/models/`)
Define a estrutura de tabelas usada nas queries. Não é um ORM ActiveRecord — são apenas objetos de configuração para as queries Knex.

### 6. Migrations (`server/migrations/`)
Histórico completo de schema desde 2020. Knex aplica sequencialmente.

```
20200211 → constraints iniciais
20200510 → tabela domains
20200718 → campo description
20200730 → campo expire_in
20200810 → change_email flow
20241103 → user-roles (admin/user)
20241223 → indexes de performance
20241223 → visits.user_id
20241223 → index em visits.user_id
20250106 → remove cooldown
```

### 7. Queues (`server/queues/`)
Bull queue para processar visitas de forma assíncrona (não bloqueia o redirecionamento):
- `queues.js` — inicialização da fila Bull
- `visit.js` — worker que processa cada visita (geo, browser, OS)
- `index.js` — exporta a fila e o worker

### 8. Views (`server/views/`)
Templates Handlebars. Estrutura de partials espelha os módulos:

```
views/
├── layout.hbs              # Layout base (HTML shell, head, scripts)
├── homepage.hbs            # Página inicial com shortener
├── settings.hbs            # Configurações do usuário
├── admin.hbs               # Painel administrativo
├── stats.hbs               # Página de analytics de um link
└── partials/
    ├── header.hbs / footer.hbs
    ├── shortener.hbs       # Formulário de criação de link
    ├── links/              # Tabela de links do usuário (HTMX)
    ├── admin/              # Tabelas admin (links, users, domains)
    ├── settings/           # Seções da página settings
    ├── auth/               # Forms de login/registro
    └── icons/              # SVG icons como partials
```

---

## Padrão HTMX

O frontend usa **HTMX** para atualizar partes da página sem recarregar tudo.

**Fluxo típico:**
1. Usuário clica em "Deletar link"
2. HTMX faz `DELETE /api/v2/links/:id` com `HX-Request: true`
3. Servidor detecta `res.locals.isHTML` (header `HX-Request`)
4. Retorna um fragmento HTML (partial HBS) em vez de JSON
5. HTMX injeta o fragmento no lugar certo do DOM

**Detecção no servidor:**
```js
// locals.handler.js
res.locals.isHTML = req.headers["hx-request"] === "true";
```

Quando `isHTML` é `false` (chamada API tradicional), retorna JSON.

---

## Autenticação

Três estratégias registradas no Passport:

| Estratégia | Uso |
|---|---|
| `jwt` | Todas as rotas autenticadas via `Authorization: Bearer <token>` |
| `local` | Login por email/senha (retorna JWT) |
| `localapikey` | Autenticação via API key (header `X-Api-Key`) |
| `openidconnect` | Login via OIDC provider (ex: Google, Keycloak, Auth0) |

O JWT é armazenado em **cookie** no browser (não localStorage) para segurança XSS.

---

## Banco de Dados

### Schema Principal

```
users
  id, email, password, verified, banned, admin, api_key, created_at, updated_at

links
  id, address (slug), target, domain_id, user_id, description,
  expire_in, password, banned, visit_count, created_at, updated_at

visits
  id, link_id, user_id, referrer, country, browser, os, device, created_at

domains
  id, address, homepage, user_id, banned, created_at, updated_at

hosts / ips
  Tabelas de controle de abuso/ban

knex_migrations
  Controle interno das migrations aplicadas
```

### Multi-banco
O Knex abstrai as diferenças. Partes críticas que divergem entre drivers:
- `string_agg` (Postgres) vs `group_concat` (SQLite/MySQL) para arrays
- Paginação com `offset/limit` é igual em todos
- Tipos de coluna (timestamps, booleans) mapeados pelo Knex

---

## Sistema de Customização

A pasta `custom/` permite branding sem tocar nos arquivos originais:

```
custom/
├── views/      # HBS templates que sobrescrevem server/views/
├── css/        # Arquivos CSS servidos em /css/ (após static/css/)
└── images/     # Imagens servidas em /images/
```

O Express configura a ordem de precedência:
```js
app.set("views", [
  path.join(__dirname, "../custom/views"),  // prioridade alta
  path.join(__dirname, "views"),            // fallback
]);
```

Para customizar cores/estilos, crie `custom/css/custom.css` e inclua-o no `custom/views/layout.hbs`.

---

## Performance e Escalabilidade

- **Redis (opcional):** usado pelo Bull para filas de visitas. Sem Redis, o Bull usa memória local.
- **Rate limiting:** `express-rate-limit` com backend Redis quando disponível.
- **Cluster:** suporta PM2 cluster mode via `NODE_APP_INSTANCE`. Cron só roda na instância 0.
- **Índices de banco:** migration de 2024 adicionou índices de performance em `links` e `visits`.
- **Sem cache de página:** cada request renderiza o HBS dinamicamente. Redis cache de redirecionamentos seria uma melhoria possível.

---

## Pontos de Extensão Identificados

| Área | Oportunidade |
|---|---|
| `custom/views/` | Rebranding completo da UI |
| `custom/css/` | Tema próprio sem modificar `static/css/styles.css` |
| `server/handlers/` | Adicionar lógica de negócio customizada |
| `server/migrations/` | Adicionar campos novos ao schema |
| `server/routes/` | Novos endpoints de API |
| Variáveis de ambiente | Feature flags via `.env` |
| OIDC | Integração com SSO corporativo |
