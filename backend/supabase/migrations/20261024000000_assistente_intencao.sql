-- Etapa 3: assistente de perguntas e intenção da fala (registro, pergunta ou ambos).

-- Cada pergunta feita ao assistente, com a resposta e o encaminhamento ao técnico.
-- Serve de histórico para o produtor e de base para ajustar o prompt.
create table if not exists assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  answer text not null,
  needs_technician boolean not null default false,
  reason text not null default 'nenhum',
  confidence numeric,
  -- 'texto' (digitada na tela de perguntas) ou 'voz' (veio de uma gravação).
  source text not null default 'texto',
  voice_job_id uuid references voice_jobs(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists assistant_messages_user_idx
on assistant_messages(user_id, created_at desc);

-- Quantos encaminhamentos e por quê: consulta usada para acompanhar o assistente.
create index if not exists assistant_messages_technician_idx
on assistant_messages(reason)
where needs_technician;

alter table assistant_messages enable row level security;

drop policy if exists assistant_messages_select_own on assistant_messages;
create policy assistant_messages_select_own on assistant_messages
  for select using (auth.uid() = user_id);

-- intent: registro, pergunta, ambos ou incerto. answer: resposta do assistente
-- quando a fala tinha uma pergunta.
alter table voice_jobs
  add column if not exists intent text,
  add column if not exists answer jsonb;
