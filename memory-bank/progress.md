# Progress

> What works, what's left, known issues. Updated at the end of every session via `/umb`.
> Read this first at the start of every task.

## What Works
- **i18n `SessionDetail.jsx` — labels estáticos 100% em inglês (2026-07-09, `27e303e`, NÃO deployado).** Auditoria dos
  labels estáticos do detalhe de feedback do aluno: já estavam todos em inglês; único ajuste real foi renomear a linha de
  rating `rating_progress` de `Progress`→`Overall progress` (desambigua do indicador qualitativo `Progress`). Strings PT
  que sobram (`QUAL_INDICATORS` escalas + `FocusIcon` regex) são chaves de lookup contra dados do DB, deixadas de propósito.
  lint limpo. Prod serve o label antigo até o próximo `deploy-prod`.
- **Fase D COMPLETA (Etapas 1–3) — aba Feedbacks redesenhada + comparação, DEPLOYADA em produção (2026-07-08,
  `80c6c48`).** Etapa 3: `FeedbackCompare.jsx` (`/feedback/compare?a=&b=`) — tela dedicada, entrada pelo botão
  "Compare sessions" da aba Feedback (só com ≥2 feedbacks). Seletores A/B gravam na URL; A/B resolvidos da lista
  do próprio aluno (RLS-safe). Ratings 0–10 em barras pareadas + delta, rally avg, evolução qualitativa (setas pelas
  escalas do `SessionDetail`), focus areas lado a lado. Paleta só forest/ink (sobe=forest sólido, igual=ink,
  desce=forest vazado). **Coach aprovou via preview e escolheu tela separada (não inline).** Deploy verificado via
  API Vercel (`dpl_FWHCbTXn...` READY/production, commit `80c6c48`); no ar em `portal.55tenniscrew.com`. Os 2 feedbacks
  simulados (`SIM-TEST-*`) foram deletados do Supabase de produção após a validação. lint+build limpos.
- **Fase D Etapas 1–2 + Ajustes A/B — aba Feedbacks redesenhada (2026-07-08, DEPLOYADO em `80c6c48` junto da Etapa 3).**
  Etapa 1: `Feedbacks.jsx` virou galeria de **capas clicáveis** (data·título·4 mini-ratings·focus tags·excerpt) →
  `/feedback/:id`; botão "Compare sessions" (disabled). Etapa 2: **`SessionDetail.jsx` NOVO** (`/feedback/:id`) —
  dashboard mobile-first de 7 seções (header, 4 pills forest, indicadores qualitativos dot-on-track, focos+rally,
  ratings 0–10 segmentados, objetivos c/ court SVG inline + ícones focus SVG, análise do coach card forest c/ foto).
  Vídeos migraram da galeria p/ o detalhe. Nomeado SessionDetail p/ não colidir c/ `admin/FeedbackDetail`.
  **Ajuste A:** foto do coach no bucket Storage `assets/coach/aleksei.jpg` (público, 200) + wired no componente.
  **Ajuste B:** migration `011` (`feedbacks.video_url` text nullable) APLICADA live; workflow n8n `55TC - Publicar
  Feedback` mapeia Notion "Vídeo da Aula"→`video_url` (Mapear Páginas + Montar Payload; upsert manda payload inteiro),
  aplicado live via CLI (active/9 nós/creds intactas); seção "SESSION VIDEOS" no detalhe (botão "▶ Watch on Drive"
  ou placeholder). Paleta **só 55TC** (sem dourado, decisão do coach vs. doc). **UI toda em inglês.** lint+build limpos.
  **Migration 011 + workflow = LIVE; frontend NÃO deployado** (prod serve a aba antiga até a Etapa 4).
- **Rotação REAL das credenciais Gemini + Notion COMPLETA (2026-06-23, live, external).** Fecha o resíduo
  de segurança da Fase-E (a ETAPA 5 fez só o hardening). Coach gerou nova chave Gemini (**formato novo
  `AQ.…`**, funciona via `?key=`) + novo token Notion; atualizei os VALORES das 2 creds n8n por ID (`Gemini
  API` `QzDFsG1HIbE8SYLa`, `Notion HTTP` `CC31lqcuz7ynyYed`) via `import:credentials` (nós intactos, valores
  não registrados). Validado por smoke test direto na API antes de revogar (Gemini 200, Notion 200, DB de
  produção 200); n8n reiniciado, workflows ativos. Coach revogou as antigas. **`shred` em 19 arquivos
  plaintext** (restores `etapa1/3/4/5-work/` + `.new`); sweep final = 0 segredos plaintext. **Fase-E 100%
  fechada, inclusive segurança.**
- **Fase-E ETAPA 5 COMPLETA (2026-06-23, live, external) — credential hardening do `55TC - Análise de
  Treino` (`T7kobxM1FZM99O8l`):** os 4 nós LEGADOS que guardavam segredo em texto puro agora usam credenciais
  n8n encriptadas **by ID**. Criada cred nova **`httpQueryAuth` "Gemini API" (`QzDFsG1HIbE8SYLa`)** (injeta
  `?key=`) para os 3 nós Gemini (`Analisar`/`Upload`/`Verificar Estado`) — chave hardcoded removida; **reusada
  `Notion HTTP` (`CC31lqcuz7ynyYed`)** no `Criar Entrada no Notion` — header `Authorization: Bearer ntn_…`
  removido. Re-export pós-`pm2 restart` confirma: active, 16 nós, connections idênticas, **0 segredos
  hardcoded**, 9 nós com auth 100% por credencial. Sem deploy (puro n8n). Restore (com tokens antigos, fora do
  repo): `/root/etapa5-work/wf-pre-etapa5-restore.json`. **Fecha o "Problema 4" da Fase-E → ETAPA 1–5 + WF2
  completos.** ~~Caveat: chave/token antigos seguem válidos até revogar~~ **RESOLVIDO 2026-06-23 pela rotação
  real** (ver entrada acima) — antigos revogados, restore plaintext `shred`-apagado.
- **Fase-E ETAPA 4 COMPLETA (2026-06-23, live + validada):** workflow n8n **`55TC - Publicar Feedback`**
  (`yk7iENBUAGMj3M6a`) ATIVO — schedule a cada 5 min: query Notion (Status=Publicado & synced_to_portal=false
  no DB `3539…80d4`) → mapeia props→campos flat (parseGoals→jsonb, clampInt 0–10) → lookup do aluno em
  `students` → IF tem conta → **upsert `feedbacks` on_conflict=notion_id** → marca synced_to_portal=true no
  Notion → **email branded PT-BR via Edge Function `send-feedback-email`**. Credenciais por ID (*Notion HTTP*,
  *Supabase Service*). **Migration `010` (índice UNIQUE plain em `notion_id`, requisito do upsert) APLICADA
  live; Edge Function DEPLOYADA** (guard service-role → 401 sem chave, verificado). Run live de validação
  (exec 23, success): query Notion autenticou, 0 publicados → 0 itens → nós de escrita skipados, **sem
  side-effects**. **E2e real com dados deixado pro coach** (publicar um feedback real). Fecha o loop Fase-E:
  vídeo→Gemini→Notion(rascunho)→card→coach publica→portal+email.
