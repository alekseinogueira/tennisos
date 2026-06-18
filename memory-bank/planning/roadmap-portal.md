TennisOS — Plano de Desenvolvimento Restante


Gerado em 16/06/2026. Seguir em ordem. Uma fase = uma sessão = um commit.




REGRAS GLOBAIS (aplicar em todos os prompts)


Auto mode OFF sempre
Ler memory-bank antes de qualquer ação
Mostrar diff/código antes de aplicar — aguardar aprovação
Lint + build após cada fase
/umb + commit ao final
Não deployar sem confirmação
Deploy via: curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_a82osi0uQFvlJfVjLZMdF2wQTfNI/51HyBK3W7X"
Design: forest #1C3526 / sand #F5EDE0 / ink #0D0D0D / Bebas Neue display / DM Sans body
Nunca tocar no site público ou nginx



FASE 8C — Player Card + Home Dashboard do Aluno

Objetivo: Home do aluno vira uma experiência visual real — player card estilo broadcast + widgets funcionais.

Pré-requisito: Nenhum. Pode iniciar agora.

SQL necessário antes de iniciar:

sql-- Adicionar coluna de sessões realizadas
alter table students
  add column if not exists sessions_count integer default 0;

Prompt:

New session. Auto mode OFF.
Read CLAUDE.md, memory-bank/activeContext.md, memory-bank/progress.md, memory-bank/database-blueprint.md.

Phase 8C — Student Home Dashboard.

Build in small steps, pause after each for approval.

---

STEP 1 — Player Card component (src/components/PlayerCard.jsx)

Create a "broadcast-style" player card shown at the top of the student Home page.
Reference: think broadcast graphics shown before a tennis match — player photo, name large, stats below.

