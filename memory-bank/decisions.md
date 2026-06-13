# Decisions Log

> Append-only record of meaningful decisions. Newest at top. One entry per decision.
> Format: date — decision — why — alternatives considered.

## 2026-06-11 — Email+password auth (not magic-link)
- **Decision:** Use Supabase email+password with a forgot/reset-password flow.
- **Why:** Coach prefers familiar credentials; reset flow accepted as the cost.
- **Alternatives:** Magic-link (lower friction, rejected), both.

## 2026-06-11 — Coach-invite + claim provisioning
- **Decision:** Coach creates the `students` row; student claims via invite link. `students.user_id` is nullable until claimed; `handle_new_user` trigger auto-links by email.
- **Why:** Single-coach control over who's in the system.
- **Alternatives:** Open self-signup.

## 2026-06-11 — `profiles` table as role source of truth
- **Decision:** Roles live in a `profiles` table (id → auth.users, role enum), checked in RLS via `is_coach()`.
- **Why:** Auditable, easy to query and manage.
- **Alternatives:** JWT app_metadata claims (harder to manage/list).

## 2026-06-11 — `user_id` on every table, with per-table semantics
- **Decision:** Every table carries `user_id`; semantics vary — subject=student on data tables, owner=coach on `packages`.
- **Why:** One uniform single-predicate RLS pattern across tables.
- **Alternatives:** Mixed ownership columns / multi-join policies.

## 2026-06-11 — Denormalize `user_id` onto `feedback_video_links`
- **Decision:** Copy the student's `user_id` onto the join table.
- **Why:** Keeps join-table RLS a single predicate instead of multi-join EXISTS.
- **Alternatives:** EXISTS-join policy against the parent feedback.

## 2026-06-11 — Credit balance computed via SUM(delta)
- **Decision:** `lesson_credits` is a ledger; balance = SUM(delta), computed in `db.js`.
- **Why:** Simple, auditable, no cache-invalidation bugs in MVP.
- **Alternatives:** Cached `balance_after` column.

## 2026-06-11 — portal.55tenniscrew.com via Vercel CNAME
- **Decision:** Only the new `portal` subdomain points to Vercel (CNAME → cname.vercel-dns.com).
- **Why:** Keep the existing apex/www nginx static site and `n8n.` subdomain untouched.
- **Alternatives:** Moving the apex to Vercel (rejected — out of scope).

## 2026-06-11 — Adopt Memory Bank + slash-command workflow
- **Decision:** Use a `memory-bank/` for durable context and `/umb`, `/ship`, `/audit` commands.
- **Why:** Keep main context lean; make session hand-offs reliable; enforce the one-feature-per-session rhythm.
- **Alternatives:** Ad-hoc notes in README; relying on chat history (not durable).

## 2026-06-11 — pnpm as package manager
- **Decision:** Use pnpm.
- **Why:** Fast, disk-efficient, strict by default.
- **Alternatives:** npm, yarn.

## 2026-06-13 — npm (this build) instead of pnpm
- **Decision:** Used npm to install deps and run scripts this session; committed `package-lock.json`.
- **Why:** Session was driven with npm commands; Vercel builds fine on npm. Avoided mixing two lockfiles.
- **Alternatives:** pnpm (original CLAUDE.md choice — now inconsistent; flagged to reconcile CLAUDE.md).

## 2026-06-13 — Guard triggers for column-immutability (RLS can't do per-column)
- **Decision:** `guard_profile_role()` + `guard_student_update()` BEFORE-UPDATE triggers enforce "student can't change role/status/user_id/email"; RLS handles row-level visibility only.
- **Why:** RLS policies gate whole rows, not individual columns; the blueprint requires students edit only name/phone.
- **Alternatives:** Column-level GRANTs (clumsier with PostgREST), trusting the client (unsafe).

## 2026-06-13 — Guards gate on `current_user = 'authenticated'`
- **Decision:** The guard triggers only restrict real end-user sessions; the SECURITY DEFINER `handle_new_user` auto-link and `service_role` calls bypass them.
- **Why:** The invite-claim auto-link flips `user_id`/`status` and must not be blocked; coach tooling via service-role is trusted.
- **Alternatives:** Special-casing the NULL→uid transition in the guard (more fragile; auth.uid() is null during signup).

