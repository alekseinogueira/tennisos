# Decisions Log

> Append-only record of meaningful decisions. Newest at top. One entry per decision.
> Format: date — decision — why — alternatives considered.

## 2026-06-22 — Fase-E Notion target is "Teste n8n - Feedback aluno" (NOT "Feedbacks" …1291bc); apply schema there + dedup "Assimilação técnica"
- **Decision:** The Fase-E Notion destination is the data source **"Teste n8n - Feedback aluno"**
  (`collection://3539a701-723c-8055-b621-000b41a0fdbc`, REST `database_id`
  `3539a701-723c-80d4-9bf0-fa3166bea0f9`) — the DB the n8n workflow already writes to. Applied the 10
  Fase-E fields + a dedup fix there: `Qualidade Técnica` option "Assimilação técnica" renamed to
  **"Em Desenvolvimento"**, leaving "Assimilação técnica" only in `Progresso Geral`. Keep the workflow's
  existing `database_id` (`3539…80d4`) — **reverses** the earlier ETAPA-2 plan to switch it to `3529…`.
- **Why:** The n8n integration "Conexão n8n" is scoped to one workspace; the Notion search API shows it
  only sees "Teste n8n - Feedback aluno" + "Alunos" (both `3539a701-723c-*`). The "Feedbacks" DS
  (`…1291bc`, extended 2026-06-18) lives in another workspace and returns **404** to the n8n token even
  after the coach shared it — unreachable, so the 2026-06-18 work was on the wrong DB. A REST test page
  create+archive against `3539…80d4` succeeded (the integration's 400 "property not found" earlier, vs
  404 for the others, was the tell that THIS db was the accessible one). The two duplicate
  "Assimilação técnica" options (in `Qualidade Técnica` and `Progresso Geral`) caused fill-in ambiguity;
  `Progresso Geral` is the semantic owner, so only `Qualidade Técnica`'s copy was renamed.
- **Alternatives:** Target "Feedbacks" `…1291bc` (rejected — unreachable by the n8n integration; would
  require a new integration in that workspace or moving the DB); rename the option in-place to preserve
  page values (not possible via the DDL, which keys options by name — it did a replace, emptying 1 page
  "Kathely 05/05", which was then restored to "Em Desenvolvimento" via REST PATCH — the intended end
  state anyway). Caveats: `Status` select has no DDL default ("Rascunho" set in template/insert);
  `rating_*` 0–10 not enforced by Notion (handled by ETAPA-1 `clampRating`). ETAPA-2 prompt fix reduces
  to just `qualidade_tecnica` → "Em Desenvolvimento" (other selects already match this DB).

## 2026-06-22 — Apply Fase-E ETAPA 1 n8n edits via local n8n CLI export/import, NOT the MCP SDK overwrite
- **Decision:** To change two Code-node `jsCode` bodies in the live, ACTIVE workflow `T7kobxM1FZM99O8l`,
  used the **local n8n CLI** (`n8n export:workflow` → swap only the two `jsCode` strings with Node →
  `n8n import:workflow`), then re-activated (`update:workflow --active=true` + pm2 restart). Did NOT use
  the connected MCP `update_workflow`.
- **Why:** This MCP server exposes only `update_workflow(code)` — a **full overwrite from hand-written
  SDK code**, with no partial/patch op. Reproducing this 18-node workflow in SDK would have meant
  hand-rebuilding two loop structures (a batch loop + a *cyclic* poll loop `Verificar→IF→onFalse→
  Aguardar→Verificar`) and re-encoding two large `jsCode` bodies (backticks/`${}`/mixed quotes) as
  nested strings — high risk of corrupting the graph or **dropping credentials** (the MCP read hides
  credential IDs, so an SDK rebuild couldn't preserve them). n8n runs locally on this box (pm2 + SQLite
  at `/root/.n8n`), so the CLI lets us edit the **exact exported JSON** — only 2 strings change,
  connections/credentials/positions byte-identical. Verified post-import: 18 nodes, connections equal,
  Drive cred `ZxZW3AwdipzBTJbT` intact, bodies parse, workflow re-activated cleanly.
- **Alternatives:** MCP SDK full overwrite (rejected — graph/credential corruption risk for a 2-field
  change); manual paste in the n8n UI (rejected — coach is SSH-only, no editor, TUI output not
  selectable); direct SQLite edits (rejected — hacky, corruption risk). Caveats: `import:workflow`
  deactivates the workflow (must reactivate); requires brief n8n downtime (stop/import/restart). Restore
  artifact kept at `/root/etapa1-work/wf-original.json` (pre-change, contains hardcoded tokens, OUTSIDE the repo).

