# Fase D — Portal: Aba Feedbacks Redesenhada

Documento de planejamento. Segue o padrão dos documentos de continuidade da Fase E.
Cole as seções "Prompt de Execução" no Claude Code, uma etapa por vez, com aprovação
explícita entre cada uma (protocolo padrão: auto mode OFF, diff antes de aplicar).

---

## CONTEXTO — POR QUE ESTA FASE EXISTE

A aba de Feedbacks no portal (`Feedbacks.jsx`) existe e renderiza dados, mas ainda
está no estágio simples: mostra só o card com data, título e texto da análise do
coach. Não mostra nenhuma das métricas ricas que a Fase E construiu (ratings,
barras de avaliação, focos da aula, objetivos numerados, gráfico de rally).

O aluno que abre o portal hoje não consegue "ler" o feedback completo que o sistema
gera — vê só um resumo de texto. Toda a estrutura de dados já existe no Supabase
(migrations 009 + 010 aplicadas, campos ricos presentes), mas a UI não os exibe.

Esta fase constrói a experiência completa de feedback no portal, mobile-first,
com o nível visual do card de referência (Kathely_treino_05-05-26.png) — mas
como interface navegável, não como imagem estática.

---

## REFERÊNCIA VISUAL E IDENTIDADE

**Paleta do projeto (já estabelecida no portal):**
- Background principal: `#F5EDE0` (areia/sand)
- Verde escuro (primary): `#1B3A2D`
- Texto corpo: `#2C2C2C`
- Accent/highlight: `#C8A96E` (dourado)
- Cards: `#FFFFFF` com `border-radius: 16px`

**Tipografia (já estabelecida no portal):**
- Display/headlines: fonte bold, uppercase tracking largo (igual "FEEDBACK" no header)
- Body: sans-serif limpo, legível em mobile
- Labels de seção: small caps, spaced, cor verde escuro

**Tom de design (3 palavras):** elegante, analítico, humano

**Anti-padrões (não fazer):**
- Sem gradientes chamativos
- Sem sombras pesadas em todo lugar
- Sem ícones genéricos de biblioteca
- Sem fontes Inter/Roboto
- Não deve parecer app genérico de fitness — deve ter identidade de coaching premium

---

## ARQUITETURA DA EXPERIÊNCIA (3 camadas)

### Camada 1 — Galeria de Feedbacks (tela atual, melhorada)
Lista de "capas" de feedback. Cada capa é um card clicável que já existe hoje,
mas precisa ser enriquecido com pelo menos as 4 métricas principais (técnica,
intensidade, posição, progresso) e o campo "foco principal" visível antes de
o aluno abrir o detalhe.

### Camada 2 — Página de Detalhe do Feedback (nova)
Rota: `/feedback/:id`
Dashboard completo, navegável, mobile-first. Baseado no card de referência
(Kathely_treino_05-05-26.png), traduzido como interface interativa — não como
imagem estática. O aluno faz scroll, não "vê uma imagem".

### Camada 3 — Comparação de Treinos (nova)
Rota: `/feedback/compare`
Abre comparando métricas entre 2 treinos selecionados pelo aluno. Acessível
a partir da galeria (botão "Comparar Treinos") ou dentro do detalhe de um
feedback (botão "Comparar com outro treino").

---

## ESPECIFICAÇÃO — CAMADA 2 (Página de Detalhe)

Esta é a entrega central desta fase. Estrutura de seções mobile-first, em ordem
de scroll de cima para baixo:

### Seção 1 — Header da sessão
- Logo 55TC (pequeno, canto superior esquerdo)
- Botão "← Feedbacks" (retorno à galeria)
- Nome do aluno (bold, grande)
- Treinador + Data da sessão
- Duração em minutos

### Seção 2 — Métricas rápidas (4 pills horizontais)
Duração | Rally Médio | Esforço | Qualidade
Fundo escuro (`#1B3A2D`), texto areia, números grandes.
Referência: linha de métricas do card Kathely (60 min, 6 bolas, ALTO, Assimilação).

