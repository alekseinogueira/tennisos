#!/usr/bin/env bash
# PreToolUse(Bash) guard for the TennisOS Vercel deploy hook.
#
# The Vercel deploy hook builds from the GitHub source, NOT the local repo.
# Firing it before the local commit is pushed makes Vercel rebuild the OLD
# commit and silently leave production stale. This hook blocks the deploy-hook
# curl until the current HEAD is actually on origin/master.
#
# Reads the PreToolUse JSON payload on stdin. Exit 0 = allow, exit 2 = block
# (stderr is shown to Claude).

set -euo pipefail

DEPLOY_HOOK_PATH="integrations/deploy/prj_a82osi0uQFvlJfVjLZMdF2wQTfNI"

cmd="$(jq -r '.tool_input.command // ""')"

# Not the deploy hook — let it through untouched.
case "$cmd" in
  *"$DEPLOY_HOOK_PATH"*) ;;
  *) exit 0 ;;
esac

# Is the current commit already on origin/master?
if git merge-base --is-ancestor HEAD origin/master 2>/dev/null; then
  exit 0
fi

local_head="$(git rev-parse --short HEAD 2>/dev/null || echo '?')"
remote_head="$(git rev-parse --short origin/master 2>/dev/null || echo 'unknown')"

cat >&2 <<EOF
BLOCKED: deploy hook fired before the commit reached GitHub.

  local HEAD     = $local_head
  origin/master  = $remote_head

The Vercel deploy hook builds from GitHub, not your local repo — firing it now
would rebuild the OLD commit and leave production stale.

Run this first, then fire the hook again:

  git push origin master

(See the deploy-prod skill for the full flow.)
EOF
exit 2
