# Orquestração: Claude Code (coordenador) + Codex (executor via MCP)

> Princípio único: **o coordenador orquestra; o Codex coda.** Este documento é um *hábito de trabalho*,
> não um regulamento. Se em algum momento ele te fizer hesitar em vez de agir, ele falhou — simplifique.
> Não existe orquestração "Claude chat + Claude Code": o Claude.ai deste projeto produz **insumos**
> (planos de fase colados pelo coach em `memory-bank/planning/`), nunca coordena fase nem estado.

## O default (a inversão que faz isto funcionar)

Para trabalho de **implementação mecânica com escopo claro**, o reflexo é **delegar ao Codex** — não
parar pra decidir se "vale a pena". A pergunta certa não é *"vale delegar isto?"*; é **"há algum motivo
pra eu NÃO delegar esta implementação?"**. Se não há, delega.

O coordenador (Claude Code) **não** delega — faz ele mesmo — apenas: **decisões, estado e revisão.**
Isso é o núcleo, e cabe em três linhas:

- **Decide** — escopo da fase, arquitetura, schema, trade-offs, pré-condições, qualquer coisa que mude
  o rumo; e **todo o design visual** (o 55TC é identidade de marca, não implementação mecânica).
- **Detém o estado** — `memory-bank/*` (`activeContext.md`, `progress.md`, `decisions.md`,
  `planning/`), `/umb`, commit.
- **Revisa** — todo diff que o Codex devolve passa pelo seu olho antes de integrar.

Tudo o mais que for "escrever/editar código já especificado" é candidato natural a delegação. Não delegue
só por delegar: se a coisa é genuinamente trivial e você já está com o arquivo aberto, faça. Mas o piso
mudou — o esforço agora é *não* deixar de delegar por inércia.

Neste projeto o padrão de código é consistente e verificável: `src/lib/db.js` concentra o acesso a dados
(funções nomeadas + `unwrap()`), as telas seguem o mesmo esqueleto (fetch → estados loading/erro/empty →
render) e `npm run lint` + `npm run build` dão um alvo objetivo de aceite. Isso torna a delegação **mais**
segura, não menos: o contrato existe e o critério de pronto é executável.

## Gatilhos — pega você mesmo prestes a fazer isto → passa pro Codex

- Escrever uma função de `src/lib/db.js` cuja assinatura, tabela e filtros você já sabe descrever.
- Criar/refatorar um componente ou tela cujo layout e comportamento já foram decididos.
- Extrair um componente compartilhado de uma tela existente **preservando o render** (foi exatamente o
  caso do `SessionFeedbackView` na F1 Etapa 3).
- Escrever o corpo de uma migration SQL já especificada (aplicar é do coordenador — ver zonas proibidas).
- Corrigir erros de `npm run lint` / `npm run build` dentro de um diff já delimitado.
- Trabalho repetitivo no mesmo padrão em vários arquivos (renomear label em N telas, i18n, props).
- Escrever um transform determinístico de workflow n8n (o script Node de export→transform→import; **rodar
  contra o n8n vivo é do coordenador**).
- Você quer uma **segunda opinião / revisão adversarial** de um diff ou de um plano (ver padrão B).

Nudge (sinal, não regra): se a tarefa toca **≤ 2 arquivos e < ~80 linhas** e é mecânica, quase sempre é
Codex. Não é um teto — tarefas grandes e bem especificadas também vão, quebradas em pedaços atômicos.

## Como entregar (barato — sem cerimônia)

Um "task packet" é 5–7 linhas, não um documento:

```
Objetivo: <uma frase>
Arquivos permitidos: <lista curta>
Contrato/assinatura: <o que já está decidido — API, props, colunas, comportamento>
Critério de aceite: <como sei que ficou pronto>
Testes: npm run lint && npm run build  (limpos, sem novos warnings)
Proibido: <ver "Zonas proibidas"> + não rodar dev server, não tocar .env, não commitar
Sandbox: read-only | workspace-write
```