- **Fase-E ETAPA 4 pré-requisitos (2026-06-23):** `feedbacks` estendida com 16 colunas Fase-E
  (migration `009`, **APLICADA live** no Supabase) — `notion_id` UNIQUE parcial (chave de upsert),
  ratings 0–10, focus_areas[], next_session_goals jsonb, selects qualitativos, card_visual_url,
  `source`. Aba Feedback do portal (`Feedbacks.jsx`) renderiza os campos ricos (barras de rating,
  pills, objetivos), degradando p/ feedback coach-escrito. Lint+build limpos. **Frontend NÃO deployado**
  (migration sim). Desbloqueia a ETAPA 4 (sync Notion→Supabase).
- Context infrastructure (CLAUDE.md, memory-bank, slash commands, explorer agent).
- Architecture design (`architecture.md`) and database blueprint (`database-blueprint.md`).
- App scaffold (Vite + React 19 + Tailwind v4 + react-router-dom v7), lint clean on npm.
- EPC plumbing: `lib/supabase.js` (single client) + `lib/db.js` (named fns + `unwrap()`).
- Auth layer: `AuthProvider`/`useAuth`, `ProtectedRoute`, `RoleRoute`, branded `Layout` shell.
- Auth screens: premium `Login`, `ForgotPassword`, `ResetPassword`, `ClaimInvite`.
- 55TC theming via Tailwind v4 `@theme` tokens + Bebas Neue / DM Sans.
- Role-gated routing end to end (login → role redirect → shell → `/coach` behind RoleRoute).
- **Admin panel (coach/admin):** `/admin` landing, `/admin/students` roster table
  (name · email · status badge · credit balance), create/edit student form, and the
  `InvitePanel` claim-link generator. `getCreditBalances()` (one-query roster balances).
  Lint + build clean.
- **Student portal — Phase 5 COMPLETE (student):** dashboard `/` (forest welcome hero +
  court motif + lesson-credit balance + "Next Session" coming-soon placeholder) and
  read-only `/profile` (full_name · email · phone · status, own-row via RLS). Shared
  `CourtMotif` component; Profile nav item in the student nav. Lint + build clean.
- **Feedback + video library — Phase 6 COMPLETE (code-level):**
  - **Two-system video model.** `videos`/`feedback_video_links` replaced by
    `student_gallery` (per-student PRIVATE) + `curated_library` (GLOBAL, browse-by-any-
    authenticated) + `feedback_gallery_links` + `feedback_library_links`. RLS + `db.js`
    helpers + blueprint updated; `002`/`003` edited in place (unapplied).
  - **Admin:** `FeedbackComposer` (`/admin/students/:id/feedback/new`, blocks unclaimed
    students), `FeedbackDetail` (`/admin/students/:id/feedback/:fid`, attach library items +
    gallery clips; URL-paste add-clip form auto-attaches), `Videos` (`/admin/videos`,
    curated-library CRUD). Roster gained a Feedback action; AdminHome gained a Library card.
  - **Student:** `Feedbacks` (`/feedback`) — own feedback newest-first with inline-playing
    YouTube embeds + "Watch ↗" links for other sources. Feedback nav item.
  - Lint + build clean.
- **Lesson credits UI — Phase 7 COMPLETE (code-level):**
  - **Admin:** `StudentDetail` (`/admin/students/:id`) — per-student credit hub: live balance,
    per-transaction adjustment form (signed `delta`, `reason`, optional `note` → `addCredit`),
    and credit history (newest first). Blocks unclaimed students. Roster name links here.
  - **Schema:** `lesson_credits` gained a nullable `note` column (migration `002`, edited in place).
  - **Student:** dashboard balance confirmed live (`getCreditBalance` over the real ledger) — the
    loop closes once an entry is recorded. No dashboard change needed.
  - Lint + build clean.
- **Student video screens — Phase 8 COMPLETE (code-level):**
  - **`/library`** (`Library.jsx`): browses the GLOBAL `curated_library` (`listLibrary`), open to
    any signed-in user. Free-text-category filter chips + card grid; YouTube embeds inline, other
    links get a "Watch ↗" tile. Library nav item for both student and coach.
  - **`/gallery`** (`Gallery.jsx`): the student's OWN `student_gallery` clips
    (`listGalleryForStudent`), RLS-private, newest first with date + playable clip. Student nav only.
  - **`lib/youtube.js`** (NEW): shared `youtubeId(url)` parser used by both screens.
  - Lint + build clean.

- **Onboarding & student experience — Phase 8B COMPLETE (code-level, 2026-06-15):**
  - **Invite email:** `supabase/functions/send-invite-email/index.ts` (Deno + Resend, key via
    Edge secret) sends the branded invite; `StudentForm` auto-invokes it on student create
    (best-effort, InvitePanel link still the fallback). `.env.example` gained `RESEND_API_KEY`.
  - **`/claim` onboarding:** new `ClaimPage.jsx` — 4 steps (account+signUp → tennis profile+avatar
    → waiver → welcome), 1:1 with the approved prototype. `db.js` gained `getStudentByEmail` (RPC),
    `uploadAvatar`. `main.jsx` repointed `/claim`; old `ClaimInvite.jsx` deleted.
  - **Migration `004` (UNAPPLIED):** 9 `profiles` onboarding columns, public `avatars` bucket +
    owner-scoped storage RLS, `get_invite_student(email)` SECURITY DEFINER RPC for anon pre-fill.
  - **Student UX:** nav reordered to Home/Feedback/Gallery/Library/Profile; lesson-credits card
    removed from the dashboard (ledger + admin hub untouched).
  - Lint + build clean. **Invite-email path DEPLOYED 2026-06-17** (frontend `fetch` fix on Vercel,
    Edge Function deployed with PNG logo + `verify_jwt=true`, `RESEND_API_KEY` set) — end-to-end
    email delivery still pending a real coach-creates-student send. The rest of 8B (`/claim`
    onboarding, migration 004) remains code-level / unapplied.

- **Student Home dashboard — Phase 8C COMPLETE (code-level, 2026-06-17):**
  - **`PlayerCard.jsx`** (NEW): broadcast-style credential at the top of Home — forest + court
    motif, circular avatar (sand-circle + forest-initial fallback), first name in Bebas Neue
    (clamp 2.5–4rem), and a stat strip (LEVEL · ARM · SURFACE · SESSIONS). Self-fetching; missing
    tennis fields degrade to `—`.
  - **`LastFeedbackWidget.jsx`** (NEW): white card below Next Session — date + 120-char `body`
    excerpt + `View →` to `/feedback`; humanized dashed-border empty state. Self-fetching.
  - **`StudentDashboard.jsx`**: pure composition (PlayerCard → tagline → Next Session → LastFeedback);
    old local fetch/error/state removed.
  - **`db.js`**: `getStudentProfile(userId)` (merge `getProfile` + `getStudentByUserId`) and
    `getLastFeedback(studentId)`.
  - Lint + build clean. **Known gap:** no `sessions_count` column → SESSIONS chip shows `0` until a
    real source is wired.

