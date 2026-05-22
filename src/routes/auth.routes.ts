import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { authenticate } from '../middlewares/auth';
import { z } from 'zod';

const router = Router();
const ctrl = new AuthController();

const adminLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

const storeLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
  storeSlug: z.string().min(1, 'Slug da loja obrigatório'),
});

/**
 * @swagger
 * /api/v1/auth/admin/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login do administrador global
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@sistema.com
 *               password:
 *                 type: string
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/admin/login', validate(adminLoginSchema), ctrl.adminLogin);

/**
 * @swagger
 * /api/v1/auth/loja/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login do usuário da loja
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, storeSlug]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               storeSlug:
 *                 type: string
 *                 description: Slug único da loja
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/loja/login', validate(storeLoginSchema), ctrl.storeLogin);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Retorna dados do usuário autenticado
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário
 *       401:
 *         description: Não autenticado
 */
router.get('/me', authenticate, ctrl.me);

export default router;
