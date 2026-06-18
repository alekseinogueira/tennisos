# Active Context

> What's happening *right now*. Updated at the end of every session via `/umb`.
> Read this first at the start of every task.

## Current Focus
**WhatsApp platform decision — Twilio over Evolution API (2026-06-18, docs-only).** Read-only
audit of a separate server project, `~/agente_cortes` (a Python/FastAPI video-clipping pipeline
operated over WhatsApp), to evaluate reusing its messaging layer for the TennisOS feedback
notifications planned in `fase-e-workflow.md` / `loops-agente.md`. Findings: it uses **Twilio**
(WhatsApp Sandbox) — NOT Evolution API as the TennisOS plans had assumed. It has a clean outbound
module (`src/whatsapp_client.py`: `send_message`/`send_media`/`send_preview`/`send_status_update`
via the Twilio SDK), an inbound `POST /webhook/whatsapp` + regex `command_parser.py`, and a
documented **n8n → HTTP node → Twilio API** pattern (`docs/n8n_setup.md`, 3 workflows: receive,
error-alert, stuck-job monitor; ngrok tunnel). **Decision recorded:** use Twilio (already built,
tested, n8n-integrated) for TennisOS WhatsApp; the n8n→HTTP→Twilio pattern is directly transferable;
**replicate** the `whatsapp_client.py` pattern in n8n / an Edge Function — do NOT import the file
(it's tied to that FastAPI app). Evolution API stays a future option if volume justifies migration.
Captured as a "WhatsApp — Decisão de Plataforma" note in `memory-bank/planning/fase-e-workflow.md`.
Caveats noted: Twilio Sandbox is dev-only (recipients must `join`; production needs an approved
sender), media sends need a public URL (Supabase Storage card image works). No app code touched.

**Planning docs added to the memory bank (2026-06-18, docs-only — committed, NOT pushed/deployed).**
Created `memory-bank/planning/` with three reference documents pasted by the coach: (1)
**`roadmap-portal.md`** — the full portal build plan, phases 8C→10 (Player Card/Home, Profile,
Library folders, session scheduling + reminder email, Gallery-by-session upload, Coach Dashboard HQ),
with the SQL, per-step prompts, and recommended order. NOTE: phases 8C/8D/8E/8F/10 are already built
at the code level (see below) — **8G (Gallery by session + `clip_type`/`session_id` + video upload)
is the one roadmap phase NOT yet built.** (2) **`fase-e-workflow.md`** — the n8n "Análise de Treino"
feedback workflow plan (workflow `T7kobxM1FZM99O8l`): switch trigger GET→POST, add numeric ratings to
the Gemini prompt, auto-generate a visual card, and a 2nd workflow `55TC - Publicar Feedback` syncing
Notion→Supabase `feedbacks` + Resend email on coach approval. (3) **`loops-agente.md`** — the
self-prompted agent-loop roadmap (onboarding, post-lesson feedback nudge, video analysis, retention,
IG content). Also added a **"Planning Documents"** block to `CLAUDE.md` (after the Memory section)
pointing future phases at these files. No app code touched; lint/build not run (docs only).

**Bug fix — student "NEXT SESSION" stuck on "Coming Soon" (email-case link failure) — DEPLOYED &
DATA-REPAIRED LIVE (2026-06-18, `0140393`).** A scheduled session (reminder email sent fine) never
surfaced in the student's Home widget. Root-caused live via `supabase db query --linked`: NOT a
`student_id` mismatch — the `student_id` was consistent everywhere. The real fault was on `user_id`.
`handle_new_user()` links the roster row to the auth account with a **case-sensitive** email match
(`where email = new.email`); Supabase Auth stores emails **lowercased**, but the coach had entered the
student in **UPPERCASE** (`ALEKSEI.NOGUEIRASOUSA@GMAIL.COM`), so the link UPDATE matched 0 rows →
`students.user_id` stayed NULL, status stayed `invited`, the account was never claimed-linked. Two
null-link layers both traced to this: (1) `NextSessionWidget` calls `getStudentByUserId(uid)` →
returned `null` (no linked roster row) so `getNextSession` was never even called; (2) even past that,
the session row's `user_id` was also NULL (copied from `students.user_id` at insert time in
`createSession`), and the old `sessions_select` RLS keyed on `user_id = auth.uid()`, so the row was
invisible regardless. Date/status filters were fine (scheduled, future).
- **Fase 1 — live data repair** (via `supabase db query --linked`): relinked the student row
  (`user_id` ← the auth id `433a077e…`, status → `active`) and backfilled the orphaned session's
  `user_id`. Verified both consistent. Widget lights up on the student's refresh.
- **Fase 2+3 — `008_email_normalize.sql` (idempotent, APPLIED live via `db push`):**
  `handle_new_user()` + `get_invite_student()` now match via `lower(email)`; backfilled existing
  roster emails to lowercase (0 uppercase rows remain); **`sessions_select` RLS rewritten to resolve
  visibility via a `students` join** — `is_coach() OR student_id in (select id from students where
  user_id = auth.uid())` — so a session becomes visible the moment the roster row is linked, no longer
  depending on the denormalized `sessions.user_id`. `StudentForm.jsx` now stores `email` trimmed +
  **lowercased**. Lint + build clean.
- **DEPLOYED & VERIFIED LIVE (`0140393`, 2026-06-18):** committed (also tracked the previously-loose
  `007_sessions_align.sql` + the `sessions`-columns diagnostic), pushed `origin/master`, fired the
  Vercel hook via `deploy-prod`; production deployment `dpl_EZpLEYjKSLfMVFLFQEr74b7dLBu9` is READY on
  `0140393`. The DB/RLS half was already live (migration applied directly). **This resolves the prior
  Known Issue "sessions booked for an unclaimed student don't link on claim"** — the RLS-via-join makes
  them visible on claim without a backfill trigger. **Still worth:** the coach confirming the student's
  widget now shows the session.

**PlayerCard mobile layout v2 + v2-correction — surname emphasis & label-row/value-row stat sheet
(2026-06-17).** Two mobile-only refinements of the home `PlayerCard` hero, both keeping desktop
(`sm:` and up) pixel-identical. PlayerCard renders **two separate sibling blocks** — `sm:hidden`
(mobile) and `hidden sm:flex` (desktop, a verbatim copy of the approved layout) — so the desktop tree
is guaranteed unchanged (avatar 128px + first name `clamp(2.5rem,8vw,4rem)` + inline ·-separated stat
row, `items-center gap-8`).
- **v2 (`1a2acbc`, DEPLOYED & verified live):** introduced the two-block split, the 80px mobile avatar
  (`h-20 w-20`), the **surname-first name** (Bebas `text-[2rem]` dominant + given names lighter below),
  and extracted **`formatNameAmericanStyle` to `src/lib/name.js`** (shared by PlayerCard + Profile; no
  behavior change to Profile). Its stat sheet was a 2×2 grid (LEVEL|ARM / SURFACE|SESSIONS).
