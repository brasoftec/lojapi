# lojapi

API REST multi-loja para integração com ERPs e painéis administrativos.

**Stack:** Node.js · Express · TypeScript · Prisma · PostgreSQL · JWT · Swagger · Docker

**Produção:** https://api.ofertatop.com.br
**Swagger:** https://api.ofertatop.com.br/api/v1/docs
**Repositório:** https://github.com/brasoftec/lojapi

---

## Início Rápido

### Com Docker (recomendado)

```bash
git clone https://github.com/brasoftec/lojapi.git
cd lojapi

cp .env.docker .env
# Edite JWT_SECRET em produção!

docker-compose up -d
docker exec lojapi node dist/seed.js
```

| Serviço | URL |
|---------|-----|
| API | http://localhost:3001 |
| Swagger | http://localhost:3001/api/v1/docs |
| Status | http://localhost:3001/status |
| Adminer | http://localhost:8080 |

---

### Desenvolvimento local (SQLite)

```bash
npm install
cp .env.example .env

npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

---

## Credenciais padrão (após seed)

| Tipo | Email | Senha |
|------|-------|-------|
| Admin | admin@sistema.com | Admin@123 |
| Loja Owner | owner@lojademo.com | Loja@123 |

---

## Fluxo ERP

```
1. Admin faz login              → POST /api/v1/auth/admin/login
2. Admin cadastra loja          → POST /api/v1/cadastrar  (recebe apiKey)
3. ERP gera token de integração → POST /api/v1/tokens
4. ERP copia .env               → GET  /api/v1/tokens/env
5. ERP sincroniza produtos      → POST /api/v1/produtos
6. ERP configura webhook        → POST /api/v1/webhook/configurar
7. API notifica ERP             → POST <webhookUrl> (automático)
8. ERP atualiza status          → PATCH /api/v1/pedidos/:id/status
```

---

## Endpoints principais

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
| POST | `/api/v1/tokens` | Gerar token ERP |
| GET | `/api/v1/tokens/env` | .env pronto para ERP |
| POST | `/api/v1/webhook/configurar` | Configurar webhook |
| GET | `/api/v1/admin/dashboard` | Dashboard admin |

Documentação completa: [`docs/API.md`](docs/API.md)

---

## Autenticação

| Contexto | Header |
|----------|--------|
| Admin | `Authorization: Bearer <token>` |
| Loja (JWT) | `Authorization: Bearer <token>` |
| Loja / ERP (API Key) | `X-API-Key: <apiKey ou lojapi_...>` |

---

## Comandos Docker

```bash
# Logs da API
docker logs lojapi -f

# Migrations
docker exec lojapi npx prisma migrate deploy

# Seed
docker exec lojapi node dist/seed.js

# Parar
docker-compose down

# Parar e apagar banco
docker-compose down -v
```

---

## Variáveis de ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | URL do banco | PostgreSQL local |
| `JWT_SECRET` | Chave JWT | — obrigatório |
| `JWT_EXPIRES_IN` | Expiração do token | `7d` |
| `PORT` | Porta da API | `3001` |
| `NODE_ENV` | Ambiente | `production` |
| `CORS_ORIGIN` | Origens permitidas | `*` |
| `RATE_LIMIT_MAX` | Req. por janela | `100` |

---

## Infraestrutura de produção

| Recurso | Detalhe |
|---------|---------|
| API | Azure Container Apps — Brazil South |
| Banco | PostgreSQL 16 Flexible Server (Azure) |
| Registry | `lojapiregistry.azurecr.io` |
| SSL | Certificado gerenciado Azure (Let's Encrypt) |
| Worker | Cloudflare Worker `lojapi-worker.brasoftec.workers.dev` |
| CI/CD | GitHub Actions — build + deploy a cada push na `main` |
