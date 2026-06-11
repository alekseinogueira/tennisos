# Architecture — TennisOS Personal V1

> Stack locked, mirroring english-performance-coach (EPC). Reuse EPC plumbing; build
> auth + roles + RLS net-new. Keep this current — it's the map of how things fit.

## Stack
- Framework: React 19 + Vite (ESM, `"type":"module"`)
- Routing: react-router-dom v7
- Styling: Tailwind v4 (`@tailwindcss/vite`), 55TC tokens in `index.css`
- Data/auth: Supabase (`@supabase/supabase-js` v2) — Postgres + Auth + Storage + Edge Functions
- Hosting: Vercel at portal.55tenniscrew.com
- Package manager: pnpm. Scripts: dev / build / lint (eslint) / preview

## Folder Structure (mirrors EPC, adds auth)
```
tennisos/
├── index.html
├── package.json            # deps mirror EPC
├── vite.config.js          # @vitejs/plugin-react + @tailwindcss/vite
├── eslint.config.js
├── vercel.json             # SPA rewrite: all paths -> /index.html
├── .env.example            # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (names only)
├── public/                 # 55TC brand assets (logo, favicon)
├── src/
│   ├── main.jsx            # BrowserRouter > AuthProvider > Routes
│   ├── index.css           # Tailwind v4 entry + @theme 55TC tokens
│   ├── lib/
│   │   ├── supabase.js     # single client from VITE_SUPABASE_* (copy EPC)
│   │   ├── db.js           # data-access: named async fns + unwrap() (copy EPC pattern)
│   │   └── api.js          # Edge Function caller (secret pattern; for email/n8n later)
│   ├── auth/
│   │   ├── AuthProvider.jsx  # session + profile/role context; onAuthStateChange
│   │   ├── useAuth.js        # hook -> { session, user, profile, role, loading, signOut }
│   │   ├── ProtectedRoute.jsx# requires a session, else redirect /login
│   │   └── RoleRoute.jsx     # requires role (coach/admin), else redirect/403
│   ├── components/
│   │   └── Layout.jsx        # branded shell + role-aware nav
│   └── screens/
│       ├── Login.jsx
│       ├── ForgotPassword.jsx
│       ├── ResetPassword.jsx     # handles recovery session -> updateUser({password})
│       ├── ClaimInvite.jsx       # student sets password on invite -> row auto-links
│       ├── student/
│       │   ├── Dashboard.jsx     # credit balance + recent feedback/videos
│       │   ├── Feedbacks.jsx
│       │   └── Videos.jsx
│       └── coach/
│           ├── Roster.jsx        # list/create students, send invites
│           ├── StudentDetail.jsx # credits, feedback, videos for one student
│           ├── Packages.jsx      # manage offerings, grant credits
│           └── FeedbackComposer.jsx  # write feedback, attach videos
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 001_profiles_auth.sql   # role enum, profiles, is_coach(), handle_new_user trigger
│   │   ├── 002_mvp_schema.sql      # 6 business tables
│   │   └── 003_rls_policies.sql    # enable RLS + policies on every table
│   └── functions/
│       └── invite/index.ts         # (later) coach invite email; uses service-role key
└── memory-bank/                    # existing context
```

## Auth Flow
**Client:** `AuthProvider` subscribes to `supabase.auth.onAuthStateChange`, holds
`{ session, user, profile, role, loading }`, fetches the `profiles` row once on login to
resolve role. `ProtectedRoute` gates any authed page; `RoleRoute` gates coach-only pages.
Screens never call `supabase.auth` directly except the auth screens.

- **Login:** `signInWithPassword({ email, password })`. On success, route by role
  (coach → /coach, student → /).
- **Forgot/Reset:** `resetPasswordForEmail(email, { redirectTo: .../reset })` →
  `ResetPassword` consumes the recovery session → `updateUser({ password })`.
- **Coach account:** seeded once manually — create the auth user, then set
  `profiles.role = 'coach'` in the Supabase dashboard. (Documented bootstrap step.)
