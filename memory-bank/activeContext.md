# Active Context

> What's happening *right now*. Updated at the end of every session via `/umb`.
> Read this first at the start of every task.

## Current Focus
First feature shipped: the **Admin panel** (coach/admin only) for managing the student
roster. Auth layer + shell were already done; this session built the admin route group,
the student list, the create/edit form, and the invite-link generator. Supabase migrations
are still written but **not yet applied** — so the admin screens are lint/build-verified only,
not smoke-tested against live data.

## Recent Changes (2026-06-13 — Admin panel)
- **Routes:** `/admin`, `/admin/students`, `/admin/students/new`, `/admin/students/:id/edit`,
  all nested inside the existing `RoleRoute allow={['coach','admin']}` (reused, no new gate).
  Students hitting any `/admin/*` route are bounced to `/`.
- **Screens (`src/screens/admin/`):** `AdminHome` (Control Room landing), `Students`
  (roster table: name · email · status badge · credit balance + New/Edit links),
  `StudentForm` (create/edit: full_name, email, phone, status — **no credit field**).
- **`components/InvitePanel.jsx`:** copyable claim URL (`/claim?email=…`) shown after create.
- **`lib/db.js`:** added `getCreditBalances()` — sums the whole ledger into a
  `{ student_id: balance }` map in one query (avoids N+1 in the roster table).
- **`Layout.jsx`:** added an **Admin** nav item (coach-only); made `end` per-nav-item so
  Admin stays highlighted across `/admin/*` sub-routes.
- `npm run lint` + `npm run build` clean.

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
   (create student → invite link → edit) against the real project.
3. Build the coach **invite Edge Function** (`functions/invite`, service-role) + `lib/api.js`
   caller, then upgrade `InvitePanel` from a manual claim URL to a real emailed magic link.
4. **Credit management UI** (separate from the student form): manual adjustments + (later)
   package purchases that write `lesson_credits` rows — likely a StudentDetail screen.

## Open Questions / Blockers
- Migrations are written but **unapplied** — auth + admin data are non-functional until a
  Supabase project exists + `.env` set. Admin screens verified by lint/build only.
- `InvitePanel` only produces a claim URL; it does **not** email a session-bearing magic link
  yet (that needs the service-role invite Edge Function). A bare `/claim?email=` link won't
  establish a session on its own until then.
- Storage bucket `videos` + storage RLS not yet created (deferred to when uploads are built).