- **Library folder system — Phase 8E COMPLETE (code-level, 2026-06-17):**
  - **`screens/Library.jsx`** (full rewrite): folder-first content library. State A = grid of the 8
    hard-coded technique folders (forest + court motif + emoji icon + Bebas label + `{n} videos` /
    `Coming soon` badge, `grid-cols-2 md:grid-cols-3`). State B = in-folder drill-down via local state
    (no reload): `← Library` back, Bebas header, reused video cards, per-folder "Coming soon" empty
    state. Conditional **More** folder catches off-list/null categories. Dropped the old FilterChip row.
  - **`screens/admin/Videos.jsx`**: add-form Category field upgraded free-text → `<select>` of the
    8 lowercase folder values + `— Uncategorized —`. Save logic unchanged (stores lowercase value or
    `null`). No edit mode on the page, so only the add form changed.
  - Lint + build clean. Not deployed (per request); folder counts stay empty until live data exists.

- **Session scheduling + reminder email — Phase 8F COMPLETE (code-level, 2026-06-17):**
  - **Admin:** `StudentDetail` gained a **SCHEDULE SESSION** section above the credits card — Date /
    Time (30-min increments 07:00–21:00) / Duration (60–90 chips) / Location / Notes → `createSession`,
    then awaits the reminder email and shows an honest toast (real send result, not a canned string).
    An **Upcoming** list (incl. cancelled, shown struck-through/dimmed) with per-row status badge +
    **Cancel** (soft `status='cancelled'`).
  - **Edge Function:** `send-session-reminder` (Deno + Resend, branded like the invite email; DATE/TIME
    pinned to `America/Vancouver`) — **DEPLOYED** to `vdyvlylacsghnvtllrzj`. Not yet verified by a real
    send.
  - **Student:** Home "Next Session" widget wired to real data via new `NextSessionWidget` +
    `getNextSession(studentId)` (next `scheduled`, future, soonest); keeps the "Coming soon" empty state.
  - **Schema:** migration `006_sessions.sql` (UNAPPLIED) — `sessions` table, `session_status` enum, RLS
    (student SELECT own, coach full CRUD). `db.js` gained `listUpcomingSessionsForStudent`,
    `createSession`, `cancelSession`, `getNextSession`. Blueprint synced.
  - Lint + build clean. **Not deployed (frontend); migration 006 unapplied** — scheduling won't persist
    until applied. **Known gap:** sessions booked for an unclaimed student (`user_id` NULL) don't link
    on claim (no backfill).

- **Coach Dashboard HQ — Phase 10 COMPLETE (code-level, 2026-06-17):**
  - **`screens/CoachDashboard.jsx`** (NEW, `/coach`): the coach's operational home, replacing the
    `ComingSoon "Coach Home"` placeholder. Header ("55TC · HQ" / "Headquarters") → **metrics row**
    (4 cards, 2×2 mobile → 4-across desktop: ACTIVE STUDENTS · SESSIONS THIS MONTH · FEEDBACKS THIS
    MONTH · PENDING FEEDBACK; PENDING flips forest/sand when >0) → **FEEDBACK DUE** (one row/student,
    WRITE FEEDBACK → composer; "all caught up" empty state) → **THIS WEEK** (Mon→Sun agenda; day·time +
    student·location, status badge, ADD FEEDBACK + CANCEL[scheduled, confirm+soft]) → **RECENT ACTIVITY**
    (last 5 feedbacks + 5 sessions merged by created_at, 📋/🎾, compact). Whole page = ONE parallel
    `Promise.all` (6 queries).
  - **`db.js` coach-dashboard section** (NEW): `countActiveStudents`, `countSessionsThisMonth`,
    `countFeedbacksThisMonth` (count-only `head:true` queries), `listSessionsThisWeek`,
    `listPendingFeedback`, `listRecentActivity` + `startOf*` helpers.
  - **`main.jsx`:** `/coach` → `CoachDashboard`. `ComingSoon.jsx` now unused (left in place).
  - **Interpretation:** "completed session" → finished = completed OR past-scheduled (no mark-completed
    action exists yet); drives PENDING FEEDBACK / FEEDBACK DUE (else always 0). See decisions + Known Issues.
  - Lint + build clean. **Not pushed/deployed**; reads empty until migrations applied + live data exists.

- **Student Profile page — Phase 8D COMPLETE (code-level, 2026-06-17):**
  - **`screens/Profile.jsx`** (full rewrite): read + edit modes. Read = avatar (photo or forest-
    circle/sand-initial) + Bebas name + two white cards, **YOUR DETAILS** (name · email · phone ·
    DOB `Jan 15, 1990` · gender) and **YOUR GAME** (level · hand · surface · fav-player value chips);
    empty fields → `—`. Edit = **EDIT PROFILE** button → labeled inputs + the onboarding solid-pill
    **chip selectors** (gender + 3 tennis fields), email disabled. Save → optimistic update + "Saved"
    banner; Cancel discards. **Avatar upload** in edit mode: `image/*` ≤ 5MB, instant local preview +
    "Uploading…" overlay, uploads to Storage immediately but commits `avatar_url` to `profiles` only
    on Save.
  - **`db.js`**: `updateStudentProfile({ userId, profilePatch, studentId, phone })` — writes the
    `profiles` identity fields, then `students.phone` separately (only if a roster row exists).
  - Lint + build clean. **Live persistence blocked on migration 004** (the `profiles` onboarding
    columns + `avatars` bucket) being applied — same unapplied-migration gate as 8B/8C.

## In Progress
- **3 feedbacks simulados NOVOS no Supabase de produção p/ teste do portal (2026-07-08, external — sem repo change).**
  Atados a `aleksei.nogueirasousa@gmail.com` (user_id `433a077e`, student `b80a7db6`, **1 student row** — confirmado
  por query), `source='video_analysis'`, marcador `notion_id='SIM-TEST-<data>'`. Progressão jun→jul 2026:
  `SIM-TEST-20260612` (5/6/4/5), `SIM-TEST-20260626` (6/7/6/7), `SIM-TEST-20260706` (8/8/7/8) — cada um com
  duration/rally, quality/effort/game/progress (labels PT), 3 focus_areas, focus_next, 2 next_session_goals,
  body voz-coach; `video_url`/`card_visual_url`/`coach_id` NULL. Mesma estrutura do `SIM-TEST-20260705` (deletado).
  Inserido via `supabase db query --linked` em 1 transação idempotente (delete-then-insert), verificado por SELECT.
  Ratings sobem → alimenta o **Compare sessions**. Ver via portal → login → aba Feedback. **Sem deploy.**
  **Cleanup pendente:** `delete from feedbacks where notion_id like 'SIM-TEST-%';`.
