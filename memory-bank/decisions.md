# Decisions Log

> Append-only record of meaningful decisions. Newest at top. One entry per decision.
> Format: date — decision — why — alternatives considered.

## 2026-06-17 — Guarantee the `profiles` row at `/claim` via a client upsert + self-insert RLS
- **Decision:** Stop relying solely on the `handle_new_user()` trigger to create a student's
  `profiles` row. After `signUp`, `ClaimPage` step 1 now calls a new `upsertProfile({ id, email,
  full_name, role:'student' })` (`db.js`), backed by a new `profiles_insert_self` RLS policy
  (migration `005`) that permits a self-insert **only** for `id = auth.uid()` **and** `role =
  'student'`. Also: `getProfile` switched `.single()` → `.maybeSingle()` (missing row → `null`,
  not a thrown PGRST116), and the step-1 write is gated on `data.session` (fail loud if email
  confirmation is on) instead of swallowing the error.
- **Why:** Root cause of the "JSON object requested, multiple (or no) rows returned" bug was a
  signed-up user with **no** `profiles` row — the trigger may be unapplied/failed, and the old
  step-1 code did a swallowed `full_name`-only UPDATE that hit 0 rows and silently did nothing, so
  the row was never created. A client upsert makes the row's existence the claim flow's own
  responsibility (idempotent with the trigger via `onConflict: 'id'`).
- **Alternatives:** Rely only on fixing/applying the trigger (rejected — single point of failure,
  no client-side guarantee); open a broad `profiles` INSERT policy (rejected — `role`-unrestricted
  self-insert is a privilege-escalation hole; scoped to `'student'` instead); keep `.single()` and
  just catch harder (rejected — `maybeSingle()` is the correct primitive for "0 or 1 row").

## 2026-06-17 — Email logo: hosted PNG `<img>` instead of inline SVG
- **Decision:** In the `send-invite-email` template, replace the header inline `<svg>` 55TC logo
  (defs + `filter` drop-shadow + `transform`-flipped paths + `<text>`) with a hosted PNG `<img>`
  served from the public `assets` Supabase Storage bucket, and drop the SVG-only `.logo-wrap`
  height/filter CSS. Footer SVG left untouched for now.
- **Why:** Email clients (Gmail/Outlook/Apple Mail) strip or fail to render inline SVG, especially
  `filter`/`defs` — the header logo was simply broken. A hosted raster PNG is the only broadly
  reliable way to show a logo in HTML email.
- **Alternatives:** Inline base64 PNG (rejected — bloats every send, some clients block data URIs);
  keep the SVG (rejected — doesn't render); fix the footer SVG too now (deferred — cosmetic).

## 2026-06-17 — Pin `verify_jwt = true` for send-invite-email via `supabase/config.toml`
- **Decision:** Add `supabase/config.toml` with `[functions.send-invite-email] verify_jwt = true`
  rather than leaving the setting to the CLI default at deploy time.
- **Why:** No config.toml existed, so the function's JWT-verify behavior was implicit/unpinned. The
  function is called from the coach's authenticated browser (a valid JWT — anon key or session is
  always sent), so `true` passes normally **and** keeps the gateway rejecting anonymous callers,
  preventing spam of the email endpoint. Pinning it makes the setting reproducible across deploys.
- **Alternatives:** `verify_jwt = false` (rejected — opens the endpoint to anonymous email-send
  spam); leave it implicit (rejected — non-reproducible, was the source of the "is it the JWT?"
  uncertainty when debugging "never invoked").

## 2026-06-17 — Fire the invite email via explicit `fetch` (not `supabase.functions.invoke`)
- **Decision:** `StudentForm` calls the Edge Function with a raw `fetch` POST to the function URL
  (anon key in the `Authorization` header), replacing the pre-existing `supabase.functions.invoke`
  call; errors are `console.error`-logged, not swallowed.
- **Why:** The user reported the function was "never invoked" and asked for an explicit `fetch` with
  the anon key. A call already existed via `invoke` — rather than add a duplicate (which would
  double-send), the existing call was converted to the requested explicit form. The likelier real
  cause of zero invocations was a stale production bundle (now redeployed), not the call style.
- **Alternatives:** Keep `invoke` (functionally equivalent, but didn't match the explicit-fetch
  request and kept swallowing errors); add a second call (rejected — would double-send the email).

