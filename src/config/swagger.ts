import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'lojapi',
      version: '1.0.0',
      description: `
## API REST Multi-Loja

Integração de ERPs e painéis com lojas isoladas por \`storeId\`.

### Autenticação

| Contexto | Header |
|----------|--------|
| Admin | \`Authorization: Bearer <token>\` |
| Loja (JWT) | \`Authorization: Bearer <token>\` |
| Loja / ERP (API Key) | \`X-API-Key: <apiKey ou lojapi_...>\` |

### Fluxo ERP
\`\`\`
1. Admin login        → POST /api/v1/auth/admin/login
2. Cadastrar loja     → POST /api/v1/cadastrar
3. Gerar token ERP    → POST /api/v1/tokens  (retorna tk-ot...bra)
4. Copiar .env        → GET  /api/v1/tokens/env
5. Sincronizar prod.  → POST /api/v1/produtos
6. Configurar webhook → POST /api/v1/webhook/configurar
7. Atualizar status   → PATCH /api/v1/pedidos/:id/status
\`\`\`
      `,
      contact: { name: 'Suporte', email: 'suporte@ofertatop.com.br' },
    },
    servers: [
      { url: 'https://api.ofertatop.com.br', description: 'Produção' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http', scheme: 'bearer', bearerFormat: 'JWT',
          description: 'Token JWT obtido no login (admin ou loja)',
        },
        ApiKeyAuth: {
          type: 'apiKey', in: 'header', name: 'X-API-Key',
          description: 'API Key nativa ou Integration Token (tk-ot...bra)',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' }, limit: { type: 'integer' },
            total: { type: 'integer' }, totalPages: { type: 'integer' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Autenticação e autorização' },
      { name: 'Lojas', description: 'Cadastro e gerenciamento de lojas' },
      { name: 'Produtos', description: 'Produtos da loja' },
      { name: 'Categorias', description: 'Categorias de produtos' },
      { name: 'Clientes', description: 'Clientes da loja' },
      { name: 'Pedidos', description: 'Pedidos da loja' },
      { name: 'Webhook', description: 'Configuração e logs de webhooks' },
      { name: 'Tokens ERP', description: 'Tokens de integração para ERP' },
      { name: 'Admin', description: 'Painel administrativo' },
    ],
    paths: {},
  },
  // Em produção os .ts não existem — os paths são definidos inline abaixo
  apis: [],
};

const spec = swaggerJsdoc(options) as any;

// ─── AUTH ─────────────────────────────────────────────────────────────────────
spec.paths['/api/v1/auth/admin/login'] = {
  post: {
    tags: ['Auth'], summary: 'Login do administrador global',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['email','password'],
        properties: { email: { type: 'string', example: 'admin@sistema.com' }, password: { type: 'string', example: 'Admin@123' } } } } },
    },
    responses: {
      200: { description: 'Token JWT + dados do admin' },
      401: { description: 'Credenciais inválidas' },
    },
  },
};
spec.paths['/api/v1/auth/loja/login'] = {
  post: {
    tags: ['Auth'], summary: 'Login do usuário da loja',
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['email','password','storeSlug'],
        properties: {
          email: { type: 'string', example: 'owner@lojademo.com' },
          password: { type: 'string', example: 'Loja@123' },
          storeSlug: { type: 'string', example: 'loja-demo' },
        } } } },
    },
    responses: { 200: { description: 'Token JWT + dados da loja' }, 401: { description: 'Credenciais inválidas' } },
  },
};
spec.paths['/api/v1/auth/me'] = {
  get: {
    tags: ['Auth'], summary: 'Dados do usuário autenticado',
    security: [{ BearerAuth: [] }],
    responses: { 200: { description: 'Dados do usuário' }, 401: { description: 'Não autenticado' } },
  },
};

