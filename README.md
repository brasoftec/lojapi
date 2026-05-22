# lojapi

API REST multi-loja para integração com ERPs e painéis administrativos.

**Stack:** Node.js · Express · TypeScript · Prisma · PostgreSQL · JWT · Swagger · Docker

---

## Início Rápido

### Com Docker (recomendado)

```bash
# 1. Clone o repositório
git clone https://github.com/brasoftec/lojapi.git
cd lojapi

# 2. Configure as variáveis de ambiente
cp .env.docker .env
# Edite o .env se necessário (JWT_SECRET em produção!)

# 3. Suba os containers
docker-compose up -d

# 4. Rode o seed (dados iniciais)
docker exec lojapi npx prisma db seed
```

Serviços disponíveis:

| Serviço | URL |
|---------|-----|
| API | http://localhost:3001 |
| Swagger Docs | http://localhost:3001/api/v1/docs |
| Status | http://localhost:3001/status |
| Adminer (banco) | http://localhost:8080 |

---

### Sem Docker (desenvolvimento local)

```bash
npm install
cp .env.example .env
# Configure DATABASE_URL no .env

npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

---

## Credenciais Padrão (após seed)

| Tipo | Email | Senha |
|------|-------|-------|
| Admin | admin@sistema.com | Admin@123 |
| Loja Owner | owner@lojademo.com | Loja@123 |

---

## Fluxo ERP

```
1. Admin faz login          → POST /api/v1/auth/admin/login
2. Admin cadastra loja      → POST /api/v1/cadastrar  (recebe apiKey)
3. ERP usa apiKey           → Header: X-API-Key: <apiKey>
4. ERP sincroniza produtos  → POST /api/v1/produtos
5. ERP recebe pedidos       → webhook automático → POST <webhookUrl>
6. ERP atualiza status      → PATCH /api/v1/pedidos/:id/status
```

---

## Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v1/auth/admin/login` | Login admin |
| POST | `/api/v1/auth/loja/login` | Login loja |
| POST | `/api/v1/cadastrar` | Cadastrar loja (admin) |
| GET | `/api/v1/loja` | Dados da loja |
| GET/POST | `/api/v1/produtos` | Produtos |
| GET/POST | `/api/v1/categorias` | Categorias |
| GET/POST | `/api/v1/clientes` | Clientes |
| GET/POST | `/api/v1/pedidos` | Pedidos |
| POST | `/api/v1/webhook/configurar` | Configurar webhook |
| GET | `/api/v1/admin/dashboard` | Dashboard admin |

Documentação completa: [`docs/API.md`](docs/API.md) ou Swagger em `/api/v1/docs`.

---

## Autenticação

| Contexto | Header |
|----------|--------|
| Admin | `Authorization: Bearer <token>` |
| Loja (JWT) | `Authorization: Bearer <token>` |
| Loja (API Key) | `X-API-Key: <apiKey>` |

---

## Comandos Docker Úteis

```bash
# Ver logs da API
docker logs lojapi -f

# Rodar migrations manualmente
docker exec lojapi npx prisma migrate deploy

# Acessar o banco via Adminer
# http://localhost:8080
# Sistema: PostgreSQL | Servidor: postgres | Usuário: lojapi | Senha: lojapi | Banco: lojapi

# Parar tudo
docker-compose down

# Parar e remover volumes (apaga o banco)
docker-compose down -v
```

---

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | URL do banco | PostgreSQL local |
| `JWT_SECRET` | Chave JWT | — (obrigatório) |
| `JWT_EXPIRES_IN` | Expiração do token | `7d` |
| `PORT` | Porta da API | `3001` |
| `NODE_ENV` | Ambiente | `production` |
| `CORS_ORIGIN` | Origens permitidas | `*` |
| `RATE_LIMIT_MAX` | Req. por janela | `100` |
