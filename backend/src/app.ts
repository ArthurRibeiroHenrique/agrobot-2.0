import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
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
  app.use('/', voiceRouter);
  app.use('/', activitiesRouter);

  app.use((req, res) => {
    res.status(404).json({
      error: 'Rota não encontrada'
    });
  });

  app.use(
    (
      err: any,
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      console.error(err);

      res.status(500).json({
        error: 'Internal server error',
        details: err?.message ?? 'Erro desconhecido'
      });
    }
  );

  return app;
}