import 'dotenv/config';
import { z } from 'zod';

// Linha vazia no .env (ex.: "CHAVE=") conta como não preenchida.
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const envSchema = z
  .object({
    PORT: z.coerce.number().default(3333),

    // Onde a IA roda: "azure" (Azure OpenAI) ou "openai" (API da OpenAI direto).
    AI_PROVIDER: z.enum(['azure', 'openai']).default('openai'),

    OPENAI_API_KEY: optional(z.string()),
    OPENAI_TRANSCRIPTION_MODEL: z.string().default('gpt-4o-mini-transcribe'),
    OPENAI_LLM_MODEL: z.string().default('gpt-5-mini'),

    // No Azure, as chamadas usam o nome do deployment criado no portal, não o nome do modelo.
    AZURE_OPENAI_ENDPOINT: optional(z.string().url()),
    AZURE_OPENAI_API_KEY: optional(z.string()),
    AZURE_OPENAI_API_VERSION: z.string().default('2025-04-01-preview'),
    AZURE_OPENAI_TRANSCRIPTION_DEPLOYMENT: z.string().default('gpt-4o-mini-transcribe'),
    // Opcionais: só quando a transcrição fica em outro recurso (outra região) do Azure.
    // Em branco, a transcrição usa o mesmo endpoint e a mesma chave acima.
    AZURE_OPENAI_TRANSCRIPTION_ENDPOINT: optional(z.string().url()),
    AZURE_OPENAI_TRANSCRIPTION_API_KEY: optional(z.string()),
    AZURE_OPENAI_LLM_DEPLOYMENT: z.string().default('gpt-5-mini'),

    SUPABASE_URL: z.string().url('SUPABASE_URL obrigatória'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY obrigatória'),
    SUPABASE_AUDIO_BUCKET: z.string().default('voice-audio'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL obrigatória'),
    RUN_WORKER: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
    // Máximo de chamadas de IA (áudios e perguntas) por usuário a cada hora.
    AI_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(60),
    // false: apaga o áudio depois de processado. true: guarda (ex.: para montar casos reais do eval).
    KEEP_AUDIO_AFTER_PROCESSING: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true')
  })
  .superRefine((value, ctx) => {
    const required: Array<[keyof typeof value, string]> =
      value.AI_PROVIDER === 'azure'
        ? [
            ['AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_ENDPOINT obrigatória com AI_PROVIDER=azure'],
            ['AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_API_KEY obrigatória com AI_PROVIDER=azure']
          ]
        : [['OPENAI_API_KEY', 'OPENAI_API_KEY obrigatória com AI_PROVIDER=openai']];

    for (const [key, message] of required) {
      if (!value[key]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message });
      }
    }
  });

export const env = envSchema.parse(process.env);