## 2026-06-18 — Notion `Feedbacks` schema: apply the 10 Fase-E fields via MCP DDL; add a 10th `Aluno` field; leave stray data sources for manual cleanup
- **Decision:** Applied the Fase-E pre-requisite Notion fields to the **`Feedbacks`** data source
  (`collection://3529a701-723c-80da-8250-000b4b1291bc`) via `notion-update-data-source` `ADD COLUMN`
  DDL — `rating_tecnica/intensidade/posicao/progresso` (number), `student_id` (rich_text), `Status`
  (select: Rascunho/Revisão/Publicado), `synced_to_portal` (checkbox), `card_visual_url` (url),
  `objetivos_proxima_aula` (rich_text), plus a **10th field `Aluno`** (rich_text) beyond the 9 in the
  plan. No existing field removed/renamed; source now has 23 properties. Recorded the live schema in
  `fase-e-workflow.md`.
- **Why:** Unblocks the Fase-E n8n workflow (ETAPA 1→4) which writes these fields. `Aluno` gives a
  quick human-readable student reference separate from `student_id` (the UUID). Used DDL via MCP because
  it's exact, reviewable, and idempotent-safe (verified by re-fetch).
- **Alternatives / caveats:** Could not trash the two empty stray data sources (`Feedback treinos`,
  `Nova fonte de dados`) — `in_trash` via MCP is a **no-op for a data source inside a multi-source
  database** (returns a misleading `deleted` flag; re-fetch shows all three live; one call 404'd). Left
  them for **manual UI deletion** rather than risk the live database. Notion limits to flag for n8n (not
  bugs): number range 0–10 is **not enforced** (validate in-workflow); select **default "Rascunho"**
  can't be set via DDL (set in the page template or on n8n insert); checkbox defaults unchecked natively.

## 2026-06-18 — WhatsApp notifications: use Twilio (from `~/agente_cortes`), not Evolution API
- **Decision:** For the TennisOS feedback/loop WhatsApp notifications (planned in `fase-e-workflow.md`
  and `loops-agente.md`), use **Twilio** — the platform already built, tested, and n8n-integrated in
  the separate `~/agente_cortes` project — instead of Evolution API as those plans originally assumed.
  Reuse the **n8n → HTTP node → Twilio API** pattern (documented in `~/agente_cortes/docs/n8n_setup.md`)
  directly; **replicate** the send pattern from `~/agente_cortes/src/whatsapp_client.py` in n8n or a
  Supabase Edge Function rather than importing the file (it's coupled to that FastAPI app). Evolution
  API remains a future migration option if message volume justifies it.
- **Why:** Twilio is already working end-to-end in `agente_cortes` (outbound text/media + inbound
  webhook + n8n error/monitor workflows), so adopting it is near-zero integration cost, whereas
  Evolution API is unbuilt. The n8n HTTP-node recipe is platform-agnostic and drops straight into the
  TennisOS feedback-due / publish loops.
- **Alternatives:** Build Evolution API fresh (rejected for now — self-hosted/free and the stated plan,
  but unbuilt and no urgency at single-coach volume); import `whatsapp_client.py` as-is (rejected — tied
  to the FastAPI app's job model, not portable). Caveats: Twilio Sandbox is dev-only (production needs an
  approved WhatsApp sender), media sends require a public URL (Supabase Storage card image satisfies this).

## 2026-06-18 — Add a `memory-bank/planning/` folder for forward roadmap docs
- **Decision:** Keep long-form forward-planning documents (multi-phase build plans, the n8n workflow
  rebuild plan, the agent-loops roadmap) in a dedicated `memory-bank/planning/` folder
  (`roadmap-portal.md`, `fase-e-workflow.md`, `loops-agente.md`), separate from the always-read
  `activeContext.md`/`progress.md`. Added a "Planning Documents" block to `CLAUDE.md` telling future
  sessions to read the relevant planning file **before starting any new phase** (not every task).
- **Why:** These docs are large, phase-specific, and only relevant when starting that phase — loading
  them into every session's context would be noise. A pointer in `CLAUDE.md` plus a separate folder
  keeps the per-task read light while making the roadmap discoverable exactly when it's needed.
- **Alternatives:** Paste the plans into `activeContext.md` (rejected — bloats the always-read file);
  keep them outside the repo, e.g. Notion (rejected — they drive code work, so they belong with the
  code and the memory bank that future Claude Code sessions read).

## 2026-06-18 — Email-case bug: normalize email matching + switch session RLS to a students join
- **Decision:** Fix the "NEXT SESSION stuck on Coming Soon" bug at the root (not just the one
  student's data). (1) Repair live data: relink the orphaned student row + backfill its session's
  `user_id`. (2) Migration `008_email_normalize.sql` (idempotent): make `handle_new_user()` and
  `get_invite_student()` match emails via `lower(email)`, backfill existing roster emails to lowercase,
  and store new roster emails lowercased in `StudentForm`. (3) Rewrite the `sessions_select` RLS policy
  to resolve student visibility via a **`students` join** — `is_coach() OR student_id in (select id
  from students where user_id = auth.uid())` — instead of the denormalized `sessions.user_id =
  auth.uid()`. Chose "RLS via join" over "backfill `sessions.user_id` in `handle_new_user`" (this
  supersedes the deferred backfill option from the 2026-06-17 Phase 8F decision).
- **Why:** Supabase Auth lowercases auth emails, but the coach can enter a roster email in any case;
  a case-sensitive link match silently failed (0 rows), leaving `students.user_id` NULL forever. `lower()`
  on both sides of every email match makes the link case-robust, and lowercasing on write keeps the
  data clean going forward. The RLS-via-join is strictly more robust than backfilling a denormalized
  column: it makes a session visible the instant the roster row is linked, regardless of when the
  session was created, and removes the fragility that a session booked before claim is invisible
  forever. It also generalizes — no need to remember to backfill `user_id` on every denormalized table
  at claim time. The denormalized `sessions.user_id` is kept (cheap, still set at insert) but no longer
  load-bearing for student reads.
- **Alternatives:** Fix only this student's data (rejected — the bug recurs for the next UPPERCASE
  roster entry and every pre-claim booking); backfill `sessions.user_id` in `handle_new_user` and keep
  the `user_id`-based RLS (rejected — narrower fix, must be repeated per denormalized table, and still
  leaves a window where a row's subject is stale); a case-insensitive `citext` column for emails
  (deferred — heavier schema change; `lower()` matching + lowercased writes solve it without a type
  migration). Confirmed live: 0 uppercase roster emails remain, policy reads the join, both functions
  use `lower()`.

## 2026-06-17 — PlayerCard v2-polish: title-case given names in the helper; center stats; mt-1.5 for optical parity
- **Decision:** Three mobile-only tweaks. (1) Title-case the given-names portion inside
  `formatNameAmericanStyle` (new `toTitleCase`), not via CSS — surname left raw. (2) Center the stat
  grid (`text-center`) and shrink the value to `text-[13px]` / label tracking to `0.15em`. (3) Set the
  surname's top margin to `mt-1.5` (vs `mt-1` on the given line) even though that makes the two code
  margins unequal.
- **Why:** (1) The "ALEKSEI NOGUEIRA" all-caps came from the stored `full_name`, so no CSS toggle would
  fix it — normalizing in the shared helper guarantees title case regardless of source casing, and
  keeps both PlayerCard and Profile consistent from one place. Surname stays raw because Bebas Neue is
  an all-caps face (its source casing is invisible). (2) `grid-cols-4` already makes columns equal, but
  left-aligned content leaves uneven *trailing* whitespace (short `LEVEL` → big gap before `ARM`; long
  `SURFACE` → small gap), which is the imbalance the coach flagged; centering puts each column's content
  on its evenly-spaced center axis so the row scans evenly. (3) Equal code margins rendered visually
  unequal — the surname's `leading-[0.9]` pulls its cap-top up into the space above it (~4px visual for
  label→surname vs ~7px for surname→given), so `mt-1.5` on the surname restores optical parity. Optical
  spacing > nominally-equal margins.
- **Alternatives:** Force casing with a CSS class (rejected — `lowercase`+`capitalize` is lossy on
  ALL-CAPS input and per-render; the helper is the single source); title-case only in PlayerCard
  (rejected — Profile would stay inconsistent; the helper is shared for exactly this); keep stats
  left-aligned (rejected — that *is* the reported imbalance); keep both name margins `mt-1` (rejected —
  renders visibly unequal); bump surname to `mt-2` (rejected — overshoots ~8px vs the ~7px target).

## 2026-06-17 — PlayerCard stat sheet: 4-col label-row over value-row via a doubled map, not stacked pairs
- **Decision:** Rebuilt the mobile stat sheet as a single `grid grid-cols-4 gap-x-3 gap-y-1` whose
  children are `stats.map(label)` followed by `stats.map(value)` — so the four labels fill row 1 and the
  four values fill row 2 (row-major), each value directly under its own label. Dropped the per-field
  `<Stat>` component (and the earlier 2×2 layout). Also switched the photo+name row to center the avatar
  against the WHOLE text block (`items-center` with given names back inside the text column), aligning
  midpoints rather than tops.
- **Why:** The coach's second sketch defined the structure as two real rows — one row of all labels, one
  row of all values — not four independent label/value pairs. A `grid-cols-4` with a doubled `stats` map
  expresses that directly: the grid guarantees four equal columns and perfect label↔value column
  alignment with no manual width math, and it reads as the intended "spec sheet." Centering the avatar
  against the full text block (incl. given names) is what the correction explicitly asked for ("align
  their centers, not their tops"), which supersedes the v2 choice of centering against label+surname
  only — so the `pl-24` given-names indent (which only existed to fake alignment when given was pulled
  out of the row) is no longer needed and was removed.
- **Alternatives:** Keep the 2×2 grid of stacked label/value pairs (rejected — wrong structure per the
  sketch; it reads as four cards, not two rows); two separate flex rows, one for labels one for values
  (rejected — columns wouldn't stay aligned unless each cell shared a fixed width; the grid does this for
  free); keep centering against label+surname only (rejected — the correction explicitly wants the whole
  text block centered). Flagged a fit risk: four columns at ~70px each at 375px make `ADVANCED`/`SESSIONS`
  tight; left at `text-sm`/`tracking-[0.2em]` for now with a noted fallback to smaller value text.

## 2026-06-17 — PlayerCard v2: split into two full sibling blocks; extract name helper to lib/name.js
- **Decision:** For the PlayerCard mobile v2, abandoned the per-value `sm:` override approach used in
  v1 and instead rendered **two complete sibling subtrees** — one `sm:hidden` (mobile), one
  `hidden sm:flex` (desktop = a verbatim copy of the approved markup). The mobile stat sheet is a
  **full-width 2×2 grid placed as a sibling below** the photo+name row (not inside the avatar row), and
  each `<Stat>` stacks **label over value** (no box, no inline dot). Avatar (80px) is centered against a
  wrapper holding only the label+surname, with given names pulled out to a `pl-24`-indented line below.
  Also **extracted `formatNameAmericanStyle` from `Profile.jsx` into `src/lib/name.js`** and imported
  it in both screens.
- **Why:** The brief required (a) the stat grid to span the FULL card width below the photo — structurally
  impossible while the stats live in the right column beside the avatar, so the layout had to be
  re-parented, which a per-value `sm:` toggle on the v1 single-tree couldn't express; and (b) zero
  desktop regression — a separate `hidden sm:flex` block that duplicates today's markup guarantees the
  desktop computed styles are unchanged, at the cost of a duplicated avatar/label. Stacked `<Stat>`
  (label over value) makes all four values left-align into a clean per-row column, which an inline
  `label · value` can't (varying label widths push values to different x). Centering the avatar against
  only label+surname (given names excluded from that flex row) prevents the avatar's vertical center
  from drifting as the name length changes. The helper was duplicated between Profile and PlayerCard, so
  a shared `lib/name.js` (matching the existing `lib/youtube.js` util pattern) removes the duplication.
- **Alternatives:** Keep one responsive tree and override with `sm:` utilities (rejected — can't move
  the stat grid from beside-the-photo to full-width-below with utilities alone); inline `label · value`
  stat with a middle dot (built first this round, then rejected per request — stacked aligns values
  cleanly); copy the name helper into PlayerCard (rejected — duplication; the brief explicitly said
  reuse it); center the avatar against the whole name block incl. given names (rejected — drifts with
  name length, violating the "don't drift" requirement).

## 2026-06-17 — Mobile layout fix: duplicate-markup `sm:` toggling to keep desktop pixel-identical
- **Decision:** For the PlayerCard stat strip and the Profile name/EDIT-PROFILE button, rendered
  **two variants toggled by `hidden`/`sm:hidden`/`sm:block`** rather than one fluid layout. PlayerCard
  stats: a mobile 2-col `grid … sm:hidden` plus the original inline `·`-separated row `hidden … sm:flex`.
  Profile: a mobile surname-first name block `sm:hidden` plus the original `{firstName} {lastName}` h2
  `hidden sm:block`; the EDIT PROFILE button exists twice (desktop header `hidden sm:block`, mobile
  bottom `sm:hidden`). Also moved PlayerCard's first-name size off an inline `style` clamp onto
  `text-[2rem] sm:text-[clamp(2.5rem,8vw,4rem)]`.
- **Why:** The brief was explicit — "Desktop layout is approved as-is and must NOT change… pixel-
  identical." The mobile and desktop treatments genuinely differ in structure (grid vs separator row;
  surname-first vs first-last; button at bottom vs top), so a single responsive element couldn't serve
  both without altering the desktop render. Wrapping every desktop value behind `sm:` and duplicating
  only the two divergent blocks guarantees the desktop branch is byte-for-byte the prior markup, at the
  cost of a little duplicated JSX. Inline `style` can't be overridden by a Tailwind class (inline always
  wins), so the clamp had to move to a class to let mobile shrink to 32px.
- **Alternatives:** One fluid layout with responsive utilities only (rejected — couldn't reproduce the
  desktop inline `·` row and first-last name exactly while also giving the different mobile structure);
  a CSS `@media` block in a stylesheet (rejected — the codebase is Tailwind-utility-first, no
  component CSS); keep the inline clamp and override with `!important` mobile class (rejected — fragile,
  off-pattern).

## 2026-06-17 — Gate the 8C→10 production deploy on coach-confirmed migration 006
- **Decision:** Before firing the Vercel deploy hook for `5ab6924`, paused and asked the coach to
  confirm migration `006_sessions` is applied in the live Supabase project; deployed only after a
  "yes". Did not block on `004`/`005` (flagged them for follow-up confirmation instead).
- **Why:** The shipped code (`CoachDashboard`, `StudentDetail`) queries the `sessions` table inside
  a load-time `Promise.all`. If `006` weren't applied, `/coach` would render only an error banner and
  `/admin/students/:id` would regress from a working credit hub to a hard error — a visible
  production break on the coach's two main pages. The deploy is outward-facing and not trivially
  reversible (would need a rollback), so a DB-state precondition the deploy-prod skill can't check
  warranted an explicit confirmation. `004`/`005` only affect Profile-edit/avatar save and `/claim`
  (which fail gracefully or are lower-traffic), so they didn't justify holding the whole deploy.
- **Alternatives:** Deploy immediately per the literal instruction (rejected — would risk breaking
  live coach pages on an unverified assumption); hold the entire deploy until ALL of `004`/`005`/`006`
  were confirmed (rejected — over-blocking; only `006` gates the just-shipped pages, and the user
  wanted to ship); try to verify the live schema myself (not possible — no `.env`/DB access this
  session).

## 2026-06-17 — Post-8C–10 audit: fix only the one real bug, leave intentional patterns alone
- **Decision:** During the pre-deploy audit of phases 8C→10, the only code change made was fixing
  `LastFeedbackWidget.formatDate` (blank date on the `created_at` timestamp fallback). The display
  widgets' empty `catch {}` blocks (PlayerCard, NextSessionWidget, LastFeedbackWidget), the
  `?? 0` SESSIONS fallback, the no-claim-gate on session scheduling, and `countActiveStudents`
  filtering `status='active'` were all left as-is.
- **Why:** Those are deliberate, documented patterns — graceful degradation for self-fetching home
  widgets (they should never red-error the dashboard), the known `sessions_count` gap, the
  email-targets-roster-email scheduling design, and a status the coach controls via StudentForm.
  Changing them would be scope creep, not a fix. The `formatDate` blank was a genuine correctness
  bug (silent data loss), so it was the one thing worth touching.
- **Alternatives:** Also "harden" the empty catches to log (rejected — they're intentionally silent
  so a missing profile never errors the page; logging would add noise without changing behavior);
  rework `countActiveStudents` to count claimed students (rejected — `status='active'` is the
  correct, coach-controlled signal, not a bug).

## 2026-06-17 — FUTURE IMPROVEMENT (not built): a "mark session completed" action
- **Decision:** Deferred, not built this session. Log only. A future phase should add a coach action
  that sets `sessions.status='completed'` (e.g. a button on the StudentDetail Upcoming list and/or the
  dashboard THIS WEEK rows, possibly auto-suggested once `scheduled_at` is in the past).
- **Why:** It's the missing piece that would make the Phase 10 PENDING FEEDBACK / FEEDBACK DUE metric
  EXACT instead of the current past-scheduled heuristic (see the entry below). Until it exists, "did
  this lesson actually happen?" is inferred from the clock, not recorded — a no-show or rescheduled
  session still counts as finished. Once shipped, revisit `listPendingFeedback` to tighten back toward
  `status='completed'` (or completed OR past-scheduled-and-not-yet-marked).
- **Alternatives:** Build it now (rejected — out of scope, one-feature-per-session rule, user asked to
  defer); leave the heuristic permanently (rejected as the long-term answer — accountability data
  should be coach-confirmed, not clock-inferred).

## 2026-06-17 — Phase 10 Coach Dashboard: "completed session" → past-scheduled heuristic
- **Decision:** The PENDING FEEDBACK metric and FEEDBACK DUE list (`listPendingFeedback`) treat a
  session as **finished** when `status='completed'` OR it's a **past `scheduled`** session (cancelled
  excluded), within the last 14 days, with no feedback whose `created_at >` that session's
  `scheduled_at`. The spec literally said "completed session". SESSIONS THIS MONTH stays literal
  (status in scheduled/completed).
