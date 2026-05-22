import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticateStore } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();
const ctrl = new OrderController();

const createOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  items: z.array(z.object({
    productId: z.string().uuid().optional(),
    name: z.string(),
    sku: z.string().optional(),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
    attributes: z.record(z.unknown()).optional(),
  })).min(1, 'Pedido deve ter ao menos 1 item'),
  paymentMethod: z.string().optional(),
  discount: z.number().min(0).default(0),
  shipping: z.number().min(0).default(0),
  notes: z.string().optional(),
  shippingAddress: z.object({
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
});

const updatePaymentSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED']),
  paymentMethod: z.string().optional(),
});

/**
 * @swagger
 * /api/v1/pedidos:
 *   get:
 *     tags: [Pedidos]
 *     summary: Listar pedidos da loja
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED]
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, FAILED, REFUNDED, CANCELLED]
 *       - in: query
 *         name: customerId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *   post:
 *     tags: [Pedidos]
 *     summary: Criar pedido
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 */
router.get('/', authenticateStore, ctrl.list);
router.post('/', authenticateStore, validate(createOrderSchema), ctrl.create);
router.get('/:id', authenticateStore, ctrl.getById);

/**
 * @swagger
 * /api/v1/pedidos/{id}/status:
 *   patch:
 *     tags: [Pedidos]
 *     summary: Atualizar status do pedido
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 */
router.patch('/:id/status', authenticateStore, validate(updateStatusSchema), ctrl.updateStatus);

/**
 * @swagger
 * /api/v1/pedidos/{id}/pagamento:
 *   patch:
 *     tags: [Pedidos]
 *     summary: Atualizar status de pagamento
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 */
router.patch('/:id/pagamento', authenticateStore, validate(updatePaymentSchema), ctrl.updatePayment);

/**
 * @swagger
 * /api/v1/pedidos/{id}/cancelar:
 *   post:
 *     tags: [Pedidos]
 *     summary: Cancelar pedido
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 */
router.post('/:id/cancelar', authenticateStore, ctrl.cancel);

export default router;
