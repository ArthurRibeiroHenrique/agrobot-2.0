import { z } from 'zod';

export const ACTIVITY_TYPES = [
  'plantio',
  'aplicacao',
  'adubacao',
  'irrigacao',
  'colheita',
  'manejo',
  'custo',
  'outro'
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

const numericOrNull = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') return null;

  const normalized = String(value).replace(',', '.');
  const parsed = Number(normalized);

  return Number.isNaN(parsed) ? null : parsed;
}, z.number().nullable());

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

const dateOrNull = z
  .string()
  .refine(isValidDateString, 'Data deve estar no formato AAAA-MM-DD')
  .nullable();

// Formato pedido ao LLM. A saída estruturada exige todos os campos presentes,
// por isso o que não foi dito vem como null em vez de ausente.
export const extractionSchema = z.object({
  activity_type: z.enum(ACTIVITY_TYPES),
  product: z.string().nullable(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  field_name: z.string().nullable(),
  occurred_at: z.string().nullable(),
  cost: z.number().nullable(),
  currency: z.string().nullable(),
  confidence: z.number()
});

export type Extraction = z.infer<typeof extractionSchema>;

export const activityDraftSchema = z
  .object({
    activity_type: z.string().default('outro'),
    product: z.string().nullable().optional(),
    quantity: numericOrNull.optional(),
    unit: z.string().nullable().optional(),
    field_id: z.string().uuid().nullable().optional(),
    field_name: z.string().nullable().optional(),
    occurred_at: dateOrNull.optional(),
    cost: numericOrNull.optional(),
    currency: z.string().nullable().optional(),
    confidence: z.coerce.number().min(0).max(1).optional(),
    missing_fields: z.array(z.string()).optional(),
    raw_transcript: z.string().optional()
  })
  .passthrough();

export type ActivityDraft = z.infer<typeof activityDraftSchema>;