- **Why:** The app has NO action that sets `status='completed'` — scheduling only ever creates
  `scheduled`, and the sole mutation is Cancel (`→cancelled`). A strict `status='completed'` filter
  would make the entire accountability system permanently read 0, defeating its purpose. A session
  whose start time has passed has, for all practical purposes, happened.
- **Alternatives:** Strict `status='completed'` (rejected — always 0 until a mark-completed feature
  exists); add a "mark completed" action this session (rejected — out of Phase 10 scope, one-feature-
  per-session rule). Revisit and tighten if/when a mark-completed action ships.

## 2026-06-17 — Phase 10 Coach Dashboard: white-lift metric cards, not literal sand-on-sand
- **Decision:** Metric cards use the established white-lift treatment (`bg-white/60 border-forest/12`,
  forest Bebas number) rather than the spec's literal "sand background", and the PENDING FEEDBACK card
  flips to forest/sand only when its value `> 0`. FEEDBACK DUE is placed ABOVE THIS WEEK despite being
  built second.
- **Why:** The dashboard sits on the sand page surface (`bg-sand`); a literal sand card would be
  invisible. White-lift matches AdminHome and the student widgets, keeping one card language. The
  forest/sand flip draws the eye to the only action-demanding metric. Feedback-due (the accountability
  system) is the highest-priority "owed work", so it ranks above the schedule per the UX checklist
  ("pending feedback + this week immediately visible").
