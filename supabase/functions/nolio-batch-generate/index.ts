// Batch génération de structures Nolio (max 20 par appel)
// Le client envoie les séances complètes (texte + meta). Pas de dépendance à workoutLibrary côté serveur.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un expert en planification d'entraînement triathlon. Analyse cette séance et génère un structured_workout JSON Nolio strict.

═══════════════════════════════════════════════════════════
SCHÉMA UNIQUE OBLIGATOIRE (TOUS SPORTS, AUCUNE VARIATION)
═══════════════════════════════════════════════════════════

Chaque step DOIT respecter EXACTEMENT ce schéma plat, avec ces clés exactes :

{
  "type": "step" | "repetition",
  "intensity_type": "warmup" | "active" | "rest" | "cooldown",
  "step_duration_type": "duration" | "distance",
  "step_duration_value": <integer>,
  "target_type": "power" | "pace" | "heartrate" | "no_target",
  "target_value_min": <integer | null>,
  "target_value_max": <integer | null>,
  "pct_ftp_min": <number | null>,   // vélo uniquement
  "pct_ftp_max": <number | null>,   // vélo uniquement
  "pct_vma_min": <number | null>,   // run uniquement
  "pct_vma_max": <number | null>,   // run uniquement
  "pct_hrmax_min": <number | null>, // FC uniquement
  "pct_hrmax_max": <number | null>, // FC uniquement
  "pct_css_min": <number | null>,   // natation uniquement
  "pct_css_max": <number | null>    // natation uniquement
}

Pour type="repetition" : ajouter "value": <integer> (nombre de répétitions, nom de champ officiel Nolio) et "steps": [<sub-steps respectant le même schéma>]. NE JAMAIS utiliser "repeat_count" — la spec Nolio impose "value".

INTERDICTIONS ABSOLUES :
- ❌ JAMAIS de préfixe step_target_*, step_target[] (tableau), target_value (sans _min/_max).
- ❌ JAMAIS d'objet imbriqué "target": { ... }.
- ❌ JAMAIS de clés "duration_value", "step_duration" seules : c'est TOUJOURS "step_duration_value" + "step_duration_type".
- ❌ JAMAIS plusieurs cibles dans un step. Une seule combinaison target_type/pct/value par step.
- ❌ JAMAIS de clés inventées (effort_min, intensity, zone, etc.).

═══════════════════════════════════════════════════════════
RÈGLES PAR SPORT (STRICT)
═══════════════════════════════════════════════════════════

VÉLO (sport_id=14 ou 18) :
- target_type="power" TOUJOURS sur steps actifs (watts depuis FTP).
- Calcul : target_value_min=round(ftp*pct_ftp_min/100), target_value_max=round(ftp*pct_ftp_max/100).
- step_duration_type="duration" en secondes.
- Seuls pct_ftp_min/max renseignés (pct_vma/hrmax/css = null).

RUN (sport_id=2 ou 52) :
- target_type="pace" TOUJOURS sur steps actifs (secondes/km depuis VMA). JAMAIS "heartrate" sauf si la séance mentionne EXPLICITEMENT la FC (ex : "à 75% FCmax").
- Calcul : target_value_min=round(3600/(vma*pct_vma_max/100)), target_value_max=round(3600/(vma*pct_vma_min/100)). (Plus pct élevé = plus vite = pace plus petite, donc inversion min/max.)
- step_duration_type="duration" en secondes (ou "distance" en mètres si la séance le précise explicitement, ex : "5x1000m").
- Seuls pct_vma_min/max renseignés (sauf cas FC explicite : alors target_type="heartrate", pct_hrmax_min/max, autres pct = null).

NATATION (sport_id=19) :
- target_type="pace" TOUJOURS. JAMAIS "heartrate" même si la séance dit "Z2".
- Mapping zones : Z1 → pct_css 105-115 · Z2 → 100-105 · Z3 → 95-100 · Z4/Z5 → 88-95. CSS+X → pct_css 100 à 100+X.
- Calcul : target_value_min=round(css*pct_css_min/100), target_value_max=round(css*pct_css_max/100).
- step_duration_type="distance" en mètres pour blocs actifs ; "duration" en secondes pour les repos.
- Repos (r=20s) : target_type="no_target", target_value_min/max=null, pct_css_min/max=null.
- Seuls pct_css_min/max renseignés.

RENFO / STRENGTH (sport_id=20) :
- target_type="no_target" TOUJOURS.
- step_duration_type="duration" en secondes TOUJOURS.
- target_value_min/max=null, tous pct_* = null.

BRICK :
- Une SEULE cible par step. Si la séance combine vélo + run, créer des steps séquentiels distincts : d'abord les steps vélo (target_type="power", pct_ftp_*), puis les steps run (target_type="pace", pct_vma_*). Jamais de step "mixte".
- sport_id principal=2 (le segment vélo reste dans la séquence mais sera géré comme run pour la planif Nolio).

