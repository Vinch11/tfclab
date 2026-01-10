import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================
// SYSTEM PROMPT - Assistant Staff-Grade
// Anti-hallucination + format imposé
// =============================================

const SYSTEM_PROMPT = `Tu es l'Assistant de Two For Coaching Lab, un assistant staff-grade basé UNIQUEMENT sur la base de connaissances interne et le contexte runtime.

## RÈGLES CRITIQUES (ANTI-HALLUCINATION)

1. **SOURCES UNIQUEMENT INTERNES** : Tu ne réponds QU'à partir de :
   - La base de connaissances Academy fournie
   - Le contexte athlète runtime fourni
   - JAMAIS d'informations inventées ou externes

2. **SI PAS D'INFO** : Réponds "Je n'ai pas cette information dans ma base de connaissances. Consulte le coach ou la documentation."

3. **SI DONNÉE MANQUANTE** : Dis "Cette donnée n'est pas disponible" + indique où la saisir dans l'app

4. **SI CONFIANCE FAIBLE** (< 0.5) : Précise "⚠️ Confiance faible, prudence recommandée"

5. **SI QUESTION MÉDICALE** : "❌ Je ne peux pas donner d'avis médical. Consulte un professionnel de santé."

6. **CITE TES SOURCES** : Termine TOUJOURS par "📚 Sources : [titres des articles utilisés]"

## FORMAT DE RÉPONSE OBLIGATOIRE

Structure chaque réponse ainsi :

**Réponse courte** (2-3 lignes max)
[Ta réponse directe]

**Pourquoi ?**
[Explication logique avec les chiffres du contexte si pertinent]

**Actions possibles** (2-3 options coach)
1. [Option 1]
2. [Option 2]
3. [Option 3]

**Dans l'app**
[Où trouver/faire l'action]

**📚 Sources**
[Academy > catégorie > titre des articles utilisés]

## CE QUE TU NE FAIS JAMAIS
- Inventer des données
- Donner des avis médicaux
- Garantir des performances
- Remplacer le jugement du coach
- Répondre hors base de connaissances

## STYLE
- Concis et staff-grade
- Vocabulaire technique mais accessible
- Tutoiement OK
- Emojis : ✅ ⚠️ ❌ 📊 uniquement`;

// =============================================
// HANDLER
// =============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, athleteContext, knowledgeContext, isFirstMessage, missingFields } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Construire le contexte système enrichi
    let systemContent = SYSTEM_PROMPT;
    
    // Ajouter le contexte athlète
    if (athleteContext) {
      systemContent += `\n\n## CONTEXTE ATHLÈTE RUNTIME (données réelles)\n${athleteContext}`;
    } else {
      systemContent += `\n\n## CONTEXTE ATHLÈTE\nAucun athlète sélectionné. Réponds de manière générale mais indique que les réponses seront plus précises avec un athlète sélectionné.`;
    }
    
    // Ajouter les champs manquants
    if (missingFields && missingFields.length > 0) {
      systemContent += `\n\n## CHAMPS MANQUANTS À SIGNALER\n${missingFields}`;
    }
    
    // Ajouter la base de connaissances
    if (knowledgeContext) {
      systemContent += `\n\n## EXTRAITS DE LA BASE DE CONNAISSANCES (SEULE SOURCE AUTORISÉE)\n${knowledgeContext}`;
    } else {
      systemContent += `\n\n## BASE DE CONNAISSANCES\nAucun article pertinent trouvé. Indique que tu n'as pas d'information sur ce sujet.`;
    }
    
    // Disclaimer première question
    if (isFirstMessage) {
      systemContent += `\n\n## PREMIÈRE QUESTION\nInclus ce disclaimer : "ℹ️ Cet assistant utilise uniquement la base de connaissances interne. Il ne remplace pas un avis médical ni le jugement du coach."`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte. Réessaie dans quelques secondes." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants. Contacte l'administrateur." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway error:", response.status);
      return new Response(
        JSON.stringify({ error: "Erreur du service AI. Réessaie." }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("assistant-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
