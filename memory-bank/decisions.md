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

<!-- New decisions go above this line, newest first. -->
