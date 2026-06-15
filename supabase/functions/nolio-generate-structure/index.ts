// Edge function: génère un structured_workout Nolio depuis le texte d'une séance
// via Lovable AI Gateway (google/gemini-2.5-pro pour JSON robuste, équivalent qualité Claude Sonnet).
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { sessionId, sessionLabel, sport, workoutText, ftp = 280, fcMax = 185, vma = 18, css = 95, defaultSportId } = body ?? {};

    const userPrompt = `Refs athlète (utilise ces valeurs pour calculer les zones absolues) :
- ftp = ${ftp} W
- fcMax = ${fcMax} bpm
- vma = ${vma} km/h
- css = ${css} s/100m

Séance à analyser :
- ID : ${sessionId}
- Titre : ${sessionLabel ?? ""}
- Sport : ${sport ?? ""}
- sport_id par défaut suggéré : ${defaultSportId ?? 2}

Texte complet de la séance :
${workoutText ?? ""}

Retourne UNIQUEMENT le JSON valide { "sport_id": number, "structured_workout": array }.`;

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
      return new Response(JSON.stringify({ error: `AI gateway ${aiRes.status}`, detail: txt }), {
        status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    }

    if (!parsed || typeof parsed !== "object") {
      return new Response(JSON.stringify({ error: "Réponse IA non parsable", raw: content }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
