import { startWorkers, stopQueue } from './jobs/queue';

async function main() {
  await startWorkers();

  console.log('AgroBot worker aguardando tarefas');

  const shutdown = () => {
    stopQueue().finally(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Falha ao iniciar o worker:', error);
  process.exit(1);
});
