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
  // Dias de carência da bula (só em aplicação de defensivo).
  withholding_days: number | null;
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
  withholding_days?: number | null;
  confidence?: number;
  missing_fields?: string[];
  raw_transcript?: string;
};

export type VoiceJobStatus =
  | 'queued'
  | 'transcribing'
  | 'extracting'
  | 'needs_confirmation'
  | 'answered'
  | 'confirmed'
  | 'failed';

// registro, pergunta, ambos ou incerto (a IA não soube; o app pergunta).
export type VoiceIntent = 'registro' | 'pergunta' | 'ambos' | 'incerto';

export type VoiceAnswer = {
  message_id: string;
  question: string;
  answer: string;
  needs_technician: boolean;
  reason: string;
};

export type VoiceJob = {
  id: string;
  client_id: string | null;
  status: VoiceJobStatus;
  intent: VoiceIntent | null;
  transcript: string | null;
  draft: Partial<ActivityDraft> | null;
  // Um rascunho por atividade relatada (ex.: um por talhão). Gravações antigas só têm draft.
  drafts: Partial<ActivityDraft>[] | null;
  answer: VoiceAnswer | null;
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

export type AssistantMessage = {
  id: string;
  question: string;
  answer: string;
  needs_technician: boolean;
  reason: string;
  source: 'texto' | 'voz';
  voice_job_id: string | null;
  created_at: string;
};

export type SharePerson = {
  user_id: string;
  email: string | null;
  created_at: string;
};

// shared_with: quem vê o meu diário. shared_by: de quem eu vejo o diário.
export type Shares = {
  shared_with: SharePerson[];
  shared_by: SharePerson[];
};

// em_carencia: ainda não pode colher. liberado: já pode. sem_carencia: falta olhar a bula.
export type AlertaDeCarencia = {
  activity_id: string;
  product: string | null;
  field_id: string | null;
  field_name: string | null;
  crop: string | null;
  applied_at: string;
  withholding_days: number | null;
} & (
  | { estado: 'em_carencia'; liberaEm: string; diasRestantes: number }
  | { estado: 'liberado'; liberaEm: string; diasDesdeLiberacao: number }
  | { estado: 'sem_carencia' }
);

// bula_anterior: o que o próprio produtor já leu na bula. catalogo: conferido por um técnico.
export type SugestaoDeCarencia = {
  dias: number;
  origem: 'bula_anterior' | 'catalogo';
  referencia: string | null;
};
