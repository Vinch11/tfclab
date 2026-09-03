// Batch génération de structures Nolio (max 20 par appel)
// Le client envoie les séances complètes (texte + meta). Pas de dépendance à workoutLibrary côté serveur.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un expert en planification d'entraînement triathlon. Analyse cette séance et génère un structured_workout JSON Nolio strict, en VALEURS ABSOLUES calculées depuis les refs athlète.

═══════════════════════════════════════════════════════════
SCHÉMA UNIQUE OBLIGATOIRE (TOUS SPORTS)
═══════════════════════════════════════════════════════════

Chaque step DOIT respecter EXACTEMENT ce schéma plat :

{
  "type": "step" | "repetition",
  "intensity_type": "warmup" | "active" | "rest" | "cooldown",
  "step_duration_type": "duration" | "distance",
  "step_duration_value": <integer>,
  "target_type": "power" | "pace" | "heartrate" | "no_target",
  "target_value_min": <integer | null>,
  "target_value_max": <integer | null>,
  "comment": <string | null>
}

Pour type="repetition" : ajouter "value": <integer> (nombre de répétitions, spec officielle — JAMAIS "repeat_count") et "steps": [<sub-steps>].

⚠️ NOMBRE DE RÉPÉTITIONS :
- "value" = exactement le nombre du texte. "12x45s" → value:12. Plage "10-15x" → maximum (15). Jamais inventer.

═══════════════════════════════════════════════════════════
🚫 INTERDICTIONS ABSOLUES (prouvées par tests API Nolio)
═══════════════════════════════════════════════════════════

- ❌ JAMAIS de champ "step_percent_low" ni "step_percent_high" — Nolio n'affiche AUCUNE valeur si on utilise step_percent seul. Prouvé par test terrain. On prescrit UNIQUEMENT en valeurs absolues.
- ❌ JAMAIS de pct_ftp_*, pct_vma_*, pct_hrmax_*, pct_css_* dans la sortie. Utilise-les pour CALCULER target_value_min/max, mais ne les émets PAS.
- ❌ JAMAIS d'allure lisible ("4:30/km", "1:36/100m") dans target_value_*. L'allure peut aller dans "comment" uniquement.
- ❌ JAMAIS target_type="speed" ni "duration" ni "empty_unit". Seuls power/pace/heartrate/no_target sont valides.
- ❌ JAMAIS target_value seul (sans _min/_max). Pas d'objet imbriqué "target": {...}.

⚠️ target_value_max EST OBLIGATOIRE dès que target_type != "no_target". target_value_min est optionnel (si présent → range, sinon = même valeur que max).

═══════════════════════════════════════════════════════════
MATRICE DE CIBLES PAR SPORT ET INTENSITÉ (STRICT)
═══════════════════════════════════════════════════════════

🚴 VÉLO (sport_id 14 ou 18) :
- TOUS steps actifs / warmup / cooldown → target_type="power", watts absolus depuis FTP.
- Formule : target_value_min = round(ftp * pct_min/100), target_value_max = round(ftp * pct_max/100).
- Repos dans répétition : target_type="power" avec Z1 (45–55% FTP). PAS de no_target sur les repos vélo.
- step_duration_type="duration" en secondes.

🏃 COURSE / TRAIL (sport_id 2 ou 52) — DEUX MODES SELON L'INTENSITÉ :

  MODE A — TRAVAIL (seuil, tempo, VMA, intervalles, côtes, allure spécifique course, PMA, Z3+, ≥78% VMA) :
  - target_type="pace", valeur en m/s (mètres/seconde) absolue.
  - Formule : target_value_min = round(vma * pct_min/100 * 1000/3600, 2), target_value_max = round(vma * pct_max/100 * 1000/3600, 2).
    Ex : vma=18, allure 90% VMA → 18*0.90/3.6 = 4.5 m/s.
  - Si le texte donne une plage %VMA (ex "85-90%") : min = vitesse basse, max = vitesse haute.

  MODE B — ENDURANCE FACILE (Z1, Z2, récup active, footing facile, sortie longue facile, ≤77% VMA) :
  - target_type="heartrate", valeur en bpm absolue depuis FCmax.
  - Formule : target_value_min = round(fcMax * pct_hrmax_min/100), target_value_max = round(fcMax * pct_hrmax_max/100).
  - Zones FC : Z1=60-70% FCmax, Z2=70-78% FCmax.
  - Si fcMax manque OU refs.fcMax=0 : bascule en target_type="no_target" et ajoute "comment":"FC max non disponible — cible en no_target".

  Récup passive / marche → target_type="no_target".
  step_duration_type="duration" en secondes TOUJOURS (jamais "distance" pour run). "5x1000m" → convertir en durée via VMA.

