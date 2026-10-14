-- Etapa 2: propriedades, talhões, vínculo da atividade com o talhão e data real.

create table if not exists farms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  city text,
  state text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists fields (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  crop text,
  area_ha numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists farms_user_idx on farms(user_id);
create index if not exists fields_user_idx on fields(user_id);
create index if not exists fields_farm_idx on fields(farm_id);

-- field_name guarda o que o produtor falou; field_id aponta para o talhão cadastrado.
alter table activities
  add column if not exists field_id uuid references fields(id) on delete set null;

-- occurred_at passa de texto livre para data. Valores antigos fora do formato
-- AAAA-MM-DD (ex.: "ontem") viram nulos.
alter table activities
  alter column occurred_at type date
  using (
    case
      when occurred_at ~ '^\d{4}-\d{2}-\d{2}' then substring(occurred_at from 1 for 10)::date
      else null
    end
  );

create index if not exists activities_user_occurred_idx
on activities(user_id, occurred_at desc);

alter table farms enable row level security;
alter table fields enable row level security;

drop policy if exists farms_select_own on farms;
create policy farms_select_own on farms
  for select using (auth.uid() = user_id);

drop policy if exists fields_select_own on fields;
create policy fields_select_own on fields
  for select using (auth.uid() = user_id);
