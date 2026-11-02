import path from 'path';
import { toFile } from 'openai';

import { openai } from '../lib/openai';
import { env } from '../config/env';
import { downloadAudio } from './storage.service';

// Palavras que o modelo de voz costuma errar sem contexto (ex.: "ureia" virando "durei").
const AGRO_TERMS = [
  'talhão',
  'ureia',
  'glifosato',
  'calcário',
  'NPK',
  'gesso agrícola',
  'herbicida',
  'fungicida',
  'inseticida',
  'calda',
  'saca',
  'hectare',
  'plantio',
  'colheita',
  'adubação',
  'pulverização'
];

// Texto de contexto enviado ao modelo de voz junto com o áudio.
export function buildTranscriptionPrompt(fieldNames: string[] = []): string {
  const fields =
    fieldNames.length > 0 ? ` Talhões da propriedade: ${fieldNames.join(', ')}.` : '';

  return `Produtor rural brasileiro anotando ou perguntando sobre a lavoura. Termos comuns: ${AGRO_TERMS.join(', ')}.${fields}`;
}

export async function transcribeBuffer(
  buffer: Buffer,
  filename: string,
  fieldNames: string[] = []
): Promise<string> {
  const transcription = await openai.audio.transcriptions.create({
    file: await toFile(buffer, filename),
    model: env.OPENAI_TRANSCRIPTION_MODEL,
    language: 'pt',
    prompt: buildTranscriptionPrompt(fieldNames)
  });

  return transcription.text ?? '';
}

export async function transcribeAudio(
  storagePath: string,
  fieldNames: string[] = []
): Promise<string> {
  const buffer = await downloadAudio(storagePath);

  return transcribeBuffer(buffer, path.basename(storagePath), fieldNames);
}
