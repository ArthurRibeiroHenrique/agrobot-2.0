import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createAiRateLimit } from '../src/middlewares/ai-rate-limit';
import { errorHandler } from '../src/middlewares/error-handler';

function buildApp(limit: number, clock: { now: number }) {
  const app = express();

  app.use((req, res, next) => {
    req.userId = req.header('x-user') ?? 'usuario-a';
    next();
  });
  app.post('/ia', createAiRateLimit({ limit, windowMs: 60_000, now: () => clock.now }));
  app.post('/ia', (req, res) => res.status(201).json({ ok: true }));
  app.use(errorHandler);

  return app;
}

describe('limite de chamadas de IA', () => {
  it('bloqueia com 429 depois do limite e informa quando tentar de novo', async () => {
    const clock = { now: 0 };
    const app = buildApp(2, clock);

    await request(app).post('/ia').expect(201);
    await request(app).post('/ia').expect(201);

    const blocked = await request(app).post('/ia').expect(429);

    expect(blocked.body.error).toContain('Limite de uso atingido');
    expect(blocked.headers['retry-after']).toBe('60');
  });

  it('conta cada usuário separadamente', async () => {
    const app = buildApp(1, { now: 0 });

    await request(app).post('/ia').set('x-user', 'a').expect(201);
    await request(app).post('/ia').set('x-user', 'b').expect(201);
    await request(app).post('/ia').set('x-user', 'a').expect(429);
  });

  it('libera de novo quando a janela termina', async () => {
    const clock = { now: 0 };
    const app = buildApp(1, clock);

    await request(app).post('/ia').expect(201);
    await request(app).post('/ia').expect(429);

    clock.now = 60_000;

    await request(app).post('/ia').expect(201);
  });
});
