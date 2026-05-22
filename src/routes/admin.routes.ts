import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middlewares/auth';

const router = Router();
const ctrl = new AdminController();

// Todas as rotas admin requerem autenticação
router.use(authenticate, requireAdmin);

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Dashboard com métricas gerais
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas do sistema
 */
router.get('/dashboard', ctrl.dashboard);

/**
 * @swagger
 * /api/v1/admin/lojas:
 *   get:
 *     tags: [Admin]
 *     summary: Listar todas as lojas
 *     security:
 *       - BearerAuth: []
 */
router.get('/lojas', ctrl.listStores);

/**
 * @swagger
 * /api/v1/admin/lojas/{storeId}:
 *   get:
 *     tags: [Admin]
 *     summary: Detalhes de uma loja
 *     security:
 *       - BearerAuth: []
 *   patch:
 *     tags: [Admin]
 *     summary: Ativar/desativar loja
 *     security:
 *       - BearerAuth: []
 */
router.get('/lojas/:storeId', ctrl.getStore);
router.patch('/lojas/:storeId/status', ctrl.toggleStoreStatus);
router.patch('/lojas/:storeId/plano', ctrl.updateStorePlan);

/**
 * @swagger
 * /api/v1/admin/usuarios:
 *   get:
 *     tags: [Admin]
 *     summary: Listar administradores
 *     security:
 *       - BearerAuth: []
 *   post:
 *     tags: [Admin]
 *     summary: Criar administrador (Super Admin)
 *     security:
 *       - BearerAuth: []
 */
router.get('/usuarios', ctrl.listAdmins);
router.post('/usuarios', requireSuperAdmin, ctrl.createAdmin);
router.put('/usuarios/:id', requireSuperAdmin, ctrl.updateAdmin);
router.delete('/usuarios/:id', requireSuperAdmin, ctrl.deleteAdmin);

/**
 * @swagger
 * /api/v1/admin/relatorios/pedidos:
 *   get:
 *     tags: [Admin]
 *     summary: Relatório de pedidos por período
 *     security:
 *       - BearerAuth: []
 */
router.get('/relatorios/pedidos', ctrl.ordersReport);
router.get('/relatorios/lojas', ctrl.storesReport);

export default router;
