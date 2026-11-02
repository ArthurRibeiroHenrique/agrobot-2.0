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
    '- activities: lista das atividades relatadas, uma por talhão, na ordem em que foram faladas. Quando intent for "pergunta", use uma lista vazia: produtos e talhões citados na pergunta não são uma atividade feita.',
    '- Se a fala citar dois ou mais talhões, crie um item para cada talhão, mesmo que seja a mesma operação. Ex.: "passei glifosato no talhão 1 e no talhão 2" vira dois itens, com o mesmo produto e a mesma data, um com field_name "Talhão 1" e outro com "Talhão 2". O mesmo vale para "nos talhões 1, 2 e 3" ou "no 1 e no 2".',
    '- Operações diferentes também viram itens separados, mesmo no mesmo talhão (ex.: "plantei milho na baixada e adubei o talhão 2" são dois itens).',
    '- Se nenhum talhão foi dito, use um único item com field_name null.',
    '- Quantidade e custo com vários talhões: se a fala disser o valor de cada talhão ("10 litros no talhão 1 e 15 no talhão 2") ou disser "em cada", use em cada item o valor daquele talhão. Se disser só um total para todos os talhões juntos ("40 litros nos talhões 1 e 2"), não divida nem repita o total: deixe quantity (ou cost) null em cada item e mantenha a unit; o produtor informa a divisão na confirmação.',
    '- Cada item tem a própria data: "ontem no talhão 1 e hoje no talhão 2" são datas diferentes. Se a data foi dita uma vez para tudo, repita-a em cada item.',
    '- Não invente informações. O que não foi dito deve ser null.',
    `- activity_type: um de ${ACTIVITY_TYPES.join(', ')}. Use "aplicacao" para defensivos (herbicida, fungicida, inseticida), "adubacao" para adubo, calcário e fertilizante, "custo" para despesas sem operação de campo, e "outro" se não for possível classificar.`,
    '- product: nome do insumo, semente ou produto colhido, como falado. Se for claramente um insumo conhecido mal transcrito (ex.: "glifosfato"), use o nome correto (glifosato). Se o produtor não disse qual foi, usando só palavras vagas como "um produto", "uma coisa" ou "aquele negócio", use null.',
    '- quantity e unit: quantidade total dita. Para unit use kg, g, t, L, mL, sc (saco/saca), ha ou un.',
    '- field_name: um único talhão por item. Se a fala corresponder a um talhão cadastrado, use exatamente o nome cadastrado. Caso contrário, use o nome falado. Se nenhum local foi dito, null.',
    '- occurred_at: data da atividade em AAAA-MM-DD, resolvendo "hoje", "ontem", "anteontem" e dias da semana a partir da data de hoje. Se a data não foi dita, null.',
    '- cost: valor total em dinheiro, se dito. currency: "BRL" quando houver cost.',
    '- Os campos activity_type, product, quantity, unit, field_name, occurred_at, cost e currency ficam dentro de cada item de activities.',
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
