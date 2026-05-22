import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticateStore } from '../middlewares/auth';

const router = Router();
const ctrl = new CategoryController();

/**
 * @swagger
 * /api/v1/categorias:
 *   get:
 *     tags: [Categorias]
 *     summary: Listar categorias da loja
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *   post:
 *     tags: [Categorias]
 *     summary: Criar categoria
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 */
router.get('/', authenticateStore, ctrl.list);
router.post('/', authenticateStore, ctrl.create);
router.get('/:id', authenticateStore, ctrl.getById);
router.put('/:id', authenticateStore, ctrl.update);
router.delete('/:id', authenticateStore, ctrl.remove);

export default router;
