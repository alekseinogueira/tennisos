-- 012_sessions_group_id.sql
-- Group trainings (Fase F1, Etapa 1): the N session rows (1 per student) created
-- together by the coach-home "Schedule Training" block share a group_id, so
-- Etapa 2 can reschedule/cancel the whole training precisely instead of guessing
-- by date+location. NULL for single-student sessions booked elsewhere.
alter table sessions add column if not exists group_id uuid;
create index if not exists sessions_group_idx
  on sessions (group_id) where group_id is not null;
