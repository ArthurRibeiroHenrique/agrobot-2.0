import { z } from 'zod';

const optionalText = z
  .string()
  .trim()
  .max(120)
  .nullable()
  .optional()
  .transform((value) => (value ? value : null));

export const createFarmSchema = z.object({
  name: z.string().trim().min(1, 'Nome da propriedade é obrigatório').max(120),
  city: optionalText,
  state: optionalText
});

export const createFieldSchema = z.object({
  farm_id: z.string().uuid('farm_id inválido'),
  name: z.string().trim().min(1, 'Nome do talhão é obrigatório').max(120),
  crop: optionalText,
  area_ha: z.coerce.number().positive().nullable().optional()
});

export type CreateFarmInput = z.infer<typeof createFarmSchema>;
export type CreateFieldInput = z.infer<typeof createFieldSchema>;
