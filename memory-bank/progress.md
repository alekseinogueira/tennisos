# Progress

> What works, what's left, known issues. Updated at the end of every session via `/umb`.
> Read this first at the start of every task.

## What Works
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
- Nothing actively mid-build. Admin roster + student portal + Phase 6/7/8/8B/8C/8D all complete at
  the code level; all await **applied migrations + live data** to smoke-test.

## Recently Fixed
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
- Applying the Supabase migrations (now `001..004`) to a real project + seeding the coach account.
- Disabling email confirmation in Supabase Auth (the `/claim` signUp flow needs the session for
  steps 2-4). [`RESEND_API_KEY` secret + `send-invite-email` deploy — DONE 2026-06-17.]
- `.env` wiring + live smoke test of login/claim/reset + admin roster + the Phase 6 loop +
  the 8B invite→claim→onboarding loop.
- Coach screens still unbuilt: Packages (deferred to Stripe — no V1 UI).
- Package-purchase credit grants (writes `lesson_credits` with a `package_id`) — deferred to Stripe.
- Real gallery **upload**: `gallery` Storage bucket + storage RLS + upload UI (replaces the
  manual external_url paste). n8n/Stripe seams.

## Known Issues
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
- **Profiles-row fix `ff00912` is committed but NOT live** — migration `005_profiles_self_insert.sql`
  must be applied in Supabase (the `/claim` upsert is RLS-blocked without it) AND the frontend must
  be redeployed (`deploy-prod`) before the `getProfile`/claim resilience reaches production. Until
  then a student with no `profiles` row can still hit the PGRST116 error on the live (old) bundle.
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
