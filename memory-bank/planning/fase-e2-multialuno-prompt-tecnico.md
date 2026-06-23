# Fase E2 — Análise Multi-Aluno + Prompt Técnico Aprofundado

Documento de planejamento. Segue o padrão dos documentos de continuidade da Fase E.
Cole as seções "Prompt de Execução" no Claude Code, uma etapa por vez, com aprovação
explícita entre cada uma (protocolo padrão: auto mode OFF, diff antes de aplicar).

---

## CONTEXTO — POR QUE ESTA FASE EXISTE

A Fase E (Etapas 1–5) já está concluída e validada em produção: o workflow
"55TC - Análise de Treino" (`T7kobxM1FZM99O8l`) processa vídeo → Gemini → Notion →
revisão do coach → Supabase → email ao aluno, para **aulas individuais**.

Dois problemas reais surgiram ao usar o sistema na prática:

1. **Aulas em grupo não são suportadas.** O pipeline assume 1 vídeo = 1 aluno. Na
   prática, boa parte das aulas do 55TC têm 2–5 alunos no mesmo vídeo, e cada um
   precisa de um relatório individualizado — não dá pra rodar o sistema 5 vezes
   manualmente recortando o mesmo vídeo.

2. **A análise é tecnicamente rasa.** O prompt atual gera feedback correto nos
   campos, mas genérico — não traz o nível de observação específica e de
   linguagem fundamentada que o método do coach (foco externo, aprendizado motor,
   "o corpo sabe, a mente atrapalha") exige. O aluno precisa sentir que aquele
   feedback foi escrito *sobre aquela aula*, não preenchido num template.

Esta fase resolve as duas coisas. São mudanças relacionadas mas tecnicamente
distintas — uma é estrutural (payload + parsing + loop), a outra é de conteúdo
(o prompt do Gemini em si).

---

## DECISÕES JÁ TOMADAS (não reabrir sem motivo)

| Decisão | Escolha | Motivo |
|---|---|---|
| Como o coach informa quem está na aula | **Lista manual no payload do webhook**, com nome + student_id + descrição visual (roupa/posição) por aluno | Mais confiável que o Gemini "adivinhar" identidade; visual matching é tarefa que o Gemini já faz bem (diferenciar pessoas por aparência num vídeo), mas nomear sozinho seria arriscado |
| Estrutura de saída no Notion | **N páginas separadas, uma por aluno** (mesmo padrão de hoje, repetido N vezes) | Mantém compatibilidade com tudo que a Fase E já construiu (Etapa 4, portal, email) — cada página de aluno se comporta exatamente como já se comporta hoje |
| Campos de avaliação (rating_tecnica, rating_intensidade, rating_posicao, rating_progresso, foco_principal, etc.) | **Inalterados.** Não estamos redesenhando o schema | O schema do Notion (banco "Teste n8n - Feedback aluno") e a tabela `feedbacks` do Supabase já suportam esses campos; mudar agora quebraria a Etapa 4 |
| O que muda no prompt do Gemini | **Qualidade e profundidade da análise dentro dos mesmos campos**, fundamentada em literatura de motor learning + linguagem de coaching contemporâneo | Evitar feedback genérico ("bom trabalho, continue assim") sem precisar reabrir o schema |
| Webhook payload | **1 POST por aula** (não por aluno), contendo array de alunos | Reflete a realidade: 1 vídeo, N alunos, processados juntos numa única chamada ao Gemini (o vídeo é o mesmo para todos) |

---

## BASE TEÓRICA ENCONTRADA (para uso no prompt do Gemini — Etapa 2)

Pesquisa feita para fundamentar o novo prompt, alinhada à metodologia já documentada
em `aleksei-tennis-method` (Wulf & Lewthwaite OPTIMAL theory, Gallwey Inner Game,
aprendizado implícito via analogia).

