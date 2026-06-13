# Active Context

> What's happening *right now*. Updated at the end of every session via `/umb`.
> Read this first at the start of every task.

## Current Focus
**Phase 6 (feedback + video library) is COMPLETE (code-level).** Shipped the full
feedback loop + a two-system video model. **Key remodel this session:** the single
per-student `videos` table was split into **two** tables — `student_gallery` (per-student
PRIVATE lesson footage) and `curated_library` (GLOBAL coach-owned technical references any
student can browse) — each with its own join table (`feedback_gallery_links`,
`feedback_library_links`). Migrations `002`/`003` were **edited in place** (they were
unapplied, so no `004` churn). Still **not yet applied** → all Phase 6 screens are
lint/build-verified only, not smoke-tested against live rows.

**Phase 7 (next) is NOT decided yet.** Likely candidates from the backlog: apply migrations
+ seed coach; credit-management UI (gives the dashboard a non-zero balance); the invite
Edge Function. See Next Steps.

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
   (create student → invite link → edit) + the **student portal** (dashboard balance +
   profile) + the **Phase 6 loop**: coach writes feedback → attaches a library item + a
   gallery clip → student sees the note with inline-playing videos; confirm RLS (a student
   can browse `curated_library` but only sees their own `student_gallery`/feedback).
3. Build the coach **invite Edge Function** (`functions/invite`, service-role) + `lib/api.js`
   caller, then upgrade `InvitePanel` from a manual claim URL to a real emailed magic link.
4. **Credit management UI** (separate from the student form): manual adjustments + (later)
   package purchases that write `lesson_credits` rows — likely a StudentDetail screen. This
   is what gives the student dashboard a non-zero balance to display.
5. (Later) Real **gallery upload**: a `gallery` Storage bucket + upload UI to replace the
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