// ─── LOJAS ────────────────────────────────────────────────────────────────────
spec.paths['/api/v1/cadastrar'] = {
  post: {
    tags: ['Lojas'], summary: 'Cadastrar nova loja (Admin only)',
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['name','email','ownerName','ownerEmail','ownerPassword'],
        properties: {
          name: { type: 'string', example: 'Minha Loja' },
          email: { type: 'string', example: 'contato@minhaloja.com' },
          phone: { type: 'string', example: '(11) 99999-9999' },
          document: { type: 'string', example: '12.345.678/0001-90' },
          description: { type: 'string' },
          plan: { type: 'string', enum: ['FREE','BASIC','PRO','ENTERPRISE'], example: 'PRO' },
          ownerName: { type: 'string', example: 'João Silva' },
          ownerEmail: { type: 'string', example: 'joao@minhaloja.com' },
          ownerPassword: { type: 'string', example: 'Senha@123' },
        } } } },
    },
    responses: { 201: { description: 'Loja criada com sucesso' }, 409: { description: 'Email ou slug já existe' } },
  },
};
spec.paths['/api/v1/loja'] = {
  get: {
    tags: ['Lojas'], summary: 'Dados da loja autenticada',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    responses: { 200: { description: 'Dados da loja' } },
  },
};
spec.paths['/api/v1/loja/{storeId}'] = {
  get: {
    tags: ['Lojas'], summary: 'Buscar loja por ID (Admin only)',
    security: [{ BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'storeId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Dados da loja' }, 404: { description: 'Não encontrada' } },
  },
  put: {
    tags: ['Lojas'], summary: 'Atualizar dados da loja',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'storeId', required: true, schema: { type: 'string' } }],
    requestBody: {
      content: { 'application/json': { schema: { type: 'object', properties: {
        name: { type: 'string' }, phone: { type: 'string' }, description: { type: 'string' },
        logo: { type: 'string' }, banner: { type: 'string' }, webhookUrl: { type: 'string' },
        settings: { type: 'object' },
      } } } },
    },
    responses: { 200: { description: 'Loja atualizada' } },
  },
};
spec.paths['/api/v1/loja/{storeId}/regenerar-api-key'] = {
  post: {
    tags: ['Lojas'], summary: 'Regenerar API Key (Admin only)',
    security: [{ BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'storeId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Nova API Key gerada' } },
  },
};
spec.paths['/api/v1/loja/{storeId}/usuarios'] = {
  get: {
    tags: ['Lojas'], summary: 'Listar usuários da loja',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'storeId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Lista de usuários' } },
  },
  post: {
    tags: ['Lojas'], summary: 'Criar usuário na loja',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'storeId', required: true, schema: { type: 'string' } }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['name','email','password'],
        properties: {
          name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' },
          role: { type: 'string', enum: ['OWNER','MANAGER','OPERATOR'], example: 'OPERATOR' },
        } } } },
    },
    responses: { 201: { description: 'Usuário criado' } },
  },
};

// ─── PRODUTOS ─────────────────────────────────────────────────────────────────
spec.paths['/api/v1/produtos'] = {
  get: {
    tags: ['Produtos'], summary: 'Listar produtos da loja',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
      { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
      { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Busca em nome, SKU e descrição' },
      { in: 'query', name: 'categoryId', schema: { type: 'string' } },
      { in: 'query', name: 'active', schema: { type: 'boolean' } },
      { in: 'query', name: 'featured', schema: { type: 'boolean' } },
    ],
    responses: { 200: { description: 'Lista paginada de produtos' } },
  },
  post: {
    tags: ['Produtos'], summary: 'Criar produto',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['name','price'],
        properties: {
          name: { type: 'string', example: 'Smartphone XYZ' },
          description: { type: 'string' },
          price: { type: 'number', example: 1999.90 },
          comparePrice: { type: 'number', example: 2499.90 },
          cost: { type: 'number', example: 800.00 },
          sku: { type: 'string', example: 'SMART-XYZ-001' },
          barcode: { type: 'string' },
          stock: { type: 'integer', example: 50 },
          trackStock: { type: 'boolean', default: true },
          categoryId: { type: 'string', format: 'uuid' },
          images: { type: 'array', items: { type: 'string' } },
          attributes: { type: 'object' },
          active: { type: 'boolean', default: true },
          featured: { type: 'boolean', default: false },
        } } } },
    },
    responses: { 201: { description: 'Produto criado' } },
  },
};
spec.paths['/api/v1/produtos/{id}'] = {
  get: {
    tags: ['Produtos'], summary: 'Buscar produto por ID',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Produto encontrado' }, 404: { description: 'Não encontrado' } },
  },
  put: {
    tags: ['Produtos'], summary: 'Atualizar produto',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
    responses: { 200: { description: 'Produto atualizado' } },
  },
  delete: {
    tags: ['Produtos'], summary: 'Desativar produto (soft delete)',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Produto desativado' } },
  },
};
spec.paths['/api/v1/produtos/{id}/estoque'] = {
  patch: {
    tags: ['Produtos'], summary: 'Atualizar estoque',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['quantity','operation'],
        properties: {
          quantity: { type: 'integer', example: 10 },
          operation: { type: 'string', enum: ['set','increment','decrement'], example: 'increment' },
        } } } },
    },
    responses: { 200: { description: 'Estoque atualizado' } },
  },
};

