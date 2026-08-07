# TennisOS — instruções compartilhadas para agentes

Instruções para Codex, Claude Code e qualquer outro agente que trabalhe neste repositório.
As regras completas de produto, stack e marca estão em **`CLAUDE.md`** — leia-o primeiro.
O modelo de orquestração está em **`docs/ORQUESTRACAO.md`**.

Portal do aluno + OS interno da **55 Tennis Crew (55TC)**, no ar em `portal.55tenniscrew.com`.
Stack: React 19 + Vite + react-router-dom v7 + Tailwind v4 + supabase-js v2, na Vercel.
Comandos: `npm run dev` · `npm run build` · `npm run lint` · **sem test runner**.

## Regras rígidas (resumo — a fonte é `CLAUDE.md`)

- Nunca revelar, imprimir, hardcodar ou commitar segredos. Nunca ler valores de `.env` quando o nome
  da variável basta. PII de alunos (email, telefone, feedbacks reais) nunca sai do banco.
- Sempre perguntar antes de deletar, sobrescrever ou reestruturar arquivos existentes.
- Uma feature por sessão. Ao concluir, `/umb` e parar. Não iniciar a próxima sozinho.
- **Auto mode OFF:** plano → aprovação → aplicar → `git diff` → aprovação → commit.
- Só tokens 55TC: forest `#1C3526` · sand `#F5EDE0` · ink `#0D0D0D`, Bebas Neue + DM Sans. Texto sand
  sempre sobre forest, ink sempre sobre sand. Cor ou fonte off-brand não entra, mesmo que um plano peça.
- **Deploy só pela skill `deploy-prod`**, nesta ordem: commit → `git push origin master` → deploy hook
  da Vercel → verificar o commit em produção. A Vercel builda do GitHub, não do local.
- Ação externa/irreversível (migration live, deploy de Edge Function, alteração de workflow n8n, push,
  hook, `supabase secrets set`, email real, chamada paga a Gemini/Anthropic) exige aprovação humana.

## Memory Bank

No início de toda tarefa, leia `memory-bank/activeContext.md` e `memory-bank/progress.md`.
Antes de iniciar uma fase nova, leia também o doc correspondente em `memory-bank/planning/`.
Os demais arquivos do Memory Bank, só quando a tarefa exigir.

## Orquestração (Claude Code + Codex)

Princípio: **o coordenador orquestra; o Codex coda.** Modelo detalhado em `docs/ORQUESTRACAO.md`.

- **Claude Code = coordenador.** Dono do estado central (`memory-bank/*`, `/umb`, commit), das decisões
  (escopo, arquitetura, schema, **design visual**) e da revisão de todo diff.
- **Codex (via MCP `codex-worker`) = executor.** Implementa o que já foi especificado, refatora, corrige
  lint/build. Nunca toca o estado central, nunca escolhe a fase, nunca faz commit/push/deploy.
- **Default (reflexo):** para implementação mecânica de escopo claro, **delegar ao Codex** — a pergunta
  não é "vale delegar?" e sim "há motivo pra eu NÃO delegar isto?". Não delegar por inércia; também não
  forçar quando é genuinamente trivial. Isolamento vem do **sandbox do Codex** (`read-only` /
  `workspace-write`), não de Git; worktree é opcional e só compensa em execução paralela.
- **Segunda opinião (risco zero):** `codex` em `sandbox: read-only` para revisão adversarial de um diff
  ou de um plano de fase é o uso mais barato e vale sempre que houver dúvida.
- **Zonas proibidas ao Codex, sempre:** `.env`/`.vercel/`/qualquer chave; Supabase ao vivo (`db push`,
  `db query`, `secrets set`, `functions deploy`, `storage cp`); n8n ao vivo (`import:workflow`,
  `update:workflow`, `pm2 restart`, POST ao webhook); `git push`, deploy hook e a skill `deploy-prod`;
  dados reais de alunos; chamadas pagas; `memory-bank/*`, `CLAUDE.md`, `AGENTS.md`, `docs/ORQUESTRACAO.md`.
  `danger-full-access` **nunca** — este host roda o n8n de produção do 55TC.

O Claude.ai é usado apenas para **preparar insumos** (planos de fase que o coach cola em
`memory-bank/planning/`); não existe orquestração "Claude chat + Claude Code", e o Claude.ai nunca
executa fase, toca o repo nem declara estado.

## UMB no Codex

`/umb` é um slash command do Claude Code e não deve ser presumido no Codex. No Codex, "executar UMB"
significa seguir manualmente, na ordem, os passos de `.claude/commands/umb.md`, produzindo as mesmas
atualizações em `memory-bank/activeContext.md`, `progress.md` e `decisions.md`.

## Git, push e deploy

- Branch principal: **`master`** (não `main` — alguns docs de planejamento erram nisso). Remoto `origin`
  no GitHub; **a Vercel builda a partir do GitHub**.
- **COMMIT não implica PUSH; PUSH não implica DEPLOY verificado.** Commit só com a fase autorizando e
  após `npm run lint` + `npm run build` limpos. Push e deploy nunca são implícitos.
- Fora do Git e nunca sob controle do Codex: Supabase (projeto `vdyvlylacsghnvtllrzj`), Edge Functions,
  secrets, workflows n8n, DNS/domínio e a configuração da Vercel.
