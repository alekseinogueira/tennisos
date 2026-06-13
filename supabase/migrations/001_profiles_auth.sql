-- 001_profiles_auth.sql
-- Identity backbone: role enum, profiles table, is_coach() helper, and the
-- handle_new_user trigger that creates a profile and auto-links an invited
-- student roster row on signup (invite-claim flow).
--
-- RLS policies live in 003. This file only creates structure + functions.

-- ─── role enum ────────────────────────────────────────────────────────────────
create type role_enum as enum ('student', 'coach', 'admin');

-- ─── profiles (1:1 with auth.users) ──────────────────────────────────────────
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       role_enum not null default 'student',
  email      text not null,
  full_name  text,
  created_at timestamptz not null default now()
);

-- ─── is_coach(): RLS source of truth (true for coach + admin) ─────────────────
-- SECURITY DEFINER so it reads profiles as the function owner, bypassing RLS.
-- This is required: the profiles SELECT policy calls is_coach(), and without
-- definer rights that would recurse into the policy on profiles itself.
create or replace function is_coach()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('coach', 'admin')
  );
$$;

-- ─── handle_new_user(): runs on auth signup ───────────────────────────────────
-- 1. Inserts the profile (role defaults to 'student').
-- 2. Auto-links a pre-created roster row by email (coach-invite + claim):
--    student.user_id NULL -> the new auth id, status invited -> active.
-- SECURITY DEFINER so it can write profiles/students regardless of RLS.
-- (References `students`, created in 002 — plpgsql resolves names at run time,
--  and signups only happen after every migration has been applied.)
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
   where email = new.email
     and user_id is null;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