**Foco externo em feedback (não só em instrução) — achado importante:**
Pesquisa publicada (Pay Attention! — coach/content/player factors, tandfonline 2022)
mostra que treinadores usam foco externo mais em *instruções* (59%) do que em
*feedback* (43%) — ou seja, mesmo treinadores que já praticam foco externo durante a
aula tendem a "regredir" para foco interno quando dão feedback pós-treino. Isso é
relevante diretamente para este projeto: o prompt do Gemini precisa **instruir
explicitamente** o modelo a manter foco externo mesmo no feedback escrito, porque
esse não é o padrão natural — é uma escolha deliberada.

**Foco externo acelera aprendizado motor em tênis especificamente — confirmado em
múltiplos estudos:**
- Estudo em crianças iniciantes (Frontiers in Psychology, 2023) confirma que foco
  externo é mais eficaz que foco interno para aprender groundstrokes em jogadores
  novos no esporte — reduz a carga de memória de trabalho, permitindo decisão motora
  mais rápida.
- Pesquisa em jogadores de 10 anos ou menos (ResearchGate, 2018) mostra o mesmo
  padrão em condições de jogo real, não só em exercício isolado.
- Esportes com raquete e alvo externo (como o tênis) parecem particularmente bem
  adequados para induzir foco externo, comparado a outros esportes.

**Ecological Dynamics — movimento contemporâneo alinhado à filosofia do coach:**
Steve Whelan (coach-educador, 24+ anos, pesquisador) lidera um movimento dentro do
coaching de tênis chamado *ecological dynamics* — que rejeita drills isolados e
instrução puramente técnica em favor de ambientes representativos de jogo real,
adaptabilidade e tomada de decisão. Pesquisa associada (Parry et al., 2025) com
treinadores de alto rendimento mostra que o conhecimento desses coaches vem
majoritariamente de prática reflexiva e experiência direta — não de fórmulas
padronizadas. Isso reforça a direção: o feedback do Gemini deve "ler" o jogo
daquele aluno especificamente, não aplicar um checklist genérico.

**Aplicação prática no prompt:**
- Toda observação de erro/ajuste deve ser fraseada em termos de efeito externo
  (bola, alvo, trajetória, distância), nunca em termos de segmento corporal isolado
  ("seu cotovelo", "seu pulso") — alinhado à sua skill já existente.