- **Alternatives:** Literal sand cards (rejected — invisible); always-forest PENDING card (rejected —
  loses the "all clear" calm when 0); build-order layout with This Week first (rejected — buries the
  accountability list).

## 2026-06-17 — Phase 8F Sessions: `sessions.user_id` nullable, NO claim-gate on scheduling
- **Decision:** The new `sessions` table (migration 006) makes `user_id` (the student RLS subject)
  **nullable** — set from `students.user_id` at schedule time, which is NULL for an invited-but-
  unclaimed student. Unlike credits and feedback (which BLOCK unclaimed students), the SCHEDULE
  SESSION form on the admin StudentDetail page is **always available**. The reminder email goes to
  the roster `email` regardless of claim status.
- **Why:** A reminder email is useful before a student has claimed — you can book a first lesson the
  moment they're on the roster. Blocking would defeat the feature's main job. Trade-off accepted: the
  student's in-app "Next Session" widget only lights up once they claim (RLS keys on `user_id`), and
  a session scheduled while `user_id` is NULL won't auto-link on claim (no backfill in V1).
- **Alternatives:** Mirror the credits/feedback claim-gate (rejected — kills pre-claim scheduling,
  the email is the point); backfill `sessions.user_id` in `handle_new_user` on claim (deferred —
  extra trigger complexity for an edge case; revisit if pre-claim scheduling becomes common).

