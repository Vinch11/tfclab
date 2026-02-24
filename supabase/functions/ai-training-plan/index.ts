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

### 10K (6-10h/sem, 40-70km/sem)
| Sport | % Volume | Séances/sem | Clés |
|-------|----------|-------------|------|
| CAP | 85-90% | 4-6 | Seuil + tempo prioritaires. Allure 10K = 88-92% VMA. SL max 18-22km |
| Renfo | 10-15% | 2 | Gainage, pliométrie légère, prévention |
Séances clés : 1 seuil/tempo + 1 VMA + 1 sortie longue. Fartlek et côtes en variantes.

### 5K (5-8h/sem, 30-60km/sem)
CAP 85-90%, Renfo 10-15%. Accent VO2max (30/30, VMA longue), seuil secondaire.

### START TO RUN — Programme Débutant (3-5h/sem, 10-30km/sem)
| Sport | % Volume | Séances/sem | Clés |
|-------|----------|-------------|------|
| CAP/Marche | 60-75% | 3-4 | Alternance marche/course progressive. JAMAIS 2 jours consécutifs de CAP |
| Renfo/Mobilité | 25-40% | 2-3 | Gainage, squats poids de corps, mobilité articulaire, étirements |
⚠️ Règles spécifiques Start to Run :
- Semaines 1-4 : marche rapide dominante (70% marche / 30% course)
- Semaines 5-8 : alternance 50/50 (ex: 3min course / 2min marche ×8-10)
- Semaines 9-12 : course dominante (ex: 5min course / 1min marche ×6-8)
- Semaines 13+ : course continue 20-30min sans arrêt, puis augmenter progressivement
- Progression : +10% volume/sem max. Écouter son corps.
- Cadence : viser 170-180 spm dès le début
- Allure : conversationnelle, pouvoir parler en courant
- JAMAIS de fractionné avant de courir 30min continu sans fatigue
- Renfo : priorité absolue (prévention blessures débutant)
- 2 jours repos minimum entre chaque sortie CAP les premières semaines

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

### Doubles Séances (Bi-Daily) — Modèle Pro/Élite
Pour les niveaux d'ambition **Competitor** et **Elite** en triathlon (IM, 70.3) :
- **Elite (20-30h/sem)** : 8-12 doubles/sem. Matin : séance clé (intensité ou volume long). Après-midi/soir : séance complémentaire (technique, Z1-Z2, renfo).
- **Competitor (15-22h/sem)** : 4-7 doubles/sem. Matin : séance principale. Soir : natation technique ou renfo ou Z1 courte.
- **Age Group** : 1-3 doubles/sem max (briques ou natation matin + renfo soir).
- **Finisher** : Pas de doubles séances. 1 séance/jour max.

Règles doubles séances :
- JAMAIS 2 séances haute intensité le même jour (sauf brique planifiée).
- La 2e séance est toujours de moindre intensité (Z1-Z2, technique, renfo, mobilité).
- Format tableau : indiquer "Matin :" et "Soir :" dans la colonne Détails quand il y a 2 séances le même jour, OU utiliser 2 lignes pour le même jour.
- Natation technique le matin + vélo/CAP le soir est un combo classique Lorang.
- Renfo/core en 2e séance 2-3x/sem.

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

## BIBLIOTHÈQUE DE SÉANCES — Pioche dans cette variété, NE RÉPÈTE JAMAIS le même contenu

### Natation
- **Technique** : éducatifs (rattrapé, poings fermés, dog paddle, finger drag, sculling), 50m drill/50m nage, focus catch/EVF
- **CSS continu** : 10-20×100m @CSS r=10-15s. Ou 5×200m @CSS+2s r=20s
- **CSS dégressif** : 4×(100-200-300-200-100) @CSS→CSS-3s r=15-20s
- **Pyramide** : 100-200-300-400-300-200-100 @CSS r=15s
- **Seuil** : 5×400m @CSS-3s r=30s. Ou 3×600m
- **Sprint** : 8-12×50m @max r=20s. Ou 6×100m @90% r=30s
- **OWS** : navigation bouée, drafting, départs beach
- **Aérobie pull** : pull buoy 2-3km @Z2, focus glisse

