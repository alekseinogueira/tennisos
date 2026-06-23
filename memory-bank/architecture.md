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
│   │   ├── Layout.jsx        # branded shell + role-aware nav (student: Home/Feedback/Profile · coach: Home/Admin/Videos)
│   │   ├── CourtMotif.jsx    # BUILT — shared court-line SVG for forest surfaces
│   │   └── InvitePanel.jsx   # copyable /claim?email=… link, shown after creating a student
│   └── screens/
│       ├── Login.jsx
│       ├── ForgotPassword.jsx
│       ├── ResetPassword.jsx       # handles recovery session -> updateUser({password})
│       ├── ClaimInvite.jsx         # student sets password on invite -> row auto-links
│       ├── ComingSoon.jsx          # placeholder, still serves /coach
│       ├── StudentDashboard.jsx    # BUILT — / welcome hero + lesson-credit balance + next-session placeholder
│       ├── Profile.jsx             # BUILT — /profile read-only own row (RLS), no edit
│       ├── Feedbacks.jsx           # BUILT — /feedback (student): own feedback + inline videos (gallery + library)
│       ├── admin/                  # BUILT — coach/admin panel
│       │   ├── AdminHome.jsx       # /admin landing (Control Room)
│       │   ├── Students.jsx        # /admin/students roster table (name links to detail; status/balance + Feedback/Edit actions)
│       │   ├── StudentDetail.jsx   # BUILT — /admin/students/:id — credit hub: balance + adjust form (delta/reason/note) + history (blocks unclaimed)
│       │   ├── StudentForm.jsx     # create/edit student (profile fields only — NO credit field)
│       │   ├── FeedbackComposer.jsx# /admin/students/:id/feedback/new — write feedback (blocks unclaimed)
│       │   ├── FeedbackDetail.jsx  # /admin/students/:id/feedback/:fid — attach library items + gallery clips
│       │   └── Videos.jsx          # /admin/videos — curated_library CRUD (create/list/delete)
│       └── (planned)              # Packages.jsx — manage offerings, grant credits (deferred to Stripe)
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 001_profiles_auth.sql   # role enum, profiles, is_coach(), handle_new_user trigger
│   │   ├── 002_mvp_schema.sql      # business tables (students, packages, lesson_credits, feedbacks, student_gallery, curated_library + 2 feedback-link joins)
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
- **Credits are transaction-only:** the admin student form never sets credits. Because an
  unclaimed student has `user_id` NULL and `lesson_credits.user_id` is NOT NULL, credits can
  only be written once there's an auth user — and always as a real `lesson_credits` delta
  (manual adjustment or package purchase), recorded in a dedicated credit-management flow.
