import { supabaseAdmin } from '../lib/supabase';
import {
  activityDraftSchema,
  ActivityDraft
} from '../schemas/activity.schema';
import { HttpError } from '../utils/http-error';
import { userOwnsField } from './farm.service';

const UNIQUE_VIOLATION = '23505';

// Colunas devolvidas ao aplicativo; audio_path e metadata ficam só no servidor.
const PUBLIC_COLUMNS =
  'id, client_id, status, intent, transcript, draft, drafts, answer, error, activity_id, created_at, updated_at';

// Uma pergunta respondida ainda pode virar registro, se o produtor quiser anotar.
const CONFIRMABLE_STATUSES = ['needs_confirmation', 'answered'];

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

// Rascunhos guardados na gravação. Registros anteriores à lista só têm draft.
function storedDrafts(job: {
  draft: unknown;
  drafts: unknown;
}): Record<string, unknown>[] {
  if (Array.isArray(job.drafts) && job.drafts.length > 0) {
    return job.drafts;
  }

  return [(job.draft as Record<string, unknown> | null) ?? {}];
}

// corrections: um item por registro revisado, na ordem dos rascunhos. O produtor
// pode ter removido rascunhos; cada item já vem com os campos completos do formulário.
export async function confirmVoiceJob(
  id: string,
  userId: string,
  corrections: Record<string, unknown>[]
) {
  const job = await getVoiceJob(id, userId);

  if (!job) {
    throw new HttpError(404, 'Voice job não encontrado');
  }

  if (!CONFIRMABLE_STATUSES.includes(job.status)) {
    throw new HttpError(
      409,
      `Voice job não está aguardando confirmação (status: ${job.status})`
    );
  }

  const drafts = storedDrafts(job);

  const parsedDrafts: ActivityDraft[] = corrections.map((item, index) =>
    activityDraftSchema.parse({
      ...(drafts[index] ?? drafts[0]),
      ...item
    })
  );

  const fieldIds = new Set(
    parsedDrafts.map((draft) => draft.field_id).filter(Boolean) as string[]
  );

  for (const fieldId of fieldIds) {
    if (!(await userOwnsField(userId, fieldId))) {
      throw new HttpError(400, 'Talhão não encontrado');
    }
  }

  // Um único insert: ou todos os registros da gravação são salvos, ou nenhum.
  const { data: activities, error: activityError } = await supabaseAdmin
    .from('activities')
    .insert(
      parsedDrafts.map((draft, index) => ({
        user_id: userId,
        voice_job_id: id,
        draft_index: index,
        activity_type: draft.activity_type,
        product: draft.product,
        quantity: draft.quantity,
        unit: draft.unit,
        field_id: draft.field_id ?? null,
        field_name: draft.field_name,
        occurred_at: draft.occurred_at,
        cost: draft.cost,
        currency: draft.currency,
        confidence: draft.confidence,
        raw_transcript: job.transcript ?? draft.raw_transcript ?? '',
        status: 'confirmed'
      }))
    )
    .select();

  if (activityError) {
    // Índice único em (voice_job_id, draft_index): duas confirmações simultâneas.
    if (activityError.code === UNIQUE_VIOLATION) {
      throw new HttpError(409, 'Voice job já confirmado');
    }

    throw activityError;
  }

  const saved = [...(activities ?? [])].sort(
    (a, b) => a.draft_index - b.draft_index
  );

  await updateVoiceJob(id, {
    status: 'confirmed',
    draft: parsedDrafts[0],
    drafts: parsedDrafts,
    activity_id: saved[0]?.id ?? null
  });

  return saved;
}

export async function listActivities(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return data;
}
