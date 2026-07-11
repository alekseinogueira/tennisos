-- 014: student_visual_profile — remembered visual cues (Fase F2, Etapa 3).
--
-- The video-analysis dispatch screen asks "how to spot them" per student so
-- Gemini can tell players apart in a group video. This table remembers the
-- last cue the coach confirmed per student, so the field comes pre-filled on
-- the next dispatch (coach confirms or edits). One row per student (UNIQUE →
-- upsert on_conflict=student_id, same idiom as feedbacks.notion_id in 010).
-- Coach tooling only — students never read or write it. Additive + idempotent.

create table if not exists student_visual_profile (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null unique references students(id) on delete cascade,
  visual_cue   text not null,
  confirmed_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table student_visual_profile enable row level security;

drop policy if exists svp_coach_all on student_visual_profile;
create policy svp_coach_all on student_visual_profile
  for all using (is_coach()) with check (is_coach());
