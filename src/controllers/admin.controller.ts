import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { getPagination, paginationResponse } from '../utils/pagination';

export class AdminController {
  // ─── Dashboard ────────────────────────────────────────────────────────────
  dashboard = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [
        totalStores,
        activeStores,
        totalOrders,
        totalCustomers,
        totalProducts,
        recentOrders,
        storesByPlan,
      ] = await Promise.all([
        prisma.store.count(),
        prisma.store.count({ where: { active: true } }),
        prisma.order.count(),
        prisma.customer.count(),
        prisma.product.count(),
        prisma.order.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            store: { select: { name: true, slug: true } },
            customer: { select: { name: true } },
          },
        }),
        prisma.store.groupBy({
          by: ['plan'],
          _count: { id: true },
        }),
      ]);

      res.json({
        summary: {
          totalStores,
          activeStores,
          inactiveStores: totalStores - activeStores,
          totalOrders,
          totalCustomers,
          totalProducts,
        },
        storesByPlan: storesByPlan.map((s: { plan: string; _count: { id: number } }) => ({
          plan: s.plan,
          count: s._count.id,
        })),
        recentOrders,
      });
    } catch (err) { next(err); }
  };

  // ─── Listar Lojas ─────────────────────────────────────────────────────────
  listStores = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, skip } = getPagination(req);
      const { search, plan, active } = req.query;

      const where: Record<string, unknown> = {};
      if (search) {
        const s = (search as string).toLowerCase();
        where.OR = [
          { name: { contains: s } },
          { email: { contains: s } },
          { slug: { contains: s } },
        ];
      }
      if (plan) where.plan = plan;
      if (active !== undefined) where.active = active === 'true';

      const [stores, total] = await Promise.all([
        prisma.store.findMany({
          where,
          skip,
          take: limit,
          include: {
            _count: { select: { products: true, customers: true, orders: true, storeUsers: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.store.count({ where }),
      ]);

      res.json(paginationResponse(stores, total, { page, limit, skip }));
    } catch (err) { next(err); }
  };

  // ─── Detalhes da Loja ─────────────────────────────────────────────────────
  getStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({
        where: { id: req.params.storeId },
        include: {
          storeUsers: { select: { id: true, name: true, email: true, role: true, active: true } },
          _count: { select: { products: true, customers: true, orders: true } },
        },
      });
      if (!store) throw new AppError('Loja não encontrada', 404);
      res.json(store);
    } catch (err) { next(err); }
  };

  // ─── Ativar/Desativar Loja ────────────────────────────────────────────────
  toggleStoreStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({ where: { id: req.params.storeId } });
      if (!store) throw new AppError('Loja não encontrada', 404);

      const updated = await prisma.store.update({
        where: { id: req.params.storeId },
        data: { active: !store.active },
        select: { id: true, name: true, active: true },
      });

      res.json({ message: `Loja ${updated.active ? 'ativada' : 'desativada'}`, store: updated });
    } catch (err) { next(err); }
  };

  // ─── Atualizar Plano ──────────────────────────────────────────────────────
  updateStorePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { plan } = req.body;
      const store = await prisma.store.update({
        where: { id: req.params.storeId },
        data: { plan },
        select: { id: true, name: true, plan: true },
      });
      res.json({ message: 'Plano atualizado', store });
    } catch (err) { next(err); }
  };

  // ─── Listar Admins ────────────────────────────────────────────────────────
  listAdmins = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, skip } = getPagination(req);

      const [admins, total] = await Promise.all([
        prisma.adminUser.findMany({
          skip,
          take: limit,
          select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.adminUser.count(),
      ]);

      res.json(paginationResponse(admins, total, { page, limit, skip }));
    } catch (err) { next(err); }
  };

  // ─── Criar Admin ──────────────────────────────────────────────────────────
  createAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, role } = req.body;
      const hashedPassword = await bcrypt.hash(password, 12);

      const admin = await prisma.adminUser.create({
        data: { name, email, password: hashedPassword, role: role || 'ADMIN' },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });

      res.status(201).json(admin);
    } catch (err) { next(err); }
  };

  // ─── Atualizar Admin ──────────────────────────────────────────────────────
  updateAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: Record<string, unknown> = { ...req.body };
      if (data.password) {
        data.password = await bcrypt.hash(data.password as string, 12);
      }

      const admin = await prisma.adminUser.update({
        where: { id: req.params.id },
        data,
        select: { id: true, name: true, email: true, role: true, active: true },
      });

      res.json(admin);
    } catch (err) { next(err); }
  };

  // ─── Deletar Admin ────────────────────────────────────────────────────────
  deleteAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.adminUser.update({
        where: { id: req.params.id },
        data: { active: false },
      });
      res.json({ message: 'Administrador desativado' });
    } catch (err) { next(err); }
  };

  // ─── Relatório de Pedidos ─────────────────────────────────────────────────
  ordersReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to, storeId } = req.query;

      const where: Record<string, unknown> = {};
      if (storeId) where.storeId = storeId;
      if (from || to) {
        where.createdAt = {
          ...(from ? { gte: new Date(from as string) } : {}),
          ...(to ? { lte: new Date(to as string) } : {}),
        };
      }

      const [orders, byStatus, byPayment] = await Promise.all([
        prisma.order.aggregate({
          where,
          _count: { id: true },
          _sum: { total: true },
          _avg: { total: true },
        }),
        prisma.order.groupBy({
          by: ['status'],
          where,
          _count: { id: true },
          _sum: { total: true },
        }),
        prisma.order.groupBy({
          by: ['paymentStatus'],
          where,
          _count: { id: true },
        }),
      ]);

      res.json({
        summary: {
          totalOrders: orders._count.id,
          totalRevenue: orders._sum.total,
          averageOrderValue: orders._avg.total,
        },
        byStatus,
        byPaymentStatus: byPayment,
      });
    } catch (err) { next(err); }
  };

  // ─── Relatório de Lojas ───────────────────────────────────────────────────
  storesReport = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [byPlan, topStores] = await Promise.all([
        prisma.store.groupBy({
          by: ['plan'],
          _count: { id: true },
        }),
        prisma.store.findMany({
          take: 10,
          include: {
            _count: { select: { orders: true, customers: true, products: true } },
          },
          orderBy: { orders: { _count: 'desc' } },
        }),
      ]);

      res.json({ byPlan, topStores });
    } catch (err) { next(err); }
  };
}
