import { Router } from 'express';

import { asyncHandler } from '../utils/async-handler';
import { getUserId } from '../middlewares/auth';
import { listActivities } from '../services/voice-job.service';

export const activitiesRouter = Router();

activitiesRouter.get(
  '/activities',
  asyncHandler(async (req, res) => {
    const activities = await listActivities(getUserId(req));

    res.json(activities);
  })
);