## 2026-06-13 — Profile fetch deferred out of onAuthStateChange
- **Decision:** `AuthProvider` resolves the profile via `setTimeout(0)` from the auth callback, with a ref guarding refetches on token refresh.
- **Why:** Calling supabase inside the onAuthStateChange callback can deadlock the auth lock (supabase-js v2); also satisfies the `react-hooks/set-state-in-effect` rule.
- **Alternatives:** Awaiting getProfile inside the callback (deadlock risk), a separate id-keyed effect (tripped the lint rule).

## 2026-06-13 — No credit field on the student create/edit form
- **Decision:** The admin student form sets profile fields only (full_name, email, phone, status). Credits are never set here; they're added later only via a real transaction (manual adjustment or package purchase).
- **Why:** A freshly-created roster student is unclaimed (`user_id` NULL), but `lesson_credits.user_id` is NOT NULL → a credit row can't reference a non-existent auth user. Keeps the ledger honest (every delta tied to a transaction) and avoids a schema change.
- **Alternatives:** Make `lesson_credits.user_id` nullable + backfill it at claim time (rejected — schema/RLS churn for no real benefit); enable the credit field only when editing a claimed student (rejected — credits belong in a dedicated transactional flow, not the profile form).

## 2026-06-13 — Admin reuses RoleRoute; invite generator emits a claim URL (not an email)
- **Decision:** `/admin/*` is gated by the existing `RoleRoute allow={['coach','admin']}` (no new admin-only gate). The invite generator (`InvitePanel`) produces a copyable `/claim?email=…` URL client-side; the real emailed magic link stays with the deferred service-role invite Edge Function.
- **Why:** `admin` is already a coach superset, so no extra primitive is needed. Sending real invite emails requires the service-role key (server-side only) — out of scope this session and an outbound action best left to the planned Edge Function.
- **Alternatives:** A separate admin-only RoleRoute (unnecessary); client-side `signInWithOtp` to email a magic link now (rejected — diverges from the documented `inviteUserByEmail` plan and sends real email outside the intended seam).

