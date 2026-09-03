// =============================================
// ASSISTANT CHAT — Tool-calling edge function
// OpenAI-format tools via Lovable AI Gateway
// Streaming SSE preserved for existing client
// =============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  computeRaceScenarios,
  analyzeRacePerformance,
  projectRiegel,
  formatPace,
  formatTime,
  type RaceSnapshotInput,
} from "../_shared/raceAnalysis.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================
// TYPES
// =============================================

interface ChatMessage {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

interface RequestBody {
  messages: { role: "user" | "assistant"; content: string }[];
  athleteContext?: string;
  knowledgeContext?: string;
  missingFields?: string;
  isFirstMessage?: boolean;
  selectedAthleteId?: string | null;
}

// =============================================
// SYSTEM PROMPT (enriched with race analysis methodology)
// =============================================

const SYSTEM_PROMPT = `Tu es l'Assistant Two For Coaching Lab Method™ (TFCL), un assistant staff-grade qui aide les coachs à interpréter la physiologie de leurs athlètes ET à confronter les chronos réels aux prédictions de l'app.

## IDENTITÉ
Two For Coaching Lab Method™ : méthodologie d'analyse physiologique d'endurance, outil d'aide à la décision. Le coach reste décideur final.

## CHARTE D'INTERPRÉTATION (obligatoire)
1. Cite TOUJOURS la SOURCE (🔬 mesurée / 🧠 estimée / 🔁 modélisée)
2. Mentionne la CONFIANCE (élevée >0.85, modérée 0.65-0.85, faible <0.65)
3. Rappelle la plage d'INCERTITUDE quand pertinent
4. Référence la méthode : "Selon TFCL Method™..."
5. Pas de réponse absolue / prescriptive

## ANALYSE DE COURSE (NOUVEAU)

Quand le coach mentionne un CHRONO d'un athlète (ex: "Vince a couru 20km en 1h33", "semi en 1:38", "10K à 38:42") :

1. APPELLE IMMÉDIATEMENT le tool \`analyze_race_performance\` avec distance_km, time_sec, athlete_id (utilise selectedAthleteId du contexte si pas précisé).
2. Présente le tableau des 5 scénarios (Finish/Perf/Sub/Elite/World-class) avec allure + temps prévu.
3. Identifie sur quel scénario tombe la performance, avec l'écart en secondes et %.
4. Interprète physiologiquement :
   - Si %seuil > 97% sur ≥18km → souligne durabilité exceptionnelle, suggère que TTE ≥ durée course OU seuil sous-estimé
   - Si plus rapide qu'attendu → VMA/seuil possiblement sous-estimés
   - Si plus lent → vérifier fatigue, parcours, conditions
5. Compare avec les modèles physio classiques :
   - Daniels T-pace : ~60min soutenables à 100% seuil
   - MLSS : 45-60min soutenables
   - Riegel exposant 1.06 pour projeter à d'autres distances (utilise \`project_riegel\`)
6. PROPOSE une calibration si pertinent en émettant un bloc spécial :

\`\`\`
[PROPOSE_CALIBRATION]
{"athlete_id":"...","evidence_type":"PACED_RACE","raw_values":{"distance_km":20,"time_sec":5580,"date":"2026-06-01"},"notes":"20km à 99% seuil → tte_observed_min_run ≥ 93","confidence_evidence":0.85,"protocol_quality":4}
[/PROPOSE_CALIBRATION]
\`\`\`

Le frontend rendra une carte de validation. Évoque ce bloc SEULEMENT quand un chrono observé apporte une vraie information de calibration (pas pour des questions générales).

## RÈGLES ANTI-HALLUCINATION
- Sources internes uniquement (Academy + contexte runtime + tools)
- Si pas d'info : "Je n'ai pas cette information"
- Si donnée manquante : "Cette donnée n'est pas disponible" + indique où la saisir
- Médical : "❌ Je ne peux pas donner d'avis médical"

## FORMAT DE RÉPONSE

**Réponse courte** (2-3 lignes)

**Pourquoi ?** (chiffres + contexte)

**Tableau / scénarios** (si analyse course)

**Actions possibles** (2-3 options coach)

**📚 Sources** (Academy ou tool utilisé)`;

// =============================================
// TOOL DEFINITIONS (OpenAI format)
// =============================================

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_snapshot_details",
      description: "Récupère le snapshot actif d'un athlète : VMA, allure seuil, VO2max, VLamax, FTP, poids, TTE observé, chronos historiques. Utilise quand tu as besoin de données précises sur l'athlète.",
      parameters: {
        type: "object",
        properties: {
          athlete_id: { type: "string", description: "UUID de l'athlète" },
        },
        required: ["athlete_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compute_race_scenarios",
      description: "Calcule les 5 scénarios (Finish, Perf, Sub, Elite, World-class) pour une distance donnée : allure cible + temps prévu. Basé sur VMA et seuil de l'athlète.",
      parameters: {
        type: "object",
        properties: {
          athlete_id: { type: "string" },
          distance_km: { type: "number", minimum: 1, maximum: 250 },
        },
        required: ["athlete_id", "distance_km"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_race_performance",
      description: "Compare un chrono réel d'un athlète avec les prédictions TFCL. Renvoie scénario le plus proche, écart %, %VMA observé, %seuil observé, signal de recalibration.",
      parameters: {
        type: "object",
        properties: {
          athlete_id: { type: "string" },
          distance_km: { type: "number", minimum: 1, maximum: 250 },
          time_sec: { type: "number", minimum: 60, maximum: 86400 },
        },
        required: ["athlete_id", "distance_km", "time_sec"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "project_riegel",
      description: "Projette un chrono d'une distance à une autre via Riegel (exposant 1.06). Utile pour estimer ex: semi-marathon depuis 20km.",
      parameters: {
        type: "object",
        properties: {
          from_distance_km: { type: "number", minimum: 1 },
          from_time_sec: { type: "number", minimum: 60 },
          to_distance_km: { type: "number", minimum: 1 },
        },
        required: ["from_distance_km", "from_time_sec", "to_distance_km"],
      },
    },
  },
];

// =============================================
// TOOL EXECUTORS
// =============================================

type SupabaseClient = ReturnType<typeof createClient>;

async function fetchSnapshot(supabase: SupabaseClient, athleteId: string, userId: string) {
  // Verify ownership and load active snapshot
  const { data: athlete, error: aErr } = await supabase
    .from("athletes")
    .select("id, name, goal, active_snapshot_id, birth_date, coach_id")
    .eq("id", athleteId)
    .maybeSingle();
  if (aErr || !athlete) return { error: "Athlète introuvable" };
  if (athlete.coach_id !== userId) return { error: "Accès refusé" };

  let snapshot = null;
  if (athlete.active_snapshot_id) {
    const { data } = await supabase
      .from("snapshots")
      .select("*")
      .eq("id", athlete.active_snapshot_id)
      .maybeSingle();
    snapshot = data;
  }
  if (!snapshot) {
    const { data } = await supabase
      .from("snapshots")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    snapshot = data;
  }

  return { athlete, snapshot };
}

function snapshotToRaceInput(snapshot: any, athlete: any): RaceSnapshotInput {
  let ageYears: number | null = null;
  if (athlete?.birth_date) {
    const bd = new Date(athlete.birth_date);
    const t = new Date();
    ageYears = t.getFullYear() - bd.getFullYear();
    const m = t.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < bd.getDate())) ageYears--;
  }
  return {
    vmaKmh: snapshot?.vma ? Number(snapshot.vma) : null,
    thresholdPaceSecPerKm: snapshot?.pace_threshold_sec_per_km ?? null,
    ageYears,
  };
}

async function executeTool(
  name: string,
  args: Record<string, any>,
  supabase: SupabaseClient,
  userId: string,
): Promise<unknown> {
  try {
    switch (name) {
      case "get_snapshot_details": {
        const res = await fetchSnapshot(supabase, args.athlete_id, userId);
        if ("error" in res) return res;
        const { athlete, snapshot } = res;
        if (!snapshot) return { error: "Aucun snapshot disponible" };
        return {
          athlete_name: athlete.name,
          objectif: athlete.goal,
          snapshot_date: snapshot.date,
          snapshot_source: snapshot.source,
          vma_kmh: snapshot.vma,
          threshold_pace_sec_per_km: snapshot.pace_threshold_sec_per_km,
          threshold_pace_formatted: snapshot.pace_threshold_sec_per_km
            ? formatPace(snapshot.pace_threshold_sec_per_km) : null,
          vo2max: snapshot.vo2max,
          vlamax_bike: snapshot.vlamax,
          vlamax_run: snapshot.vlamax_run,
          ftp_w: snapshot.ftp,
          weight_kg: snapshot.weight_kg,
          fc_max: snapshot.fc_max,
          tte_observed_min: snapshot.tte_observed_min,
          tte_observed_min_run: snapshot.tte_observed_min_run,
          tss_7d: snapshot.tss_7d,
          fatigue_state: snapshot.fatigue_state,
          race_times: {
            "5k": snapshot.time_5k_sec ? { time_sec: snapshot.time_5k_sec, date: snapshot.time_5k_date } : null,
            "10k": snapshot.time_10k_sec ? { time_sec: snapshot.time_10k_sec, date: snapshot.time_10k_date } : null,
            "20k": snapshot.time_20k_sec ? { time_sec: snapshot.time_20k_sec, date: snapshot.time_20k_date } : null,
            "half": snapshot.time_half_sec ? { time_sec: snapshot.time_half_sec, date: snapshot.time_half_date } : null,
            "marathon": snapshot.time_marathon_sec ? { time_sec: snapshot.time_marathon_sec, date: snapshot.time_marathon_date } : null,
          },
        };
      }

      case "compute_race_scenarios": {
        const res = await fetchSnapshot(supabase, args.athlete_id, userId);
        if ("error" in res) return res;
        const input = snapshotToRaceInput(res.snapshot, res.athlete);
        const scenarios = computeRaceScenarios(input, args.distance_km);
        if ("error" in scenarios) return scenarios;
        return {
          distance_km: args.distance_km,
          vma_kmh: input.vmaKmh,
          threshold_pace: input.thresholdPaceSecPerKm ? formatPace(input.thresholdPaceSecPerKm) : null,
          scenarios: scenarios.map(s => ({
            label: s.label,
            pct_vma: Math.round(s.pctVMA * 100) + "%",
            pct_threshold: Math.round(s.pctThreshold * 100) + "%",
            pace: formatPace(s.paceSecPerKm),
            time: formatTime(s.timeSec),
            time_sec: s.timeSec,
          })),
        };
      }

      case "analyze_race_performance": {
        const res = await fetchSnapshot(supabase, args.athlete_id, userId);
        if ("error" in res) return res;
        const input = snapshotToRaceInput(res.snapshot, res.athlete);
        const analysis = analyzeRacePerformance(input, args.distance_km, args.time_sec);
        if ("error" in analysis) return analysis;
        return {
          athlete_name: res.athlete.name,
          distance_km: analysis.distanceKm,
          observed_time: formatTime(analysis.observedTimeSec),
          observed_pace: formatPace(analysis.observedPaceSecPerKm),
          closest_scenario: analysis.closestLabel,
          predicted_time: formatTime(analysis.closestPredictedTimeSec),
          error: `${analysis.errorSec >= 0 ? "+" : ""}${analysis.errorSec}s (${analysis.errorPct >= 0 ? "+" : ""}${analysis.errorPct}%)`,
          pct_vma: analysis.pctVMA !== null ? (analysis.pctVMA * 100).toFixed(1) + "%" : null,
          pct_threshold: analysis.pctThreshold !== null ? (analysis.pctThreshold * 100).toFixed(1) + "%" : null,
          scenarios: analysis.scenarios.map(s => ({
            label: s.label,
            pace: formatPace(s.paceSecPerKm),
            time: formatTime(s.timeSec),
          })),
          recalibration_signal: analysis.recalibrationSignal,
        };
      }

      case "project_riegel": {
        const t = projectRiegel(args.from_distance_km, args.from_time_sec, args.to_distance_km);
        return {
          from: `${args.from_distance_km}km en ${formatTime(args.from_time_sec)}`,
          to: `${args.to_distance_km}km en ${formatTime(Math.round(t))}`,
          to_time_sec: Math.round(t),
          to_pace: formatPace(Math.round(t / args.to_distance_km)),
        };
      }

      default:
        return { error: `Tool inconnu: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur tool" };
  }
}

// =============================================
// VALIDATION
// =============================================

function validateRequestBody(body: unknown): RequestBody {
  if (typeof body !== "object" || body === null) throw new Error("Invalid body");
  const obj = body as Record<string, unknown>;
  if (!Array.isArray(obj.messages)) throw new Error("messages must be an array");
  if (obj.messages.length > 50) throw new Error("Too many messages");

  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const msg of obj.messages) {
    if (typeof msg !== "object" || msg === null) throw new Error("Invalid message");
    const m = msg as Record<string, unknown>;
    if (m.role !== "user" && m.role !== "assistant") throw new Error("Invalid role");
    if (typeof m.content !== "string") throw new Error("Invalid content");
    if (m.content.length > 4000) throw new Error("Message too long");
    messages.push({ role: m.role, content: m.content });
  }

  const optStr = (v: unknown, name: string, max: number) => {
    if (v === undefined || v === null) return undefined;
    if (typeof v !== "string") throw new Error(`${name} not string`);
    if (v.length > max) throw new Error(`${name} too long`);
    return v;
  };

  return {
    messages,
    athleteContext: optStr(obj.athleteContext, "athleteContext", 10000),
    knowledgeContext: optStr(obj.knowledgeContext, "knowledgeContext", 20000),
    missingFields: optStr(obj.missingFields, "missingFields", 1000),
    isFirstMessage: typeof obj.isFirstMessage === "boolean" ? obj.isFirstMessage : undefined,
    selectedAthleteId: optStr(obj.selectedAthleteId, "selectedAthleteId", 100),
  };
}

// =============================================
// HANDLER
// =============================================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // Body
    let body: RequestBody;
    try {
      body = validateRequestBody(await req.json());
    } catch (e) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Données invalides" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // Build system content
    let systemContent = SYSTEM_PROMPT;
    if (body.athleteContext) {
      systemContent += `\n\n## CONTEXTE ATHLÈTE RUNTIME\n${body.athleteContext}`;
    }
    if (body.selectedAthleteId) {
      systemContent += `\n\nathlete_id ACTIF (utilise dans les tools) : ${body.selectedAthleteId}`;
    }
    if (body.missingFields) {
      systemContent += `\n\n## CHAMPS MANQUANTS À SIGNALER\n${body.missingFields}`;
    }
    if (body.knowledgeContext) {
      systemContent += `\n\n## EXTRAITS BASE DE CONNAISSANCES\n${body.knowledgeContext}`;
    }
    if (body.isFirstMessage) {
      systemContent += `\n\n## PREMIÈRE QUESTION\nInclus : "ℹ️ Cet assistant utilise la base de connaissances interne et les données runtime. Il ne remplace pas le coach."`;
    }

    // =============================================
    // TOOL LOOP (server-side, non-streaming until final reply)
    // =============================================

    const conversation: ChatMessage[] = [
      { role: "system", content: systemContent },
      ...body.messages,
    ];

    const MAX_TOOL_ROUNDS = 5;
    let finalRound = false;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const callBody: Record<string, unknown> = {
        model: "google/gemini-3.7-flash",
        messages: conversation,
        tools: TOOLS,
      };

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(callBody),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requêtes atteinte." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (resp.status === 402) {
          return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errText = await resp.text();
        console.error("Gateway error:", resp.status, errText);
        return new Response(JSON.stringify({ error: "Erreur AI." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();
      const choice = data.choices?.[0];
      const assistantMsg = choice?.message;

      if (!assistantMsg) {
        return new Response(JSON.stringify({ error: "Réponse AI vide" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const toolCalls = assistantMsg.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        // Execute tools then loop
        conversation.push({
          role: "assistant",
          content: assistantMsg.content || "",
          tool_calls: toolCalls,
        });
        for (const tc of toolCalls) {
          let args: Record<string, any> = {};
          try { args = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }
          const result = await executeTool(tc.function.name, args, supabase, userId);
          conversation.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
        continue; // next round
      }

      // No tool calls → final reply. Re-call with stream:true to pipe to client.
      finalRound = true;
      break;
    }

    if (!finalRound) {
      // Tool loop exhausted — force a final non-tool reply
      conversation.push({
        role: "user",
        content: "Réponds maintenant en synthèse finale sans appeler d'autres tools.",
      });
    }

    // Final streaming call
    const streamResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: conversation,
        stream: true,
      }),
    });

    if (!streamResp.ok || !streamResp.body) {
      return new Response(JSON.stringify({ error: "Erreur streaming final" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(streamResp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("assistant-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
