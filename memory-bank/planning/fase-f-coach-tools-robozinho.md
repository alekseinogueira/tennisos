# Fase F — Coach Tools + Robozinho (TennisOS v2)

Documento de planejamento. Segue o padrão dos documentos anteriores.
Cole as seções "Prompt de Execução" no Claude Code, uma etapa por vez,
com aprovação explícita entre cada uma (auto mode OFF, diff antes de aplicar).

---

## CONTEXTO — POR QUE ESTA FASE EXISTE

Com a Fase D concluída (portal do aluno com feedback rico), o sistema está
completo do ponto de vista do aluno. O que ainda falta é a experiência do
**coach como operador** — as ferramentas que Aleksei usa no dia a dia para
gerir o negócio sem fricção.

Esta fase também registra e inicia o planejamento do **Robozinho** — produto
de análise técnica por IA, independente do coaching presencial, com modelo
de créditos e potencial de escala além dos alunos atuais do 55TC.

---

## FRENTES DESTA FASE

### F1 — Home do Coach redesenhada (PRIORIDADE 1)
### F2 — Tela de disparo de análise: manual + vídeo (PRIORIDADE 2)
### F3 — Robozinho: análise técnica por frames (MÉDIO PRAZO — documentado aqui, construído depois)

---

## F1 — HOME DO COACH REDESENHADA

### Problema atual
A Home do coach (Coach HQ) já existe mas é passiva — mostra métricas e
listas. Não tem ferramentas de ação rápida integradas. Para agendar uma
aula, o coach precisa navegar para outra tela. Para reagendar, não tem
fluxo definido. Para ver feedbacks pendentes, precisa procurar.

### O que precisa existir na Home

**Bloco 1 — Agendar Treino (ferramenta de ação rápida)**
- Seletor de alunos múltiplos estilo "criar grupo de WhatsApp": lista de
  todos os alunos ativos, o coach vai selecionando quem vai participar
  (checkbox ou tap, visual de avatares empilhados conforme seleciona)
- Campos: data, hora, local (campo livre ou lista de locais frequentes)
- Ao confirmar: cria a sessão no Supabase + dispara email de confirmação
  para cada aluno selecionado (mesmo sistema de email já existente)

**Bloco 2 — Gerenciar Treinos Próximos**
- Lista das próximas sessões agendadas (próximos 7-14 dias)
- Cada sessão: data, hora, local, alunos
- Ações inline por sessão:
  - **Reagendar**: abre modal com novos campos de data/hora → ao confirmar,
    atualiza no Supabase + dispara novo email de confirmação para os alunos
  - **Cancelar**: remove a sessão + notifica alunos
  - **Editar**: altera qualquer campo

**Bloco 3 — Feedback Due (pendentes de aprovação)**
- Lista de feedbacks gerados pela IA que ainda não foram publicados
  (Status = "Rascunho" ou "Revisão" no Notion / Supabase)
- Cada item: nome do aluno, data da sessão, botão "Revisar"
- Clicar em "Revisar" abre a prévia completa do feedback (igual ao que
  o aluno vai ver) com opção de edição rápida inline antes de publicar
- A IA já preenche a "Análise do Coach" baseada no contexto do aluno
  e no que o Gemini gerou — o coach lê, edita se quiser, e aprova

**Bloco 4 — Métricas rápidas (já existe, manter)**
- Alunos ativos, sessões do mês, feedbacks do mês

### Decisões de design
- Mobile-first (coach opera pelo celular, não pelo desktop)
- Paleta existente: #F5EDE0, #1B3A2D, #C8A96E
- Ações destrutivas (cancelar) sempre com confirmação
- Reagendamento dispara novo email automaticamente, sem opção de suprimir
  (para v1 — v2 pode ter toggle "notificar aluno")

---

## F2 — TELA DE DISPARO DE ANÁLISE

### Problema atual
Hoje o disparo do workflow de análise é feito colando o `file_id` do Google
Drive manualmente numa chamada de API/webhook. Não existe interface para isso.
O coach precisa saber o ID do arquivo, abrir um terminal ou usar uma ferramenta
externa, e disparar manualmente. Isso é fricção demais para uso diário.

### O que precisa existir

**Dois caminhos, uma tela de entrada:**

Ao clicar em "Novo Feedback" (botão na Home ou na aba Feedbacks), o coach
escolhe o caminho:

---

**CAMINHO A — Manual**
O coach preenche o feedback inteiramente sem vídeo. Útil para:
- Aulas onde não houve gravação
- Feedback rápido de observação
- Correção/complemento de feedback gerado por IA

