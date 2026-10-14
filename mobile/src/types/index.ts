export type Activity = {
  id: string;
  voice_job_id: string | null;
  activity_type: string;
  product: string | null;
  quantity: number | null;
  unit: string | null;
  field_id: string | null;
  field_name: string | null;
  occurred_at: string | null;
  cost: number | null;
  currency: string | null;
  raw_transcript: string | null;
  created_at: string;
};

export type ActivityDraft = {
  activity_type: string;
  product: string | null;
  quantity: number | null;
  unit: string | null;
  field_id: string | null;
  field_name: string | null;
  occurred_at: string | null;
  cost: number | null;
  currency: string | null;
  confidence?: number;
  missing_fields?: string[];
  raw_transcript?: string;
};

export type VoiceJobStatus =
  | 'queued'
  | 'transcribing'
  | 'extracting'
  | 'needs_confirmation'
  | 'confirmed'
  | 'failed';

export type VoiceJob = {
  id: string;
  client_id: string | null;
  status: VoiceJobStatus;
  transcript: string | null;
  draft: Partial<ActivityDraft> | null;
  error: string | null;
  activity_id: string | null;
};

export type Farm = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
};

export type Field = {
  id: string;
  farm_id: string;
  name: string;
  crop: string | null;
  area_ha: number | null;
};
