# Store API — Documentação Completa

> Versão 1.0.0 | Base URL: `http://localhost:3001/api/v1`

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Fluxo ERP → API → Loja](#fluxo-erp--api--loja)
3. [Autenticação](#autenticação)
4. [Auth](#auth)
5. [Cadastro de Loja](#cadastro-de-loja)
6. [Loja](#loja)
7. [Produtos](#produtos)
8. [Categorias](#categorias)
9. [Clientes](#clientes)
10. [Pedidos](#pedidos)
11. [Webhook](#webhook)
12. [Admin](#admin)
13. [Erros](#erros)
14. [Exemplos de Integração](#exemplos-de-integração)

---

## Visão Geral

A API é **multi-loja**: cada loja tem seus dados isolados, acessados via `apiKey` ou JWT.

### Arquitetura

```
ERP / Sistema Externo
        │
        │  X-API-Key ou Bearer JWT
        ▼
   Store API (este projeto)
        │
        ├── Admin Global
        │     └── Cria, edita, remove e gerencia todas as lojas
        │
        └── Lojas (isoladas por storeId)
              ├── Produtos
              ├── Categorias
              ├── Clientes
              ├── Pedidos
              └── Webhooks → notifica o ERP em tempo real
```

---

## Fluxo ERP → API → Loja

Este é o fluxo completo de como um ERP se integra com a API:

### Passo 1 — Admin faz login

```http
POST /api/v1/auth/admin/login
Content-Type: application/json

{
  "email": "admin@sistema.com",
  "password": "Admin@123"
}
```

**Resposta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "Admin Master",
    "email": "admin@sistema.com",
    "role": "SUPER_ADMIN"
  }
}
```

Guarde o `token` — ele é usado em todos os endpoints admin.

---

### Passo 2 — Admin cadastra a loja do cliente ERP

```http
POST /api/v1/cadastrar
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Loja ERP Teste",
  "email": "erp@lojateste.com",
  "phone": "(11) 91234-5678",
  "document": "12.345.678/0001-90",
  "description": "Loja integrada via ERP",
  "plan": "PRO",
  "ownerName": "Carlos ERP",
  "ownerEmail": "carlos@lojateste.com",
  "ownerPassword": "Erp@12345",
  "address": {
    "street": "Rua das Flores",
    "number": "123",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-100"
  }
}
```

**Resposta 201:**
```json
{
  "message": "Loja criada com sucesso",
  "store": {
    "id": "83acdfe8-5d29-46fe-b699-c694ea528ac8",
    "name": "Loja ERP Teste",
    "slug": "loja-erp-teste",
    "email": "erp@lojateste.com",
    "apiKey": "uuid-da-api-key",
    "plan": "PRO",
    "owner": {
      "id": "uuid",
      "name": "Carlos ERP",
      "email": "carlos@lojateste.com",
      "role": "OWNER"
    }
  }
}
```

> ⚠️ Guarde a `apiKey` — ela autentica todas as requisições do ERP para esta loja.

---

### Passo 3 — ERP usa a apiKey para operar

A partir daqui, o ERP usa o header `X-API-Key` em todas as requisições:

```http
X-API-Key: uuid-da-api-key
```

---

### Passo 4 — ERP sincroniza categorias e produtos

```http
POST /api/v1/categorias
X-API-Key: uuid-da-api-key
Content-Type: application/json

{ "name": "Eletrônicos", "description": "Produtos eletrônicos", "sortOrder": 1 }
```

```http
POST /api/v1/produtos
X-API-Key: uuid-da-api-key
Content-Type: application/json

{
  "name": "Smartphone XYZ",
  "price": 1999.90,
  "sku": "SMART-XYZ-001",
  "stock": 50,
  "categoryId": "id-da-categoria"
}
```

---

### Passo 5 — ERP recebe pedidos via webhook

Configure a URL do ERP para receber notificações:

```http
POST /api/v1/webhook/configurar
X-API-Key: uuid-da-api-key
Content-Type: application/json

{ "webhookUrl": "https://meu-erp.com/api/webhook" }
```

A partir daí, toda vez que um pedido for criado ou atualizado, a API dispara automaticamente para o ERP:

```json
{
  "event": "order.created",
  "storeId": "83acdfe8-5d29-46fe-b699-c694ea528ac8",
  "timestamp": "2026-05-22T23:04:51.000Z",
  "data": {
    "id": "uuid",
    "orderNumber": "#000001",
    "status": "PENDING",
    "total": 3969.80,
    "customer": { "name": "João da Silva", "email": "joao@cliente.com" },
    "items": [...]
  }
}
```

---

### Passo 6 — ERP atualiza status dos pedidos

```http
PATCH /api/v1/pedidos/:id/status
X-API-Key: uuid-da-api-key
Content-Type: application/json

{ "status": "SHIPPED" }
```

```http
PATCH /api/v1/pedidos/:id/pagamento
X-API-Key: uuid-da-api-key
Content-Type: application/json

{ "paymentStatus": "PAID", "paymentMethod": "pix" }
```

---

## Autenticação

### Tipos de autenticação

| Tipo | Header | Quem usa |
|------|--------|----------|
| JWT Admin | `Authorization: Bearer <token>` | Painel admin |
| JWT Loja | `Authorization: Bearer <token>` | Usuários da loja (painel) |
| API Key | `X-API-Key: <apiKey>` | ERP / integrações externas |

O middleware `authenticateStore` aceita qualquer um dos três. Admin tem acesso a todos os recursos.

---

## Auth

### `POST /auth/admin/login`
Login do administrador global.

**Body:**
```json
{ "email": "admin@sistema.com", "password": "Admin@123" }
```

---

### `POST /auth/loja/login`
Login do usuário de uma loja específica (para painel da loja).

**Body:**
```json
{
  "email": "carlos@lojateste.com",
  "password": "Erp@12345",
  "storeSlug": "loja-erp-teste"
}
```

**Resposta:**
```json
{
  "token": "eyJ...",
  "user": { "id": "uuid", "name": "Carlos ERP", "role": "OWNER" },
  "store": { "id": "uuid", "name": "Loja ERP Teste", "slug": "loja-erp-teste" }
}
```

---

### `GET /auth/me`
Retorna dados do usuário autenticado. Requer `Bearer token`.

---

## Cadastro de Loja

### `POST /cadastrar`
Cria uma nova loja. **Requer JWT de admin.**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ✅ | Nome da loja |
| `email` | string | ✅ | Email da loja |
| `ownerName` | string | ✅ | Nome do responsável |
| `ownerEmail` | string | ✅ | Email do responsável |
| `ownerPassword` | string | ✅ | Senha (mín. 8 chars) |
| `phone` | string | — | Telefone |
| `document` | string | — | CNPJ/CPF |
| `description` | string | — | Descrição |
| `plan` | enum | — | `FREE`, `BASIC`, `PRO`, `ENTERPRISE` |
| `address` | object | — | Endereço completo |

---

## Loja

### `GET /loja`
Retorna dados da loja autenticada (via `X-API-Key` ou JWT da loja).

### `GET /loja/:storeId`
Busca loja por ID. **Admin only.**

### `PUT /loja/:storeId`
Atualiza dados da loja.

```json
{
  "name": "Novo Nome",
  "phone": "(11) 88888-8888",
  "description": "Nova descrição",
  "webhookUrl": "https://meu-erp.com/webhook",
  "settings": { "primaryColor": "#FF6B35" }
}
```

### `POST /loja/:storeId/regenerar-api-key`
Gera uma nova API Key. **Admin only.**

> ⚠️ A API Key antiga para de funcionar imediatamente.

### Usuários da Loja

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/loja/:storeId/usuarios` | Listar usuários |
| POST | `/loja/:storeId/usuarios` | Criar usuário |
| PUT | `/loja/:storeId/usuarios/:userId` | Atualizar usuário |
| DELETE | `/loja/:storeId/usuarios/:userId` | Desativar usuário |

**Roles:** `OWNER`, `MANAGER`, `OPERATOR`

---

## Produtos

Todos os endpoints requerem `X-API-Key` ou JWT da loja.

### `GET /produtos`
Lista produtos com paginação e filtros.

| Param | Tipo | Descrição |
|-------|------|-----------|
| `page` | int | Página (default: 1) |
| `limit` | int | Itens por página (default: 20, max: 100) |
| `search` | string | Busca em nome, SKU e descrição |
| `categoryId` | uuid | Filtrar por categoria |
| `active` | boolean | Filtrar por status |
| `featured` | boolean | Filtrar destaques |

### `GET /produtos/:id`
Busca produto por ID.

### `POST /produtos`
Cria produto.

```json
{
  "name": "Smartphone XYZ",
  "description": "Smartphone top de linha",
  "price": 1999.90,
  "comparePrice": 2499.90,
  "cost": 800.00,
  "sku": "SMART-XYZ-001",
  "stock": 50,
  "trackStock": true,
  "categoryId": "uuid-da-categoria",
  "images": ["https://cdn.loja.com/produto.jpg"],
  "attributes": { "cores": ["preto", "branco"], "tamanhos": ["P", "M", "G"] },
  "featured": true
}
```

### `PUT /produtos/:id`
Atualiza produto.

### `DELETE /produtos/:id`
Desativa produto (soft delete).

### `PATCH /produtos/:id/estoque`
Atualiza estoque.

```json
{ "quantity": 10, "operation": "increment" }
```

**Operações:** `set` (define), `increment` (adiciona), `decrement` (subtrai, mínimo 0)

---

## Categorias

Todos os endpoints requerem `X-API-Key` ou JWT da loja.

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/categorias` | Listar (com contagem de produtos) |
| POST | `/categorias` | Criar |
| GET | `/categorias/:id` | Buscar (inclui produtos ativos) |
| PUT | `/categorias/:id` | Atualizar |
| DELETE | `/categorias/:id` | Desativar |

**Body para criar/atualizar:**
```json
{
  "name": "Eletrônicos",
  "description": "Produtos eletrônicos",
  "image": "https://cdn.loja.com/eletronicos.jpg",
  "sortOrder": 1
}
```

---

## Clientes

Todos os endpoints requerem `X-API-Key` ou JWT da loja.

### `GET /clientes`
Lista clientes. Filtros: `search` (nome, email, documento, telefone), `page`, `limit`.

### `GET /clientes/:id`
Busca cliente por ID.

### `POST /clientes`
Cria cliente.

```json
{
  "name": "João da Silva",
  "email": "joao@cliente.com",
  "phone": "(11) 98765-4321",
  "document": "123.456.789-00",
  "birthDate": "1990-05-15T00:00:00.000Z",
  "addresses": [
    {
      "label": "Casa",
      "street": "Rua das Flores",
      "number": "123",
      "complement": "Apto 4",
      "neighborhood": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01310-100",
      "isDefault": true
    }
  ]
}
```

### `PUT /clientes/:id`
Atualiza cliente.

### `DELETE /clientes/:id`
Desativa cliente.

### `GET /clientes/:id/pedidos`
Histórico de pedidos do cliente (paginado).

---

## Pedidos

Todos os endpoints requerem `X-API-Key` ou JWT da loja.

### `GET /pedidos`
Lista pedidos com filtros.

| Param | Tipo | Descrição |
|-------|------|-----------|
| `status` | enum | Status do pedido |
| `paymentStatus` | enum | Status do pagamento |
| `customerId` | uuid | Filtrar por cliente |
| `search` | string | Busca por número do pedido |
| `page` / `limit` | int | Paginação |

### `GET /pedidos/:id`
Busca pedido por ID (inclui cliente e itens com produto).

### `POST /pedidos`
Cria pedido. O número do pedido (`#000001`, `#000002`...) é gerado automaticamente.

```json
{
  "customerId": "uuid-do-cliente",
  "items": [
    {
      "productId": "uuid-do-produto",
      "name": "Smartphone XYZ",
      "sku": "SMART-XYZ-001",
      "price": 1999.90,
      "quantity": 2,
      "attributes": { "cor": "preto" }
    }
  ],
  "paymentMethod": "pix",
  "discount": 50.00,
  "shipping": 20.00,
  "notes": "Entregar no período da tarde",
  "shippingAddress": {
    "street": "Rua das Flores",
    "number": "123",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-100"
  }
}
```

> O `subtotal` e `total` são calculados automaticamente pela API.

### `PATCH /pedidos/:id/status`
Atualiza status do pedido.

```json
{ "status": "SHIPPED" }
```

**Status disponíveis:**

| Status | Descrição |
|--------|-----------|
| `PENDING` | Aguardando confirmação |
| `CONFIRMED` | Confirmado |
| `PROCESSING` | Em processamento |
| `SHIPPED` | Enviado |
| `DELIVERED` | Entregue |
| `CANCELLED` | Cancelado |
| `REFUNDED` | Reembolsado |

### `PATCH /pedidos/:id/pagamento`
Atualiza status de pagamento.

```json
{ "paymentStatus": "PAID", "paymentMethod": "pix" }
```

**Status de pagamento:** `PENDING`, `PAID`, `FAILED`, `REFUNDED`, `CANCELLED`

### `POST /pedidos/:id/cancelar`
Cancela o pedido. Não é possível cancelar pedidos com status `DELIVERED`, `CANCELLED` ou `REFUNDED`.

---

## Webhook

O ERP configura uma URL e recebe notificações automáticas a cada evento relevante.

### `POST /webhook/configurar`
Define a URL que receberá os eventos.

```json
{ "webhookUrl": "https://meu-erp.com/api/webhook" }
```

### `POST /webhook/testar`
Envia um evento de teste para a URL configurada.

### `GET /webhook/logs`
Histórico de disparos. Filtros: `event`, `page`, `limit`.

### `GET /webhook/eventos`
Lista todos os eventos disponíveis.

### Eventos disponíveis

| Evento | Quando dispara |
|--------|----------------|
| `order.created` | Novo pedido criado |
| `order.status_changed` | Status do pedido alterado |
| `order.payment_updated` | Pagamento atualizado |
| `order.cancelled` | Pedido cancelado |
| `product.created` | Produto criado |
| `product.updated` | Produto atualizado |
| `product.stock_updated` | Estoque atualizado |
| `customer.created` | Cliente criado |
| `customer.updated` | Cliente atualizado |

### Payload recebido pelo ERP

```json
{
  "event": "order.created",
  "storeId": "uuid-da-loja",
  "timestamp": "2026-05-22T23:04:51.000Z",
  "data": { ... }
}
```

O ERP deve responder com `HTTP 200` para confirmar o recebimento.

---

## Admin

Todos os endpoints requerem `Authorization: Bearer <admin-token>`.

### `GET /admin/dashboard`
Métricas gerais do sistema.

**Resposta:**
```json
{
  "summary": {
    "totalStores": 3,
    "activeStores": 3,
    "inactiveStores": 0,
    "totalOrders": 3,
    "totalCustomers": 3,
    "totalProducts": 4
  },
  "storesByPlan": [{ "plan": "PRO", "count": 2 }],
  "recentOrders": [...]
}
```

### `GET /admin/lojas`
Lista todas as lojas. Filtros: `search`, `plan`, `active`, `page`, `limit`.

### `GET /admin/lojas/:storeId`
Detalhes de uma loja (inclui usuários e contagens).

### `PATCH /admin/lojas/:storeId/status`
Ativa ou desativa uma loja.

### `PATCH /admin/lojas/:storeId/plano`
Altera o plano da loja.

```json
{ "plan": "ENTERPRISE" }
```

**Planos:** `FREE`, `BASIC`, `PRO`, `ENTERPRISE`

### Administradores

| Método | Endpoint | Permissão | Descrição |
|--------|----------|-----------|-----------|
| GET | `/admin/usuarios` | ADMIN | Listar admins |
| POST | `/admin/usuarios` | SUPER_ADMIN | Criar admin |
| PUT | `/admin/usuarios/:id` | SUPER_ADMIN | Atualizar admin |
| DELETE | `/admin/usuarios/:id` | SUPER_ADMIN | Desativar admin |

### `GET /admin/relatorios/pedidos`
Relatório de pedidos por período.

| Param | Tipo | Descrição |
|-------|------|-----------|
| `from` | ISO date | Data inicial |
| `to` | ISO date | Data final |
| `storeId` | uuid | Filtrar por loja |

### `GET /admin/relatorios/lojas`
Ranking de lojas por volume de pedidos.

---

## Erros

### Formato padrão

```json
{
  "error": "Mensagem do erro",
  "details": [
    { "field": "email", "message": "Email inválido" }
  ]
}
```

### Códigos HTTP

| Código | Significado |
|--------|-------------|
| 200 | Sucesso |
| 201 | Criado |
| 400 | Dados inválidos |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Não encontrado |
| 409 | Conflito (duplicado) |
| 422 | Validação falhou |
| 429 | Rate limit excedido |
| 500 | Erro interno |

---

## Exemplos de Integração

### ERP em Node.js / TypeScript

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
  headers: { 'X-API-Key': 'sua-api-key-aqui' },
});

// Sincronizar produto do ERP para a API
async function sincronizarProduto(produto: any) {
  const { data } = await api.post('/produtos', {
    name: produto.nome,
    sku: produto.codigo,
    price: produto.preco,
    stock: produto.estoque,
    categoryId: produto.categoriaId,
  });
  return data;
}

// Atualizar estoque após venda
async function atualizarEstoque(produtoId: string, quantidade: number) {
  await api.patch(`/produtos/${produtoId}/estoque`, {
    quantity: quantidade,
    operation: 'decrement',
  });
}

// Receber webhook do pedido
app.post('/webhook', express.json(), (req, res) => {
  const { event, data } = req.body;

  if (event === 'order.created') {
    // Importar pedido no ERP
    importarPedido(data);
  }

  if (event === 'order.status_changed') {
    // Atualizar status no ERP
    atualizarStatusPedido(data.id, data.status);
  }

  res.status(200).json({ received: true });
});
```

### Admin Panel em Next.js

```typescript
// services/api.ts
const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Login
const login = async (email: string, password: string) => {
  const { data } = await adminApi.post('/auth/admin/login', { email, password });
  localStorage.setItem('admin_token', data.token);
  return data;
};

// Criar loja para novo cliente ERP
const criarLoja = async (dados: any) => {
  const { data } = await adminApi.post('/cadastrar', dados);
  return data.store; // contém a apiKey para entregar ao cliente
};
```

---

## Notas Técnicas

### Banco de Dados

Suporta **SQLite** (desenvolvimento) e **PostgreSQL** (produção).

Para PostgreSQL, altere `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Soft Delete

Produtos, categorias, clientes e usuários não são deletados fisicamente — o campo `active` é definido como `false`. Para listar apenas registros ativos, use `?active=true`.

### Isolamento entre lojas

Todos os recursos são filtrados por `storeId`. Um usuário de uma loja não acessa dados de outra — retorna `403`.

### Rate Limit

100 requisições por 15 minutos por IP (configurável via `.env`).

### Documentação Interativa

Acesse `http://localhost:3001/api/v1/docs` para o Swagger com todos os endpoints testáveis.