- **v2-correction (committed this `/umb`, NOT yet pushed/deployed — prod still serves the 2×2 from
  `1a2acbc`):** two fixes from a second sketch.
  1. **Stat sheet is now a 4-column / 2-row grid** (`grid grid-cols-4 gap-x-3 gap-y-1`): row 1 = ALL
     FOUR LABELS (LEVEL · ARM · SURFACE · SESSIONS), row 2 = ALL FOUR VALUES directly beneath, each
     value under its own label, four even columns across the full card width. Rendered by mapping
     `stats` twice (labels then values) into the row-major grid — NOT four stacked label/value pairs.
     The shared `<Stat>` component from v2 was **removed** (unused).
  2. **Photo + text block are vertically centered to each other** (`items-center`): given names moved
     back INSIDE the text column (dropped the `pl-24` indent), so the avatar's midpoint aligns with the
     midpoint of the WHOLE text block (label + surname + given), not just label+surname.
- The "55TC · PLAYER CARD" label stays byte-identical (`text-[10px] font-medium uppercase
  tracking-[0.3em] text-sand/55`). Lint + build clean.
- **v2-polish (committed this `/umb`, NOT pushed/deployed — prod still serves `242343c`):** three
  mobile-only refinements. (1) **Top-block spacing** — surname `mt-1` → **`mt-1.5`** so the
  label→surname gap reads equal to surname→given (the surname's `leading-[0.9]` pulls its cap-top up
  into the margin, so equal code margins rendered unequal). (2) **Given-names casing** — `lib/name.js`
  now title-cases the given portion via a new `toTitleCase` ("ALEKSEI NOGUEIRA" → "Aleksei Nogueira");
  the all-caps came from the stored `full_name`, not CSS. Surname left raw (Bebas renders caps). This
  also title-cases Profile's mobile given line (consistent; no desktop impact). (3) **Stat grid
  harmony** — added `text-center` (+ `gap-x-3`→`gap-x-2`, label tracking `0.2em`→`0.15em`, value
  `text-sm`→`text-[13px]`) so the four equal columns read evenly spaced left→right (left-aligned left
  uneven trailing gaps per label width). The ~70px-column fit risk from v2-correction is resolved by
  the smaller value text + centering.

**Mobile layout fix — PlayerCard + Profile side-by-side + American name format (2026-06-17,
DEPLOYED per request).** Mobile-only UI pass; desktop (`sm:` and up) kept pixel-identical by wrapping
every desktop value in an `sm:` class. Lint + build clean. Two components:
- **`components/PlayerCard.jsx` — mobile side-by-side.** The forest home hero went from mobile-stacked
  (avatar centered above name/stats) to **avatar-left / name-right at every breakpoint** (container
  `flex flex-row items-center gap-4 text-left sm:gap-8`; desktop was already side-by-side so this is a
  no-op there). Avatar **64px on mobile** (`h-16 w-16 sm:h-32 sm:w-32`), initial `text-2xl sm:text-6xl`.
  First name moved off inline `style={{fontSize:clamp(...)}}` to classes `text-[2rem]
  sm:text-[clamp(2.5rem,8vw,4rem)]` so mobile shrinks to 32px while desktop keeps the exact clamp.
  Stat chips **split into two blocks**: mobile = clean **2-col grid** (`grid grid-cols-2 … sm:hidden` →
  LEVEL·ARM / SURFACE·SESSIONS, no orphan), desktop = the **unchanged** inline `·`-separated row
  (`hidden … sm:flex sm:justify-start`).
- **`screens/Profile.jsx` — mobile restructure (4 changes).** (1) **Removed** the "Your details on file
  with the crew." subtitle entirely (all breakpoints — redundant with the section header). (2) **EDIT
  PROFILE** button: header button gated `hidden … sm:block` (desktop keeps it top-right next to the
  title); added a **mobile-only full-width** button at the very bottom (`mt-8 w-full … sm:hidden`, same
  render condition). (3) ReadView header **side-by-side on mobile, stacked/centered preserved on
  desktop** (`flex flex-row items-center gap-4 text-left sm:flex-col sm:items-center sm:text-center`);
  the shared `Avatar` is now **64px on mobile** (`h-16 w-16 sm:h-28 sm:w-28`, initial `text-3xl
  sm:text-5xl`) — used only in ReadView so EditView is untouched. (4) **Mobile-only name format**
  "LASTNAME, First Middle" via new helper **`formatNameAmericanStyle(fullName)`** (splits on
  whitespace, last token = surname, rest = given names; single-word name → surname only, no comma) —
  surname prominent in Bebas Neue (renders caps) with given names smaller/lighter in DM Sans below;
  the desktop `{firstName} {lastName}` h2 is kept verbatim behind `hidden sm:block`. This format is
  **scoped to the Profile page only** (PlayerCard still shows first name).
- **DEPLOYED (2026-06-17, per "u can do everything including deploy").** Committed, pushed to
  `origin/master`, fired the Vercel deploy hook via `deploy-prod`, verified prod serves the new commit.

**Post-8C–10 audit + deploy (2026-06-17).** Ran a full read-only audit of every change across
phases 8C→10 (PlayerCard/home widgets, Profile, Library folders, session scheduling + reminder
email, Coach Dashboard HQ) on 7 axes: empty/null handling, RLS (coach-all / student-own), missing
await/race conditions, real-vs-swallowed `console.error`, 375px mobile, `db.js` table/column
correctness, and Edge Function error handling. Verified every `db.js` column against migrations
002/006, confirmed RLS shape on `sessions` (own via `user_id` / coach via `is_coach()`) and the
PostgREST `student:students(full_name)` embeds (single unambiguous FK). **One real bug fixed:**
`LastFeedbackWidget.formatDate` only handled date-only strings, so the `created_at` (full timestamp)
fallback — used when a feedback's `lesson_date` is null — produced an invalid date and the date
rendered blank; now branches on whether the value contains `T`. Lint + build clean. **Two non-bugs
noted:** ACTIVE STUDENTS counting `status='active'` is correct (coach sets status via StudentForm);
the "gallery by session + upload" feature named in the audit prompt was never committed in 8C–10
(no such commit; `Gallery.jsx` is the earlier Phase 8 screen, unchanged).

**DEPLOYED & VERIFIED LIVE (2026-06-17).** Committed `fix: post-8c-10 audit fixes` (`5ab6924`),
pushed to `origin/master`, fired the Vercel deploy hook via the `deploy-prod` skill, and **verified
production serves `5ab6924`** (deployment `dpl_DsUQdKdF9pFSWdWx8dTZhz3j5x9A`, state READY, target
production, `githubCommitSha 5ab6924…`, branch master). This is the **first production deploy of the
entire Phase 8C→10 stack** (player card + home widgets, student profile, library folders, session
scheduling + reminder email, coach dashboard HQ) plus the `ff00912` profiles fix — all of which had
been committed-only until now. **The coach confirmed migration `006_sessions` is applied** in the
live Supabase project (the deploy was gated on this — `/coach` and `/admin/students/:id` query the
`sessions` table and would have hard-errored otherwise). **Still worth a manual smoke-test:** load
`/coach` and `/admin/students/:id` on the live site, and confirm migrations `004` (profiles
onboarding columns + `avatars` bucket — Profile edit/avatar save) and `005` (profiles self-insert —
`/claim`) are applied; the user only explicitly confirmed `006`.