🏊 NATATION (sport_id 19) :
- Steps actifs → target_type="pace", valeur en m/s absolue depuis CSS.
  Formule : vitesse_ref = 100/css m/s. Pour pct_css X% : vitesse = (100/css) * (100/X). target_value en m/s.
  Ex : css=95 (s/100m), 100% CSS → 100/95 = 1.053 m/s ; 105% CSS (plus lent) → 100/(95*1.05) = 1.003 m/s.
  Mapping zones : Z1=105-115% CSS · Z2=100-105% · Z3=95-100% · Z4-Z5=88-95%. CSS+X → 100 à 100+X%.
- Repos (r=20s) → target_type="no_target".
- step_duration_type="distance" en mètres pour actifs ; "duration" en secondes pour repos.
- JAMAIS target_type="heartrate" en natation, même si le texte dit "Z2".

💪 RENFO / PPG (sport_id 20) :
- target_type="no_target" TOUJOURS. step_duration_type="duration" en secondes.
- Exception : si séance mentionne EXPLICITEMENT une FC (ex "à 75% FCmax") → target_type="heartrate" bpm.

🔗 BRICK :
- Steps séquentiels distincts par sport. Segment vélo → target_type="power" (W). Segment course → matrice course ci-dessus.
- sport_id principal=2.

═══════════════════════════════════════════════════════════
EXEMPLES (à reproduire tel quel — aucun step_percent, aucun pct_*)
═══════════════════════════════════════════════════════════

VÉLO 3x8' 90-95% FTP r=4' (ftp=280) :
[
  {"type":"step","intensity_type":"warmup","step_duration_type":"duration","step_duration_value":900,"target_type":"power","target_value_min":140,"target_value_max":196,"comment":"Z1-Z2 échauffement"},
  {"type":"repetition","value":3,"steps":[
    {"type":"step","intensity_type":"active","step_duration_type":"duration","step_duration_value":480,"target_type":"power","target_value_min":252,"target_value_max":266,"comment":"Seuil 90-95% FTP"},
    {"type":"step","intensity_type":"rest","step_duration_type":"duration","step_duration_value":240,"target_type":"power","target_value_min":126,"target_value_max":154,"comment":"Récup Z1"}
  ]},
  {"type":"step","intensity_type":"cooldown","step_duration_type":"duration","step_duration_value":600,"target_type":"power","target_value_min":112,"target_value_max":154,"comment":"Retour au calme"}
]

RUN travail — 5x1000m à 95% VMA r=90s (vma=18) — VITESSE en m/s :
[
  {"type":"step","intensity_type":"warmup","step_duration_type":"duration","step_duration_value":900,"target_type":"heartrate","target_value_min":111,"target_value_max":144,"comment":"Z1-Z2 échauffement"},
  {"type":"repetition","value":5,"steps":[
    {"type":"step","intensity_type":"active","step_duration_type":"duration","step_duration_value":210,"target_type":"pace","target_value_min":4.75,"target_value_max":4.75,"comment":"95% VMA — allure spécifique"},
    {"type":"step","intensity_type":"rest","step_duration_type":"duration","step_duration_value":90,"target_type":"no_target","target_value_min":null,"target_value_max":null,"comment":"Récup marche/trot"}
  ]},
  {"type":"step","intensity_type":"cooldown","step_duration_type":"duration","step_duration_value":600,"target_type":"heartrate","target_value_min":111,"target_value_max":144,"comment":"Retour au calme"}
]

