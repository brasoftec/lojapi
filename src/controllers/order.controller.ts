import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { getPagination, paginationResponse } from '../utils/pagination';
import { triggerWebhook } from '../services/webhook.service';

export class OrderController {
  // ─── Listar ───────────────────────────────────────────────────────────────
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store!.id;
      const { page, limit, skip } = getPagination(req);
      const { status, paymentStatus, customerId, search } = req.query;

      const where: Record<string, unknown> = { storeId };

      if (status) where.status = status;
      if (paymentStatus) where.paymentStatus = paymentStatus;
      if (customerId) where.customerId = customerId;
      if (search) {
        where.orderNumber = { contains: search as string };
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          skip,
          take: limit,
          include: {
            customer: { select: { id: true, name: true, email: true } },
            items: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.count({ where }),
      ]);

      res.json(paginationResponse(orders, total, { page, limit, skip }));
    } catch (err) { next(err); }
  };

  // ─── Buscar por ID ────────────────────────────────────────────────────────
  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await prisma.order.findFirst({
        where: { id: req.params.id, storeId: req.store!.id },
        include: {
          customer: true,
          items: { include: { product: { select: { id: true, name: true, images: true } } } },
        },
      });
      if (!order) throw new AppError('Pedido não encontrado', 404);
      res.json(order);
    } catch (err) { next(err); }
  };

  // ─── Criar ────────────────────────────────────────────────────────────────
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store!.id;
      const { items, customerId, paymentMethod, discount, shipping, notes, shippingAddress, metadata } = req.body;

      // Calcula totais
      const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) =>
        sum + item.price * item.quantity, 0);
      const total = subtotal - (discount || 0) + (shipping || 0);

      // Gera número do pedido
      const count = await prisma.order.count({ where: { storeId } });
      const orderNumber = `#${String(count + 1).padStart(6, '0')}`;

      const order = await prisma.order.create({
        data: {
          storeId,
          customerId,
          orderNumber,
          paymentMethod,
          subtotal,
          discount: discount || 0,
          shipping: shipping || 0,
          total,
          notes,
          shippingAddress: shippingAddress ? JSON.stringify(shippingAddress) : undefined,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
          items: {
            create: items.map((item: {
              productId?: string;
              name: string;
              sku?: string;
              price: number;
              quantity: number;
              attributes?: Record<string, unknown>;
            }) => ({
              productId: item.productId,
              name: item.name,
              sku: item.sku,
              price: item.price,
              quantity: item.quantity,
              total: item.price * item.quantity,
              attributes: item.attributes ? JSON.stringify(item.attributes) : undefined,
            })),
          },
        },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          items: true,
        },
      });

      // Dispara webhook
      await triggerWebhook(storeId, 'order.created', order);

      res.status(201).json(order);
    } catch (err) { next(err); }
  };

  // ─── Atualizar Status ─────────────────────────────────────────────────────
  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await prisma.order.findFirst({
        where: { id: req.params.id, storeId: req.store!.id },
      });
      if (!order) throw new AppError('Pedido não encontrado', 404);

      const updated = await prisma.order.update({
        where: { id: req.params.id },
        data: { status: req.body.status },
      });

      await triggerWebhook(req.store!.id, 'order.status_changed', updated);

      res.json(updated);
    } catch (err) { next(err); }
  };

  // ─── Atualizar Pagamento ──────────────────────────────────────────────────
  updatePayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await prisma.order.findFirst({
        where: { id: req.params.id, storeId: req.store!.id },
      });
      if (!order) throw new AppError('Pedido não encontrado', 404);

      const updated = await prisma.order.update({
        where: { id: req.params.id },
        data: req.body,
      });

      await triggerWebhook(req.store!.id, 'order.payment_updated', updated);

      res.json(updated);
    } catch (err) { next(err); }
  };

  // ─── Cancelar ─────────────────────────────────────────────────────────────
  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await prisma.order.findFirst({
        where: { id: req.params.id, storeId: req.store!.id },
      });
      if (!order) throw new AppError('Pedido não encontrado', 404);

      if (['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
        throw new AppError(`Pedido com status ${order.status} não pode ser cancelado`, 400);
      }

      const updated = await prisma.order.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED' },
      });

      await triggerWebhook(req.store!.id, 'order.cancelled', updated);

      res.json({ message: 'Pedido cancelado', order: updated });
    } catch (err) { next(err); }
  };
}
