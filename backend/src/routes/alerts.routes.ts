import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../utils/async-handler';
import { getUserId } from '../middlewares/auth';
import { listarAlertas, sugerirCarencia } from '../services/carencia.service';
import { todayInTimezone } from '../services/draft.service';

const alertsQuerySchema = z.object({
  timezone: z.string().max(64).optional()
});

const suggestionQuerySchema = z.object({
  product: z.string().trim().min(1, 'Informe o produto').max(200),
  field_id: z.string().uuid().optional()
});

export const alertsRouter = Router();

// Carência das aplicações: o que ainda não pode colher, o que falta a bula e o que já liberou.
// "Hoje" no fuso do produtor, para a liberação não virar o dia antes da hora.
alertsRouter.get(
  '/alerts',
  asyncHandler(async (req, res) => {
    const { timezone } = alertsQuerySchema.parse(req.query);

    res.json(await listarAlertas(getUserId(req), todayInTimezone(timezone ?? null)));
  })
);

// Sugestão para o campo de carência: o que o produtor já leu na bula ou o catálogo conferido.
// Sem sugestão, devolve null e o app pede para olhar a bula.
alertsRouter.get(
  '/withholding/suggestion',
  asyncHandler(async (req, res) => {
    const { product, field_id } = suggestionQuerySchema.parse(req.query);

    res.json(await sugerirCarencia(getUserId(req), product, field_id ?? null));
  })
);