## 2026-06-14 — Enforce deploy order with a PreToolUse hook (push before deploy hook)
- **Decision:** Codify the production deploy flow as a `deploy-prod` skill AND mechanically enforce
  it with a `PreToolUse(Bash)` hook (`.claude/hooks/guard-deploy.sh` + `.claude/settings.json`) that
  blocks the Vercel deploy-hook curl unless local `HEAD` is already on `origin/master`. Backed by a
  `CLAUDE.md` Hard Rule. All committed to the repo (team-wide), not local-only.
- **Why:** Recurring failure mode — the deploy hook fires before the new commit is pushed, so Vercel
  (which builds from the GitHub source, not the local repo) rebuilds the stale commit and production
  silently stays old. A skill alone relies on memory; the hook makes the correct order non-bypassable.
- **Alternatives:** Skill/memory only (rejected — not enforced); a slash command like `/ship`
  (rejected — still manual, no guard); `.claude/settings.local.json` (rejected — gitignored, wouldn't
  travel with the repo for future machines/sessions).

## 2026-06-14 — Desktop nav drops the scroll-fade; mobile nav tightened ~30%
- **Decision:** Remove the right-edge fade mask at `md:` and up (`md:[mask-image:none]`), keeping it
  only below `md`; tighten mobile item spacing ~30% (`gap-2`→`gap-1.5`, link `px-3`→`px-2`).
- **Why:** On desktop every nav item fits, so the scroll-hint fade was meaningless there. On mobile
  the items were too spread out, hiding the third item that should cue horizontal scroll.
- **Alternatives:** Scroll-detection to make the fade conditional everywhere (overkill); removing the
  fade entirely (rejected — still wanted as the mobile scroll hint).

## 2026-06-13 — Ship via Vercel deploy hook + manual deploy (not git push-to-deploy)
- **Decision:** Deploy production through a Vercel **deploy hook + manual trigger**, not raw
  GitHub push-to-deploy.
- **Why:** The git-integration builds (and CLI deploys) stalled — every build after the first sat
  in `UNKNOWN` and never built (0ms, no logs); status page was green, so it was account/project
  specific. The deploy hook + manual deploy builds and ships reliably.
- **Alternatives:** Keep debugging the git auto-build integration (deferred); switch hosts (no).

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

## 2026-06-13 — Credit adjustment lives on a new `/admin/students/:id` StudentDetail hub
- **Decision:** Built a dedicated StudentDetail screen (`/admin/students/:id`) as the home for
  the credit ledger: a live balance, a per-transaction adjustment form (signed `delta`, `reason`,
  optional `note`), and the credit history list (newest first). Roster student name now links here.
  Credits are always one-off entries — **no package picker** (packages table is reserved for Stripe later).
- **Why:** Credits are their own transactional concern, not part of the student profile form
  (see the 2026-06-13 "no credit field" decision). A detail hub gives them a natural home and a
  place future per-student panels (feedback list, gallery) can grow into.
- **Alternatives:** Bolt the credit panel onto the edit form (rejected — conflates profile edits
  with a financial ledger); a standalone `/admin/credits` screen (rejected — credits are always
  viewed in the context of one student).

## 2026-06-13 — Added `note` column to `lesson_credits` (edited migration 002 in place)
- **Decision:** Added `note text` (nullable) to `lesson_credits` directly in `002_mvp_schema.sql`
  so the adjustment form can attach an optional memo (e.g. "Private x10 pack, paid cash").
- **Why:** The task explicitly asked for an optional note; the table had no field for it. Migrations
  are still **unapplied**, so editing 002 in place (same precedent as the Phase 6 video remodel) keeps
  the schema readable rather than create-then-alter.
