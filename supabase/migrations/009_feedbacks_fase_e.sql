-- 009_feedbacks_fase_e.sql
-- Fase-E prerequisite: extend `feedbacks` so the n8n "Análise de Treino" workflow
-- can upsert AI-generated session analyses (ETAPA 4 — Notion → Supabase sync).
-- All columns are NULLABLE and additive: existing coach-handwritten feedbacks
-- (title/body/lesson_date) keep working untouched; the new fields simply stay NULL
-- for them. No RLS change — existing row policies (student-own / coach-all) already
-- cover every column. The n8n upsert runs with the service key (bypasses RLS) and
-- must populate `user_id` (resolved from the student) so the student's SELECT sees it.

-- Provenance of the row: 'coach' for the FeedbackComposer path, 'video_analysis'
-- for rows produced by the n8n Gemini pipeline.
alter table feedbacks add column if not exists source text not null default 'coach';

-- Dedup / upsert conflict target: the Notion page id this row was synced from.
-- NULL for coach-written rows; UNIQUE (partial) so re-running the sync upserts
-- in place instead of duplicating. Postgres allows many NULLs under a unique index.
alter table feedbacks add column if not exists notion_id text;
create unique index if not exists feedbacks_notion_id_key
  on feedbacks (notion_id) where notion_id is not null;

-- Session-shape metrics from the Gemini analysis.
alter table feedbacks add column if not exists duration_minutes int;        -- duracao
alter table feedbacks add column if not exists rally_avg        numeric;    -- rally_medio

-- Qualitative selects (stored as their human label, e.g. "Em Desenvolvimento").
alter table feedbacks add column if not exists quality          text;       -- qualidade_tecnica
alter table feedbacks add column if not exists effort           text;       -- esforco_intensidade
alter table feedbacks add column if not exists game_application text;       -- aplicacao_em_jogo
alter table feedbacks add column if not exists progress_level   text;       -- progresso_geral

-- Numeric ratings 0–10 (range enforced upstream in the n8n clampRating; smallint here).
alter table feedbacks add column if not exists rating_technique smallint;   -- rating_tecnica
alter table feedbacks add column if not exists rating_intensity smallint;   -- rating_intensidade
alter table feedbacks add column if not exists rating_position  smallint;   -- rating_posicao
alter table feedbacks add column if not exists rating_progress  smallint;   -- rating_progresso

-- Focus + forward-looking content.
alter table feedbacks add column if not exists focus_areas text[];          -- foco_principal[]
alter table feedbacks add column if not exists focus_next  text;            -- foco_proxima_aula
-- Structured next-lesson objectives: array of { titulo, descricao }.
alter table feedbacks add column if not exists next_session_goals jsonb;    -- objetivos_proxima_aula

-- Public URL of the generated visual card (ETAPA 3 output, stored in Notion too).
alter table feedbacks add column if not exists card_visual_url text;