## 2026-06-17 — Phase 8F Sessions: honest toast + Vancouver-pinned email formatting
- **Decision:** (a) The schedule handler **awaits** the `send-session-reminder` call and shows
  "Session scheduled. Reminder sent." only on a real HTTP 200; on failure it shows "Session scheduled
  — but the reminder email didn't send." (diverges from the spec's fixed success string). (b) The
  Edge Function formats DATE/TIME with `Intl.DateTimeFormat` pinned to `America/Vancouver`.
- **Why:** (a) The toast must not claim an email was sent when it wasn't — honest reporting over a
  canned string. The session row is still created either way (DB insert is the source of truth; email
  is best-effort). (b) `scheduled_at` is stored UTC; Deno's default format zone is UTC, so an
  un-pinned formatter would print the wrong day/time. Pinning to the coach's zone makes the email read
  correctly ("Tuesday, June 24" / "10:00 AM") regardless of where the function runs.
- **Alternatives:** Fire-and-forget like the invite email's `.catch(console.error)` (rejected here —
  the invite UI keeps a copyable fallback link, but the session toast explicitly promises delivery, so
  it must reflect reality); send a pre-formatted date/time string from the client (rejected — keeps
  formatting/locale logic in one place server-side, and the client already sends the ISO instant).

## 2026-06-17 — Phase 8E Library: hard-code the 8 category folders in the front-end (not a distinct query)
- **Decision:** The student `/library` folder grid renders a **hard-coded** `CATEGORIES` array of the
  8 technique folders (forehand, backhand, footwork, serve, volley, slice, smash, mentality), always
  shown even at count 0 ("Coming soon"). Item counts/contents are derived client-side by normalized
  (`lowercase+trim`) matching against the loaded `curated_library` rows. A 9th **More** folder is
  rendered only when items carry a category outside the 8 (or null/legacy).
