TennisOS — Fase E: Workflow n8n Análise de Treino


Plano de execução atualizado após auditoria completa do workflow existente.
Criado Jun/2026.




O QUE JÁ EXISTE (não recriar)

O workflow "55TC - Análise de Treino" (ID: T7kobxM1FZM99O8l, 18 nós, ATIVO)
já tem toda a espinha dorsal construída:

Webhook (GET) → Ler Último Scan → Listar Vídeos no Drive
→ Extrair Lista → Split In Batches
  → [loop] Obter Pasta do Aluno → Download Vídeo
  → Upload para Gemini File API → Verificar Estado (poll loop)
  → Analisar com Gemini → Parsear Resposta → Criar Entrada no Notion
  → [Futuro] WhatsApp + Card Visual → loop back
→ [done] Salvar Scan → Webhook Response

Mapeamento Gemini → Notion já existe e funciona:

Campo GeminiCampo Notionfoco_principal[]Foco Principal (multi_select)foco_proxima_aulaFoco Próxima Aula (rich_text)analise_alekseiAnálise do Aleksei (rich_text)qualidade_tecnicaQualidade Técnica (select)duracaoDuração (number)rally_medioRally Médio (number)aplicacao_em_jogoAplicação em Jogo (select)esforco_intensidadeEsforço/Intensidade (select)progresso_geralProgresso Geral (select)studentNameNome da aula (title)dateStartData do Treino (date)fileIdVídeo da Aula (url)


PROBLEMAS IDENTIFICADOS

Problema 1 — Trigger incorreto

Como está: GET sem body. Workflow varre uma pasta fixa no Drive
(1-rwvYdSwpi4H8v3bbiUKuw4BUDkn0LDY) e tenta descobrir o aluno
pelo nome da pasta pai do vídeo.

Problema real: Se o vídeo não está numa subpasta com o nome do aluno,
o sistema pega o nome da pasta raiz ("Gravações Aulas Tenis Abril 2026")
como nome do aluno — que foi exatamente o que aconteceu.

Solução: mudar para POST com body recebendo os dados direto:

json{
  "file_id": "ID do arquivo no Google Drive",
  "student_name": "Kathely",
  "student_id": "uuid-do-aluno-no-supabase",
  "session_date": "2026-06-19"
}

Problema 2 — Campos de avaliação numérica faltando

Como está: Gemini não retorna Técnica/10, Intensidade/10, Posição/10, Progresso/10.
Só retorna selects qualitativos.

Solução: atualizar o prompt do Gemini para incluir os campos numéricos.

Problema 3 — Nó "[Futuro] WhatsApp + Card Visual" vazio

Como está: placeholder sem implementação.

Solução: implementar neste plano.

Problema 4 — Credenciais hardcodadas

Gemini API key e Notion token estão em texto puro nos nós n08/n15/n16 e n10.

Solução: mover para n8n Credentials após o restante estar funcionando.
(Baixa urgência, alta importância — fazer antes de ir para produção real.)

Problema 5 — Sem sync Notion → Supabase

Como está: workflow para no Notion. Portal do aluno não recebe nada.

Solução: segundo workflow disparado quando coach aprova no Notion.


PLANO DE EXECUÇÃO — 4 ETAPAS


ETAPA 1 — Atualizar Prompt do Gemini + campos numéricos

Pré-requisito: nenhum.

O que fazer: atualizar o nó "Preparar Análise" no workflow existente
para incluir os campos de avaliação numérica no JSON que o Gemini retorna.

Prompt para Claude Code:

New session. Auto mode OFF.
Read CLAUDE.md, memory-bank/activeContext.md.

