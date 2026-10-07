import { Request } from 'express';

import { supabaseAdmin } from '../lib/supabase';
import { asyncHandler } from '../utils/async-handler';
import { HttpError } from '../utils/http-error';

export const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Token de acesso ausente');
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    throw new HttpError(401, 'Token de acesso inválido ou expirado');
  }

  req.userId = data.user.id;

  next();
});

export function getUserId(req: Request): string {
  if (!req.userId) {
    throw new HttpError(401, 'Usuário não autenticado');
  }

  return req.userId;
}
