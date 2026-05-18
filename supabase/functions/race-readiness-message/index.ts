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
  readinessVerdict: { label: string; emoji: string; tagline: string };
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

    const system = `Tu es un coach d'endurance TFCL — bienveillant, factuel, et surtout RÉSOLUMENT MOTIVANT. Ton job : chauffer l'athlète à blanc et l'envoyer en course en pleine confiance, prêt à tout donner.
C'est un bilan PRÉ-OBJECTIF. Plus rien à ajuster — uniquement à GALVANISER, VALORISER et CONSOLIDER le mental de guerrier.
Tu écris en français, à la 2ème personne du singulier (tutoiement). Ton chaud, vibrant, énergique, jamais alarmiste. Tu dois donner envie de chausser les pointes MAINTENANT.

Structure attendue (markdown léger, pas de titre H1) :
1. Une ouverture qui claque (1-2 phrases) : annonce le verdict («${payload.readinessVerdict.label} ${payload.readinessVerdict.emoji}») comme une victoire déjà en marche, fruit de ton travail. Pas de pourcentage, jamais.
2. Un paragraphe (2-3 phrases) qui met en avant 2 points forts physiologiques concrets comme des **armes** que tu emportes en course. Sois imagé, sois fier pour l'athlète.
3. Un paragraphe (2-3 phrases) qui reformule les éventuels écarts en **leviers, marges, cartes à jouer intelligemment** — jamais en faiblesses. Montre comment t'appuyer sur tes forces. Si pas d'écart : célèbre l'alignement total.
4. Une clôture qui envoie : phrase courte, percutante, qui donne envie de tout casser. Style "Tu es prêt. Maintenant, va chercher ce qui t'appartient." (varie la formule).

Règles de ton :
- INTERDIT : "manque", "déficit", "faiblesse", "insuffisant", "problème", "risque", "danger", et tout pourcentage.
- PRÉFÉRER : "levier", "arme", "atout", "carte à jouer", "potentiel", "puissance", "marge", "moteur".
- Verbes d'action et images sportives bienvenus (chasser, attaquer, dérouler, tenir, donner, lâcher les chevaux) — sans cliché grandiloquent.
- Si verdict «En feu» ou «Prêt» : ton triomphant, électrique, ça doit pulser.
- «Prêt avec réserves» / «Moyennement prêt» : ton confiant et combatif — l'athlète a une vraie carte à jouer, valorise sa cohérence et son cran.
- «Mieux vaudrait reporter» : honnête mais chaleureux et constructif — focus sur ce qui est en place et la stratégie pour sortir une belle course malgré tout.
- N'invente AUCUN chiffre qui ne soit pas dans les données fournies.`;

    const userMsg = `Athlète : ${payload.athleteName}
Course : ${payload.raceName ?? payload.raceType} (${payload.raceType}) — le ${payload.raceDateISO} — J-${payload.daysRemaining}
Objectif : ${payload.objectif} | Ambition : ${payload.ambition}
Verdict de readiness global : ${payload.readinessVerdict.label} ${payload.readinessVerdict.emoji} — ${payload.readinessVerdict.tagline}

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
