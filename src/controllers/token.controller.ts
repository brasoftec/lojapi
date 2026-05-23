import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';

/**
 * TokenController — Geração e gerenciamento de tokens de integração ERP
 *
 * Tokens de integração são diferentes da apiKey:
 * - apiKey: autenticação simples (header X-API-Key)
 * - Integration Token: token com escopo, expiração e rastreamento
 *   ideal para configurar em variáveis de ambiente do ERP
 */
export class TokenController {

  // ─── Gerar token de integração ────────────────────────────────────────────
  generate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store!.id;
      const { name, expiresInDays } = req.body;

      // Gera token no formato: tk-ot<32chars>bra
      const rand1 = uuidv4().replace(/-/g, '');
      const rand2 = uuidv4().replace(/-/g, '').substring(0, 16);
      const token = `tk-ot${rand1}${rand2}bra`;

      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const integration = await prisma.integrationToken.create({
        data: {
          storeId,
          name: name || 'Token ERP',
          token,
          expiresAt,
        },
        select: {
          id: true,
          name: true,
          token: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        message: 'Token gerado com sucesso',
        integration,
        usage: {
          header: 'X-API-Key',
          value: integration.token,
          example: {
            curl: `curl -H "X-API-Key: ${integration.token}" https://api.ofertatop.com.br/api/v1/loja`,
            env: `LOJAPI_TOKEN=${integration.token}`,
            dotenv: `# .env do ERP\nLOJAPI_API_KEY=${integration.token}\nLOJAPI_BASE_URL=https://api.ofertatop.com.br/api/v1`,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // ─── Listar tokens ────────────────────────────────────────────────────────
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store!.id;

      const tokens = await prisma.integrationToken.findMany({
        where: { storeId },
        select: {
          id: true,
          name: true,
          // Mascara o token: mostra só os primeiros e últimos 8 chars
          token: true,
          active: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Mascara os tokens: mostra prefixo tk-ot... e sufixo ...bra
      const masked = tokens.map(t => ({
        ...t,
        token: `${t.token.substring(0, 10)}...${t.token.substring(t.token.length - 6)}`,
      }));

      res.json(masked);
    } catch (err) {
      next(err);
    }
  };

  // ─── Revogar token ────────────────────────────────────────────────────────
  revoke = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store!.id;
      const { id } = req.params;

      const token = await prisma.integrationToken.findFirst({
        where: { id, storeId },
      });

      if (!token) throw new AppError('Token não encontrado', 404);

      await prisma.integrationToken.update({
        where: { id },
        data: { active: false },
      });

      res.json({ message: 'Token revogado com sucesso' });
    } catch (err) {
      next(err);
    }
  };

  // ─── Variáveis de ambiente prontas para o ERP ─────────────────────────────
  getEnvVars = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store!.id;

      const store = await prisma.store.findUnique({
        where: { id: storeId },
        select: { id: true, name: true, slug: true, apiKey: true },
      });

      if (!store) throw new AppError('Loja não encontrada', 404);

      // Busca o token de integração mais recente e ativo
      const latestToken = await prisma.integrationToken.findFirst({
        where: { storeId, active: true },
        orderBy: { createdAt: 'desc' },
        select: { token: true, name: true },
      });

      const baseUrl = 'https://api.ofertatop.com.br/api/v1';
      const apiKey = latestToken?.token || store.apiKey;

      res.json({
        message: 'Copie estas variáveis para o .env do seu ERP',
        env: {
          LOJAPI_BASE_URL: baseUrl,
          LOJAPI_API_KEY: apiKey,
          LOJAPI_STORE_ID: store.id,
          LOJAPI_STORE_SLUG: store.slug,
        },
        dotenv_format: [
          `# lojapi — ${store.name}`,
          `LOJAPI_BASE_URL=${baseUrl}`,
          `LOJAPI_API_KEY=${apiKey}`,
          `LOJAPI_STORE_ID=${store.id}`,
          `LOJAPI_STORE_SLUG=${store.slug}`,
        ].join('\n'),
        examples: {
          curl: `curl -H "X-API-Key: ${apiKey}" ${baseUrl}/loja`,
          node: `const api = axios.create({ baseURL: '${baseUrl}', headers: { 'X-API-Key': '${apiKey}' } });`,
          php: `$client = new GuzzleHttp\\Client(['base_uri' => '${baseUrl}', 'headers' => ['X-API-Key' => '${apiKey}']]);`,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}
