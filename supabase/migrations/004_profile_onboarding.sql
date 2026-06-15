-- 004_profile_onboarding.sql
-- Phase 8B onboarding: extra profile fields collected during /claim, plus the
-- public "avatars" Storage bucket for the profile photo. Additive + idempotent
-- (safe to run on top of an already-applied 001).

-- ─── profile fields ──────────────────────────────────────────────────────────
alter table profiles
  add column if not exists dominant_hand    text,
  add column if not exists tennis_level     text,
  add column if not exists favorite_surface text,
  add column if not exists favorite_player  text,
  add column if not exists date_of_birth    date,
  add column if not exists gender           text,
  add column if not exists avatar_url       text,
  add column if not exists term_accepted    boolean default false,
  add column if not exists term_accepted_at timestamptz;

-- ─── get_invite_student(): onboarding pre-fill for the anon claim visitor ─────
-- The /claim page loads before signUp, so the visitor is anonymous and the
-- students RLS (user_id = auth.uid() OR is_coach()) returns nothing. This
-- SECURITY DEFINER function exposes ONLY name/phone/email and ONLY for an
-- UNCLAIMED invite (user_id is null) — i.e. exactly what the emailed invite link
-- already implies — so the claim form can pre-fill. No other student data leaks.
create or replace function get_invite_student(p_email text)
returns table (full_name text, phone text, email text)
language sql
security definer
set search_path = public
stable
as $$
  select s.full_name, s.phone, s.email
  from students s
  where s.email = p_email
    and s.user_id is null
  limit 1;
$$;

grant execute on function get_invite_student(text) to anon, authenticated;

-- ─── avatars storage bucket (public read) ────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- ─── storage RLS: public read, owner-only write ──────────────────────────────
-- Object path is {user_id}/avatar.{ext}; the first path segment must match the
-- caller's auth id, so a student can only write/replace their own avatar.
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