RUN endurance Z2 60min (vma=18, fcMax=185) — FC en bpm :
[
  {"type":"step","intensity_type":"warmup","step_duration_type":"duration","step_duration_value":600,"target_type":"heartrate","target_value_min":111,"target_value_max":130,"comment":"Z1 échauffement"},
  {"type":"step","intensity_type":"active","step_duration_type":"duration","step_duration_value":2400,"target_type":"heartrate","target_value_min":130,"target_value_max":144,"comment":"Z2 endurance fondamentale"},
  {"type":"step","intensity_type":"cooldown","step_duration_type":"duration","step_duration_value":600,"target_type":"heartrate","target_value_min":111,"target_value_max":130,"comment":"Retour au calme"}
]

NATATION 400 WU + 10x100m CSS r=20s + 200 CD (css=95) — VITESSE en m/s :
[
  {"type":"step","intensity_type":"warmup","step_duration_type":"distance","step_duration_value":400,"target_type":"pace","target_value_min":0.916,"target_value_max":1.003,"comment":"Z1-Z2 échauffement"},
  {"type":"repetition","value":10,"steps":[
    {"type":"step","intensity_type":"active","step_duration_type":"distance","step_duration_value":100,"target_type":"pace","target_value_min":1.003,"target_value_max":1.053,"comment":"100% CSS"},
    {"type":"step","intensity_type":"rest","step_duration_type":"duration","step_duration_value":20,"target_type":"no_target","target_value_min":null,"target_value_max":null,"comment":"Récup"}
  ]},
  {"type":"step","intensity_type":"cooldown","step_duration_type":"distance","step_duration_value":200,"target_type":"pace","target_value_min":0.916,"target_value_max":1.003,"comment":"Retour au calme"}
]

RENFO 45min :
[
  {"type":"step","intensity_type":"warmup","step_duration_type":"duration","step_duration_value":600,"target_type":"no_target","target_value_min":null,"target_value_max":null,"comment":"Mobilité"},
  {"type":"step","intensity_type":"active","step_duration_type":"duration","step_duration_value":1800,"target_type":"no_target","target_value_min":null,"target_value_max":null,"comment":"Circuit PPG"},
  {"type":"step","intensity_type":"cooldown","step_duration_type":"duration","step_duration_value":300,"target_type":"no_target","target_value_min":null,"target_value_max":null,"comment":"Étirements"}
]

═══════════════════════════════════════════════════════════
RÈGLES DE PARSING
═══════════════════════════════════════════════════════════

DURÉES : '60-120min' → médiane arrondie 5min (90min=5400s). '1h30' → 5400s. '45'' → 2700s.
RÉPÉTITIONS : '6-10x' → max (10). '5x' → 5.
ZONES → % défaut : Z1=FC 60-70/FTP 45-55/VMA 60-66, Z2=FC 70-78/FTP 56-75/VMA 67-77, Z3=FC 78-83/FTP 76-90/VMA 78-87, Z4=FC 83-91/FTP 91-98/VMA 88-95, Z5=FC 91-100/FTP 99-110/VMA 96-105.
PLAGE '80-85%' → min=80 max=85. Valeur seule '85%' → ±2% (83-87).

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

const REST_ID_RE = /^REST_|^REPOS_|^D_.*RECOVERY$|^REST$|^REPOS$/i;
const PURE_REST_IDS = new Set(["REST_FULL_DAY", "REPOS_COMPLET"]);
function isRestWorkout(w: WorkoutPayload): boolean {
  return w.isRest === true || REST_ID_RE.test(w.workout_id ?? "");
}
function isPureRest(w: WorkoutPayload): boolean {
  return PURE_REST_IDS.has(w.workout_id ?? "");
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

// Gemini 3.1 Pro Preview pricing (Lovable AI Gateway) : $2/M in, $12/M out
function estimateCost(tokensIn: number, tokensOut: number) {
  return (tokensIn / 1_000_000) * 2 + (tokensOut / 1_000_000) * 12;
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
      if (isRestWorkout(w) && (!body.force_regenerate || isPureRest(w))) {
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
              model: "google/gemini-3.1-pro-preview",
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
          model: "google/gemini-3.1-pro-preview",
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
          model: "google/gemini-3.1-pro-preview",
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