- **Student provisioning (coach-invite + claim):**
  1. Coach creates a `students` row (`user_id` NULL, `status` 'invited', `email`).
  2. Coach triggers invite → Edge Function calls `auth.admin.inviteUserByEmail(email)`
     (service-role). Supabase emails an invite/set-password link.
  3. Student sets password (`ClaimInvite`) → auth user created.
  4. `handle_new_user` trigger (security definer) inserts `profiles` (role 'student') and
     **auto-links**: `UPDATE students SET user_id = NEW.id, status='active'
     WHERE email = NEW.email AND user_id IS NULL`.

## Roles
`profiles.role` enum: `student | coach | admin`. `admin` = coach superset for future.
RLS source of truth via `is_coach()` (true for coach+admin). Single-coach today; the model
already supports more without rework.

## RLS Strategy
Enable RLS on **every** table. Two security-definer helpers:
- `is_coach()` → `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach','admin'))`
- `auth.uid()` used directly for student-owned rows.

`user_id` semantics per table (per the "every table carries user_id" rule):
- **Subject tables** (students, lesson_credits, feedbacks, videos, feedback_video_links):
  `user_id` = the **student's** auth id. Policy: student sees/edits rows where
  `user_id = auth.uid()`; coach sees/edits all via `is_coach()`.
- **Owner/reference table** (packages): `user_id` = the **coach owner's** auth id. Coach full
  CRUD; students read-only where `active = true`.
- **Join table** (feedback_video_links): `user_id` is **denormalized** (copied from the parent
  feedback's student) so policies stay single-predicate instead of multi-join EXISTS.

Write rules: students are read-only on credits/feedback/videos (coach/system grant those);
students may update only their own `students` profile fields (not role/status). All inserts of
student data are coach-only except the claim-time auto-link (handled by trigger).

Storage: a `videos` Supabase Storage bucket with object paths prefixed by `student_id`;
storage RLS mirrors the table (student reads own prefix, coach all).

## Deploy + DNS (portal.55tenniscrew.com)
- Vercel project linked to this repo. Build `vite build` → `dist`. `vercel.json` SPA rewrite
  so client routes resolve.
- Vercel env (Production + Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only.
  The Supabase **service-role key never goes to Vercel** — it lives only as an Edge Function secret.
- DNS: add `portal.55tenniscrew.com` as a domain on the Vercel project; create a **CNAME
  `portal` → `cname.vercel-dns.com`** at the 55tenniscrew.com DNS host. SSL auto via Vercel.
- **Untouched:** apex `55tenniscrew.com` + `www` (existing nginx static site) and
  `n8n.55tenniscrew.com`. Only the new `portal` subdomain points at Vercel.
- Supabase Auth config: Site URL = `https://portal.55tenniscrew.com`; redirect URLs for
  `/reset` and `/claim`.

## Where n8n Plugs In Later (design now, build later)
n8n already runs at n8n.55tenniscrew.com. Integration seams to leave open:
- **Outbound (TennisOS → n8n):** Supabase Database Webhook or Edge Function fires on events
  (feedback created, credits low) → POST to an n8n webhook (secret in Edge Function env) →
  n8n sends email/WhatsApp.
- **Inbound (n8n → TennisOS):** n8n writes back via service-role (e.g., agente_cortes-produced
  clip → insert `videos` row + `feedback_video_links`). `videos.source` + external-id columns
  exist so external content slots in cleanly.
- Keep every secret-bearing call behind the Edge Function pattern (`lib/api.js` → `functions/*`).
- **Stripe (later):** `packages.stripe_price_id`, a checkout Edge Function, credits granted on
  webhook. Schema is shaped for it; not implemented in MVP.

## Conventions (from EPC)
- Screens never touch the supabase client for data — they call `lib/db.js`.
- `db.js` functions return unwrapped data and throw on error (`unwrap()` helper).
- All secrets server-side (Edge Functions / env), never in client bundle.
