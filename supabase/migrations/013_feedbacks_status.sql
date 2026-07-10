-- 013: feedbacks.status — draft vs published (Fase F1, Etapa 3).
--
-- AI-generated feedbacks will land in Supabase as drafts for the coach to review
-- and publish from the portal (Fase F2 creates them; the HQ "Feedback Due" block
-- reviews them). A student must only ever see published rows.
--
-- Existing rows are all live/student-visible today, so the default 'published'
-- keeps them exactly as they are. Coach-written feedbacks (FeedbackComposer)
-- keep publishing directly via the same default. Additive + idempotent.

alter table feedbacks
  add column if not exists status text not null default 'published'
    check (status in ('draft', 'published'));

-- Student SELECT now additionally requires status = 'published'.
-- The coach keeps full visibility (drafts included) via is_coach().
drop policy if exists feedbacks_select on feedbacks;
create policy feedbacks_select on feedbacks
  for select using ((user_id = auth.uid() and status = 'published') or is_coach());
