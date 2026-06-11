---
description: Run lint + build + test, summarize the diff, then commit.
---

Ship the current work. Do this in order and stop if a step fails:

1. **Lint** — run the lint command (see CLAUDE.md). Fix or report failures.
2. **Build** — run the build command. Must pass before continuing.
3. **Test** — run the test command. Must pass before committing.
4. **Summarize the diff** — show me a concise summary of `git status` + `git diff --stat`
   and the key changes, grouped by what they accomplish.
5. **Commit** — once 1–3 pass, `git add -A` and commit with a clear message.

If any of lint/build/test fail, stop and show me the output — do not commit broken code.
Do not push unless I ask. If a command is still a placeholder in CLAUDE.md, note that and skip it.
