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

<!-- New decisions go above this line, newest first. -->
