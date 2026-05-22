import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Erros do Prisma
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as unknown as { code: string; meta?: { target?: string[] } };

    if (prismaErr.code === 'P2002') {
      return res.status(409).json({
        error: 'Registro duplicado',
        details: `Campo único já existe: ${prismaErr.meta?.target?.join(', ')}`,
      });
    }

    if (prismaErr.code === 'P2025') {
      return res.status(404).json({ error: 'Registro não encontrado' });
    }
  }

  console.error('Erro não tratado:', err);

  return res.status(500).json({
    error: 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
