// Race Readiness — message personnalisé généré par Lovable AI (Gemini)
// Reçoit le contexte athlète + objectif + score readiness et renvoie un message
// chaleureux et factuel ("Vu tes données, tu es prêt à X%...").

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReqPayload {
  athleteName: string;
  raceName: string | null;
  raceType: string;
  raceDateISO: string;
  daysRemaining: number;
  ambition: string;
  objectif: string;
  readinessPct: number; // 0-100
  axes: Array<{ label: string; score: number; target: number | null; value: number | null; unit: string }>;
  limiter: { label: string; description: string } | null;
  strengths: string[];
  gaps: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as ReqPayload;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const system = `Tu es un coach d'endurance bienveillant et factuel (méthode TFCL).
Tu écris en français, à la 2ème personne du singulier (tutoiement).
Tu produis UN message court et chaleureux pour rassurer l'athlète à J-${payload.daysRemaining} de sa course.
Structure attendue (markdown léger, pas de titre H1) :
1. Une ouverture personnalisée (1 phrase) qui annonce le pourcentage de readiness et ce qu'il signifie.
2. Un paragraphe (2-3 phrases) qui pointe 1-2 points forts physiologiques concrets.
3. Un paragraphe (2-3 phrases) qui mentionne 1 point de vigilance s'il y en a, sinon confirme l'alignement global.
4. Une phrase de clôture motivante : "Tout est en place pour que tu puisses performer le jour J."
Reste factuel, jamais alarmiste. Si readiness ≥ 85% : ton confiant. 70-85% : confiant nuancé. <70% : honnête mais constructif.
N'invente AUCUN chiffre qui ne soit pas dans les données fournies.`;

    const userMsg = `Athlète : ${payload.athleteName}
Course : ${payload.raceName ?? payload.raceType} (${payload.raceType}) — le ${payload.raceDateISO} — J-${payload.daysRemaining}
Objectif : ${payload.objectif} | Ambition : ${payload.ambition}
Score de readiness global : ${payload.readinessPct}%

Axes physiologiques (score / cible) :
${payload.axes.map(a => `- ${a.label} : score ${a.score}/100${a.value != null ? ` (valeur ${a.value}${a.unit}${a.target != null ? `, cible ${a.target}${a.unit}` : ""})` : ""}`).join("\n")}

${payload.limiter ? `Limiteur principal : ${payload.limiter.label} — ${payload.limiter.description}` : "Aucun limiteur majeur détecté."}

Points forts : ${payload.strengths.length ? payload.strengths.join(", ") : "—"}
Points de vigilance : ${payload.gaps.length ? payload.gaps.join(", ") : "—"}

Génère le message de bilan pré-objectif.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessaie dans une minute." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits Lovable AI épuisés. Ajoute du crédit dans Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "Erreur génération IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const message = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("race-readiness-message error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
