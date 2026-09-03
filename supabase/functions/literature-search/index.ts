// Literature search via Lovable AI Gateway (Gemini 3.1 Pro Preview + google_search grounding).
// Free alternative to Perplexity API. Returns synthesis + citations.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un physiologiste expert en endurance (Mader, Heck, Beneke, Skiba, Jones, Pallarés, Billat, Coyle, Joyner).

Tu réponds à des questions sur la littérature scientifique en physiologie de l'endurance (VLamax, MLSS, CP/W', VO2max, économie de course, seuils lactate).

RÈGLES :
1. Cite TOUJOURS tes sources (auteur, année, titre court, DOI/URL si possible).
2. Si tu n'es pas sûr d'un chiffre précis, dis-le explicitement.
3. Privilégie les études peer-reviewed récentes (2020-2025) ET les références classiques.
4. Format : synthèse concise (≤400 mots) + liste de sources numérotées en fin de réponse.
5. Si aucune étude pertinente n'est trouvée, dis-le clairement plutôt que d'inventer.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configuré");

    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query requis (string)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-pro-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: query },
        ],
        tools: [{ type: "google_search" }],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Limite IA atteinte, réessayez dans 1 minute." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits IA épuisés. Ajoutez des crédits dans Settings → Workspace." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI Gateway ${aiRes.status}: ${t}`);
    }

    const aiData = await aiRes.json();
    const message = aiData.choices?.[0]?.message;
    const content = message?.content ?? "";
    // Grounding metadata (citations) si fourni par Gemini
    const groundingChunks = aiData.choices?.[0]?.grounding_metadata?.grounding_chunks
      ?? message?.grounding_metadata?.grounding_chunks
      ?? [];
    const citations = Array.isArray(groundingChunks)
      ? groundingChunks
          .map((c: any) => c?.web?.uri || c?.web?.url)
          .filter((u: any): u is string => typeof u === "string")
      : [];

    return new Response(JSON.stringify({ ok: true, content, citations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("literature-search error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
