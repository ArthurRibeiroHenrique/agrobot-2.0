import { zodResponseFormat } from 'openai/helpers/zod';

import { openai } from '../lib/openai';
import { supabaseAdmin } from '../lib/supabase';
import { env } from '../config/env';
import {
  AssistantAnswer,
  AssistantReason,
  assistantAnswerSchema
} from '../schemas/assistant.schema';
import { todayInTimezone } from './draft.service';
import { FieldRef, listFarms, listFields } from './farm.service';
import { HttpError } from '../utils/http-error';
import {
  findVoiceJobById,
  getVoiceJob,
  listActivities,
  updateVoiceJob
} from './voice-job.service';

// Abaixo disso a resposta é tratada como incerta e o produtor é encaminhado.
export const MIN_CONFIDENCE = 0.6;

// Assuntos em que um erro pode causar dano: sempre encaminha, mesmo que a IA não peça.
const ALWAYS_TECHNICIAN: AssistantReason[] = [
  'diagnostico_praga_doenca',
  'dose_ou_mistura_de_defensivo',
  'carencia_ou_seguranca'
];

// Quantas atividades recentes vão no contexto da IA.
const HISTORY_LIMIT = 30;

const PUBLIC_COLUMNS =
  'id, question, answer, needs_technician, reason, source, voice_job_id, created_at';

export type ActivityRef = {
  activity_type: string | null;
  product: string | null;
  quantity: number | null;
  unit: string | null;
  field_name: string | null;
  occurred_at: string | null;
  cost: number | null;
};

export type AssistantContext = {
  today: string;
  // Cidade e estado da propriedade, quando cadastrados.
  location?: string | null;
  fields: FieldRef[];
  activities: ActivityRef[];
  // Fala do produtor que também relatou uma atividade ainda não confirmada.
  pendingReport?: string | null;
};

export type AssistantReply = {
  answer: string;
  needs_technician: boolean;
  reason: AssistantReason;
  confidence: number;
};

// Resposta guardada em voice_jobs.answer quando a fala tinha uma pergunta.
export type VoiceAnswer = {
  message_id: string;
  question: string;
  answer: string;
  needs_technician: boolean;
  reason: AssistantReason;
};

function formatActivity(activity: ActivityRef): string {
  const parts = [
    activity.occurred_at ?? 'sem data',
    activity.activity_type,
    activity.product,
    activity.quantity !== null && activity.quantity !== undefined
      ? `${activity.quantity} ${activity.unit ?? ''}`.trim()
      : null,
    activity.field_name,
    activity.cost !== null && activity.cost !== undefined ? `R$ ${activity.cost}` : null
  ];

  return `- ${parts.filter(Boolean).join(', ')}`;
}

export function buildAssistantPrompt(context: AssistantContext): string {
  const fields =
    context.fields.length > 0
      ? context.fields
          .map((field) =>
            field.crop ? `- ${field.name} (${field.crop})` : `- ${field.name}`
          )
          .join('\n')
      : '(nenhum talhão cadastrado)';

  const activities =
    context.activities.length > 0
      ? context.activities.map(formatActivity).join('\n')
      : '(nenhuma atividade registrada)';

  return [
    'Você é o assistente do AgroBot e tira dúvidas de produtores rurais brasileiros sobre a própria lavoura.',
    'Responda em português simples, em no máximo 5 frases curtas, sem termos técnicos difíceis.',
    '',
    `Data de hoje: ${context.today}.`,
    `Local da propriedade: ${context.location || 'não informado'}.`,
    '',
    'Talhões cadastrados deste produtor:',
    fields,
    '',
    'Últimas atividades registradas no diário (data, tipo, produto, quantidade, talhão, custo):',
    activities,
    ...(context.pendingReport
      ? [
          '',
          'Na mesma fala, o produtor também relatou uma atividade que ainda não foi salva no diário:',
          `"${context.pendingReport}"`
        ]
      : []),
    '',
    'Regras:',
    '- Para perguntas sobre o que o produtor já fez, use só o diário acima. Se não estiver lá, diga que não encontrou o registro.',
    '- Não invente números, datas, produtos ou registros.',
    '- Nunca informe dose, mistura de produtos ou período de carência de defensivos. Diga para seguir a bula e confirmar com um técnico agrícola.',
    '- Sobre mistura de produtos na calda, não diga que pode, que não pode ou que "não é recomendado", e não ensine testes de mistura: diga só que depende da bula de cada produto e que o técnico agrícola deve orientar.',
    '- Perguntas gerais de cultivo (época de plantio, para que serve um adubo, como funciona uma cultura) não precisam de técnico: dê a orientação geral para o local da propriedade e avise que o calendário exato depende do zoneamento agrícola da região.',
    '- Nunca dê diagnóstico definitivo de praga, doença ou deficiência. Você pode citar possibilidades, mas diga que é preciso um técnico ver a lavoura.',
    '- needs_technician: true quando a resposta depende de ver a lavoura, de análise de solo, de receituário agronômico, envolve risco à saúde ou ao ambiente, ou quando você não tem certeza.',
    '- reason: "diagnostico_praga_doenca" para sintomas, pragas e doenças; "dose_ou_mistura_de_defensivo" para dose, calda e mistura; "carencia_ou_seguranca" para carência, reentrada, intoxicação e uso de EPI; "informacao_insuficiente" quando faltam dados para responder; "fora_do_escopo" quando a pergunta não tem relação com agricultura ou com a propriedade (nesse caso, diga com gentileza que só ajuda com assuntos da lavoura); "nenhum" nos demais casos.',
    '- confidence: de 0 a 1, o quanto você tem certeza de que a resposta está correta e completa.'
  ].join('\n');
}

