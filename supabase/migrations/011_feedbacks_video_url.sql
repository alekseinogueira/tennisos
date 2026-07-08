-- 011_feedbacks_video_url.sql
-- Fase D — Ajuste B: dá ao portal um lugar para o link "Vídeo da Aula" do Notion.
-- Aditivo + nullable; nada removido/renomeado. RLS inalterada (a coluna nova cai
-- nas policies de linha já existentes). O workflow "55TC - Publicar Feedback"
-- passará a mapear Notion "Vídeo da Aula" → feedbacks.video_url no publish.
alter table feedbacks add column if not exists video_url text;
