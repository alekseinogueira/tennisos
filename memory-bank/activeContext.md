# Active Context

> What's happening *right now*. Updated at the end of every session via `/umb`.
> Read this first at the start of every task.

## Current Focus
Architecture + database design complete (planning artifacts only). Stack is locked. No
application code or scaffolding yet — building is the NEXT (fresh) session.

## Recent Changes
- Ran `/audit` (read-only) → `audit-report.md`; reviewed EPC → `reuse-epc.md`.
- Wrote `architecture.md` (folder structure, auth flow, RLS strategy, deploy/DNS, n8n seam).
- Wrote `database-blueprint.md` (profiles + 6 MVP tables, columns, relationships, RLS intent).
- Logged 7 decisions to `decisions.md`.

## Locked Stack & Decisions
- React 19 + Vite + react-router-dom v7 + Tailwind v4 + supabase-js v2 (mirrors EPC); pnpm.
- Auth: email+password (+ reset). Provisioning: coach-invite + claim. Roles: `profiles` table.
- Deploy: Vercel at `portal.55tenniscrew.com` (apex/www + n8n untouched). Stripe = later.

## Next Steps (next session — BUILD)
1. Scaffold the Vite + React app (package.json, vite/eslint config, `index.html`, `src/`).
2. Copy EPC plumbing (`lib/supabase.js`, `lib/db.js` pattern).
3. Build auth layer: `AuthProvider`, `ProtectedRoute`, `RoleRoute`, auth screens.
4. Write the 3 Supabase migrations (profiles+auth, MVP schema, RLS) per `database-blueprint.md`.
5. Apply 55TC visual tokens in `index.css`.

## Open Questions / Blockers
- CLAUDE.md command placeholders (dev/build/lint/test) to confirm once scaffolded — they are
  the EPC scripts (vite / vite build / eslint . / vite preview).
- Need a Supabase project (URL + anon key) and the coach account seeded before auth works.