Regra de ouro do handoff: **cada rodada do Codex vê UM pedaço atômico + o contexto mínimo.** Não mande
o projeto inteiro; mande a decisão já tomada e a tarefa. Se precisar ajustar, use `codex-reply` no mesmo
thread — não abra tarefa nova.

Baseline do campo "Testes": **não há test runner neste projeto** (`CLAUDE.md §Stack`). O aceite é
`npm run lint` (eslint) + `npm run build` (vite) limpos — declare isso no packet, e nunca aceite "eu
verifiquei visualmente" como prova. Quando o comportamento importar de verdade (cálculo, parsing,
normalização), peça no packet um **script de teste offline descartável** rodado sem rede — foi o método
que provou o parsing multi-aluno da Fase E2 e o transform da F2.

Sempre inclua no packet, quando o diff tocar UI: **use somente os tokens 55TC** (forest `#1C3526`,
sand `#F5EDE0`, ink `#0D0D0D`, Bebas Neue / DM Sans) — planos de fase colados pelo coach às vezes trazem
cores off-brand (o dourado `#C8A96E` já foi rejeitado duas vezes); a Hard Rule do `CLAUDE.md` vence o doc.

## Sandbox é a segurança (não o Git)

O isolamento vem do **modo sandbox do Codex + `cwd`**, não de worktree:

| Modo | Codex pode | Use para |
|------|-----------|----------|
| `read-only` | ler, não escreve nada | explorar, revisar, segunda opinião, auditoria — **risco zero** |
| `workspace-write` | escrever confinado ao `cwd` | implementar/refatorar dentro de `/root/tennisos` |
| `danger-full-access` | tudo | nunca aqui — este host roda o **n8n de produção** do 55TC |

Chamadas automatizadas usam `approval-policy: never` (sem isso o Codex trava esperando aprovação
interativa). O `cwd` aponta pro diretório da tarefa (`/root/tennisos`).

**Worktree isolado é opcional.** Git já existe (`master`, remoto `origin` no GitHub — e **a Vercel builda
do GitHub**), então worktree é possível, mas só compensa quando há risco real de você e o Codex editarem
o mesmo arquivo ao mesmo tempo, isto é, em execução paralela. Fora disso, `workspace-write` + arquivos
permitidos já basta. Se usar: `/root/tennisos-worktrees/<fase>-codex`, branch `codex/<fase>-<desc>` —
e **nunca** uma branch que a Vercel possa buildar sem revisão.

## Zonas proibidas ao Codex (independem do sandbox)

Este repositório serve alunos reais em `portal.55tenniscrew.com`. Nenhum task packet autoriza tocar:

- `.env`, `.vercel/`, chaves Supabase/Anthropic/Gemini/Notion/Twilio/Resend, o deploy hook da Vercel —
  segredos são referenciados **pelo nome da variável**, nunca pelo valor, nem no packet nem no relatório.
- **Supabase ao vivo:** `supabase db push`, `db query`, `secrets set`, `functions deploy`, `storage cp`.
  O Codex pode *escrever* o SQL de uma migration ou o código de uma Edge Function; **aplicar e deployar
  é do coordenador**, com aprovação, contra o projeto `vdyvlylacsghnvtllrzj`.
- **n8n ao vivo:** `n8n import:workflow` / `update:workflow` / `import:credentials` / `pm2 restart n8n`,
  e qualquer POST a `n8n.55tenniscrew.com`. O Codex pode escrever o transform; aplicar não.
- **Deploy e Git remoto:** `git push`, o deploy hook da Vercel, a skill `deploy-prod`. O Codex **nunca**
  faz commit, push ou deploy — nem "só o commit".
- **Dados de alunos:** linhas reais de `students`/`profiles`/`feedbacks`/`sessions`, emails, telefones,
  vídeos e textos de feedback são PII de terceiros e não entram em task packet nem vão a serviço externo.
