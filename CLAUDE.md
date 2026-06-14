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
- Deploy ONLY via the `deploy-prod` skill. Order is mandatory: commit → `git push origin master`
  → fire the Vercel deploy hook → verify the Production commit. Never fire the hook before the
  push (Vercel builds from GitHub, not local — see the `deploy-prod` skill / `.claude/hooks/guard-deploy.sh`).

## Visual Tokens (55TC)
- Forest green `#1C3526` (primary)
- Warm sand `#F5EDE0` (background)
- Near-black `#0D0D0D` (text)
- Display font: **Bebas Neue**
- Body font: **DM Sans**

## Memory
At the start of every task, read `memory-bank/activeContext.md` and `memory-bank/progress.md`.
Read other memory-bank files only when the task needs them.

## 55TC Design Spec (fonte de verdade: 55tenniscrew.com)

CORES: forest #1C3526 · sand #F5EDE0 · ink #0D0D0D
- Texto sand SEMPRE sobre forest. Texto ink SEMPRE sobre sand. Nunca inverter.
- Motif de quadra SVG (linhas em sand 6% opacity) em TODA tela com bg forest.

TIPOGRAFIA:
- Bebas Neue: headlines MAIUSCULAS, letter-spacing min 0.1em, line-height 0.9-1.
- DM Sans: body normal. Labels MAIUSCULAS + letter-spacing 0.2em (inputs, badges, eyebrows).
- Padrao eyebrow: DM Sans uppercase tracking largo acima de titulo Bebas Neue.

BOTOES primarios: bg forest, texto sand, UPPERCASE, letter-spacing 0.1em, border-radius max 4px.

TAGLINE: Less Theory. More Game. - usar em boas-vindas do aluno, empty states, footer.

VOZ: direta, sem jargao. Empty states humanizados. Erros diretos e humanos.

LAYOUT: max-w-5xl centrado, padding vertical generoso, flat sem sombras dramaticas.
