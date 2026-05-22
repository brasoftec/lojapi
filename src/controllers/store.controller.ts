import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { generateSlug } from '../utils/slug';

export class StoreController {
  // ─── Criar Loja ───────────────────────────────────────────────────────────
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, phone, document, description, plan, ownerName, ownerEmail, ownerPassword, address } = req.body;

      const slug = generateSlug(name);

      // Verifica duplicatas
      const existing = await prisma.store.findFirst({
        where: { OR: [{ email }, { slug }] },
      });
      if (existing) throw new AppError('Email ou nome de loja já cadastrado', 409);

      const hashedPassword = await bcrypt.hash(ownerPassword, 12);

      const store = await prisma.store.create({
        data: {
          name,
          slug,
          email,
          phone,
          document,
          description,
          plan: plan || 'FREE',
          address: address ? JSON.stringify(address) : undefined,
          storeUsers: {
            create: {
              name: ownerName,
              email: ownerEmail,
              password: hashedPassword,
              role: 'OWNER',
            },
          },
        },
        include: {
          storeUsers: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      res.status(201).json({
        message: 'Loja criada com sucesso',
        store: {
          id: store.id,
          name: store.name,
          slug: store.slug,
          email: store.email,
          apiKey: store.apiKey,
          plan: store.plan,
          owner: store.storeUsers[0],
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // ─── Minha Loja ───────────────────────────────────────────────────────────
  getMyStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store?.id;
      if (!storeId) throw new AppError('Loja não identificada', 400);

      const store = await prisma.store.findUnique({
        where: { id: storeId },
        include: {
          _count: {
            select: { products: true, customers: true, orders: true },
          },
        },
      });

      if (!store) throw new AppError('Loja não encontrada', 404);

      res.json(store);
    } catch (err) {
      next(err);
    }
  };

  // ─── Buscar por ID ────────────────────────────────────────────────────────
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({
        where: { id: req.params.storeId },
        include: {
          _count: {
            select: { products: true, customers: true, orders: true, storeUsers: true },
          },
        },
      });

      if (!store) throw new AppError('Loja não encontrada', 404);

      res.json(store);
    } catch (err) {
      next(err);
    }
  };

  // ─── Atualizar ────────────────────────────────────────────────────────────
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;

      // Verifica permissão
      if (req.user?.type !== 'admin' && req.store?.id !== storeId) {
        throw new AppError('Sem permissão para editar esta loja', 403);
      }

      const data: Record<string, unknown> = { ...req.body };
      if (data.address) data.address = JSON.stringify(data.address);
      if (data.settings) data.settings = JSON.stringify(data.settings);

      const store = await prisma.store.update({
        where: { id: storeId },
        data,
      });

      res.json({ message: 'Loja atualizada', store });
    } catch (err) {
      next(err);
    }
  };

  // ─── Regenerar API Key ────────────────────────────────────────────────────
  regenerateApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.update({
        where: { id: req.params.storeId },
        data: { apiKey: uuidv4() },
        select: { id: true, name: true, apiKey: true },
      });

      res.json({ message: 'API Key regenerada com sucesso', apiKey: store.apiKey });
    } catch (err) {
      next(err);
    }
  };

  // ─── Listar Usuários ──────────────────────────────────────────────────────
  listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;

      if (req.user?.type !== 'admin' && req.store?.id !== storeId) {
        throw new AppError('Sem permissão', 403);
      }

      const users = await prisma.storeUser.findMany({
        where: { storeId },
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      });

      res.json(users);
    } catch (err) {
      next(err);
    }
  };

  // ─── Criar Usuário ────────────────────────────────────────────────────────
  createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId } = req.params;
      const { name, email, password, role } = req.body;

      if (req.user?.type !== 'admin' && req.store?.id !== storeId) {
        throw new AppError('Sem permissão', 403);
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.storeUser.create({
        data: { storeId, name, email, password: hashedPassword, role: role || 'OPERATOR' },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });

      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  };

  // ─── Atualizar Usuário ────────────────────────────────────────────────────
  updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId, userId } = req.params;

      if (req.user?.type !== 'admin' && req.store?.id !== storeId) {
        throw new AppError('Sem permissão', 403);
      }

      const data: Record<string, unknown> = { ...req.body };
      if (data.password) {
        data.password = await bcrypt.hash(data.password as string, 12);
      }

      const user = await prisma.storeUser.update({
        where: { id: userId },
        data,
        select: { id: true, name: true, email: true, role: true, active: true },
      });

      res.json(user);
    } catch (err) {
      next(err);
    }
  };

  // ─── Deletar Usuário ──────────────────────────────────────────────────────
  deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { storeId, userId } = req.params;

      if (req.user?.type !== 'admin' && req.store?.id !== storeId) {
        throw new AppError('Sem permissão', 403);
      }

      await prisma.storeUser.update({
        where: { id: userId, storeId },
        data: { active: false },
      });

      res.json({ message: 'Usuário desativado' });
    } catch (err) {
      next(err);
    }
  };
}
