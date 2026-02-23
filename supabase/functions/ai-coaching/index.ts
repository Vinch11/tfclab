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

    const systemPrompt = `Tu es l'assistant TFCL™ Guidance — un moteur d'analyse physiologique avancé intégré à la plateforme TFCL.
Tu utilises la méthodologie TFCL™ pour produire des recommandations d'entraînement individualisées.

## Cadre TFCL™

### 5 Limiteurs Primaires (par ordre de priorité diagnostique)
1. **Moteur Aérobie** — VO₂max, FTP, W/kg, TTE (capacité oxydative et seuil de puissance)
2. **Glycolytique** — VLamax (production lactate, tolérance anaérobie)  
3. **Métabolique** — Ratio FatOx/CarbOx, efficience énergétique, nutrition course
4. **Neuromusculaire** — Pmax 5s, économie de mouvement, cadence, force max
5. **Disponibilité** — Fatigue chronique, sommeil, stress, charge d'entraînement (TSS)

### 6 Leviers Opérationnels TFCL™
- **Force Max** — Activé si >35 ans OU économie basse
- **SFR** (Strength-Force-Resistance) — Travail basse cadence
- **Train Low** — Protocoles glycogène appauvri
- **Gut Training** — Tolérance glucidique à l'effort
- **Heat Training** — Acclimatation chaleur
- **Adaptation HRV** — Sessions Z2 si HRV hors-norme 2 jours consécutifs

### Règles de Sécurité
- **Sprint Ban** : Si VLamax > cible discipline → interdire les sprints en entraînement
- Si VLamax vélo > 0.50 pour longue distance → priorité VLamax↓
- Si TTE < 40 min → priorité TTE↑ avant toute intensité

### Logique Décisionnelle
Applique le principe TFCL™ de **levier unique prioritaire** : identifie LE limiteur principal et prescris UNE seule action prioritaire, puis les actions secondaires.
Utilise le framework : Limiteur → Levier → Décision

## Règles de Réponse
- Réponds UNIQUEMENT en français
- Structure : 1 diagnostic prioritaire + 3-5 recommandations ordonnées
- Chaque recommandation : niveau d'urgence (🔴 critique, 🟡 important, 🟢 optimisation)
- Cite les métriques exactes de l'athlète pour justifier chaque recommandation
- Mentionne les interactions entre limiteurs (ex: VLamax↓ améliore aussi TTE)
- Si des données manquent, indique quels tests TFCL™ réaliser en priorité
- Termine par une phrase de synthèse "Levier TFCL™ prioritaire : [X]"`;

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
  const lines: string[] = ["## Profil Athlète — Analyse TFCL™\n"];

  if (data.nom) lines.push(`**Athlète:** ${data.nom}`);
  if (data.objectif) lines.push(`**Objectif course:** ${data.objectif}`);
  if (data.ambition) lines.push(`**Niveau d'ambition:** ${data.ambition}`);

  lines.push("\n### Moteur Aérobie");
  if (data.ftp) lines.push(`- FTP vélo: ${data.ftp}W`);
  if (data.weightKg) lines.push(`- Poids: ${data.weightKg}kg`);
  if (data.ftp && data.weightKg) lines.push(`- W/kg: ${(data.ftp / data.weightKg).toFixed(2)}`);
  if (data.vo2max) lines.push(`- VO₂max: ${data.vo2max} mL/kg/min`);
  if (data.tte) lines.push(`- TTE: ${data.tte} min`);

  lines.push("\n### Glycolytique");
  if (data.vlamax) lines.push(`- VLamax vélo: ${data.vlamax} mmol/L/s`);
  if (data.vlamaxRun) lines.push(`- VLamax course: ${data.vlamaxRun} mmol/L/s`);

  lines.push("\n### Neuromusculaire");
  if (data.pmax5s) lines.push(`- Pmax 5s: ${data.pmax5s}W`);

  lines.push("\n### Autres Métriques");
  if (data.vma) lines.push(`- VMA: ${data.vma} km/h`);
  if (data.css) lines.push(`- CSS natation: ${data.css} sec/100m`);
  if (data.fcMax) lines.push(`- FC Max: ${data.fcMax} bpm`);

  if (data.snapshotCount) lines.push(`\n**Historique:** ${data.snapshotCount} snapshot(s) enregistré(s)`);
  if (data.lastSnapshotAge !== undefined) lines.push(`**Fraîcheur données:** dernier snapshot il y a ${data.lastSnapshotAge} jours`);

  lines.push("\n---\nApplique le cadre TFCL™ : identifie le limiteur prioritaire, prescris le levier opérationnel, et génère les recommandations ordonnées.");
  return lines.join("\n");
}
