import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { generateSlug } from '../utils/slug';
import { getPagination, paginationResponse } from '../utils/pagination';

export class ProductController {
  // ─── Listar ───────────────────────────────────────────────────────────────
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store!.id;
      const { page, limit, skip } = getPagination(req);
      const { search, categoryId, active, featured } = req.query;

      const where: Record<string, unknown> = { storeId };

      if (search) {
        const s = (search as string).toLowerCase();
        where.OR = [
          { name: { contains: s } },
          { sku: { contains: s } },
          { description: { contains: s } },
        ];
      }

      if (categoryId) where.categoryId = categoryId;
      if (active !== undefined) where.active = active === 'true';
      if (featured !== undefined) where.featured = featured === 'true';

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          include: { category: { select: { id: true, name: true, slug: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.product.count({ where }),
      ]);

      res.json(paginationResponse(products, total, { page, limit, skip }));
    } catch (err) {
      next(err);
    }
  };

  // ─── Buscar por ID ────────────────────────────────────────────────────────
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await prisma.product.findFirst({
        where: { id: req.params.id, storeId: req.store!.id },
        include: { category: true },
      });

      if (!product) throw new AppError('Produto não encontrado', 404);

      res.json(product);
    } catch (err) {
      next(err);
    }
  };

  // ─── Criar ────────────────────────────────────────────────────────────────
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store!.id;
      const slug = generateSlug(req.body.name);

      // Garante slug único na loja
      const existing = await prisma.product.findUnique({
        where: { storeId_slug: { storeId, slug } },
      });

      const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

      const product = await prisma.product.create({
        data: {
          ...req.body,
          storeId,
          slug: finalSlug,
          images: JSON.stringify(req.body.images || []),
          attributes: req.body.attributes ? JSON.stringify(req.body.attributes) : undefined,
        },
        include: { category: { select: { id: true, name: true } } },
      });

      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  };

  // ─── Atualizar ────────────────────────────────────────────────────────────
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await prisma.product.findFirst({
        where: { id: req.params.id, storeId: req.store!.id },
      });

      if (!product) throw new AppError('Produto não encontrado', 404);

      const updated = await prisma.product.update({
        where: { id: req.params.id },
        data: req.body,
        include: { category: { select: { id: true, name: true } } },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  };

  // ─── Remover ──────────────────────────────────────────────────────────────
  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await prisma.product.findFirst({
        where: { id: req.params.id, storeId: req.store!.id },
      });

      if (!product) throw new AppError('Produto não encontrado', 404);

      await prisma.product.update({
        where: { id: req.params.id },
        data: { active: false },
      });

      res.json({ message: 'Produto desativado' });
    } catch (err) {
      next(err);
    }
  };

  // ─── Atualizar Estoque ────────────────────────────────────────────────────
  updateStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { quantity, operation } = req.body;
      // operation: 'set' | 'increment' | 'decrement'

      const product = await prisma.product.findFirst({
        where: { id: req.params.id, storeId: req.store!.id },
      });

      if (!product) throw new AppError('Produto não encontrado', 404);

      let newStock = product.stock;

      if (operation === 'set') newStock = quantity;
      else if (operation === 'increment') newStock += quantity;
      else if (operation === 'decrement') newStock = Math.max(0, newStock - quantity);
      else throw new AppError('Operação inválida. Use: set, increment ou decrement', 400);

      const updated = await prisma.product.update({
        where: { id: req.params.id },
        data: { stock: newStock },
        select: { id: true, name: true, stock: true },
      });

      res.json({ message: 'Estoque atualizado', ...updated });
    } catch (err) {
      next(err);
    }
  };
}