- ~~**Fase D ETAPA 3 (Comparação de treinos) APLICADA local, NÃO commitada**~~ **CONCLUÍDA (2026-07-08, `80c6c48`,
  deployada)** — ver "What Works". Commitada, deployada e aprovada pelo coach; feedbacks simulados `SIM-TEST-*`
  deletados de produção. O bloqueio "login do dev server" era só o túnel SSH do coach caído (não bug); contornado
  com túnel Cloudflare + preview HTML estático, tudo revertido antes do commit.
- **Teste simulado de feedback Fase E p/ validação de layout LOCAL (2026-07-08, external — Supabase):** diagnóstico
  read-only dos 5 pilares (todos 🟢: ambos workflows n8n ativos, portal HTTP 200, campos Fase E live em `feedbacks`,
  `Feedbacks.jsx` renderiza card rico) + **1 row de feedback simulado inserido** (`id ffb8e2d7-…`,
  `notion_id='SIM-TEST-20260705'`) atado a `aleksei.nogueirasousa@gmail.com` (student `b80a7db6`, user_id `433a077e`)
  com todos os campos Fase E (ratings 7/8/6/8, quality/effort/game/progress, 3 focus_areas, 2 next_session_goals,
  body voz-coach, `source=video_analysis`). Visualizar via `npm run dev` (localhost:5173) → login → aba Feedback.
  **Sem deploy.** **Cleanup pendente:** `delete from feedbacks where notion_id='SIM-TEST-20260705'` quando validado.
  Doc de planejamento novo (colado pelo coach, contexto stale) em `planning/fase-d-portal-feedbacks.md`.
- **Fase E2 ETAPA 3 DONE (2026-06-23, applied live in n8n, external):** fan-out multi-aluno no `T7kobxM1FZM99O8l`
  (agora **17 nós**) — uma aula em grupo gera **N páginas no Notion + N cards**. **Sem nó Split dedicado:**
  `Parsear Resposta Gemini` passou a **emitir N itens** (`perStudent.map`, `pairedItem:{item:0}`, cada item com seu
  `notionBodyJson` + `studentName=s.name`) → o n8n roda a cauda 1×/item. Refs `.first()`→`.item` nos nós por-aluno
  (Gerar HTML, Extrair HTML [agora `runOnceForEachItem`], Salvar URL no Notion); `$('Webhook')` fica `.first()`.
  Nó novo **`Resumir Aula` (n25)** agrega N→1 antes do Twilio. **Decisão do coach: Twilio = 1 resumo/aula**
  ("Feedback gerado para N aluno(s)…: nomes. Revise no Notion: <link do banco>"); **Webhook Response** retorna
  `{success, students:N, notion_page_ids:[...]}` (reconverge → responde 1×). CLI export→transform(unique-or-throw +
  idempotência)→import→reactivate→`pm2 restart`; re-export confirma active/17 nós/Resumir Aula/fan-out/creds
  intactas; `vm.Script` OK. **Teste offline do fan-out (2 alunos, ordem trocada) PASSA.** Sem deploy. Restore (600):
  `/root/etapa8-work/wf-pre-e3.json`. **E2e real de aula em grupo NÃO rodado** (precisa de `file_id` Drive + Gemini
  billable; valida o `.item` pairing sob fan-out real + resumo Twilio N>1) — fica com o coach. **Fase E2 completa
  (Etapas 1–3) salvo esse e2e real.**
- **Fase E2 ETAPA 2 DONE (2026-06-23, applied live in n8n, external):** reescrevi o **prompt do Gemini**
  (`Preparar Análise`) e o **parsing** (`Parsear Resposta Gemini`) do `T7kobxM1FZM99O8l` para multi-aluno +
  profundidade técnica (skill `aleksei-tennis-method`, colada pelo coach — não está no servidor). **Schema
  inalterado.** Prompt monta um roster (`students` + `visual_cue`), instrui voz Professor Aleksei / foco externo
  / ancorado / diagnóstico / cascata de erro, e pede **array de N objetos** (1/aluno, ordem do payload, `student_id`
  ecoado); `maxOutputTokens 2048→8192`. Parsing normaliza o array, **casa por `student_id`→nome→índice**, fallback
  honesto por aluno sem throw, `buildNotionBody` extraído. **Emissão = 1 item (`students[0]`, tail intacto) +
  `analisesMulti` (array completo) para a Etapa 3** (decisão do coach: sem fan-out agora). CLI export→transform
  (assert unique-or-throw + guarda idempotência + `vm.Script`)→import→reactivate→`pm2 restart`; re-export confirma
  active/16 nós/só 2 nós mudaram/connections+creds idênticas/8192 presente/2048 sumiu. **Teste unitário offline do
  parsing (3 casos: grupo ordem-trocada, objeto-único, JSON inválido) PASSA.** Sem deploy. Restore (600):
  `/root/etapa7-work/wf-pre-e2-etapa2.json`. **Não rodado e2e real** (precisa de `file_id` Drive + chamada billable
  ao Gemini). Next: **Etapa 3** (Split/fan-out N páginas + tail por-aluno; consome `analisesMulti`; pendência:
  Twilio 1 msg/aluno vs 1 resumo/aula) — precisa de aprovação do plano.
- **Fase E2 ETAPA 1 DONE (2026-06-23, applied live in n8n, external):** começou a **Fase E2 — Análise
  Multi-Aluno + Prompt Técnico** (plano em `planning/fase-e2-multialuno-prompt-tecnico.md`). Etapa 1 =
  contrato novo do payload do webhook do `T7kobxM1FZM99O8l`: `{ file_id, session_date, students:[{ student_id,
  name, visual_cue }] }` (formato único; aula individual = array de 1; sem fallback ao flat antigo, por decisão
  do coach). **3 Code nodes** reapontados das leituras por-aluno (`body.student_name`/`body.student_id`) p/
  `body.students[0]` — Preparar Análise, Parsear Resposta Gemini, Extrair HTML — preservando o comportamento
  single-student. **NENHUM split / nó novo / mudança de grafo** (split é Etapa 3, depois do parsing; Gemini é
  1 chamada única p/ o vídeo compartilhado). Aplicado via CLI export→transform(assert unique-or-throw)→import→
  reactivate→pm2 restart; re-export confirma active/16 nós/connections idênticas/creds intactas/0 leituras flat.
  `visual_cue` aceito mas ainda não consumido (insumo do prompt — Etapa 2). Restore (sem segredos, 600):
  `/root/etapa6-work/wf-pre-e2-etapa1-restore.json`. **Não rodado e2e real** (precisa de `file_id` Drive real;
  fica junto da Etapa 2/3 ou do coach). Next: **Etapa 2** (novo prompt Gemini multi-aluno + foco externo;
  parsing → array de N) — precisa de aprovação do plano.
