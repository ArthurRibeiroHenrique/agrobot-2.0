import path from 'path';
import { toFile } from 'openai';

import { openai } from '../lib/openai';
import { env } from '../config/env';
import { downloadAudio } from './storage.service';

export async function transcribeAudio(storagePath: string): Promise<string> {
  const buffer = await downloadAudio(storagePath);

  const transcription = await openai.audio.transcriptions.create({
    file: await toFile(buffer, path.basename(storagePath)),
    model: env.OPENAI_TRANSCRIPTION_MODEL,
    language: 'pt'
  });

  return transcription.text ?? '';
}
