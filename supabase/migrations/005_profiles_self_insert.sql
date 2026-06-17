-- 005_profiles_self_insert.sql
-- Allow a user to self-insert ONLY their own profile row, and ONLY as 'student'
-- (prevents self-escalation to coach/admin). Belt-and-suspenders for the /claim
-- upsert when the handle_new_user trigger didn't create the row. Coach/service
-- paths run as SECURITY DEFINER / service_role and bypass RLS, so unaffected.
--
-- Today profiles has only SELECT + UPDATE policies (003); without an INSERT
-- policy the client upsert in ClaimPage would be blocked by RLS.
create policy profiles_insert_self on profiles
  for insert with check (id = auth.uid() and role = 'student');
