# Active Context

> What's happening *right now*. Updated at the end of every session via `/umb`.
> Read this first at the start of every task.

## Current Focus
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
