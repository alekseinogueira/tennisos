# Active Context

> What's happening *right now*. Updated at the end of every session via `/umb`.
> Read this first at the start of every task.

## Current Focus
**Phase 5 (Student portal) is COMPLETE.** Shipped the two screens a player sees: the
dashboard (`/`) and a read-only profile (`/profile`). Built on the existing auth layer +
shell + `db.js`; no new data-layer or RLS work. Supabase migrations are still written but
**not yet applied**, so these screens are lint/build-verified only — not smoke-tested
against live credits/rows.

**Phase 6 (feedback + video library) is NEXT.** Both the `feedbacks` and `videos` tables
(+ the `feedback_video_links` join) already exist in the blueprint and `db.js` already has
the CRUD/list helpers — Phase 6 is the screens: coach feedback composer (write + attach
videos) and the student-facing feedback/video library.

## Recent Changes (2026-06-13 — Student portal)
- **`screens/StudentDashboard.jsx`** (route `/`, replaces the old `ComingSoon` placeholder):
  forest welcome hero with court motif + eyebrow + Bebas `Welcome, {firstName}` + tagline
  "Less Theory. More Game."; a **lesson-credit balance** card; a dashed "Next Session —
  coming soon" placeholder. Resolves the student's own roster row via `getStudentByUserId`,
  then sums the ledger via `getCreditBalance(student.id)`. Name falls back
  profile.full_name → "Player"; balance falls back to 0 when no roster row.
- **`screens/Profile.jsx`** (route `/profile`): read-only definition list — full_name,
  email, phone, status badge. Reads only the student's own row via `getStudentByUserId`
  (**RLS** enforces own-row isolation); no edit. Humanized empty/error states.
- **`components/CourtMotif.jsx`:** net-new shared SVG (Login keeps its own local copy —
  I did not restructure Login).
- **`Layout.jsx`:** added a **Profile** nav item to the student nav (coach nav unchanged —
  coaches have no roster row).
- **`main.jsx`:** wired `/` → `StudentDashboard`, added `/profile` → `Profile` (both inside
  `Layout`, outside the coach `RoleRoute`; RLS governs the data). `ComingSoon` still serves
  `/coach`.
- `npm run lint` + `npm run build` clean.

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
   profile own-row isolation) against the real project.
3. Build the coach **invite Edge Function** (`functions/invite`, service-role) + `lib/api.js`
   caller, then upgrade `InvitePanel` from a manual claim URL to a real emailed magic link.
4. **Credit management UI** (separate from the student form): manual adjustments + (later)
   package purchases that write `lesson_credits` rows — likely a StudentDetail screen. This
   is what gives the student dashboard a non-zero balance to display.

## Open Questions / Blockers
- Migrations are written but **unapplied** — auth + admin + student-portal data are
  non-functional until a Supabase project exists + `.env` set. Screens verified by lint/build
  only; the dashboard always reads balance 0 until credit rows exist.
- `InvitePanel` only produces a claim URL; it does **not** email a session-bearing magic link
  yet (that needs the service-role invite Edge Function). A bare `/claim?email=` link won't
  establish a session on its own until then.
- Storage bucket `videos` + storage RLS not yet created (deferred to when uploads are built).