// ─── CATEGORIAS ───────────────────────────────────────────────────────────────
spec.paths['/api/v1/categorias'] = {
  get: {
    tags: ['Categorias'], summary: 'Listar categorias da loja',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    responses: { 200: { description: 'Lista de categorias com contagem de produtos' } },
  },
  post: {
    tags: ['Categorias'], summary: 'Criar categoria',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['name'],
        properties: {
          name: { type: 'string', example: 'Eletrônicos' },
          description: { type: 'string' },
          image: { type: 'string' },
          sortOrder: { type: 'integer', example: 1 },
        } } } },
    },
    responses: { 201: { description: 'Categoria criada' } },
  },
};
spec.paths['/api/v1/categorias/{id}'] = {
  get: {
    tags: ['Categorias'], summary: 'Buscar categoria por ID',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Categoria com produtos ativos' }, 404: { description: 'Não encontrada' } },
  },
  put: {
    tags: ['Categorias'], summary: 'Atualizar categoria',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
    responses: { 200: { description: 'Categoria atualizada' } },
  },
  delete: {
    tags: ['Categorias'], summary: 'Desativar categoria',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Categoria desativada' } },
  },
};

// ─── CLIENTES ─────────────────────────────────────────────────────────────────
spec.paths['/api/v1/clientes'] = {
  get: {
    tags: ['Clientes'], summary: 'Listar clientes da loja',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Busca por nome, email, documento ou telefone' },
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
      { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
    ],
    responses: { 200: { description: 'Lista paginada de clientes' } },
  },
  post: {
    tags: ['Clientes'], summary: 'Criar cliente',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['name','email'],
        properties: {
          name: { type: 'string', example: 'João da Silva' },
          email: { type: 'string', example: 'joao@cliente.com' },
          phone: { type: 'string', example: '(11) 98765-4321' },
          document: { type: 'string', example: '123.456.789-00' },
          birthDate: { type: 'string', format: 'date-time' },
          addresses: { type: 'array', items: { type: 'object' } },
        } } } },
    },
    responses: { 201: { description: 'Cliente criado' }, 409: { description: 'Email já cadastrado' } },
  },
};
spec.paths['/api/v1/clientes/{id}'] = {
  get: {
    tags: ['Clientes'], summary: 'Buscar cliente por ID',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Dados do cliente' }, 404: { description: 'Não encontrado' } },
  },
  put: {
    tags: ['Clientes'], summary: 'Atualizar cliente',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
    responses: { 200: { description: 'Cliente atualizado' } },
  },
  delete: {
    tags: ['Clientes'], summary: 'Desativar cliente',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Cliente desativado' } },
  },
};
spec.paths['/api/v1/clientes/{id}/pedidos'] = {
  get: {
    tags: ['Clientes'], summary: 'Histórico de pedidos do cliente',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [
      { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
      { in: 'query', name: 'page', schema: { type: 'integer' } },
      { in: 'query', name: 'limit', schema: { type: 'integer' } },
    ],
    responses: { 200: { description: 'Pedidos do cliente' } },
  },
};

// ─── PEDIDOS ──────────────────────────────────────────────────────────────────
spec.paths['/api/v1/pedidos'] = {
  get: {
    tags: ['Pedidos'], summary: 'Listar pedidos da loja',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'status', schema: { type: 'string', enum: ['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED'] } },
      { in: 'query', name: 'paymentStatus', schema: { type: 'string', enum: ['PENDING','PAID','FAILED','REFUNDED','CANCELLED'] } },
      { in: 'query', name: 'customerId', schema: { type: 'string' } },
      { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Busca por número do pedido' },
      { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
      { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
    ],
    responses: { 200: { description: 'Lista paginada de pedidos' } },
  },
  post: {
    tags: ['Pedidos'], summary: 'Criar pedido',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['items'],
        properties: {
          customerId: { type: 'string', format: 'uuid' },
          items: { type: 'array', minItems: 1, items: { type: 'object', required: ['name','price','quantity'],
            properties: {
              productId: { type: 'string', format: 'uuid' },
              name: { type: 'string', example: 'Smartphone XYZ' },
              sku: { type: 'string' },
              price: { type: 'number', example: 1999.90 },
              quantity: { type: 'integer', example: 2 },
              attributes: { type: 'object' },
            } } },
          paymentMethod: { type: 'string', example: 'pix' },
          discount: { type: 'number', example: 50.00 },
          shipping: { type: 'number', example: 20.00 },
          notes: { type: 'string' },
          shippingAddress: { type: 'object' },
          metadata: { type: 'object' },
        } } } },
    },
    responses: { 201: { description: 'Pedido criado (subtotal e total calculados automaticamente)' } },
  },
};
spec.paths['/api/v1/pedidos/{id}'] = {
  get: {
    tags: ['Pedidos'], summary: 'Buscar pedido por ID',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Pedido com cliente e itens' }, 404: { description: 'Não encontrado' } },
  },
};
spec.paths['/api/v1/pedidos/{id}/status'] = {
  patch: {
    tags: ['Pedidos'], summary: 'Atualizar status do pedido',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['status'],
        properties: { status: { type: 'string', enum: ['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED'] } } } } },
    },
    responses: { 200: { description: 'Status atualizado' } },
  },
};
spec.paths['/api/v1/pedidos/{id}/pagamento'] = {
  patch: {
    tags: ['Pedidos'], summary: 'Atualizar status de pagamento',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['paymentStatus'],
        properties: {
          paymentStatus: { type: 'string', enum: ['PENDING','PAID','FAILED','REFUNDED','CANCELLED'] },
          paymentMethod: { type: 'string', example: 'pix' },
        } } } },
    },
    responses: { 200: { description: 'Pagamento atualizado' } },
  },
};
spec.paths['/api/v1/pedidos/{id}/cancelar'] = {
  post: {
    tags: ['Pedidos'], summary: 'Cancelar pedido',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Pedido cancelado' }, 400: { description: 'Status não permite cancelamento' } },
  },
};

