# Changelog

## Fork — helbertparanhos/kutt

> Mudanças específicas deste fork em relação ao upstream.

### [Unreleased]
- Setup inicial do fork
- Adicionado CLAUDE.md, docs/ARCHITECTURE.md, docs/CHANGELOG.md, docs/DEVELOPMENT.md

---

## Upstream — thedevs-network/kutt

### v3.2.5 — 2026-05-17
- Atualização de pacotes para corrigir vulnerabilidades de segurança
- Ver detalhes completos em [v3.2.4](#v324--2026-05-17)

### v3.2.4 — 2026-05-17

> **AVISO IMPORTANTE:** O domínio `kutt.it` foi tomado do time original pelo registrador italiano e transferido para terceiros. O domínio oficial agora é **kutt.to**. Não use `kutt.it`.

**Mudanças:**
- Atualização de todas as referências de `kutt.it` para `kutt.to`
- Adicionado suporte a autenticação **OIDC** (OpenID Connect)
- Permite enviar senha de links protegidos via parâmetro HTTP Auth
- Adicionado `robots.txt`
- Correção: domínio customizado não aparecia na tabela ao editar um link
- Correção: valor incorreto de autofill em campos de senha

### v3.2.3 — 2025-02-06
> **Versão atualmente em produção no EasyPanel**

- Variáveis de ambiente podem ser lidas de arquivos usando `<VARIAVEL>_FILE`
  - Útil para Docker secrets
  - Exemplo: `JWT_SECRET_FILE=/run/secrets/jwt_secret`

### v3.2.2 — 2025-01-24
- Adicionado `better-sqlite3` e `DB_FILENAME` ao `.example.env`

### v3.2.1 — 2025-01-22
- Correção: botão de envio não aparecia no Safari

### v3.2.0 — 2025-01-22
**Breaking change:** Driver SQLite padrão mudou de `sqlite3` para `better-sqlite3`.
- Se você definiu `DB_CLIENT=sqlite3` manualmente, altere para `better-sqlite3` ou reinstale o driver `sqlite3` separadamente
- Removidas dependências: `cross-env`, `node-cron`, `uuid`, `node-mailer` (não confundir com `nodemailer`)
- `node-cron` substituído por `setInterval()` nativo
- `uuid` substituído por `crypto.randomUUID()` nativo
- Padronizado uso de `node:` prefix em módulos built-in
- Padronizado para aspas duplas em todo o código
- Removidas importações não utilizadas
- Correção: erro ao solicitar reset de senha para email inexistente

### v3.1.2 — 2025-01-21
- Correção: campo `link` ausente nas respostas da API (issue #795)

### v3.1.1 — 2025-01-18
- Correção: busca em tabelas de links/users/domínios no SQLite e MySQL
- Garantia que `JWT_SECRET` não seja vazio
- Adicionado valor padrão de `MAIL_PORT` no `.example.env`
- Micro-otimização: `count(*)` no lugar de `count(id)`

### v3.1.0 — 2025-01-17
- **Temas e customizações:** suporte à pasta `custom/` para sobrescrever views, CSS e imagens
- Nova variável `LINK_CUSTOM_ALPHABET` para alfabeto personalizado de slugs
- Nova variável `TRUST_PROXY` para configurar proxy reverso
- Correção: domain address vazio ao editar link
- Correção: erro ao editar link como admin
- **Breaking:** nome do volume Docker SQLite-Redis mudou de `db-data` para `db_data_sqlite`
- Adicionada pasta `custom` aos volumes do Docker compose
- Adicionado `DB_PORT` padrão no compose Postgres
- Removidas imagens Docker não utilizadas
- Adicionado "powered by Kutt" no footer
- Logo principal alterada de SVG para PNG
- Mais variáveis CSS para facilitar customização de cores

### v3.1.1 — 2025-01-21 (hotfix)
- Correção: campo `link` ausente nas respostas da API

### v3.0.4 — 2025-01-14
- Correção: erro com função `string_agg` desconhecida no MySQL/MariaDB

### v3.0.3 — 2025-01-11
- Adicionado build ARM64 para Docker
- Correção: mostrando `localhost` como domínio ao editar link

### v3.0.2 — 2025-01-09
- Correção: problema de migration em `visits.user_id` quando não havia visitas

### v3.0.1 — 2025-01-09
- Correção: problemas de migration para Postgres

### v3.0.0 — 2025-01-08
**Rewrite completo da v2.x**

Principais mudanças arquiteturais:
- Removido React e Next.js
- Removido TypeScript
- Removido qualquer step de build
- Removido Google Analytics e reCaptcha
- Início zero-config (cria admin na primeira execução)
- Suporte a SQLite e MySQL/MariaDB (além de Postgres)
- Postgres agora opcional (padrão: SQLite)
- Redis opcional
- Email opcional
- Painel admin para gerenciar links, users e domínios
- Índices e otimizações de performance no banco
- Disable de registro e links anônimos refletidos no frontend
- Formulário de reset de senha
- Rate limits em algumas rotas de API
- Várias correções de bugs

---

## Migração de v2.x para v3.x

Se precisar migrar uma instância v2:
1. Faça backup do banco de dados
2. Merge das mudanças
3. Execute os scripts de migration do banco
4. Verifique as variáveis de ambiente — `DB_CLIENT` é nova, defina como `pg` se já usa Postgres
5. Remova variáveis obsoletas do `.env`
6. Se tinha `ADMIN_EMAILS`, mantenha até a migration criar os usuários admin, depois pode remover