Fluxo:
1. Seleciona o aluno
2. Preenche os campos do feedback (todos os mesmos campos que já existem
   no schema: ratings, focos, análise, objetivos, etc.)
3. A IA preenche automaticamente a "Análise do Coach" baseada no contexto
   acumulado do aluno (histórico de sessões, pontos de melhoria anteriores,
   nível atual) — o coach edita se quiser
4. Ao confirmar: cria entrada no Supabase com Status = "Publicado" direto
   (sem passar pelo Notion, já que não há vídeo/análise Gemini envolvida)
5. Aluno recebe email de notificação

---

**CAMINHO B — Vídeo (análise por IA)**
O coach sobe um vídeo e o sistema gera o feedback automaticamente.

Fluxo:
1. Upload do vídeo (ou cola URL do Google Drive)
2. Seleção dos alunos que participaram daquela sessão (mesmo seletor
   estilo "grupo de WhatsApp" do Bloco 1 da Home)
3. Campo de texto opcional: "dicas de diferenciação" — o coach descreve
   características visuais de cada aluno para ajudar o Gemini a diferenciar
   quem é quem (ex: "João: camiseta azul, lado esquerdo; Maria: boné branco")
4. Ao confirmar: dispara o webhook do workflow n8n existente com o payload
   `{ file_id, session_date, students: [{student_id, name, visual_cue}] }`
5. Sistema processa (Gemini analisa, gera rascunho no Notion)
6. Quando pronto, feedback aparece em "Feedback Due" na Home para revisão
   e aprovação antes de publicar

**Mecanismo de aprendizado (v1 simples):**
A cada análise concluída e aprovada, o sistema salva na tabela do aluno
(ou numa tabela separada `student_visual_profile`) as características visuais
confirmadas. Na próxima análise com o mesmo aluno, essas características
são incluídas automaticamente no payload como `visual_cue` — o coach não
precisa descrever de novo. O coach pode editar/complementar se quiser.

---

## F3 — ROBOZINHO (VISÃO DE PRODUTO — MÉDIO PRAZO)

### O que é
Produto de análise técnica de tênis por IA, acessível de forma independente
do coaching presencial. Não é uma extensão do portal do aluno — é um produto
separado (ou uma aba separada dentro do portal, com acesso por créditos).

### Visão completa (produto ideal)
- Usuário sobe vídeo de si mesmo batendo bola (protocolo definido: 2 min
  de costas, 2 min de lado, 2 min de frente — ~10-15 min total)
- Sistema extrai frames-chave do movimento
- Para cada frame: mostra o que o usuário fez, o que deveria ter feito,
  com referência em dados de jogadores profissionais
- Gera card/página interativa por movimento analisado
- Dados ficam salvos: nas próximas análises, o sistema já parte do
  histórico acumulado desse usuário (o que melhorou, o que ainda persiste)
- Comparação lado a lado de execuções entre treinos diferentes
- Modelo de créditos: cada análise custa $5 (ou similar)
- Dois públicos: alunos do 55TC (compram créditos como add-on) e
  qualquer pessoa de fora (acessa de forma independente)

### Versão protótipo viável hoje (V0)
Tecnologia de síntese de vídeo (mostrar o usuário executando com técnica
corrigida) ainda é cara e instável. O protótipo começa por **frames estáticos**:

1. Usuário sobe vídeo de 2-3 minutos
2. Sistema (Gemini) extrai 5-6 frames-chave do movimento principal
   (forehand, backhand, saque — dependendo do que foi filmado)
3. Para cada frame: Gemini analisa posição de pernas, quadris, braços,
   cotovelos, ombros, cabeça, ponto de contato
4. Claude gera o card de análise daquele frame:
   - Frame original (screenshot)
   - O que está sendo feito
   - O que deveria estar diferente (com referência a padrão técnico)
   - Instrução prática de aplicação (linguagem de foco externo — bola,
     alvo, espaço — nunca "mova seu cotovelo")
5. Conjunto de cards forma o relatório completo da sessão
6. Dados salvos para comparação futura

### Memória acumulativa (diferencial do produto)
- Cada análise aprovada alimenta o perfil técnico do usuário
- Próxima análise: sistema já sabe os padrões recorrentes, o que melhorou,
  o que persistiu
- Interface de comparação: execução treino A vs treino B, frame a frame
- Isso transforma o produto de "análise isolada" em "coach de evolução
  contínua" — justifica recorrência e recompra de créditos

