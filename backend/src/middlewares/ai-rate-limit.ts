import { RequestHandler } from 'express';

import { getUserId } from './auth';
import { HttpError } from '../utils/http-error';

type Window = {
  count: number;
  resetAt: number;
};

// Limita as chamadas que gastam IA (transcrição e modelo de linguagem) por usuário.
// Fica em memória: vale enquanto o backend roda com uma só réplica, e zera quando ele reinicia.
export function createAiRateLimit(options: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RequestHandler {
  const now = options.now ?? Date.now;
  const windows = new Map<string, Window>();

  return (req, res, next) => {
    const userId = getUserId(req);
    const current = now();

    // Evita que o mapa cresça sem fim: descarta janelas vencidas de vez em quando.
    if (windows.size > 10_000) {
      for (const [key, window] of windows) {
        if (window.resetAt <= current) windows.delete(key);
      }
    }

    let window = windows.get(userId);

    if (!window || window.resetAt <= current) {
      window = { count: 0, resetAt: current + options.windowMs };
      windows.set(userId, window);
    }

    if (window.count >= options.limit) {
      const retryAfterSeconds = Math.ceil((window.resetAt - current) / 1000);
      const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));

      res.setHeader('Retry-After', String(retryAfterSeconds));

      return next(
        new HttpError(
          429,
          `Limite de uso atingido. Tente de novo em ${minutes} minuto${minutes > 1 ? 's' : ''}.`
        )
      );
    }

    window.count += 1;
    res.setHeader('X-RateLimit-Limit', String(options.limit));
    res.setHeader('X-RateLimit-Remaining', String(options.limit - window.count));

    next();
  };
}