### Seção 3 — Barra de avaliação geral (3 indicadores)
Intensidade | Aplicação em Jogo | Progresso Geral
Barra horizontal com ponto colorido indicando a posição (igual ao card de
referência). Labels em caps pequeno. Valores como texto curto (ALTA, PARCIAL, BOM).

### Seção 4 — Focos da Aula + Rally Médio (2 colunas)
**Coluna esquerda:** lista de `focus_areas` com ícone simples por categoria
(Forehand, Backhand, Footwork, Saque, etc. — ícones SVG inline, não biblioteca).
**Coluna direita:** número grande do rally médio + label "TROCAS POR PONTO" +
mini gráfico de linha simples mostrando evolução (se houver histórico) ou
só o número se for o primeiro feedback.

### Seção 5 — Avaliações (ratings 0-10)
4 linhas: TÉCNICA | INTENSIDADE | POSIÇÃO | PROGRESSO
Cada linha: ícone + label + barra de progresso segmentada (10 blocos, N
preenchidos) + número `/10` em destaque.
Fundo levemente diferente (card branco sobre background areia).

### Seção 6 — Objetivos — Próxima Aula
Label "OBJETIVOS — PRÓXIMA AULA" em caps.
Para cada objetivo em `next_session_goals`:
- Número bold (1, 2, 3...)
- Título do objetivo em bold
- Descrição do objetivo
- Diagrama de quadra SVG inline (quadra simples, minimalista) — gerado
  programaticamente, não imagem. Para Fase D v1, pode ser um placeholder
  visual simples (retângulo com linhas de quadra) igual para todos os objetivos.
  A personalização por objetivo fica para versão futura.

### Seção 7 — Análise do Treinador
Label "ANÁLISE DO TREINADOR" em caps, cor accent (dourado).
Foto do coach (Aleksei) — circular, tamanho médio.
Aspas de abertura grandes (elemento decorativo, não blockquote).
Texto da análise em itálico suave, tamanho generoso.
Aspas de fechamento.
"55 Tennis Crew" como rodapé desta seção.

### Rodapé da página
Logo 55TC + "portal.55tenniscrew.com"
Link sutil "Comparar com outro treino →"

---

## ESPECIFICAÇÃO — CAMADA 3 (Comparação de Treinos)

Rota: `/feedback/compare?a={id}&b={id}`

Layout mobile: duas colunas lado a lado (ou empilhadas em telas muito estreitas).
Cada coluna mostra a data do treino como header.

**Métricas comparadas visualmente:**
- Rating Técnica: duas barras lado a lado
- Rating Intensidade: idem
- Rating Posição: idem
- Rating Progresso: idem
- Rally Médio: número grande, comparativo
- Qualidade Técnica: label colorido (verde se melhorou, neutro se igual, âmbar se regrediu)

**Fluxo de seleção:**
1. Aluno clica "Comparar Treinos" na galeria
2. Aparece a lista de feedbacks com checkbox — seleciona 2
3. Botão "Comparar" abre a página de comparação

**Versão simplificada aceitável para v1:** selecionar 2 feedbacks pelo ID
diretamente via URL, sem a UI de seleção com checkbox. A UI de seleção fica
para v2 se a v1 funcionar bem.

---

## DECISÕES JÁ TOMADAS

| Decisão | Escolha | Motivo |
|---|---|---|
| Prioridade de viewport | Mobile-first (375px base) | Portal é acessado principalmente pelo celular do aluno |
| Diagramas de quadra | SVG inline programático, placeholder v1 | Não depender de imagens externas; personalizável no futuro |
| Foto do coach | URL hardcoded ou da tabela `profiles` do Supabase | Aleksei é o único coach por enquanto |
| Ícones de focus_areas | SVG inline por categoria (máx 8 tipos) | Sem biblioteca de ícones — identidade controlada |
| Gráfico de rally evolution | Só número na v1 (sem gráfico se houver só 1 feedback) | Não construir feature de histórico antes de ter dados suficientes |
| Comparação v1 | 2 feedbacks via URL, sem UI de seleção | Entrega rápida; UI de seleção é v2 |
| Deploy | Vercel (mesmo fluxo já estabelecido) | Sem mudança de infra |

