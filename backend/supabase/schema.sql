create extension if not exists pgcrypto;

create table if not exists voice_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'processing',
  audio_path text,
  transcript text,
  draft jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  error text,
  activity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  voice_job_id uuid references voice_jobs(id),
  activity_type text,
  product text,
  quantity numeric,
  unit text,
  field_name text,
  occurred_at text,
  cost numeric,
  currency text,
  confidence numeric,
  raw_transcript text,
  status text not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voice_jobs_status_idx
on voice_jobs(status);

create index if not exists activities_created_at_idx
on activities(created_at desc);