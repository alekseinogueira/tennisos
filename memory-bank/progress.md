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

## In Progress
- Nothing actively mid-build. Admin roster + student portal + Phase 6 all complete at the
  code level; all await **applied migrations + live data** to smoke-test.

## Recently Fixed
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
- Applying the Supabase migrations to a real project + seeding the coach account.
- `.env` wiring + live smoke test of login/claim/reset + admin roster + the Phase 6 loop.
- Coach invite Edge Function (`functions/invite`) + `lib/api.js` caller → real emailed invite.
- Coach screens still unbuilt: Packages (deferred to Stripe — no V1 UI).
- Package-purchase credit grants (writes `lesson_credits` with a `package_id`) — deferred to Stripe.
- Real gallery **upload**: `gallery` Storage bucket + storage RLS + upload UI (replaces the
  manual external_url paste). n8n/Stripe seams.

## Known Issues
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