- **Fase-E ETAPA 4 DONE (2026-06-23, applied live, external):** the crashed session had already built the
  n8n workflow `55TC - Publicar Feedback` (`yk7iENBUAGMj3M6a`, creds attached) + migration 010 + the
  `send-feedback-email` function, but left them all non-live. This session finished it: **applied migration
  010** (`db push`), **deployed the function** (guard 401-verified), **confirmed 0 Publicado+unsynced Notion
  pages** (read-only, transient legacy token), **activated** the workflow (MCP `publish_workflow`, no pm2
  restart), and **validated** with a live manual run (exec 23, success, empty-result path, no side-effects).
  Real-data e2e (publish a real feedback → upsert + student email) left to the coach, same as ETAPA 1–3.
  Caveat: unclaimed student (user_id NULL) → IF false-branch → page stays unsynced and re-polls every 5 min
  (no side-effect) until claim (by design — `feedbacks.user_id` is NOT NULL). Restore: `/root/etapa4-work/
  wf-publicar-orig.json`. Next: real e2e + legacy-node hardening ("Etapa 5") + optional `text/html`
  content-type fix on the ETAPA-3 card.
- Nothing actively mid-build. Admin roster + student portal + Phase 6/7/8/8B/8C/8D/8E/8F + the Phase 10
  Coach Dashboard HQ are all complete at the code level; all await **applied migrations + live data** to
  smoke-test.
- **Fase-E ETAPA 3 DONE (2026-06-22, applied live in n8n, external):** workflow `T7kobxM1FZM99O8l` now
  **16 nodes** — the empty `[Futuro] WhatsApp + Card Visual` noOp replaced by a 5-node card+notify tail wired to
  **n8n stored credentials by ID (no hardcoded tokens in the new nodes)**: *Gerar HTML do Card* (Claude
  `claude-sonnet-4-6`), *Extrair HTML*, *Upload HTML para Storage* (Supabase, `feedback-cards/{page_id}.html`),
  *Salvar URL no Notion* (`card_visual_url`), *Notificar Coach (Twilio)* (**ACTIVE, text-only**, link → Notion
  page). Webhook Response now reads the page id from `Criar Entrada no Notion`. **PNG deferred** (no screenshot
  service) → `card_visual_url` points to `.html`. **Node C uses httpCustomAuth** ("Supabase Service"
  `0toUlVDwrVTZ8BXi`) injecting `apikey`+`Authorization` — Authorization-only fails (the `sb_secret_` key is not
  a JWT → 400 "Invalid Compact JWS"); the older httpHeaderAuth "Supabase Storage" `NdKxgh5ULJUP8hmy` is orphan.
  Storage leg curl-validated (200). All 4 creds created via n8n CLI `import:credentials` (the UI-made ones never
  persisted in this instance); **token values NOT recorded — names/IDs only**. **Not run end-to-end** (needs a
  real Drive `file_id` POST; Twilio To must `join` the sandbox). Restore: `/root/etapa3-work/wf-pre-etapa3{,b}.json`.
  Next: real e2e + hardening the OLD hardcoded nodes (Gemini/Notion = "Etapa 5"); orphan "Supabase Storage" cred
  can be deleted; ETAPA 4 can reuse "Supabase Service".
- **Fase-E ETAPA 3 TAIL TESTADO end-to-end (sintético) + 2 bugfixes em produção (2026-06-23, external):**
  rodei o teste sintético do trecho final do `T7kobxM1FZM99O8l` com **side-effects reais** (rascunho real no
  Notion + WhatsApp real, **confirmado recebido**) **sem o pipeline Drive→Gemini** — via um workflow temporário
  descartável (6 nós do tail verbatim com creds por ID + Manual Trigger + 2 Code sintéticos nomeados `Webhook`/
  `Parsear Resposta Gemini`), executado por MCP `execute_workflow(manual)` (exec `22`, success). Todos os nós
  OK: Notion page `3889a701…2741`, Claude HTML, Supabase upload 200, `card_visual_url`, Twilio SID `SMb8ea7668…`
  (`queued`, sem erro). **Bug achado:** Claude batia `max_tokens:4096` → card HTML truncado, e o `Extrair HTML`
  aceitava. **Corrigido em produção:** `max_tokens 4096→8000` + `Extrair HTML` agora exige `</html>` (senão
  fallback). Verificado: active/16 nós/fixes presentes/creds intactas. Limpeza: Notion test page trashed, temp
  workflow `TESTTAILFASEE01` archived (leftover: `.html` de teste no bucket, inócuo). Next: teste com vídeo real
  + ETAPA 4 + hardening dos nós legados hardcodados.
- **Fase-E Notion DB corrected + schema applied to the RIGHT db (2026-06-22, external):** the n8n
  integration "Conexão n8n" only reaches DBs `3539a701-723c-*` ("Teste n8n - Feedback aluno" +
  "Alunos"); the "Feedbacks" `…1291bc` extended on 2026-06-18 is in another workspace and **404s** for
  n8n — so the 2026-06-18 fields landed on the **wrong** DB. Re-applied the 10 Fase-E fields (now 22
  props) + the `Qualidade Técnica` dedup ("Assimilação técnica"→"Em Desenvolvimento") to the **correct**
  data source `collection://3539a701-723c-8055-b621-000b41a0fdbc` (REST `database_id`
  `3539a701-723c-80d4-9bf0-fa3166bea0f9`, verified writable). Restored the 1 affected page (Kathely
  05/05). Workflow `database_id` was already correct — discard the planned `3529…` change.
- **Fase-E ETAPA 2 DONE (2026-06-22, applied live in n8n, external):** workflow `T7kobxM1FZM99O8l`
  rebuilt scan-GET → direct-POST. Removed 6 scan nodes (18→12); **Webhook** GET→POST (path
  `analisar-treinos`, body `{file_id, student_name, student_id, session_date}`); **Download** file id
  from `body.file_id`; **Upload** Content-Type static `video/mp4`; **Preparar/Parsear** read the body,
  `qualidade_tecnica` option → "Em Desenvolvimento" (+ guard); **notionBody** keeps `database_id 3539…80d4`
  / title `Nome` and adds `Status=Rascunho`, `student_id`, `rating_*`, `objetivos_proxima_aula` (numbered
  text); **Webhook Response** returns `{success, notion_page_id}`. CLI export→edit→import, re-activated,
  pm2 restart; verified active/12 nodes/POST/creds. **Not run end-to-end yet** (coach to POST a real
  `file_id`). Restore: `/root/etapa1-work/wf-pre-etapa2-restore.json`. Next: ETAPA 3 (Card Visual) +
  credential hardening. (Discard the old "fix `database_id` → `3529…`" note below — `3539…80d4` is correct.)
- **Fase-E ETAPA 1 DONE (2026-06-22, applied live in n8n, external):** workflow `T7kobxM1FZM99O8l`
  ("55TC - Análise de Treino"). **Preparar Análise** prompt + **Parsear Resposta Gemini** now produce
  `rating_tecnica/intensidade/posicao/progresso` (0–10, clamped) and `objetivos_proxima_aula`
  (`[{titulo, descricao}]`). Applied via local **n8n CLI export→edit-2-strings→import** (not MCP SDK
  overwrite — see decisions/activeContext). 18 nodes + connections + Drive creds verified unchanged;
  re-activated after the CLI import deactivated it. `notionBody` left for ETAPA 2. **Not run end-to-end
  yet.** Next: ETAPA 2 (POST trigger + Notion write of new fields + fix `database_id` `3539…`→`3529…1291bc`).
