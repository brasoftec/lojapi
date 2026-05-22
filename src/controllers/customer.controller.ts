import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { getPagination, paginationResponse } from '../utils/pagination';

export class CustomerController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store!.id;
      const { page, limit, skip } = getPagination(req);
      const { search } = req.query;

      const where: Record<string, unknown> = { storeId };

      if (search) {
        const s = (search as string).toLowerCase();
        where.OR = [
          { name: { contains: s } },
          { email: { contains: s } },
          { document: { contains: s } },
          { phone: { contains: s } },
        ];
      }

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          skip,
          take: limit,
          include: { _count: { select: { orders: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.customer.count({ where }),
      ]);

      res.json(paginationResponse(customers, total, { page, limit, skip }));
    } catch (err) { next(err); }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await prisma.customer.findFirst({
        where: { id: req.params.id, storeId: req.store!.id },
        include: { _count: { select: { orders: true } } },
      });
      if (!customer) throw new AppError('Cliente não encontrado', 404);
      res.json(customer);
    } catch (err) { next(err); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store!.id;

      const existing = await prisma.customer.findUnique({
        where: { storeId_email: { storeId, email: req.body.email } },
      });
      if (existing) throw new AppError('Cliente com este email já existe', 409);

      const customer = await prisma.customer.create({
        data: {
          ...req.body,
          storeId,
          addresses: req.body.addresses ? JSON.stringify(req.body.addresses) : '[]',
        },
      });
      res.status(201).json(customer);
    } catch (err) { next(err); }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await prisma.customer.findFirst({
        where: { id: req.params.id, storeId: req.store!.id },
      });
      if (!customer) throw new AppError('Cliente não encontrado', 404);

      const updated = await prisma.customer.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(updated);
    } catch (err) { next(err); }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const customer = await prisma.customer.findFirst({
        where: { id: req.params.id, storeId: req.store!.id },
      });
      if (!customer) throw new AppError('Cliente não encontrado', 404);

      await prisma.customer.update({
        where: { id: req.params.id },
        data: { active: false },
      });
      res.json({ message: 'Cliente desativado' });
    } catch (err) { next(err); }
  };

  getOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, skip } = getPagination(req);

      const customer = await prisma.customer.findFirst({
        where: { id: req.params.id, storeId: req.store!.id },
      });
      if (!customer) throw new AppError('Cliente não encontrado', 404);

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where: { customerId: req.params.id },
          skip,
          take: limit,
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.count({ where: { customerId: req.params.id } }),
      ]);

      res.json(paginationResponse(orders, total, { page, limit, skip }));
    } catch (err) { next(err); }
  };
}
