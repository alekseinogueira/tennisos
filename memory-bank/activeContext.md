# Active Context

> What's happening *right now*. Updated at the end of every session via `/umb`.
> Read this first at the start of every task.

## Current Focus
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
1. **Apply migrations** to a Supabase project (dashboard SQL editor OR `supabase db push`),
   then seed the coach account and set `profiles.role='coach'`.
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
