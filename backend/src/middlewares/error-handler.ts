import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';

import { HttpError } from '../utils/http-error';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Rota não encontrada'
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Dados inválidos',
      issues: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error:
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Arquivo de áudio maior que o limite permitido'
          : 'Envio de arquivo inválido'
    });
  }

  console.error(err);

  return res.status(500).json({
    error: 'Erro interno do servidor'
  });
}
