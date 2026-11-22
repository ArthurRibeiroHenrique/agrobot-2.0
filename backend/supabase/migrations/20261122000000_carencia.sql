-- Etapa 3: alertas de carência (intervalo de segurança) dos defensivos.
-- A carência é dado de segurança alimentar: vem da bula, informada pelo produtor, ou de um
-- catálogo conferido por um técnico. Nunca é estimada pela IA. A data de liberação da colheita
-- é calculada no código (data da aplicação + dias de carência), não guardada.

-- Dias de carência da aplicação, como estavam na bula do produto usado.
alter table activities
  add column if not exists withholding_days integer
  check (withholding_days is null or withholding_days between 0 and 365);

-- O que o produtor já informou da bula: na próxima aplicação do mesmo produto na mesma
-- cultura, o app sugere o número (o produtor confirma). As chaves são o nome sem acentos,
-- em minúsculas; crop_key vazio quando o talhão não tem cultura cadastrada.
create table if not exists withholding_memory (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_key text not null,
  crop_key text not null default '',
  days integer not null check (days between 0 and 365),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_key, crop_key)
);

-- Catálogo conferido: só entra o que um técnico conferiu na bula registrada no MAPA
-- (AGROFIT), com a referência de onde veio. Começa vazio.
create table if not exists withholding_catalog (
  id uuid primary key default gen_random_uuid(),
  product_key text not null,
  product_name text not null,
  crop_key text not null,
  days integer not null check (days between 0 and 365),
  registration_number text,
  source text not null,
  checked_by text not null,
  checked_at date not null,
  created_at timestamptz not null default now(),
  unique (product_key, crop_key)
);

-- Só o backend (service role) lê e grava estas tabelas.
alter table withholding_memory enable row level security;
alter table withholding_catalog enable row level security;