- **Planning docs captured (2026-06-18, docs-only):** `memory-bank/planning/` now holds
  `roadmap-portal.md`, `fase-e-workflow.md`, `loops-agente.md` + a `CLAUDE.md` pointer. These are the
  forward roadmap; **the next un-built work item from them is Phase 8G** (Gallery grouped by training
  session + `student_gallery.session_id`/`clip_type` columns + coach video upload), followed by the
  Fase-E n8n workflow rebuild and the agent loops. Nothing implemented yet — reference only.
- **Notion `Feedbacks` schema extended for Fase-E (2026-06-18, external + docs-only).** The 10
  pre-requisite fields from `fase-e-workflow.md` are now **applied** to the Notion `Feedbacks` data
  source (`collection://3529a701-723c-80da-8250-000b4b1291bc`, now 23 properties) via the Notion MCP:
  4 `rating_*` numbers, `student_id`, `Status` (select), `synced_to_portal` (checkbox), `card_visual_url`
  (url), `objetivos_proxima_aula` (rich_text), plus a 10th `Aluno` (rich_text). This **unblocks the
  Fase-E n8n workflow rebuild** (ETAPA 1→4). Live schema + caveats recorded in `fase-e-workflow.md`.
  Pending manual housekeeping: delete the 2 empty stray data sources in the Notion UI (MCP `in_trash`
  is a no-op for them). Next: ETAPA 1 (Gemini prompt numeric fields) in workflow `T7kobxM1FZM99O8l`.
- **WhatsApp platform decided (2026-06-18, docs-only): Twilio, not Evolution API.** After a read-only
  audit of `~/agente_cortes` (its WhatsApp layer uses Twilio + n8n HTTP node, fully built/tested), the
  TennisOS notification loops will reuse the **n8n → HTTP node → Twilio API** pattern and replicate
  `whatsapp_client.py` (not import it). Recorded in `fase-e-workflow.md` + decisions log. Evolution API
  deferred to a future option. No code yet.

