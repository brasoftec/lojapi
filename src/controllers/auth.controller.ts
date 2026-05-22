import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';

export class AuthController {
  // ─── Login Admin Global ───────────────────────────────────────────────────
  adminLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      const admin = await prisma.adminUser.findUnique({ where: { email } });

      if (!admin || !admin.active) {
        throw new AppError('Credenciais inválidas', 401);
      }

      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) throw new AppError('Credenciais inválidas', 401);

      const token = generateToken({
        id: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'admin',
      });

      res.json({
        token,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // ─── Login Usuário da Loja ────────────────────────────────────────────────
  storeLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, storeSlug } = req.body;

      const store = await prisma.store.findUnique({
        where: { slug: storeSlug },
        select: { id: true, name: true, slug: true, active: true },
      });

      if (!store || !store.active) {
        throw new AppError('Loja não encontrada ou inativa', 404);
      }

      const storeUser = await prisma.storeUser.findUnique({
        where: { storeId_email: { storeId: store.id, email } },
      });

      if (!storeUser || !storeUser.active) {
        throw new AppError('Credenciais inválidas', 401);
      }

      const valid = await bcrypt.compare(password, storeUser.password);
      if (!valid) throw new AppError('Credenciais inválidas', 401);

      const token = generateToken({
        id: storeUser.id,
        email: storeUser.email,
        role: storeUser.role,
        type: 'store_user',
        storeId: store.id,
      });

      res.json({
        token,
        user: {
          id: storeUser.id,
          name: storeUser.name,
          email: storeUser.email,
          role: storeUser.role,
        },
        store: {
          id: store.id,
          name: store.name,
          slug: store.slug,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  // ─── Me ───────────────────────────────────────────────────────────────────
  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new AppError('Não autenticado', 401);

      if (req.user.type === 'admin') {
        const admin = await prisma.adminUser.findUnique({
          where: { id: req.user.id },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
        return res.json({ type: 'admin', ...admin });
      }

      const storeUser = await prisma.storeUser.findUnique({
        where: { id: req.user.id },
        include: {
          store: { select: { id: true, name: true, slug: true, logo: true } },
        },
      });

      const { password: _, ...userWithoutPassword } = storeUser!;
      res.json({ type: 'store_user', ...userWithoutPassword });
    } catch (err) {
      next(err);
    }
  };
}
