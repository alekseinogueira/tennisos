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

## In Progress
- Nothing active. Admin roster feature complete (code-level); awaits live data to smoke-test.

## Not Started
- Applying the Supabase migrations to a real project + seeding the coach account.
- `.env` wiring + live smoke test of login/claim/reset + admin roster.
- Coach invite Edge Function (`functions/invite`) + `lib/api.js` caller → real emailed invite.
- Credit management UI (manual adjustments / package purchases that write `lesson_credits`).
- Remaining feature screens (coach Packages/StudentDetail/FeedbackComposer;
  student Dashboard/Feedbacks/Videos).
- Storage `videos` bucket + storage RLS; n8n/Stripe seams.

## Known Issues
- Migrations written (`supabase/migrations/001..003`) but **not applied** — auth + admin data
  are non-functional until a Supabase project exists and `.env` is set.
- `InvitePanel` generates a claim URL only; no session-bearing magic-link email yet (needs the
  service-role invite Edge Function). A raw `/claim?email=` link won't create a session alone.
