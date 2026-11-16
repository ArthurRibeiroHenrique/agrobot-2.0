import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../utils/async-handler';
import { getUserId } from '../middlewares/auth';
import { HttpError } from '../utils/http-error';
import {
  leaveSharedDiary,
  listShares,
  shareDiary,
  stopSharing
} from '../services/sharing.service';

const shareSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido').max(320)
});

function personId(id: string): string {
  if (!z.string().uuid().safeParse(id).success) {
    throw new HttpError(404, 'Compartilhamento não encontrado');
  }

  return id;
}

export const sharesRouter = Router();

sharesRouter.get(
  '/shares',
  asyncHandler(async (req, res) => {
    res.json(await listShares(getUserId(req)));
  })
);

sharesRouter.post(
  '/shares',
  asyncHandler(async (req, res) => {
    const { email } = shareSchema.parse(req.body ?? {});

    res.status(201).json(await shareDiary(getUserId(req), email));
  })
);

// Para de compartilhar o próprio diário com essa pessoa.
sharesRouter.delete(
  '/shares/:memberId',
  asyncHandler(async (req, res) => {
    await stopSharing(getUserId(req), personId(req.params.memberId));

    res.status(204).end();
  })
);

// Deixa de ver o diário que essa pessoa compartilhou.
sharesRouter.delete(
  '/shares/received/:ownerId',
  asyncHandler(async (req, res) => {
    await leaveSharedDiary(getUserId(req), personId(req.params.ownerId));

    res.status(204).end();
  })
);