**Phase 10 — Coach Dashboard HQ (2026-06-17, code-level, committed this `/umb`, NOT pushed/deployed
per request).** Replaced the coach Home placeholder (`/coach` → `ComingSoon "Coach Home"`) with a full
operational dashboard, `screens/CoachDashboard.jsx`. Lint + build clean. Built in 4 approved steps; the
whole page loads via ONE parallel `Promise.all` (6 concurrent queries). Page order: header ("55TC · HQ"
/ "Headquarters") → metrics → **Feedback Due** → **This Week** → **Recent Activity**.
- **Step 1 — Metrics row (`db.js` + screen).** 4 cards (`grid-cols-2 md:grid-cols-4`): ACTIVE STUDENTS
  (`countActiveStudents`, status='active'), SESSIONS THIS MONTH (`countSessionsThisMonth`, status in
  scheduled/completed within the calendar month — local month bounds), FEEDBACKS THIS MONTH
  (`countFeedbacksThisMonth`, created_at this month), PENDING FEEDBACK (= `listPendingFeedback().length`).
  First three use `count:'exact', head:true` count queries. PENDING FEEDBACK card flips forest/sand when
  `> 0` (the one action-demanding metric). Cards use the established white-lift treatment (`bg-white/60
  border-forest/12`), NOT literal sand-on-sand (invisible on the sand page) — number in Bebas, label DM
  Sans uppercase.
- **Step 2 — THIS WEEK agenda (`listSessionsThisWeek`).** Mon 00:00 → next Mon 00:00 (local), soonest
  first, incl. cancelled (dimmed + struck), joins `student:students(full_name)`. Each row: day · time
  (Bebas) + student · location; status badge; **ADD FEEDBACK** (→ `/admin/students/:id/feedback/new`,
  hidden when cancelled) + **CANCEL** (scheduled only; `confirm()` guard + optimistic soft-cancel via
  `cancelSession`). Empty: "No sessions this week. Schedule one from a student's profile."
- **Step 3 — FEEDBACK DUE (`listPendingFeedback`, reused from Step 1).** Placed ABOVE This Week
  (accountability priority). One row per student (their most-recent uncovered session): name (Bebas) +
  "Session {date} · location" + **WRITE FEEDBACK →**. Positive empty state ("You're all caught up.").
  `due?.length` drives the PENDING FEEDBACK card so number + list can't disagree.
- **Step 4 — RECENT ACTIVITY (`listRecentActivity`).** Last 5 feedbacks + last 5 sessions, merged and
  sorted newest-first by `created_at` (the action time), up to 10 compact rows. 📋 feedback (desc =
  title || "New feedback") / 🎾 session (desc = "Session {scheduled day} · location"); right-edge date =
  `created_at`. Empty: "Nothing yet…".
- **`db.js` coach-dashboard section (NEW):** `countActiveStudents`, `countSessionsThisMonth`,
  `countFeedbacksThisMonth`, `listSessionsThisWeek`, `listPendingFeedback`, `listRecentActivity` + local
  `startOfMonthISO`/`startOfNextMonthISO`/`startOfWeek` helpers + `MS_PER_DAY`.
- **`main.jsx`:** `/coach` repointed `ComingSoon` → `CoachDashboard`. **`ComingSoon.jsx` is now unused**
  but left in place (not deleted, per the ask-before-deleting rule).
- **KEY INTERPRETATION (see decisions):** the spec's PENDING FEEDBACK / FEEDBACK DUE say "completed
  session", but the app has NO "mark completed" action (scheduling only creates `scheduled`; the only
  mutation is Cancel). A strict `status='completed'` filter would always be 0. So `listPendingFeedback`
  treats a session as **finished** when `status='completed'` OR it's a **past `scheduled`** session
  (cancelled excluded), within the last 14 days, with no feedback `created_at >` that session's
  `scheduled_at`. SESSIONS THIS MONTH stays literal (scheduled+completed).
- **NOT live:** like all of Phase 8x, the dashboard reads empty until **migrations 004/005/006 are
  applied + live data exists**, and the frontend is redeployed. Committed only — NOT pushed, NOT deployed.

**Phase 8F — Session Scheduling + Reminder Email (2026-06-17, code-level, NOT committed-then-deployed
at write time — commit pending this `/umb`; do NOT deploy).** Added coach-side session scheduling, a
branded reminder email, and wired the student Home "Next Session" widget to real data. Lint + build
clean. Built in 3 approved steps:
- **Step 1 — `screens/admin/StudentDetail.jsx` + `lib/db.js` + migration 006.** New **SCHEDULE
  SESSION** section above the credits card: Date (`<input type=date>`), Time (`<select>` of 30-min
  increments 07:00–21:00), Duration (60/90 **chip** selector, default 60), Location (text, placeholder
  "Stanley Park Court 3"), Notes (optional textarea). On submit: build `scheduled_at` from local
  date+time → `new Date('YYYY-MM-DDTHH:MM').toISOString()` (stored UTC), `createSession`, then **await**
  the `send-session-reminder` Edge Function and show an honest toast — "Session scheduled. Reminder
  sent." only on HTTP 200, else "Session scheduled — but the reminder email didn't send." Below the
  form: an **Upcoming** list (sessions ≥ now, soonest first, incl. cancelled) — each row shows
  date · time (Bebas), `{n} min · location`, a status badge, and a **Cancel** button (only when
  `status='scheduled'`). Cancel is a soft update (`cancelSession` → `status='cancelled'`); cancelled
  rows render `line-through` + `opacity-55` (visually distinct, kept in the list). `db.js` gained
  `listUpcomingSessionsForStudent`, `createSession`, `cancelSession`. **Migration `006_sessions.sql`
  (UNAPPLIED):** `sessions` table + `session_status` enum (scheduled/completed/cancelled) + `updated_at`
  trigger + RLS (student SELECT own via `user_id`, coach full CRUD). `user_id` is **nullable** and set
  from `students.user_id` at schedule time — **no claim-gate** (see decisions: scheduling + email work
  for unclaimed students; the email targets the roster email).