- **Why:** The spec requires "always show all 8 even if count is 0" — a `SELECT DISTINCT category`
  would only surface categories that already have videos, so empty folders would vanish. Hard-coding
  the canonical set guarantees the full grid renders against an empty/unseeded table, and keeps the
  folder keys (lowercase) identical to the values the coach select writes (Step 2), so matching is
  exact with no mapping table. The More folder is a safety net so a mistyped/legacy category never
  silently hides a coach's video.
- **Alternatives:** Query distinct categories from the DB (rejected — empty folders disappear, defeats
  the "always 8" requirement and the premium-shelf feel); a `library_categories` lookup table seeded
  by migration (rejected for V1 — over-engineered for a fixed single-coach taxonomy; revisit if the
  category set needs to be coach-editable). Emoji icons chosen as explicit placeholders (spec permits)
  over a bespoke SVG set, isolated in `CATEGORIES` so brand icons can swap in without layout changes.

## 2026-06-17 — Phase 8E Library: coach category is an optional constrained select, not required
- **Decision:** The admin Videos add form's Category became a `<select>` of the 8 lowercase folder
  values plus a leading `— Uncategorized —` (`value=""`). It is **not required**; an empty pick saves
  `null` (existing `form.category.trim() || null` logic, unchanged).
- **Why:** A constrained select prevents free-text typos that would scatter videos across phantom
  folders, while the optional `— Uncategorized —` pairs with the student-side **More** folder so a
  video is never *blocked* from saving for lack of a category. Lowercase stored values match the
  Library folder keys exactly (no normalization surprises).
