import { supabaseAdmin } from '../lib/supabase';
import {
  activityDraftSchema,
  ActivityDraft
} from '../schemas/activity.schema';
import { HttpError } from '../utils/http-error';

const UNIQUE_VIOLATION = '23505';

// Colunas devolvidas ao aplicativo; audio_path e metadata ficam só no servidor.
const PUBLIC_COLUMNS =
  'id, client_id, status, transcript, draft, error, activity_id, created_at, updated_at';

export async function createVoiceJob(input: {
  userId: string;
  clientId?: string | null;
  audioPath: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin
    .from('voice_jobs')
    .insert({
      user_id: input.userId,
      client_id: input.clientId ?? null,
      status: 'queued',
      audio_path: input.audioPath,
      metadata: input.metadata ?? {}
    })
    .select(PUBLIC_COLUMNS)
    .single();

  if (error) {
    return {
      job: null,
      duplicated: error.code === UNIQUE_VIOLATION,
      error
    };
  }

  return { job: data, duplicated: false, error: null };
}

export async function findVoiceJobByClientId(
  userId: string,
  clientId: string
) {
  const { data, error } = await supabaseAdmin
    .from('voice_jobs')
    .select(PUBLIC_COLUMNS)
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function getVoiceJob(id: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('voice_jobs')
    .select(PUBLIC_COLUMNS)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

// Uso interno do worker: sem filtro de dono e com todas as colunas.
export async function findVoiceJobById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('voice_jobs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function updateVoiceJob(
  id: string,
  patch: Record<string, unknown>
) {
  const { data, error } = await supabaseAdmin
    .from('voice_jobs')
    .update({
      ...patch,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function confirmVoiceJob(
  id: string,
  userId: string,
  corrections: Record<string, unknown>
) {
  const job = await getVoiceJob(id, userId);

  if (!job) {
    throw new HttpError(404, 'Voice job não encontrado');
  }

  if (job.status !== 'needs_confirmation') {
    throw new HttpError(
      409,
      `Voice job não está aguardando confirmação (status: ${job.status})`
    );
  }

  const draft = job.draft ?? {};

  const merged = {
    ...draft,
    ...corrections
  };

  const parsedDraft: ActivityDraft = activityDraftSchema.parse(merged);

  const { data: activity, error: activityError } = await supabaseAdmin
    .from('activities')
    .insert({
      user_id: userId,
      voice_job_id: id,
      activity_type: parsedDraft.activity_type,
      product: parsedDraft.product,
      quantity: parsedDraft.quantity,
      unit: parsedDraft.unit,
      field_name: parsedDraft.field_name,
      occurred_at: parsedDraft.occurred_at,
      cost: parsedDraft.cost,
      currency: parsedDraft.currency,
      confidence: parsedDraft.confidence,
      raw_transcript: job.transcript ?? parsedDraft.raw_transcript ?? '',
      status: 'confirmed'
    })
    .select()
    .single();

  if (activityError) {
    // Índice único em voice_job_id: duas confirmações simultâneas do mesmo rascunho.
    if (activityError.code === UNIQUE_VIOLATION) {
      throw new HttpError(409, 'Voice job já confirmado');
    }

    throw activityError;
  }

  await updateVoiceJob(id, {
    status: 'confirmed',
    draft: parsedDraft,
    activity_id: activity.id
  });

  return activity;
}

export async function listActivities(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return data;
}