- **Student provisioning (coach-invite + claim):**
  1. Coach creates a `students` row (`user_id` NULL, `status` 'invited', `email`) via the admin
     form; `InvitePanel` then surfaces a copyable `/claim?email=…` URL. (Emailed magic link
     comes later via the service-role invite Edge Function — see below.)
  2. Coach triggers invite → Edge Function calls `auth.admin.inviteUserByEmail(email)`
     (service-role). Supabase emails an invite/set-password link.
  3. Student sets password (`ClaimInvite`) → auth user created.
  4. `handle_new_user` trigger (security definer) inserts `profiles` (role 'student') and
     **auto-links**: `UPDATE students SET user_id = NEW.id, status='active'
     WHERE lower(email) = lower(NEW.email) AND user_id IS NULL`. The match is **case-insensitive**
     (migration `008`, 2026-06-18) — Supabase Auth lowercases emails, so a roster email entered in any
     case must still link; a prior case-sensitive `=` silently matched 0 rows for UPPERCASE entries.
  4b. **Belt-and-suspenders (2026-06-17, migration `005`):** `/claim` step 1 also `upsert`s its own
     `profiles` row after `signUp`, so the row exists even if the trigger is unapplied/fails. This
     is allowed by the `profiles_insert_self` RLS policy — self-insert ONLY for `id = auth.uid()`
     AND `role = 'student'` (so it can't self-escalate). The trigger remains the primary path; the
     upsert is idempotent (`onConflict: 'id'`).

## Roles
`profiles.role` enum: `student | coach | admin`. `admin` = coach superset for future.
RLS source of truth via `is_coach()` (true for coach+admin). Single-coach today; the model
already supports more without rework.

## RLS Strategy
Enable RLS on **every** table. Two security-definer helpers:
- `is_coach()` → `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach','admin'))`
- `auth.uid()` used directly for student-owned rows.

`user_id` semantics per table (per the "every table carries user_id" rule):
- **Subject tables** (students, lesson_credits, feedbacks, student_gallery): `user_id` = the
  **student's** auth id. Policy: student sees/edits rows where `user_id = auth.uid()`; coach
  sees/edits all via `is_coach()`.
- **Owner/reference tables:** `packages` (`user_id` = coach owner; students read where
  `active = true`) and **`curated_library`** — a GLOBAL coach-owned shelf with **no** student
  subject: coach full CRUD, and **any authenticated user may SELECT** (`auth.uid() is not null`)
  so students can browse all references, not just attached ones.
- **Join tables** (feedback_gallery_links, feedback_library_links): `user_id` is
  **denormalized** (copied from the parent feedback's student) so each policy stays a single
  predicate (`user_id = auth.uid()`) instead of a multi-join EXISTS.

**Two video systems (Phase 6):** `student_gallery` = per-student PRIVATE lesson footage
(subject table, above); `curated_library` = global reference shelf (reference table, above).
A feedback links to either via its dedicated join table. This replaced the original single
`videos` table + `feedback_video_links` join.

Write rules: students are read-only on credits/feedback/videos (coach/system grant those);
students may update only their own `students` profile fields (not role/status). All inserts of
student data are coach-only except the claim-time auto-link (handled by trigger).

Column-immutability that RLS can't express is enforced by BEFORE-UPDATE **guard triggers**
(`guard_profile_role`, `guard_student_update` in migration 003): a student can't change their
own `role`/`status`/`user_id`/`email`. Guards gate on `current_user = 'authenticated'`, so the
SECURITY DEFINER `handle_new_user` auto-link and `service_role` tooling bypass them.

Storage (later): a `gallery` Supabase Storage bucket with object paths prefixed by
`student_id`, mirroring `student_gallery` RLS (student reads own prefix, coach all). Not built
yet — gallery clips are added as external_url (Drive/YouTube) paste until upload lands.
`curated_library` is link-only (external_url), no Storage.

## Deploy + DNS (portal.55tenniscrew.com)
- Vercel project `aleksei-s-projects2/tennisos`, linked to this repo. Build `vite build` →
  `dist`. `vercel.json` SPA rewrite so client routes resolve.
- **Deploy trigger:** a **Vercel deploy hook + manual deploy** is the working path — git
  push-to-deploy stalled (builds stuck `UNKNOWN`/never built). Repair git auto-build later.
- **Mandatory deploy order:** commit → **`git push origin master`** → fire the deploy hook →
  verify the Production commit in Vercel. The deploy hook builds from the **GitHub source**, so
  firing it before the push rebuilds the stale commit. Codified as the **`deploy-prod` skill** and
  enforced by a `PreToolUse(Bash)` hook (`.claude/hooks/guard-deploy.sh`) that blocks the deploy-hook
  curl unless `HEAD` is on `origin/master`.
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
  clip → insert `student_gallery` row + `feedback_gallery_links`). `student_gallery.source` +
  `external_ref` columns exist so external content slots in cleanly.
  *(REALIZED 2026-06-23, Fase-E ETAPA 4: the `55TC - Publicar Feedback` n8n workflow upserts
  `feedbacks` via service-role on Notion publish, then calls the `send-feedback-email` Edge Function —
  the canonical instance of this seam. Status in progress.md.)*
- Keep every secret-bearing call behind the Edge Function pattern (`lib/api.js` → `functions/*`).
- **Stripe (later):** `packages.stripe_price_id`, a checkout Edge Function, credits granted on
  webhook. Schema is shaped for it; not implemented in MVP.

## Conventions (from EPC)
- Screens never touch the supabase client for data — they call `lib/db.js`.
- `db.js` functions return unwrapped data and throw on error (`unwrap()` helper).
- All secrets server-side (Edge Functions / env), never in client bundle.
