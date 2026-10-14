import { zodResponseFormat } from 'openai/helpers/zod';

import { openai } from '../lib/openai';
import { env } from '../config/env';
import {
  ACTIVITY_TYPES,
  Extraction,
  extractionSchema
} from '../schemas/activity.schema';
import { FieldRef } from './farm.service';

export type ExtractionContext = {
  today: string;
  fields: FieldRef[];
};

export function buildSystemPrompt(context: ExtractionContext): string {
  const fields =
    context.fields.length > 0
      ? context.fields
          .map((field) =>
            field.crop ? `- ${field.name} (${field.crop})` : `- ${field.name}`
          )
          .join('\n')
      : '(nenhum talhão cadastrado)';

  return [
    'Você é um assistente de registro agrícola. Converta a fala de um produtor rural brasileiro em dados estruturados.',
    '',
    `Data de hoje: ${context.today}.`,
    '',
    'Talhões cadastrados deste produtor:',
    fields,
    '',
    'Regras:',
    '- Não invente informações. O que não foi dito deve ser null.',
    `- activity_type: um de ${ACTIVITY_TYPES.join(', ')}. Use "aplicacao" para defensivos (herbicida, fungicida, inseticida), "adubacao" para adubo, calcário e fertilizante, "custo" para despesas sem operação de campo, e "outro" se não for possível classificar.`,
    '- product: nome do insumo, semente ou produto colhido, como falado.',
    '- quantity e unit: quantidade total dita. Para unit use kg, g, t, L, mL, sc (saco/saca), ha ou un.',
    '- field_name: se a fala corresponder a um talhão cadastrado, use exatamente o nome cadastrado. Caso contrário, use o nome falado. Se nenhum local foi dito, null.',
    '- occurred_at: data da atividade em AAAA-MM-DD, resolvendo "hoje", "ontem", "anteontem" e dias da semana a partir da data de hoje. Se a data não foi dita, null.',
    '- cost: valor total em dinheiro, se dito. currency: "BRL" quando houver cost.',
    '- confidence: de 0 a 1, o quanto a fala foi clara e completa.'
  ].join('\n');
}

export async function extractActivityFromTranscript(
  transcript: string,
  context: ExtractionContext
): Promise<Extraction> {
  const completion = await openai.beta.chat.completions.parse({
    model: env.OPENAI_LLM_MODEL,
    temperature: 0,
    response_format: zodResponseFormat(extractionSchema, 'atividade_agricola'),
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(context)
      },
      {
        role: 'user',
        content: transcript
      }
    ]
  });

  const message = completion.choices[0]?.message;

  if (!message?.parsed) {
    throw new Error(
      message?.refusal
        ? `Modelo recusou a extração: ${message.refusal}`
        : 'Modelo não retornou a extração estruturada'
    );
  }

  return message.parsed;
}
