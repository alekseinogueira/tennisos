// supabase/functions/generate-feedback-analysis/index.ts
//
// Fase F2 — drafts the "Análise do Coach" for the manual feedback path.
// The portal (signed-in coach) POSTs the filled form fields + the student's
// recent feedback history; Claude writes the analysis in Professor Aleksei's
// voice and the coach edits before publishing.
//
// POST body: {
//   student_name: string,
//   fields: { lesson_date?, title?, duration_minutes?, rally_avg?,
//             rating_technique?, rating_intensity?, rating_position?,
//             rating_progress?, quality?, effort?, game_application?,
//             progress_level?, focus_areas?, focus_next?, next_session_goals? },
//   history: array of previous feedbacks (newest first, trimmed client-side)
// }
// → { analysis: string }
//
// AUTH: verify_jwt is OFF (config.toml); guarded by _shared/coach-auth.ts —
// coach/admin JWT or the service-role key. Keeps the Claude key spendable only
// by the coach.
// Secret: ANTHROPIC_API_KEY (Supabase Edge Function secret — never hardcoded).

import Anthropic from "npm:@anthropic-ai/sdk";
import { isCoachOrService } from "../_shared/coach-auth.ts";

const MODEL = "claude-opus-4-8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SYSTEM = `Você é o Professor Aleksei, coach de tênis do 55 Tennis Crew (55TC), em Vancouver.
Você escreve a "Análise do Coach" de um feedback de treino para um aluno seu.

Regras da sua voz:
- Português brasileiro, primeira pessoa, direto, sem jargão técnico vazio.
- FOCO EXTERNO sempre: fale de bola, trajetória, alvo, espaço e tempo — nunca de segmento corporal ("gire o quadril", "dobre o cotovelo" são proibidos).
- Tom diagnóstico e honesto, não elogio vazio. Aponte o que sustenta o jogo e o que trava.
- Ancore no que os dados da sessão mostram (ratings, focos, rally, indicadores) e, quando houver histórico, marque a evolução ou a regressão em relação aos treinos anteriores.
- Feche apontando para o próximo passo (o foco/objetivos da próxima sessão, se informados).
- 4 a 8 frases corridas. SEM títulos, SEM markdown, SEM listas — só o texto da análise, pronto para o aluno ler.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  if (!(await isCoachOrService(req))) {
    return json({ error: "Unauthorized." }, 401);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return json({ error: "AI service is not configured." }, 500);
  }

  let payload: {
    student_name?: string;
    fields?: Record<string, unknown>;
    history?: unknown[];
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const studentName = String(payload.student_name ?? "").trim();
  if (!studentName || !payload.fields) {
    return json({ error: "student_name and fields are required." }, 400);
  }
  const history = Array.isArray(payload.history)
    ? payload.history.slice(0, 5)
    : [];

  const userPrompt = [
    `Aluno: ${studentName}`,
    "",
    "Dados que o coach preencheu para a sessão de hoje (JSON):",
    JSON.stringify(payload.fields, null, 1),
    "",
    history.length
      ? `Histórico dos últimos feedbacks do aluno, do mais recente ao mais antigo (JSON):\n${
        JSON.stringify(history, null, 1)
      }`
      : "Este é o primeiro feedback do aluno no portal — não há histórico.",
    "",
    "Escreva a Análise do Coach desta sessão.",
  ].join("\n");

  const anthropic = new Anthropic({ apiKey });
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    if (response.stop_reason === "refusal") {
      return json({ error: "The model declined this request." }, 502);
    }
    const analysis = response.content
      .filter((b) => b.type === "text")
      .map((b) => ("text" in b ? b.text : ""))
      .join("")
      .trim();
    if (!analysis) {
      return json({ error: "The model returned no analysis." }, 502);
    }
    return json({ analysis });
  } catch (err) {
    console.error("Anthropic API error:", err);
    return json({ error: "Could not generate the analysis." }, 502);
  }
});