- **Alternatives:** Keep free-text input (rejected — typos break folder matching); make category
  mandatory with no empty option, defaulting to `forehand` (rejected — risks silent miscategorization
  when the coach forgets to change it; the More folder makes "optional" safe). The admin page has no
  edit mode, so only the add form was changed.

## 2026-06-17 — Phase 8D Profile: avatar uploads immediately, `avatar_url` commits on Save
- **Decision:** In edit mode, picking a photo **uploads to Storage right away** (`uploadAvatar` →
  `avatars/{user_id}/avatar.{ext}`) and shows an instant local `objectURL` preview, but the
  resulting public URL is held in local state and written to `profiles.avatar_url` **only when the
  user hits Save** (folded into the same `updateStudentProfile` patch). Cancel leaves the DB pointer
  untouched. Save is disabled while an upload is in flight.
- **Why:** The user explicitly chose "upload immediately but commit on save." Uploading on file-pick
  gives a real public URL and lets the preview reflect the actual stored image; deferring the DB
  write to Save means a Cancel doesn't repoint the profile, and there's no orphaned `avatar_url`
  pointing at a half-edited session. Disabling Save mid-upload avoids committing a URL before its
  bytes exist.
- **Alternatives:** Upload-and-persist on the spot (rejected — Cancel couldn't undo it, and it
  diverges from the rest of the form's save-on-Save model); defer the **upload** itself to Save and
  only preview locally (rejected — Save would then block on a network upload and couldn't show the
  true stored image first). Known tradeoff logged in progress.md: the Storage object at the fixed
  path is overwritten on pick even if the user later cancels.

## 2026-06-17 — Phase 8D Profile: `updateStudentProfile` writes two tables; phone stays on `students`
- **Decision:** A single `db.js` `updateStudentProfile({ userId, profilePatch, studentId, phone })`
  helper persists the edit form: it `updateProfile`s the identity/tennis fields on `profiles`, then
  `updateStudent`s `phone` on the roster row **only if `studentId` is present**. Phone is NOT moved
  onto `profiles`; email stays read-only (auth-owned).
- **Why:** `profiles` and `students` share no FK (only the auth id), and `phone` already lives on the
  `students` roster row (there is no `profiles.phone` column — 8B noted phone is roster-only). One
  coordinating helper keeps the two-table write in the data layer (screens never touch supabase
  directly) and degrades gracefully for a profile with no roster row (phone simply skipped). Email is
  managed by Supabase Auth, so it's display-only here.
- **Alternatives:** Add a `profiles.phone` column and write everything to one table (rejected —
  schema change + duplicates the roster's phone, drift risk); two separate calls from the screen
  (rejected — puts orchestration in the component, against the db-layer rule); make email editable
  (rejected — changing an auth email needs a verification flow, out of scope).

## 2026-06-17 — Phase 8D Profile: re-implement onboarding chips in Tailwind (not import ClaimPage's)
- **Decision:** The edit form's chip selectors (gender + tennis fields) are a **Tailwind**
  re-implementation of the onboarding `Chips` pattern (pill row, solid forest when selected), not a
  shared import of `ClaimPage`'s `Chips` component.
- **Why:** `ClaimPage`'s `Chips` is styled by a scoped `<style>` block of plain CSS classes
  (`.chip`/`.chip.selected`) tied to that screen's prototype-verbatim stylesheet; importing it would
  drag that CSS context into the Tailwind-native Profile screen. Re-doing the same visual in Tailwind
  keeps Profile consistent with its own styling system while matching the onboarding look the brief
  asked for. Same value lists (HANDS/LEVELS/SURFACES/GENDERS) duplicated as small constants.
- **Alternatives:** Extract a shared `Chips` component used by both (deferred — `ClaimPage` is a
  working prototype-verbatim screen; refactoring it to a Tailwind shared component is restructuring a
  working file for no functional gain, hard-rule "ask before restructuring"); use `<select>`s
  (rejected — the brief explicitly requires the onboarding chip pattern, not plain selects).

## 2026-06-17 — Phase 8C Home: self-fetching widgets + merge `getStudentProfile` (no FK join)
- **Decision:** Build the student Home as small **self-fetching** components (`PlayerCard`,
  `LastFeedbackWidget`) rather than threading data down from `StudentDashboard`. `getStudentProfile`
  fetches `profiles` (by `id`) and `students` (by `user_id`) **in parallel and merges** instead of a
  PostgREST embedded join. The SESSIONS chip reads `student.sessions_count` with a `?? 0` fallback,
  even though no such column exists yet.
- **Why:** The spec used `<PlayerCard />` / `<LastFeedbackWidget />` with no props, so self-fetching
  is the natural fit and keeps `StudentDashboard` pure composition. `profiles` and `students` share
  **no foreign key** — only the same `auth.users` id (`profiles.id` = `students.user_id`) — so a
  PostgREST `select('…, students(*)')` embed isn't available; two null-safe (`maybeSingle`) reads +
  merge gives the same result without schema assumptions and degrades gracefully (incomplete or
  unclaimed students → `—` placeholders). `?? 0` keeps SESSIONS from showing `undefined` now and
  becomes correct the moment a real source is wired.
- **Alternatives:** Add a real FK / DB view to enable a single embedded join (rejected for now —
  schema change beyond this UI session); pass data as props from the dashboard (rejected — extra
  threading for no gain given the no-prop spec); omit SESSIONS until a column exists (rejected — the
  spec asked for the chip; a `0` placeholder is the honest interim, logged as a Known Issue).

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
