import { PgBoss } from 'pg-boss';

import { env } from '../config/env';
import { processVoiceJob } from '../services/voice-job-processor';

export const VOICE_QUEUE = 'voice-jobs';
export const VOICE_RETRY_LIMIT = 3;

type VoiceJobPayload = {
  voiceJobId: string;
};

let boss: PgBoss | null = null;

export async function startQueue(): Promise<PgBoss> {
  if (boss) return boss;

  const instance = new PgBoss({
    connectionString: env.DATABASE_URL
  });

  instance.on('error', (error) => {
    console.error('Erro na fila:', error);
  });

  await instance.start();

  await instance.createQueue(VOICE_QUEUE, {
    retryLimit: VOICE_RETRY_LIMIT,
    retryDelay: 15,
    retryBackoff: true,
    expireInSeconds: 300
  });

  boss = instance;

  return instance;
}

export async function stopQueue(): Promise<void> {
  if (!boss) return;

  await boss.stop();
  boss = null;
}

export async function enqueueVoiceJob(voiceJobId: string): Promise<void> {
  const instance = await startQueue();

  await instance.send(VOICE_QUEUE, { voiceJobId });
}

export async function startWorkers(): Promise<void> {
  const instance = await startQueue();

  await instance.work<VoiceJobPayload>(VOICE_QUEUE, async (jobs) => {
    for (const job of jobs) {
      await processVoiceJob(job.data.voiceJobId, {
        isLastAttempt: job.retryCount >= VOICE_RETRY_LIMIT
      });
    }
  });
}
