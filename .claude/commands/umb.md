---
description: Update Memory Bank — sync activeContext + progress, log decisions, then commit.
---

Run the **Update Memory Bank** routine. Do this carefully and in order:

1. **Review the session.** Look at what changed this session (git diff/status, what we built or decided).
2. **Update `memory-bank/activeContext.md`** to reflect the current state: Current Focus,
   Recent Changes, Next Steps, and any Open Questions / Blockers.
3. **Update `memory-bank/progress.md`**: move items between What Works / In Progress / Not Started,
   and record any Known Issues.
4. **Append new decisions** to `memory-bank/decisions.md` (newest at top, above the marker line).
   Use the format: date — decision — why — alternatives. Only append; never rewrite history.
5. **Update `memory-bank/architecture.md`** only if the architecture actually changed.
6. **Commit.** `git add -A` then commit with a clear, specific message summarizing the session.

Do not push unless I ask. If nothing meaningful changed, say so instead of committing noise.
