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

## In Progress
- Nothing active. Auth layer + shell done; features not started.

## Not Started
- Applying the Supabase migrations to a real project + seeding the coach account.
- `.env` wiring + live smoke test of login/claim/reset.
- Coach invite Edge Function (`functions/invite`) + `lib/api.js` caller.
- Feature screens (coach Roster/Packages/StudentDetail/FeedbackComposer; student Dashboard/Feedbacks/Videos).
- Storage `videos` bucket + storage RLS; n8n/Stripe seams.

## Known Issues
- Migrations written (`supabase/migrations/001..003`) but **not applied** — auth is non-functional
  until a Supabase project exists and `.env` is set.
