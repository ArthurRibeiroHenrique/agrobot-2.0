import { Router } from 'express';

import { asyncHandler } from '../utils/async-handler';
import { getUserId } from '../middlewares/auth';
import { askAssistantSchema } from '../schemas/assistant.schema';
import {
  askAssistant,
  listAssistantMessages
} from '../services/assistant.service';

export const assistantRouter = Router();

assistantRouter.get(
  '/assistant/messages',
  asyncHandler(async (req, res) => {
    res.json(await listAssistantMessages(getUserId(req)));
  })
);

assistantRouter.post(
  '/assistant/messages',
  asyncHandler(async (req, res) => {
    const input = askAssistantSchema.parse(req.body ?? {});

    const message = await askAssistant({
      userId: getUserId(req),
      question: input.question,
      timezone: input.timezone,
      source: 'texto'
    });

    res.status(201).json(message);
  })
);
