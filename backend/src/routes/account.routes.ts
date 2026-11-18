import { Router } from 'express';

import { asyncHandler } from '../utils/async-handler';
import { getUserId } from '../middlewares/auth';
import { deleteAccount } from '../services/account.service';

export const accountRouter = Router();

// Apaga a conta de quem está logado e todos os dados dela. Não tem volta.
accountRouter.delete(
  '/account',
  asyncHandler(async (req, res) => {
    await deleteAccount(getUserId(req));

    res.status(204).end();
  })
);
