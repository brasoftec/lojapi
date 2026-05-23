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
| Loja (API Key nativa) | \`X-API-Key: <apiKey>\` |
| ERP (Integration Token) | \`X-API-Key: lojapi_...\` |

### Fluxo ERP

\`\`\`
1. Admin faz login              → POST /api/v1/auth/admin/login
2. Admin cadastra loja          → POST /api/v1/cadastrar
3. ERP gera token de integração → POST /api/v1/tokens
4. ERP copia .env               → GET  /api/v1/tokens/env
5. ERP sincroniza produtos      → POST /api/v1/produtos
6. ERP configura webhook        → POST /api/v1/webhook/configurar
7. API notifica ERP             → POST <webhookUrl> (automático)
8. ERP atualiza status          → PATCH /api/v1/pedidos/:id/status
\`\`\`
      `,
      contact: {
        name: 'Suporte',
        email: 'suporte@ofertatop.com.br',
      },
    },
    servers: [
      {
        url: 'https://api.ofertatop.com.br',
        description: 'Produção',
      },
      {
        url: 'http://localhost:3001',
        description: 'Desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido no login (admin ou loja)',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key nativa da loja ou Integration Token (lojapi_...)',
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
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
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
  },
  apis: ['./src/routes/**/*.ts', './src/controllers/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerSpec, swaggerUi };
