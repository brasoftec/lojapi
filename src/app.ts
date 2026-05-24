import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { swaggerSpec, swaggerUi } from './config/swagger';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';

const app = express();

// ─── Segurança ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Store-ID'],
}));

// ─── Rate Limit ───────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
app.use('/api/', limiter);

// ─── Parsers ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logs ─────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Docs ─────────────────────────────────────────────────────────────────────
// JSON do spec deve ser registrado ANTES do swaggerUi.serve
app.get('/api/v1/docs/swagger.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'lojapi — Documentação',
  swaggerOptions: {
    persistAuthorization: true,
    defaultModelsExpandDepth: -1,
  },
}));

// ─── Developer Portal ─────────────────────────────────────────────────────────
app.get('/dev', (_req, res) => {
  res.sendFile('public/dev.html', { root: __dirname });
});
app.get('/dev.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile('public/dev.js', { root: __dirname });
});
app.get('/favicon.png', (_req, res) => {
  res.sendFile('public/favicon.png', { root: __dirname });
});

// ─── Rotas ────────────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ─── Status Check ─────────────────────────────────────────────────────────────
app.get('/status', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Erros ────────────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