// ─── WEBHOOK ──────────────────────────────────────────────────────────────────
spec.paths['/api/v1/webhook/configurar'] = {
  post: {
    tags: ['Webhook'], summary: 'Configurar URL do webhook',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['webhookUrl'],
        properties: { webhookUrl: { type: 'string', format: 'uri', example: 'https://meu-erp.com/api/webhook' } } } } },
    },
    responses: { 200: { description: 'Webhook configurado' } },
  },
};
spec.paths['/api/v1/webhook/testar'] = {
  post: {
    tags: ['Webhook'], summary: 'Enviar evento de teste para o webhook',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    responses: { 200: { description: 'Evento de teste enviado' }, 400: { description: 'Nenhuma URL configurada' } },
  },
};
spec.paths['/api/v1/webhook/logs'] = {
  get: {
    tags: ['Webhook'], summary: 'Histórico de disparos de webhook',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'event', schema: { type: 'string' } },
      { in: 'query', name: 'page', schema: { type: 'integer' } },
      { in: 'query', name: 'limit', schema: { type: 'integer' } },
    ],
    responses: { 200: { description: 'Logs paginados' } },
  },
};
spec.paths['/api/v1/webhook/eventos'] = {
  get: {
    tags: ['Webhook'], summary: 'Listar eventos disponíveis',
    responses: { 200: { description: 'Lista de eventos' } },
  },
};

