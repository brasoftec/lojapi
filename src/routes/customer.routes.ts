import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authenticateStore } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();
const ctrl = new CustomerController();

const createCustomerSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  document: z.string().optional(),
  birthDate: z.string().datetime().optional(),
  addresses: z.array(z.object({
    label: z.string().optional(),
    street: z.string(),
    number: z.string(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    isDefault: z.boolean().default(false),
  })).default([]),
});

/**
 * @swagger
 * /api/v1/clientes:
 *   get:
 *     tags: [Clientes]
 *     summary: Listar clientes da loja
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Busca por nome, email ou documento
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *   post:
 *     tags: [Clientes]
 *     summary: Criar cliente
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 */
router.get('/', authenticateStore, ctrl.list);
router.post('/', authenticateStore, validate(createCustomerSchema), ctrl.create);
router.get('/:id', authenticateStore, ctrl.getById);
router.put('/:id', authenticateStore, ctrl.update);
router.delete('/:id', authenticateStore, ctrl.remove);

/**
 * @swagger
 * /api/v1/clientes/{id}/pedidos:
 *   get:
 *     tags: [Clientes]
 *     summary: Pedidos do cliente
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 */
router.get('/:id/pedidos', authenticateStore, ctrl.getOrders);

export default router;
