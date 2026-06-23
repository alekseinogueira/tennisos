-- 010_feedbacks_notion_id_unique.sql
-- Fase-E ETAPA 4 enabler: make `feedbacks.notion_id` upsertable via PostgREST.
--
-- Migration 009 created a PARTIAL unique index on notion_id (`where notion_id is
-- not null`). PostgREST's upsert (`on_conflict=notion_id`) emits a bare
-- `ON CONFLICT (notion_id)` with no WHERE predicate, which Postgres will NOT match
-- to a partial index — so the n8n "Publicar Feedback" upsert would fail with
-- "no unique or exclusion constraint matching the ON CONFLICT specification".
--
-- A PLAIN unique index gives the identical dedup guarantee (Postgres treats NULLs
-- as distinct, so the many coach-written rows with notion_id = NULL are still all
-- allowed) AND satisfies the ON CONFLICT target. Safe to convert: no rows carry a
-- notion_id yet (ETAPA 4 has never run), so no duplicate-key conflict on creation.

drop index if exists feedbacks_notion_id_key;
create unique index if not exists feedbacks_notion_id_key
  on feedbacks (notion_id);
