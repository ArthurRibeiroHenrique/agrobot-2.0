import { zodResponseFormat } from 'openai/helpers/zod';

import { openai } from '../lib/openai';
import { env } from '../config/env';
import {
  ACTIVITY_TYPES,
  Extraction,
  extractionSchema,
  INTENTS
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
    'A fala pode relatar uma atividade feita, fazer uma pergunta, ou as duas coisas.',
    'A fala vem de uma transcrição automática e pode ter palavras erradas.',
    '',
    `Data de hoje: ${context.today}.`,
    '',
    'Talhões cadastrados deste produtor:',
    fields,
    '',
    'Regras:',
    `- intent: um de ${INTENTS.join(', ')}. "registro" quando o produtor conta algo que fez ou gastou; "pergunta" quando só pergunta ou pede orientação; "ambos" quando conta uma atividade e também pergunta algo; "incerto" quando não dá para saber se ele quer anotar ou perguntar.`,
    '- Só é "registro" se a fala disser o que foi feito ou gasto (apliquei, passei, plantei, botei, colhi, irriguei, paguei, comprei...). Só o nome de um produto e de um talhão, sem verbo, como "Glifosato, Talhão 2", é "incerto".',
    '- question: quando intent for "pergunta" ou "ambos", a pergunta reescrita de forma completa, que se entenda sozinha (ex.: "Quando posso colher o Talhão 2 depois da aplicação de glifosato de hoje?"). Nos outros casos, null.',
    '- Quando intent for "pergunta", não preencha a atividade: activity_type "outro" e os demais campos null. Produtos e talhões citados na pergunta não são uma atividade feita.',
    '- Não invente informações. O que não foi dito deve ser null.',
    `- activity_type: um de ${ACTIVITY_TYPES.join(', ')}. Use "aplicacao" para defensivos (herbicida, fungicida, inseticida), "adubacao" para adubo, calcário e fertilizante, "custo" para despesas sem operação de campo, e "outro" se não for possível classificar.`,
    '- product: nome do insumo, semente ou produto colhido, como falado. Se for claramente um insumo conhecido mal transcrito (ex.: "glifosfato"), use o nome correto (glifosato). Se o produtor não disse qual foi, usando só palavras vagas como "um produto", "uma coisa" ou "aquele negócio", use null.',
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
    // Modelos de raciocínio não aceitam temperature; esforço baixo reduz custo e espera.
    reasoning_effort: 'low',
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
