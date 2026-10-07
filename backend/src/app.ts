import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import { requireAuth } from './middlewares/auth';
import { errorHandler, notFoundHandler } from './middlewares/error-handler';
import { healthRouter } from './routes/health.routes';
import { voiceRouter } from './routes/voice.routes';
import { activitiesRouter } from './routes/activities.routes';

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
  v1.use('/', voiceRouter);
  v1.use('/', activitiesRouter);

  app.use('/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