// ─── TOKENS ERP ───────────────────────────────────────────────────────────────
spec.paths['/api/v1/tokens'] = {
  get: {
    tags: ['Tokens ERP'], summary: 'Listar tokens de integração (mascarados)',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    responses: { 200: { description: 'Lista de tokens' } },
  },
  post: {
    tags: ['Tokens ERP'], summary: 'Gerar novo token de integração para o ERP',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object',
        properties: {
          name: { type: 'string', example: 'Token ERP Principal' },
          expiresInDays: { type: 'integer', example: 365 },
        } } } },
    },
    responses: { 201: { description: 'Token gerado com instruções de uso e bloco .env' } },
  },
};
spec.paths['/api/v1/tokens/env'] = {
  get: {
    tags: ['Tokens ERP'], summary: 'Variáveis de ambiente prontas para copiar no ERP',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    responses: { 200: { description: 'Bloco .env + exemplos Node.js, PHP e cURL' } },
  },
};
spec.paths['/api/v1/tokens/{id}/revogar'] = {
  delete: {
    tags: ['Tokens ERP'], summary: 'Revogar token de integração',
    security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Token revogado' }, 404: { description: 'Token não encontrado' } },
  },
};

// ─── ADMIN ────────────────────────────────────────────────────────────────────
spec.paths['/api/v1/admin/dashboard'] = {
  get: {
    tags: ['Admin'], summary: 'Dashboard com métricas gerais do sistema',
    security: [{ BearerAuth: [] }],
    responses: { 200: { description: 'Totais de lojas, pedidos, clientes e produtos' } },
  },
};
spec.paths['/api/v1/admin/lojas'] = {
  get: {
    tags: ['Admin'], summary: 'Listar todas as lojas',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'search', schema: { type: 'string' } },
      { in: 'query', name: 'plan', schema: { type: 'string', enum: ['FREE','BASIC','PRO','ENTERPRISE'] } },
      { in: 'query', name: 'active', schema: { type: 'boolean' } },
      { in: 'query', name: 'page', schema: { type: 'integer' } },
      { in: 'query', name: 'limit', schema: { type: 'integer' } },
    ],
    responses: { 200: { description: 'Lista paginada de lojas' } },
  },
};
spec.paths['/api/v1/admin/lojas/{storeId}'] = {
  get: {
    tags: ['Admin'], summary: 'Detalhes de uma loja (inclui usuários e contagens)',
    security: [{ BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'storeId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Dados completos da loja' }, 404: { description: 'Não encontrada' } },
  },
};
spec.paths['/api/v1/admin/lojas/{storeId}/status'] = {
  patch: {
    tags: ['Admin'], summary: 'Ativar ou desativar loja (toggle)',
    security: [{ BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'storeId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Status alterado' } },
  },
};
spec.paths['/api/v1/admin/lojas/{storeId}/plano'] = {
  patch: {
    tags: ['Admin'], summary: 'Alterar plano da loja',
    security: [{ BearerAuth: [] }],
    parameters: [{ in: 'path', name: 'storeId', required: true, schema: { type: 'string' } }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['plan'],
        properties: { plan: { type: 'string', enum: ['FREE','BASIC','PRO','ENTERPRISE'] } } } } },
    },
    responses: { 200: { description: 'Plano atualizado' } },
  },
};
spec.paths['/api/v1/admin/usuarios'] = {
  get: {
    tags: ['Admin'], summary: 'Listar administradores',
    security: [{ BearerAuth: [] }],
    responses: { 200: { description: 'Lista paginada de admins' } },
  },
  post: {
    tags: ['Admin'], summary: 'Criar administrador (SUPER_ADMIN only)',
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: { 'application/json': { schema: { type: 'object', required: ['name','email','password'],
        properties: {
          name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN','SUPER_ADMIN'], default: 'ADMIN' },
        } } } },
    },
    responses: { 201: { description: 'Admin criado' } },
  },
};
spec.paths['/api/v1/admin/relatorios/pedidos'] = {
  get: {
    tags: ['Admin'], summary: 'Relatório de pedidos por período',
    security: [{ BearerAuth: [] }],
    parameters: [
      { in: 'query', name: 'from', schema: { type: 'string', format: 'date-time' } },
      { in: 'query', name: 'to', schema: { type: 'string', format: 'date-time' } },
      { in: 'query', name: 'storeId', schema: { type: 'string' } },
    ],
    responses: { 200: { description: 'Totais, por status e por pagamento' } },
  },
};
spec.paths['/api/v1/admin/relatorios/lojas'] = {
  get: {
    tags: ['Admin'], summary: 'Ranking de lojas por volume de pedidos',
    security: [{ BearerAuth: [] }],
    responses: { 200: { description: 'Por plano e top 10 lojas' } },
  },
};

export const swaggerSpec = spec;
export { swaggerUi };
