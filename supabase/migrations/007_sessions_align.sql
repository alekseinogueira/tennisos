-- 007_sessions_align.sql
-- A tabela `sessions` ao vivo foi criada a partir de um DDL ANTIGO que não tinha
-- as colunas `user_id` e `updated_at` (e, portanto, também ficou sem o índice de
-- user_id, o trigger de updated_at e a policy de SELECT do aluno, que referencia
-- user_id). Erro em produção ao agendar:
--   "Could not find the 'user_id' column of 'sessions' in the schema cache"
--
-- Esta migration ALINHA a tabela ao vivo com 006_sessions.sql. É IDEMPOTENTE:
-- pode rodar mais de uma vez sem efeito colateral, e não recria nada que já exista.
-- Pressupõe que set_updated_at() e is_coach() já existem (vêm das migrations base;
-- a RLS de coach em outras tabelas já funciona, então is_coach() existe).

-- 1) Colunas faltantes -------------------------------------------------------
alter table sessions
  add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table sessions
  add column if not exists updated_at timestamptz not null default now();

-- 2) Índice de user_id (subject da RLS) --------------------------------------
create index if not exists sessions_user_idx on sessions (user_id);

-- 3) Trigger de updated_at (recriado de forma segura) ------------------------
drop trigger if exists sessions_set_updated_at on sessions;
create trigger sessions_set_updated_at
  before update on sessions
  for each row execute function set_updated_at();

-- 4) RLS: garantir as duas policies (a de SELECT do aluno provavelmente nunca
--    foi criada, pois referencia user_id, que faltava) ----------------------
alter table sessions enable row level security;

drop policy if exists sessions_select on sessions;
create policy sessions_select on sessions
  for select using (user_id = auth.uid() or is_coach());

drop policy if exists sessions_coach_all on sessions;
create policy sessions_coach_all on sessions
  for all using (is_coach()) with check (is_coach());
