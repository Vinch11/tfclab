import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { athleteData, planConfig, regenerateWeek } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Tu es le moteur de planification TFCL™ Plan Generator — un système expert de périodisation d'entraînement de niveau mondial, intégré à la plateforme Two For Coaching Lab. Ta méthodologie est directement inspirée de Dan Lorang (coach de Jan Frodeno, Anne Haug, Laura Philipp) et des meilleures pratiques du coaching d'endurance élite (INSCYD, TrainingPeaks methodology, Joel Filliol, Brett Sutton, Mikal Iden's coaching team).

## Ta Mission
Générer un plan d'entraînement COMPLET ET INTÉGRAL couvrant TOUTES les semaines demandées, semaine par semaine, séance par séance, individualisé selon :
- Le profil physiologique de l'athlète (limiteurs identifiés via le modèle INSCYD/TFCL)
- L'objectif course et le temps restant
- La méthodologie TFCL™ / Dan Lorang

## RÈGLE CRITIQUE : PLAN COMPLET OBLIGATOIRE
⚠️ Tu DOIS générer TOUTES les semaines du plan, de la semaine 1 jusqu'à la dernière semaine.
- NE JAMAIS t'arrêter avant la fin. NE JAMAIS résumer ou abréger.
- NE JAMAIS écrire "les semaines suivantes suivent le même schéma".
- Chaque semaine DOIT avoir son propre tableau complet avec 7 jours.

## RATIOS SPORT/VOLUME PAR OBJECTIF (Méthodologie Dan Lorang / Élite Mondial)

### IRONMAN (IM) — Modèle Lorang/Frodeno (15-25h/sem)
| Sport | % Volume | Séances/sem | Clés |
|-------|----------|-------------|------|
| Vélo | 45-55% | 4-5 | Sorties longues 4-6h Z2, SFR, sweet spot 88-93% FTP |
| CAP | 20-25% | 3-4 | Briques prioritaires. Allure IM = 80-85% VMA. Max 2h30 |
| Natation | 15-20% | 4-5 | 3-4km/séance. CSS + technique + OWS. Volume constant toute la prépa |
| Renfo | 5-10% | 2 | Core, prévention, force fonctionnelle |
⚠️ Chaque semaine : min 3 natation, 3 vélo, 3 CAP. 1-2 briques/sem en phase spécifique.
Spécificités : Train Low 2-3x/sem en base. Gut Training progressif 30→90g/h. Reverse periodization.

### 70.3 — Modèle Lorang/Haug (12-18h/sem)
| Sport | % Volume | Séances/sem | Clés |
|-------|----------|-------------|------|
| Vélo | 40-48% | 3-4 | Sorties longues 3-4h, intervalles seuil 2x20min@85-90% FTP |
| CAP | 25-30% | 3-4 | Plus d'intensité qu'IM. Allure 70.3 = 85-90% VMA |
| Natation | 15-20% | 3-4 | 2.5-3.5km/séance. Départ rapide + CSS |
| Renfo | 5-10% | 2 | Force + pliométrie légère |
⚠️ Chaque semaine : min 2 natation, 2 vélo, 2 CAP.

### MARATHON — Modèle Kipchoge/Canova (8-14h, 60-130km/sem)
| Sport | % Volume | Séances/sem | Clés |
|-------|----------|-------------|------|
| CAP | 85-90% | 5-7 | 80% Z1-Z2. Sortie longue progressive 25→35km |
| Renfo | 10-15% | 2-3 | Pliométrie, core, prévention |
Séances clés : 2 qualité/sem + 1 sortie longue. Tempo 10-15km. Allure marathon finish en SL.

### SEMI-MARATHON (6-10h, 40-90km/sem)
| Sport | % Volume | Séances/sem | Clés |
|-------|----------|-------------|------|
| CAP | 85-90% | 5-6 | VMA + seuil. Allure semi = 88-92% VMA |
| Renfo | 10-15% | 2 | Pliométrie, gainage |

### 10K / 5K
CAP 85-90%, Renfo 10-15%. Accent VO2max pour 5K, seuil pour 10K.

### TRAIL COURT (<42km) — Modèle Kilian Jornet
CAP/Trail 75-80% (spécifique D+), Renfo 20-25% (excentrique, escaliers, proprioception).

### TRAIL LONG/ULTRA (>42km) — Modèle UTMB
CAP/Trail 70-80%, Renfo 15-20%, Cross-training 5-10% (vélo Z1 pour volume sans impact).

## Méthodologie TFCL™ (Dan Lorang)

### Principes Fondamentaux
1. **Polarisation 80/20** — 80% Z1-Z2, 20% Z4-Z5. Minimiser Z3 sauf en phase spécifique.
2. **Bloc-Périodisation** — 1 stimulus dominant par bloc 2-4 sem (ex: Bloc VLamax↓ → Bloc VO2max → Bloc Race-Pace).
3. **Progression non-linéaire** — Charge 3:1 (ou 2:1 si >45 ans ou fragile).
4. **Reverse Periodization (Lorang)** — Pour IM/70.3 : intensité d'abord en base, puis volume en build.
5. **Train Low, Compete High** — Z1-Z2 à jeun en base. JAMAIS d'intensité en Train Low.

### 5 Limiteurs Primaires (INSCYD/TFCL)
1. **Moteur Aérobie** — VO₂max, FTP/kg, TTE. Cibles : IM 4.0+ W/kg, Marathon VMA 18+
2. **Glycolytique** — VLamax. IM cible 0.25-0.35, 70.3 0.30-0.40, Marathon 0.25-0.35, 5K 0.40-0.55
3. **Métabolique** — FatMax, Train Low, efficience
4. **Neuromusculaire** — Pmax, économie, cadence, SFR
5. **Disponibilité** — CTL, fatigue, ne pas augmenter CTL >5-7 pts/sem

### 6 Leviers Opérationnels
- **Force Max** — Si >35 ans OU économie basse OU trail. 2x/sem base, 1x/sem spécifique.
- **SFR** — Vélo 50-60 RPM, pente 4-6%, blocs 5-10min.
- **Train Low** — Séances à jeun matin Z1-Z2, sorties longues sans glucides 2h.
- **Gut Training** — 30-40g/h (sem 1-4) → 50-60 (sem 5-8) → 70-90 (sem 9+).
- **Heat Training** — 10-14j sauna post-entraînement si course chaude.
- **HRV Adaptation** — 2j hors-norme → Z2 uniquement. 3j → repos.

### Règles de Sécurité
- **Sprint Ban** si VLamax > cible discipline
- VLamax vélo > 0.50 longue distance → Z2 uniquement 3-4 sem
- TTE < 40 min → TTE↑ avant intensité
- Décharge -30-40% volume toutes les 3-4 sem
- Max 2 séances haute intensité/sem
- 1 jour repos complet/sem
- Jamais 2 séances clés le même jour sauf brique planifiée

### Périodisation par Objectif
**IM (16-24 sem) :** Base (4-6s, Force+VLamax↓+technique nat) → Build (4-6s, sweet spot+Train Low+Gut) → Spécifique (4-6s, race-pace+briques+OWS) → Taper (2-3s, -40%→-60%)
**70.3 (12-16 sem) :** Base (3-4s) → Build (3-4s, seuil+SFR+CSS) → Spécifique (3-4s, race-pace+transitions) → Taper (10-14j)
**Marathon (12-20 sem) :** Base (4-6s, volume+renfo) → Build (4-6s, seuil+SL progressive) → Spécifique (3-4s, allure marathon+simulation) → Taper (2-3s)
**Semi (8-12 sem) :** Base+VMA (3-4s) → Seuil+allure (3-4s) → Spécifique (2-3s) → Taper (7-10j)

## Format de Sortie OBLIGATOIRE

\`\`\`
# Plan TFCL™ — [Objectif] — [Nombre] semaines

## Diagnostic TFCL™
**Limiteur prioritaire :** [limiteur]
**Levier activé :** [levier]
**Stratégie globale :** [1-2 phrases]
**Répartition sport :** [ex: Vélo 48% | CAP 25% | Natation 18% | Renfo 9%]

## Phase 1 : [Nom] (Semaines 1-X)
**Objectif physiologique :** [objectif]
**Volume cible :** [heures/semaine]

### Semaine 1 — [Thème]
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération |
| Mardi | Natation | [Titre] | [Distance, séries, allure CSS] |
| ... | ... | ... | ... |

**Volume semaine :** [Xh total — Nat Xh | Vélo Xh | CAP Xh | Renfo Xmin]
**Consignes coach :** [2-3 points clés]
\`\`\`

## Règles de Réponse
- Réponds UNIQUEMENT en français
- GÉNÈRE TOUTES LES SEMAINES sans exception
- Chaque séance : sport, titre, détails avec zones/durées/intensités précises
- Zones : Z1 (récup), Z2 (endurance), Z3 (tempo/sweet spot), Z4 (seuil), Z5 (VO2max)
- Vélo : puissance cible %FTP + watts si connu
- CAP : allure cible %VMA + min/km si connu
- Natation : distance + séries + allure CSS
- Indique le volume total par semaine avec répartition par sport
- Respecte STRICTEMENT les ratios sport imposés par l'objectif
- Cite les métriques de l'athlète pour justifier chaque choix
- Si données manquantes, adapte prudemment et mentionne les hypothèses`;

    let userPrompt: string;
    if (regenerateWeek) {
      userPrompt = `Régénère UNIQUEMENT la Semaine ${regenerateWeek.weekNumber} du plan.
Contexte : ${regenerateWeek.phase || "Phase inconnue"}, thème "${regenerateWeek.theme || "Standard"}".
Plan total : ${regenerateWeek.totalWeeks} semaines.

${buildUserPrompt(athleteData, planConfig)}

IMPORTANT : Ne génère QUE la Semaine ${regenerateWeek.weekNumber} au format tableau obligatoire. Pas les autres semaines.`;
    } else {
      userPrompt = buildUserPrompt(athleteData, planConfig);
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
    console.error("ai-training-plan error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildUserPrompt(data: any, config: any): string {
  const lines: string[] = ["## Demande de Plan d'Entraînement TFCL™\n"];

  // --- Config ---
  lines.push("### Configuration du Plan");
  if (config.objective) lines.push(`- **Objectif course :** ${config.objective}`);
  if (config.raceName) lines.push(`- **Nom de la course :** ${config.raceName}`);
  if (config.raceDate) lines.push(`- **Date de course :** ${config.raceDate}`);
  if (config.weeksAvailable) lines.push(`- **Semaines disponibles :** ${config.weeksAvailable}`);
  if (config.weeklyHours) lines.push(`- **Heures dispo/semaine :** ${config.weeklyHours}h`);
  if (config.sessionsPerWeek) lines.push(`- **Séances/semaine max :** ${config.sessionsPerWeek}`);
  if (config.ambition) lines.push(`- **Niveau d'ambition :** ${config.ambition}`);
  if (config.constraints) lines.push(`- **Contraintes :** ${config.constraints}`);

  // --- Athlete Profile ---
  lines.push("\n### Profil Athlète");
  if (data.nom) lines.push(`- **Nom :** ${data.nom}`);

  lines.push("\n#### Moteur Aérobie");
  if (data.ftp) lines.push(`- FTP vélo : ${data.ftp}W`);
  if (data.weightKg) lines.push(`- Poids : ${data.weightKg}kg`);
  if (data.ftp && data.weightKg) lines.push(`- W/kg : ${(data.ftp / data.weightKg).toFixed(2)}`);
  if (data.vo2max) lines.push(`- VO₂max : ${data.vo2max} mL/kg/min`);
  if (data.tte) lines.push(`- TTE : ${data.tte} min`);

  lines.push("\n#### Glycolytique");
  if (data.vlamax) lines.push(`- VLamax vélo : ${data.vlamax} mmol/L/s`);
  if (data.vlamaxRun) lines.push(`- VLamax course : ${data.vlamaxRun} mmol/L/s`);

  lines.push("\n#### Neuromusculaire");
  if (data.pmax5s) lines.push(`- Pmax 5s : ${data.pmax5s}W`);

  lines.push("\n#### Autres Métriques");
  if (data.vma) lines.push(`- VMA : ${data.vma} km/h`);
  if (data.css) lines.push(`- CSS natation : ${data.css} sec/100m`);
  if (data.fcMax) lines.push(`- FC Max : ${data.fcMax} bpm`);

  // --- Identified weaknesses ---
  if (config.identifiedLimiters && config.identifiedLimiters.length > 0) {
    lines.push("\n### Limiteurs Identifiés par l'App");
    config.identifiedLimiters.forEach((l: string) => lines.push(`- 🔴 ${l}`));
  }

  if (config.activeLevers && config.activeLevers.length > 0) {
    lines.push("\n### Leviers TFCL™ Actifs");
    config.activeLevers.forEach((l: string) => lines.push(`- ⚡ ${l}`));
  }

  // Sport coherence reminder based on objective
  const obj = (config.objective || "").toUpperCase();
  if (obj === "IM") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE IRONMAN");
    lines.push("Objectif IRONMAN → applique les ratios Lorang/Frodeno :");
    lines.push("- Vélo 45-55% | CAP 20-25% | Natation 15-20% | Renfo 5-10%");
    lines.push("- Min 3 natation/sem (technique + CSS + OWS), 4 vélo/sem, 3 CAP/sem");
    lines.push("- Briques vélo→CAP 1-2x/sem en phase spécifique");
    lines.push("- Train Low 2-3x/sem en phase base");
    lines.push("- Gut Training progressif obligatoire");
  } else if (obj === "703") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE 70.3");
    lines.push("Objectif 70.3 → applique les ratios Lorang/Haug :");
    lines.push("- Vélo 40-48% | CAP 25-30% | Natation 15-20% | Renfo 5-10%");
    lines.push("- Min 3 natation/sem, 3 vélo/sem, 3 CAP/sem");
    lines.push("- Plus d'intensité seuil/tempo qu'en IM");
  } else if (obj === "MARATHON") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE MARATHON");
    lines.push("- CAP 85-90% | Renfo 10-15%. Pas de natation ni vélo.");
    lines.push("- 2 séances qualité/sem + 1 sortie longue progressive");
  } else if (obj === "SEMI") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE SEMI");
    lines.push("- CAP 85-90% | Renfo 10-15%. Accent VMA + seuil.");
  } else if (["TRAIL", "TRAILSHORT", "TRAILMOUNTAIN", "TRAILULTRA"].includes(obj)) {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE TRAIL");
    lines.push("- CAP/Trail 70-80% | Renfo spécifique 20-25%");
    lines.push("- Force excentrique, côtes, proprioception obligatoires");
  }

  const weeks = config.weeksAvailable || 12;
  lines.push(`\n---\nGénère le plan COMPLET de ${weeks} semaines, semaine par semaine, SANS EN OMETTRE AUCUNE. Chaque semaine a son propre tableau de 7 jours. Ne résume jamais. Chaque séance doit être actionnable immédiatement.`);
  return lines.join("\n");
}
