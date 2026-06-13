# TennisOS Personal V1

Student portal + internal OS for **55 Tennis Crew (55TC)** — my tennis coaching business.
Single-coach tool first; build only what solves a real, recurring problem for me.

## Stack & Commands
- Stack: React 19 + Vite + react-router-dom v7 + Tailwind v4 + supabase-js v2, on Vercel
- Package manager: npm
- Dev:   `npm run dev`       <!-- vite -->
- Build: `npm run build`     <!-- vite build -->
- Lint:  `npm run lint`      <!-- eslint . -->
- Test:  none yet            <!-- no test runner configured -->
- Install: `npm install` (copy `.env.example` → `.env` and set VITE_SUPABASE_* first)

## Hard Rules
- Never expose, print, or hardcode secrets. Use env vars; never commit `.env`.
- Always ask before deleting, overwriting, or restructuring existing files.
- One feature per session. End every session by updating memory-bank and committing.
- Match the 55TC visual tokens below — no off-brand colors or fonts.

## Visual Tokens (55TC)
- Forest green `#1C3526` (primary)
- Warm sand `#F5EDE0` (background)
- Near-black `#0D0D0D` (text)
- Display font: **Bebas Neue**
- Body font: **DM Sans**

## Memory
At the start of every task, read `memory-bank/activeContext.md` and `memory-bank/progress.md`.
Read other memory-bank files only when the task needs them.
