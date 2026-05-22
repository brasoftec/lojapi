import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middlewares/errorHandler';
import { getPagination, paginationResponse } from '../utils/pagination';
import { triggerWebhook } from '../services/webhook.service';

const WEBHOOK_EVENTS = [
  { event: 'order.created', description: 'Novo pedido criado' },
  { event: 'order.status_changed', description: 'Status do pedido alterado' },
  { event: 'order.payment_updated', description: 'Pagamento do pedido atualizado' },
  { event: 'order.cancelled', description: 'Pedido cancelado' },
  { event: 'product.created', description: 'Produto criado' },
  { event: 'product.updated', description: 'Produto atualizado' },
  { event: 'product.stock_updated', description: 'Estoque do produto atualizado' },
  { event: 'customer.created', description: 'Cliente criado' },
  { event: 'customer.updated', description: 'Cliente atualizado' },
];

export class WebhookController {
  listLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const storeId = req.store!.id;
      const { page, limit, skip } = getPagination(req);
      const { event } = req.query;

      const where: Record<string, unknown> = { storeId };
      if (event) where.event = event;

      const [logs, total] = await Promise.all([
        prisma.webhookLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.webhookLog.count({ where }),
      ]);

      res.json(paginationResponse(logs, total, { page, limit, skip }));
    } catch (err) { next(err); }
  };

  configure = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { webhookUrl } = req.body;

      const store = await prisma.store.update({
        where: { id: req.store!.id },
        data: { webhookUrl },
        select: { id: true, name: true, webhookUrl: true },
      });

      res.json({ message: 'Webhook configurado', store });
    } catch (err) { next(err); }
  };

  test = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const store = await prisma.store.findUnique({
        where: { id: req.store!.id },
        select: { webhookUrl: true },
      });

      if (!store?.webhookUrl) {
        throw new AppError('Nenhuma URL de webhook configurada', 400);
      }

      await triggerWebhook(req.store!.id, 'webhook.test', {
        message: 'Teste de webhook',
        timestamp: new Date().toISOString(),
      });

      res.json({ message: 'Evento de teste enviado para ' + store.webhookUrl });
    } catch (err) { next(err); }
  };

  listEvents = (_req: Request, res: Response) => {
    res.json(WEBHOOK_EVENTS);
  };
}
