import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY obrigatória'),
  OPENAI_TRANSCRIPTION_MODEL: z.string().default('whisper-1'),
  OPENAI_LLM_MODEL: z.string().default('gpt-4o-mini'),
  SUPABASE_URL: z.string().url('SUPABASE_URL obrigatória'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY obrigatória'),
  UPLOAD_DIR: z.string().default('./uploads'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000')
});

export const env = envSchema.parse(process.env);