## Recently Fixed
- **Student "NEXT SESSION" stuck on "Coming Soon" — email-case link failure (2026-06-18, `0140393`,
  DEPLOYED + data-repaired live):** a scheduled session never surfaced in the student's Home widget.
  Root cause: `handle_new_user()` linked the roster row by **case-sensitive** email (`email =
  new.email`), but Supabase Auth lowercases emails while the coach entered the student in UPPERCASE →
  the link UPDATE hit 0 rows, so `students.user_id` stayed NULL (account never claim-linked) and the
  session (its `user_id` copied from that NULL) was RLS-invisible. **Fix:** (Fase 1) live data repair —
  relinked the student row + backfilled the session's `user_id`. (Fase 2+3) migration `008_email_
  normalize.sql` (idempotent, applied) — `handle_new_user()` + `get_invite_student()` match via
  `lower(email)`, backfilled roster emails to lowercase, and **rewrote `sessions_select` RLS to resolve
  via a `students` join** (`student_id in (select id from students where user_id = auth.uid())`) so a
  session is visible once the roster row links, independent of `sessions.user_id`. `StudentForm` stores
  email lowercased. Lint + build clean; pushed + deployed (`dpl_EZpLEYjKSLfMVFLFQEr74b7dLBu9` READY).
- **PlayerCard mobile v2-polish — spacing + casing + grid harmony (2026-06-17, committed, NOT
  deployed):** (1) surname `mt-1`→`mt-1.5` so the label→surname gap visually matches surname→given
  (equal code margins rendered unequal because the surname's `leading-[0.9]` eats the top margin);
  (2) `lib/name.js` now title-cases the given-names portion (`toTitleCase`) so "ALEKSEI NOGUEIRA" →
  "Aleksei Nogueira" — the all-caps was from stored `full_name`, not CSS; surname stays raw (Bebas =
  caps). Also title-cases Profile's mobile given line (consistent, no desktop impact). (3) Stat grid
  now `text-center` with `gap-x-2`, label `tracking-[0.15em]`, value `text-[13px]` so the four equal
  columns read evenly spaced left→right. Lint + build clean. **Prod still serves `242343c` until
  deployed.**
- **PlayerCard mobile layout v2-correction — label-row/value-row stat sheet + centered photo
  (2026-06-17, DEPLOYED `242343c`):** corrected the v2 stat layout per a second sketch. The
  stat sheet is now a **4-col / 2-row grid** — row 1 = all four labels (LEVEL · ARM · SURFACE ·
  SESSIONS), row 2 = all four values directly beneath, even columns across the full card width (mapped
  `stats` twice into a row-major `grid-cols-4`; the v2 `<Stat>` helper removed as unused). Also the
  photo + text block are now **vertically center-aligned** (`items-center`) with given names moved back
  inside the text column (dropped the `pl-24` indent), so the avatar midpoint lines up with the whole
  text block's midpoint. Lint + build clean. **Prod still serves the v2 2×2 grid (`1a2acbc`) until this
  is deployed.**
- **PlayerCard mobile layout v2 — surname emphasis + two-block split (2026-06-17, `1a2acbc`, DEPLOYED):**
  second mobile-only refinement of the home hero, desktop kept pixel-identical. PlayerCard now renders
  two sibling blocks (`sm:hidden` mobile / `hidden sm:flex` desktop = verbatim approved layout). Mobile:
  80px avatar, surname-first name (Bebas dominant, given names lighter below). Helper
  `formatNameAmericanStyle` extracted to `src/lib/name.js` and reused by both PlayerCard and Profile.
  Shipped a 2×2 stat grid (since corrected — see above). Lint + build clean.
- **Mobile layout — PlayerCard + Profile side-by-side + American name format (2026-06-17, DEPLOYED):**
  mobile-only UI pass, desktop kept pixel-identical (every desktop value behind an `sm:` class).
  PlayerCard home hero now avatar-left/name-right on mobile (64px avatar, 32px name, stat chips in a
  clean 2-col grid). Profile: removed the "Your details on file with the crew." subtitle (all
  breakpoints); EDIT PROFILE gated to desktop top + a new mobile-only full-width button at page
  bottom; ReadView header side-by-side on mobile (64px `Avatar`, stacked/centered preserved on
  desktop); mobile-only surname-first name "LASTNAME, First Middle" via new
  `formatNameAmericanStyle(fullName)` helper (Profile page only — PlayerCard still shows first name).
  Lint + build clean; committed, pushed, deployed via `deploy-prod`.
- **Phase 8C→10 stack DEPLOYED & verified live (2026-06-17, `5ab6924`):** first production deploy of
  player card + home widgets, student profile, library folders, session scheduling + reminder email,
  and the coach dashboard HQ — plus the `ff00912` profiles fix — all previously committed-only.
  Pushed to `origin/master`, fired the Vercel deploy hook via `deploy-prod`, and confirmed production
  serves `5ab6924` (deployment `dpl_DsUQdKdF9pFSWdWx8dTZhz3j5x9A`, READY, target production). Gated
  on the coach confirming migration `006_sessions` is applied. Migrations `004`/`005` still to be
  confirmed (affect Profile edit/avatar + `/claim`, not the just-shipped dashboard pages).
- **Post-8C–10 audit fix — `LastFeedbackWidget` blank date (2026-06-17, `fix: post-8c-10 audit
  fixes`):** the home "Last Session Feedback" card's `formatDate` assumed a date-only string and
  built `` `${value}T00:00:00` ``. When a feedback's `lesson_date` is null it falls back to the
  full-timestamp `created_at`, which made an invalid date → the date silently rendered blank. Now
  parses directly when the value already contains `T`, else pins date-only to local midnight. Found
  during the full phase-8C→10 audit (the only code bug; all other axes — empty/null handling, RLS,
  awaits, Edge-fn error handling, 375px, db.js columns — passed). Lint + build clean.
- **Missing-`profiles`-row PGRST116 bug — fix committed, NOT deployed (2026-06-17, `ff00912`):**
  the "JSON object requested, multiple (or no) rows returned" error came from a signed-up student
  with no `profiles` row. (1) `getProfile` `.single()`→`.maybeSingle()` (missing row → `null`;
  `AuthProvider` already null-safe). (2) New `upsertProfile` helper; `ClaimPage` step 1 now upserts
  `{ id, email, full_name, role:'student' }` (idempotent with the trigger) instead of a swallowed
  `full_name`-only UPDATE that hit 0 rows — the real silent failure. (3) Step 1 gated on
  `data.session` (clear error if email-confirm is ON). (4) Migration `005` adds a `profiles`
  self-insert RLS policy (`id = auth.uid()` AND `role = 'student'`) so the upsert passes RLS. Lint
  clean. **Not live until migration 005 is applied + the frontend is redeployed.** The four student
  screens were already null-safe (use `getStudentByUserId`/`maybeSingle`), so no screen edits.
- **Invite-email send wired + deployed (2026-06-17, `ff812a4`→`6fc0727`):** the `send-invite-email`
  Edge Function existed but was never being invoked. (1) `StudentForm` now POSTs to the function via
  explicit `fetch` (anon-key auth) on student create, logging failures instead of swallowing them —
  it replaced an existing `supabase.functions.invoke` call (a call already existed; the likely real
  cause of "never invoked" was a stale prod bundle, now redeployed). (2) Added `supabase/config.toml`
  pinning `verify_jwt = true`. (3) Swapped the broken inline-SVG email header logo for a hosted PNG
  `<img>`. Frontend on Vercel + Edge Function both deployed; `RESEND_API_KEY` confirmed set; PNG
  asset returns HTTP 200. **End-to-end delivery not yet confirmed by a real send.**
- **Deploy guardrails (2026-06-14, `bcff6e0`) — tooling, not app code:** codified the prod deploy
  flow as a **`deploy-prod` skill** (commit → push → deploy hook → verify) and **enforce** it with a
  `PreToolUse(Bash)` hook (`.claude/hooks/guard-deploy.sh` + `.claude/settings.json`) that blocks the
  Vercel deploy-hook curl unless local `HEAD` is on `origin/master`. Plus a `CLAUDE.md` Hard Rule. All
  committed (team-wide). Tested allow/block paths. **Activation caveat:** the hook only fires after the
  new `.claude/settings.json` is reloaded — open `/hooks` once or restart Claude Code.
- **Nav fade/spacing fix (2026-06-14, `dcc621a`) — Layout.jsx only:** desktop drops the scroll-fade
  mask (`md:[mask-image:none]`, kept below `md`); mobile items tightened ~30% (`gap-2`→`gap-1.5`,
  link `px-3`→`px-2`) so a third item shows as a horizontal-scroll cue. Font size + active indicator
  unchanged. Lint clean; pushed + deployed via the hook.
- **Header UX polish (2026-06-13, `55099d9`) — Layout.jsx only:** (1) the always-visible
  email + "Sign out" button became a **☰ account menu** — a right-side button opening a dropdown
  with email + `COACH`/`STUDENT` badge + Sign out, closing on outside click; (2) a **right-edge
  mask gradient** on the nav scroll viewport fades the rightmost item into forest as a horizontal-
  scroll hint. Tailwind-only, lint clean, deployed via the hook.
- **Mobile nav horizontal-scroll bug — LIVE & confirmed (2026-06-13):** header nav no longer
  scrolls the whole page sideways. Final form (`53208a8`): `<nav>` is the scroll viewport
  (`min-w-0 touch-pan-x overflow-x-auto` + `.nav-scroll` hides bar / iOS momentum), inner
  `<ul class="flex w-max">` track with `shrink-0 <li>` items, root `w-full max-w-full
  overflow-x-hidden`, and `body { overflow-x: hidden }`. Coach verified on the deployed site.
- **Vercel deploy unblocked (2026-06-13):** git push-to-deploy stalled (builds stuck `UNKNOWN`,
  never built). Coach created a **Vercel deploy hook + manual deploy** — production now ships
  reliably via that path.

## Not Started
- Applying the Supabase migrations (now `001..006`) to a real project + seeding the coach account.
- Disabling email confirmation in Supabase Auth (the `/claim` signUp flow needs the session for
  steps 2-4). [`RESEND_API_KEY` secret + `send-invite-email` deploy — DONE 2026-06-17.]
- `.env` wiring + live smoke test of login/claim/reset + admin roster + the Phase 6 loop +
  the 8B invite→claim→onboarding loop.
- Coach screens still unbuilt: Packages (deferred to Stripe — no V1 UI).
- Package-purchase credit grants (writes `lesson_credits` with a `package_id`) — deferred to Stripe.
- Real gallery **upload**: `gallery` Storage bucket + storage RLS + upload UI (replaces the
  manual external_url paste). n8n/Stripe seams.

## Known Issues
- **Acesso ao dev server = túnel SSH do coach (não é bug de código)** (esclarecido 2026-07-08). O que parecia
  "login do dev server não responde"/"tela branca"/"connection refused" era o **túnel SSH do coach caído** — o dev
  server roda num droplet remoto (`67.205.171.204`), e o coach acessa por `ssh -N -L 5174:localhost:5174 -L
  5175:localhost:5175 root@67.205.171.204` (cai quando a sessão SSH fecha). O backend de auth do Supabase está 100%
  OK (health 200, `.env` válido). **IP público bloqueado pelo firewall de nuvem da DigitalOcean** (não editável da
  box; ufw/iptables locais estão abertos). **Contorno provado p/ previews sem depender do túnel:** `cloudflared
  tunnel --url http://localhost:<porta>` (quick tunnel, sem conta) → exige liberar o host em `server.allowedHosts`
  do Vite; ou HTML estático em `public/*.html`. Binário: `cloudflared` foi baixado no scratchpad da sessão.
