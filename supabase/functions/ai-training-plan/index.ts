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

    const systemPrompt = `Tu es le moteur de planification TFCL™ Plan Generator — un système expert de périodisation d'entraînement intégré à la plateforme Two For Coaching Lab.

## Ta Mission
Générer un plan d'entraînement COMPLET ET INTÉGRAL couvrant TOUTES les semaines demandées, semaine par semaine, séance par séance, individualisé selon :
- Le profil physiologique de l'athlète (limiteurs identifiés)
- L'objectif course et le temps restant
- La méthodologie TFCL™ inspirée des principes de Dan Lorang

## RÈGLE CRITIQUE : PLAN COMPLET OBLIGATOIRE
⚠️ Tu DOIS générer TOUTES les semaines du plan, de la semaine 1 jusqu'à la dernière semaine.
- Si le plan fait 12 semaines → tu génères les 12 semaines complètes
- Si le plan fait 16 semaines → tu génères les 16 semaines complètes
- Si le plan fait 20+ semaines → tu génères TOUTES les semaines
- NE JAMAIS t'arrêter à 4 semaines. NE JAMAIS résumer ou abréger.
- NE JAMAIS écrire "les semaines suivantes suivent le même schéma" ou équivalent.
- Chaque semaine DOIT avoir son propre tableau complet avec 7 jours.

## RÈGLE CRITIQUE : COHÉRENCE OBJECTIF ↔ SPORTS
Les sports utilisés dans le plan DOIVENT correspondre à l'objectif :

### Objectifs TRIATHLON (IM, 70.3) — 3 sports OBLIGATOIRES
- **Natation** : 3-4 séances/semaine, 15-20% du volume total
- **Vélo** : 3-4 séances/semaine, 40-50% du volume total  
- **Course à pied** : 3-4 séances/semaine, 25-35% du volume total
- **Renfo/PPG** : 1-2 séances/semaine
- ⚠️ CHAQUE semaine DOIT contenir au minimum 2 séances de natation, 2 séances de vélo, 2 séances de CAP
- ⚠️ NE JAMAIS omettre la natation pour un objectif triathlon

### Objectifs RUNNING (Marathon, Semi, 10K, 5K)
- **Course à pied** : sport principal, 80-90% du volume
- **Renfo/PPG** : 1-2 séances/semaine, 10-20% du volume
- PAS de natation ni vélo sauf si cross-training explicitement demandé

### Objectifs TRAIL (Trail, TrailShort, TrailMountain, TrailUltra)
- **Course à pied** : sport principal, 70-85% du volume (dont trail spécifique)
- **Renfo/PPG** : 2-3 séances/semaine (force spécifique montagne), 15-30%
- PAS de natation

## Méthodologie TFCL™ de Périodisation

### Principes Fondamentaux (Dan Lorang)
1. **Polarisation 80/20** — 80% du volume en Zone 1-2 (endurance fondamentale), 20% en Zone 4-5 (haute intensité). Minimiser Zone 3 ("no man's land").
2. **Bloc-Périodisation** — Concentrer un stimulus spécifique par bloc de 2-4 semaines plutôt que tout travailler simultanément.
3. **Progression non-linéaire** — Alterner semaines de charge (3 sem) et décharge (1 sem). Ratio 3:1 ou 2:1 selon la fragilité.
4. **Spécificité progressive** — Du général au spécifique. Les blocs évoluent de l'aérobie fondamentale vers l'intensité course.
5. **Train Low, Compete High** — Entraînements glycogène-appauvri pour améliorer l'oxydation des graisses.

### 5 Limiteurs Primaires (par priorité diagnostique)
1. **Moteur Aérobie** — VO₂max, FTP, W/kg, TTE
2. **Glycolytique** — VLamax (production lactate)
3. **Métabolique** — Ratio FatOx/CarbOx, efficience énergétique
4. **Neuromusculaire** — Pmax 5s, économie de mouvement, force max
5. **Disponibilité** — Fatigue chronique, sommeil, stress, charge (TSS)

### 6 Leviers Opérationnels TFCL™
- **Force Max** — Activé si >35 ans OU économie basse → Inclure 2 séances/sem de renforcement
- **SFR** (Strength-Force-Resistance) — Travail vélo basse cadence 50-60 RPM
- **Train Low** — Séances à jeun, sorties longues sans apport glucidique
- **Gut Training** — Augmentation progressive de l'apport glucidique à l'effort (60→90g/h)
- **Heat Training** — Protocoles d'acclimatation chaleur si course en conditions chaudes
- **Adaptation HRV** — Sessions Z2 si HRV hors-norme 2 jours consécutifs

### Règles de Sécurité
- **Sprint Ban** : Si VLamax > cible discipline → AUCUN sprint en entraînement
- Si VLamax vélo > 0.50 pour longue distance → priorité VLamax↓ (volume Z2)
- Si TTE < 40 min → priorité TTE↑ avant toute intensité
- Semaine de décharge toutes les 3-4 semaines (-30-40% volume)
- Pas plus de 2 séances haute intensité par semaine
- Jour de repos complet minimum 1x/semaine

### Structure de Périodisation par Objectif

**Ironman / Longue Distance (16-24 semaines) :**
- Phase 1 (Base, 4-6 sem) : Volume aérobie 3 sports, Force Max, VLamax↓, technique natation
- Phase 2 (Build, 4-6 sem) : Intensité progressive, Train Low, Gut Training, sorties longues combinées
- Phase 3 (Spécifique, 4-6 sem) : Séances race-pace, simulations nutritionnelles, briques vélo-CAP
- Phase 4 (Affûtage, 2-3 sem) : -40% volume, maintien intensité, fraîcheur

**70.3 / Demi-distance (12-16 semaines) :**
- Phase 1 (Base, 3-4 sem) : Base aérobie 3 sports + Force, technique natation
- Phase 2 (Build, 3-4 sem) : Intervalles seuil, SFR, séries natation CSS
- Phase 3 (Spécifique, 3-4 sem) : Race-pace spécifique, transitions, briques
- Phase 4 (Affûtage, 1-2 sem) : Affûtage 10-14 jours

**Marathon (12-20 semaines) :**
- Phase 1 : Volume kilométrique progressif
- Phase 2 : Séances au seuil, sorties longues progressives
- Phase 3 : Allure marathon, simulations
- Phase 4 : Affûtage 2-3 semaines

**Semi-Marathon (8-12 semaines) :**
- Phase 1 : Base + VMA courte
- Phase 2 : Seuil + allure cible
- Phase 3 : Spécifique + simulation
- Phase 4 : Affûtage 10 jours

## Format de Sortie OBLIGATOIRE

Tu DOIS structurer ta réponse EXACTEMENT dans ce format pour permettre le parsing automatique :

\`\`\`
# Plan TFCL™ — [Objectif] — [Nombre] semaines

## Diagnostic TFCL™
**Limiteur prioritaire :** [limiteur identifié]
**Levier activé :** [levier TFCL]
**Stratégie globale :** [1-2 phrases]

## Phase 1 : [Nom de la phase] (Semaines 1-X)
**Objectif physiologique :** [objectif]
**Volume cible :** [heures/semaine]

### Semaine 1 — [Thème]
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération |
| Mardi | Vélo | [Titre] | [Zone, durée, intervalles détaillés] |
| Mercredi | CAP | [Titre] | [Zone, durée, allure] |
| Jeudi | Natation | [Titre] | [Distance, séries, technique] |
| Vendredi | Vélo | [Titre] | [Détails] |
| Samedi | CAP | [Titre] | [Détails sortie longue] |
| Dimanche | Vélo | [Titre] | [Détails sortie longue] |

**Consignes coach :** [2-3 points clés pour la semaine]

### Semaine 2 — [Thème]
[même format tableau]
...
\`\`\`

## Règles de Réponse
- Réponds UNIQUEMENT en français
- GÉNÈRE TOUTES LES SEMAINES sans exception, ne t'arrête jamais avant la fin
- Chaque séance DOIT avoir : sport, titre court, et détails avec zones/durées/intensités précises
- Utilise les zones : Z1 (récup), Z2 (endurance), Z3 (tempo), Z4 (seuil), Z5 (VO2max)
- Pour le vélo : indique la puissance cible si FTP connue (ex: "70-75% FTP")
- Pour la CAP : indique l'allure cible si VMA connue (ex: "65-70% VMA")
- Pour la natation : indique distance et séries (ex: "3x400m allure CSS +5s")
- Vérifie que la répartition des sports correspond aux ratios imposés par l'objectif
- Adapte le volume au niveau de l'athlète (pas de surcharge)
- Cite les métriques de l'athlète pour justifier chaque choix
- Si des données manquent, adapte prudemment et mentionne les hypothèses`;

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
  if (obj === "IM" || obj === "703") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE TRIATHLON");
    lines.push("Cet objectif est un TRIATHLON. Tu DOIS inclure natation, vélo ET course à pied dans CHAQUE semaine.");
    lines.push("- Minimum 2 séances natation/semaine (technique + endurance)");
    lines.push("- Minimum 2 séances vélo/semaine");
    lines.push("- Minimum 2 séances CAP/semaine");
    lines.push("- 1-2 briques (enchaînements) par semaine en phase spécifique");
  }

  const weeks = config.weeksAvailable || 12;
  lines.push(`\n---\nGénère le plan COMPLET de ${weeks} semaines, semaine par semaine, SANS EN OMETTRE AUCUNE. Chaque semaine a son propre tableau de 7 jours. Ne résume jamais. Chaque séance doit être actionnable immédiatement.`);
  return lines.join("\n");
}
