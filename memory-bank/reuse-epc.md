# Reuse Notes — english-performance-coach (EPC)

> Read-only review 2026-06-11. EPC is a **single-user, no-auth** React+Vite+Supabase app.
> Great *plumbing blueprint*; the entire auth/security layer is missing and must be built new for TennisOS.

## Stack worth copying
React 19 + Vite + `react-router-dom` v7 + Tailwind v4 (`@tailwindcss/vite`) + `@supabase/supabase-js` v2.
Scripts: `dev` (vite), `build`, `lint` (eslint), `preview`. ESM (`"type": "module"`). Vercel-deployed (`vercel.json`, `.vercel`).

## Patterns to COPY

**1. Supabase client init — `src/lib/supabase.js`**
Single shared client from env: `createClient(import.meta.env.VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)`. One module, imported everywhere. Clean. ✅ copy as-is.

**2. Thin data-access layer — `src/lib/db.js`** ⭐ best reusable piece
All Supabase queries wrapped behind named async functions (`getSessionLog`, `createSession`, …). A single `unwrap({data,error})` helper throws on error so callers use uniform try/catch. Screens never touch `supabase` directly for data — they call `db.js`. ✅ copy the *structure*; replace tables.

**3. Secrets via Supabase Edge Function — `supabase/functions/chat/index.ts` + `src/lib/claude.js`** ⭐
LLM/API keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) live in `Deno.env` server-side, **never on the client**. Frontend calls the function URL (`${VITE_SUPABASE_URL}/functions/v1/chat`), passing `apikey: ANON_KEY` + `Authorization: Bearer <access_token || anon>` obtained from `supabase.auth.getSession()`. CORS allowlist via `ALLOWED_ORIGINS` env. ✅ copy this for any secret-bearing call (matches CLAUDE.md "never expose secrets" rule).

**4. Migrations layout — `supabase/migrations/00x_*.sql`** + `supabase/config.toml` + linked-project. ✅ copy the workflow.

## What is MISSING — TennisOS must BUILD NEW (do not copy gaps)

- **No authentication.** No login/signup, no `onAuthStateChange`, no protected routes. App runs entirely on the anon key. (The `role` strings in screens are *chat* roles, not user roles.)
- **No RLS / no policies.** `001_initial_schema.sql` (51 lines, 5 tables) has **zero** policies, no `user_id` columns, no `auth.uid()`. Tables are wide open under anon key — fine for a single user, unacceptable for a multi-user portal.
- **No roles.** No coach/student distinction anywhere.
- **No route guards / AuthContext.** `main.jsx` is plain `<BrowserRouter><Routes>` with no wrapper.

## TennisOS to-do beyond EPC (multi-user portal needs)
1. Supabase **Auth** (email/magic-link) + an `AuthProvider`/context + `<ProtectedRoute>` wrapper.
2. **Roles**: coach vs student (e.g. `profiles.role`), gate routes/UI accordingly.
3. **`user_id` on every table** + **RLS policies** (`auth.uid() = user_id`; coach-elevated access where needed). Enable RLS from migration #1.
4. Keep EPC's `lib/supabase.js` + `lib/db.js` + edge-function secret pattern as the foundation.

**Bottom line:** Reuse EPC's *plumbing* (client, db layer, edge-function secret handling, migration workflow). Build the *auth + RLS + roles* layer fresh — it does not exist here.
