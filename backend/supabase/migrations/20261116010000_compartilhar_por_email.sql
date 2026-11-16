-- Etapa 6: compartilhar o diário pelo app, informando o e-mail da outra pessoa.
-- auth.users não fica exposto pela API do Supabase; estas funções fazem só as duas
-- consultas necessárias e podem ser chamadas apenas pelo backend (service role).

create or replace function public.user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1
$$;

create or replace function public.user_emails(p_ids uuid[])
returns table (id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email::text from auth.users u
  where u.id = any(p_ids)
$$;

revoke all on function public.user_id_by_email(text) from public, anon, authenticated;
revoke all on function public.user_emails(uuid[]) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;
grant execute on function public.user_emails(uuid[]) to service_role;
