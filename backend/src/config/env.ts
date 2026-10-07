import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY obrigatória'),
  OPENAI_TRANSCRIPTION_MODEL: z.string().default('whisper-1'),
  OPENAI_LLM_MODEL: z.string().default('gpt-4o-mini'),
  SUPABASE_URL: z.string().url('SUPABASE_URL obrigatória'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY obrigatória'),
  SUPABASE_AUDIO_BUCKET: z.string().default('voice-audio'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL obrigatória'),
  RUN_WORKER: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000')
});

export const env = envSchema.parse(process.env);