═══════════════════════════════════════════════════════════
EXEMPLES COMPLETS (à reproduire à l'identique)
═══════════════════════════════════════════════════════════

EXEMPLE VÉLO (3x8' à 90-95% FTP, r=4', ftp=280) :
[
  {"type":"step","intensity_type":"warmup","step_duration_type":"duration","step_duration_value":900,"target_type":"power","target_value_min":140,"target_value_max":196,"pct_ftp_min":50,"pct_ftp_max":70,"pct_vma_min":null,"pct_vma_max":null,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":null,"pct_css_max":null},
  {"type":"repetition","value":3,"steps":[
    {"type":"step","intensity_type":"active","step_duration_type":"duration","step_duration_value":480,"target_type":"power","target_value_min":252,"target_value_max":266,"pct_ftp_min":90,"pct_ftp_max":95,"pct_vma_min":null,"pct_vma_max":null,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":null,"pct_css_max":null},
    {"type":"step","intensity_type":"rest","step_duration_type":"duration","step_duration_value":240,"target_type":"no_target","target_value_min":null,"target_value_max":null,"pct_ftp_min":null,"pct_ftp_max":null,"pct_vma_min":null,"pct_vma_max":null,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":null,"pct_css_max":null}
  ]},
  {"type":"step","intensity_type":"cooldown","step_duration_type":"duration","step_duration_value":600,"target_type":"power","target_value_min":112,"target_value_max":154,"pct_ftp_min":40,"pct_ftp_max":55,"pct_vma_min":null,"pct_vma_max":null,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":null,"pct_css_max":null}
]

EXEMPLE RUN (Z2 endurance 60min, vma=18) :
[
  {"type":"step","intensity_type":"warmup","step_duration_type":"duration","step_duration_value":600,"target_type":"pace","target_value_min":327,"target_value_max":360,"pct_ftp_min":null,"pct_ftp_max":null,"pct_vma_min":60,"pct_vma_max":66,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":null,"pct_css_max":null},
  {"type":"step","intensity_type":"active","step_duration_type":"duration","step_duration_value":2400,"target_type":"pace","target_value_min":277,"target_value_max":300,"pct_ftp_min":null,"pct_ftp_max":null,"pct_vma_min":67,"pct_vma_max":72,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":null,"pct_css_max":null},
  {"type":"step","intensity_type":"cooldown","step_duration_type":"duration","step_duration_value":600,"target_type":"pace","target_value_min":327,"target_value_max":360,"pct_ftp_min":null,"pct_ftp_max":null,"pct_vma_min":60,"pct_vma_max":66,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":null,"pct_css_max":null}
]

EXEMPLE NATATION (400 WU + 10x100m CSS r=20s + 200 CD, css=95) :
[
  {"type":"step","intensity_type":"warmup","step_duration_type":"distance","step_duration_value":400,"target_type":"pace","target_value_min":100,"target_value_max":109,"pct_ftp_min":null,"pct_ftp_max":null,"pct_vma_min":null,"pct_vma_max":null,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":105,"pct_css_max":115},
  {"type":"repetition","value":10,"steps":[
    {"type":"step","intensity_type":"active","step_duration_type":"distance","step_duration_value":100,"target_type":"pace","target_value_min":95,"target_value_max":100,"pct_ftp_min":null,"pct_ftp_max":null,"pct_vma_min":null,"pct_vma_max":null,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":100,"pct_css_max":105},
    {"type":"step","intensity_type":"rest","step_duration_type":"duration","step_duration_value":20,"target_type":"no_target","target_value_min":null,"target_value_max":null,"pct_ftp_min":null,"pct_ftp_max":null,"pct_vma_min":null,"pct_vma_max":null,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":null,"pct_css_max":null}
  ]},
  {"type":"step","intensity_type":"cooldown","step_duration_type":"distance","step_duration_value":200,"target_type":"pace","target_value_min":100,"target_value_max":109,"pct_ftp_min":null,"pct_ftp_max":null,"pct_vma_min":null,"pct_vma_max":null,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":105,"pct_css_max":115}
]

EXEMPLE RENFO (PPG 45min) :
[
  {"type":"step","intensity_type":"warmup","step_duration_type":"duration","step_duration_value":600,"target_type":"no_target","target_value_min":null,"target_value_max":null,"pct_ftp_min":null,"pct_ftp_max":null,"pct_vma_min":null,"pct_vma_max":null,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":null,"pct_css_max":null},
  {"type":"step","intensity_type":"active","step_duration_type":"duration","step_duration_value":1800,"target_type":"no_target","target_value_min":null,"target_value_max":null,"pct_ftp_min":null,"pct_ftp_max":null,"pct_vma_min":null,"pct_vma_max":null,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":null,"pct_css_max":null},
  {"type":"step","intensity_type":"cooldown","step_duration_type":"duration","step_duration_value":300,"target_type":"no_target","target_value_min":null,"target_value_max":null,"pct_ftp_min":null,"pct_ftp_max":null,"pct_vma_min":null,"pct_vma_max":null,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":null,"pct_css_max":null}
]

EXEMPLE BRICK (60' vélo Z2 + 20' run Z2 enchaîné, ftp=280, vma=18) :
[
  {"type":"step","intensity_type":"warmup","step_duration_type":"duration","step_duration_value":600,"target_type":"power","target_value_min":140,"target_value_max":182,"pct_ftp_min":50,"pct_ftp_max":65,"pct_vma_min":null,"pct_vma_max":null,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":null,"pct_css_max":null},
  {"type":"step","intensity_type":"active","step_duration_type":"duration","step_duration_value":3000,"target_type":"power","target_value_min":182,"target_value_max":210,"pct_ftp_min":65,"pct_ftp_max":75,"pct_vma_min":null,"pct_vma_max":null,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":null,"pct_css_max":null},
  {"type":"step","intensity_type":"active","step_duration_type":"duration","step_duration_value":1200,"target_type":"pace","target_value_min":277,"target_value_max":300,"pct_ftp_min":null,"pct_ftp_max":null,"pct_vma_min":67,"pct_vma_max":72,"pct_hrmax_min":null,"pct_hrmax_max":null,"pct_css_min":null,"pct_css_max":null}
]

═══════════════════════════════════════════════════════════
RÈGLES DE PARSING
═══════════════════════════════════════════════════════════

DURÉES : '60-120min' → médiane arrondie 5min (90min=5400s). '1h30' → 5400s. '45'' → 2700s.
RÉPÉTITIONS : '6-10x' → maximum (10). '5x' → 5.
ZONES → % par défaut : Z1=FC 60-70/FTP 45-55/VMA 60-66, Z2=FC 70-78/FTP 56-75/VMA 67-77, Z3=FC 78-83/FTP 76-90/VMA 78-87, Z4=FC 83-91/FTP 91-98/VMA 88-95, Z5=FC 91-100/FTP 99-110/VMA 96-105.
PLAGE '80-85%' → conserver min=80 max=85. Valeur seule '85%' → ±2% (83-87).

sport_id Nolio : 2=Course, 14=Vélo, 18=HomeTrainer, 19=Natation, 20=Renfo, 52=Trail.

Retourne UNIQUEMENT ce JSON sans markdown : { "sport_id": number, "structured_workout": array, "schema_version": "v2-hybrid" }. Le champ "schema_version":"v2-hybrid" est OBLIGATOIRE.`;

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
  isRest?: boolean;
}

const REST_ID_RE = /REST|REPOS|RECOVERY/i;
function isRestWorkout(w: WorkoutPayload): boolean {
  return w.isRest === true || REST_ID_RE.test(w.workout_id ?? "");
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
    if (body.workouts.length > 5) {
      return new Response(JSON.stringify({ error: "Max 5 workouts per batch (timeout safety)" }), {
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

    // Préparation : calcul hash + skip
    type Task = { w: WorkoutPayload; hash: string };
    const tasks: Task[] = [];
    for (const w of body.workouts) {
      const hash = await sha256Hex(w.workoutText ?? "");
      const prev = existingMap.get(w.workout_id);
      if (!body.force_regenerate && prev?.status === "ok" && prev.source_text_hash === hash) {
        skipped += 1;
        results.push({ workout_id: w.workout_id, status: "skipped" });
        continue;
      }
      // Exclusion séances de repos : insert direct skip sans appel LLM
      if (isRestWorkout(w)) {
        await admin.from("nolio_structures_generated").upsert({
          workout_id: w.workout_id,
          source_text_hash: hash,
          sport_id: w.defaultSportId ?? null,
          structured_workout: [],
          schema_version: "v2-hybrid",
          status: "skip",
          error_message: "Séance de repos — pas de structure Nolio nécessaire",
          tokens_in: 0,
          tokens_out: 0,
          cost_usd: 0,
        }, { onConflict: "workout_id" });
        skipped += 1;
        results.push({ workout_id: w.workout_id, status: "skip" });
        continue;
      }
      tasks.push({ w, hash });
    }

    const processOne = async ({ w, hash }: Task) => {
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
        // Per-call timeout (120s) so a single slow session can't kill the whole batch
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 120_000);
        let aiRes: Response;
        try {
          aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            signal: ctrl.signal,
          });
        } finally {
          clearTimeout(timer);
        }

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
    };

    // Pool de concurrence : 5 séances en parallèle
    const CONCURRENCY = 8;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= tasks.length) return;
        await processOne(tasks[idx]);
      }
    });
    await Promise.all(workers);

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