## 2026-06-13 — Student portal reads the roster row (not the profile) and `/profile` is read-only via RLS
- **Decision:** The dashboard and profile resolve the player's data through `getStudentByUserId(user.id)` (the `students` roster row), not the `profiles` row. `/profile` is render-only — it shows full_name/email/phone/status and relies on RLS for own-row isolation, with no edit affordance. Both routes sit inside `Layout` but **outside** the coach `RoleRoute` (any authenticated user reaches them; RLS governs what they see).
- **Why:** `students` is the business subject (credits/feedback/videos hang off it); `profiles` is just the identity/role backbone. Read-only keeps the student-edit guard-trigger surface untested-but-unexercised this session and matches the brief ("edit not needed yet"). RLS already guarantees a student sees only their own row, so no app-layer ownership check is needed.
- **Alternatives:** Reading name from `profiles` (rejected — splits the student's data across two sources); gating `/profile` behind a student-only RoleRoute (unnecessary — RLS + the empty-state cover a coach with no roster row); building edit now (out of scope).

## 2026-06-13 — Shared `CourtMotif` component, Login's copy left in place
- **Decision:** Extracted the court-line SVG into `components/CourtMotif.jsx` for the new forest surfaces (student dashboard hero), but did **not** touch Login's existing inline copy.
- **Why:** The spec wants the motif on every forest screen; a shared component avoids re-typing the SVG. Rewriting Login to import it would be restructuring a working file for no functional gain (hard rule: ask before restructuring).
- **Alternatives:** Inline-duplicate the SVG in the dashboard (rejected — drift risk); refactor Login to use the shared component too (deferred — touches a working screen unnecessarily).

## 2026-06-13 — CourtMotif extracted as shared component
- **Decision:** CourtMotif extracted as shared component for reuse across all forest-bg screens.
- **Why:** The 55TC spec puts the court-line motif on every forest-background surface; a single shared component keeps it consistent and avoids re-typing the SVG per screen.
- **Alternatives:** Inline-duplicating the SVG per screen (drift risk).

## 2026-06-13 — Split `videos` into `student_gallery` + `curated_library` (two systems)
- **Decision:** Replace the single per-student `videos` table with two: `student_gallery`
  (per-student PRIVATE lesson footage; subject = student) and `curated_library` (GLOBAL,
  coach-owned technical references with no student subject). Each gets its own join table
  (`feedback_gallery_links`, `feedback_library_links`); a feedback can attach from both.
- **Why:** They have opposite visibility and lifecycle. Gallery clips are one student's own
  footage (private, RLS `user_id = auth.uid()`); library clips are reusable references every
  student should be able to browse. Forcing both into one table can't express "global +
  reusable" and "per-person + private" with a single RLS predicate.
- **Alternatives:** One `videos` table with a nullable `student_id` + an EXISTS-join RLS for
  students reading linked library items (rejected — multi-join policy, conflates two concepts);
  one polymorphic join table with a type discriminator + nullable FKs (rejected — messy FKs,
  no clean per-source RLS).

## 2026-06-13 — `curated_library` is browse-by-any-authenticated; `category` is free text
- **Decision:** `curated_library` SELECT policy = `auth.uid() is not null` (any signed-in user
  may browse the whole shelf); coach has full CRUD. `category` is a free-text column, not an enum.
- **Why:** The library is a shared coaching resource — students should discover references, not
  just ones already attached to them. Free-text category keeps it flexible ("etc." in the brief);
  can standardize to an enum later if categories settle.
- **Alternatives:** Restrict student reads to library items linked to their feedback (rejected —
  defeats "browse the library"); a `video_category` enum now (rejected — premature rigidity).

## 2026-06-13 — Edited migrations 002/003 in place (no new 004) for the video remodel
- **Decision:** Rewrote the `videos`/`feedback_video_links` blocks directly in `002_mvp_schema.sql`
  and `003_rls_policies.sql` rather than adding a `004_*` that creates-then-alters.
- **Why:** The migrations are **unapplied** — no deployed history to preserve — so editing in
  place keeps the schema readable instead of a create-then-immediately-rework trail.
- **Alternatives:** A separate `004` migration (honest evolution if anything were applied, but
  here just noise). Revisit this rule the moment migrations are first applied — after that,
  always add new migrations.

## 2026-06-13 — Feedback composer blocks unclaimed students
- **Decision:** `FeedbackComposer` refuses to create feedback for a student whose `user_id` is
  NULL (invite not yet claimed), showing a "Hasn't joined yet → Send the invite" panel.
- **Why:** `feedbacks.user_id` (the RLS subject) is NOT NULL; an unclaimed roster row has no
  auth id to stamp, and the student couldn't see the feedback anyway until they claim. Same
  constraint family as the credits-are-transaction-only decision.
- **Alternatives:** Make `feedbacks.user_id` nullable + backfill at claim time (rejected —
  schema/RLS churn, mirrors the rejected `lesson_credits` approach); let the insert fail with a
  raw DB error (rejected — poor UX).

## 2026-06-13 — Gallery clips added by URL paste (no upload yet), auto-attached on add
- **Decision:** Until real file upload exists, a coach populates `student_gallery` by pasting a
  Drive/YouTube URL on the feedback attach screen (`FeedbackDetail`); a newly-added clip is
  auto-linked to the feedback being edited. `student_gallery.storage_path` + a future `gallery`
  Storage bucket are shaped for real upload later.
- **Why:** Makes the gallery usable from day one without building Storage upload + RLS this
  session; the coach is adding the clip precisely to reference it in this feedback, so auto-attach
  matches intent.
- **Alternatives:** Ship the gallery schema-only (empty, un-attachable) until upload lands
  (rejected — task #3 needs to attach gallery clips now); build full Storage upload now (out of
  scope this session).

<!-- New decisions go above this line, newest first. -->
