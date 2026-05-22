import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Store API',
      version: '1.0.0',
      description: `
## API Multi-Loja

Sistema completo de gerenciamento de lojas com painel administrativo.

### Autenticação

A API usa dois tipos de autenticação:

1. **JWT Bearer Token** — Para o painel admin e usuários de loja
2. **API Key** — Para integrações externas (header \`X-API-Key\`)

### Fluxo de uso

1. Admin cadastra uma loja via \`POST /api/v1/cadastrar\`
2. Loja recebe sua \`apiKey\` única
3. Loja usa a \`apiKey\` + \`storeId\` para acessar seus endpoints
4. Admin gerencia tudo pelo painel usando JWT

### Headers necessários por contexto

| Contexto | Header |
|----------|--------|
| Admin | \`Authorization: Bearer <token>\` |
| Loja (API Key) | \`X-API-Key: <apiKey>\` |
| Loja (JWT) | \`Authorization: Bearer <token>\` |
      `,
      contact: {
        name: 'Suporte',
        email: 'suporte@sistema.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Desenvolvimento',
      },
      {
        url: 'https://api.seudominio.com',
        description: 'Produção',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido no login',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key da loja',
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
      { name: 'Admin', description: 'Painel administrativo' },
    ],
  },
  apis: ['./src/routes/**/*.ts', './src/controllers/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerSpec, swaggerUi };
