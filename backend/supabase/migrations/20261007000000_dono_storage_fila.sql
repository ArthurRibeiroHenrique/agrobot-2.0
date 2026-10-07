-- Etapa 1: dono dos registros, idempotência do envio, bucket de áudio e RLS.

-- user_id fica anulável para não quebrar registros de teste criados antes da
-- autenticação. A API sempre preenche e sempre filtra por ele, então registros
-- sem dono não aparecem para ninguém.
alter table voice_jobs
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists client_id uuid,
  add column if not exists attempts integer not null default 0;

alter table voice_jobs
  alter column status set default 'queued';

alter table activities
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Reenviar o mesmo áudio (fila offline) não cria um segundo registro.
create unique index if not exists voice_jobs_user_client_idx
on voice_jobs(user_id, client_id)
where client_id is not null;

-- Um rascunho gera no máximo uma atividade.
create unique index if not exists activities_voice_job_idx
on activities(voice_job_id)
where voice_job_id is not null;

create index if not exists voice_jobs_user_idx
on voice_jobs(user_id, created_at desc);

create index if not exists activities_user_idx
on activities(user_id, created_at desc);

-- O backend usa a service role, que ignora RLS. As políticas abaixo protegem
-- o acesso direto pelo aplicativo com a chave anon: cada um lê só o que é seu.
alter table voice_jobs enable row level security;
alter table activities enable row level security;

drop policy if exists voice_jobs_select_own on voice_jobs;
create policy voice_jobs_select_own on voice_jobs
  for select using (auth.uid() = user_id);

drop policy if exists activities_select_own on activities;
create policy activities_select_own on activities
  for select using (auth.uid() = user_id);

-- Bucket privado dos áudios. Sem políticas de storage: só o backend acessa.
insert into storage.buckets (id, name, public)
values ('voice-audio', 'voice-audio', false)
on conflict (id) do nothing;
