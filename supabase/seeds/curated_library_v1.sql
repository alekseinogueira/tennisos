-- Curated Library — seed v1 (37 videos across the 8 technique folders)
--
-- This is a SEED, not a migration. It lives outside supabase/migrations/ on purpose so
-- `supabase db push` never picks it up. Applying it is a deliberate, approved action.
--
-- Curation, sources and rationale: memory-bank/planning/library-curation.md
--
-- Idempotent: every row inserts only when no row with the same external_url exists, so
-- re-running this file is safe and will not create duplicates.
--
-- Columns: curated_library (id, coach_id, title, category, external_url, source, created_at)
--   coach_id  left NULL (nullable; nothing in the app reads it for library items)
--   category  lowercase, must match the folder keys in src/screens/Library.jsx
--   title     "<Subtopic> · <Channel>" — there is no description column (see the doc)
--   source    'youtube' so LibraryCard renders an inline embed instead of a "Watch ↗" tile
--
-- Apply with:  supabase db query --linked --file supabase/seeds/curated_library_v1.sql
-- Verify with: select category, count(*) from curated_library group by category order by 1;
-- Roll back:   delete from curated_library where external_url in (select v.external_url ...)
--              -- or simply: delete from curated_library where created_at >= '<run timestamp>';

begin;

insert into curated_library (title, category, external_url, source)
select v.title, v.category, v.external_url, v.source::video_source
from (
  values
    -- ─── forehand ────────────────────────────────────────────────────────────
    ('Fundamentals · Intuitive Tennis',
     'forehand', 'https://www.youtube.com/watch?v=J96D3wqpd4E', 'youtube'),
    ('Unit Turn & Preparation · Feel Tennis',
     'forehand', 'https://www.youtube.com/watch?v=vcWAEcF6klU', 'youtube'),
    ('Swing Path & Topspin · Intuitive Tennis',
     'forehand', 'https://www.youtube.com/watch?v=S6X4XN9rdJk', 'youtube'),
    ('Power & Kinetic Chain · Top Tennis Training',
     'forehand', 'https://www.youtube.com/watch?v=-sZ3madzfoA', 'youtube'),
    ('Inside-Out & Inside-In · Intuitive Tennis',
     'forehand', 'https://www.youtube.com/watch?v=7kdaTE0c6Ak', 'youtube'),

    -- ─── backhand ────────────────────────────────────────────────────────────
    ('Two-Hander Fundamentals · Top Tennis Training',
     'backhand', 'https://www.youtube.com/watch?v=PBguk3yRPgI', 'youtube'),
    ('Two-Hander Explained · 2MinuteTennis',
     'backhand', 'https://www.youtube.com/watch?v=EMbM8DiI1vA', 'youtube'),
    ('One-Hander Fundamentals · Meike Babel Tennis',
     'backhand', 'https://www.youtube.com/watch?v=c65CK6TdT5Y', 'youtube'),
    ('One-Hander in a Real Lesson · Online Tennis Instruction',
     'backhand', 'https://www.youtube.com/watch?v=G9h2ZnOag9s', 'youtube'),
    ('Two-Hander Power · Top Tennis Training',
     'backhand', 'https://www.youtube.com/watch?v=Lz7JGJNfkUc', 'youtube'),

    -- ─── footwork ────────────────────────────────────────────────────────────
    ('Split Step Technique · Intuitive Tennis',
     'footwork', 'https://www.youtube.com/watch?v=TNO_bQBHv04', 'youtube'),
    ('Split Step Timing · Online Tennis Instruction',
     'footwork', 'https://www.youtube.com/watch?v=zuLTHMubJws', 'youtube'),
    ('Open, Neutral & Closed Stance · 2MinuteTennis',
     'footwork', 'https://www.youtube.com/watch?v=8E5ln-ZCdTw', 'youtube'),
    ('Recovering From Out Wide · Essential Tennis',
     'footwork', 'https://www.youtube.com/watch?v=_5lxOa9AJsU', 'youtube'),
    ('Recovering Fast to the Middle · Top Tennis Training',
     'footwork', 'https://www.youtube.com/watch?v=kwZDdsQgqcQ', 'youtube'),

    -- ─── serve ───────────────────────────────────────────────────────────────
    ('Continental Grip · 2MinuteTennis',
     'serve', 'https://www.youtube.com/watch?v=KKpDgeKG5OQ', 'youtube'),
    ('The Toss · Online Tennis Instruction',
     'serve', 'https://www.youtube.com/watch?v=WJyJT-7Cspg', 'youtube'),
    ('Pronation · Feel Tennis',
     'serve', 'https://www.youtube.com/watch?v=-9cIObcQyME', 'youtube'),
    ('Second Serve — Slice, Flat & Kick · Top Tennis Training',
     'serve', 'https://www.youtube.com/watch?v=20GhUFY27CU', 'youtube'),
    ('Building a Kick Serve · Tom Avery Tennis',
     'serve', 'https://www.youtube.com/watch?v=W4Ia5vkhJL8', 'youtube'),

    -- ─── volley ──────────────────────────────────────────────────────────────
    ('Volley Feel & Contact · Feel Tennis',
     'volley', 'https://www.youtube.com/watch?v=ixtikTVrpEY', 'youtube'),
    ('Forehand & Backhand Volley · 2MinuteTennis',
     'volley', 'https://www.youtube.com/watch?v=rpacFeUeioc', 'youtube'),
    ('Backhand Volley · Meike Babel Tennis',
     'volley', 'https://www.youtube.com/watch?v=E-G4T4ChW-8', 'youtube'),
    ('Approach Shot & Attacking the Net · Intuitive Tennis',
     'volley', 'https://www.youtube.com/watch?v=viUIvlUF5Bs', 'youtube'),

    -- ─── slice ───────────────────────────────────────────────────────────────
    ('Backhand Slice Fundamentals · Intuitive Tennis',
     'slice', 'https://www.youtube.com/watch?v=2ZpAyZvQ39A', 'youtube'),
    ('Backhand Slice Grip & Technique · Essential Tennis',
     'slice', 'https://www.youtube.com/watch?v=CRkBSTc8234', 'youtube'),
    ('Backhand Slice Masterclass · Top Tennis Training',
     'slice', 'https://www.youtube.com/watch?v=lv9qNBtN95k', 'youtube'),
    ('Forehand Slice · Feel Tennis',
     'slice', 'https://www.youtube.com/watch?v=WXyzSxUhExo', 'youtube'),

    -- ─── smash ───────────────────────────────────────────────────────────────
    ('Overhead Technique · Top Tennis Training',
     'smash', 'https://www.youtube.com/watch?v=PdM6cmb3ef4', 'youtube'),
    ('Power & Control · Essential Tennis',
     'smash', 'https://www.youtube.com/watch?v=3C8a_ZBVwok', 'youtube'),
    ('Never Miss an Overhead · PlayYourCourt',
     'smash', 'https://www.youtube.com/watch?v=NOMh7eK5HY4', 'youtube'),
    ('Three Simple Cues · 2MinuteTennis',
     'smash', 'https://www.youtube.com/watch?v=qENjaMTnCmc', 'youtube'),

    -- ─── mentality ───────────────────────────────────────────────────────────
    ('Playing Under Pressure · Essential Tennis',
     'mentality', 'https://www.youtube.com/watch?v=teZlZP_0gEg', 'youtube'),
    ('Between-Point Routines · Aubone Tennis',
     'mentality', 'https://www.youtube.com/watch?v=awbsmYIgoVE', 'youtube'),
    ('Calming Down On Court · Feel Tennis',
     'mentality', 'https://www.youtube.com/watch?v=NwbxznLExyQ', 'youtube'),
    ('What To Focus On In a Match · Online Tennis Instruction',
     'mentality', 'https://www.youtube.com/watch?v=e6yGaShjtHo', 'youtube'),
    ('Closing Out Matches · Meike Babel Tennis',
     'mentality', 'https://www.youtube.com/watch?v=twMrBvmrUb0', 'youtube')
) as v(title, category, external_url, source)
where not exists (
  select 1 from curated_library c where c.external_url = v.external_url
);

commit;

-- Post-apply check — expected: backhand 5, footwork 5, forehand 5, mentality 5, serve 5,
-- slice 4, smash 4, volley 4  (37 total)
-- select category, count(*) from curated_library group by category order by category;
