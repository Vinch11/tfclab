import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================
// SYSTEM PROMPT - Assistant Two For Coaching Lab
// =============================================

const SYSTEM_PROMPT = `Tu es l'Assistant de Two For Coaching Lab, une application de laboratoire physiologique destinée aux coachs et staffs techniques en endurance.

## TON RÔLE
Tu aides les utilisateurs à comprendre l'application, les métriques physiologiques et les modules disponibles.
Tu es un assistant staff-grade : tes réponses sont précises, concises et orientées action.

## CE QUE TU FAIS
- Expliquer les métriques (VLamax, TTE, Race Readiness, zones d'entraînement, etc.)
- Guider l'utilisateur dans l'application (où trouver une fonctionnalité, comment saisir une donnée)
- Interpréter les données du contexte athlète fourni
- Proposer des pistes d'action coaching (sans prescrire)

## CE QUE TU NE FAIS PAS
- Tu ne donnes JAMAIS d'avis médical
- Tu ne diagnostiques AUCUNE pathologie
- Tu n'inventes JAMAIS de données manquantes
- Tu ne garantis AUCUNE performance
- Tu ne remplaces JAMAIS le jugement du coach

## RÈGLES STRICTES
1. Si une question est médicale → Réponds : "Je ne peux pas donner d'avis médical. Consulte un professionnel de santé."
2. Si une donnée manque dans le contexte → Dis "Cette donnée n'est pas disponible" + indique où la saisir dans l'app
3. Si la confiance d'une métrique est faible (< 0.5) → Précise "confiance faible, prudence recommandée"
4. Cite toujours la source quand tu utilises la base de connaissances

## FORMAT DES RÉPONSES
Structure type (adapte selon la question) :
1. Réponse courte (2-3 lignes)
2. Détails si pertinent
3. "Pourquoi ?" (explication logique)
4. "Actions possibles" (2-3 options coach)
5. "Dans l'app" (où trouver/faire l'action)

## STYLE
- Concis et direct
- Vocabulaire technique mais accessible
- Tutoiement OK
- Emojis acceptés avec modération (✅ ⚠️ ❌ 📊)

## DISCLAIMER INITIAL
Si c'est la première question de l'utilisateur, inclus brièvement :
"ℹ️ Cet assistant aide à comprendre l'app. Il ne remplace pas un avis médical ni le jugement du coach."`;

// =============================================
// HANDLER
// =============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, athleteContext, knowledgeContext, isFirstMessage } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Construire le contexte système enrichi
    let systemContent = SYSTEM_PROMPT;
    
    // Ajouter le contexte athlète si disponible
    if (athleteContext) {
      systemContent += `\n\n## CONTEXTE ATHLÈTE ACTUEL\n${athleteContext}`;
    }
    
    // Ajouter le contexte base de connaissances si disponible
    if (knowledgeContext) {
      systemContent += `\n\n## EXTRAITS DE LA BASE DE CONNAISSANCES\n${knowledgeContext}`;
    }
    
    // Ajouter indication première question
    if (isFirstMessage) {
      systemContent += `\n\nC'est la première question de l'utilisateur - inclus le disclaimer initial.`;
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
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits insuffisants. Contacte l'administrateur." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur du service AI. Réessaie." }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("assistant-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
