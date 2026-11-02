-- Etapa 4: uma gravação pode relatar atividades em vários talhões e gerar vários registros.

-- drafts: um rascunho por atividade relatada (ex.: um por talhão citado).
-- draft continua com o primeiro, para registros antigos e versões antigas do aplicativo.
alter table voice_jobs
  add column if not exists drafts jsonb;

-- Posição do registro dentro da gravação.
alter table activities
  add column if not exists draft_index integer not null default 0;

-- O índice único passa a valer por posição: a gravação gera vários registros, mas duas
-- confirmações simultâneas ainda dão conflito (as duas tentam gravar a posição 0).
drop index if exists activities_voice_job_idx;

create unique index if not exists activities_voice_job_draft_idx
on activities(voice_job_id, draft_index)
where voice_job_id is not null;
