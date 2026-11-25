-- Segunda camada de proteção: as chaves públicas do Supabase (anon, que vai dentro do APK, e
-- authenticated, a do usuário logado) não gravam nada nas tabelas.
-- O app só usa o Supabase para o login; leitura e escrita dos dados passam pelo backend, que usa a
-- service role. O RLS já barrava essas escritas; aqui elas deixam de existir também nas permissões.
-- TRUNCATE, em especial, não passa pelo RLS.

revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public from authenticated;

-- Leitura do usuário logado continua, sempre filtrada pelas políticas de RLS de cada tabela.
grant select on all tables in schema public to authenticated;

-- Tabelas criadas daqui em diante nascem com as mesmas permissões mínimas.
alter default privileges for role postgres in schema public
  revoke all on tables from anon;
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate, references, trigger on tables from authenticated;