- **Alternatives:** A separate `004` migration (just noise while nothing is applied); dropping the
  note (rejected — it's an explicit requirement); overloading an existing column (none fits).

## 2026-06-13 — Credit panel blocks unclaimed students (same guard as feedback)
- **Decision:** The adjustment form only renders for a claimed student (`user_id` not NULL); an
  unclaimed roster row gets a "Hasn't joined yet → Send the invite" panel instead.
- **Why:** `lesson_credits.user_id` (the RLS subject) is NOT NULL — there's no auth id to stamp on an
  unclaimed row, and the student couldn't see the balance until they claim. Mirrors the feedback
  composer guard and the credits-are-transaction-only constraint family.
- **Alternatives:** Let the insert fail with a raw DB error (poor UX); make `user_id` nullable
  (rejected before — schema/RLS churn).

## 2026-06-13 — Student video screens sit outside RoleRoute; `/library` is open to all authenticated
- **Decision:** `/library` and `/gallery` are registered inside `Layout` but **outside** the coach
  `RoleRoute` (alongside `/feedback`, `/profile`) — any authenticated user reaches them, and RLS
  governs what each sees. `/library` shows the whole global shelf to anyone signed in; `/gallery`
  shows only the caller's own clips (resolved via `getStudentByUserId`, empty if no roster row).
  Library got a nav item for **both** student and coach; Gallery is student-nav only.
- **Why:** Matches the data model's RLS: `curated_library` is browse-by-any-authenticated, so no
  app-layer gate is needed; `student_gallery` is `user_id = auth.uid()`-private, so a coach hitting
  `/gallery` just sees an empty state (their own non-existent clips) — harmless, no gate needed.
  The coach already manages the library at `/admin/videos`; the Library nav lets them preview the
  same shelf students browse.
- **Alternatives:** Gating both behind a student-only RoleRoute (rejected — RLS + empty states
  already cover the coach case, and the brief says the coach sees the library too); a coach-only
  variant of the library screen (rejected — same read, no reason to fork it).

## 2026-06-13 — Extracted `youtubeId` to `lib/youtube.js`; left Feedbacks' inline copy
- **Decision:** Pulled the YouTube URL parser into a shared `lib/youtube.js` and imported it in the
  two new screens (`Library`, `Gallery`). Did **not** refactor `Feedbacks.jsx`, which keeps its own
  inline copy of the same function.
- **Why:** A shared util keeps the new code DRY; refactoring the working `Feedbacks.jsx` to import it
  would be restructuring a working file for no functional gain (hard rule: ask before restructuring).
  The duplication is one small pure function — low drift risk — and can be reconciled the next time
  Feedbacks is touched for another reason.
- **Alternatives:** Duplicate the parser into each new screen too (rejected — three copies); refactor
  Feedbacks now to use the shared util (deferred — touches a working screen unnecessarily).

## 2026-06-13 — Nav scroll hint via a static CSS mask (not an overlay div or JS scroll detection)
- **Decision:** Signal the nav's horizontal scroll with a right-edge `mask-image` linear-gradient
  on the `<nav>` scroll viewport (`#000 82% → transparent`, plus `-webkit-` twin), fading the
  rightmost item into the forest header. Static — applied unconditionally, no scroll-position logic.
- **Why:** A `mask` doesn't intercept pointer events, so nav items stay clickable (an overlay div
  on the right edge would block taps on the item beneath it). Fading to transparent reveals the
  forest header, visually identical to fading to `#1C3526` per the brief. Static keeps it pure-CSS,
  no JS. Tradeoff accepted: on a wide desktop where all items fit, the last item still fades slightly.
- **Alternatives:** A gradient **overlay div** (rejected — blocks clicks on the clipped item, needs
  `pointer-events-none` workaround and an extra element); a **scroll-detection effect** that only
  masks when `scrollWidth > clientWidth` and un-masks at the end (deferred — more correct but adds
  JS/state for a cosmetic hint; revisit if the desktop fade bothers the coach).

## 2026-06-13 — Header account actions collapsed into a ☰ dropdown menu
- **Decision:** Replace the always-visible email block + "Sign out" button with a single ☰ button
  that toggles a dropdown (email + `COACH`/`STUDENT` badge + Sign out), closing on outside click via
  a `mousedown` listener gated on the open state.
- **Why:** Declutters the forest header and gives the account actions a single affordance; as a
  bonus the email + role (previously `sm:`-only) become reachable on mobile inside the dropdown.
- **Alternatives:** Keep the inline button (rejected — coach asked to collapse it); a full slide-out
  drawer (overkill for three items); a headless-UI/Radix menu (rejected — no need for a dep, the
  outside-click effect is a few lines and stays Tailwind-only).

<!-- New decisions go above this line, newest first. -->
