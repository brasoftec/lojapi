# lojapi — Guia de Integração para ERPs

> **Base URL:** `https://api.ofertatop.com.br/api/v1`
> **Swagger interativo:** `https://api.ofertatop.com.br/api/v1/docs`
> **Versão:** 1.0.0

---

## O que é a lojapi?

A lojapi é uma plataforma multi-loja. Nós criamos e gerenciamos lojas para nossos clientes. Cada loja tem seus dados completamente isolados.

**Seu ERP se integra com a nossa API para:**
- Gerenciar o catálogo de produtos e categorias da loja
- Consultar e criar clientes
- Receber novos pedidos em tempo real via webhook
- Atualizar status de pedidos e pagamentos
- Consultar relatórios e métricas

---

## Índice

1. [Como funciona a integração](#como-funciona-a-integração)
2. [Passo a passo — primeiros passos](#passo-a-passo--primeiros-passos)
3. [Autenticação](#autenticação)
4. [Gerenciar Produtos](#gerenciar-produtos)
5. [Gerenciar Categorias](#gerenciar-categorias)
6. [Gerenciar Clientes](#gerenciar-clientes)
7. [Gerenciar Pedidos](#gerenciar-pedidos)
8. [Receber Pedidos via Webhook](#receber-pedidos-via-webhook)
9. [Dados da Loja](#dados-da-loja)
10. [Referência de Endpoints](#referência-de-endpoints)
11. [Erros](#erros)

---

## Como funciona a integração

```
┌─────────────────────────────────────────────────────────┐
│                    SEU ERP                              │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Produtos │  │ Clientes │  │ Pedidos  │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
└───────┼─────────────┼─────────────┼─────────────────────┘
        │             │             │
        │   X-API-Key: tk-ot...bra  │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────┐
│              lojapi — api.ofertatop.com.br              │
│                                                         │
│         Loja A    │    Loja B    │    Loja C            │
│    (seus dados)   │ (isolada)    │  (isolada)           │
└─────────────────────────────────────────────────────────┘
        │
        │  Webhook automático
        ▼
┌───────────────┐
│  SEU ERP      │  ← recebe order.created, status_changed, etc.
│  /webhook     │
└───────────────┘
```

**Cada loja tem sua própria `X-API-Key`.** O ERP usa uma chave diferente para cada loja que gerencia.

---

## Passo a passo — primeiros passos

### 1. Solicitar acesso

Entre em contato com a equipe lojapi. Nós criamos a loja para você e enviamos as credenciais de acesso ao **Developer Portal**:

```
URL do portal:  https://api.ofertatop.com.br/dev
Email:          fornecido pela equipe lojapi
Senha:          fornecida pela equipe lojapi
Slug da loja:   fornecido pela equipe lojapi
```

> Não há cadastro público. O acesso é criado pela equipe lojapi.

---

### 2. Acessar o Developer Portal

Acesse **https://api.ofertatop.com.br/dev**, faça login com as credenciais recebidas e:

- Gere um **Token ERP** na aba "Tokens ERP"
- Copie o bloco **.env** na aba "Variáveis .env"
- Configure a **URL do webhook** na aba "Webhook"

---

### 3. Configurar o ERP

Cole as variáveis no `.env` do seu ERP:

```
LOJAPI_BASE_URL=https://api.ofertatop.com.br/api/v1
LOJAPI_API_KEY=tk-ot<chave-gerada-no-portal>bra
LOJAPI_STORE_ID=uuid-da-loja
LOJAPI_STORE_SLUG=nome-da-loja
```

---

### 4. Testar a conexão

```bash
curl https://api.ofertatop.com.br/api/v1/loja \
  -H "X-API-Key: tk-ot<sua-chave>bra"
```

Resposta esperada:
```json
{
  "id": "uuid",
  "name": "Nome da Loja",
  "slug": "nome-da-loja",
  "plan": "PRO",
  "active": true
}
```

---

### 5. Sincronizar o catálogo

Envie os produtos do seu ERP para a loja:

```bash
curl -X POST https://api.ofertatop.com.br/api/v1/produtos \
  -H "X-API-Key: tk-ot<sua-chave>bra" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Produto Exemplo",
    "price": 99.90,
    "sku": "PROD-001",
    "stock": 50
  }'
```

---

### 6. Pronto — receba pedidos

A partir daqui, quando um pedido for criado na loja, seu ERP recebe automaticamente via webhook e pode atualizar o status conforme o processamento.

---

## Autenticação

Todas as requisições do ERP usam o header `X-API-Key`:

```
X-API-Key: tk-ot<chave>bra
```

O token é único por loja. Se você gerencia múltiplas lojas, cada uma tem seu próprio token.

### Tokens de Integração

Você pode criar tokens com nome e data de expiração para organizar melhor suas integrações:

**Gerar token:**
```bash
curl -X POST https://api.ofertatop.com.br/api/v1/tokens \
  -H "X-API-Key: tk-ot<chave-atual>bra" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ERP Principal",
    "expiresInDays": 365
  }'
```

**Resposta:**
```json
{
  "integration": {
    "id": "uuid",
    "name": "ERP Principal",
    "token": "tk-ot4b73fdf293fc4d599e481d5fe4fc7d8172b56eb22fed4fe9bra",
    "expiresAt": "2027-05-23T00:00:00.000Z"
  },
  "usage": {
    "header": "X-API-Key",
    "value": "tk-ot4b73fdf293fc4d599e481d5fe4fc7d8172b56eb22fed4fe9bra",
    "example": {
      "dotenv": "LOJAPI_API_KEY=tk-ot4b73fdf293fc4d599e481d5fe4fc7d8172b56eb22fed4fe9bra\nLOJAPI_BASE_URL=https://api.ofertatop.com.br/api/v1"
    }
  }
}
```

**Obter variáveis prontas para o .env:**
```bash
curl https://api.ofertatop.com.br/api/v1/tokens/env \
  -H "X-API-Key: tk-ot<chave>bra"
```

**Listar tokens ativos:**
```bash
curl https://api.ofertatop.com.br/api/v1/tokens \
  -H "X-API-Key: tk-ot<chave>bra"
```

**Revogar token:**
```bash
curl -X DELETE https://api.ofertatop.com.br/api/v1/tokens/<id>/revogar \
  -H "X-API-Key: tk-ot<chave>bra"
```

---

## Gerenciar Produtos

### Listar produtos

```bash
GET /produtos
```

Parâmetros de filtro:

| Param | Tipo | Descrição |
|-------|------|-----------|
| `page` | int | Página (default: 1) |
| `limit` | int | Itens por página (default: 20, max: 100) |
| `search` | string | Busca em nome, SKU e descrição |
| `categoryId` | uuid | Filtrar por categoria |
| `active` | boolean | `true` ou `false` |
| `featured` | boolean | Apenas destaques |

```bash
curl "https://api.ofertatop.com.br/api/v1/produtos?page=1&limit=50&active=true" \
  -H "X-API-Key: tk-ot<chave>bra"
```

**Resposta:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Smartphone XYZ",
      "slug": "smartphone-xyz",
      "price": 1999.90,
      "stock": 25,
      "sku": "SMART-XYZ-001",
      "active": true,
      "category": { "id": "uuid", "name": "Eletrônicos" }
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 120, "totalPages": 3 }
}
```

---

### Criar produto

```bash
POST /produtos
```

```json
{
  "name": "Smartphone XYZ",
  "description": "Smartphone top de linha",
  "price": 1999.90,
  "comparePrice": 2499.90,
  "cost": 800.00,
  "sku": "SMART-XYZ-001",
  "barcode": "7891234567890",
  "stock": 50,
  "trackStock": true,
  "categoryId": "uuid-da-categoria",
  "images": [
    "https://cdn.minhaloja.com/produto-frente.jpg",
    "https://cdn.minhaloja.com/produto-costas.jpg"
  ],
  "attributes": {
    "cores": ["preto", "branco"],
    "tamanhos": ["P", "M", "G", "GG"]
  },
  "active": true,
  "featured": false
}
```

> O `slug` é gerado automaticamente. Se já existir, um sufixo único é adicionado.

---

### Atualizar produto

```bash
PUT /produtos/:id
```

Envie apenas os campos que deseja alterar:

```json
{
  "price": 1799.90,
  "stock": 30,
  "active": true
}
```

---

### Atualizar estoque

```bash
PATCH /produtos/:id/estoque
```

```json
{ "quantity": 10, "operation": "increment" }
```

| Operação | Efeito |
|----------|--------|
| `set` | Define o valor exato |
| `increment` | Adiciona ao estoque atual |
| `decrement` | Subtrai (mínimo 0) |

**Exemplo — baixa de estoque após venda no ERP:**
```json
{ "quantity": 2, "operation": "decrement" }
```

---

### Desativar produto

```bash
DELETE /produtos/:id
```

Soft delete — o produto fica com `active: false` e não aparece para clientes.

---

## Gerenciar Categorias

### Listar categorias

```bash
GET /categorias
```

Retorna todas as categorias com a contagem de produtos em cada uma.

---

### Criar categoria

```bash
POST /categorias
```

```json
{
  "name": "Eletrônicos",
  "description": "Smartphones, tablets e acessórios",
  "image": "https://cdn.minhaloja.com/eletronicos.jpg",
  "sortOrder": 1
}
```

---

### Atualizar / Desativar categoria

```bash
PUT /categorias/:id
DELETE /categorias/:id
```

---

## Gerenciar Clientes

### Listar clientes

```bash
GET /clientes?search=joao&page=1&limit=20
```

O `search` busca em nome, email, documento e telefone.

---

### Criar cliente

```bash
POST /clientes
```

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

> Se o email já existir na loja, retorna `409 Conflict`.

---

### Histórico de pedidos do cliente

```bash
GET /clientes/:id/pedidos
```

---

## Gerenciar Pedidos

### Listar pedidos

```bash
GET /pedidos?status=PENDING&page=1
```

| Param | Tipo | Valores |
|-------|------|---------|
| `status` | enum | `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED` |
| `paymentStatus` | enum | `PENDING`, `PAID`, `FAILED`, `REFUNDED`, `CANCELLED` |
| `customerId` | uuid | Filtrar por cliente |
| `search` | string | Número do pedido (`#000001`) |

---

### Criar pedido

O ERP pode criar pedidos diretamente (ex: venda pelo telefone, balcão, etc.):

```bash
POST /pedidos
```

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
  "notes": "Cliente solicitou embalagem para presente",
  "shippingAddress": {
    "street": "Rua das Flores",
    "number": "123",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-100"
  },
  "metadata": {
    "origem": "erp",
    "vendedor": "Carlos",
    "canal": "telefone"
  }
}
```

> `subtotal` e `total` são calculados automaticamente. O `orderNumber` é gerado sequencialmente.

---

### Atualizar status do pedido

Conforme o ERP processa o pedido, atualize o status:

```bash
PATCH /pedidos/:id/status
```

```json
{ "status": "SHIPPED" }
```

**Fluxo típico de status:**
```
PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
                                 ↘ CANCELLED
```

---

### Atualizar pagamento

Quando o pagamento for confirmado no ERP:

```bash
PATCH /pedidos/:id/pagamento
```

```json
{
  "paymentStatus": "PAID",
  "paymentMethod": "pix"
}
```

---

### Cancelar pedido

```bash
POST /pedidos/:id/cancelar
```

Não é possível cancelar pedidos com status `DELIVERED`, `CANCELLED` ou `REFUNDED`.

---

## Receber Pedidos via Webhook

Esta é a parte mais importante da integração. Quando um pedido é criado ou atualizado na loja, a API notifica seu ERP automaticamente.

### Configurar a URL

```bash
POST /webhook/configurar
```

```json
{ "webhookUrl": "https://seu-erp.com/api/webhook/lojapi" }
```

### Testar a conexão

```bash
POST /webhook/testar
```

Envia um evento de teste para confirmar que seu endpoint está recebendo.

### Eventos disponíveis

| Evento | Quando dispara |
|--------|----------------|
| `order.created` | Novo pedido criado na loja |
| `order.status_changed` | Status do pedido alterado |
| `order.payment_updated` | Pagamento atualizado |
| `order.cancelled` | Pedido cancelado |
| `product.created` | Produto criado |
| `product.updated` | Produto atualizado |
| `product.stock_updated` | Estoque atualizado |
| `customer.created` | Novo cliente cadastrado |
| `customer.updated` | Cliente atualizado |

### Payload recebido

```json
{
  "event": "order.created",
  "storeId": "uuid-da-loja",
  "timestamp": "2026-05-23T12:00:00.000Z",
  "data": {
    "id": "uuid",
    "orderNumber": "#000001",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "subtotal": 3999.80,
    "discount": 50.00,
    "shipping": 20.00,
    "total": 3969.80,
    "customer": {
      "id": "uuid",
      "name": "João da Silva",
      "email": "joao@cliente.com"
    },
    "items": [
      {
        "productId": "uuid",
        "name": "Smartphone XYZ",
        "sku": "SMART-XYZ-001",
        "price": 1999.90,
        "quantity": 2,
        "total": 3999.80
      }
    ]
  }
}
```

### Implementação no seu ERP

```typescript
// Express — endpoint para receber webhooks
app.post('/api/webhook/lojapi', express.json(), (req, res) => {
  const { event, storeId, data } = req.body;

  switch (event) {
    case 'order.created':
      // Importar pedido no ERP
      await importarPedido(storeId, data);
      break;

    case 'order.status_changed':
      // Sincronizar status
      await atualizarStatusPedido(data.id, data.status);
      break;

    case 'order.payment_updated':
      // Confirmar pagamento
      await confirmarPagamento(data.id, data.paymentStatus);
      break;

    case 'product.stock_updated':
      // Sincronizar estoque
      await atualizarEstoque(data.id, data.stock);
      break;
  }

  // IMPORTANTE: sempre responder 200
  res.status(200).json({ received: true });
});
```

> Responda sempre com `HTTP 200`. Falhas são registradas em `/webhook/logs` e podem ser consultadas para diagnóstico.

### Consultar logs de webhook

```bash
GET /webhook/logs?event=order.created&page=1
```

---

## Dados da Loja

### Consultar dados da loja

```bash
GET /loja
```

Retorna nome, slug, plano, configurações e contagens de produtos, clientes e pedidos.

### Atualizar dados da loja

```bash
PUT /loja/:storeId
```

```json
{
  "name": "Nome Atualizado",
  "phone": "(11) 88888-8888",
  "description": "Nova descrição",
  "webhookUrl": "https://seu-erp.com/api/webhook/lojapi",
  "settings": {
    "primaryColor": "#FF6B35",
    "currency": "BRL"
  }
}
```

---

## Referência de Endpoints

### Auth
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/admin/login` | Login admin |
| POST | `/auth/loja/login` | Login usuário da loja |
| GET | `/auth/me` | Dados do usuário autenticado |

### Loja
| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/loja` | API Key | Dados da loja |
| PUT | `/loja/:id` | API Key | Atualizar loja |
| GET | `/loja/:id/usuarios` | API Key | Listar usuários |
| POST | `/loja/:id/usuarios` | API Key | Criar usuário |

### Produtos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/produtos` | Listar com filtros e paginação |
| POST | `/produtos` | Criar produto |
| GET | `/produtos/:id` | Buscar por ID |
| PUT | `/produtos/:id` | Atualizar |
| DELETE | `/produtos/:id` | Desativar |
| PATCH | `/produtos/:id/estoque` | Atualizar estoque |

### Categorias
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/categorias` | Listar |
| POST | `/categorias` | Criar |
| GET | `/categorias/:id` | Buscar |
| PUT | `/categorias/:id` | Atualizar |
| DELETE | `/categorias/:id` | Desativar |

### Clientes
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/clientes` | Listar com busca |
| POST | `/clientes` | Criar |
| GET | `/clientes/:id` | Buscar |
| PUT | `/clientes/:id` | Atualizar |
| DELETE | `/clientes/:id` | Desativar |
| GET | `/clientes/:id/pedidos` | Histórico de pedidos |

### Pedidos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/pedidos` | Listar com filtros |
| POST | `/pedidos` | Criar pedido |
| GET | `/pedidos/:id` | Buscar por ID |
| PATCH | `/pedidos/:id/status` | Atualizar status |
| PATCH | `/pedidos/:id/pagamento` | Atualizar pagamento |
| POST | `/pedidos/:id/cancelar` | Cancelar |

### Webhook
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/webhook/configurar` | Definir URL |
| POST | `/webhook/testar` | Enviar evento de teste |
| GET | `/webhook/logs` | Histórico de disparos |
| GET | `/webhook/eventos` | Listar eventos disponíveis |

### Tokens ERP
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/tokens` | Listar tokens |
| POST | `/tokens` | Gerar novo token |
| GET | `/tokens/env` | Variáveis .env prontas |
| DELETE | `/tokens/:id/revogar` | Revogar token |

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

| Código | Significado | O que fazer |
|--------|-------------|-------------|
| 200 | Sucesso | — |
| 201 | Criado | — |
| 400 | Dados inválidos | Verificar o body da requisição |
| 401 | Não autenticado | Verificar o `X-API-Key` |
| 403 | Sem permissão | Token não tem acesso a este recurso |
| 404 | Não encontrado | Verificar o ID informado |
| 409 | Conflito | Registro duplicado (ex: email já cadastrado) |
| 422 | Validação falhou | Ver `details` para campos inválidos |
| 429 | Rate limit | Aguardar e tentar novamente |
| 500 | Erro interno | Contatar suporte |

### Rate Limit

A API aceita **100 requisições por 15 minutos** por IP. Para integrações com alto volume, entre em contato para ajuste de limites.

---

## Suporte

- **Email:** suporte@ofertatop.com.br
- **Swagger:** https://api.ofertatop.com.br/api/v1/docs
- **Status:** https://api.ofertatop.com.br/status
