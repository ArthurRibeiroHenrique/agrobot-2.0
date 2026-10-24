import { z } from 'zod';

export const ASSISTANT_REASONS = [
  'nenhum',
  'diagnostico_praga_doenca',
  'dose_ou_mistura_de_defensivo',
  'carencia_ou_seguranca',
  'informacao_insuficiente',
  'fora_do_escopo'
] as const;

export type AssistantReason = (typeof ASSISTANT_REASONS)[number];

// Formato pedido ao LLM. Todos os campos são obrigatórios na saída estruturada.
export const assistantAnswerSchema = z.object({
  answer: z.string(),
  needs_technician: z.boolean(),
  reason: z.enum(ASSISTANT_REASONS),
  confidence: z.number()
});

export type AssistantAnswer = z.infer<typeof assistantAnswerSchema>;

export const askAssistantSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Escreva a sua pergunta')
    .max(1000, 'Pergunta muito longa'),
  timezone: z.string().optional()
});

export type AskAssistantInput = z.infer<typeof askAssistantSchema>;
