-- 006_sessions.sql
-- Scheduled coaching sessions (subject = student). Mirrors the feedbacks pattern:
-- a denormalized student user_id is the RLS subject, student_id is the roster FK.
-- user_id may be NULL for a not-yet-claimed student (the reminder email still goes
-- to the roster email; the student's Next Session widget lights up once claimed).

create type session_status as enum ('scheduled', 'completed', 'cancelled');

create table sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete set null, -- student subject (RLS); NULL until claimed
  student_id       uuid not null references students(id) on delete cascade,
  coach_id         uuid references auth.users(id),                    -- who scheduled it
  scheduled_at     timestamptz not null,
  duration_minutes int not null default 60,
  location         text,
  notes            text,
  status           session_status not null default 'scheduled',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index sessions_student_idx   on sessions (student_id);
create index sessions_user_idx      on sessions (user_id);
create index sessions_scheduled_idx on sessions (scheduled_at);

create trigger sessions_set_updated_at
  before update on sessions
  for each row execute function set_updated_at();

-- ─── RLS ───────────────────────────────────────────────────────────────────────
alter table sessions enable row level security;

-- SELECT: student sees own; coach sees all.
create policy sessions_select on sessions
  for select using (user_id = auth.uid() or is_coach());

-- Coach: full CRUD (schedule / cancel / edit).
create policy sessions_coach_all on sessions
  for all using (is_coach()) with check (is_coach());
