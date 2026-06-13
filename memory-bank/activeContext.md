# Active Context

> What's happening *right now*. Updated at the end of every session via `/umb`.
> Read this first at the start of every task.

## Current Focus
Phase 3 build complete through the auth layer + protected shell. The app scaffolds,
authenticates, gates by role, and renders a branded shell — but has **no features yet**
(placeholder pages). Supabase migrations are written but **not yet applied** to a project.

## Recent Changes (2026-06-13)
- `.env.example` (VITE_SUPABASE_URL/ANON_KEY placeholders); confirmed `.env` gitignored.
- EPC plumbing: `src/lib/supabase.js` (single client) + `src/lib/db.js` (named fns + `unwrap()`).
- Migrations `supabase/migrations/001..003`: profiles + role enum + `is_coach()` + `handle_new_user`
  trigger; 6 MVP tables + enums + `set_updated_at`; RLS on every table + 2 guard triggers.
- Auth layer: `AuthProvider`, `useAuth` (+`isCoachRole`), `ProtectedRoute`, `RoleRoute`,
  `components/Loading`. Screens: `Login` (premium), `ForgotPassword`, `ResetPassword`, `ClaimInvite`.
- 55TC tokens in `index.css` (@theme: forest/sand/ink, Bebas/DM Sans) + fonts in `index.html`.
- `components/Layout.jsx` branded shell (role-aware nav, user + sign-out) wrapping protected routes.
- `npm install` + `npm run lint` clean. (Switched to npm — see Open Questions.)

## Locked Stack & Decisions
- React 19 + Vite + react-router-dom v7 + Tailwind v4 + supabase-js v2.
- Auth: email+password (+ reset). Provisioning: coach-invite + claim. Roles: `profiles` table.
- Deploy: Vercel at `portal.55tenniscrew.com` (apex/www + n8n untouched). Stripe = later.

## Next Steps (next session)
1. **Apply migrations** to a Supabase project (dashboard SQL editor OR `supabase db push`),
   then seed the coach account and set `profiles.role='coach'`.
2. Set `.env` locally (VITE_SUPABASE_*) and smoke-test login/claim/reset against the real project.
3. Build the coach **invite Edge Function** (`functions/invite`, service-role) + `lib/api.js` caller.
4. Start feature screens (coach Roster first), adding role-aware nav items in `Layout`.

## Open Questions / Blockers
- **Package manager mismatch:** built with npm (committed `package-lock.json`), but CLAUDE.md +
  earlier decision say pnpm. Reconcile CLAUDE.md (and its dev/build/lint/test placeholders) — needs
  a call from the coach. Scripts are: dev=`vite`, build=`vite build`, lint=`eslint .`, preview=`vite preview`.
- Migrations are written but **unapplied** — auth won't work until a Supabase project exists + `.env` set.
- Storage bucket `videos` + storage RLS not yet created (deferred to when uploads are built).
