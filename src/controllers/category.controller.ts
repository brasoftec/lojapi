import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { generateSlug } from '../utils/slug';

export class CategoryController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await prisma.category.findMany({
        where: { storeId: req.store!.id },
        include: { _count: { select: { products: true } } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
      res.json(categories);
    } catch (err) { next(err); }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await prisma.category.findFirst({
        where: { id: req.params.id, storeId: req.store!.id },
        include: { products: { where: { active: true }, take: 10 } },
      });
      if (!category) throw new AppError('Categoria não encontrada', 404);
      res.json(category);
    } catch (err) { next(err); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store!.id;
      const { name, description, image, sortOrder } = req.body;
      const slug = generateSlug(name);

      const category = await prisma.category.create({
        data: { storeId, name, slug, description, image, sortOrder: sortOrder || 0 },
      });
      res.status(201).json(category);
    } catch (err) { next(err); }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await prisma.category.findFirst({
        where: { id: req.params.id, storeId: req.store!.id },
      });
      if (!category) throw new AppError('Categoria não encontrada', 404);

      const updated = await prisma.category.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(updated);
    } catch (err) { next(err); }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await prisma.category.findFirst({
        where: { id: req.params.id, storeId: req.store!.id },
      });
      if (!category) throw new AppError('Categoria não encontrada', 404);

      await prisma.category.update({
        where: { id: req.params.id },
        data: { active: false },
      });
      res.json({ message: 'Categoria desativada' });
    } catch (err) { next(err); }
  };
}