// Regras em código, que a IA não consegue contornar. Testadas em test/assistant.test.ts.
export function applySafetyRules(answer: AssistantAnswer): AssistantReply {
  const confidence = Math.min(1, Math.max(0, answer.confidence));

  // Pergunta fora do assunto não vira encaminhamento só por incerteza.
  const uncertain =
    confidence < MIN_CONFIDENCE && answer.reason !== 'fora_do_escopo';

  const needsTechnician =
    answer.needs_technician ||
    ALWAYS_TECHNICIAN.includes(answer.reason) ||
    uncertain;

  return {
    answer:
      answer.answer.trim() ||
      'Não consegui responder essa pergunta. Procure um técnico agrícola.',
    needs_technician: needsTechnician,
    reason:
      needsTechnician && answer.reason === 'nenhum'
        ? 'informacao_insuficiente'
        : answer.reason,
    confidence
  };
}

export async function answerQuestion(
  question: string,
  context: AssistantContext
): Promise<AssistantReply> {
  const completion = await openai.beta.chat.completions.parse({
    model: env.OPENAI_LLM_MODEL,
    reasoning_effort: 'low',
    response_format: zodResponseFormat(assistantAnswerSchema, 'resposta_assistente'),
    messages: [
      {
        role: 'system',
        content: buildAssistantPrompt(context)
      },
      {
        role: 'user',
        content: question
      }
    ]
  });

  const message = completion.choices[0]?.message;

  if (!message?.parsed) {
    throw new Error(
      message?.refusal
        ? `Modelo recusou a resposta: ${message.refusal}`
        : 'Modelo não retornou a resposta estruturada'
    );
  }

  return applySafetyRules(message.parsed);
}

// Monta o contexto do produtor, consulta a IA e guarda a pergunta com a resposta.
export async function askAssistant(input: {
  userId: string;
  question: string;
  timezone?: string | null;
  source: 'texto' | 'voz';
  voiceJobId?: string | null;
  pendingReport?: string | null;
}) {
  const [farms, fields, activities] = await Promise.all([
    listFarms(input.userId),
    listFields(input.userId),
    listActivities(input.userId)
  ]);

  const farm = farms[0];

  const reply = await answerQuestion(input.question, {
    today: todayInTimezone(input.timezone ?? null),
    location: farm ? [farm.city, farm.state].filter(Boolean).join(' - ') : null,
    fields,
    activities: activities.slice(0, HISTORY_LIMIT),
    pendingReport: input.pendingReport
  });

  const { data, error } = await supabaseAdmin
    .from('assistant_messages')
    .insert({
      user_id: input.userId,
      question: input.question,
      answer: reply.answer,
      needs_technician: reply.needs_technician,
      reason: reply.reason,
      confidence: reply.confidence,
      source: input.source,
      voice_job_id: input.voiceJobId ?? null
    })
    .select(PUBLIC_COLUMNS)
    .single();

  if (error) throw error;

  return data;
}

export async function listAssistantMessages(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('assistant_messages')
    .select(PUBLIC_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;

  return data;
}

export async function askFromVoice(input: {
  userId: string;
  voiceJobId: string;
  question: string;
  timezone?: string | null;
  pendingReport?: string | null;
}): Promise<VoiceAnswer> {
  const message = await askAssistant({ ...input, source: 'voz' });

  return {
    message_id: message.id,
    question: message.question,
    answer: message.answer,
    needs_technician: message.needs_technician,
    reason: message.reason as AssistantReason
  };
}

// O produtor indicou que a gravação era uma pergunta (a IA ficou em dúvida ou
// classificou como registro): responde usando a transcrição.
export async function answerVoiceJobAsQuestion(id: string, userId: string) {
  const job = await findVoiceJobById(id);

  if (!job || job.user_id !== userId) {
    throw new HttpError(404, 'Voice job não encontrado');
  }

  if (job.status !== 'needs_confirmation') {
    throw new HttpError(
      409,
      `Voice job não está aguardando confirmação (status: ${job.status})`
    );
  }

  const transcript = (job.transcript ?? '').trim();

  if (!transcript) {
    throw new HttpError(400, 'Não há fala na gravação para responder');
  }

  const metadata = (job.metadata ?? {}) as Record<string, unknown>;

  const answer = await askFromVoice({
    userId,
    voiceJobId: id,
    question: transcript,
    timezone: typeof metadata.timezone === 'string' ? metadata.timezone : null
  });

  await updateVoiceJob(id, {
    status: 'answered',
    intent: 'pergunta',
    answer
  });

  return getVoiceJob(id, userId);
}
