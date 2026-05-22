import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticateStore } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();
const ctrl = new ProductController();

const createProductSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  description: z.string().optional(),
  price: z.number().positive('Preço deve ser positivo'),
  comparePrice: z.number().positive().optional(),
  cost: z.number().positive().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  stock: z.number().int().min(0).default(0),
  trackStock: z.boolean().default(true),
  categoryId: z.string().uuid().optional(),
  images: z.array(z.string().url()).default([]),
  attributes: z.record(z.unknown()).optional(),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
});

/**
 * @swagger
 * /api/v1/produtos:
 *   get:
 *     tags: [Produtos]
 *     summary: Listar produtos da loja
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: categoryId
 *         schema: { type: string }
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Lista de produtos com paginação
 */
router.get('/', authenticateStore, ctrl.list);

/**
 * @swagger
 * /api/v1/produtos/{id}:
 *   get:
 *     tags: [Produtos]
 *     summary: Buscar produto por ID
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Produto encontrado
 *       404:
 *         description: Produto não encontrado
 */
router.get('/:id', authenticateStore, ctrl.getById);

/**
 * @swagger
 * /api/v1/produtos:
 *   post:
 *     tags: [Produtos]
 *     summary: Criar produto
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               categoryId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Produto criado
 */
router.post('/', authenticateStore, validate(createProductSchema), ctrl.create);

/**
 * @swagger
 * /api/v1/produtos/{id}:
 *   put:
 *     tags: [Produtos]
 *     summary: Atualizar produto
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 */
router.put('/:id', authenticateStore, ctrl.update);

/**
 * @swagger
 * /api/v1/produtos/{id}:
 *   delete:
 *     tags: [Produtos]
 *     summary: Remover produto
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 */
router.delete('/:id', authenticateStore, ctrl.remove);

/**
 * @swagger
 * /api/v1/produtos/{id}/estoque:
 *   patch:
 *     tags: [Produtos]
 *     summary: Atualizar estoque do produto
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 */
router.patch('/:id/estoque', authenticateStore, ctrl.updateStock);

export default router;
