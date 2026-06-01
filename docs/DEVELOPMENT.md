# Guia de Desenvolvimento

## Pré-requisitos

- Node.js 18+
- npm
- Git
- (Opcional) Redis para filas
- (Opcional) PostgreSQL ou MySQL se não quiser SQLite

---

## Setup Inicial

### 1. Clone e instale dependências

```bash
git clone https://github.com/helbertparanhos/kutt
cd kutt
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .example.env .env
```

Edite o `.env` com os valores mínimos:

```env
JWT_SECRET=sua_chave_super_secreta_aqui
DEFAULT_DOMAIN=localhost:3000
```

Para desenvolvimento local, o restante dos defaults funciona:
- Banco: SQLite em `db/data`
- Redis: desabilitado
- Email: desabilitado
- Registro: bloqueado (você criará o admin no primeiro start)

### 3. Rode as migrations

```bash
npm run migrate
```

### 4. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

O servidor reinicia automaticamente ao salvar arquivos em `./server/` ou `./custom/`.

Na primeira execução, acesse `http://localhost:3000` — o app pedirá para criar um usuário admin.

---

## Desenvolvimento com Docker

### SQLite (mais simples)

```bash
docker compose up
```

### Postgres

```bash
docker compose -f docker-compose.postgres.yml up
```

### SQLite + Redis

```bash
docker compose -f docker-compose.sqlite-redis.yml up
```

---

## Estrutura de Trabalho

### Adicionando uma feature no backend

1. **Migration** (se precisar de novo campo): `npm run migrate:make -- nome_da_migration`
2. **Model** em `server/models/` se precisar novo schema
3. **Query** em `server/queries/` com a lógica SQL
4. **Handler** em `server/handlers/` com a lógica de negócio
5. **Rota** em `server/routes/` para expor o endpoint
6. **Validação** em `server/handlers/validators.handler.js`

### Adicionando ou modificando UI

O frontend usa **HTMX** — não há framework JS nem step de build.

- **Página nova:** crie em `server/views/nome.hbs` e registre a rota em `renders.routes.js`
- **Partial novo:** crie em `server/views/partials/` e use como `{{> partials/nome}}`
- **Customização sem tocar nos originais:** use `custom/views/` e `custom/css/`

Para que um endpoint retorne HTML (HTMX) em vez de JSON:
```js
if (res.locals.isHTML) {
  return res.render("partials/minha/partial", dados);
}
return res.json(dados);
```

### CSS

O arquivo principal é `static/css/styles.css`. Para customizações:
1. Crie `custom/css/custom.css`
2. Inclua no layout: `<link rel="stylesheet" href="/css/custom">`

Variáveis CSS disponíveis (definidas em `:root` em `styles.css`) para override de cores.

---

## Customização de Marca (Branding)

Para personalizar sem conflitos com atualizações futuras do upstream:

### Logo
Coloque sua logo em `custom/images/logo.png` e `custom/images/favicon.ico`

### Tema de cores
Crie `custom/css/custom.css`:
```css
:root {
  --color-primary: #sua-cor;
  --color-bg: #seu-fundo;
}
```

### Layout customizado
Copie `server/views/layout.hbs` para `custom/views/layout.hbs` e edite.

---

## Sincronizar com Upstream

```bash
# Buscar atualizações do projeto original
git fetch upstream

# Ver o que mudou
git log HEAD..upstream/main --oneline

# Fazer merge
git merge upstream/main

# Rodar migrations se houver novas
npm run migrate
```

---

## Deploy no EasyPanel

A instância de produção roda no **EasyPanel** com imagem Docker.

### Atualizar versão
1. No EasyPanel, vá em **Serviço → kutt → Fonte → Imagem Docker**
2. Altere `kutt/kutt:v3.2.3` para `kutt/kutt:v3.2.5`
3. Clique em **Implantar**
4. As migrations rodam automaticamente na inicialização

### Variáveis de ambiente no EasyPanel
Configure todas as variáveis do `.example.env` nas configurações do serviço no EasyPanel.

### Build próprio (fork)
Para usar o código do fork em vez da imagem oficial:
1. Configure o serviço para usar **Dockerfile** em vez de **Imagem Docker**
2. Aponte para o repositório `https://github.com/helbertparanhos/kutt`
3. O `Dockerfile` já está configurado no root do projeto

---

## Depuração

### Logs do servidor
```bash
# Em desenvolvimento
npm run dev
# Logs aparecem no terminal

# Em Docker
docker compose logs -f kutt
```

### Banco de dados SQLite
```bash
# Acessar o banco diretamente (requer sqlite3 instalado)
sqlite3 db/data

# Ver tabelas
.tables

# Ver estrutura
.schema links
```

### Testar endpoints da API
```bash
# Health check
curl http://localhost:3000/api/v2/health

# Login
curl -X POST http://localhost:3000/api/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "senha"}'

# Criar link (com o token retornado pelo login)
curl -X POST http://localhost:3000/api/v2/links \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target": "https://exemplo.com"}'
```

---

## Notas Importantes

- **Sem build step:** qualquer mudança em `server/` é imediata em dev (hot-reload via `--watch-path`)
- **Sem TypeScript:** o projeto usa JSDoc para tipos onde necessário
- **Aspas duplas:** convenção do projeto para strings JS
- **Módulos built-in com prefixo `node:`:** ex. `require("node:fs")` em vez de `require("fs")`
- **Sem linting automatizado:** não há ESLint configurado no upstream
