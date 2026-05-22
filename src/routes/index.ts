import { Router } from 'express';
import authRoutes from './auth.routes';
import storeRoutes from './store.routes';
import productRoutes from './product.routes';
import categoryRoutes from './category.routes';
import customerRoutes from './customer.routes';
import orderRoutes from './order.routes';
import webhookRoutes from './webhook.routes';
import adminRoutes from './admin.routes';

const router = Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);

// ─── Cadastro de Loja ─────────────────────────────────────────────────────────
// POST /api/v1/cadastrar  → cria loja (admin)
router.use('/cadastrar', storeRoutes);

// ─── Loja ─────────────────────────────────────────────────────────────────────
// GET  /api/v1/loja           → dados da loja autenticada
// GET  /api/v1/loja/:storeId  → admin busca loja por ID
// PUT  /api/v1/loja/:storeId  → atualiza loja
// etc.
router.use('/loja', storeRoutes);

// ─── Recursos da Loja ─────────────────────────────────────────────────────────
router.use('/produtos', productRoutes);
router.use('/categorias', categoryRoutes);
router.use('/clientes', customerRoutes);
router.use('/pedidos', orderRoutes);
router.use('/webhook', webhookRoutes);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.use('/admin', adminRoutes);

export default router;
