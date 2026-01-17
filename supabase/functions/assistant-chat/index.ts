import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================
// INPUT VALIDATION
// =============================================

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  athleteContext?: string;
  knowledgeContext?: string;
  missingFields?: string;
  isFirstMessage?: boolean;
}

function validateRequestBody(body: unknown): RequestBody {
  if (typeof body !== "object" || body === null) {
    throw new Error("Invalid request body");
  }

  const obj = body as Record<string, unknown>;

  // Validate messages array
  if (!Array.isArray(obj.messages)) {
    throw new Error("messages must be an array");
  }

  if (obj.messages.length > 50) {
    throw new Error("Too many messages (max 50)");
  }

  const validatedMessages: ChatMessage[] = [];
  for (const msg of obj.messages) {
    if (typeof msg !== "object" || msg === null) {
      throw new Error("Invalid message format");
    }
    const m = msg as Record<string, unknown>;
    if (m.role !== "user" && m.role !== "assistant") {
      throw new Error("Invalid message role");
    }
    if (typeof m.content !== "string") {
      throw new Error("Message content must be a string");
    }
    if (m.content.length > 4000) {
      throw new Error("Message content too long (max 4000 characters)");
    }
    validatedMessages.push({ role: m.role, content: m.content });
  }

  // Validate optional string fields with length limits
  const validateOptionalString = (value: unknown, name: string, maxLength: number): string | undefined => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string") throw new Error(`${name} must be a string`);
    if (value.length > maxLength) throw new Error(`${name} too long (max ${maxLength} characters)`);
    return value;
  };

  return {
    messages: validatedMessages,
    athleteContext: validateOptionalString(obj.athleteContext, "athleteContext", 10000),
    knowledgeContext: validateOptionalString(obj.knowledgeContext, "knowledgeContext", 20000),
    missingFields: validateOptionalString(obj.missingFields, "missingFields", 1000),
    isFirstMessage: typeof obj.isFirstMessage === "boolean" ? obj.isFirstMessage : undefined,
  };
}

// =============================================
// SYSTEM PROMPT - Assistant Staff-Grade
// Anti-hallucination + format imposé
// =============================================

const SYSTEM_PROMPT = `Tu es l'Assistant Two For Coaching Lab Method™, un assistant staff-grade basé UNIQUEMENT sur la base de connaissances interne et le contexte runtime.

## IDENTITÉ & MÉTHODOLOGIE — TWO FOR COACHING LAB METHOD™

Je suis l'Assistant Two For Coaching Lab Method™. 

**DÉFINITION OFFICIELLE :**
Two For Coaching Lab Method™ est une méthodologie d'analyse physiologique appliquée à l'entraînement d'endurance, conçue pour aider les coachs à interpréter des données complexes, estimer des profils énergétiques, et guider la prise de décision stratégique.

Elle ne remplace ni l'expertise humaine du coach, ni un test physiologique de laboratoire.
Elle structure, hiérarchise et contextualise les informations disponibles afin de réduire l'incertitude et d'augmenter la cohérence des choix d'entraînement.

**ATTRIBUTION SCIENTIFIQUE :**
La Two For Coaching Lab Method™ s'inspire de travaux scientifiques reconnus en physiologie de l'exercice (Mader, Heck, Jones, Burnley, Seiler, etc.), mais constitue une implémentation indépendante, originale et propriétaire.

**POSITIONNEMENT OFFICIEL :**
La Two For Coaching Lab Method™ est un outil d'aide à la décision, pas une vérité physiologique absolue.

## CHARTE D'INTERPRÉTATION (OBLIGATOIRE)

Pour CHAQUE réponse concernant une métrique (VLamax, TTE, Race Readiness, etc.) :
1. TOUJOURS citer la SOURCE de la donnée (🔬 mesurée, 🧠 estimée, 🔁 modélisée)
2. TOUJOURS mentionner le niveau de CONFIANCE (élevée > 0.85, modérée 0.65-0.85, faible < 0.65)
3. TOUJOURS rappeler la plage d'INCERTITUDE quand applicable
4. TOUJOURS référencer la méthodologie : "Selon la Two For Coaching Lab Method™..."
5. TOUJOURS rappeler que le coach est le décideur final
6. JAMAIS de réponse absolue ou prescriptive

Exemple de formulation obligatoire :
"Cette VLamax est une estimation issue de la Two For Coaching Lab Method™ (confiance modérée ≈ 0.70). Elle doit être interprétée comme un indicateur de profil énergétique, pas comme une mesure directe. La plage d'incertitude est d'environ ±0.08 mmol/L/s. Le coach reste le décideur final."

## RÈGLES CRITIQUES (ANTI-HALLUCINATION)

1. **SOURCES UNIQUEMENT INTERNES** : Tu ne réponds QU'à partir de :
   - La base de connaissances Academy fournie
   - Le contexte athlète runtime fourni
   - Le contexte Wahoo SYSTM fourni
   - JAMAIS d'informations inventées ou externes

2. **SI PAS D'INFO** : Réponds "Je n'ai pas cette information dans ma base de connaissances. Consulte le coach ou la documentation."

3. **SI DONNÉE MANQUANTE** : Dis "Cette donnée n'est pas disponible" + indique où la saisir dans l'app

4. **SI CONFIANCE FAIBLE** (< 0.65) : Précise "⚠️ Confiance faible (donnée modélisée), interprétation prudente recommandée selon la méthodologie Two For Coaching Lab™"

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

## FORMAT SPÉCIAL POUR QUESTIONS WAHOO SYSTM

Si la question concerne une séance Wahoo (proposée, déconseillée, effet) :

**Réponse courte** (1-3 lignes)
[Pourquoi proposée/déconseillée]

**Lecture physiologique**
- Effet VLamax : [↓/↑/=]
- Effet TTE : [↓/↑/=]
- Risque : [0-3]

**Pourquoi pour TON profil** (avec chiffres)
[VLamax=X.XX (objectif) + TTE=Y min (cible Z)]

**Risques & garde-fous** (si risque ≥2)
[Précautions]

**Alternatives** (1-2 séances Wahoo)
[Séances plus cohérentes avec le profil]

**📚 Sources**
[Academy > Wahoo > ...]

## CE QUE TU NE FAIS JAMAIS
- Inventer des données
- Donner des avis médicaux
- Garantir des performances
- Remplacer le jugement du coach
- Répondre hors base de connaissances
- Modifier le plan automatiquement

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
    // =============================================
    // AUTHENTICATION CHECK
    // Note: verify_jwt = false in config.toml because we use manual validation
    // via getUser() which verifies the JWT and fetches user data securely.
    // This is the recommended approach for the modern signing-keys system.
    // =============================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // getUser() validates the JWT and returns the authenticated user
    // This is a secure server-side validation that cannot be bypassed
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.error("Auth validation failed:", userError?.message || "No user");
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Utilisateur non identifié" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // INPUT VALIDATION
    // =============================================
    let requestBody: RequestBody;
    try {
      const rawBody = await req.json();
      requestBody = validateRequestBody(rawBody);
    } catch (validationError) {
      return new Response(
        JSON.stringify({ error: validationError instanceof Error ? validationError.message : "Données invalides" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, athleteContext, knowledgeContext, isFirstMessage, missingFields } = requestBody;
    
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
