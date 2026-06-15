// Edge function: génère un structured_workout Nolio depuis le texte d'une séance
// via Lovable AI Gateway (modèle google/gemini-2.5-pro pour JSON robuste).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un expert en planification d'entraînement. Analyse cette séance et génère un structured_workout au format JSON Nolio strict.

Règles de conversion :
- Pour les durées avec plage (ex: '60-120min'), prends toujours la valeur médiane arrondie à 5min près (ex: 90min = 5400s).
- Pour les répétitions avec plage (ex: '6-10x'), prends toujours la valeur maximale.
- Pour les zones avec plage (ex: 'Z1-Z2'), prends toujours la zone la plus haute (ex: Z2).
- Pour les % FTP avec plage (ex: '80-85% FTP'), prends la valeur maximale (85%).
- Pour les zones cardiaques, utilise ces plages depuis fcMax fourni : Z1=50-60%, Z2=60-70%, Z3=70-80%, Z4=80-90%, Z5=90-95%, Z6=95-100%.
- Pour les % FTP, calcule les watts depuis ftp fourni.
- Pour la natation, utilise step_duration_type: 'distance' avec les mètres.
- Pour les répétitions (NxM'), crée un step repetition avec value:N contenant active+rest.

Format de sortie STRICT (JSON uniquement, sans markdown, sans texte autour) :
{
  "sport_id": number,
  "structured_workout": [
    { "type":"step", "intensity_type":"warmup|active|rest|cooldown",
      "step_duration_type":"duration|distance", "step_duration_value": number,
      "target_type":"no_target|heartrate|power|pace",
      "target_value_min"?: number, "target_value_max"?: number },
    { "type":"repetition", "intensity_type":"repetition", "value": number,
      "steps": [ ...steps ci-dessus ] }
  ]
}

sport_id: 2=Course, 14=Vélo, 18=HomeTrainer, 19=Natation, 20=Renfo, 52=Trail.`;

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
    const { sessionId, sessionLabel, sport, workoutText, ftp = 280, fcMax = 185, css = 95, defaultSportId } = body ?? {};

    const userPrompt = `Données athlète de référence : ftp=${ftp}, fcMax=${fcMax}, css=${css} (utilise ces valeurs par défaut pour calculer les zones absolues).

Séance à analyser :
- ID: ${sessionId}
- Titre: ${sessionLabel ?? ""}
- Sport: ${sport ?? ""}
- sport_id par défaut suggéré: ${defaultSportId ?? 2}

Texte complet :
${workoutText ?? ""}

Retourne UNIQUEMENT le JSON valide.`;

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
