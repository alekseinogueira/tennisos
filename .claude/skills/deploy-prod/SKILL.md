---
name: deploy-prod
description: Deploy TennisOS to production on Vercel. Use ALWAYS and BEFORE any deploy action — whenever deploying, shipping, releasing, publishing, pushing to production, updating the live site (tennisos.vercel.app / portal.55tenniscrew.com), or firing the Vercel deploy hook. Enforces the mandatory order push-to-GitHub THEN deploy-hook, and verifies prod is serving the expected commit.
---

# Deploy TennisOS to Production

Critical: this project does NOT auto-deploy on a local commit, and the Vercel
deploy hook builds from the **GitHub source**, not the local repo. If the hook
fires before the new commit is on GitHub, Vercel rebuilds the OLD commit and
production silently stays stale. So the order below is mandatory — never skip or
reorder steps.

## Procedure (do in order; stop and report if a step fails)

1. **Confirm the commit exists locally.**
   ```bash
   cd ~/tennisos
   git status
   git log --oneline -5
   ```
   If there are uncommitted changes that should ship, commit them first with a
   clear message (follow the repo's commit conventions). Working tree must be clean.

2. **Push to GitHub — this MUST happen before the hook.**
   ```bash
   git push origin master
   ```
   Then verify the remote actually advanced:
   ```bash
   git log origin/master --oneline -1
   ```
   `origin/master` must show the commit you intend to deploy. If it doesn't, do
   not fire the hook — fix the push first.

3. **Fire the Vercel deploy hook (only after the push is confirmed).**
   ```bash
   curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_a82osi0uQFvlJfVjLZMdF2wQTfNI/51HyBK3W7X"
   ```
   A successful response returns a job with a `state` (e.g. `PENDING`) and an `id`.
   Report the job id back.

4. **Verify production serves the expected commit.**
   Tell the user to confirm in Vercel → project **tennisos** → **Deployments**
   that the Production deployment is built from the commit pushed in step 2.
   - If production shows an OLD commit, the problem is the **deploy flow**, not
     cache and not code: re-check `git log origin/master --oneline -1`, re-push if
     needed, and re-fire the hook (step 3).

## Hard rules

- Never assume a local commit deploys itself.
- Never assume the deploy hook alone is enough — `git push origin master` first.
- `git push` alone is also not enough — the hook must be fired manually after.
- The correct sequence is always: **commit → push to GitHub → fire deploy hook → verify commit in Vercel.**