---

## ETAPAS DE EXECUÇÃO

### Etapa 1 — Enriquecer card da galeria (Camada 1)

**Status:** planejada, não iniciada.

**O que muda no Feedbacks.jsx atual:**
- Card da galeria passa a mostrar: data, título, + 4 mini-ratings (técnica,
  intensidade, posição, progresso) como pills ou barrinhas pequenas + lista
  de `focus_areas` como tags.
- Card se torna clicável com `onClick → navigate('/feedback/:id')`.
- Botão "Comparar Treinos" aparece no header da galeria.

**Prompt de execução:**

```
Nova sessão — Fase D, Etapa 1. Auto mode OFF.
Leia CLAUDE.md, memory-bank/activeContext.md, memory-bank/progress.md e
memory-bank/planning/fase-d-portal-feedbacks.md antes de qualquer ação.

Objetivo: enriquecer o card da galeria no Feedbacks.jsx para mostrar mais
dados além do texto da análise.

Cada card na lista deve passar a exibir:
1. Data da sessão (já existe)
2. Título (já existe)
3. 4 mini-ratings como pequenas barras ou pills coloridos:
   rating_technique, rating_intensity, rating_position, rating_progress
   (campos já existem na tabela feedbacks do Supabase)
4. Lista de focus_areas como tags pequenas (chips)
5. O card inteiro deve ser clicável → navigate('/feedback/' + feedback.id)

No header da página de galeria, adicionar botão "Comparar Treinos" (por
enquanto desabilitado ou com tooltip "em breve" — a funcionalidade vem
na Etapa 3).

Paleta a usar:
- Background: #F5EDE0
- Verde escuro: #1B3A2D
- Accent dourado: #C8A96E
- Cards: #FFFFFF, border-radius 16px

Não crie rotas novas ainda — só melhore o card da galeria existente.
Me mostre o diff antes de aplicar. Não aplique sem aprovação.
```

---

### Etapa 2 — Página de detalhe do feedback (Camada 2)

**Status:** planejada, não iniciada. Depende da Etapa 1 (rota de navegação
precisa existir).

**O que criar:**
- Nova rota `/feedback/:id` no React Router
- Novo componente `FeedbackDetail.jsx`
- 7 seções conforme especificado acima
- Busca de dados: `supabase.from('feedbacks').select('*').eq('id', id)`
- SVG inline para quadra de tênis (placeholder simples)
- SVG inline para ícones de focus_areas (8 tipos máx)

**Prompt de execução:**

```
Fase D, Etapa 2. Auto mode OFF.

Objetivo: criar a página de detalhe do feedback (/feedback/:id).

Leia o documento memory-bank/planning/fase-d-portal-feedbacks.md — ele
contém a especificação completa das 7 seções desta página.

Referência de design: o arquivo Kathely_treino_05-05-26.png (card de
sessão) — traduzir como interface navegável mobile-first, não como
imagem estática.

Paleta:
- Background: #F5EDE0
- Verde escuro (primary): #1B3A2D
- Accent dourado: #C8A96E
- Cards/seções: #FFFFFF, border-radius 16px
- Texto: #2C2C2C

Comportamento esperado:
- Busca o feedback pelo id da URL no Supabase
- Loading state elegante (não spinner genérico — pode ser o texto
  "Carregando sessão..." com a paleta do projeto)
- Se feedback não encontrado → mensagem limpa + botão voltar
- Botão "← Feedbacks" no topo leva de volta à galeria

Para os diagramas de quadra (seção Objetivos): SVG inline simples —
retângulo com proporção de quadra de tênis, linhas de serviço e de
fundo, cor verde escuro sobre fundo areia. Mesmo SVG para todos os
objetivos na v1.

Para ícones de focus_areas: SVG inline por categoria. Categorias
possíveis: Forehand, Backhand, Footwork, Saque, Voleio, Slice,
Smash, Mentalidade. Crie SVGs simples e reconhecíveis (não precisa
ser fotorrealista — pense em ícone de linha, minimalista).

Me mostre o componente completo para revisão antes de aplicar.
Não aplique sem aprovação.
```

