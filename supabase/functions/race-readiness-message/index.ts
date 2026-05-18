// Race Readiness — message personnalisé généré par Lovable AI (Gemini)
// Reçoit le contexte athlète + objectif + score readiness et renvoie un message
// chaleureux et factuel ("Vu tes données, tu es prêt à X%...").

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type CoachTone = "fire" | "calm" | "tactical" | "short" | "mentor";

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
  tone?: CoachTone;
}

const TONE_INSTRUCTIONS: Record<CoachTone, string> = {
  fire: `Ton RÉSOLUMENT MOTIVANT et électrique : chauffe l'athlète à blanc, énergie de combat, donne envie de tout casser.
- Verbes d'action, images sportives (chasser, attaquer, dérouler, lâcher les chevaux).
- Clôture qui claque, courte et percutante.
- Structure libre mais 4 temps : ouverture qui claque · 2 armes physiologiques · leviers reformulés en cartes à jouer · clôture qui envoie.`,
  calm: `Ton CALME, POSÉ et RASSURANT : voix de coach serein, confiance tranquille, aucune pression.
- Phrases fluides, respirées, presque méditatives.
- Mots-clés : "sereinement", "à ton rythme", "tu es prêt·e", "confiance", "respire".
- Clôture douce et ancrée. Évite l'emphase et les superlatifs.`,
  tactical: `Ton TACTIQUE et ANALYTIQUE : posture de stratège lucide. L'athlète doit comprendre clairement ses leviers et son plan de course.
- Structuré, précis, factuel mais chaleureux.
- Mets en relief les leviers physiologiques exploitables et comment les jouer en course.
- Clôture orientée plan d'action ("Voilà ta partition pour le jour J").`,
  short: `Ton BREF et DIRECT : 3-4 phrases MAX au total. Punchy, sans fioriture.
- Une phrase verdict. Une phrase forces. Une phrase leviers. Une phrase clôture.
- Pas de markdown, pas de listes, pas de paragraphes longs.`,
  mentor: `Ton MENTOR BIENVEILLANT : coach senior chaleureux qui te connaît bien, ferme et protecteur.
- Phrases pleines, posées, légèrement personnelles ("J'ai vu ton travail, je sais où tu vas").
- Valorise la cohérence du chemin parcouru autant que les chiffres.
- Clôture chaleureuse, presque paternelle/maternelle, qui pose la confiance.`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as ReqPayload;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const tone: CoachTone = payload.tone ?? "fire";
    const toneBlock = TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS.fire;

    const system = `Tu es un coach d'endurance TFCL — bienveillant et factuel.
C'est un bilan PRÉ-OBJECTIF. Plus rien à ajuster — uniquement à VALORISER et CONSOLIDER le mental.
Tu écris en français, à la 2ème personne du singulier (tutoiement). Jamais alarmiste.

== TON À ADOPTER (impératif) ==
${toneBlock}

== Règles communes (toujours) ==
- INTERDIT : "manque", "déficit", "faiblesse", "insuffisant", "problème", "risque", "danger", et tout pourcentage (%, "pour cent", etc.).
- INTERDIT ABSOLU de commencer par une salutation ("Salut", "Bonjour", "Hey", "Coucou", etc.). Ce n'est PAS une lettre, c'est un bilan direct. Démarre directement avec le verdict ou l'accroche.
- PRÉFÉRER : "levier", "arme", "atout", "carte à jouer", "potentiel", "marge", "moteur".
- N'invente AUCUN chiffre qui ne soit pas dans les données fournies.
- Ne mentionne JAMAIS le score chiffré du verdict, uniquement son label («${payload.readinessVerdict.label} ${payload.readinessVerdict.emoji}»).
- Adapte la nuance au verdict : «En feu»/«Prêt» = très positif ; «Prêt avec réserves»/«Moyennement prêt» = confiant et combatif ; «Mieux vaudrait reporter» = honnête mais constructif.`;

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