### Stack necessária (além do que já existe)
- Extração de frames: `ffmpeg` (já no servidor) ou Gemini Video API
  (já integrado) — Gemini pode identificar timestamps de frames-chave
- Armazenamento de frames: Supabase Storage (bucket novo `analysis-frames`)
- Schema novo: tabela `frame_analyses` (user_id, session_id, frame_url,
  movement_type, analysis_json, timestamp)
- Tabela `student_technical_profile` (user_id, movement_type, patterns_json,
  updated_at) — memória acumulativa
- Frontend: nova rota `/analyze` ou produto separado com auth própria
- Modelo de créditos: Stripe (já previsto no stack) — produto "Análise
  Técnica", $5/crédito, 1 crédito = 1 sessão de análise

### O que NÃO construir ainda
- Síntese de vídeo (mostrar usuário executando com técnica corrigida) —
  tecnologia cara e instável, V2 ou V3
- App mobile nativo — PWA ou web responsiva resolve para o protótipo
- Múltiplos movimentos por análise — começa com 1 movimento por sessão,
  expande depois

---

## ORDEM DE EXECUÇÃO

### Fase F1 — Home do Coach (primeira)
Etapa 1: Bloco "Agendar Treino" com seletor múltiplo de alunos
Etapa 2: Bloco "Gerenciar Treinos Próximos" com reagendar/cancelar/editar
Etapa 3: Bloco "Feedback Due" com prévia e edição inline
Etapa 4: Deploy

### Fase F2 — Tela de Disparo (segunda, após F1)
Etapa 1: Caminho Manual (form + IA preenche análise + publica direto)
Etapa 2: Caminho Vídeo (upload/URL + seletor de alunos + visual_cue)
Etapa 3: Mecanismo de aprendizado (salvar visual_cue confirmado por aluno)
Etapa 4: Deploy

### Fase F3 — Robozinho (médio prazo, após F1 e F2 validadas)
Etapa 0: Definir protocolo de filmagem (o que o usuário deve gravar e como)
Etapa 1: Pipeline de extração de frames + análise Gemini
Etapa 2: Card de análise por frame (Claude gera, frontend renderiza)
Etapa 3: Schema de memória acumulativa (student_technical_profile)
Etapa 4: Interface de comparação entre treinos
Etapa 5: Modelo de créditos (Stripe)
Etapa 6: Acesso externo (sem vínculo com conta 55TC)

---

## PROMPTS DE EXECUÇÃO

### F1 — Etapa 1: Agendar Treino

```
Nova sessão — Fase F1, Etapa 1. Auto mode OFF.
Leia CLAUDE.md, memory-bank/activeContext.md, memory-bank/progress.md
e memory-bank/planning/fase-f-coach-tools-robozinho.md antes de qualquer ação.

Objetivo: adicionar um bloco "Agendar Treino" na Home do coach (CoachHQ).

Funcionalidade:
- Seletor de alunos múltiplos: lista todos os alunos ativos da tabela
  students, o coach seleciona quem vai participar (visual estilo
  "criar grupo" — avatares/nomes com checkbox, empilha os selecionados)
- Campos: data, hora, local (campo livre)
- Ao confirmar: INSERT na tabela sessions do Supabase + dispara email
  de confirmação para cada aluno selecionado (mesmo sistema de email
  que já existe para lembretes de sessão — reaproveitá-lo)

Paleta: #F5EDE0, #1B3A2D, #C8A96E. Mobile-first.

Me mostre o plano e o diff antes de aplicar. Não aplique sem aprovação.
```

### F1 — Etapa 2: Gerenciar Treinos Próximos

```
Fase F1, Etapa 2. Auto mode OFF.

Objetivo: adicionar bloco "Próximas Sessões" na Home do coach.

Lista as sessões dos próximos 14 dias (tabela sessions, ordenado por data).
Cada sessão mostra: data, hora, local, nomes dos alunos.
Ações inline por sessão:
- Reagendar: modal com novos campos data/hora → atualiza no Supabase
  + dispara novo email de confirmação para os alunos da sessão
- Cancelar: confirmação → deleta a sessão + notifica alunos
- Editar: modal com todos os campos editáveis

Me mostre o plano e o diff antes de aplicar. Não aplique sem aprovação.
```

### F1 — Etapa 3: Feedback Due

