import { openai } from '../lib/openai';
import { env } from '../config/env';
import {
  activityDraftSchema,
  ActivityDraft
} from '../schemas/activity.schema';

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return {};
      }
    }

    return {};
  }
}

export async function extractActivityFromTranscript(
  transcript: string
): Promise<ActivityDraft> {
  const systemPrompt = [
    'Você é um assistente de registro agrícola.',
    'Converta a fala do produtor em um JSON estruturado.',
    'Não invente informações ausentes.',
    'Se um campo não estiver claro, use null e liste o campo em missing_fields.',
    'Considere português brasileiro e termos rurais.',
    'Retorne somente JSON válido, sem markdown.',
    'Campos esperados:',
    'activity_type, product, quantity, unit, field_name, occurred_at, cost, currency, confidence, missing_fields, raw_transcript.'
  ].join(' ');

  const completion = await openai.chat.completions.create({
    model: env.OPENAI_LLM_MODEL,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: transcript
      }
    ]
  });

  const content = completion.choices[0]?.message?.content ?? '{}';
  const parsed = safeJsonParse(content);

  try {
    return activityDraftSchema.parse(parsed);
  } catch {
    return activityDraftSchema.parse({
      activity_type: 'outro',
      raw_transcript: transcript,
      confidence: 0.1,
      missing_fields: [
        'activity_type',
        'product',
        'quantity',
        'unit',
        'field_name',
        'occurred_at'
      ]
    });
  }
}