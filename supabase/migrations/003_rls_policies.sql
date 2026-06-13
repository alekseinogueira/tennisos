-- 003_rls_policies.sql
-- Enable RLS on EVERY table and add policies. Permissive policies are OR'd, so
-- the pattern is: one "subject sees own row" policy + one "is_coach() full access"
-- policy. Column-immutability rules that RLS can't express (a student must not
-- change their own role/status) are enforced by BEFORE-UPDATE guard triggers.
--
-- Guards gate on `current_user = 'authenticated'` — i.e. a real end-user session
-- via PostgREST. The handle_new_user auto-link runs as a SECURITY DEFINER (owner)
-- and the service-role key connects as `service_role`; both are trusted and skip
-- the guards, so the invite-claim flow and coach tooling are never blocked.

-- ─── profiles ─────────────────────────────────────────────────────────────────
alter table profiles enable row level security;

-- SELECT: own row, or any row if coach/admin.
create policy profiles_select on profiles
  for select using (id = auth.uid() or is_coach());

-- UPDATE: own row, or any row if coach. (No client INSERT/DELETE — the
-- handle_new_user trigger is the only inserter; auth.users cascade handles delete.)
create policy profiles_update on profiles
  for update using (id = auth.uid() or is_coach())
              with check (id = auth.uid() or is_coach());

-- Guard: a non-coach end-user cannot change their own role.
create or replace function guard_profile_role()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated'
     and not is_coach()
     and new.role is distinct from old.role then
    raise exception 'Only a coach can change a profile role';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on profiles
  for each row execute function guard_profile_role();

-- ─── students ─────────────────────────────────────────────────────────────────
alter table students enable row level security;

-- SELECT: student sees own row; coach sees all.
create policy students_select on students
  for select using (user_id = auth.uid() or is_coach());

-- UPDATE: student may update own row (guard restricts to name/phone); coach via _all.
create policy students_update_self on students
  for update using (user_id = auth.uid())
              with check (user_id = auth.uid());

-- Coach: full CRUD (covers INSERT/DELETE too — students get neither).
create policy students_coach_all on students
  for all using (is_coach()) with check (is_coach());

-- Guard: a non-coach student may only edit their own name/phone — never
-- status, user_id, email, or created_by.
create or replace function guard_student_update()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated' and not is_coach() then
    if new.status     is distinct from old.status
    or new.user_id    is distinct from old.user_id
    or new.email      is distinct from old.email
    or new.created_by is distinct from old.created_by then
      raise exception 'Students may only edit their own name and phone';
    end if;
  end if;
  return new;
end;
$$;

create trigger students_guard_update
  before update on students
  for each row execute function guard_student_update();

-- ─── packages ─────────────────────────────────────────────────────────────────
alter table packages enable row level security;

-- SELECT: students see active offerings; coach sees all.
create policy packages_select on packages
  for select using (active = true or is_coach());

-- Coach: full CRUD.
create policy packages_coach_all on packages
  for all using (is_coach()) with check (is_coach());

-- ─── lesson_credits ───────────────────────────────────────────────────────────
alter table lesson_credits enable row level security;

-- SELECT: student sees own ledger; coach all. No student writes.
create policy lesson_credits_select on lesson_credits
  for select using (user_id = auth.uid() or is_coach());

create policy lesson_credits_coach_all on lesson_credits
  for all using (is_coach()) with check (is_coach());

-- ─── feedbacks ────────────────────────────────────────────────────────────────
alter table feedbacks enable row level security;

create policy feedbacks_select on feedbacks
  for select using (user_id = auth.uid() or is_coach());

create policy feedbacks_coach_all on feedbacks
  for all using (is_coach()) with check (is_coach());

-- ─── videos ───────────────────────────────────────────────────────────────────
alter table videos enable row level security;

create policy videos_select on videos
  for select using (user_id = auth.uid() or is_coach());

create policy videos_coach_all on videos
  for all using (is_coach()) with check (is_coach());

-- ─── feedback_video_links ─────────────────────────────────────────────────────
alter table feedback_video_links enable row level security;

-- Single-predicate policy thanks to the denormalized user_id.
create policy fvl_select on feedback_video_links
  for select using (user_id = auth.uid() or is_coach());

create policy fvl_coach_all on feedback_video_links
  for all using (is_coach()) with check (is_coach());
