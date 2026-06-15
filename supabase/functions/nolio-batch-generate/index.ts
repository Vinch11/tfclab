// Batch génération de structures Nolio (max 20 par appel)
// Le client envoie les séances complètes (texte + meta). Pas de dépendance à workoutLibrary côté serveur.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un expert en planification d'entraînement triathlon. Analyse cette séance et génère un structured_workout JSON Nolio strict. Applique ces règles sans exception :

DURÉES : plage '60-120min' → médiane arrondie à 5min (90min = 5400s). '1h30' → 5400s. '45'' → 2700s. Valeur unique → valeur exacte.

RÉPÉTITIONS : plage '6-10x' → maximum (10). Valeur unique '5x' → 5.

ZONES : plage 'Z1-Z2' → zone la plus haute (Z2). Mapping depuis refs athlète : Z1=FC 0-70%/FTP 0-55%, Z2=FC 70-78%/FTP 56-75%, Z3=FC 78-83%/FTP 76-90%, Z4a=FC 83-87%/FTP 88-93%, Z4b=FC 87-91%/FTP 94-98%, Z5=FC 91-94%/FTP 99-105%, Z6=FC 95-100%/FTP 106-120%.

% FTP : CONSERVE TOUJOURS LA PLAGE COMPLÈTE. '80-85% FTP' → target_value_min=round(ftp*0.80), target_value_max=round(ftp*0.85). '85% FTP' seul → target_value_min=round(ftp*0.83), target_value_max=round(ftp*0.87) (±2% autour de la valeur). Si zone Z sans % explicite → utilise les % min et max du mapping de la zone.

% VMA : CONSERVE TOUJOURS LA PLAGE. '90-95% VMA' → target_value_min=round(3600/(vma*0.95*1000/3600)), target_value_max=round(3600/(vma*0.90*1000/3600)) (attention : plus vite = pace plus petite). '95% VMA' seul → ±2% autour de la valeur.

% CSS natation : CONSERVE LA PLAGE. 'CSS+5' → target_value_min=css, target_value_max=css+5 en secondes/100m.

FC : CONSERVE LA PLAGE. 'Z2' → target_value_min=round(fcMax*0.70), target_value_max=round(fcMax*0.78).

TARGET TYPE : vélo/puissance → power en watts. Allure/VMA/pace → pace en secondes/km. FC/bpm → heartrate en bpm. Sinon → no_target.

NATATION : step_duration_type='distance' en mètres. Repos 'r=15s' ou 'r=15"' → step rest duration 15s.

RÉPÉTITIONS NxM : type='repetition', value=N, steps=[active(M*60s, target avec plage), rest(récup, no_target ou Z1)].

STRUCTURE : warmup → blocs principaux → cooldown. Main avec NxM' → repetition. Main sans intervalles → step active simple avec plage de zone.

sport_id Nolio : 2=Course, 14=Vélo, 18=HomeTrainer, 19=Natation, 20=Renfo, 52=Trail.

Retourne UNIQUEMENT ce JSON sans markdown ni texte : { "sport_id": number, "structured_workout": array }`;

interface WorkoutPayload {
  workout_id: string;
  sessionLabel?: string;
  sport?: string;
  defaultSportId?: number;
  workoutText: string;
  ftp?: number;
  fcMax?: number;
  vma?: number;
  css?: number;
}

interface BatchBody {
  workouts: WorkoutPayload[];
  force_regenerate?: boolean;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Gemini 2.5 Pro pricing (Lovable AI Gateway) : ~$1.25/M in, ~$10/M out
function estimateCost(tokensIn: number, tokensOut: number) {
  return (tokensIn / 1_000_000) * 1.25 + (tokensOut / 1_000_000) * 10;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as BatchBody;
    if (!body?.workouts || !Array.isArray(body.workouts) || body.workouts.length === 0) {
      return new Response(JSON.stringify({ error: "workouts[] required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.workouts.length > 20) {
      return new Response(JSON.stringify({ error: "Max 20 workouts per batch" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Préchargement statuts actuels pour skip si hash identique
    const ids = body.workouts.map((w) => w.workout_id);
    const { data: existing } = await admin
      .from("nolio_structures_generated")
      .select("workout_id, source_text_hash, status")
      .in("workout_id", ids);
    const existingMap = new Map<string, { source_text_hash: string; status: string }>();
    for (const r of (existing ?? []) as any[]) existingMap.set(r.workout_id, r);

    const results: Array<{ workout_id: string; status: string; error?: string }> = [];
    let ok = 0, error = 0, skipped = 0, totalCost = 0;

    for (let i = 0; i < body.workouts.length; i++) {
      const w = body.workouts[i];
      const hash = await sha256Hex(w.workoutText ?? "");
      const prev = existingMap.get(w.workout_id);
      if (!body.force_regenerate && prev?.status === "ok" && prev.source_text_hash === hash) {
        skipped += 1;
        results.push({ workout_id: w.workout_id, status: "skipped" });
        continue;
      }

      const userPrompt = `Refs athlète (utilise ces valeurs pour calculer les zones absolues) :