### Vélo
- **Z2** : 2-5h 65-75% FTP, cadence 85-95, terrain vallonné
- **Sweet Spot** : 3-4×15min @88-93% FTP r=5min. Ou 2×30min @88%
- **Seuil** : 2×20min @95-100% FTP r=10min. Ou 3×15min
- **SFR** : 5-8×5min @80% FTP 50-60RPM côte 4-6% r=5min
- **VO2max** : 5×5min @106-120% FTP r=5min. Ou 8×3min
- **Over-Under** : 4×(4min @105% / 3min @85%) r=5min
- **Race-pace** : 1-2h @80-85% FTP + gut training
- **Train Low** : Z2 à jeun 1h30-2h (JAMAIS d'intensité)

### Course à Pied
- **EF** : 45-90min Z1-Z2, cadence 175-185 spm
- **Tempo** : 3-4×10min @allure objectif r=3min trot
- **Seuil** : 3×12min @85-90% VMA r=3min. Ou 2×20min
- **Fartlek** : 1/1 ×15-20. Ou pyramide 3-5-7-5-3min
- **VMA courte** : 30/30 ×15-20 @VMA. Ou 200m @VMA r=200m
- **VMA longue** : 5-6×3min @95-100% VMA r=2min
- **Côtes** : 8-12×200m côte 6-8% r=descente trot
- **SL progressive** : neg split, derniers 30min @allure course
- **SL spécifique** : 30km avec 3×5km @allure marathon
- **Brique** : vélo→CAP enchaînement, premiers km @allure course

### Renforcement
- **Force max** : squat/deadlift/fentes 3-5×5 @80-85% 1RM
- **Circuit** : 3×(15 squats + 15 fentes + 30s gainage + 10 box jumps)
- **Pliométrie** : drop jumps, box jumps, unipodaux 3×8-10
- **Core** : planche 3×45s, pallof press, dead bug, anti-rotation
- **Mobilité** : foam roller, hanches/chevilles, 30min
- **Prévention** : élastiques hanches, excentrique mollets Alfredson

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
| Lundi | Repos | Repos complet | Récupération, mobilité 20min optionnelle |
| Mardi | Natation | CSS Pyramide | 400m éch (100NL/100Pull/100Educ/100NL). 100-200-300-400-300-200-100 @1:38/100m r=15s. 200m RC. 3200m ~55min |
| Mardi soir | Renfo | Core + Prévention | Gainage 3×45s, dead bug 3×10, pallof press 3×12. 30min |
| Mercredi | Vélo | Endurance Z2 vallonné | 2h30 Z2 (65-75% FTP, 170-195W), cadence 85-95 RPM |
| ... | ... | ... | ... |

**Volume semaine :** 14h — Nat 3h30 (4) | Vélo 6h (3) | CAP 3h (3) | Renfo 1h30 (2)
**Consignes coach :** [2-3 points clés avec sensation recherchée et focus technique]
\`\`\`

## Règles de Contenu (CRITIQUE)
- **Chaque séance = contenu COMPLET ACTIONNABLE** — JAMAIS "Endurance Z2" seul sans détails
- **Natation** : distance totale + échauffement détaillé + série principale (distance/allure/repos) + retour au calme
- **Vélo** : durée + zone + %FTP + watts si connu + cadence + type de terrain
- **CAP** : durée/distance + allure min/km OU %VMA + cadence spm
- **Renfo** : exercices + séries×reps + charge si applicable + durée totale
- **Titre descriptif** obligatoire ("CSS Dégressif", "Sweet Spot Vallonné", pas juste "Natation")
- **Varier** d'une semaine à l'autre — NE PAS copier le même contenu
- **Consignes qualitatives** : sensation recherchée, focus technique, nutrition si applicable
- Réponds UNIQUEMENT en français
- GÉNÈRE TOUTES LES SEMAINES sans exception
- Zones vélo : Z1 (<55% FTP), Z2 (55-75%), Z3 (76-90%), Z4 (91-105%), Z5 (106-120%)
- Zones CAP : Z1 (<65% VMA), Z2 (65-75%), Z3 (75-85%), Z4 (85-92%), Z5 (92-100%)
- Volume total/semaine avec répartition par sport
- Respecte STRICTEMENT les ratios sport par objectif
- Cite les métriques de l'athlète pour justifier les choix
- Si données manquantes, hypothèses prudentes mentionnées

## ⛔ RÈGLE REPOS — COHÉRENCE ABSOLUE (CRITIQUE)
Un jour marqué "Repos" est un jour de REPOS COMPLET :
- Sport = "Repos", Séance = "Repos complet", Détails = "Récupération, mobilité optionnelle"
- **INTERDIT** de mettre un sport (vélo, CAP, natation, renfo) sur un jour Repos
- Si tu veux placer une séance récupération active (vélo Z1 30min, footing 20min, mobilité), alors ce n'est PAS un jour Repos : nomme-le avec le sport correspondant (ex: Sport="Vélo", Séance="Récupération active Z1")
- Un jour Repos ne contient JAMAIS "60min Z2" ou toute séance d'effort
- Chaque semaine doit avoir exactement 1 jour de repos complet (généralement Lundi ou Dimanche)
- Ne confonds JAMAIS repos et récupération active : ce sont 2 concepts distincts

## ⚠️ RÈGLE RUNNING-ONLY — PAS DE VÉLO SAUF TRIATHLON
Pour les objectifs **5K, 10K, Semi, Marathon, Trail, StartToRun** :
- **ZÉRO séance vélo** sauf si le coach a explicitement activé le module cross-training
- Les sports autorisés sont UNIQUEMENT : Course à Pied + Renforcement/PPG
- Si tu mets du vélo pour un Semi-Marathon ou un Marathon, c'est une ERREUR GRAVE
- Alternative au vélo pour récupération active : footing Z1 très léger (20-30min) ou marche
- Le ratio est strict : **CAP 85-90% du volume, Renfo 10-15%**
- Remplis les jours avec des séances CAP variées (EF, tempo, seuil, fartlek, VMA, SL, côtes) et du renfo — PAS du vélo`;

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
    lines.push("- CAP 85-90% | Renfo 10-15%. ⛔ ZÉRO natation, ZÉRO vélo.");
    lines.push("- 2 séances qualité/sem + 1 sortie longue progressive");
    lines.push("- Minimum 5 séances CAP/sem : EF, tempo, seuil, SL, fartlek/côtes");
    lines.push("- Récupération = footing Z1 léger ou repos complet, JAMAIS du vélo");
  } else if (obj === "SEMI") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE SEMI-MARATHON");
    lines.push("- CAP 85-90% | Renfo 10-15%. ⛔ ZÉRO natation, ZÉRO vélo.");
    lines.push("- Accent VMA + seuil. Minimum 4-5 séances CAP/sem.");
    lines.push("- Séances types : EF Z2, Tempo allure semi, VMA 30/30, Seuil 2×20min, SL 15-20km, Fartlek, Côtes");
    lines.push("- Récupération = footing Z1 léger 20-30min ou repos complet, JAMAIS du vélo");
  } else if (["TRAIL", "TRAILSHORT", "TRAILMOUNTAIN", "TRAILULTRA"].includes(obj)) {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE TRAIL");
    lines.push("- CAP/Trail 70-80% | Renfo spécifique 20-25%");
    lines.push("- Force excentrique, côtes, proprioception obligatoires");
  } else if (["10K", "10KM", "5K"].includes(obj)) {
    lines.push(`\n### ⚠️ RAPPEL COHÉRENCE ${obj}`);
    lines.push("- CAP 85-90% | Renfo 10-15%. ⛔ ZÉRO natation, ZÉRO vélo.");
    lines.push("- 1 seuil/tempo + 1 VMA + 1 sortie longue/sem + EF Z2");
    lines.push("- Récupération = footing Z1 léger ou repos complet, JAMAIS du vélo");
  } else if (obj === "STARTTORUN") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE START TO RUN (DÉBUTANT)");
    lines.push("- PROGRAMME DÉBUTANT : alternance marche/course progressive.");
    lines.push("- Sem 1-4 : 70% marche / 30% course. Sem 5-8 : 50/50. Sem 9-12 : 70% course.");
    lines.push("- JAMAIS 2 jours consécutifs de course les premières semaines.");
    lines.push("- Renfo/mobilité = 25-40% du volume (prévention blessures prioritaire).");
    lines.push("- Max 3-4 séances/sem. Repos = progression.");
    lines.push("- Allure : conversationnelle. Cadence : 170-180 spm.");
    lines.push("- Pas de fractionné tant que l'athlète ne court pas 30min continu.");
  }

  // Double sessions reminder based on ambition
  const ambition = (config.ambition || "").toLowerCase();
  const isTriathlon = ["IM", "703"].includes(obj);
  if (isTriathlon && (ambition === "elite" || ambition === "competitor")) {
    lines.push("\n### 🔥 DOUBLES SÉANCES OBLIGATOIRES");
    if (ambition === "elite") {
      lines.push("Ambition ELITE → 8-12 doubles séances/semaine comme un pro.");
      lines.push("- Matin : séance clé (intensité, volume long, OWS)");
      lines.push("- Soir : séance complémentaire (technique nat, Z1-Z2, core/renfo)");
      lines.push("- Volume cible : 20-30h/sem en phase build/spécifique");
    } else {
      lines.push("Ambition COMPETITOR → 4-7 doubles séances/semaine.");
      lines.push("- Matin : séance principale (qualité ou endurance)");
      lines.push("- Soir : natation technique, renfo, ou Z1 courte (30-45min)");
      lines.push("- Volume cible : 15-22h/sem en phase build/spécifique");
    }
    lines.push("- Utilise 2 lignes pour le même jour OU indique 'Matin:' et 'Soir:' dans Détails.");
    lines.push("- JAMAIS 2 intensités le même jour sauf brique planifiée.");
  }

  const weeks = config.weeksAvailable || 12;
  lines.push(`\n---\nGénère le plan COMPLET de ${weeks} semaines, semaine par semaine, SANS EN OMETTRE AUCUNE. Chaque semaine a son propre tableau de 7 jours. Ne résume jamais. Chaque séance doit être actionnable immédiatement.`);
  return lines.join("\n");
}
