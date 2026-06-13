-- 002_mvp_schema.sql
-- The 6 MVP business tables + their enums. Every table carries a user_id
-- (the RLS subject). RLS is ENABLED with policies in 003.

-- ─── enums ────────────────────────────────────────────────────────────────────
create type student_status as enum ('invited', 'active', 'inactive');
create type credit_reason  as enum ('purchase', 'lesson', 'adjustment', 'refund');
create type video_source   as enum ('upload', 'youtube', 'link');

-- ─── shared updated_at trigger ────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── students (coach-managed roster; subject = student) ──────────────────────
create table students (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null, -- NULL until claimed
  email      text not null,
  full_name  text not null,
  phone      text,
  status     student_status not null default 'invited',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index students_user_id_idx on students (user_id);
create index students_email_idx   on students (email);

create trigger students_set_updated_at
  before update on students
  for each row execute function set_updated_at();

-- ─── packages (offerings catalog; owner = coach) ─────────────────────────────
create table packages (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id), -- owner coach
  name             text not null,
  lessons_included int not null,
  price_cents      int,                                      -- Stripe later
  validity_days    int,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ─── lesson_credits (credit ledger; subject = student) ───────────────────────
create table lesson_credits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id),                  -- student subject
  student_id uuid not null references students(id) on delete cascade,
  package_id uuid references packages(id),                             -- NULL = manual adj.
  delta      int not null,                                             -- +granted / -used
  reason     credit_reason,
  note       text,                                                     -- optional coach memo
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index lesson_credits_student_idx on lesson_credits (student_id);
create index lesson_credits_user_idx    on lesson_credits (user_id);

-- ─── feedbacks (written lesson feedback; subject = student) ──────────────────
create table feedbacks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id),                 -- student subject
  student_id  uuid not null references students(id) on delete cascade,
  coach_id    uuid references auth.users(id),                          -- author
  title       text,
  body        text not null,
  lesson_date date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index feedbacks_student_idx on feedbacks (student_id);
create index feedbacks_user_idx    on feedbacks (user_id);

create trigger feedbacks_set_updated_at
  before update on feedbacks
  for each row execute function set_updated_at();

-- ─── student_gallery (per-student PRIVATE lesson footage; subject = student) ──
-- The student's own clips, added by the coach. Visible only to that student.
-- Uploads land later; for now external_url holds a Drive/YouTube link.
create table student_gallery (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id),               -- student subject (RLS)
  student_id       uuid not null references students(id) on delete cascade,
  coach_id         uuid references auth.users(id),                        -- who added it
  title            text,
  storage_path     text,                                                  -- Supabase Storage object (future upload)
  external_url     text,                                                  -- Drive/YouTube link for now
  source           video_source not null default 'link',
  external_ref     text,                                                  -- external producer id (n8n) — future
  duration_seconds int,
  created_at       timestamptz not null default now()
);
create index student_gallery_student_idx on student_gallery (student_id);
create index student_gallery_user_idx    on student_gallery (user_id);

-- ─── curated_library (GLOBAL coach-owned technical references) ───────────────
-- Reusable reference videos (YouTube / external links) any student can browse.
-- No student_id — these are not tied to a person; organized by free-text category.
create table curated_library (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid references auth.users(id),
  title        text not null,
  category     text,                                                      -- forehand, backhand, serve, … (free text)
  external_url text not null,
  source       video_source not null default 'link',                     -- youtube | link
  created_at   timestamptz not null default now()
);
create index curated_library_category_idx on curated_library (category);

-- ─── feedback_gallery_links (join feedbacks <-> student_gallery) ─────────────
-- user_id is the student subject, COPIED from the parent feedback so RLS stays
-- a single predicate (no EXISTS-join). Set by the writing coach UI.
create table feedback_gallery_links (
  id          uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references feedbacks(id)        on delete cascade,
  gallery_id  uuid not null references student_gallery(id)  on delete cascade,
  user_id     uuid not null,
  created_at  timestamptz not null default now(),
  unique (feedback_id, gallery_id)
);
create index fgl_user_idx on feedback_gallery_links (user_id);

-- ─── feedback_library_links (join feedbacks <-> curated_library) ────────────
-- user_id is the student subject the feedback is for (denormalized from feedback).
create table feedback_library_links (
  id          uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references feedbacks(id)       on delete cascade,
  library_id  uuid not null references curated_library(id) on delete cascade,
  user_id     uuid not null,
  created_at  timestamptz not null default now(),
  unique (feedback_id, library_id)
);
create index fll_user_idx on feedback_library_links (user_id);
