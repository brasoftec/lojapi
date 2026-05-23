import { Router } from 'express';
import authRoutes from './auth.routes';
import storeRoutes from './store.routes';
import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import customerRoutes from './customer.routes';
import orderRoutes from './order.routes';
import webhookRoutes from './webhook.routes';
import adminRoutes from './admin.routes';
import tokenRoutes from './token.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/cadastrar', storeRoutes);
router.use('/loja', storeRoutes);
router.use('/produtos', productRoutes);
router.use('/categorias', categoryRoutes);
router.use('/clientes', customerRoutes);
router.use('/pedidos', orderRoutes);
router.use('/webhook', webhookRoutes);
router.use('/tokens', tokenRoutes);
router.use('/admin', adminRoutes);

export default router;
