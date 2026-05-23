import { Router } from 'express';
import { TokenController } from '../controllers/token.controller';
import { authenticateStore } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();
const ctrl = new TokenController();

const generateSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório').default('Token ERP'),
  expiresInDays: z.number().int().positive().optional(),
});

/**
 * @swagger
 * /api/v1/tokens:
 *   get:
 *     tags: [Tokens ERP]
 *     summary: Listar tokens de integração da loja
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tokens (mascarados)
 *
 *   post:
 *     tags: [Tokens ERP]
 *     summary: Gerar novo token de integração para o ERP
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Token ERP Principal
 *               expiresInDays:
 *                 type: integer
 *                 example: 365
 *     responses:
 *       201:
 *         description: Token gerado com instruções de uso
 */
router.get('/', authenticateStore, ctrl.list);
router.post('/', authenticateStore, validate(generateSchema), ctrl.generate);

/**
 * @swagger
 * /api/v1/tokens/env:
 *   get:
 *     tags: [Tokens ERP]
 *     summary: Variáveis de ambiente prontas para copiar no ERP
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Bloco .env pronto para uso
 */
router.get('/env', authenticateStore, ctrl.getEnvVars);

/**
 * @swagger
 * /api/v1/tokens/{id}/revogar:
 *   delete:
 *     tags: [Tokens ERP]
 *     summary: Revogar token de integração
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 */
router.delete('/:id/revogar', authenticateStore, ctrl.revoke);

export default router;
