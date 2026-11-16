-- Etapa 5: diário compartilhado. Quem recebe o acesso (member) vê e edita os registros,
-- as propriedades e os talhões de quem compartilhou (owner). Para os dois verem tudo
-- um do outro, grave as duas direções.

create table if not exists diary_shares (
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, member_id),
  check (owner_id <> member_id)
);

create index if not exists diary_shares_member_idx on diary_shares(member_id);

alter table diary_shares enable row level security;

drop policy if exists diary_shares_select_own on diary_shares;
create policy diary_shares_select_own on diary_shares
  for select using (auth.uid() = owner_id or auth.uid() = member_id);

-- Leitura direta pelo aplicativo (chave anon) acompanha o compartilhamento.
-- O backend usa a service role e aplica a mesma regra no código.
drop policy if exists activities_select_own on activities;
create policy activities_select_own on activities
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from diary_shares s
      where s.owner_id = activities.user_id and s.member_id = auth.uid()
    )
  );

drop policy if exists farms_select_own on farms;
create policy farms_select_own on farms
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from diary_shares s
      where s.owner_id = farms.user_id and s.member_id = auth.uid()
    )
  );

drop policy if exists fields_select_own on fields;
create policy fields_select_own on fields
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from diary_shares s
      where s.owner_id = fields.user_id and s.member_id = auth.uid()
    )
  );
