import { Router } from 'express';
import { StoreController } from '../controllers/store.controller';
import { authenticate, requireAdmin, authenticateStore } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();
const ctrl = new StoreController();

const createStoreSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  document: z.string().optional(),
  description: z.string().optional(),
  plan: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']).optional(),
  ownerName: z.string().min(2, 'Nome do responsável obrigatório'),
  ownerEmail: z.string().email('Email do responsável inválido'),
  ownerPassword: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),
});

const updateStoreSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  description: z.string().optional(),
  logo: z.string().url().optional(),
  banner: z.string().url().optional(),
  webhookUrl: z.string().url().optional().nullable(),
  settings: z.record(z.unknown()).optional(),
  address: z.object({
    street: z.string().optional(),
    number: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),
});

/**
 * @swagger
 * /api/v1/cadastrar:
 *   post:
 *     tags: [Lojas]
 *     summary: Cadastrar nova loja (Admin)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, ownerName, ownerEmail, ownerPassword]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Minha Loja
 *               email:
 *                 type: string
 *                 example: contato@minhaloja.com
 *               ownerName:
 *                 type: string
 *                 example: João Silva
 *               ownerEmail:
 *                 type: string
 *                 example: joao@minhaloja.com
 *               ownerPassword:
 *                 type: string
 *                 example: Senha@123
 *               plan:
 *                 type: string
 *                 enum: [FREE, BASIC, PRO, ENTERPRISE]
 *     responses:
 *       201:
 *         description: Loja criada com sucesso
 *       409:
 *         description: Email ou slug já existe
 */
router.post('/', authenticate, requireAdmin, validate(createStoreSchema), ctrl.create);

/**
 * @swagger
 * /api/v1/loja:
 *   get:
 *     tags: [Lojas]
 *     summary: Dados da loja autenticada
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dados da loja
 */
router.get('/', authenticateStore, ctrl.getMyStore);

/**
 * @swagger
 * /api/v1/loja/{storeId}:
 *   get:
 *     tags: [Lojas]
 *     summary: Buscar loja por ID (Admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados da loja
 *       404:
 *         description: Loja não encontrada
 */
router.get('/:storeId', authenticate, requireAdmin, ctrl.getById);

/**
 * @swagger
 * /api/v1/loja/{storeId}:
 *   put:
 *     tags: [Lojas]
 *     summary: Atualizar loja
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Loja atualizada
 */
router.put('/:storeId', authenticateStore, validate(updateStoreSchema), ctrl.update);

/**
 * @swagger
 * /api/v1/loja/{storeId}/regenerar-api-key:
 *   post:
 *     tags: [Lojas]
 *     summary: Regenerar API Key da loja
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Nova API Key gerada
 */
router.post('/:storeId/regenerar-api-key', authenticate, requireAdmin, ctrl.regenerateApiKey);

/**
 * @swagger
 * /api/v1/loja/{storeId}/usuarios:
 *   get:
 *     tags: [Lojas]
 *     summary: Listar usuários da loja
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 *   post:
 *     tags: [Lojas]
 *     summary: Criar usuário na loja
 *     security:
 *       - BearerAuth: []
 *       - ApiKeyAuth: []
 */
router.get('/:storeId/usuarios', authenticateStore, ctrl.listUsers);
router.post('/:storeId/usuarios', authenticateStore, ctrl.createUser);
router.put('/:storeId/usuarios/:userId', authenticateStore, ctrl.updateUser);
router.delete('/:storeId/usuarios/:userId', authenticateStore, ctrl.deleteUser);

export default router;
