import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';

export interface AuthPayload {
  id: string;
  email: string;
  role: string;
  type: 'admin' | 'store_user';
  storeId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      store?: { id: string; slug: string; name: string; apiKey: string };
    }
  }
}

// ─── Middleware: Autenticação JWT ─────────────────────────────────────────────
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

// ─── Middleware: Apenas Admin Global ─────────────────────────────────────────
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.type !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
};

// ─── Middleware: Super Admin ──────────────────────────────────────────────────
export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.type !== 'admin' || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito ao super administrador' });
  }
  next();
};

// ─── Middleware: API Key da Loja (apiKey nativa OU IntegrationToken) ──────────
export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'API Key não fornecida' });
  }

  // 1. Tenta como apiKey nativa da loja
  const store = await prisma.store.findUnique({
    where: { apiKey },
    select: { id: true, slug: true, name: true, apiKey: true, active: true },
  });

  if (store && store.active) {
    req.store = store;
    return next();
  }

  // 2. Tenta como IntegrationToken
  const integrationToken = await prisma.integrationToken.findUnique({
    where: { token: apiKey },
    include: {
      store: { select: { id: true, slug: true, name: true, apiKey: true, active: true } },
    },
  });

  if (!integrationToken || !integrationToken.active) {
    return res.status(401).json({ error: 'API Key inválida ou revogada' });
  }

  if (!integrationToken.store.active) {
    return res.status(401).json({ error: 'Loja inativa' });
  }

  // Verifica expiração
  if (integrationToken.expiresAt && integrationToken.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Token expirado' });
  }

  // Atualiza lastUsedAt de forma assíncrona (não bloqueia a request)
  prisma.integrationToken.update({
    where: { id: integrationToken.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  req.store = integrationToken.store;
  next();
};

// ─── Middleware: JWT da Loja ──────────────────────────────────────────────────
export const authenticateStoreUser = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;

    if (payload.type !== 'store_user') {
      return res.status(403).json({ error: 'Token inválido para este contexto' });
    }

    req.user = payload;

    // Carrega a loja do usuário
    const store = await prisma.store.findUnique({
      where: { id: payload.storeId },
      select: { id: true, slug: true, name: true, apiKey: true, active: true },
    });

    if (!store || !store.active) {
      return res.status(403).json({ error: 'Loja inativa ou não encontrada' });
    }

    req.store = store;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

// ─── Middleware: API Key OU JWT da Loja OU Admin ─────────────────────────────
export const authenticateStore = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const authHeader = req.headers.authorization;

  // Tenta API Key primeiro
  if (apiKey) {
    return authenticateApiKey(req, res, next);
  }

  // Tenta JWT
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;

      // Admin tem acesso a tudo — não precisa de store
      if (payload.type === 'admin') {
        req.user = payload;
        // Para admin, tenta carregar a loja do parâmetro da rota
        const storeId = req.params.storeId;
        if (storeId) {
          const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { id: true, slug: true, name: true, apiKey: true, active: true },
          });
          if (store) req.store = store;
        }
        // Rota escopada à loja sem storeId: admin precisa fornecer X-API-Key
        if (!req.store) {
          return res.status(400).json({
            error: 'Esta rota é escopada a uma loja. Forneça X-API-Key da loja ou acesse via /:storeId.',
          });
        }
        return next();
      }

      // JWT de usuário da loja
      if (payload.type === 'store_user') {
        req.user = payload;
        const store = await prisma.store.findUnique({
          where: { id: payload.storeId },
          select: { id: true, slug: true, name: true, apiKey: true, active: true },
        });
        if (!store || !store.active) {
          return res.status(403).json({ error: 'Loja inativa ou não encontrada' });
        }
        req.store = store;
        return next();
      }
    } catch {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
  }

  return res.status(401).json({ error: 'Autenticação necessária: forneça X-API-Key ou Bearer token' });
};

// ─── Middleware: Verificar acesso à loja específica ───────────────────────────
export const requireStoreAccess = (req: Request, res: Response, next: NextFunction) => {
  const storeId = req.params.storeId || req.store?.id;

  if (!storeId) {
    return res.status(400).json({ error: 'ID da loja não fornecido' });
  }

  // Admin tem acesso a tudo
  if (req.user?.type === 'admin') {
    return next();
  }

  // Usuário da loja só acessa sua própria loja
  if (req.store?.id !== storeId) {
    return res.status(403).json({ error: 'Sem permissão para acessar esta loja' });
  }

  next();
};
