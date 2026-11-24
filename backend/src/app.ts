import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import { requireAuth } from './middlewares/auth';
import { createAiRateLimit } from './middlewares/ai-rate-limit';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { healthRouter } from './routes/health.routes';
import { voiceRouter } from './routes/voice.routes';
import { activitiesRouter } from './routes/activities.routes';
import { farmsRouter } from './routes/farms.routes';
import { assistantRouter } from './routes/assistant.routes';
import { sharesRouter } from './routes/shares.routes';
import { accountRouter } from './routes/account.routes';
import { alertsRouter } from './routes/alerts.routes';
import { resumoRouter } from './routes/resumo.routes';

export function createApp() {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: env.ALLOWED_ORIGINS.split(',')
    })
  );

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  app.use('/health', healthRouter);

  const v1 = express.Router();

  v1.use(requireAuth);

  // Só as rotas que chamam a IA contam no limite.
  v1.post(
    ['/voice-jobs', '/voice-jobs/:id/ask', '/assistant/messages'],
    createAiRateLimit({ limit: env.AI_RATE_LIMIT_PER_HOUR, windowMs: 60 * 60 * 1000 })
  );

  v1.use('/', voiceRouter);
  v1.use('/', activitiesRouter);
  v1.use('/', farmsRouter);
  v1.use('/', assistantRouter);
  v1.use('/', sharesRouter);
  v1.use('/', accountRouter);
  v1.use('/', alertsRouter);
  v1.use('/', resumoRouter);

  app.use('/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