- **Step 2 — `supabase/functions/send-session-reminder/index.ts` (NEW, DEPLOYED).** Deno + Resend,
  modeled 1:1 on `send-invite-email` (same CORS/JSON plumbing, `from` "Aleksei Nogueira
  <55tc@55tenniscrew.com>", hosted PNG header logo, footer SVG). POST `{ student_name, student_email,
  scheduled_at, duration_minutes, location }`. Header headline "SEE YOU<br>ON THE<br>COURT.", subline
  "55TC · Vancouver"; body "Hey {name}, Just confirmed — you have a session coming up…"; a white info
  card (DATE/TIME/DURATION/LOCATION); "See you there. Less Theory. More Game." / "— Aleksei"; CTA
  "VIEW MY PORTAL →" → https://portal.55tenniscrew.com. DATE/TIME formatted via `Intl.DateTimeFormat`
  pinned to **`America/Vancouver`** (scheduled_at is UTC; Deno defaults to UTC otherwise). Location
  falls back to "To be confirmed" if blank. **Deployed** to project `vdyvlylacsghnvtllrzj` (script
  5.943kB); inherits `verify_jwt=true` from `config.toml`. **NOT end-to-end verified by a real send.**
- **Step 3 — `components/NextSessionWidget.jsx` (NEW) + `StudentDashboard.jsx` + `lib/db.js`.** The
  inline "Coming soon" placeholder on Home is now a self-fetching `<NextSessionWidget />` (matches
  `LastFeedbackWidget`): resolves the roster row via `getStudentByUserId`, then new
  **`getNextSession(studentId)`** (status `scheduled`, `scheduled_at > now()`, soonest, limit 1). If a
  session exists → date (Bebas) + time · location on a solid white card; if none/loading → the original
  dashed "Coming soon" empty state, verbatim. StudentDashboard stays pure composition.
- **`database-blueprint.md` synced:** added the `sessions` table, the `session_status` enum, and moved
  scheduling out of "Built later".
- **NOT deployed (per request).** The frontend (Step 1/3) is code-level only; the Edge Function (Step 2)
  IS live. `sessions` won't persist until **migration 006 is applied** (same unapplied-migration gate as
  004/005). **KNOWN GAP:** a session scheduled while the student is unclaimed (`user_id` NULL) won't
  surface in their Home widget even after they claim (no backfill).

**Phase 8E — Library Folder System (2026-06-17, code-level, committed, NOT deployed — per request).**
Redesigned the student `/library` from a flat filtered list into a folder-first content library, plus
made the coach's category field a constrained select. Lint + build clean. Built in 2 approved steps:
- **Step 1 — `src/screens/Library.jsx` (full rewrite).** Two states, switched by local `open` state
  (no route change / page reload):
  - **State A — folder grid.** The **8 seeded technique categories** (forehand, backhand, footwork,
    serve, volley, slice, smash, mentality) as forest **folder cards** — court motif (`<CourtMotif>`
    bottom-right, sand 6%), an **emoji icon** in a sand/10 circle (explicit placeholders, isolated in
    a `CATEGORIES` const so brand SVGs can swap in later without touching layout), Bebas Neue label,
    and a badge: `{n} videos` (DM Sans, sand/55) or **`Coming soon`** when count is 0. Grid is
    `grid-cols-2 md:grid-cols-3`. The 8 are **hard-coded** (always shown even at count 0) — the
    front-end does NOT rely on a distinct-category query.
  - **State B — inside a folder.** `← Library` back button, emoji + Bebas category header, the
    existing video-card design **reused as-is** (YouTube embed inline / "Watch ↗" tile), and the
    per-folder empty state: "Coming soon" + "Your coach is stocking this shelf. Check back soon."
  - **`More` folder (kept, per request):** a 9th folder rendered **only when** items carry a category
    outside the 8 (or null/legacy) — a safety net so a mistyped category never silently hides a video.
    `norm()` lowercases+trims for matching; counts computed in a `useMemo`.
  - Dropped the old per-card category eyebrow (now redundant — the folder *is* the category) and the
    `FilterChip` row.
- **Step 2 — `src/screens/admin/Videos.jsx`.** The add form's free-text **Category** `<Field>` →
  a `<select>` of the same 8 lowercase folder values + a leading `— Uncategorized —` (`value=""`).
  Styled identically to the existing Source select. **Save logic unchanged** (`handleCreate` already
  does `category: form.category.trim() || null`), so a pick stores the lowercase value (`'forehand'`,
  matches the Library folder key exactly) and Uncategorized stores `null` → lands in the **More**
  folder. NOTE: the admin Videos page has **no edit mode** (create + delete only), so only the add
  form was touched. Category kept **optional** (not forced) to pair with the More safety net.
- **NOT deployed (per request).** Same live-data gate as 8B/8C/8D: the folder counts/contents are
  empty until migrations are applied + the curated_library is stocked. The 8 categories are claimed
  "seeded in the DB" by the task but there is **no seed migration in the repo** — the front-end
  hard-codes the 8 regardless, so the grid renders the full set even with an empty table.

**Phase 8D — Student Profile Page (2026-06-17, code-level, NOT committed-then-deployed at write
time — commit pending this `/umb`).** Replaced the read-only `/profile` stub ("Nothing here yet")
with a real, editable player profile. Lint + build clean. Built in 3 approved steps, all in
`src/screens/Profile.jsx` (full rewrite) + one `db.js` helper:
- **Step 1 — read view.** Avatar at top (photo, or a **forest circle + sand initial** fallback —
  inverted vs PlayerCard's sand/forest because this page is on sand, keeping the contrast rule) +
  first/last name in Bebas Neue. Two white cards: **YOUR DETAILS** (full name · email · phone ·
  DOB formatted `Jan 15, 1990` via a local-date parse, no TZ shift · gender) and **YOUR GAME**
  (level · hand · surface · favorite-player value chips). Every empty field renders `—` (`dash()`
  helper + `formatDob`). Self-fetches via `getStudentProfile(user.id)` (same merge PlayerCard uses);
  email comes from `user.email` (auth, read-only), phone from the roster row.
- **Step 2 — edit mode.** An **EDIT PROFILE** button (forest, header-right) flips to a separate
  `EditView`. Editable: full name, phone, DOB, gender, level, hand, surface, favorite player; email
  shown **disabled** (sand-tinted). Gender + the three tennis fields use the **onboarding solid-pill
  chip selectors** (re-implemented in Tailwind to match `ClaimPage`'s `Chips`, not `<select>`s).
  Save → new **`db.js` `updateStudentProfile({ userId, profilePatch, studentId, phone })`** (writes
  `profiles` via `updateProfile`, then `students.phone` via `updateStudent` only if a roster row
  exists — the two tables share no FK). Empty fields persist as `null`. Optimistic local update →
  back to read view with a "Saved" banner; **Cancel** discards.
- **Step 3 — avatar upload (edit mode).** Clickable avatar → hidden `image/*` file input. Validates
  `≤ 5MB` + image type (human errors). **Uploads immediately** to Storage (`uploadAvatar` →
  `avatars/{user_id}/avatar.{ext}`) with an instant local `objectURL` preview + an "Uploading…"
  overlay (degrades gracefully on slow connections; Save disabled mid-upload), but the `avatar_url`
  is **committed to `profiles` only on Save** (Cancel leaves the DB pointer untouched). objectURL
  revoked on unmount.
- **NOT committed-then-deployed yet at write time — commit pending this `/umb`. Do NOT deploy (per
  request).** Live persistence still needs migration 004 applied (the 9 `profiles` onboarding
  columns + `avatars` bucket) — same unapplied-migration blocker as 8B/8C.

**Phase 8C — Student Home Dashboard (2026-06-17, code-level, NOT pushed/deployed).** Rebuilt the
student Home (`/`) as a broadcast-style player credential. Lint + build clean. Three steps, each
approved before applying:
- **`PlayerCard.jsx`** (NEW) — the forest "hero" at the top of Home: court motif, circular avatar
  (`profiles.avatar_url`) with a **sand-circle + forest initial** fallback (Bebas Neue), first name
  in Bebas Neue (`clamp(2.5rem,8vw,4rem)`), and a 10px/uppercase/2px-tracking stat strip:
  **LEVEL · ARM · SURFACE · SESSIONS**. Self-fetching (uses `useAuth` + new `getStudentProfile`);
  every missing tennis field degrades to `—`, never errors.
- **`LastFeedbackWidget.jsx`** (NEW) — white card below Next Session: "LAST SESSION FEEDBACK" label,
  date (`lesson_date` → `created_at` fallback, formatted `Jun 12, 2026`), 120-char excerpt of
  `feedbacks.body`, optional Bebas title, `View →` link to `/feedback`. Humanized dashed-border
  empty state ("No feedback yet. Your first session is coming."). Self-fetching.
- **`StudentDashboard.jsx`** — collapsed to pure composition: `<PlayerCard />` → tagline
  ("Less Theory. More Game.") → Next Session placeholder (kept as-is) → `<LastFeedbackWidget />`.
  Dropped the old local fetch/error/state (children self-fetch). The forest hero is now the
  PlayerCard surface, not a separate section.
- **`db.js`** gained **`getStudentProfile(userId)`** (parallel `getProfile` + `getStudentByUserId`,
  merged — no FK between `profiles`/`students`, they only share the auth id) and
  **`getLastFeedback(studentId)`** (most recent, `lesson_date` desc then `created_at`, `limit(1)`).
- **KNOWN GAP:** there is **no `sessions_count` column** in `students` (or `profiles`), so the
  SESSIONS chip reads `0` via a `?? 0` fallback until a real source is wired (a column, or a derived
  count from feedbacks / lesson rows). Selecting `*` makes the absent field harmless (undefined→0).
- **NOT committed-then-deployed yet at write time of this bullet — commit pending this `/umb`.**

**Root-bug fix (2026-06-17, committed `ff00912`, NOT pushed/deployed): the missing-`profiles`-row
PGRST116 error.** Killed the "JSON object requested, multiple (or no) rows returned" failure at its
source — a signed-up student with no `profiles` row. Three coordinated changes, lint clean,
committed only (no push, no deploy, per request):
- **`db.js` `getProfile`:** `.single()` → `.maybeSingle()` — a missing row returns `null` instead
  of throwing PGRST116. `AuthProvider.loadProfile` already handles `null`, so the shell no longer
  red-errors. The four student screens (Home/Profile/Feedback/Gallery) never called
  `profiles…single()` directly — they use `getStudentByUserId` (`maybeSingle`) and already render
  graceful empty states, so no screen edits were needed. (If the LIVE site still red-errors, it's
  serving an OLD bundle — needs redeploy.)
- **`db.js` new `upsertProfile(fields)`** + **`ClaimPage` step 1:** replaced the swallowed
  `full_name`-only UPDATE with `upsertProfile({ id, email, full_name, role:'student' })` so the
  profile row is GUARANTEED regardless of the `handle_new_user` trigger (idempotent, `onConflict:
  'id'`). This was the actual silent failure — the old UPDATE hit 0 rows and the `catch {}` ate it.
- **`ClaimPage` step 1 session gate:** after `signUp`, bail with a clear human error if
  `!data.session` (email confirmation ON) instead of silently writing with no auth.
- **Migration `005_profiles_self_insert.sql` (UNAPPLIED):** `profiles_insert_self` RLS policy —
  self-insert only for `id = auth.uid()` AND `role = 'student'` (blocks self-escalation). Required
  for the client upsert to pass RLS (profiles previously had only SELECT + UPDATE policies).
- **PENDING to make it live:** (a) **apply migration 005** in Supabase (and confirm 001–004 are
  actually applied — memory still lists them UNAPPLIED); (b) **redeploy the frontend** via
  `deploy-prod` so the screen/`getProfile` resilience reaches production.

**Phase 8B — Onboarding & Student Experience — invite-email path now DEPLOYED (2026-06-17).**
Wired the full invite→claim flow plus two student-portal tweaks. Stripe (Phase 9) deliberately
untouched. **DEPLOY STATUS (2026-06-17, master now at `6fc0727`, pushed):** shipped both halves —
(a) Vercel production deployment `dpl_E1N4dp1cTA9BdjKEb3atQYiUSWGu` is READY on `749ff6f` (carries
the StudentForm `fetch` fix; the later `6fc0727` logo/doc commits don't touch the frontend bundle so
no new Vercel deploy was needed); (b) `supabase functions deploy send-invite-email` run **twice** —
first on `749ff6f` (code unchanged → "no change", re-applied `verify_jwt=true` from the new
`supabase/config.toml`), then on `6fc0727` which shipped **real new code** (script 5.058kB) carrying
the SVG→PNG email-logo fix. `RESEND_API_KEY` secret confirmed present; the public PNG logo asset
returns HTTP 200 (`image/png`, 14.5KB). **STILL PENDING END-TO-END VERIFY:** coach must create a
student in the live admin and confirm the email actually arrives (and the header logo renders) —
not yet confirmed by a real send. Six sub-steps:
- **1 · Invite email Edge Function** — `supabase/functions/send-invite-email/index.ts` (Deno,
  `Deno.serve`, CORS + OPTIONS). POST `{ student_name, student_email, invite_link }` → Resend API
  (`from` "Aleksei Nogueira <55tc@55tenniscrew.com>", subject "Your 55TC portal is ready."). Key via
  `Deno.env.get('RESEND_API_KEY')` — Edge secret only, never a VITE_ var. Verbatim branded HTML.
  `.env.example` gained `RESEND_API_KEY` placeholder. **Deploy needs:** `supabase secrets set
  RESEND_API_KEY=…` + `supabase functions deploy send-invite-email`. **EMAIL LOGO FIX (2026-06-17,
  `6fc0727`):** the header logo was an inline `<svg>` (defs/filter/transform) that email clients
  don't render — swapped for a hosted PNG `<img>` (`…/storage/v1/object/public/assets/55tcos-email-
  logo.png`, public bucket) and dropped the SVG-only `.logo-wrap` height/filter CSS. Footer SVG left
  as-is (cosmetic, low priority). The PNG source lives at repo root `55tcos-email-logo.png` (untracked).
- **2 · Auto-fire on student create** — `StudentForm.jsx` `handleSubmit` calls the Edge Function
  right after `createStudent`, once the `inviteLink` is built (best-effort; InvitePanel copyable
  link stays as fallback). Fires once at creation. **UPDATED 2026-06-16:** swapped the
  `supabase.functions.invoke('send-invite-email', …)` helper for an explicit `fetch` POST to
  `https://vdyvlylacsghnvtllrzj.supabase.co/functions/v1/send-invite-email` with
  `Authorization: Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` and JSON body
  `{ student_name, student_email, invite_link }`; errors now `console.error` instead of being
  swallowed by `.catch(()=>{})`. Removed the now-unused `supabase` import from the file. Lint clean.
  NOTE: if function logs still show no invocation, the root cause is likely function-side
  (JWT `verify_jwt` / CORS) or a stale prod bundle, not the client call — a call already existed.
- **3 · Migration `004_profile_onboarding.sql`** (written, UNAPPLIED) — 9 `profiles` columns
  (`ADD COLUMN IF NOT EXISTS`), public `avatars` Storage bucket, 4 owner-scoped storage policies,
  and the `get_invite_student(email)` SECURITY DEFINER RPC for anon pre-fill.
- **4 · `/claim` rebuilt** — new `screens/ClaimPage.jsx` (4-step onboarding, 1:1 with the approved
  prototype; CSS verbatim in a scoped `<style>`, header uses `<TennisOSWordmark/>`). Step 1
  `supabase.auth.signUp` → steps 2-4 UPDATE own profile (RLS; trigger already inserted the row).
  Photo → `avatars` bucket. `db.js` gained `getStudentByEmail` (via RPC), `uploadAvatar`; clarified
  `updateProfile` comment. `main.jsx` repointed `/claim` → ClaimPage. **Old `ClaimInvite.jsx`
  DELETED** (orphaned). **Deploy/runtime needs: email confirmation must be OFF** (steps 2-4 need the
  signUp session) — flagged.
- **5 · Student nav reorder** — `Layout.jsx`: Home / Feedback / **Gallery / Library** / Profile
  (Gallery before Library). Coach nav unchanged.
- **6 · Credits card removed from student dashboard** — `StudentDashboard.jsx`: dropped the
  Lesson-Credits card + its dead local fetch; "Next Session" now full-width. Ledger, `db.js`
  `getCreditBalance`, and the admin credits hub all UNTOUCHED.
- Lint + build clean throughout.

**KNOWN GAPS / NEXT (8B):** ~~set `RESEND_API_KEY` secret + deploy the function~~ DONE (2026-06-17).
Remaining: (a) apply migration 004; (b) disable Supabase email confirmation; (c) verify the live
loop: coach creates student → **email arrives + header logo renders** → `/claim` pre-fills name/phone
via the RPC → signUp → profile steps persist → avatar uploads → lands on `/`. `phone` is pre-fill
only (no `profiles.phone` column — not persisted).

**Two surgical Layout.jsx nav fixes (2026-06-14).** Isolated, one per breakpoint:
- **Fix 1 — mobile logo↔nav gap.** The header flex row gap was a single `gap-8` (2rem) at all
  breakpoints; made responsive `gap-2 md:gap-8`. Below md the logo and nav sit ~1.5rem closer
  (2rem→0.5rem); desktop unchanged. The account menu's `ml-auto` absorbs the slack, so only the
  logo↔nav spacing visibly tightens. (No separator-line element exists in the file — nothing moved.)
- **Fix 2 — desktop nav fade removed for real.** Previously the right-edge scroll mask was applied
  always then overridden with `md:[…none]`. Switched to the `max-md:` variant so the mask is only
  emitted below md — desktop now has zero mask rule (verified: compiled into
  `@media not all and (width>=48rem)`). Mobile scroll-hint fade intact; active tab indicator
  (`bg-sand/15`) untouched.
- Lint + build clean. Note: stale `[mask-image:…]`/`md:[…none]` strings quoted in THIS file get
  auto-scanned by Tailwind v4 into dead (unused) CSS — harmless; keep new notes prose-only.

**Wordmark upgraded to real 55TC logo paths (2026-06-14).** `TennisOSWordmark.jsx` rewritten:
no longer Bebas Neue `<text>` for "55TC" — now renders the **actual 55tc-logo.svg vector paths**
(viewBox `0 0 920 218`, `transform` flip) in a single-`color` fill, plus an "OS" suffix as
`<text>` at 38% opacity for hierarchy, with a soft drop-shadow filter. Props unchanged in shape:
`variant` (default sand / dark forest / ink), `size` (sm/md/lg/xl → height 20/32/44/56),
`className`. The three call sites from the prior integration are **unchanged and still correct**
(no text nodes left to replace) — only the component internals changed. Lint clean.

**"TENNISOS" text → `<TennisOSWordmark />` SVG component (2026-06-14).** New
`src/components/TennisOSWordmark.jsx` renders the "55TC.OS" wordmark (Bebas Neue SVG `<text>`,
variants default/dark/mono/ink, sizes sm/md/lg/xl). Replaced all three rendered "TennisOS" text
nodes with the component, picking the variant by background:
- **`Layout.jsx`** header `<span>` (forest bg, `text-2xl` → small): `<TennisOSWordmark size="sm" />`.
- **`Login.jsx`** desktop hero `<h1>` (forest bg, large): `<TennisOSWordmark />` (default variant).
- **`Login.jsx`** mobile brand `<h1>` (sand bg, `text-forest`): `<TennisOSWordmark variant="dark" />`.
Relative imports (`./TennisOSWordmark`, `../components/TennisOSWordmark`); surrounding elements +
classes left untouched (the now-inert font-size classes were intentionally not stripped per the
"change nothing else" scope). Also fixed a lint blocker in the new component (unused `fontSize`
destructure removed — behavior-neutral). Lint clean.

**Nav item spacing tuned per breakpoint (2026-06-14) — Layout.jsx only.** Follow-up to the
fade/spacing fix below. The `<ul>` inter-item gap was a single `gap-1.5` (6px) at every
breakpoint; split it into responsive classes: **`gap-1.5` → `gap-1 md:gap-3`**. Per-link padding
stays `px-2` (8px), so adjacent-item spacing (px+gap+px) went 8+6+8=22px →
- **Mobile** `gap-1` (4px): 8+4+8 = **20px** (~−9%, the requested ~10% tightening). Horizontal
  scroll + mobile edge-fade mask unchanged; no new page overflow.
- **Desktop/tablet** `md:gap-3` (12px): 8+12+8 = **28px** (~+27%, the requested ~30% loosening).
Font size, labels, routes, active indicator (`bg-sand/15`), colors, structure all untouched. Lint clean.

**Deploy guardrails added (2026-06-14) — tooling, not app code.** Codified the production deploy
flow so it can't be done out of order:
- **`deploy-prod` skill** (`.claude/skills/deploy-prod/SKILL.md`): the canonical procedure —
  commit → `git push origin master` → fire the Vercel deploy hook → verify the Production commit
  in Vercel. Auto-surfaced whenever a deploy is intended.
- **PreToolUse hook** (`.claude/settings.json` + `.claude/hooks/guard-deploy.sh`): mechanically
  **blocks** the deploy-hook curl if local `HEAD` isn't yet on `origin/master` (Vercel builds from
  GitHub, so firing early rebuilds the stale commit). Tested: allows when pushed, blocks when ahead.
- **`CLAUDE.md` Hard Rule** pointing all deploys at the skill. All committed to the repo (team-wide).

**Nav spacing/fade fixes (2026-06-14) — Layout.jsx only.** Two small nav tweaks on top of the
header polish below:
- **Desktop fade removed.** The right-edge scroll-hint mask is now `md:[mask-image:none]
  md:[-webkit-mask-image:none]` — it only renders below `md`. On desktop every nav item fits, so
  the fade made no sense and now disappears. Mask still active on mobile (scroll hint intact).
- **Mobile items tightened ~30%.** Inter-item gap `gap-2`→`gap-1.5` (8px→6px) and per-link
  horizontal padding `px-3`→`px-2` (12px→8px). Adjacent link-text spacing went 12+8+12=32px →
  8+6+8=22px (~31% tighter), so a third item is now visible to signal horizontal scroll. Font size
  and active-tab indicator style untouched (still `bg-sand/15` rounded highlight). Applied at base
  (harmless on desktop where items fit). Lint clean.

**Header UX polish shipped (2026-06-13, `55099d9`) — Layout.jsx only.** Two focused tweaks,
deployed via the deploy hook:
- **Hamburger account menu (☰).** Replaced the always-visible email block + "Sign out" button
  with a single ☰ button on the right. Tapping it opens a dropdown holding the user's email, a
  `COACH`/`STUDENT` role badge, and a Sign out action. Closes on outside click (a `mousedown`
  listener gated on `menuOpen`, cleaned up on close/unmount). Side effect: email + role are now
  reachable on mobile too (the old block was `sm:`-only). `aria-expanded`/`aria-haspopup` set.
- **Nav scroll fade hint.** Added a right-edge CSS mask to the `<nav>` scroll viewport
  (`[mask-image:linear-gradient(to_right,#000_82%,transparent)]` + `-webkit-` twin) so the
  rightmost item fades into the forest header — a static "more →" cue that stays pinned regardless
  of scroll position. Mask (not an overlay div) so items stay clickable. Tradeoff: on a wide
  desktop where all items fit, the last item still fades slightly; a scroll-detection effect could
  make it conditional if that bugs the coach later.
- Lint clean; committed; deploy hook fired (job `amzu0zJdiVmX3HnAy2MW`, PENDING at commit time).

**Mobile nav overflow bug FIXED and LIVE (2026-06-13).** Two-pass fix, both shipped:
- v1 (`6e49a4e`): `<nav>` → `min-w-0 touch-pan-x overflow-x-auto`; page root → `overflow-x-hidden`.
- v2 robust (`53208a8`, current): nav stays the constrained scroll viewport, items moved into an
  inner `<ul className="flex w-max">` track with `shrink-0 <li>` items (never wrap, reliably
  overflow), a `.nav-scroll` class in `index.css` (hide scrollbar + `-webkit-overflow-scrolling:
  touch`), `w-full max-w-full` on the root wrapper, and `body { overflow-x: hidden }` global guard.
  Tailwind + one `index.css` utility; no other files. Lint clean. **Coach confirmed it's working
  on the deployed site** after a manual production deploy.

**Deployment is LIVE (2026-06-13).** TennisOS is on Vercel + GitHub:
- **GitHub:** `github.com/alekseinogueira/tennisos` (PRIVATE, default branch `master`).
  Pushed via `gh` (user `alekseinogueira`).
- **Vercel project:** `aleksei-s-projects2/tennisos` (CLI user `alekseinogueira-4203`), Vite
  auto-detected. Production: `https://tennisos.vercel.app`. `vercel.json` SPA rewrite.
- **Deploy mechanism:** git push-to-deploy was **unreliable** — for ~1h every git- and
  CLI-triggered build sat in `UNKNOWN` / never-built (0ms, no logs) while only the very first
  deploy ever built. Removing the stuck deploys + re-triggering via CLI did NOT help. **Coach
  resolved it by creating a Vercel deploy hook and deploying manually** — that path builds and
  ships fine. So the working deploy path today is the **deploy hook + manual deploy**, not raw
  push-to-deploy. Revisit/repair the git auto-build integration later if push-to-deploy is wanted.
- **Env vars** set in Vercel for **Production + Development**: `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` (read from local `.env`). **Preview NOT set** — CLI 54.7.1 bug
  returns `git_branch_required` even with `--value ... --yes`; backfill later (preview deploys
  lack Supabase config until then). Upgrade CLI (`npm i -g vercel@latest`) likely fixes it.
- **Custom domain** `portal.55tenniscrew.com` added to the project; auto-assigned to production.
  Awaiting DNS. Vercel verifies via either `A portal 76.76.21.21` (its stated default) or
  `CNAME portal cname.vercel-dns.com` — add ONE at GoDaddy. **Do NOT change nameservers**
  (would move the whole zone off GoDaddy and break the public apex/www site) and do NOT touch
  apex/www. Cert auto-issues once the record resolves.
- Caveat: app still reads Supabase balance/data as empty until **migrations are applied + coach
  seeded** (see Next Steps) — deploy is live but the backend project work is unchanged.

**Phase 8 (student-facing video screens) is COMPLETE (code-level).** Built the two student
browse views that consume the Phase 6 two-system video model:
- **`/library`** (`Library.jsx`): the GLOBAL `curated_library` shelf, open to any signed-in
  user (RLS lets every authenticated user SELECT). Free-text-category filter chips (All + each
  category) + a card grid; YouTube embeds inline, other links get a "Watch ↗" tile. Coach gets
  it in the nav too (browse the same shelf they manage at `/admin/videos`).
- **`/gallery`** (`Gallery.jsx`): the student's OWN `student_gallery` clips, newest first,
  RLS-private (`user_id = auth.uid()`). Resolves the roster row via `getStudentByUserId`, shows
  title + date + playable clip (same embed/link pattern). Student nav only.
Extracted the `youtubeId` URL parser into **`lib/youtube.js`** and used it in both new screens
(Feedbacks.jsx keeps its own inline copy — not refactored). Lint/build-verified only.

**Phase 9 (next) is NOT decided yet.** Top backlog candidates: **apply migrations + seed coach**
(unblocks every screen for live smoke-testing), then the invite Edge Function. See Next Steps.

## Recent Changes (2026-06-13 — Phase 8: student video screens)
- **`lib/youtube.js`** (NEW): extracted the `youtubeId(url)` parser (watch / youtu.be /
  embed / shorts) so both new screens share one implementation. `Feedbacks.jsx` still has its
  own inline copy (working file, left untouched).
- **`screens/Library.jsx`** (NEW, `/library`): browses `listLibrary()`. Derives unique
  categories (free text; null → "More"), renders FilterChip row (All + each category) when
  there's more than one, and a `sm:grid-cols-2` card grid. Each card: category eyebrow + Bebas
  title + inline YouTube iframe (via `youtubeId`) or a "Watch ↗" external tile. Humanized empty
  state ("The shelf is empty"). Open to any authenticated user (no roster row needed).
- **`screens/Gallery.jsx`** (NEW, `/gallery`): `getStudentByUserId(user.id)` → if no roster row,
  empty list; else `listGalleryForStudent(student.id)`. Card grid with date eyebrow
  (`created_at.slice(0,10)`) + title + same embed/link tile. Humanized empty state ("No clips
  yet"). RLS keeps it the student's own clips only.
- **`main.jsx`:** wired `/library` + `/gallery` alongside `/feedback` + `/profile` (inside
  `Layout`, **outside** the coach `RoleRoute` — any authenticated user reaches them, RLS governs
  what they see).
- **`Layout.jsx`:** student nav gained **Library** + **Gallery**; coach nav gained **Library**
  (browse the shelf they curate at `/admin/videos`). Gallery is student-only.
- `npm run lint` + `npm run build` clean.

## Recent Changes (2026-06-13 — Phase 7: lesson credits UI)
- **`screens/admin/StudentDetail.jsx`** (NEW, `/admin/students/:id`): per-student credit hub.
  Loads `getStudent` + `getCreditBalance` + `listCreditsForStudent` in parallel. Sections:
  live **balance** card, **Adjust Credits** form (signed `delta` with `+ grant · − use` helper,
  `reason` select [purchase/lesson/adjustment/refund], optional `note` → `addCredit`), and a
  **History** list (reason eyebrow + note + date + signed delta, forest for grants / muted for uses).
  New entries prepend live and bump the balance optimistically. **Blocks unclaimed students**
  (`students.user_id` NULL → `lesson_credits.user_id` NOT NULL) with a "Hasn't joined yet" panel,
  same guard as the feedback composer. Header has Edit / New feedback / Back-to-roster links.
- **`lesson_credits` schema:** added `note text` (nullable) in `002_mvp_schema.sql` (edited in
  place — unapplied) + `database-blueprint.md`. `addCredit`/`listCreditsForStudent` already existed
  in `db.js` (no change; `addCredit` passes `fields` through, so `note` flows automatically).
- **`main.jsx`:** wired `/admin/students/:id` (before `:id/edit`). **`Students.jsx`:** roster name
  is now a link to the detail hub.
- **Student dashboard confirmed live:** `StudentDashboard.jsx` already sums the real ledger via
  `getCreditBalance(student.id)`; the only literal `0`s are fallbacks (no roster row / `?? 0`).
  No change needed — Phase 7 task #3 satisfied by confirmation.
- `npm run lint` + `npm run build` clean.

## Recent Changes (2026-06-13 — Phase 6: feedback + video library)
- **Schema remodel (`002`/`003` edited in place, `db.js`, `database-blueprint.md`):**
  dropped `videos` + `feedback_video_links`; added `student_gallery` (private, subject =
  student, RLS `user_id = auth.uid()`), `curated_library` (global, coach-owned, RLS = any
  authenticated may SELECT), and two join tables (`feedback_gallery_links`,
  `feedback_library_links`, both denormalize the student `user_id`). `db.js` swapped the
  video helpers for `listGalleryForStudent`/`createGalleryClip`/`deleteGalleryClip`,
  `listLibrary`/`createLibraryItem`/`deleteLibraryItem`, and `list*/link*/unlink*ForFeedback`
  for both kinds. `curated_library.category` is **free text** (not an enum).
- **`screens/admin/FeedbackComposer.jsx`** (`/admin/students/:id/feedback/new`): title /
  body (required textarea) / lesson_date → `createFeedback` (stamps student `user_id` +
  `coach_id`). **Blocks unclaimed students** (`students.user_id` NULL → `feedbacks.user_id`
  is NOT NULL) with a "Hasn't joined yet → Send the invite" panel. On save → attach screen.
- **`screens/admin/FeedbackDetail.jsx`** (`/admin/students/:id/feedback/:fid`): recap of the
  note + two attach sections — **Curated Library** (toggle attach/detach from the global
  shelf) and **Student gallery** (toggle existing clips + a URL-paste **add-clip form** that
  auto-attaches; no file upload yet, coach pastes a Drive/YouTube link). Per-row busy state.
- **`screens/admin/Videos.jsx`** (`/admin/videos`): curated-library CRUD — inline add
  (title/category/link/source youtube|link), list sorted category→title, delete w/ confirm.
- **`screens/Feedbacks.jsx`** (`/feedback`, student): own feedback newest-first (RLS),
  each card shows title/date/body + linked **gallery** and **library** videos. YouTube links
  **embed inline** (`<iframe>`, id parsed from watch/youtu.be/embed/shorts); other links
  (Drive) render a "Watch ↗" tile. Warm tone, humanized empty state.
- **`Layout.jsx`:** **Feedback** in student nav; **Videos** in coach nav.
- **`AdminHome.jsx`:** added a **Library → Videos** card. **`Students.jsx`:** roster "Edit"
  column → **Actions** (Feedback + Edit links).
- **`main.jsx`:** wired `/feedback`, `/admin/videos`, `/admin/students/:id/feedback/new`,
  `/admin/students/:id/feedback/:fid`.
- `npm run lint` + `npm run build` clean throughout.

## Earlier this session-stream (Student portal — prior session)
- **`StudentDashboard.jsx`** (`/`) welcome hero + lesson-credit balance + next-session
  placeholder; **`Profile.jsx`** (`/profile`) read-only own-row via RLS; shared
  **`CourtMotif.jsx`**; Profile nav item. Both inside `Layout`, outside the coach `RoleRoute`.

## Earlier this session-stream (Admin panel — prior session)
- `/admin/*` route group behind the reused coach/admin `RoleRoute`: `AdminHome` (Control
  Room), `Students` roster table, `StudentForm` (create/edit, **no credit field**),
  `InvitePanel` claim-URL generator. `lib/db.js` gained `getCreditBalances()` (one-query
  roster balances). `Layout` gained the coach-only Admin nav item.

## Earlier this session-stream (auth layer + shell — prior session)
- EPC plumbing (`lib/supabase.js`, `lib/db.js`), migrations `001..003`, the auth layer
  (`AuthProvider`/`useAuth`/`ProtectedRoute`/`RoleRoute`/`Loading`), the auth screens
  (`Login`/`ForgotPassword`/`ResetPassword`/`ClaimInvite`), 55TC `@theme` tokens, and the
  branded `Layout` shell. `.env` confirmed gitignored.

## Locked Stack & Decisions
- React 19 + Vite + react-router-dom v7 + Tailwind v4 + supabase-js v2.
- Auth: email+password (+ reset). Provisioning: coach-invite + claim. Roles: `profiles` table.
- Deploy: Vercel at `portal.55tenniscrew.com` (apex/www + n8n untouched). Stripe = later.

## Next Steps (next session)
1. **Frontend is now DEPLOYED** (`5ab6924`, verified live 2026-06-17) — the whole 8C→10 stack +
   `ff00912` are in production. **Remaining migration confirmation:** the coach confirmed `006`
   (`sessions`) is applied; still **confirm `004`** (profiles onboarding columns + `avatars` bucket —
   without it Profile edit/avatar Save throws) **and `005`** (profiles self-insert RLS — without it
   `/claim` upsert is RLS-blocked) are applied, plus `001..003`. Then seed/verify the coach account
   has `profiles.role='coach'`. **Smoke-test live:** `/coach` + `/admin/students/:id` (both hit
   `sessions`), Profile edit + avatar save (needs `004`), and the `/claim` flow (needs `005`).
2. Set `.env` locally (VITE_SUPABASE_*) and smoke-test login/claim/reset + the admin roster
   (create student → invite link → edit) + the **credit loop** (StudentDetail: record a +/−
   entry → balance + history update → student dashboard shows the live balance) + the
   **student portal** (dashboard balance + profile) + the **Phase 6 loop**: coach writes
   feedback → attaches a library item + a gallery clip → student sees the note with
   inline-playing videos; confirm RLS (a student can browse `curated_library` but only sees
   their own `student_gallery`/feedback/credits).
3. Build the coach **invite Edge Function** (`functions/invite`, service-role) + `lib/api.js`
   caller, then upgrade `InvitePanel` from a manual claim URL to a real emailed magic link.
4. (Later) Real **gallery upload**: a `gallery` Storage bucket + upload UI to replace the
   manual external_url paste in `FeedbackDetail`.

## Open Questions / Blockers
- Migrations are written but **unapplied** — auth + admin + student-portal + Phase 6 data are
  non-functional until a Supabase project exists + `.env` set. Screens verified by lint/build
  only; the dashboard always reads balance 0 until credit rows exist.
- `InvitePanel` only produces a claim URL; it does **not** email a session-bearing magic link
  yet (that needs the service-role invite Edge Function). A bare `/claim?email=` link won't
  establish a session on its own until then.
- **No gallery upload yet** — clips are added by pasting a Drive/YouTube URL on the feedback
  attach screen. The `student_gallery.storage_path` column + a `gallery` Storage bucket are
  shaped for real upload but unbuilt; `videos` Storage bucket renamed to `gallery` in plans.
- Feedback can't be written for an **unclaimed** student (`feedbacks.user_id` NOT NULL) — the
  composer blocks it with a prompt to send the invite first.
