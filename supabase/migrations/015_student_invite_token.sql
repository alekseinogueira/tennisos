-- 015 — invite tokens for the roster claim link (WhatsApp-first onboarding).
--
-- The old flow assumed the coach knows the student's email at roster time: the
-- claim link was /claim?email=…, and handle_new_user linked the roster row by
-- matching that email on signup.
--
-- The real intake is WhatsApp. The coach often has only a name and a phone
-- number, and the student supplies their own email while signing up. So:
--
--   * students.email becomes NULLABLE — the coach can roster someone without it.
--   * The claim link is keyed on a random invite_token instead of the email.
--   * handle_new_user links by that token (from signup metadata) and writes the
--     student's chosen email back onto the roster row.
--
-- The email path is intentionally LEFT WORKING as a fallback so invite links
-- already sent over WhatsApp keep resolving.

-- ─── 1) email is no longer required at roster time ────────────────────────────
alter table students alter column email drop not null;

-- ─── 2) token columns ─────────────────────────────────────────────────────────
-- Added without a default first, then backfilled, then defaulted: an ADD COLUMN
-- carrying a volatile default rewrites the table, and being explicit here keeps
-- the per-row uniqueness obvious rather than relying on that behaviour.
alter table students
  add column if not exists invite_token            uuid,
  add column if not exists invite_token_expires_at timestamptz;

-- Backfill: every existing row gets its own token. Unclaimed rows get a fresh
-- 7-day window from now; already-claimed rows get an expiry in the past, since
-- their token must never be usable.
update students
   set invite_token = coalesce(invite_token, gen_random_uuid()),
       invite_token_expires_at = coalesce(
         invite_token_expires_at,
         case when user_id is null then now() + interval '7 days' else now() end
       )
 where invite_token is null
    or invite_token_expires_at is null;

alter table students
  alter column invite_token set default gen_random_uuid(),
  alter column invite_token set not null;

-- New rows: 7-day window, matching the coach-facing copy in InvitePanel.
alter table students
  alter column invite_token_expires_at set default (now() + interval '7 days');

create unique index if not exists students_invite_token_idx
  on students (invite_token);

-- ─── 3) get_invite_student_by_token() ─────────────────────────────────────────
-- Token twin of get_invite_student(). Same SECURITY DEFINER reason (the /claim
-- visitor is anonymous, so students RLS returns nothing), but keyed on an
-- unguessable token and additionally gated on the expiry window.
--
-- Returns zero rows when the token is unknown, already claimed, or expired —
-- the claim screen treats all three the same: "ask your coach for a new link".
-- email may come back NULL; that's the normal WhatsApp case, and the claim form
-- simply renders an empty field for the student to fill in.
create or replace function get_invite_student_by_token(p_token uuid)
returns table (full_name text, phone text, email text)
language sql
security definer
set search_path = public
stable
as $$
  select s.full_name, s.phone, s.email
  from students s
  where s.invite_token = p_token
    and s.user_id is null
    and s.invite_token_expires_at > now()
  limit 1;
$$;

grant execute on function get_invite_student_by_token(uuid) to anon, authenticated;

-- ─── 4) handle_new_user(): link by token, fall back to email ──────────────────
-- The claim page passes the invite token through signUp metadata. Knowing the
-- token IS the authorization here — it's the secret in the link — so matching on
-- it is sound even though raw_user_meta_data is client-supplied. The match stays
-- gated on user_id is null AND an unexpired window, so a leaked-but-stale token
-- links nothing.
--
-- The email branch is kept for links already in the wild (/claim?email=…) and
-- runs only when the token matched nothing.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token   uuid;
  v_linked  int := 0;
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'student'
  )
  on conflict (id) do nothing;

  -- Bad/absent uuid in metadata must not abort the signup.
  begin
    v_token := nullif(new.raw_user_meta_data->>'invite_token', '')::uuid;
  exception when others then
    v_token := null;
  end;

  if v_token is not null then
    update students
       set user_id    = new.id,
           status     = 'active',
           -- The student supplies the email during claim; stamp it on the roster
           -- row so the coach sees it. coalesce keeps any email the coach typed.
           email      = coalesce(email, new.email),
           updated_at = now()
     where invite_token = v_token
       and user_id is null
       and invite_token_expires_at > now();
    get diagnostics v_linked = row_count;
  end if;

  if v_linked = 0 and new.email is not null then
    update students
       set user_id    = new.id,
           status     = 'active',
           updated_at = now()
     where lower(email) = lower(new.email)
       and user_id is null;
  end if;

  return new;
end;
$$;

-- ─── 5) rotate_invite_token() ─────────────────────────────────────────────────
-- Coach-only: mint a fresh token + 7-day window for a student whose link went
-- stale. is_coach() is enforced inside because the function is SECURITY DEFINER
-- and would otherwise bypass the students RLS policy entirely.
-- The RETURNS TABLE column names double as plpgsql variables and would shadow the
-- students columns of the same name inside the UPDATE; `use_column` resolves any
-- such ambiguity to the column, which is what every reference here wants. The
-- output names must stay as-is — the client spreads them straight onto the row.
create or replace function rotate_invite_token(p_student_id uuid)
returns table (invite_token uuid, invite_token_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not is_coach() then
    raise exception 'only a coach can rotate an invite token';
  end if;

  return query
  update students s
     set invite_token = gen_random_uuid(),
         invite_token_expires_at = now() + interval '7 days'
   where s.id = p_student_id
     and s.user_id is null
  returning s.invite_token, s.invite_token_expires_at;
end;
$$;

grant execute on function rotate_invite_token(uuid) to authenticated;
