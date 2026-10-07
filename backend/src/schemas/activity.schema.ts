import { z } from 'zod';

const numericOrNull = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') return null;

  const normalized = String(value).replace(',', '.');
  const parsed = Number(normalized);

  return Number.isNaN(parsed) ? null : parsed;
}, z.number().nullable());

export const activityDraftSchema = z
  .object({
    activity_type: z.string().default('outro'),
    product: z.string().nullable().optional(),
    quantity: numericOrNull.optional(),
    unit: z.string().nullable().optional(),
    field_name: z.string().nullable().optional(),
    occurred_at: z.string().nullable().optional(),
    cost: numericOrNull.optional(),
    currency: z.string().nullable().optional(),
    confidence: z.coerce.number().min(0).max(1).optional(),
    missing_fields: z.array(z.string()).optional(),
    raw_transcript: z.string().optional()
  })
  .passthrough();

export type ActivityDraft = z.infer<typeof activityDraftSchema>;