Update workflow T7kobxM1FZM99O8l in n8n (https://n8n.55tenniscrew.com).

Find the node named "Preparar Análise" and update its Gemini prompt to add
these fields to the expected JSON output:

"rating_tecnica": <integer 0-10, avalie a qualidade técnica dos golpes observados>,
"rating_intensidade": <integer 0-10, avalie o nível de esforço físico observado>,
"rating_posicao": <integer 0-10, avalie o posicionamento e footwork>,
"rating_progresso": <integer 0-10, avalie o progresso geral do aluno>,
"objetivos_proxima_aula": [
  {"titulo": "<título do objetivo>", "descricao": "<descrição breve>"}
]

Keep all existing fields exactly as they are. Only add these new ones.

Also update the node "Parsear Resposta Gemini" to extract these new fields
and pass them downstream.

Show me the current prompt and the proposed changes before applying.
Wait for approval.


ETAPA 2 — Novo trigger: POST com dados do arquivo

Pré-requisito: Etapa 1 concluída.

O que fazer: substituir o trigger GET + varredura de pasta pelo novo
fluxo onde você envia o arquivo diretamente.

Novo fluxo:

POST /analisar-treino
Body: { file_id, student_name, student_id, session_date }
  → [remover] Ler Último Scan
  → [remover] Listar Vídeos no Drive  
  → [remover] Extrair Lista de Arquivos
  → [remover] Split In Batches (não precisa mais — sempre 1 arquivo)
  → [remover] Obter Pasta do Aluno
  → [manter] Download Vídeo do Drive (usando file_id do body)
  → [manter] Upload para Gemini File API
  → [manter] Verificar Estado / poll loop
  → [manter] Preparar Análise → Analisar com Gemini
  → [manter] Parsear Resposta Gemini
  → [atualizar] Criar Entrada no Notion (adicionar novos campos)
  → [implementar] Card Visual + Notificação
  → Webhook Response

Prompt para Claude Code:

New session. Auto mode OFF.
Read CLAUDE.md, memory-bank/activeContext.md.

Rebuild the trigger section of workflow T7kobxM1FZM99O8l.

REMOVE these nodes (they are replaced by the new POST trigger):
- "Ler Último Scan"
- "Listar Vídeos no Drive"
- "Extrair Lista de Arquivos"
- "Split In Batches"
- "Obter Pasta do Aluno"
- "Salvar Scan e Preparar Resposta"

CHANGE the Webhook node:
- Method: POST (was GET)
- Path: /analisar-treino (keep same)
- Expected body: { file_id, student_name, student_id, session_date }

UPDATE "Download Vídeo do Drive":
- File ID: {{ $json.body.file_id }} (from webhook body, not from Drive scan)

UPDATE "Criar Entrada no Notion" to also save:
- student_id: {{ $json.body.student_id }} (new field in Notion schema)
- rating_tecnica, rating_intensidade, rating_posicao, rating_progresso
- objetivos_proxima_aula (as rich_text, formatted as numbered list)

Show me each change before applying. Wait for approval after each node.


ETAPA 3 — Card Visual automático

Pré-requisito: Etapa 2 funcionando. Protótipo visual aprovado (Fase C).

O que fazer: implementar o nó "[Futuro] WhatsApp + Card Visual".

Fluxo do nó:

Dados do Notion (já parsados) 
  → HTTP Request para Claude API
  → Claude gera HTML do FeedbackDetail com os dados reais
  → HTTP Request para serviço de screenshot (ou Puppeteer no servidor)
  → Imagem PNG 1080x1350 salva no Supabase Storage
  → URL da imagem salva no Notion (campo novo: "Card Visual")
  → [Futuro] Twilio WhatsApp (via ~/agente_cortes pattern) → WhatsApp para aluno com a imagem

Prompt para Claude Code:

New session. Auto mode OFF.
Read CLAUDE.md, memory-bank/activeContext.md.

Implement the "[Futuro] WhatsApp + Card Visual" node in workflow T7kobxM1FZM99O8l.

This node receives all parsed feedback data and must:

1. Call the Claude API (claude-sonnet-4-6) with a prompt that generates
   a self-contained HTML page (inline CSS, no external dependencies)
   representing the feedback dashboard for this session.
   The HTML must use: forest #1C3526, sand #F5EEE0, ink #0D0D0D,
   Bebas Neue (Google Fonts), DM Sans (Google Fonts).
   Include all fields: student name, date, duration, rally avg, effort,
   ratings (0-10 bars), focus areas, next session objectives, coach analysis.
   Output: just the HTML string, nothing else.

2. Upload the HTML to a screenshot API (use https://htmlcsstoimage.com API
   or equivalent — check if credentials exist in n8n first).
   Target dimensions: 1080x1350px (Instagram portrait).

3. Save the resulting image URL back to the Notion page
   (new field: "Card Visual", type: url).

4. [PLACEHOLDER — do not implement yet] WhatsApp send via Twilio WhatsApp
   (via ~/agente_cortes pattern). Just add a disabled node with a note:
   "Send via n8n → HTTP node → Twilio API when configured."

Show me the node design before building. Wait for approval.


ETAPA 4 — Sync Notion → Supabase (publicação do feedback)

Pré-requisito: Portal aba Feedback construído (Fase D). Etapa 2 funcionando.

O que fazer: segundo workflow que dispara quando o coach aprova o feedback
no Notion e o publica para o aluno no portal.

Como funciona:


Coach revisa o feedback no Notion
Coach muda um campo "Status" para "Publicado"
n8n detecta via polling (a cada 5 min) ou Notion webhook
n8n lê o registro completo do Notion
Upsert no Supabase tabela feedbacks
Resend dispara email para o aluno


SQL — adicionar campo Status ao Notion:

Adicionar ao schema do Notion:
"Status": select com opções ["Rascunho", "Revisão", "Publicado"]
Default: "Rascunho"

Prompt para Claude Code:

New session. Auto mode OFF.
Read CLAUDE.md, memory-bank/activeContext.md, database-blueprint.md.

Create a NEW n8n workflow named "55TC - Publicar Feedback".

This workflow syncs approved feedbacks from Notion to Supabase.

TRIGGER: Schedule — polls every 5 minutes.

NODE 1 — Query Notion:
Fetch all pages from database 3529a701-723c-80d4-9bf0-fa3166bea0f9
where Status = "Publicado" AND synced_to_portal = false (or field is empty).

NODE 2 — Loop:
For each result, extract all fields.

NODE 3 — Upsert Supabase:
POST to Supabase REST API: /rest/v1/feedbacks
Upsert (on conflict: notion_id) with all fields mapped:
  - student_id (from Notion field)
  - session_date, duration_minutes, rally_avg
  - effort, quality, intensity_level, game_application, progress_level
  - focus_areas (array)
  - rating_technique, rating_intensity, rating_position, rating_progress
  - next_session_goals (jsonb)
  - coach_analysis
  - notion_id (for dedup)

NODE 4 — Update Notion page:
Set "synced_to_portal" = true on the Notion page
(to avoid reprocessing on next poll).

NODE 5 — Send email via Resend:
To: student email (fetch from students table by student_id)
Subject: "Aleksei deixou um feedback da sua aula 🎾"
Body: branded email (same visual system as invite/session reminder emails)
CTA: "VER FEEDBACK →" linking to portal.55tenniscrew.com/feedback/{id}

Show me each node before applying. Wait for approval.


CAMPOS A ADICIONAR AO NOTION (antes de iniciar)

Rodar no Claude Code via Notion MCP antes das etapas acima:

Add these properties to Notion database 
collection://3529a701-723c-80da-8250-000b4b1291bc:

1. "rating_tecnica" — number (0-10)
2. "rating_intensidade" — number (0-10)  
3. "rating_posicao" — number (0-10)
4. "rating_progresso" — number (0-10)
5. "student_id" — text (Supabase UUID)
6. "Status" — select: ["Rascunho", "Revisão", "Publicado"] default "Rascunho"
7. "synced_to_portal" — checkbox
8. "card_visual_url" — url (imagem gerada)
9. "objetivos_proxima_aula" — text (JSON formatado)

Do NOT remove or rename any existing fields.
Show the update before applying. Wait for approval.


FLUXO COMPLETO FINAL

VOCÊ:
  Grava aula → sobe vídeo no Google Drive → copia o file_id
  → chama o webhook POST com: file_id + student_name + student_id + data

WORKFLOW 1 (automático):
  Download → Gemini analisa → parse JSON
  → cria entrada no Notion (Status: Rascunho)
  → gera card visual HTML → screenshot 1080x1350
  → salva imagem no Supabase Storage
  → salva URL da imagem no Notion

VOCÊ:
  Abre o Notion → revisa análise do Aleksei → ajusta se necessário
  → muda Status para "Publicado"

WORKFLOW 2 (automático, polling 5min):
  Detecta Status = Publicado → upsert no Supabase feedbacks
  → marca synced_to_portal = true no Notion
  → email para o aluno: "Seu feedback está disponível"

ALUNO:
  Recebe email → abre portal → vê feedback completo na aba Feedback
  → card visual disponível para compartilhar


ORDEM DE EXECUÇÃO


✅ Adicionar campos ao Notion (pré-requisito de tudo)
✅ Etapa 1 — Atualizar prompt Gemini + campos numéricos
✅ Etapa 2 — Novo trigger POST + simplificação do workflow
✅ Fase D — Portal aba Feedback (pode rodar em paralelo com Etapas 1-2)
✅ Etapa 3 — Card visual automático
✅ Etapa 4 — Sync Notion → Supabase + email publicação
🔜 Credenciais — mover Gemini key e Notion token para n8n Credentials
🔜 Twilio WhatsApp (via ~/agente_cortes pattern)
- Use the n8n → HTTP node → Twilio API pattern already built and tested in agente_cortes
- Replicate whatsapp_client.py send_message/send_media pattern as n8n HTTP calls
- Credentials needed: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
- Evolution API deferred — revisit if message volume justifies migration


## WhatsApp — Decisão de Plataforma (Jun/2026)
Twilio (já existente em ~/agente_cortes) em vez de Evolution API.
Motivo: Twilio já está construído, testado e integrado com n8n via HTTP node.
O padrão n8n → HTTP node → Twilio API é diretamente transferível para o TennisOS.
Evolution API fica como opção futura se o volume justificar migração.
Replicar o padrão de ~/agente_cortes/src/whatsapp_client.py — não importar o arquivo.
