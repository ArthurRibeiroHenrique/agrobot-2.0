import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';

import { asyncHandler } from '../utils/async-handler';
import { HttpError } from '../utils/http-error';
import { normalizeAudioExtension } from '../utils/audio-format';
import { getUserId } from '../middlewares/auth';
import { MAX_ACTIVITIES_PER_VOICE_JOB } from '../schemas/activity.schema';
import { enqueueVoiceJob } from '../jobs/queue';
import { removeAudio, uploadAudio } from '../services/storage.service';
import { answerVoiceJobAsQuestion } from '../services/assistant.service';
import {
  createVoiceJob,
  findVoiceJobByClientId,
  getVoiceJob,
  confirmVoiceJob
} from '../services/voice-job.service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

// activities: um item por registro revisado. corrections: formato antigo, um só registro.
const confirmVoiceJobSchema = z.preprocess(
  (body) => {
    const value = (body ?? {}) as Record<string, unknown>;

    return 'activities' in value
      ? value
      : { activities: [value.corrections ?? value] };
  },
  z.object({
    activities: z
      .array(z.record(z.unknown()))
      .min(1, 'Envie ao menos um registro')
      .max(MAX_ACTIVITIES_PER_VOICE_JOB)
  })
);

const createVoiceJobSchema = z.object({
  client_id: z.string().uuid().optional(),
  farm_id: z.string().uuid().optional(),
  field_id: z.string().uuid().optional(),
  timezone: z.string().optional()
});

export const voiceRouter = Router();

// Id fora do formato UUID nunca existe; evita erro de tipo no banco.
voiceRouter.param('id', (req, res, next, id) => {
  if (!z.string().uuid().safeParse(id).success) {
    return next(new HttpError(404, 'Voice job não encontrado'));
  }

  next();
});

voiceRouter.post(
  '/voice-jobs',
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);

    if (!req.file) {
      throw new HttpError(400, 'Arquivo de áudio é obrigatório');
    }

    if (!normalizeAudioExtension(req.file.originalname)) {
      throw new HttpError(
        400,
        'Formato de áudio não aceito. Use MP3, M4A, WAV, OGG, OPUS, WEBM ou FLAC.'
      );
    }

    const body = createVoiceJobSchema.parse(req.body ?? {});

    // Reenvio do mesmo áudio (fila offline): devolve o registro já criado.
    if (body.client_id) {
      const existing = await findVoiceJobByClientId(userId, body.client_id);

      if (existing) {
        return res.status(200).json(existing);
      }
    }

    const audioPath = await uploadAudio({
      userId,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype
    });

    const { job, duplicated, error } = await createVoiceJob({
      userId,
      clientId: body.client_id,
      audioPath,
      metadata: {
        farm_id: body.farm_id ?? null,
        field_id: body.field_id ?? null,
        timezone: body.timezone ?? null,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype
      }
    });

    if (!job) {
      await removeAudio(audioPath).catch(console.error);

      if (duplicated && body.client_id) {
        const existing = await findVoiceJobByClientId(userId, body.client_id);

        if (existing) {
          return res.status(200).json(existing);
        }
      }

      throw error;
    }

    await enqueueVoiceJob(job.id);

    return res.status(202).json(job);
  })
);

voiceRouter.get(
  '/voice-jobs/:id',
  asyncHandler(async (req, res) => {
    const job = await getVoiceJob(req.params.id, getUserId(req));

    if (!job) {
      throw new HttpError(404, 'Voice job não encontrado');
    }

    return res.json(job);
  })
);

voiceRouter.post(
  '/voice-jobs/:id/confirm',
  asyncHandler(async (req, res) => {
    const { activities } = confirmVoiceJobSchema.parse(req.body);

    const saved = await confirmVoiceJob(req.params.id, getUserId(req), activities);

    res.status(201).json(saved);
  })
);

voiceRouter.post(
  '/voice-jobs/:id/ask',
  asyncHandler(async (req, res) => {
    res.json(await answerVoiceJobAsQuestion(req.params.id, getUserId(req)));
  })
);
