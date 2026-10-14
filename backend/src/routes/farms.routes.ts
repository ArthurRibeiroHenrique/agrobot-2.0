import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../utils/async-handler';
import { getUserId } from '../middlewares/auth';
import { createFarmSchema, createFieldSchema } from '../schemas/farm.schema';
import {
  createFarm,
  createField,
  listFarms,
  listFields
} from '../services/farm.service';

const listFieldsQuerySchema = z.object({
  farm_id: z.string().uuid().optional()
});

export const farmsRouter = Router();

farmsRouter.get(
  '/farms',
  asyncHandler(async (req, res) => {
    res.json(await listFarms(getUserId(req)));
  })
);

farmsRouter.post(
  '/farms',
  asyncHandler(async (req, res) => {
    const input = createFarmSchema.parse(req.body ?? {});

    res.status(201).json(await createFarm(getUserId(req), input));
  })
);

farmsRouter.get(
  '/fields',
  asyncHandler(async (req, res) => {
    const query = listFieldsQuerySchema.parse(req.query);

    res.json(await listFields(getUserId(req), query.farm_id));
  })
);

farmsRouter.post(
  '/fields',
  asyncHandler(async (req, res) => {
    const input = createFieldSchema.parse(req.body ?? {});

    res.status(201).json(await createField(getUserId(req), input));
  })
);
