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
| Loja / ERP (API Key) | \`X-API-Key: <apiKey ou tk-ot...bra>\` |

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
    responses: { 200: { description: 'Token JWT + dados do admin' }, 401: { description: 'Credenciais inválidas' } },
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