---

### Etapa 3 — Comparação de treinos (Camada 3)

**Status:** planejada, não iniciada. Depende das Etapas 1 e 2.

**O que criar:**
- Nova rota `/feedback/compare?a={id}&b={id}`
- Novo componente `FeedbackCompare.jsx`
- Busca paralela dos 2 feedbacks pelo ID
- Layout comparativo mobile: 2 colunas ou empilhado
- Indicador visual de evolução (verde/neutro/âmbar) por métrica

**Prompt de execução:**

```
Fase D, Etapa 3. Auto mode OFF.

Objetivo: criar a página de comparação de treinos (/feedback/compare).

Parâmetros de URL: ?a={feedback_id}&b={feedback_id}
A página busca os 2 feedbacks em paralelo e exibe comparação.

Métricas a comparar (todas já existem na tabela feedbacks):
- rating_technique, rating_intensity, rating_position, rating_progress:
  barras lado a lado, com delta numérico (+2, -1, etc.)
- rally_avg: número grande, comparativo
- qualidade_tecnica, esforco_intensidade, aplicacao_jogo, progresso_geral:
  labels coloridos (verde = melhorou, neutro = igual, âmbar = regrediu)
- focus_areas: lista de tags de cada treino lado a lado

Header da página: data do treino A vs data do treino B
Botão "← Voltar" → galeria de feedbacks

Para v1, a seleção dos 2 treinos a comparar é feita colando os IDs
na URL manualmente ou via botão "Comparar" que ainda não existe na
galeria. Isso é aceitável — o que importa é que a página de comparação
funcione corretamente quando os parâmetros são fornecidos.

Me mostre o componente antes de aplicar. Não aplique sem aprovação.
```

---

### Etapa 4 — Deploy e validação em produção

**Status:** planejada, não iniciada. Depende das 3 etapas anteriores aprovadas.

**Prompt de execução:**

```
Fase D, Etapa 4. Auto mode OFF.

As 3 etapas de UI estão aprovadas e funcionando localmente (npm run dev).
Objetivo: fazer o deploy em produção (Vercel).

Processo padrão já estabelecido:
1. git add + git commit com mensagem descritiva
2. git push origin main
3. Disparar o deploy hook do Vercel:
   curl -X POST "https://api.vercel.com/v1/integrations/deploy/prj_a82osi0uQFvlJfVjLZMdF2wQTfNI/51HyBK3W7X"
4. Aguardar ~2min e confirmar que portal.55tenniscrew.com está servindo
   as rotas novas (/feedback/:id e /feedback/compare)

Após deploy, me dê os links diretos para testar com o feedback simulado
que já existe no Supabase (notion_id = 'SIM-TEST-20260705').

Não faça push sem minha confirmação explícita.
```

---

## O QUE NÃO MUDA NESTA FASE

- Backend/Supabase — sem migrations novas (schema já suporta tudo)
- Workflows n8n — inalterados
- Outras telas do portal (Home, Profile, Library, Schedule) — inalteradas
- Autenticação — inalterada

---

## ORDEM DE EXECUÇÃO

1. Etapa 1 (galeria enriquecida) — menor risco, menor escopo, validação rápida
2. Etapa 2 (detalhe do feedback) — peça central, validar com o feedback simulado
3. Etapa 3 (comparação) — só depois do detalhe aprovado
4. Etapa 4 (deploy) — só depois das 3 telas aprovadas localmente

Cada etapa: plano → diff/componente completo → aprovação → aplicar →
testar no browser local → seguir. Sem pular etapa.
