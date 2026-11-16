import { Router } from 'express';
import { z } from 'zod';

import { asyncHandler } from '../utils/async-handler';
import { getUserId } from '../middlewares/auth';
import { activityUpdateSchema } from '../schemas/activity.schema';
import { HttpError } from '../utils/http-error';
import {
  deleteActivity,
  getActivity,
  listActivities,
  updateActivity
} from '../services/voice-job.service';

export const activitiesRouter = Router();

function activityId(id: string): string {
  if (!z.string().uuid().safeParse(id).success) {
    throw new HttpError(404, 'Registro não encontrado');
  }

  return id;
}

activitiesRouter.get(
  '/activities',
  asyncHandler(async (req, res) => {
    const activities = await listActivities(getUserId(req));

    res.json(activities);
  })
);

activitiesRouter.get(
  '/activities/:id',
  asyncHandler(async (req, res) => {
    const activity = await getActivity(activityId(req.params.id), getUserId(req));

    if (!activity) {
      throw new HttpError(404, 'Registro não encontrado');
    }

    res.json(activity);
  })
);

activitiesRouter.patch(
  '/activities/:id',
  asyncHandler(async (req, res) => {
    const input = activityUpdateSchema.parse(req.body ?? {});

    res.json(await updateActivity(activityId(req.params.id), getUserId(req), input));
  })
);

activitiesRouter.delete(
  '/activities/:id',
  asyncHandler(async (req, res) => {
    await deleteActivity(activityId(req.params.id), getUserId(req));

    res.status(204).end();
  })
);
