import { createApp } from './app';
import { env } from './config/env';
import { startQueue, startWorkers, stopQueue } from './jobs/queue';

async function main() {
  await startQueue();

  if (env.RUN_WORKER) {
    await startWorkers();
  }

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`AgroBot backend rodando em http://localhost:${env.PORT}`);
  });

  const shutdown = () => {
    server.close(() => {
      stopQueue().finally(() => process.exit(0));
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Falha ao iniciar o backend:', error);
  process.exit(1);
});
