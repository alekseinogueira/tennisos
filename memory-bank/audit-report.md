# Audit Report — Server & Codebase Inventory

> Read-only audit run 2026-06-11 via `/audit` + the **explorer** subagent. Nothing was modified.
> Scope is provisional (Phase 1 audit definition still pending). Env file **contents were never read** —
> existence confirmed only.

## 1. What Exists

**Host:** DigitalOcean server (Linux). nginx (80/443) + Certbot TLS front the public services.

**Projects:**
- `/root/tennisos` — this repo. Git initialized, **0 commits**, context scaffold only (CLAUDE.md + memory-bank). No code/package.json.
- `/root/english-performance-coach` — React 19 + Vite + Tailwind + Supabase. Client-side coaching app. Has `.env` (7 lines, Supabase keys).
- `/root/agente_cortes` — Python FastAPI service (port 8000), **running 17 days**. WhatsApp → video automation (Claude, Twilio, Google/YouTube). Has `.env` (84 lines). File-based jobs in `jobs/` (25+ UUID folders). Not a git repo.
- `/root/hairbykathely` — Static HTML site, Vercel-hosted. Git repo with commits. Beauty service portal.
- `/root/n8n-skills` — n8n workflow SDK learning repo. 3 sample workflow JSONs in `evaluations/`. Git repo.
- `/var/www/55tc-site` — Static HTML/CSS/assets for **55tenniscrew.com**. Served by nginx. No build, no API.
- `/root/.n8n` — n8n data dir. SQLite DB (~2.4 MB), encryption key, event logs.

**Running services:** n8n (PID 88591, port 5678, 17d uptime) + its task-runner; agente_cortes FastAPI (8000); two idle `python -m http.server` on 3000 & 8080 (23–24d, no clear owner); nginx; Docker `bgutil` container (4416, used by agente_cortes).

**Data layer:** Only SQLite (n8n). No Postgres/MySQL/Mongo. english-performance-coach uses hosted Supabase.

**Env files:** `/root/english-performance-coach/.env`, `/root/agente_cortes/.env` (+ `.env.example` companions). **None** in tennisos, 55tc-site, or n8n-skills.

## 2. What's Related to TennisOS / 55TC

- **`/var/www/55tc-site`** — the live 55TC marketing site (55tenniscrew.com). Brand-adjacent but static; not the portal.
- **`n8n` (`/root/.n8n`, `n8n.55tenniscrew.com`)** — automation engine already on the 55TC subdomain. The natural backend for TennisOS workflows (intake, reminders, feedback pipelines).
- **`/root/tennisos`** — the new project itself (empty scaffold).
- Indirectly relevant as patterns: `english-performance-coach` (a coaching portal with auth/data — closest architectural cousin), `agente_cortes` (messaging automation pattern).

Nothing existing **is** the student portal — that doesn't exist yet.

## 3. Reusable (and why)

- **n8n instance** — already running, TLS-proxied on a 55TC subdomain. Strong reusable backbone for TennisOS automations (booking confirmations, feedback collection, notifications). Avoids rebuilding workflow infra. *(Clears framework: real problem + reusable.)*
- **nginx + Certbot setup** — proven reverse-proxy/TLS pattern to copy for a `portal.55tenniscrew.com` subdomain.
- **english-performance-coach** — reference architecture: React + Supabase + auth + `.env` conventions. Reusable as a *blueprint*, not as a base to fork (different domain).
- **55TC brand assets** in `/var/www/55tc-site` — logos/colors/fonts to keep TennisOS on-brand.
- **n8n-skills workflows** — reusable templates for wiring n8n into the portal.

## 4. Archive (and why)

- **Two orphan `python -m http.server` (ports 3000, 8080)** — idle 23–24 days, no identifiable owner. Candidates to stop/document once confirmed unused. *(Audit is read-only — flagged, not touched.)*
- **`agente_cortes/jobs/` (25+ cached UUID folders)** — accumulating job artifacts never cleaned up. Archive/prune candidate (separate project, not TennisOS).

## 5. Ignore (and why)

- **`/root/hairbykathely`** — unrelated client (beauty), different brand. No TennisOS relevance.
- **`/root/agente_cortes`** (the service itself) — unrelated YouTube/WhatsApp tooling; only its messaging pattern is of passing interest. Leave running, don't touch.
- **`node_modules`, build output, SQLite internals** — standard ignore.
- **All `.env` files** — never read, never copy. Each project owns its own secrets.

---

**Recommendation:** **Start fresh** in `/root/tennisos` for the portal app — but **build on the existing n8n + nginx/TLS + 55TC brand infrastructure** rather than reinventing it. No existing project is a sensible base to fork; english-performance-coach is a reference blueprint only.
