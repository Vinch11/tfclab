// Extraction d'une cohorte de référence depuis la littérature scientifique
// publiée (Mader, Heck, Beneke, Skiba, Jones, Pallarés, Billat, etc.)
// via Lovable AI Gateway (Gemini 2.5 Pro), avec tool-calling structuré.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un physiologiste de l'exercice expert en endurance (Mader, Heck, Beneke, Skiba, Jones, Pallarés, Billat, Coyle, Costill, Joyner).

Ta mission : extraire de ta connaissance des publications scientifiques de référence en physiologie de l'endurance des cohortes/groupes d'athlètes avec leurs métriques physiologiques mesurées en LABO.

RÈGLES STRICTES :
1. Cite UNIQUEMENT des études réelles et publiquement connues (auteur, année, titre court, DOI si tu en es certain).
2. N'INVENTE AUCUN chiffre. Si tu n'as pas la valeur, omets le champ (null).
3. Une "cohorte" = un groupe d'athlètes d'une étude (ex: "10 cyclistes élites" → 1 entrée avec moyennes du groupe).
4. Privilégie les études avec mesure DIRECTE par lactate (MLSS, Mader-Heck, step-test) ou ergospirométrie (VO2max).
5. Couvre au moins 5 sports/niveaux différents : cyclistes amateurs/élites, coureurs amateurs/élites, triathlètes.
6. Vise 25-40 cohortes diversifiées (M/F, jeune/master, amateur/élite/pro).
7. Pour chaque cohorte, indique le niveau (recreational/trained/well-trained/elite/pro) selon les critères de De Pauw 2013.

UNITÉS STRICTES :
- vo2max : ml/kg/min
- ftp_w : Watts absolus
- vlamax : mmol/L/s
- mlss_pct : fraction de FTP/VMA (0.85 = 85%)
- vma_kmh : km/h
- pace_threshold_sec_per_km : secondes au km
- running_economy : mlO2/kg/km
- cp_w : Watts
- w_prime_j : Joules
- pmax_5s : Watts`;

const COHORT_TOOL = {
  type: "function",
  function: {
    name: "submit_cohort",
    description: "Soumettre la cohorte extraite de la littérature scientifique.",
    parameters: {
      type: "object",
      properties: {
        profiles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              study_author: { type: "string", description: "Premier auteur, ex: 'Pallarés JG'" },
              study_year: { type: "number" },
              study_title: { type: "string" },
              study_doi: { type: "string" },
              cohort_label: { type: "string", description: "Ex: 'Group A - elite road cyclists'" },
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
              notes: { type: "string", description: "Méthode de mesure, particularités." },
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const focus: string = body.focus ?? "endurance général (cyclisme + course + triathlon, tous niveaux)";
    const targetCount: number = Math.min(Math.max(body.targetCount ?? 30, 10), 60);
    const model: string = body.model ?? "google/gemini-2.5-pro";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY manquant");

    const userPrompt = `Extrais ${targetCount} cohortes physiologiques de référence depuis la littérature publiée, focus : ${focus}.

Privilégie les études classiques bien établies :
- Mader (1976, 1991) sur les seuils lactate
- Heck (1985) sur MLSS à 4 mmol
- Beneke (1995, 2003) sur MLSS individuel
- Coyle (1991, 1999) sur économie de course
- Pallarés (2016, 2018) sur seuils cyclisme
- Jones (2010, 2018) sur Critical Power
- Skiba (2012, 2015) sur W'bal
- Billat (1996, 2001) sur VMA et vVO2max
- Joyner & Coyle (2008) sur facteurs de performance
- Lucia, Hopker, Faude, Maunder, Bourdon — récents.

Soumets le résultat via l'outil submit_cohort.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [COHORT_TOOL],
        tool_choice: { type: "function", function: { name: "submit_cohort" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Limite IA atteinte, réessayez dans 1 minute." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI Gateway ${aiRes.status}: ${t}`);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Aucun tool_call retourné par l'IA");

    let parsed: { profiles: any[] };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("Arguments tool_call invalides");
    }
    const profiles = parsed.profiles ?? [];
    if (profiles.length === 0) throw new Error("L'IA n'a retourné aucune cohorte");

    // Service-role client pour insertion (bypasse RLS pour insertion enfants)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const studies = new Set(profiles.map((p: any) => `${p.study_author}-${p.study_year ?? "?"}`));
    const versionStr = `lit-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36).slice(-4)}`;

    const { data: version, error: vErr } = await adminClient
      .from("literature_cohort_versions")
      .insert({
        version: versionStr,
        description: `Extraction IA — focus: ${focus}`,
        model,
        total_profiles: profiles.length,
        total_studies: studies.size,
        created_by: user.id,
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

    const { error: pErr } = await adminClient
      .from("literature_cohort_profiles")
      .insert(rows);
    if (pErr) throw pErr;

    return new Response(JSON.stringify({
      ok: true,
      version: version.version,
      version_id: version.id,
      total_profiles: profiles.length,
      total_studies: studies.size,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-literature-cohort error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