- O prompt deve instruir o Gemini a citar **momentos específicos observáveis** da
  aula (ex: "nos rallies cruzados da segunda metade, a recuperação para o centro
  ficou consistentemente tarde") em vez de afirmações genéricas atemporais.
- Tom: honesto e analítico, gentil mas sem suavizar a ponto de "passar a mão na
  cabeça" — alinhado ao "Você não elogia por elogiar. Você entrega diagnóstico"
  da skill.

---

## ETAPAS DE EXECUÇÃO

### Etapa 1 — Novo formato de payload do webhook (estrutural)

**Status:** planejada, não iniciada.

**O que muda:**
- Formato atual: `{ file_id, student_name, student_id, session_date }`
- Formato novo: `{ file_id, session_date, students: [{ student_id, name, visual_cue }, ...] }`
  - `visual_cue`: texto livre curto que o coach escreve para ajudar o Gemini a
    diferenciar visualmente (ex: "camiseta azul, lado esquerdo da quadra",
    "boné branco, sacando primeiro")
- Para aula individual, `students` continua existindo, só com 1 item — não cria
  dois formatos de payload diferentes, mantém um único formato sempre.

**Prompt de execução (colar no Claude Code):**

```
Nova sessão de trabalho na Fase E2 do TennisOS. Auto mode OFF.
Leia CLAUDE.md, memory-bank/activeContext.md e memory-bank/progress.md primeiro.

Objetivo desta etapa: mudar o formato do payload do webhook do workflow
"55TC - Análise de Treino" (T7kobxM1FZM99O8l) para suportar múltiplos alunos
por vídeo (aulas em grupo).

Formato atual do POST:
{ file_id, student_name, student_id, session_date }

Formato novo:
{ file_id, session_date, students: [{ student_id, name, visual_cue }, ...] }

- "visual_cue" é um texto curto que ajuda a diferenciar visualmente o aluno no
  vídeo (ex: cor de roupa, posição na quadra).
- Aula individual também usa este formato, só com 1 item no array "students" —
  não criar dois formatos diferentes.

Antes de aplicar:
1. Mapeie quais nós do workflow hoje dependem de student_name/student_id direto
   do body do webhook (provavelmente "Preparar Análise").
2. Me mostre o plano de quais nós mudam e como, incluindo se será necessário um
   nó de Split (1 item por aluno) em algum ponto da cadeia, e onde exatamente
   esse split deveria acontecer (antes ou depois da chamada ao Gemini — pense
   nisso: o vídeo é o mesmo para todos os alunos, então a chamada ao Gemini
   deveria ser ÚNICA, analisando todos de uma vez, e o split acontece DEPOIS,
   na resposta, não antes).
3. Não aplique nada sem minha aprovação explícita do plano.
```

---

### Etapa 2 — Novo prompt do Gemini (conteúdo + multi-aluno)

**Status:** planejada, não iniciada. Depende da Etapa 1 estar aplicada (o prompt
precisa saber que vai receber uma lista de alunos).

**O que muda:**
- O prompt passa a instruir o Gemini a:
  1. Identificar visualmente cada aluno da lista fornecida (usando os `visual_cue`)
     ao longo do vídeo inteiro.
  2. Analisar o desempenho de **cada um** individualmente, não só do mais ativo
     ou do primeiro a aparecer.
  3. Produzir um array de respostas, uma por aluno, mantendo exatamente os
     mesmos campos que já existem hoje (rating_tecnica, rating_intensidade,
     rating_posicao, rating_progresso, foco_principal, foco_proxima_aula,
     analise_aleksei, qualidade_tecnica, aplicacao_jogo, esforco_intensidade,
     progresso_geral, objetivos_proxima_aula).
  4. Fundamentar a "Análise do Aleksei" e os campos de texto livre com:
     - Foco externo (bola, trajetória, alvo, espaço) em vez de segmento corporal
       isolado, inclusive — e especialmente — no feedback escrito, não só na
       instrução durante a aula.
     - Observações ancoradas em momentos específicos do vídeo (timestamp
       aproximado ou descrição de trecho), nunca afirmações atemporais genéricas.
     - Tom honesto e analítico: identificar o que realmente pode ser trabalhado,
       sem generalizar elogio nem suavizar a ponto de não ser útil.

**Prompt de execução (colar no Claude Code):**

```
Continuando a Fase E2. Auto mode OFF.

Objetivo: reescrever o prompt do Gemini (nó "Preparar Análise" e a lógica de
parsing em "Parsear Resposta Gemini") para:

1. Suportar múltiplos alunos por vídeo — recebe a lista "students" do payload
   (Etapa 1) e produz um array de análises, uma por aluno, identificando cada
   um pelo "visual_cue" fornecido.

2. Elevar a profundidade técnica da análise, mantendo EXATAMENTE os mesmos
   campos de saída já usados hoje no Notion (não mude o schema). A análise deve:
   - Usar linguagem de foco externo (efeito do movimento — bola, trajetória,
     alvo — não segmento corporal isolado como "seu pulso" ou "seu cotovelo"),
     mesmo nos campos de feedback escrito pós-aula, não só na instrução.
   - Citar momentos ou padrões específicos observados naquele vídeo em
     particular (ex: "nos pontos do segundo set, a recuperação para o centro
     ficou tarde") em vez de frases genéricas que serviriam para qualquer aula.
   - Manter tom honesto e analítico — identificar o que pode ser melhorado de
     forma clara e construtiva, sem generalizar elogio vazio.
   - Seguir os princípios já documentados na skill aleksei-tennis-method
     (leia /mnt/skills/user/aleksei-tennis-method/SKILL.md se disponível no
     ambiente do servidor, ou peça para eu colar o conteúdo se não estiver lá).

3. Garantir que o parsing da resposta (que hoje espera 1 objeto) passe a
   esperar um array de N objetos, um por aluno, mantendo a validação de
   campos obrigatórios que já existe.

Antes de aplicar:
- Me mostre o novo prompt completo do Gemini para revisão.
- Me mostre como o parsing vai validar e separar a resposta em N itens.
- Não aplique sem aprovação.
```

---

### Etapa 3 — Loop de criação de páginas no Notion (1 por aluno)

**Status:** planejada, não iniciada. Depende das Etapas 1 e 2.

**O que muda:**
- Hoje, "Criar Entrada no Notion" recebe 1 objeto e cria 1 página.
- Precisa passar a receber um array (N alunos) e criar N páginas — uma chamada
  por aluno, reaproveitando o mesmo nó/lógica de hoje, com um nó de Split antes.

**Prompt de execução (colar no Claude Code):**

```
Continuando a Fase E2. Auto mode OFF.

Objetivo: adicionar um nó de Split After Gemini (depois do parsing da Etapa 2,
antes de "Criar Entrada no Notion") para que cada item do array de alunos
analisados gere 1 execução independente do restante da cadeia já existente
(Criar Entrada no Notion → Gerar HTML do Card → Upload Storage → Salvar URL →
Notificar Coach).

Decisão a confirmar comigo antes de construir: a notificação Twilio para o
coach (nó "Notificar Coach") deve disparar 1 mensagem POR ALUNO (N mensagens
de WhatsApp para uma aula de N alunos), ou deve agregar num resumo único
("Feedback gerado para 4 alunos da aula de [data]: [lista de nomes]. Revise no
Notion.")? Me pergunte isso antes de implementar — não assuma.

Mostre o plano e o diff antes de aplicar. Não aplique sem aprovação.
```

---

## PENDÊNCIA A DECIDIR ANTES DE EXECUTAR A ETAPA 3

O prompt de execução da Etapa 3 já contém uma pergunta que o Claude Code vai te
fazer — mas vale você já ter uma inclinação:

**Notificação Twilio para aulas em grupo: 1 mensagem por aluno, ou 1 mensagem
resumo por aula?**

Considerando que você revisa os feedbacks no Notion antes de publicar (Status →
Publicado), e que receber 5 notificações separadas de WhatsApp para a mesma aula
pode ser mais ruído do que ajuda, a recomendação provisória é: **1 mensagem-resumo
por aula**, listando os alunos processados, com link para a aula no Notion (não
para cada página de aluno individualmente). Mas isso é sua decisão final.

---

## O QUE NÃO MUDA NESTA FASE

- Schema do Notion (banco "Teste n8n - Feedback aluno") — campos inalterados.
- Schema da tabela `feedbacks` no Supabase — inalterado.
- Etapa 4 (Publicar Feedback: Notion → Supabase → email aluno) — continua
  funcionando exatamente como está; ela processa página por página, então não
  importa se uma página veio de aula individual ou de aula em grupo.
- Credenciais n8n — reaproveitadas, nenhuma nova necessária.
- PNG do card visual — continua adiado (fora do escopo desta fase).

---

## ORDEM DE EXECUÇÃO RECOMENDADA

1. Etapa 1 (payload) — mudança estrutural isolada, fácil de testar com um POST
   sintético antes de tocar no prompt do Gemini.
2. Etapa 2 (prompt do Gemini) — depende do formato novo da Etapa 1 estar
   recebendo dados corretamente.
3. Etapa 3 (loop/split) — depende do array de N alunos já estar saindo certo
   do parsing da Etapa 2.
4. Teste end-to-end com vídeo real de aula em grupo (você já tem isso em mãos).

Cada etapa: plano → diff → aprovação → aplicar → testar → memory-bank update.
Não pular etapa, não aplicar sem aprovação — mesmo protocolo da Fase E.