```
Fase F1, Etapa 3. Auto mode OFF.

Objetivo: adicionar bloco "Feedback Due" na Home do coach.

Busca feedbacks com Status != 'Publicado' (rascunho ou revisão) na
tabela feedbacks. Para cada um: mostra nome do aluno, data da sessão,
botão "Revisar".

Ao clicar "Revisar": abre modal ou página com prévia completa do feedback
(mesmo layout do FeedbackDetail que já existe) + campo editável para a
"Análise do Coach" (body) + botão "Publicar".

Ao publicar: atualiza Status = 'Publicado' no Supabase. (O workflow
Notion→Supabase já não é necessário nesse caso — o feedback já está
no Supabase; só precisa mudar o status.)

Me mostre o plano e o diff antes de aplicar. Não aplique sem aprovação.
```

### F2 — Etapa 1: Caminho Manual

```
Fase F2, Etapa 1. Auto mode OFF.

Objetivo: criar tela "Novo Feedback — Manual" acessível via botão
"+ Novo Feedback" na Home do coach ou na aba Feedbacks.

Caminho Manual:
1. Seleciona o aluno (dropdown ou search)
2. Form com todos os campos do schema feedbacks (ratings, focus_areas,
   qualidade_tecnica, aplicacao_jogo, esforco_intensidade, progresso_geral,
   rally_avg, duration_minutes, next_session_goals, body)
3. Campo "Análise do Coach" (body): a IA preenche automaticamente via
   chamada à Claude API, passando como contexto o histórico de feedbacks
   anteriores do aluno + os ratings preenchidos no form. O coach edita
   se quiser antes de publicar.
4. Ao confirmar: INSERT na tabela feedbacks com Status = 'Publicado'
   + dispara email para o aluno

Me mostre o plano e o diff antes de aplicar. Não aplique sem aprovação.
```

### F2 — Etapa 2: Caminho Vídeo

```
Fase F2, Etapa 2. Auto mode OFF.

Objetivo: criar tela "Novo Feedback — Vídeo" como segundo caminho
da mesma tela de disparo.

Caminho Vídeo:
1. Campo para URL do Google Drive (file_id extraído automaticamente da URL)
   OU upload direto do vídeo (se tamanho permitir — verificar N8N_DEFAULT_
   BINARY_DATA_MODE=filesystem já está ativo antes de habilitar upload)
2. Seletor de alunos múltiplos (mesmo componente da F1 Etapa 1)
3. Campo de texto opcional por aluno: "dica de diferenciação visual"
   (ex: "camiseta azul, lado esquerdo da quadra")
4. Data da sessão
5. Ao confirmar: POST para o webhook do workflow n8n
   { file_id, session_date, students: [{student_id, name, visual_cue}] }
6. Feedback fica em Status = 'Rascunho' até aparecer em "Feedback Due"
   na Home para revisão

Me mostre o plano e o diff antes de aplicar. Não aplique sem aprovação.
```

### F2 — Etapa 3: Mecanismo de aprendizado visual

```
Fase F2, Etapa 3. Auto mode OFF.

Objetivo: salvar o visual_cue confirmado por aluno para reusar nas
próximas análises.

Migration: criar tabela student_visual_profile com campos:
- id, student_id (FK → students), visual_cue (text),
  confirmed_at (timestamp), updated_at

Após cada análise aprovada (feedback publicado via Caminho Vídeo):
salvar ou atualizar o visual_cue usado para aquele aluno em
student_visual_profile.

Na tela de disparo (Etapa 2): ao selecionar um aluno que já tem
visual_cue salvo, preencher automaticamente o campo de diferenciação
visual com o valor salvo — o coach confirma ou edita.

Me mostre o plano, migration e diff antes de aplicar. Não aplique sem aprovação.
```

---

## O QUE NÃO MUDA NESTA FASE

- Schema principal de feedbacks — inalterado
- Workflows n8n existentes — inalterados (F2 Etapa 2 usa o webhook existente)
- Portal do aluno — inalterado
- Autenticação — inalterada

---

## NOTA FINAL — F3 ROBOZINHO

O Robozinho não tem prompt de execução neste documento porque a construção
começa depois de F1 e F2 validadas. O que está aqui é o registro completo
da visão para que não se perca entre sessões.

Quando for iniciar F3, criar documento separado
`fase-f3-robozinho.md` com os prompts de execução detalhados, partindo
da visão registrada aqui.

Stack adicional necessária confirmada: ffmpeg (já no servidor), Gemini
Video API (já integrado), Supabase Storage, Stripe (já previsto).
Novas tabelas: frame_analyses, student_technical_profile.
