---
description: Read-only server/codebase inventory (Phase 1 — definition pending).
---

Run a **read-only** audit of the server and codebase. This command makes **no changes** —
no edits, no installs, no commits. Produce a concise inventory only.

> **Phase 1 — to be defined.** The full audit scope will be specified when we reach Phase 1.
> Until then, when invoked, do a best-effort read-only inventory and flag that the scope is provisional.

Provisional inventory to gather (read-only):
- Repo structure: top-level dirs, key config files, package manager + scripts.
- Stack & dependencies: frameworks, notable libraries, versions.
- Environment: required env var **names** only (never values), `.env*` presence.
- Data layer: schema/migrations location, if any.
- Memory-bank state: current focus and progress.
- Anything risky or surprising (secrets in code, large/uncommitted files, TODOs).

Delegate broad file scanning to the **explorer** subagent and return only the summary.
Output a tight, structured report. Do not modify anything.
