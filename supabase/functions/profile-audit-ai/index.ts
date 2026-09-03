// supabase/functions/profile-audit-ai/index.ts
// Audit physiologique approfondi via Lovable AI (Gemini 2.5 Flash)
// Analyse contextuelle nuancée du snapshot + findings statiques

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un expert en physiologie de l'endurance et en méthodologie TFCL™ (Two For Coaching Lab Method).

Ton rôle : analyser un snapshot d'athlète et expliquer aux coachs pourquoi le moteur produit certains résultats surprenants — comme un physiologiste expérimenté qui décortique une analyse douteuse.

CONTEXTE TFCL™ :
- Le moteur V2 Bike utilise une approche Mader-First : il résout l'inverse Mader-MLSS à partir de FTP+VO2max+poids pour estimer la VLamax.
- Bornes physiologiques VLamax : 0.20-0.90 mmol/L/s. Plancher 0.20-0.22 = signal d'alarme (données insuffisantes/incohérentes).
- MAP doit être ~125-140% du FTP. Pmax 5s typiquement 2.5-3.5× FTP.
- Confiance < 0.65 = ne pas se fier aux estimations brutes.

STYLE DE RÉPONSE :
- Direct, pédagogique, sans flatterie
- Commence TOUJOURS par : "Ce n'est pas un bug, c'est le résultat de..." si des problèmes existent, ou "Le profil est cohérent..." sinon
- Distingue clairement : (1) ce que dit le moteur, (2) pourquoi mécaniquement, (3) ce qui manque ou cloche, (4) actions concrètes
- Cite les chiffres exacts du snapshot
- Ne dépasse pas 350 mots
- Format Markdown avec des sous-titres ###`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: verify caller has a valid session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { snapshot, athleteName, staticFindings } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY manquant");

    const userPrompt = `ATHLÈTE : ${athleteName ?? "anonyme"}
DATE SNAPSHOT : ${snapshot.date ?? "inconnue"}
SPORT PRINCIPAL : ${snapshot.sport_main ?? "bike"}
OBJECTIF : ${snapshot.objectif ?? "?"}

DONNÉES BRUTES :
- FTP : ${snapshot.ftp ?? "—"} W
- Poids : ${snapshot.weight_kg ?? "—"} kg
- FTP/kg : ${snapshot.ftp && snapshot.weight_kg ? (snapshot.ftp / snapshot.weight_kg).toFixed(2) : "—"} W/kg
- MAP 5min : ${snapshot.map5min_w ?? "—"} W
- Pmax 5s : ${snapshot.pmax_5s ?? "—"} W
- P30s : ${snapshot.p30s_w ?? "—"} W
- P60s : ${snapshot.p60s_w ?? "—"} W
- VO2max : ${snapshot.vo2max ?? "—"} ml/kg/min
- VLamax vélo : ${snapshot.vlamax ?? "—"} mmol/L/s (source : ${snapshot.vlamax_source ?? "estimée"})
- VLamax course (mesure terrain) : ${snapshot.vlamax_run ?? "—"} mmol/L/s
- Sport principal : ${snapshot.sport_main ?? "—"} ⇒ pour juger la glycolyse pertinente, utilise la VLamax course si sport = run/trail, sinon VLamax vélo
- TTE : ${snapshot.tte_observed_min ?? "—"} min (${snapshot.tte_mode ?? "?"})
- TSS 7j : ${snapshot.tss_7d ?? "—"}
- Confiance globale : ${snapshot.confidence ? Math.round(snapshot.confidence * 100) + "%" : "—"}
- État fatigue : ${snapshot.fatigue_state ?? "?"}

FINDINGS DÉTECTÉS PAR LE MOTEUR DE RÈGLES :
${(staticFindings ?? []).map((f: any) => `- [${f.severity}] ${f.title} → ${f.detail}`).join("\n") || "(aucun)"}

MISSION :
1. Confirme ou nuance les findings.
2. Identifie les incohérences que les règles statiques auraient ratées (ex: scénarios de profil rares, croisements multi-facteurs).
3. Explique mécaniquement pourquoi le moteur produit le résultat actuel.
4. Donne 2-3 actions priorisées pour le coach, dans l'ordre d'impact.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Limite IA atteinte, réessayez dans 1 minute." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI Gateway ${res.status}: ${t}`);
    }

    const data = await res.json();
    const analysis = data.choices?.[0]?.message?.content ?? "Aucune analyse générée.";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("profile-audit-ai error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
