import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { authenticateStore } from '../middlewares/auth';

const router = Router();
const ctrl = new WebhookController();

/**
 * @swagger
 * /api/v1/webhook/logs:
 *   get:
 *     tags: [Webhook]
 *     summary: Listar logs de webhooks da loja
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: event
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 */
router.get('/logs', authenticateStore, ctrl.listLogs);

/**
 * @swagger
 * /api/v1/webhook/configurar:
 *   post:
 *     tags: [Webhook]
 *     summary: Configurar URL do webhook da loja
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               webhookUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://minhaloja.com/webhook
 */
router.post('/configurar', authenticateStore, ctrl.configure);

/**
 * @swagger
 * /api/v1/webhook/testar:
 *   post:
 *     tags: [Webhook]
 *     summary: Enviar evento de teste para o webhook
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 */
router.post('/testar', authenticateStore, ctrl.test);

/**
 * @swagger
 * /api/v1/webhook/eventos:
 *   get:
 *     tags: [Webhook]
 *     summary: Listar eventos disponíveis para webhook
 */
router.get('/eventos', ctrl.listEvents);

export default router;
