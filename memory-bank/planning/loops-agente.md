Loops de Agente Auto-Promptado — TennisOS


O Conceito

Um loop de agente auto-promptado é um sistema onde o resultado de uma ação
dispara automaticamente o próximo prompt para um agente de IA — sem intervenção
humana em cada etapa.

Em vez de você ser o intermediário entre cada passo, o sistema opera sozinho
dentro de fluxos previsíveis e repetíveis. Você só aparece quando há uma decisão
real a tomar.


A diferença entre um assistente e um sistema operacional é essa:
o assistente espera você perguntar.
O sistema opera sozinho e te chama quando precisa.




Como Funciona na Prática

Sem loop (como está hoje)


Você agenda uma aula
Você percebe que o widget não atualizou
Você vem ao Claude, descreve o problema
Claude sugere um prompt de debug
Você cola no Claude Code
Claude Code responde
Você interpreta e decide o próximo passo


Tempo seu gasto: alto. Atenção necessária: constante.

Com loop


Você agenda uma aula
Um webhook no n8n dispara automaticamente
O n8n verifica se a sessão apareceu no portal do aluno
Se não apareceu → cria um alerta no seu WhatsApp ou Notion
Se apareceu → registra como OK e arquiva


Tempo seu gasto: zero. Atenção necessária: só quando chega um alerta.


Anatomia de um Loop

Todo loop tem 4 componentes:

ComponentePapelFerramenta no 55TCGatilhoO que inicia o loopWebhook, cron job, evento no SupabaseAgenteQuem executa a tarefaClaude, Gemini, GPT via APICondiçãoO que determina o próximo passoLógica no n8n (if/else, switch)SaídaO que o loop produzEmail, WhatsApp, registro no Notion, alerta


Casos Práticos para o TennisOS

1. Loop de Onboarding Automático

Gatilho: novo lead preenche o formulário em 55tenniscrew.com

Fluxo:


n8n recebe o webhook do Google Forms
Insere o lead na tabela students do Supabase (com email em lowercase)
Claude gera uma mensagem de boas-vindas personalizada com nome e nível declarado
Resend dispara o email de invite com link para /claim
Aguarda 48h → se o aluno não ativou a conta, dispara um lembrete
Aguarda mais 48h → se ainda não ativou, te manda um WhatsApp para follow-up manual


Você faz: nada. Só recebe o WhatsApp se precisar de ação humana.


2. Loop de Feedback Pós-Aula

Gatilho: sessão é marcada como completed no portal

Fluxo:


n8n detecta a mudança de status via webhook do Supabase
Agenda um lembrete para você em 24h
Se em 24h não houver feedback registrado → te manda mensagem: "Você deu aula para [Nome] ontem. Feedback pendente."
Se em 48h ainda não houver → adiciona na seção FEEDBACK DUE do Coach Dashboard com flag de urgência
Quando o feedback é registrado → dispara um email automático para o aluno com o resumo


Você faz: apenas escrever o feedback quando quiser. O sistema te cobra se esquecer.


3. Loop de Análise de Vídeo

Gatilho: upload de vídeo de treino no portal

Fluxo:


n8n detecta novo arquivo no Supabase Storage
Envia o vídeo para Gemini 2.0 Flash com prompt de análise técnica (forehand, footwork, etc.)
Gemini retorna análise estruturada
n8n formata e salva no Notion como rascunho de feedback
Te notifica: "Análise do treino de [Nome] pronta para revisão"
Você revisa, ajusta e publica — o portal do aluno atualiza automaticamente


Você faz: revisão final de 2 minutos ao invés de escrever do zero.


4. Loop de Retenção de Alunos

Gatilho: cron job semanal (toda segunda-feira, 9h)

Fluxo:


n8n consulta o Supabase: quais alunos ativos não tiveram sessão nos últimos 14 dias?
Para cada aluno inativo → Claude gera uma mensagem personalizada (diferente para cada um, baseada no histórico)
n8n envia via WhatsApp ou email
Registra o envio para não repetir na semana seguinte
Se o aluno reagendar → loop de sessão dispara automaticamente


Você faz: aprovar a lista de mensagens antes do envio (uma decisão, não 10 mensagens manuais).


5. Loop de Conteúdo para Instagram

Gatilho: sessão de treino registrada como completed com clips do tipo highlight ou short

Fluxo:


n8n identifica os clips no Supabase
Envia para Claude com prompt: "Gere 3 opções de legenda para Instagram no tom do 55TC para este momento de treino"
Claude retorna 3 opções
n8n salva no Notion numa fila de publicação
Te notifica: "3 legendas prontas para o clip de [Nome] — escolha uma"
Após sua escolha → entrega pronto para postar


Você faz: escolher 1 de 3 opções. Conteúdo nunca trava por falta de tempo para escrever.


Princípios para Construir Loops Bem

1. Loops bons têm uma saída de emergência humana
Sempre inclua uma condição onde o loop para e te chama. Loops infinitos que erram
silenciosamente são piores do que processos manuais.

2. Comece com o loop mais simples possível
Não automatize 10 passos de uma vez. Automatize 2, valide, depois expanda.

3. Cada loop deve resolver uma dor real e repetível
Se você faz algo mais de 3 vezes por semana do mesmo jeito, é candidato a loop.

4. Loops são sistemas — documente-os
Cada loop implementado deve ter uma entrada no Obsidian/Notion com: gatilho,
fluxo, saída esperada, e o que fazer quando falha.

5. O agente executa. Você decide.
Loops não substituem julgamento — eles eliminam trabalho mecânico para que seu
julgamento seja aplicado onde importa.


Roadmap de Implementação

PrioridadeLoopDependênciaImpacto🔴 AltaOnboarding automático (lead → invite)n8n + Supabase webhookElimina trabalho manual diário🔴 AltaLembrete de feedback pós-aulasessions.status + n8n cronResolve gap crítico de retenção🟡 MédiaAnálise de vídeo automáticaWorkflow Gemini já existeAcelera entrega de valor ao aluno🟡 MédiaRetenção de alunos inativosn8n cron + WhatsApp APIProtege receita🟢 BaixaConteúdo para InstagramClips no Supabase + Claude APIAcelera crescimento orgânico


Stack Necessária


n8n (já instalado) — orquestrador dos loops
Supabase Webhooks — gatilhos baseados em eventos do banco
Claude API — geração de texto personalizado
Gemini 2.0 Flash — análise de vídeo (já configurado)
Resend — emails transacionais (já configurado)
Evolution API — WhatsApp (a implementar)



Documento criado em Jun/2026. Implementar após estabilização do TennisOS Portal V1.
