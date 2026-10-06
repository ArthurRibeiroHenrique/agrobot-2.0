import { supabaseAdmin } from '../lib/supabase';
import {
  activityDraftSchema,
  ActivityDraft
} from '../schemas/activity.schema';

export async function createVoiceJob(input: {
  audioPath: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin
    .from('voice_jobs')
    .insert({
      status: 'processing',
      audio_path: input.audioPath,
      metadata: input.metadata ?? {}
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function getVoiceJob(id: string) {
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
  corrections: Record<string, unknown>
) {
  const job = await getVoiceJob(id);

  if (!job) {
    throw new Error('Voice job não encontrado');
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

  if (activityError) throw activityError;

  await updateVoiceJob(id, {
    status: 'confirmed',
    draft: parsedDraft,
    activity_id: activity.id
  });

  return activity;
}

export async function listActivities() {
  const { data, error } = await supabaseAdmin
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  return data;
}