- ~~**`public/preview-feedback.html` deve ser removido antes do deploy**~~ **RESOLVIDO (2026-07-08)** — os previews
  dev-only (`preview-feedback.html`, `preview-compare.html`) são gitignored (nunca foram pro repo/prod) e foram
  apagados do disco no deploy da Etapa 3. A foto-fonte `public/coach-aleksei.jpg` segue gitignored (prod usa o
  Supabase Storage `assets/coach/aleksei.jpg`).
- **`getStudentByUserId` quebra p/ user_id com >1 linha em `students`** (achado 2026-07-08). Usa `.maybeSingle()`
  com `.eq('user_id', …)`; o user_id `0880be5f` (`alekseinogueira.dash@gmail.com`) tem **3 linhas de student** →
  a página `/feedback` (e todo consumidor de `getStudentByUserId`, incl. Home) dispara PGRST116 "multiple rows"
  p/ esse account. O perfil de teste seguro é `aleksei.nogueirasousa@gmail.com` (user_id `433a077e`, 1 linha).
  Fix futuro: dedup das linhas de student desse user_id, ou trocar `.maybeSingle()`→`.limit(1)`/ordem determinística.
- **Tabela `feedbacks` (Supabase) não tem `status`/`synced_to_portal`** (esclarecido 2026-07-08). Esses 2 campos
  são **só do Notion** (gate do workflow "Publicar Feedback" `yk7iENBUAGMj3M6a`). No portal, visibilidade ao aluno =
  linha existir com `user_id` correto (RLS own-row) — não há flag "publicado" na feedbacks. Não é bug; é design.
- **Fase E2 fan-out depende do paired-item (`.item`) do n8n — e2e de grupo não validado** (ETAPA 3, 2026-06-23).
  Sob fan-out (N alunos), `Gerar HTML`/`Extrair HTML`/`Salvar URL` usam `$('...').item` p/ pegar o aluno corrente;
  se o pairing resolver errado, cards/páginas saem com dados trocados (mismatch silencioso). A camada de dados foi
  validada offline (2 alunos, ordem trocada → matching certo) e `.item` é o idioma padrão do n8n, mas o **e2e real
  de aula em grupo** (POST com `file_id` Drive real, chamada billable ao Gemini) ainda não rodou — fica com o coach
  (ou um run sintético de 2 itens no futuro). Confirmar que cada card/página tem o nome certo + o resumo Twilio
  lista N alunos antes de confiar no grupo em produção. (Aula individual = N=1 → comporta como antes, só o texto do
  Twilio virou resumo "1 aluno(s)".)
- **Fase-E card HTML served as `content-type: text/plain`** (ETAPA 3, found 2026-06-23) — the Supabase Storage
  object at `feedback-cards/{page_id}.html` comes back `text/plain`, so a browser may download it instead of
  rendering. Low priority (PNG render is deferred; the `.html` is a placeholder). Fix later by forcing the
  upload's stored content-type to `text/html` (or re-introduce the PNG render step). The truncation bug
  (Claude `max_tokens`) found in the same test was already fixed (4096→8000 + `</html>` fallback guard).
- **Coach Dashboard "PENDING FEEDBACK"/"FEEDBACK DUE" uses a past-scheduled heuristic** (Phase 10) —
  the spec says "completed session", but no UI marks a session `completed` (scheduling creates
  `scheduled`; only Cancel mutates it). So `listPendingFeedback` treats a session as finished when
  `status='completed'` OR it's a past `scheduled` session (cancelled excluded). Once a real "mark
  completed" action exists, revisit whether to tighten this back to `status='completed'` only. Also:
  `ComingSoon.jsx` is now orphaned (no importer) but kept in the tree.
- ~~**Sessions booked for an unclaimed student don't link on claim** (Phase 8F)~~ **RESOLVED
  (2026-06-18, `0140393`).** `sessions_select` RLS now resolves visibility via a `students` join
  (`student_id in (select id from students where user_id = auth.uid())`) instead of the denormalized
  `sessions.user_id`, so a session booked before claim becomes visible the moment the roster row is
  linked — no backfill trigger needed. (The denormalized `sessions.user_id` column is kept but is no
  longer relied on for student reads.) Note the original observed failure was compounded by the
  email-case link bug fixed in the same commit (see Recently Fixed).
- **Phase 8F frontend now LIVE (`5ab6924`, 2026-06-17); migration 006 confirmed applied** by the coach.
  Scheduling should now persist. Still unverified by a real end-to-end run (schedule a session →
  confirm it persists, surfaces in the student's Next Session widget, and the `send-session-reminder`
  email actually arrives — the Edge Function is deployed but never verified by a real send).
- **Profile avatar uploads to Storage before Save commits it** (Phase 8D) — the chosen "upload
  immediately, commit `avatar_url` on Save" flow means picking a new photo overwrites the Storage
  object at the fixed path `avatars/{user_id}/avatar.{ext}` right away; if the user then **Cancels**,
  the DB pointer is untouched (read view keeps the old URL) but the Storage bytes at that path may
  already be replaced (only matters when the new file shares the old extension; a different ext writes
  a new path and the old object is orphaned). Accepted tradeoff for an instant preview; no cache-bust
  query on the public URL, so a same-path replacement can show stale until a hard refresh.
- **Home SESSIONS chip is hardcoded `0`** (Phase 8C) — `PlayerCard` reads `student.sessions_count`,
  but no such column exists on `students`/`profiles`, so the `?? 0` fallback always wins. Wire a real
  source (add a column, or derive a count from `feedbacks`/lesson rows) to make it meaningful.
- **Profiles-row fix `ff00912` frontend now LIVE (`5ab6924`, 2026-06-17)** — the `getProfile`
  `.maybeSingle()` + claim `upsertProfile` resilience is in production. **Still gated on migration
  `005_profiles_self_insert.sql`** being applied (the `/claim` upsert is RLS-blocked without it) —
  the user confirmed `006` but not `005`. Confirm `005` is applied before relying on the claim flow.
- **Vercel git push-to-deploy is unreliable** — git-triggered (and CLI) builds sat in `UNKNOWN`
  / never built for this project. Working path is the **deploy hook + manual deploy**. Repair the
  git auto-build integration before relying on push-to-deploy.
- **Vercel Preview env vars not set** (`VITE_SUPABASE_URL`/`ANON_KEY`) — CLI 54.7.1 bug; Preview
  deploys lack Supabase config until backfilled (upgrade CLI, then `vercel env add … preview`).
- Migrations written (`supabase/migrations/001..003`) but **not applied** — auth + admin +
  Phase 6 data are non-functional until a Supabase project exists and `.env` is set.
- `InvitePanel` generates a claim URL only; no session-bearing magic-link email yet (needs the
  service-role invite Edge Function). A raw `/claim?email=` link won't create a session alone.
- Feedback can't be written for an **unclaimed** student (`feedbacks.user_id` NOT NULL); the
  composer blocks it and prompts to send the invite first.
- Gallery clips are **URL paste only** (no upload yet); non-YouTube links (e.g. Drive) can't
  embed inline and render as a "Watch ↗" link in the student view.