Layout:
- Background: forest (#1C3526) with court motif SVG (already exists as CourtMotif component)
- Left side: circular avatar (from profiles.avatar_url, fallback to initials in a forest circle on sand)
- Right side:
  - First name only in Bebas Neue, large (clamp 2.5rem–4rem), sand color
  - Below name: a horizontal row of stat chips:
    - LEVEL · {tennis_level or "—"}
    - ARM · {dominant_hand or "—"}
    - SURFACE · {favorite_surface or "—"}
    - SESSIONS · {sessions_count from students table or 0}
  - Stat chips: DM Sans, 10px, uppercase, letter-spacing 2px, sand at 55% opacity, separated by · dividers
- Full width card, rounded-xl, no external shadow
- Mobile: avatar top-center, stats wrap below name

Data source: profiles table (tennis_level, dominant_hand, favorite_surface, avatar_url, full_name) + students table (sessions_count)
Read via lib/db.js — add getStudentProfile(userId) that joins profiles + students by user_id.

UX rules:
- If profile is incomplete (missing tennis data), show the card with "—" placeholders — never error
- If no avatar, show a circle with the first letter of first name in Bebas Neue

Show me the component code before creating the file. Wait for approval.

---

STEP 2 — Last Feedback widget (src/components/LastFeedbackWidget.jsx)

A card below the player card showing the most recent feedback entry for this student.

Layout:
- Label: "LAST SESSION FEEDBACK" in DM Sans uppercase, muted
- Date of the feedback (formatted: "Jun 12, 2026")
- First 120 chars of feedback notes, truncated with "..."
- A "View →" link that navigates to /feedback
- If no feedback exists: dashed border card, text "No feedback yet. Your first session is coming." (55TC voice)
- Background: white card, sand border, rounded-lg

Data: query feedbacks table for the most recent row where student_id matches.
Add getLastFeedback(studentId) to lib/db.js.

Show me before applying. Wait for approval.

---

STEP 3 — Wire into StudentDashboard.jsx

Replace the current placeholder content in StudentDashboard with:
1. <PlayerCard /> at the top
2. Next Session widget (already exists — keep as-is)
3. <LastFeedbackWidget /> below Next Session

Remove any remaining credits card references.
Preserve the forest hero with CourtMotif — keep it as the background of the PlayerCard, not a separate section.

Show me the full updated StudentDashboard before applying.

---

UX review checklist (apply before committing):
- Does the card look premium on mobile (375px)?
- Are all placeholders graceful (no raw nulls or undefined showing)?
- Is the typography hierarchy clear (name > stats > widget labels)?
- Does it feel like a player credential, not a generic dashboard?

After all steps: lint, build, /umb, commit "feat: phase 8c - player card + home widgets".
Do NOT deploy.


FASE 8D — Profile Page do Aluno

Objetivo: Profile mostra os dados reais preenchidos no onboarding, organizados visualmente. Editável.

Pré-requisito: Fase 8C concluída (getStudentProfile já existe em lib/db.js).

Prompt:

New session. Auto mode OFF.
Read CLAUDE.md, memory-bank/activeContext.md, progress.md, database-blueprint.md.

Phase 8D — Student Profile Page.

Build in small steps, pause after each for approval.

---

STEP 1 — Profile read view

Replace the current "Nothing here yet" empty state in the student Profile page with a real profile display.

Layout — two sections:

Section A: "YOUR DETAILS" — personal info
- Full name (from profiles.full_name)
- Email (from auth, read-only)
- Phone (from students.phone)
- Date of birth (formatted: "Jan 15, 1990")
- Gender

Section B: "YOUR GAME" — tennis profile  
- Level chip (styled like the stat chips in PlayerCard)
- Dominant hand chip
- Favorite surface chip
- Favorite player (text, if filled)

Avatar at top: circular, same logic as PlayerCard (photo or initials).
Below avatar: first name + last name in Bebas Neue.

If a field is empty: show "—" not null/undefined.

Style: sand background, white cards per section, DM Sans body, Bebas Neue section headers.
Labels: uppercase, 10px, letter-spacing 2px, muted forest color.

Show me before applying.

---

STEP 2 — Edit mode

Add an "EDIT PROFILE" button that opens the same fields as editable inputs.
When saved: upsert to profiles table via lib/db.js (add updateStudentProfile function).
Phone update goes to students table.
After save: show success state, return to read view.

The edit form must use the same chip selector pattern from the onboarding (not plain selects for tennis fields).

Show me before applying.

---

STEP 3 — Avatar upload in profile

Add avatar upload button in edit mode.
On file select: upload to Supabase Storage avatars/{user_id}/avatar.{ext}, update profiles.avatar_url.
Show preview immediately after upload.
Max file size: 5MB. Accept: image/*.

Show me before applying.

---

UX review checklist:
- Does it feel like a real player profile, not a form?
- Is the read view visually distinct from the edit view?
- Are chip selectors consistent with onboarding?
- Does the avatar upload degrade gracefully on slow connections?

After all steps: lint, build, /umb, commit "feat: phase 8d - student profile page".
Do NOT deploy.


FASE 8E — Library com Pastas Pré-criadas

Objetivo: Library tem pastas visuais por categoria técnica, prontas para o coach adicionar conteúdo.

Pré-requisito: Nenhum além das fases anteriores.

SQL antes de iniciar:

sql-- Inserir categorias padrão na curated_library se não existirem
insert into curated_library (title, category, description, created_at)
values
  ('Forehand', 'forehand', 'Técnica de direita — grip, swing, follow-through.', now()),
  ('Backhand', 'backhand', 'Técnica de esquerda — uma e duas mãos.', now()),
  ('Footwork', 'footwork', 'Movimentação, posicionamento e split step.', now()),
  ('Serve', 'serve', 'Saque — toss, armada e finalização.', now()),
  ('Volley', 'volley', 'Voleio — reflexo, bloco e controle.', now()),
  ('Slice', 'slice', 'Slice — chip, approach e defesa.', now()),
  ('Smash', 'smash', 'Smash — overhead e posicionamento.', now()),
  ('Mentality', 'mentality', 'Mentalidade competitiva e gestão de ponto.', now())
on conflict do nothing;

Prompt:

New session. Auto mode OFF.
Read CLAUDE.md, memory-bank/activeContext.md, progress.md, database-blueprint.md.

Phase 8E — Library with pre-created category folders.

Build in small steps, pause after each for approval.

---

STEP 1 — Library folder grid view

Redesign the student Library page from a flat video list to a folder-first grid.

Layout — two states:

State A: Folder grid (default view)
- Grid of category cards: 2 columns mobile, 3 columns desktop
- Each card:
  - Forest background with court motif
  - Category icon (use simple SVG tennis-related icons or emoji as placeholder)
  - Category name in Bebas Neue, sand, large
  - Video count badge: "{n} videos" in DM Sans, sand 55% opacity
  - If 0 videos: "Coming soon" badge instead of count
  - Clicking a card opens State B

State B: Inside a folder (category drill-down)
- Back button "← LIBRARY"
- Category name as page header
- Video cards (existing design — keep as-is)
- If empty: "Your coach is stocking this shelf. Check back soon." (existing empty state)

Categories to show: forehand, backhand, footwork, serve, volley, slice, smash, mentality
(These are now seeded in the DB — query distinct categories from curated_library, always show all 8 even if count is 0)

Show me before applying.

---

STEP 2 — Coach Library admin (Videos page)

In the admin Videos page, add a "Category" field to the add/edit video form.
Category: select from the 8 predefined options.
This field already exists in the curated_library table as `category`.
Make sure it saves correctly.

Show me before applying.

---

UX review checklist:
- Does the folder grid feel like a premium content library?
- Is the empty state per-folder clear and on-brand?
- Does the category drill-down feel native (not a page reload)?
- Is the coach video form easy to categorize?

After all steps: lint, build, /umb, commit "feat: phase 8e - library folder system".
Do NOT deploy.


FASE 8F — Agendamento de Aulas + Email de Lembrete

Objetivo: Coach agenda aulas para alunos no admin. Email automático dispara para o aluno. Widget de próxima aula no Home do aluno fica funcional.

Pré-requisito: Resend já configurado (Fase 8B).

SQL antes de iniciar:

sqlcreate table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  coach_id uuid references profiles(id),
  scheduled_at timestamptz not null,
  duration_minutes integer default 60,
  location text,
  notes text,
  status text default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_at timestamptz default now()
);

alter table sessions enable row level security;

create policy sessions_coach_all on sessions
  for all using (coach_id = auth.uid() or exists (
    select 1 from profiles where id = auth.uid() and role = 'coach'
  ));

create policy sessions_student_read on sessions
  for select using (
    student_id in (
      select id from students where user_id = auth.uid()
    )
  );

Prompt:

New session. Auto mode OFF.
Read CLAUDE.md, memory-bank/activeContext.md, progress.md, database-blueprint.md.

Phase 8F — Session scheduling + reminder email.

Build in small steps, pause after each for approval.

---

STEP 1 — Schedule session in admin (inside student detail page)

In the admin student detail page, add a "SCHEDULE SESSION" section above the credits section.

Form fields:
- Date (date picker)
- Time (time picker, 30-min increments: 07:00–21:00)
- Duration: chip selector — 60 min / 90 min (default 60)
- Location: text input, placeholder "Stanley Park Court 3"
- Notes: optional textarea

On submit:
1. Insert row into sessions table
2. Call send-session-reminder Edge Function (STEP 2) with student info + session details
3. Show success: "Session scheduled. Reminder sent."

List of upcoming sessions for this student below the form:
- Date, time, location, status badge
- Cancel button (sets status = 'cancelled')

Show me before applying.

---

STEP 2 — Edge Function: send-session-reminder

Create supabase/functions/send-session-reminder/index.ts

POST body: { student_name, student_email, scheduled_at, duration_minutes, location }

Email design: same visual system as invite email (forest header, sand body, forest CTA button).

Header headline: "SEE YOU ON THE COURT."
Subline: "55TC · Vancouver"

Body copy:
"Hey {student_name},

Just confirmed — you have a session coming up. Here are the details:"

Then a clean info block (white card, sand background):
- DATE: formatted date (e.g. "Tuesday, June 24")
- TIME: formatted time (e.g. "10:00 AM")  
- DURATION: "{n} minutes"
- LOCATION: "{location}"

Below: "See you there. Less Theory. More Game."
Signed: — Aleksei

CTA button: "VIEW MY PORTAL →" linking to https://portal.55tenniscrew.com

Footer: same as invite email (logo + tagline).

Use the hosted PNG logo:
https://vdyvlylacsghnvtllrzj.supabase.co/storage/v1/object/public/assets/55tcos-email-logo.png

Deploy after building:
supabase functions deploy send-session-reminder

Show me the function code before creating. Wait for approval.

---

STEP 3 — Next Session widget (wire to real data)

The student Home page already has a "NEXT SESSION" placeholder widget.
Wire it to real data: query sessions table for the next upcoming session for this student (status = 'scheduled', scheduled_at > now()).

If session exists: show date, time, location.
If no session: keep "Coming Soon" empty state.

Add getNextSession(studentId) to lib/db.js.

Show me before applying.

---

UX review checklist:
- Is the scheduling form fast and friction-free for the coach?
- Is the reminder email clear and professional?
- Does the Next Session widget update immediately after scheduling?
- Are cancelled sessions visually distinct in the list?

After all steps: lint, build, /umb, commit "feat: phase 8f - session scheduling + reminder email".
Do NOT deploy.


FASE 8G — Gallery por Dia de Treino + Upload de Vídeos

Objetivo: Gallery organizada por dia. Coach faz upload de vídeos dentro do perfil do aluno.

Pré-requisito: Bucket assets já existe no Supabase Storage.

SQL antes de iniciar:

sql-- student_gallery já existe, mas precisa de session_id para agrupar por aula
alter table student_gallery
  add column if not exists session_id uuid references sessions(id),
  add column if not exists clip_type text default 'full' 
    check (clip_type in ('full','highlight','short'));

Prompt:

New session. Auto mode OFF.
Read CLAUDE.md, memory-bank/activeContext.md, progress.md, database-blueprint.md.

Phase 8G — Gallery organized by training day + video upload in admin.

Build in small steps, pause after each for approval.

---

STEP 1 — Gallery folder view (by training day)

Redesign the student Gallery page from a flat video list to a session-grouped view.

Layout — two states:

State A: Session folders grid
- Each completed session = one folder card
- Card shows: date (e.g. "Jun 12"), day of week, number of clips, thumbnail of first clip
- Sorted: most recent first
- Empty state: "No footage yet. After your first session, your clips will appear here."
- Clicking opens State B

State B: Inside a session folder
- Header: date + "SESSION FOOTAGE"
- Videos grouped by clip_type:
  - "FULL SESSION" (clip_type = 'full') — shown first
  - "HIGHLIGHTS" (clip_type = 'highlight')
  - "SHORTS" (clip_type = 'short')
- Each video: YouTube embed if youtube_url, else a video player if file_url
- Back button "← GALLERY"

Data: query student_gallery joined with sessions, grouped by session_id.

Show me before applying.

---

STEP 2 — Video upload in admin (student detail page)

In the admin student detail page, add a "SESSION FOOTAGE" section.

The section lists completed sessions for this student.
For each session: an "ADD CLIPS" button that opens an upload panel.

Upload panel:
- YouTube URL field (for YouTube links)
- OR File upload (video/*, max 500MB) — uploads to Supabase Storage assets/{student_id}/{session_id}/{filename}
- Clip type selector: Full Session / Highlight / Short
- Title field (optional)
- Save button

On save: insert into student_gallery with student_id, session_id, clip_type, title, youtube_url or file_url.

Add uploadSessionClip(data) to lib/db.js.

Show me before applying.

---

UX review checklist:
- Does the gallery feel like a private video archive, not a generic list?
- Is the folder metaphor (by day) immediately clear?
- Is the upload flow fast for the coach after a session?
- Are different clip types visually distinct inside a session?

After all steps: lint, build, /umb, commit "feat: phase 8g - gallery by session + video upload".
Do NOT deploy.


FASE 10 — Coach Dashboard (QG)

Objetivo: Home do coach vira um quartel general operacional com métricas, agenda e ações rápidas.

Pré-requisito: Fases 8F e 8G concluídas (sessions table populada).

Prompt:

New session. Auto mode OFF.
Read CLAUDE.md, memory-bank/activeContext.md, progress.md, database-blueprint.md.

Phase 10 — Coach Dashboard (HQ).

Build in small steps, pause after each for approval.

The coach Home page is currently a blank placeholder. Replace it with a full operational dashboard.

---

STEP 1 — Metrics row (top of page)

4 metric cards in a horizontal row (2x2 on mobile):
- ACTIVE STUDENTS — count of students where status = 'active'
- SESSIONS THIS MONTH — count of sessions where status in ('scheduled','completed') and scheduled_at this calendar month
- FEEDBACKS THIS MONTH — count of feedbacks created this month
- PENDING FEEDBACK — count of students with a completed session in last 14 days but no feedback created after that session

Each card: sand background, large Bebas Neue number, DM Sans label, forest color.
Add all queries to lib/db.js under coach-specific functions.

Show me before applying.

---

STEP 2 — This week's sessions (agenda)

A section titled "THIS WEEK" showing all sessions scheduled for the current week.
Each row: day label, time, student name, location, status badge.
Actions per row: "ADD FEEDBACK" (link to feedback composer for that student) | "CANCEL"
Empty: "No sessions this week. Schedule one from a student's profile."

Show me before applying.

---

STEP 3 — Pending feedback list

A section titled "FEEDBACK DUE" — students who had a session in the last 14 days but have no feedback entry after that session date.
Each row: student name, session date, "WRITE FEEDBACK →" action link.
This is the coach's accountability system.

Show me before applying.

---

STEP 4 — Recent activity feed

A compact feed at the bottom: last 5 feedbacks given + last 5 sessions scheduled, merged and sorted by date.
Each item: icon (📋 feedback / 🎾 session), student name, date, brief description.

Show me before applying.

---

UX review checklist:
- Does it feel like a real business dashboard, not a demo?
- Is the most important info (pending feedback, this week) immediately visible?
- Is the layout clean on desktop (main content area, not full-width cards)?
- Does it load fast (parallel queries, not sequential)?

After all steps: lint, build, /umb, commit "feat: phase 10 - coach dashboard hq".
Do NOT deploy.


DEPLOY FINAL (após todas as fases)

Após confirmar cada fase no mobile e desktop:

bash# 1. Push
git push origin master

# 2. Deploy
curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_a82osi0uQFvlJfVjLZMdF2wQTfNI/51HyBK3W7X"

# 3. Redesploy Edge Functions se houver novas
supabase functions deploy send-session-reminder


ORDEM RECOMENDADA


✅ Fase 8C — Player Card (impacto visual imediato, nenhuma dependência)
✅ Fase 8D — Profile (fecha o loop do onboarding)
✅ Fase 8E — Library folders (independente, SQL simples)
✅ Fase 8F — Agendamento (habilita widget Next Session + email)
✅ Fase 8G — Gallery upload (depende de sessions existirem)
✅ Fase 10 — Coach Dashboard (depende de tudo acima para ter dados reais)



NOTA SOBRE O USUÁRIO DE TESTE ATUAL

O usuário alekseinogueira.dash@gmail.com foi criado antes do onboarding existir — não tem linha na tabela profiles. Para corrigir manualmente sem refazer o fluxo, rode no Supabase SQL Editor:

sql-- Substituir pelo UUID real do usuário (ver em Authentication > Users)
insert into profiles (id, full_name, email, role)
values (
  '87ed2a89-df19-4921-a8c8-52c3ea7585bc',
  'Aleksei Nogueira Sousa',
  'alekseinogueira.dash@gmail.com',
  'student'
) on conflict (id) do update set
  full_name = excluded.full_name,
  role = excluded.role;

Isso faz as páginas Home e Profile carregarem dados reais para o usuário de teste atual.
