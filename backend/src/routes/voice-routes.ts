import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

import { env } from '../config/env';
import { asyncHandler } from '../utils/async-handler';
import {
  createVoiceJob,
  getVoiceJob,
  confirmVoiceJob
} from '../services/voice-job.service';
import { processVoiceJob } from '../services/voice-job-processor';

const uploadDir = path.resolve(env.UPLOAD_DIR);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

export const voiceRouter = Router();

voiceRouter.post(
  '/voice-jobs',
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new Error('Arquivo de áudio é obrigatório');
    }

    const metadata = {
      farm_id: req.body.farm_id ?? null,
      field_id: req.body.field_id ?? null,
      timezone: req.body.timezone ?? null,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype
    };

    const job = await createVoiceJob({
      audioPath: req.file.path,
      metadata
    });

    processVoiceJob(job.id).catch(console.error);

    res.status(202).json({
      id: job.id,
      status: job.status
    });
  })
);

voiceRouter.get(
  '/voice-jobs/:id',
  asyncHandler(async (req, res) => {
    const job = await getVoiceJob(req.params.id);

    if (!job) {
      return res.status(404).json({
        error: 'Voice job não encontrado'
      });
    }

    return res.json(job);
  })
);

voiceRouter.post(
  '/voice-jobs/:id/confirm',
  asyncHandler(async (req, res) => {
    const corrections = req.body?.corrections ?? req.body ?? {};

    const activity = await confirmVoiceJob(
      req.params.id,
      corrections
    );

    res.status(201).json(activity);
  })
);