- **Chamadas pagas:** Gemini (análise de vídeo), Anthropic, Resend, Twilio — nenhuma é delegável, nem
  implícita.
- **Estado central:** `memory-bank/*`, `/umb`, `CLAUDE.md`, `AGENTS.md`, este documento.

Se um pedaço da tarefa exigir uma dessas, ele não é delegável — volta pro coordenador e, se for ação
externa, pro gate humano (o coach).

## Dois padrões de uso (memorize estes)

**A — Implementação delegada.** Você decide o contrato → task packet → `codex` com
`sandbox: workspace-write`, `approval-policy: never` → recebe o diff + relatório → **você revisa** →
integra → valida (`npm run lint` + `npm run build`) → mostra o `git diff` ao coach → aprovação → aplica
o que for live (migration/função/n8n) → `/umb`. Para tarefas grandes: quebre em pedaços atômicos e faça
fan-out (vários `codex` em paralelo), cada um com um pedaço + o mesmo contrato.

**B — Segunda opinião / revisão (risco zero, use sempre que estiver em dúvida).** `codex` com
`sandbox: read-only` pedindo revisão adversarial de um diff, plano ou trecho: "o que quebra? o que está
frágil? o que eu não vi?". O Codex não altera nada; você decide o que aproveitar. É o uso mais barato e
subutilizado. Casos naturais aqui: revisar um plano de fase **antes** de pedir aprovação ao coach; auditar
um diff que toca RLS, `user_id`, `status='draft'|'published'` ou o guard de uma Edge Function; procurar
regressão em refatoração de `db.js` ou de uma tela do aluno.

## Invariantes que permanecem (curtas)

- **Uma feature = uma sessão = `/umb` = parada.** O Codex nunca escolhe a próxima fase.
- **Auto mode OFF.** Plano → aprovação do coach → aplicar → `git diff` → aprovação → commit. Delegar não
  pula nenhum desses passos; o packet só entra **depois** que o plano foi aprovado.
- **Estado central é só do coordenador.** O Codex não edita `memory-bank/*` nem roda `/umb`
  (ver "UMB no Codex" em `AGENTS.md` para quando o Codex *for* o agente da sessão).
- **Ordem de deploy é sagrada:** commit → `git push origin master` → deploy hook → verificar o commit em
  produção, sempre pela skill `deploy-prod`. A Vercel builda do GitHub, não do local. Nunca delegada.
- **Tokens 55TC** sobrevivem a qualquer delegação: forest/sand/ink, Bebas Neue + DM Sans, sand sobre
  forest e ink sobre sand — nunca invertido. Cor off-brand em diff do Codex é motivo de rejeição.
- **Ações externas/irreversíveis** (migration live, deploy de Edge Function, alteração de workflow n8n,
  push, deploy hook, `secrets set`, email real, chamada paga) exigem gate humano e nunca são delegadas
  nem implícitas.
- **Dados sensíveis** (segredos, PII de alunos, conteúdo real de feedback) nunca entram num task packet.

## Setup

Escopo local — privado a você neste diretório:

```bash
claude mcp add --scope local --transport stdio codex-worker -- codex mcp-server
```

Verificar com `/mcp` ou `claude mcp list` — deve aparecer `codex-worker: ✔ Connected`. Ferramentas
expostas: `codex` (inicia thread) e `codex-reply` (continua thread pelo id).
Configurado e verificado em 2026-08-07: `codex-worker: ✔ Connected`, `codex-cli 0.145.0`.

> As ferramentas MCP são carregadas no **início** da sessão. Após adicionar/alterar o `codex-worker`,
> **reinicie a sessão do Claude Code** para que `codex`/`codex-reply` fiquem chamáveis. Verificação
> pós-reinício: `/mcp`. Rollback: `claude mcp remove codex-worker -s local`.
