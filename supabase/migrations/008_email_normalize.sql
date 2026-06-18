-- 008_email_normalize.sql
-- Causa raiz do bug "NEXT SESSION fica em Coming Soon": o vínculo aluno↔conta auth
-- (handle_new_user) casava o e-mail de forma case-sensitive (`email = new.email`).
-- O Supabase Auth grava o e-mail SEMPRE em minúsculas no signup, mas o coach pode
-- cadastrar o aluno em CAIXA ALTA — então o UPDATE casava 0 linhas, students.user_id
-- ficava NULL e a sessão nunca aparecia para o aluno.
--
-- Esta migration: (1) normaliza o case do e-mail em todo match e nos dados existentes;
-- (2) torna a RLS de SELECT das sessões resiliente ao user_id denormalizado, resolvendo
-- a visibilidade pelo students (id ← user_id = auth.uid()) em vez de sessions.user_id.
-- É IDEMPOTENTE: pode rodar mais de uma vez sem efeito colateral.

-- ─── 1) handle_new_user(): vínculo por e-mail case-insensitive ────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'student'
  )
  on conflict (id) do nothing;

  update students
     set user_id    = new.id,
         status     = 'active',
         updated_at = now()
   where lower(email) = lower(new.email)
     and user_id is null;

  return new;
end;
$$;

-- ─── 2) get_invite_student(): pré-fill do /claim case-insensitive ─────────────
create or replace function get_invite_student(p_email text)
returns table (full_name text, phone text, email text)
language sql
security definer
set search_path = public
stable
as $$
  select s.full_name, s.phone, s.email
  from students s
  where lower(s.email) = lower(p_email)
    and s.user_id is null
  limit 1;
$$;

-- ─── 3) Backfill: normalizar e-mails de roster já gravados em caixa alta ──────
update students
   set email = lower(email)
 where email <> lower(email);

-- ─── 4) RLS sessions_select: resolver visibilidade via students (join) ────────
-- Aluno vê a sessão assim que students.user_id é linkado, mesmo que a coluna
-- denormalizada sessions.user_id esteja NULL (sessão agendada antes do claim).
drop policy if exists sessions_select on sessions;
create policy sessions_select on sessions
  for select using (
    is_coach() or student_id in (
      select id from students where user_id = auth.uid()
    )
  );
