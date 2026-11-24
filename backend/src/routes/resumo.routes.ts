import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../utils/async-handler';
import { getUserId } from '../middlewares/auth';
import { todayInTimezone } from '../services/draft.service';
import { montarResumoDoDiario } from '../services/resumo.service';

const summaryQuerySchema = z.object({
  timezone: z.string().max(64).optional()
});

export const resumoRouter = Router();

// Resumo do diário para a tela inicial. "Este mês" no fuso do produtor.
resumoRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const { timezone } = summaryQuerySchema.parse(req.query);

    res.json(await montarResumoDoDiario(getUserId(req), todayInTimezone(timezone ?? null)));
  })
);
