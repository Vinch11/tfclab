// Auto-extraction de cohortes récentes (2023-2025) depuis le web :
// 1) Gemini + google_search trouve les études récentes
// 2) Même modèle extrait les cohortes via tool-calling structuré
// 3) Insertion dans literature_cohort_versions + profiles (service-role)
//
// Peut être appelé :
// - Manuellement par un coach (auth requise)
// - Par un cron hebdomadaire (header x-cron-secret)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SYSTEM_PROMPT = `Tu es un physiologiste expert en endurance.
Tu reçois une question + des résultats web (Google Search grounding).
Ta mission : extraire des cohortes physiologiques RÉELLES depuis ces publications récentes (2023-2025).

RÈGLES :
1. UNIQUEMENT des études réelles trouvées dans les résultats web (cite auteur+année+DOI).
2. N'INVENTE AUCUN chiffre. Si une métrique est absente, mets-la à null/omets-la.
3. Une cohorte = un groupe d'athlètes d'une étude.
4. Vise 5-15 cohortes selon la richesse des résultats.
5. Unités : vo2max ml/kg/min, ftp_w W, vlamax mmol/L/s, mlss_pct fraction (0.85), vma_kmh km/h, pace_threshold_sec_per_km s/km, running_economy mlO2/kg/km, cp_w W, w_prime_j J, pmax_5s W.

Soumets le résultat via l'outil submit_cohort.`;

const COHORT_TOOL = {
  type: "function",
  function: {
    name: "submit_cohort",
    description: "Soumettre les cohortes extraites des publications web récentes.",
    parameters: {
      type: "object",
      properties: {
        profiles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              study_author: { type: "string" },
              study_year: { type: "number" },
              study_title: { type: "string" },
              study_doi: { type: "string" },
              cohort_label: { type: "string" },
              sport: { type: "string", enum: ["bike", "run", "tri", "swim", "xc-ski", "rowing"] },
              sex: { type: "string", enum: ["M", "F", "mixed"] },
              age_mean: { type: "number" },
              weight_kg: { type: "number" },
              height_cm: { type: "number" },
              level: { type: "string", enum: ["recreational", "trained", "well-trained", "elite", "pro"] },
              vo2max: { type: "number" },
              ftp_w: { type: "number" },
              ftp_w_kg: { type: "number" },
              vlamax: { type: "number" },
              mlss_pct: { type: "number" },
              vma_kmh: { type: "number" },
              pace_threshold_sec_per_km: { type: "number" },
              running_economy: { type: "number" },
              cp_w: { type: "number" },
              w_prime_j: { type: "number" },
              pmax_5s: { type: "number" },
              notes: { type: "string" },
            },
            required: ["study_author", "sport", "level"],
            additionalProperties: false,
          },
        },
      },
      required: ["profiles"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY manquant");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth : soit JWT user, soit cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    const isCron = cronSecret && cronSecret === Deno.env.get("CRON_SECRET");

    if (!isCron) {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Non autorisé" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      userId = user.id;
    }

    const body = await req.json().catch(() => ({}));
    const focus: string = body.focus
      ?? "VLamax, MLSS, Critical Power, running economy chez cyclistes/coureurs/triathlètes (2023-2025)";

    const userPrompt = `Recherche dans les publications scientifiques récentes (2023-2025) sur :
"${focus}"

Identifie les études peer-reviewed les plus pertinentes (PubMed, Sports Medicine, IJSPP, MSSE, EJAP, JSCR, Frontiers Physiol).
Pour CHAQUE étude trouvée, extrais les cohortes avec leurs métriques physiologiques mesurées.

Soumets toutes les cohortes via l'outil submit_cohort.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        // Combine grounding (web search) + tool extraction
        tools: [{ type: "google_search" }, COHORT_TOOL],
        tool_choice: "auto",
      }),
    });

    if (aiRes.status === 429) return new Response(
      JSON.stringify({ error: "Limite IA atteinte, réessayez dans 1 minute." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
    if (aiRes.status === 402) return new Response(
      JSON.stringify({ error: "Crédits IA épuisés." }),
      { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI Gateway ${aiRes.status}: ${t}`);
    }

    const aiData = await aiRes.json();
    const message = aiData.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.find((t: any) => t?.function?.name === "submit_cohort");
    if (!toolCall) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Aucune cohorte extraite (l'IA n'a pas trouvé d'études exploitables).",
        raw_content: message?.content ?? null,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const profiles = parsed.profiles ?? [];
    if (profiles.length === 0) throw new Error("Aucune cohorte dans le tool_call");

    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
    const studies = new Set(profiles.map((p: any) => `${p.study_author}-${p.study_year ?? "?"}`));
    const versionStr = `auto-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36).slice(-4)}`;

    const { data: version, error: vErr } = await adminClient
      .from("literature_cohort_versions")
      .insert({
        version: versionStr,
        description: `Auto-extraction web — ${focus}`,
        model: "google/gemini-2.5-pro+grounding",
        total_profiles: profiles.length,
        total_studies: studies.size,
        created_by: userId, // null si cron
      })
      .select()
      .single();
    if (vErr) throw vErr;

    const rows = profiles.map((p: any) => ({
      version_id: version.id,
      study_author: p.study_author,
      study_year: p.study_year ?? null,
      study_title: p.study_title ?? null,
      study_doi: p.study_doi ?? null,
      cohort_label: p.cohort_label ?? null,
      sport: p.sport,
      sex: p.sex ?? null,
      age_mean: p.age_mean ?? null,
      weight_kg: p.weight_kg ?? null,
      height_cm: p.height_cm ?? null,
      level: p.level ?? null,
      vo2max: p.vo2max ?? null,
      ftp_w: p.ftp_w ?? null,
      ftp_w_kg: p.ftp_w_kg ?? null,
      vlamax: p.vlamax ?? null,
      mlss_pct: p.mlss_pct ?? null,
      vma_kmh: p.vma_kmh ?? null,
      pace_threshold_sec_per_km: p.pace_threshold_sec_per_km ?? null,
      running_economy: p.running_economy ?? null,
      cp_w: p.cp_w ?? null,
      w_prime_j: p.w_prime_j ?? null,
      pmax_5s: p.pmax_5s ?? null,
      notes: p.notes ?? null,
      raw_payload: p,
    }));

    const { error: pErr } = await adminClient.from("literature_cohort_profiles").insert(rows);
    if (pErr) throw pErr;

    return new Response(JSON.stringify({
      ok: true,
      version: version.version,
      version_id: version.id,
      total_profiles: profiles.length,
      total_studies: studies.size,
      triggered_by: isCron ? "cron" : "user",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("auto-extract-recent-literature error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
