# Kutt — CLAUDE.md

## Visão Geral

Fork do [thedevs-network/kutt](https://github.com/thedevs-network/kutt) em **v3.2.5**, mantido por [@helbertparanhos](https://github.com/helbertparanhos).

**Instância em produção:** EasyPanel com imagem Docker `kutt/kutt:v3.2.3` (a ser atualizada para v3.2.5).

Kutt é um encurtador de URL self-hosted com painel admin, suporte a domínios personalizados, analytics de visitas, multi-banco de dados (SQLite/PostgreSQL/MySQL) e Redis opcional.

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js (sem build step) |
| Framework | Express 4 |
| Template engine | Handlebars (HBS) |
| Frontend | HTMX + Vanilla JS (sem React, sem TypeScript) |
| ORM | Knex 3 |
| Banco principal | SQLite (better-sqlite3) — Postgres e MySQL/MariaDB suportados |
| Cache/Filas | Bull + Redis (opcional) |
| Auth | Passport.js (JWT, Local, API Key, OIDC) |
| Email | Nodemailer |
| Geo IP | geoip-lite |
| Rate limit | express-rate-limit |

---

## Estrutura de Diretórios

```
kutt/
├── server/                  # Código backend Node.js
│   ├── handlers/            # Lógica de requisição (auth, links, users, domains...)
│   ├── migrations/          # Migrations Knex (histórico completo do schema)
│   ├── models/              # Definição dos modelos de dados
│   ├── queries/             # Funções de acesso ao banco
│   ├── queues/              # Filas Bull para processamento de visitas
│   ├── routes/              # Definição das rotas Express
│   ├── views/               # Templates Handlebars (.hbs)
│   │   └── partials/        # Componentes HBS reutilizáveis
│   ├── mail/                # Templates HTML e lógica de envio de email
│   ├── utils/               # Utilitários e helpers
│   ├── server.js            # Entry point da aplicação
│   ├── env.js               # Definição e validação de variáveis de ambiente
│   ├── cron.js              # Jobs periódicos (apenas no NODE_APP_INSTANCE=0)
│   ├── knex.js              # Instância Knex compartilhada
│   ├── passport.js          # Estratégias de autenticação
│   ├── redis.js             # Cliente Redis
│   └── consts.js            # Constantes globais
├── static/                  # Assets estáticos servidos publicamente
│   ├── css/styles.css       # Estilos principais
│   ├── scripts/             # JS client-side (main.js, stats.js)
│   ├── libs/                # Libs JS (htmx, chart.js, qrcode)
│   ├── images/              # Logos e favicons
│   └── fonts/               # Fontes (Nunito Variable)
├── custom/                  # Pasta de customização (sobrescreve views/css/images)
│   ├── views/               # Views customizadas (prioridade sobre server/views/)
│   ├── css/                 # CSS customizado
│   └── images/              # Imagens customizadas
├── db/                      # Arquivos SQLite (gerado em runtime)
├── docs/                    # Documentação técnica do fork
│   ├── api/                 # Código gerador da doc da API
│   ├── ARCHITECTURE.md      # Arquitetura detalhada
│   ├── CHANGELOG.md         # Histórico de releases upstream + mudanças do fork
│   └── DEVELOPMENT.md       # Guia de desenvolvimento local
├── .example.env             # Exemplo de variáveis de ambiente
├── knexfile.js              # Configuração Knex para migrations CLI
├── package.json             # Dependências e scripts npm
└── CLAUDE.md                # Este arquivo
```

---

## Comandos Principais

```bash
# Desenvolvimento (hot-reload via --watch-path)
npm run dev

# Produção
npm run start

# Rodar migrations
npm run migrate

# Criar nova migration
npm run migrate:make -- nome_da_migration

# Gerar docs da API
npm run docs:build
```

---

## Variáveis de Ambiente Relevantes

| Variável | Default | Descrição |
|---|---|---|
| `PORT` | 3000 | Porta do servidor |
| `SITE_NAME` | Kutt | Nome exibido na UI |
| `DEFAULT_DOMAIN` | localhost:3000 | Domínio base para links gerados |
| `JWT_SECRET` | — | **Obrigatório.** Segredo para tokens JWT |
| `DB_CLIENT` | better-sqlite3 | Driver: `pg`, `better-sqlite3`, `mysql2` |
| `DB_FILENAME` | db/data | Caminho do arquivo SQLite |
| `DB_HOST/PORT/NAME/USER/PASSWORD` | — | Credenciais Postgres/MySQL |
| `REDIS_ENABLED` | false | Ativa Redis para filas e cache |
| `DISALLOW_REGISTRATION` | true | Bloqueia novos cadastros |
| `DISALLOW_ANONYMOUS_LINKS` | true | Exige login para criar links |
| `DISALLOW_LOGIN_FORM` | false | Oculta form de login (para OIDC puro) |
| `OIDC_ENABLED` | false | Ativa autenticação OIDC |
| `OIDC_ISSUER/CLIENT_ID/SECRET` | — | Configurações do provider OIDC |
| `MAIL_ENABLED` | false | Ativa envio de emails |
| `TRUST_PROXY` | true | Respeitar IP do proxy reverso |
| `LINK_LENGTH` | 6 | Tamanho do slug gerado |
| `LINK_CUSTOM_ALPHABET` | alphanum sem ambíguos | Alfabeto para geração de slugs |

> Todas as variáveis aceitam sufixo `_FILE` para ler de arquivo (Docker secrets).

---

## Rotas da API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/v2/auth/login` | Login com email/senha |
| POST | `/api/v2/auth/register` | Cadastro de usuário |
| GET | `/api/v2/links` | Listar links do usuário |
| POST | `/api/v2/links` | Criar link |
| PATCH | `/api/v2/links/:id` | Editar link |
| DELETE | `/api/v2/links/:id` | Deletar link |
| GET | `/api/v2/links/:id/stats` | Estatísticas do link |
| GET | `/api/v2/domains` | Listar domínios personalizados |
| POST | `/api/v2/domains` | Adicionar domínio |
| DELETE | `/api/v2/domains/:id` | Remover domínio |
| GET | `/api/v2/users/me` | Dados do usuário autenticado |
| GET | `/api/v2/health` | Health check |
| GET | `/:id` | Redirecionar link curto |

---

## Customização

O Kutt suporta override sem modificar os arquivos originais:

- **Views:** arquivos em `custom/views/` sobrescrevem os de `server/views/`
- **CSS:** arquivos em `custom/css/` são servidos em `/css/`
- **Imagens:** arquivos em `custom/images/` são servidos em `/images/`

Isso permite branding próprio sem conflitos em futuras atualizações do upstream.

---

## Informações do Fork

| | URL |
|---|---|
| Nosso fork | https://github.com/helbertparanhos/kutt |
| Upstream original | https://github.com/thedevs-network/kutt |

### Sincronizar com upstream
```bash
git fetch upstream
git merge upstream/main
```

---

## O que mudou desde v3.2.3 (versão em produção)

### v3.2.4
- Domínio oficial mudou de `kutt.it` para `kutt.to`
- Adicionado suporte a **autenticação OIDC**
- Permite enviar senha via HTTP Auth em links protegidos
- Adicionado `robots.txt`
- Correção: domínio customizado não aparecia ao editar link
- Correção: valor de autofill em campos de senha

### v3.2.5
- Atualização de pacotes para corrigir vulnerabilidades de segurança

---

## Próximos Passos (Planejado)

Veja [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para análise técnica aprofundada.

---

## Notas de Contexto

- O frontend usa **HTMX** para reatividade — não há React, Next.js ou TypeScript. Respostas parciais HTML são retornadas pelo servidor e injetadas no DOM.
- Não há step de build. O projeto roda direto com `node server/server.js`.
- A pasta `custom/` é o ponto de extensão preferido para customizações específicas da nossa instância.
- Jobs de cron só rodam na instância `NODE_APP_INSTANCE=0` (seguro para PM2 cluster).
