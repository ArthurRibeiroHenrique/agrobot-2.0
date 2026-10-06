import fs from 'fs';
import { openai } from '../lib/openai';
import { env } from '../config/env';

export async function transcribeAudio(filePath: string): Promise<string> {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(filePath) as any,
    model: env.OPENAI_TRANSCRIPTION_MODEL,
    language: 'pt'
  });

  return transcription.text ?? '';
}