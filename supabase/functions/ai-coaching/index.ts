import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { athleteData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build a rich context prompt from athlete data
    const systemPrompt = `Tu es un coach de triathlon expert en physiologie de l'exercice.
Tu analyses les données métaboliques d'un athlète et génères des recommandations d'entraînement personnalisées.

Règles:
- Réponds UNIQUEMENT en français
- Sois concis et actionnable (max 3-5 recommandations)
- Utilise les données fournies (VLamax, FTP, VO2max, TTE, objectif)
- Adapte les conseils à l'objectif de course
- Mentionne les priorités métaboliques (VLamax↓, TTE↑, VO2max↑)
- Indique le niveau d'urgence (🔴 haute, 🟡 moyenne, 🟢 basse)
- Structure ta réponse en sections claires avec des émojis`;

    const userPrompt = buildUserPrompt(athleteData);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit dépassé, réessayez dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Ajoutez des crédits dans les paramètres." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-coaching error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildUserPrompt(data: any): string {
  const lines: string[] = ["Voici les données de l'athlète à analyser:\n"];

  if (data.nom) lines.push(`Athlète: ${data.nom}`);
  if (data.objectif) lines.push(`Objectif: ${data.objectif}`);
  if (data.ambition) lines.push(`Niveau d'ambition: ${data.ambition}`);

  // Bike data
  if (data.ftp) lines.push(`FTP vélo: ${data.ftp}W`);
  if (data.weightKg) lines.push(`Poids: ${data.weightKg}kg`);
  if (data.ftp && data.weightKg) lines.push(`W/kg: ${(data.ftp / data.weightKg).toFixed(2)}`);
  if (data.vlamax) lines.push(`VLamax vélo: ${data.vlamax} mmol/L/s`);
  if (data.vo2max) lines.push(`VO2max: ${data.vo2max} mL/kg/min`);
  if (data.tte) lines.push(`TTE: ${data.tte} min`);
  if (data.pmax5s) lines.push(`Pmax 5s: ${data.pmax5s}W`);

  // Run data
  if (data.vma) lines.push(`VMA: ${data.vma} km/h`);
  if (data.vlamaxRun) lines.push(`VLamax course: ${data.vlamaxRun} mmol/L/s`);
  if (data.css) lines.push(`CSS natation: ${data.css} sec/100m`);

  // FC
  if (data.fcMax) lines.push(`FC Max: ${data.fcMax} bpm`);

  // Streaks
  if (data.snapshotCount) lines.push(`Nombre de snapshots: ${data.snapshotCount}`);
  if (data.lastSnapshotAge !== undefined) lines.push(`Âge du dernier snapshot: ${data.lastSnapshotAge} jours`);

  lines.push("\nGénère 3-5 recommandations d'entraînement personnalisées, classées par priorité.");
  return lines.join("\n");
}