- ftp = ${w.ftp ?? 280} W
- fcMax = ${w.fcMax ?? 185} bpm
- vma = ${w.vma ?? 18} km/h
- css = ${w.css ?? 95} s/100m

Séance à analyser :
- ID : ${w.workout_id}
- Titre : ${w.sessionLabel ?? ""}
- Sport : ${w.sport ?? ""}
- sport_id par défaut suggéré : ${w.defaultSportId ?? 2}

Texte complet de la séance :
${w.workoutText ?? ""}

Retourne UNIQUEMENT le JSON valide { "sport_id": number, "structured_workout": array }.`;

      try {
        if (i > 0) await sleep(1500); // Rate-limit safety

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-pro",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (!aiRes.ok) {
          const txt = await aiRes.text();
          throw new Error(`AI gateway ${aiRes.status}: ${txt.slice(0, 200)}`);
        }

        const aiJson = await aiRes.json();
        const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
        const tokIn = aiJson?.usage?.prompt_tokens ?? 0;
        const tokOut = aiJson?.usage?.completion_tokens ?? 0;
        const cost = estimateCost(tokIn, tokOut);
        totalCost += cost;

        let parsed: any;
        try { parsed = JSON.parse(content); } catch {
          const m = content.match(/\{[\s\S]*\}/);
          parsed = m ? JSON.parse(m[0]) : null;
        }

        const sport_id = parsed?.sport_id;
        const structured = parsed?.structured_workout;
        if (
          !parsed ||
          typeof sport_id !== "number" ||
          !Array.isArray(structured) ||
          structured.length === 0
        ) {
          throw new Error("Invalid JSON shape from AI");
        }
        if (![2, 14, 18, 19, 20, 52].includes(sport_id)) {
          throw new Error(`Invalid sport_id ${sport_id}`);
        }

        await admin.from("nolio_structures_generated").upsert({
          workout_id: w.workout_id,
          sport_id,
          structured_workout: structured,
          source_text_hash: hash,
          status: "ok",
          error_message: null,
          model: "google/gemini-2.5-pro",
          tokens_in: tokIn,
          tokens_out: tokOut,
          cost_usd: cost,
        }, { onConflict: "workout_id" });

        ok += 1;
        results.push({ workout_id: w.workout_id, status: "ok" });
      } catch (e) {
        const msg = (e as Error).message ?? String(e);
        await admin.from("nolio_structures_generated").upsert({
          workout_id: w.workout_id,
          sport_id: w.defaultSportId ?? 2,
          structured_workout: [],
          source_text_hash: hash,
          status: "error",
          error_message: msg.slice(0, 1000),
          model: "google/gemini-2.5-pro",
        }, { onConflict: "workout_id" });
        error += 1;
        results.push({ workout_id: w.workout_id, status: "error", error: msg });
      }
    }

    return new Response(
      JSON.stringify({
        processed: body.workouts.length,
        ok, error, skipped,
        total_cost_usd: Number(totalCost.toFixed(6)),
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
