import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// === RÉFÉRENTIEL ÉLITE : RATIOS DE RÉPARTITION SPORTIVE ===
interface SportRatioRef {
  swimPct?: [number, number];
  bikePct?: [number, number];
  runPct?: [number, number];
  weeklyHours: [number, number];
  sessionsPerWeek: [number, number];
  keySessions: [number, number];
  progressionPct: [number, number];
}

const SPORT_RATIO_REFS: Record<string, Record<string, SportRatioRef>> = {
  IM: {
    elite:      { weeklyHours: [20,30], sessionsPerWeek: [12,16], keySessions: [3,4], progressionPct: [5,8], swimPct: [15,20], bikePct: [45,55], runPct: [25,30] },
    competitor: { weeklyHours: [14,20], sessionsPerWeek: [8,12],  keySessions: [2,3], progressionPct: [5,7], swimPct: [15,20], bikePct: [45,55], runPct: [25,30] },
    age_group:  { weeklyHours: [10,15], sessionsPerWeek: [6,9],   keySessions: [2,2], progressionPct: [3,5], swimPct: [15,20], bikePct: [45,55], runPct: [25,30] },
    finisher:   { weeklyHours: [8,12],  sessionsPerWeek: [5,7],   keySessions: [1,2], progressionPct: [3,3], swimPct: [15,20], bikePct: [45,55], runPct: [25,30] },
  },
  "703": {
    elite:      { weeklyHours: [15,22], sessionsPerWeek: [10,14], keySessions: [3,3], progressionPct: [5,8], swimPct: [15,20], bikePct: [40,50], runPct: [30,40] },
    competitor: { weeklyHours: [10,16], sessionsPerWeek: [7,10],  keySessions: [2,3], progressionPct: [5,7], swimPct: [15,20], bikePct: [40,50], runPct: [30,40] },
    age_group:  { weeklyHours: [8,12],  sessionsPerWeek: [5,8],   keySessions: [2,2], progressionPct: [3,5], swimPct: [15,20], bikePct: [40,50], runPct: [30,40] },
    finisher:   { weeklyHours: [6,10],  sessionsPerWeek: [4,6],   keySessions: [1,2], progressionPct: [3,3], swimPct: [15,20], bikePct: [40,50], runPct: [30,40] },
  },
  Marathon: {
    elite:      { weeklyHours: [12,16], sessionsPerWeek: [10,13], keySessions: [3,3], progressionPct: [5,8] },
    competitor: { weeklyHours: [8,12],  sessionsPerWeek: [7,10],  keySessions: [2,3], progressionPct: [5,7] },
    age_group:  { weeklyHours: [6,9],   sessionsPerWeek: [5,7],   keySessions: [2,2], progressionPct: [3,5] },
    finisher:   { weeklyHours: [4,7],   sessionsPerWeek: [4,5],   keySessions: [1,2], progressionPct: [3,3] },
  },
  Semi: {
    elite:      { weeklyHours: [10,14], sessionsPerWeek: [8,11],  keySessions: [3,3], progressionPct: [5,8] },
    competitor: { weeklyHours: [7,10],  sessionsPerWeek: [6,8],   keySessions: [2,2], progressionPct: [5,7] },
    age_group:  { weeklyHours: [5,7],   sessionsPerWeek: [4,6],   keySessions: [2,2], progressionPct: [3,5] },
    finisher:   { weeklyHours: [3,5],   sessionsPerWeek: [3,4],   keySessions: [1,1], progressionPct: [3,3] },
  },
  "10K": {
    elite:      { weeklyHours: [9,12],  sessionsPerWeek: [8,10],  keySessions: [2,3], progressionPct: [5,7] },
    competitor: { weeklyHours: [6,9],   sessionsPerWeek: [5,7],   keySessions: [2,2], progressionPct: [5,5] },
    age_group:  { weeklyHours: [4,6],   sessionsPerWeek: [4,5],   keySessions: [1,2], progressionPct: [3,5] },
    finisher:   { weeklyHours: [3,4],   sessionsPerWeek: [3,4],   keySessions: [1,1], progressionPct: [3,3] },
  },
  Trail: {
    elite:      { weeklyHours: [12,18], sessionsPerWeek: [8,11],  keySessions: [2,3], progressionPct: [5,7] },
    competitor: { weeklyHours: [8,14],  sessionsPerWeek: [6,9],   keySessions: [2,3], progressionPct: [5,7] },
    age_group:  { weeklyHours: [6,10],  sessionsPerWeek: [5,7],   keySessions: [2,2], progressionPct: [3,5] },
    finisher:   { weeklyHours: [4,7],   sessionsPerWeek: [4,5],   keySessions: [1,2], progressionPct: [3,3] },
  },
  TrailShort: {
    elite:      { weeklyHours: [12,18], sessionsPerWeek: [8,11],  keySessions: [2,3], progressionPct: [5,7] },
    competitor: { weeklyHours: [8,14],  sessionsPerWeek: [6,9],   keySessions: [2,3], progressionPct: [5,7] },
    age_group:  { weeklyHours: [6,10],  sessionsPerWeek: [5,7],   keySessions: [2,2], progressionPct: [3,5] },
    finisher:   { weeklyHours: [4,7],   sessionsPerWeek: [4,5],   keySessions: [1,2], progressionPct: [3,3] },
  },
  TrailMountain: {
    elite:      { weeklyHours: [14,20], sessionsPerWeek: [8,12],  keySessions: [2,3], progressionPct: [5,8] },
    competitor: { weeklyHours: [10,16], sessionsPerWeek: [6,10],  keySessions: [2,3], progressionPct: [5,7] },
    age_group:  { weeklyHours: [7,12],  sessionsPerWeek: [5,8],   keySessions: [2,2], progressionPct: [3,5] },
    finisher:   { weeklyHours: [5,8],   sessionsPerWeek: [4,6],   keySessions: [1,2], progressionPct: [3,3] },
  },
  TrailUltra: {
    elite:      { weeklyHours: [15,22], sessionsPerWeek: [8,12],  keySessions: [2,3], progressionPct: [5,8] },
    competitor: { weeklyHours: [10,16], sessionsPerWeek: [6,10],  keySessions: [2,3], progressionPct: [5,7] },
    age_group:  { weeklyHours: [8,13],  sessionsPerWeek: [5,8],   keySessions: [2,2], progressionPct: [3,5] },
    finisher:   { weeklyHours: [5,9],   sessionsPerWeek: [4,6],   keySessions: [1,2], progressionPct: [3,3] },
  },
};

// FIX #2-obj: Order matters — check "70.3" BEFORE "ironman" to avoid "Ironman 70.3" → "IM"
function normalizeObjKey(obj: string): string {
  const lower = obj.toLowerCase();
  if (lower.includes("70.3") || lower === "703") return "703";
  if (lower.includes("ironman") || lower === "im") return "IM";
  if (lower.includes("semi")) return "Semi";
  if (lower.includes("marathon")) return "Marathon";
  if (lower.includes("trail") && lower.includes("ultra")) return "TrailUltra";
  if (lower.includes("trail") && (lower.includes("montagne") || lower.includes("mountain"))) return "TrailMountain";
  if (lower.includes("trail") && (lower.includes("court") || lower.includes("short"))) return "TrailShort";
  if (lower.includes("trailmountain")) return "TrailMountain";
  if (lower.includes("trailshort")) return "TrailShort";
  if (lower.includes("trail")) return "Trail";
  if (lower.includes("10")) return "10K";
  if (lower.includes("5k") || lower === "5km") return "5K";
  if (lower.includes("start")) return "StartToRun";
  return obj;
}

// === TIME TARGET HINTS BY OBJECTIVE × AMBITION × SEX ===
const TIME_TARGET_HINTS: Record<string, Record<string, { M: string; F: string }>> = {
  Marathon: {
    finisher:   { M: "4h30 – 5h+",    F: "4h55 – 5h30+" },
    age_group:  { M: "3h30 – 4h15",   F: "3h50 – 4h40" },
    competitor: { M: "3h00 – 3h30",    F: "3h18 – 3h50" },
    elite:      { M: "Sub 2h45",       F: "Sub 3h05" },
  },
  Semi: {
    finisher:   { M: "2h00 – 2h30",    F: "2h10 – 2h45" },
    age_group:  { M: "1h35 – 1h55",    F: "1h44 – 2h06" },
    competitor: { M: "1h20 – 1h35",    F: "1h28 – 1h44" },
    elite:      { M: "Sub 1h18",       F: "Sub 1h26" },
  },
  "10K": {
    finisher:   { M: "55' – 1h10",     F: "1h00 – 1h17" },
    age_group:  { M: "45' – 52'",      F: "49' – 57'" },
    competitor: { M: "38' – 44'",      F: "42' – 48'" },
    elite:      { M: "Sub 36'",        F: "Sub 40'" },
  },
  "5K": {
    finisher:   { M: "28' – 35'",      F: "30' – 38'" },
    age_group:  { M: "22' – 26'",      F: "24' – 29'" },
    competitor: { M: "18' – 21'",      F: "20' – 23'" },
    elite:      { M: "Sub 17'",        F: "Sub 19'" },
  },
  Trail: {
    finisher:   { M: "5h30 – 7h",      F: "6h00 – 7h45" },
    age_group:  { M: "4h00 – 5h15",    F: "4h25 – 5h45" },
    competitor: { M: "3h15 – 4h00",    F: "3h35 – 4h25" },
    elite:      { M: "Sub 3h00",       F: "Sub 3h20" },
  },
  TrailShort: {
    finisher:   { M: "5h30 – 7h",      F: "6h00 – 7h45" },
    age_group:  { M: "4h00 – 5h15",    F: "4h25 – 5h45" },
    competitor: { M: "3h15 – 4h00",    F: "3h35 – 4h25" },
    elite:      { M: "Sub 3h00",       F: "Sub 3h20" },
  },
  TrailMountain: {
    finisher:   { M: "12h – 16h",      F: "13h – 17h30" },
    age_group:  { M: "9h – 11h30",     F: "10h – 12h40" },
    competitor: { M: "7h – 9h",        F: "7h45 – 10h" },
    elite:      { M: "Sub 6h30",       F: "Sub 7h10" },
  },
};

function getTimeTargetHint(objective: string, ambition: string, sex?: string): string | null {
  const objKey = normalizeObjKey(objective);
  const ambKey = normalizeAmbKey(ambition);
  const entry = TIME_TARGET_HINTS[objKey]?.[ambKey];
  if (!entry) return null;
  return entry[sex === "F" ? "F" : "M"];
}

// FIX #2-amb: Normalize accented chars (é→e, è→e) before matching
function normalizeAmbKey(amb: string): string {
  const lower = amb.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z_]/g, "");
  if (lower.includes("elite") || lower.includes("pro") || lower.includes("qualif")) return "elite";
  if (lower.includes("compet") || lower.includes("comp")) return "competitor";
  if (lower.includes("age") || lower.includes("group") || lower.includes("intermediaire")) return "age_group";
  if (lower.includes("finisher") || lower.includes("fin")) return "finisher";
  return "age_group"; // safer default than "finisher"
}

function getSportDistributionConstraint(objective: string, ambition: string, limiters?: string[]): string | null {
  const objKey = normalizeObjKey(objective);
  const ambKey = normalizeAmbKey(ambition);
  const ref = SPORT_RATIO_REFS[objKey]?.[ambKey];
  if (!ref) return null;

  const lines: string[] = [];
  lines.push(`\n### 📊 CONTRAINTE DE RÉPARTITION SPORTIVE (RÉFÉRENTIEL TFCL™ ${ambKey.toUpperCase()} — ${objKey})`);
  lines.push(`⚠️ Les ratios ci-dessous sont des CIBLES OBLIGATOIRES calculées par le référentiel TFCL™ pour ce niveau d'ambition.`);
  lines.push(`Une tolérance de ±5% est admise UNIQUEMENT si elle est justifiée par le limiteur principal de l'athlète.\n`);

  if (ref.swimPct && ref.bikePct && ref.runPct) {
    lines.push(`| Discipline | Cible % volume | Tolérance |`);
    lines.push(`|------------|---------------|-----------|`);
    lines.push(`| 🏊 Natation | ${ref.swimPct[0]}-${ref.swimPct[1]}% | ±5% si limiteur natation |`);
    lines.push(`| 🚴 Vélo | ${ref.bikePct[0]}-${ref.bikePct[1]}% | ±5% si limiteur vélo/FTP/SFR |`);
    lines.push(`| 🏃 Course | ${ref.runPct[0]}-${ref.runPct[1]}% | ±5% si limiteur CAP/économie |`);
    lines.push(`\n**Règle** : La somme Natation + Vélo + Course = 100% (hors Renfo/Prévention qui s'ajoute en surplus).`);
    lines.push(`Si le limiteur principal justifie un dépassement, CITE EXPLICITEMENT la raison dans l'en-tête du bloc concerné (ex: "Renforcement Vélo +5% car FTP/kg limiteur #1").`);
  }

  lines.push(`\n**Cibles structurelles :**`);
  lines.push(`- Volume hebdomadaire : ${ref.weeklyHours[0]}-${ref.weeklyHours[1]}h`);
  lines.push(`- Séances/semaine : ${ref.sessionsPerWeek[0]}-${ref.sessionsPerWeek[1]}`);
  lines.push(`- Séances clés 🔑 : ${ref.keySessions[0]}-${ref.keySessions[1]}/semaine`);
  lines.push(`- Progression volume : +${ref.progressionPct[0]}-${ref.progressionPct[1]}%/semaine max`);

  if (limiters && limiters.length > 0) {
    lines.push(`\n**Limiteur(s) identifié(s) pour cet athlète :** ${limiters.join(", ")}`);
    lines.push(`→ Si un limiteur justifie une déviation des ratios ci-dessus (ex: +5% vélo car FTP insuffisant), tu DOIS le mentionner explicitement dans le Récapitulatif Stratégique ET dans l'en-tête du bloc concerné.`);
  }

  return lines.join("\n");
}

// === FIX M3: Extract keywords from a limiter name for session matching ===
function extractLimiterKeywords(limiterName: string): string[] {
  const kw: string[] = [];
  const l = limiterName.toLowerCase();
  if (/vlamax/i.test(l)) kw.push("vlamax", "sprint", "glycoly", "anaérobie", "force", "sfr", "neuromuscul");
  if (/tte|time.to.exhaust/i.test(l)) kw.push("tte", "seuil", "tempo", "sweet spot", "threshold", "ss");
  if (/durabilit/i.test(l)) kw.push("durabilit", "endurance", "z2", "fatmax", "long", "aérobie");
  if (/fatmax|lipid|fat.ox/i.test(l)) kw.push("fatmax", "z2", "endurance", "lipid", "oxydation", "fasted");
  if (/econom|running.econ/i.test(l)) kw.push("économie", "cadence", "technique", "gammes", "foulée", "strides");
  if (/ftp|puissance.seuil/i.test(l)) kw.push("ftp", "seuil", "sweet spot", "ss", "tempo", "threshold");
  if (/vo2|vo2max|pma/i.test(l)) kw.push("vo2", "pma", "interval", "30/30", "3min", "5min", "hiit");
  if (/vma/i.test(l)) kw.push("vma", "interval", "fractionné", "30/30", "piste");
  if (/force|renfo/i.test(l)) kw.push("force", "renfo", "muscul", "côte", "sfr");
  if (/natation|swim|css/i.test(l)) kw.push("natation", "swim", "css", "crawl", "pull");
  if (kw.length === 0) {
    kw.push(...l.split(/[\s/,()]+/).filter(w => w.length > 3));
  }
  return kw;
}


serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { athleteData, planConfig, regenerateWeek, workoutCatalog, phaseCatalogs } = await req.json();
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

## RÈGLE ANTI-SEMAINE VIDE (CRITIQUE)
⚠️ CHAQUE "### Semaine N" DOIT être IMMÉDIATEMENT suivie d'un tableau Markdown complet (| Jour | Sport | Séance | Détails |).
- Il est INTERDIT d'écrire un header "### Semaine N" sans le tableau correspondant juste en-dessous.
- Si tu écris "### Semaine 5", les lignes suivantes DOIVENT être le header du tableau puis les 7+ lignes de données.
- JAMAIS de texte libre, de saut de ligne vide, ou d'autre header entre "### Semaine N" et son tableau.
- VÉRIFIE : chaque semaine générée a au minimum 4 lignes de données dans son tableau (hors header et séparateur).

## RATIOS SPORT/VOLUME PAR OBJECTIF (Méthodologie Dan Lorang / Élite Mondial)

### IRONMAN (IM) — Modèle Lorang/Frodeno (15-25h/sem)
| Sport | % Volume | Séances/sem | Clés |
|-------|----------|-------------|------|
| Vélo | 45-55% | 4-5 | Sorties longues 4-6h Z2, SFR, sweet spot 88-93% FTP |
| CAP | 25-30% | 3-4 | Briques prioritaires. Allure IM = 80-85% VMA. Max 2h30 |
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

### TRAIL COURT (<42km, D+ 1000-2500m) — Modèle Kilian Jornet / Jim Walmsley
| Sport | % Volume | Séances/sem | Clés |
|-------|----------|-------------|------|
| CAP/Trail | 70-80% | 5-6 | D+ progressif. SL 2h30-3h30. VMA côtes 2x/sem. Seuil montée 1x/sem |
| Renfo | 20-25% | 2-3 | Force excentrique (squat 4s excentrique), proprioception (Bosu, single leg), prévention chevilles |
| Vélo | 0-5% | 0-1 | Optionnel Z1 récup si volume élevé. Jamais d'intensité vélo |
⚠️ Spécificités Trail Court :
- Séances clés TOUJOURS en terrain trail/sentier, jamais route
- D+ cible progressif : base 500m/sem → build 1500m/sem → peak 2000m/sem
- Travail technique descente OBLIGATOIRE 1x/sem (descente rapide contrôlée, fréquence foulée courte)
- Force excentrique prioritaire (prévention quadriceps, DOMS)
- Bâtons : à entraîner 2x/sem si utilisés en course (technique synchronisation bras/jambes)
- Ravitaillement : tester en SL même si course < 4h (estomac + logistique)
- Negative split sur SL : 1ère moitié Z1-Z2 très facile, 2ème moitié Z2-Z3 progressif
- Pliométrie base/build : box jumps, drop jumps, sauts latéraux pour réactivité appuis

### TRAIL MONTAGNE (42-80km, D+ 2500-5000m) — Modèle François D'Haene / Zach Miller
| Sport | % Volume | Séances/sem | Clés |
|-------|----------|-------------|------|
| CAP/Trail | 70-80% | 5-7 | D+ massif progressif. SL 3h-5h. Back-to-back weekends. Seuil montée long 2x/sem |
| Renfo | 15-20% | 2-3 | Excentrique lourd + proprioception avancée + gainage anti-rotation pour pôles |
| Vélo | 5-10% | 1-2 | Z1 récup entre grosses journées montagne. Volume sans impact |
⚠️ Spécificités Trail Montagne :
- D+ cible progressif : base 1000m/sem → build 3000m/sem → peak 4000m/sem
- Back-to-back weekends OBLIGATOIRES en Build/Peak (SL samedi D+ fort + SL dimanche endurance pré-fatigue)
- Simulation nuit : 1-2 sorties nocturnes obligatoires en phase Peak
- Travail spécifique montée > 15% pente : allure "marche athlétique" avec bâtons, seuil en montée
- Descente technique intensive : 1x/sem, terrain cassant, single track, focus fréquence foulée
- Nutrition course : Gut Training progressif 40→70g/h sur les SL (solide + gel + boisson)
- Altitude : si course en altitude (>2000m), intégrer 2-3 semaines camp altitude ou simulation hypoxie
- Core anti-fatigue : dead bug, pallof press, planche latérale — résistance posturale longue durée
- Vélo Z1 cross-training : récupération sans impact entre grosses journées montagne

### TRAIL ULTRA (>80km, D+ 5000m+) — Modèle UTMB / Courtney Dauwalter / Pau Capell
| Sport | % Volume | Séances/sem | Clés |
|-------|----------|-------------|------|
| CAP/Trail | 65-75% | 5-7 | Volume D+ massif. SL 4h-7h. Back-to-back 2-3 weekends/mois. Simulation ultra 1x/mois |
| Renfo | 15-20% | 2-3 | Excentrique lourd prioritaire + proprioception + résistance fatigue posturale |
| Vélo | 5-10% | 1-2 | Z1 récup active. Volume aérobie sans impact. Cross-training intelligent |
⚠️ Spécificités Trail Ultra :
- D+ cible progressif : base 1500m/sem → build 4000m/sem → peak 5000-6000m/sem
- Back-to-back weekends OBLIGATOIRES en Build/Peak : SL samedi 4-5h D+ fort + SL dimanche 2-3h sur pré-fatigue
- Simulation ultra complète (6-8h) : 1x/mois en Build, 1x en Peak avec protocole nutrition complet
- Simulation nuit OBLIGATOIRE : 2-3 sorties nocturnes (dont 1 > 4h, départ 3-4h du matin)
- Gestion sommeil : entraîner la privation avec sorties très tôt
- Marche/course alternée : ratio progressif 2:1→3:1 course/marche. Marche sur montée >10%, course plat+descente
- Nutrition : Gut Training progressif 40→90g/h. Tester TOUTE la stratégie nutritive en simulation (solide, gel, boisson, estomac)
- Mental : inclure 1 sortie "à l'effort" (conditions difficiles, fatigue volontaire) par bloc Build
- Bâtons : entraînement spécifique montée/descente avec bâtons 2x/sem si utilisés en course
- Circuit force sous fatigue (Build/Peak) : enchaîné peu de repos pour résistance musculaire ultra
- Taper ultra = 14-21j (plus long que route). Volume -50% sem -2, -65% sem -1. Rappels seuil montée courts

### 🔑 SÉANCES CLÉS OBLIGATOIRES PAR OBJECTIF TRAIL
| Objectif | Séances clés hebdomadaires |
|----------|---------------------------|
| Trail Court | 1× VMA côtes + 1× seuil montée + 1× technique descente + 1× SL D+ |
| Trail Montagne | 1× seuil montée long + 1× descente technique + 1× SL D+ (ou B2B week-end) + 1× renfo excentrique |
| Trail Ultra | 1× seuil montée + 1× SL D+ massive (ou B2B) + 1× marche/course + 1× renfo circuit fatigue + 1× gut training (intégré SL) |

### ⚠️ RÈGLES D+ (DÉNIVELÉ POSITIF) — OBLIGATOIRE POUR TRAIL
- CHAQUE séance trail doit mentionner le D+ cible approximatif (ex: "+800m D+")
- Le D+ hebdomadaire doit être PROGRESSIF semaine par semaine (pas de plateau >3 semaines)
- Semaines de décharge : réduire D+ de 40-50% (pas seulement la durée)
- Les SL doivent TOUJOURS préciser le D+ cible et le ravitaillement
- Back-to-back : le D+ cumulé samedi+dimanche est la métrique clé

## Méthodologie TFCL™ — Hybride Lorang Complet

### ⚠️ MODÈLE DE PÉRIODISATION TFCL™ : HYBRIDE LORANG (PAS linéaire classique)

La périodisation TFCL™ N'EST PAS la périodisation linéaire classique "Base→Build→Spécifique→Taper" de Lydiard/Bompa.
Elle est un **HYBRIDE de 3 modèles**, combinés selon le profil de l'athlète :

### 1. 🔄 REVERSE PERIODIZATION (Lorang 2018) — Contrainte Structurelle
**Principe** : Inverser l'ordre classique. Commencer par de l'INTENSITÉ courte (VO2max, force max) en Bloc 1, puis basculer vers le VOLUME en Blocs 2-3.
- **Justification scientifique** : L'intensité précoce stimule les adaptations mitochondriales (biogenèse, PGC-1α) AVANT que le volume ne les consolide. Résultat : meilleure fat oxidation, meilleure économie.
- **Application obligatoire** : IM, 70.3, Marathon (Competitor+), Trail Ultra
- **Ne PAS appliquer** : Débutants/Finishers (ils ont besoin de volume d'abord), 5K/10K (déjà intensité-dominant)
- **Concrètement** : Bloc Fondation inclut des blocs VO2max courts (3-5min) dès la semaine 1, même si le volume est encore bas

### 2. 📦 BLOCK PERIODIZATION (Issurin 2008) — Architecture des Blocs
**Principe** : Organiser l'entraînement en BLOCS CONCENTRÉS de 2-4 semaines, chacun ciblant 1-2 qualités maximum.
- **Supérieur à la périodisation traditionnelle** pour les athlètes entraînés (>2 ans d'historique)
- **Chaque bloc a un NOM MÉTABOLIQUE** (pas "Base/Build") : "Bloc VLamax↓", "Bloc VO2max", "Bloc Seuil/TTE", "Bloc Race-Pace", "Affûtage"
- **Le séquençage des blocs dépend du limiteur principal** (voir matrice ci-dessous)
- **Effet résiduel** : les qualités développées dans un bloc se maintiennent pendant le bloc suivant grâce à des rappels minimaux

### 3. ⚖️ POLARIZED TRAINING (Seiler 2010) — Contrainte Transversale PERMANENTE
**Principe** : Dans CHAQUE bloc, CHAQUE semaine, la distribution d'intensité doit rester polarisée :
- 80% Z1-Z2 (volume aérobie)
- 0-5% Z3 (minimiser le "black hole training")
- 15-20% Z4-Z5+ (intensité ciblée)
- Cette contrainte est **INVIOLABLE** quel que soit le bloc ou la phase
- Exception : semaine de décharge (100% Z1-Z2)

### Synthèse Hybride Lorang : Comment Combiner les 3
| Aspect | Règle |
|--------|-------|
| Architecture globale | Blocs concentrés 2-4 sem (Issurin) nommés par objectif métabolique |
| Ordre des blocs | Reverse Perio (Lorang) : intensité courte → volume long → spécificité |
| Distribution intra-bloc | Polarisé 80/20 (Seiler) dans chaque semaine |
| Séquence de blocs | Déterminée par le limiteur #1 (voir matrice de séquençage) |
| Charge intra-bloc | Ondulée 3:1 ou 2:1 (Rhea) — jamais linéaire |
| Maintien des acquis | 1 rappel/sem de chaque qualité développée dans les blocs précédents |

### 📦 SÉQUENÇAGE DES BLOCS PAR OBJECTIF × LIMITEUR (Architecture Lorang)

#### Nommage des Blocs (OBLIGATOIRE — ne PAS utiliser "Base/Build/Spécifique")
Les blocs doivent porter des noms métaboliques/physiologiques, pas des noms de phase classiques :
- **Bloc Fondation** (≈ anciennement "Base") : Force max + VO2max courte (Reverse Perio) + Volume Z2 progressif
- **Bloc Chantier [Limiteur]** : Bloc concentré ciblant le limiteur #1 (2-4 sem)
- **Bloc Consolidation** : Limiteur #2 monte en priorité + maintien limiteur #1
- **Bloc Race-Specific** : Allure course dominante, simulations, Gut Training
- **Bloc Affûtage** : Taper Mujika, rappels, supercompensation

#### Séquençage Standard (Reverse Perio Lorang)
Pour IM/70.3/Marathon Competitor+ :
1. **Bloc Fondation + Intensité** (3-4 sem) — Reverse Perio : VO2max courts + Force max + Z2 volume croissant + Train Low
2. **Bloc Chantier [Limiteur #1]** (3-4 sem) — Concentration sur LE limiteur prioritaire avec 2-3 stimuli/sem
3. **Bloc Consolidation + [Limiteur #2]** (3-4 sem) — Limiteur #2 prioritaire + rappels limiteur #1 + volume vers peak
4. **Bloc Race-Specific** (2-4 sem) — Allure course, simulations, Gut Training, briques
5. **Bloc Affûtage** (1-3 sem) — Mujika exponentiel, rappels courts toutes qualités

#### Séquençage par Limiteur Principal (matrice décisionnelle)
| Limiteur #1 | Bloc 1 (Fondation) | Bloc 2 (Chantier) | Bloc 3 (Consolidation) | Bloc 4 (Race-Specific) |
|-------------|-------------------|-------------------|----------------------|----------------------|
| VO2max bas | Force + Z2 | **Chantier VO2max** : Billat 2-3x/sem + SL progressives | Seuil + allure course progressive | Simulations race-pace |
| VLamax haute | Force + VO2max courte | **Chantier VLamax↓** : Z2 long Train Low 2-3x/sem + sweet spot | Seuil + durabilité | Simulations race-pace + Z2 maintien |
| TTE faible | Force + VO2max courte | **Chantier TTE↑** : Norvégienne progressive (2×15→1×40min) | Allure course + durabilité | Simulations + seuil long rappels |
| FTP/kg bas | Force max + VO2max | **Chantier FTP** : Sweet spot + over-unders 2-3x/sem | Seuil + race-power | Simulations race-power |
| Économie | Force max + plio intensive | **Chantier Économie** : SFR + côtes + force maintien | Seuil + allure course | Simulations + strides rappels |
| FatMax | Z2 Train Low + Force | **Chantier FatMax** : Z2 longue à jeun + SL progressive | Gut Training + seuil | Simulations nutrition course |
| Durabilité | Volume Z2 progressif | **Chantier Durabilité** : SL fast finish + briques pre-fatigued | Seuil + allure course | Simulations longues race-pace |

#### Exception : Périodisation pour Débutants/Finishers
Les débutants et Finishers utilisent une **périodisation linéaire progressive** (pas de Reverse Perio, pas de blocs concentrés) :
- Progression graduelle du volume uniquement
- Pas de blocs d'intensité concentrée
- Nommage classique acceptable : Phase 1 (Adaptation), Phase 2 (Développement), Phase 3 (Consolidation), Phase 4 (Affûtage)

### Principes Fondamentaux Lorang (invariants)
1. **Polarisation 80/20 PERMANENTE** — Dans CHAQUE bloc, 80% Z1-Z2, 20% Z4-Z5. Minimiser Z3.
2. **Bloc-Périodisation** — 1-2 stimuli dominants par bloc 2-4 sem. Noms métaboliques, pas linéaires.
3. **Reverse Perio** — Intensité courte (VO2max) DÈS le Bloc Fondation. Volume long vient APRÈS.
4. **Progression ondulée** — Charge 3:1 (ou 2:1 si >45 ans). Jamais linéaire croissante.
5. **Train Low, Compete High** — Z1-Z2 à jeun en Bloc Fondation. JAMAIS d'intensité en Train Low.
6. **Maintien des acquis** — Quand on passe au bloc suivant, 1 rappel/sem minimum de la qualité précédente.

### 🇳🇴 MÉTHODE NORVÉGIENNE — Double Threshold (Marius Bakken / Gjert Ingebrigtsen / Olav Bu)
La révolution de l'entraînement en endurance depuis 2020. Utilisée par Jakob Ingebrigtsen (OR 1500m/5000m), Karsten Warholm, Gustav Iden, Kristian Blummenfelt.

**Principe central :** Accumuler un volume élevé d'entraînement au SEUIL LACTIQUE, mais à une intensité contrôlée (juste en-dessous du seuil, pas au-dessus). L'objectif est de maximiser le temps passé à haute intensité tout en minimisant la fatigue résiduelle.

**Protocole Double Threshold (2 séances seuil le même jour) :**
- **Matin (seuil bas, 2.0-2.5 mmol/L lactate)** : 5×6min @seuil bas (RPE 7/10) r=1min trot. Volume total : 30min @seuil
  → Allure = seuil -5 à -10s/km. Confortable mais exigeant. Conversation impossible mais pas en détresse
- **Soir (seuil haut, 3.0-4.0 mmol/L lactate)** : 10×1000m @seuil haut r=1min trot. Volume total : 10km @seuil
  → Allure = allure seuil classique. Effort contrôlé, jamais maximal
- **Fréquence** : 2 "double threshold days" par semaine (ex: mardi + jeudi)
- **Volume seuil hebdo** : 40-60min de travail effectif @seuil (vs 20-30min en méthode traditionnelle)

**Adaptation par niveau :**
- **Elite** : 2 doubles seuil/sem + 1 SL. 50-60min @seuil/sem
- **Competitor** : 1 double seuil/sem + 1 seuil simple. 30-40min @seuil/sem
- **Age Group** : 1 seuil simple/sem (2×15-20min). 25-35min @seuil/sem. Pas de double seuil
- **Finisher** : pas de seuil formel. Tempo allure course seulement

**Clé scientifique** : Le lactate est mesuré, pas estimé. En l'absence de lactate, utiliser FC seuil (85-88% FCmax) ou RPE 7-8/10. La dérive cardiaque en fin d'intervalles = signe qu'on est trop intense → ralentir.

**Quand utiliser la méthode norvégienne :**
- TTE < 50min → PRIORITÉ #1 : le double seuil est le meilleur outil pour augmenter TTE
- Plateau en VO2max après plusieurs blocs VMA → basculer vers seuil longue durée
- Semi-marathon et marathon : le double seuil est la méthode de choix (élever le seuil = élever l'allure course)
- Triathlon 70.3/IM : appliquer en vélo (2×20min @90-95% FTP matin + 2×15min @seuil CAP soir)

### 🇰🇪 MÉTHODE CANOVA — Spécificité Inverse (Renato Canova)
Renato Canova : +50 médaillés olympiques/mondiaux. Coach de Mosop (2:03), Kiplagat, Cairess (2:06). La méthode la plus éprouvée pour le marathon.

**Principe : "Training is a simulation of the race, not a preparation for it"**
→ Introduire l'allure spécifique de course TRÈS TÔT dans la préparation (dès la phase base), et progresser en VOLUME à cette allure, pas en vitesse.

**Special Block Training (Canova) :**
- **Journée bloc** : 2 séances spécifiques le même jour, séparées par 6-8h
  - Matin : Tempo long 10-15km @allure marathon
  - Soir : Course progressive 10km finissant @allure marathon
  - Volume jour bloc : 20-30km @allure spécifique ou proche
- **Progression bloc** : augmenter le volume @allure spécifique, pas la vitesse
  - Sem 1-4 : 3×5km @allure marathon
  - Sem 5-8 : 2×8km @allure marathon
  - Sem 9-12 : 1×15km + 1×10km @allure marathon (journée bloc)
  - Sem 13-16 : 1×20km @allure marathon (séance de simulation)

**Séances signature Canova :**
1. **Fast Continuous Run** : 15-20km continu @allure marathon -10s/km. Tempo marathon sans pause
2. **Progressive Long Run** : SL dont derniers 30-40% @allure marathon. Ex: 30km, derniers 12km @AM
3. **Specific Block Day** : matin tempo + soir course avec finish rapide (même jour)
4. **Variation of Pace (Fartlek Canova)** : alternance 2km @AM + 1km @semi + 2km @AM... sur 15-20km
5. **Medium Long with Fast Finish** : 22km dont derniers 5km @allure semi

**Periodisation Canova (Inversée) :**
- **Phase 1 — Introductive (4 sem)** : Volume Z2 + force + introduction allure semi/marathon courte (3-5km)
- **Phase 2 — Fundamental (6-8 sem)** : Augmenter volume @allure spécifique. SL progressive. Blocs spécifiques
- **Phase 3 — Specific (4-6 sem)** : Journées blocs. Simulations marathon. Volume @allure spécifique maximum
- **Phase 4 — Pre-race (2-3 sem)** : Réduction volume -40%, maintien rappels allure course

### 🇺🇸 MÉTHODE DANIELS — VDOT & Zones Précises (Jack Daniels, PhD)
Le système de référence mondial pour calibrer les zones d'entraînement en course à pied.

**5 Zones Daniels (basées sur VDOT, pas FC) :**
| Zone | Nom | % VDOT | Objectif |
|------|-----|--------|----------|
| E | Easy | 59-74% | Endurance fondamentale. 80% du volume |
| M | Marathon | 75-84% | Allure marathon. Spécificité |
| T | Threshold | 83-88% | Seuil lactique. TTE↑ |
| I | Interval | 95-100% | VO2max. 3-5min blocs |
| R | Repetition | >105% | Économie + vitesse. 200-400m |

**Séances Daniels par zone :**
- **E runs** : 30-150min. Conversation possible. 65-79% FCmax
- **T intervals** : cruise intervals 5-6×1000m @Tempo r=1min OU tempo continu 20-40min
- **I intervals** : 5-6×1000m @I-pace r=jog equal time OU 3-4×1200m. Jamais >5min/rep
- **R repeats** : 8-12×200m @R-pace r=200m jog OU 6×400m. Focus forme et économie
- **M runs** : 10-20km @Marathon pace. En SL ou seul

**Règle des 10%** : Pas plus de 10% du volume hebdo en zone I ou R combinées.

### 🇫🇷 MÉTHODE BILLAT — VO2max Optimisé (Véronique Billat, PhD)
Spécialiste mondiale de l'optimisation VO2max. Ses travaux ont prouvé la durée optimale des intervalles.

**Découvertes clés :**
1. **Temps de maintien @VO2max (tlim)** : la durée maximale tenable @100% VMA = 4-8min (moyenne 6min). Au-delà = déclin
2. **Séance optimale 30/30** : 30s @VMA / 30s récup passive. 2-3 séries de 8-12min. Permet d'accumuler 15-20min @VO2max effectif
3. **Séance longue intervalles** : 3-5×3min @100-105% VMA r=3min. Temps @VO2max : 10-15min
4. **Fartlek Billat** : alternance 1min rapide / 1min lent ×20-30. Equivalent à 10-15min @VO2max
5. **Protocole 3min/3min** : le meilleur rapport temps @VO2max / fatigue résiduelle pour la plupart des athlètes

**Application TFCL :**
- Si limiteur = VO2max bas → 2 séances Billat/sem pendant 3-4 sem (bloc concentré)
- Si limiteur = VLamax trop haute → éviter les séances R (répétitions courtes) qui développent VLamax
- Si limiteur = TTE → séances T (seuil) longues, pas Billat

### 🇳🇴 MÉTHODE RØNNESTAD — Force + Endurance (Bent Rønnestad, PhD)
Référence scientifique mondiale pour l'intégration force-endurance.

**Résultats prouvés :**
- Force max 2x/sem pendant 12 sem → +4.8% en économie de course, +3.5% en puissance seuil vélo
- Aucune prise de masse musculaire (pas d'hypertrophie significative) si combiné avec entraînement endurance
- Pliométrie → +4.2% économie de course en 8 sem (Paavolainen 1999, confirmé Rønnestad)

**Protocole Force Rønnestad :**
- **Phase Force Max (8-12 sem)** : 2x/sem, 3-4 exercices multi-articulaires
  - Squat : 4×4 @85-90% 1RM (force max)
  - Deadlift : 3×5 @80-85% 1RM
  - Single leg squat/Bulgarian : 3×6 @75% 1RM
  - Hip thrust : 3×8 @75% 1RM
  - Tempo excentrique : 3s descente, 1s montée
- **Phase Maintien (toute la saison)** : 1x/sem, même exercices, même charge, volume réduit (2-3×3-4 reps)
- **Timing** : force AVANT endurance le même jour (6h+ entre les deux), OU le lendemain d'un jour de repos
- **JAMAIS force max le lendemain d'une séance clé haute intensité** (interférence concentrique)

**Pliométrie Rønnestad/Paavolainen :**
- 2-3x/sem en phase base, 1-2x/sem en phase spécifique
- Drop jumps 3×5, box jumps 3×8, single leg hops 3×10, bounds 3×8
- Volume total : 60-100 contacts sol/séance (pas plus)
- Pause 48h entre 2 séances pliométrie

### 🇰🇪 MÉTHODE KÉNYANE — Volume + Fartlek Naturel (Kipchoge, Kiptum, Cheruiyot)
L'approche "high mileage + natural intensity" des camps d'Iten/Kaptagat.

**Principes :**
1. **Volume élevé** : 160-200km/sem élite marathon. Tout est couru, jamais de vélo cross-training
2. **Fartlek naturel** : pas de chrono, pas de montre. Courir au feeling sur terrain vallonné. L'intensité vient naturellement des côtes et des surges du groupe
3. **Double journée standard** : matin 1h30-2h EF → soir 45min-1h shake-out. 6j/7
4. **1 "track day" + 1 "long run"/sem** : les 2 seules séances structurées. Le reste = EF feeling
5. **Progression en volume** : augmenter le kilométrage global, pas l'intensité des séances
6. **Période d'altitude** : camps à 2400m (Iten). Avantage hématologique naturel

**Fartlek Kényan (séance signature) :**
- Aucune structure fixe. Courir en groupe 1h20-1h40 sur terrain vallonné
- Accélérations naturelles en côte (90-95% VMA), récup en descente
- Intensity distribution : ~70% Z2, ~30% Z3-Z4 (naturellement pyramidal)
- Adaptation TFCL : 1h15 vallonné, 8-10 surges de 2-3min en côte @RPE 8/10, récup libre en descente

### PHILOSOPHIES COMPARÉES — Quand Utiliser Quoi
| Situation | Méthode recommandée | Justification |
|-----------|-------------------|---------------|
| TTE < 45min, seuil bas | 🇳🇴 Norvégienne (double seuil) | Volume seuil élevé = TTE↑ rapide |
| VO2max plafonné | 🇫🇷 Billat (30/30, 3min/3min) | Temps @VO2max optimisé |
| Spécificité marathon | 🇰🇪 Canova (blocs spécifiques) | Volume @allure course progressif |
| Débutant/Finisher | 🇺🇸 Daniels (VDOT zones) | Zones claires, progression structurée |
| Force/économie faible | 🇳🇴 Rønnestad (force max) | Gain économie prouvé +4.8% |
| IM/70.3 triathlon | Lorang (reverse perio) | Intensité précoce + volume tardif |
| Volume naturel élevé | 🇰🇪 Kényane (fartlek + mileage) | Si athlète tolère >100km/sem |
| Âge >40 ans | Daniels + Rønnestad | Zones prudentes + force anti-sarcopénie |

**RÈGLE TFCL : Combiner les méthodes par bloc, jamais une seule méthode sur tout le plan**
Un plan TFCL™ de qualité pioche dans TOUTES ces méthodologies selon le bloc actuel, le limiteur, et le profil :
- Bloc Fondation : Rønnestad (force) + Billat (VO2max courte, Reverse Perio) + Lorang (Train Low)
- Bloc Chantier [Limiteur] : Norvégienne si TTE, Billat si VO2max, Z2 long si VLamax, SFR si économie
- Bloc Consolidation : Canova (introduction allure spécifique) + Norvégienne (seuil long)
- Bloc Race-Specific : Canova (blocs spécifiques) + Kényane (SL progressive) + simulations
- Bloc Affûtage : Mujika (réduction exponentielle) + rappels courts toutes qualités


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

### Doubles & Triples Séances (Bi/Tri-Daily) — OBLIGATOIRE Modèle Pro/Élite

⚠️ C'EST LA RÈGLE LA PLUS IMPORTANTE POUR LE TRIATHLON. Un plan IM ou 70.3 avec 1 séance/jour n'est PAS un plan de triathlon, c'est un plan de course à pied déguisé. Un triathlète pro s'entraîne 2 à 3 fois par jour, 6 jours sur 7. Reproduis cette réalité.

**Semaine-type d'un triathlète IM/70.3 pro = 15 à 18 séances/semaine** :
- Natation : 5-6 séances (20-25km/sem)
- Vélo : 4-5 séances (400-600km/sem IM)
- CAP : 4-5 séances (70-90km/sem IM)
- Renfo/Prévention : 2 séances
- **Chaque jour d'entraînement a 2 ou 3 séances** (sauf le jour de repos)

#### Règles par niveau d'ambition (CRITIQUE)
- **Elite (20-30h/sem)** : 10-14 doubles ou triples/sem. Exemples de jours :
  - Matin : Natation seuil 4km → Midi : Vélo VO2max 2h → Soir : CAP EF 45min
  - Matin : Natation technique 3.5km → Après-midi : Vélo SL 5h
  - Matin : Vélo intervalles 2h → Soir : Renfo force 1h
- **Competitor (15-22h/sem)** : 5-8 doubles/sem minimum. Chaque jour sauf repos a AU MINIMUM 2 séances.
  - Matin : séance principale → Soir : natation technique OU renfo OU Z1 courte
- **Age Group (10-15h/sem)** : 2-4 doubles/sem (briques + natation matin/renfo soir).
- **Finisher** : Pas de doubles séances. 1 séance/jour max.

#### Format tableau pour doubles/triples (OBLIGATOIRE)
Utilise **une ligne séparée pour chaque séance** avec le moment de la journée dans la colonne Jour :
| Lundi matin | Natation | Technique + aérobie | ... |
| Lundi soir | Renfo | Core + prévention | ... |
| Mardi matin | Natation | 🔑 CSS Seuil | ... |
| Mardi midi | Vélo | 🔑 VO2max blocs | ... |
| Mardi soir | CAP | EF + technique | ... |

⚠️ NE FAIS PAS "Mardi | Multi | Nat + Vélo + CAP" sur une seule ligne. SÉPARE CHAQUE SÉANCE sur sa propre ligne.
⚠️ Pour Elite/Competitor IM/70.3 : si un jour n'a qu'UNE SEULE séance (hors repos), c'est une ERREUR.

#### Combos journaliers classiques Dan Lorang
- **Lundi (récup)** : Natation technique matin + Renfo/prévention soir
- **Mardi (intensité)** : Natation seuil matin + Vélo intervalles midi + CAP EF soir
- **Mercredi (aérobie)** : Vélo endurance longue matin + CAP tempo ou EF soir
- **Jeudi (intensité CAP)** : Natation technique matin + CAP seuil/VMA midi + Vélo récup soir
- **Vendredi (endurance)** : Natation longue matin + Renfo/mobilité soir
- **Samedi (brique)** : Vélo SL 4-6h matin → Brique CAP immédiate
- **Dimanche (SL CAP)** : CAP sortie longue matin + Natation récup optionnelle soir

Règles doubles séances :
- JAMAIS 2 séances haute intensité le même jour (sauf brique planifiée).
- La 2e/3e séance est toujours de moindre intensité (Z1-Z2, technique, renfo, mobilité).
- Renfo/core en 2e séance 2-3x/sem.

### Règles de Sécurité
- **Sprint Ban** : s'applique UNIQUEMENT si l'app le spécifie explicitement dans les prohibitions. Ne PAS l'appliquer par défaut.
  → Pour semi/10K/5K : les sprints et la pliométrie SONT bénéfiques (économie, recrutement neuromusculaire)
  → Pour Finisher : pas d'optimisation VLamax, sprints autorisés en modération
  → Sprint Ban actif = interdire sprints all-out, micro-intervalles <20s, efforts erratiques
- VLamax vélo > 0.50 longue distance → priorité Z2 volume, limiter intensité courte
- TTE < 40 min → TTE↑ avant intensité
- Décharge -30-40% volume toutes les 3-4 sem
- Max 2 séances haute intensité/sem
- 1 jour repos complet/sem
- Jamais 2 séances clés le même jour sauf brique planifiée

### Périodisation par Blocs Détaillée par Objectif — Hybride Lorang

#### IRONMAN (16-24 sem) — Reverse Perio Lorang + Block Periodization
- **Bloc 1 — Fondation + Intensité Précoce (4-6 sem)** : Reverse perio = inclure dès maintenant des intervalles VO2max courts vélo (5×4min @115% FTP) + natation technique intensive. Force max 2x/sem (Rønnestad). VLamax↓ via Z2 longue à jeun (Train Low). Volume = 70% du peak.
  - Séances clés : 🔑 VO2max vélo courte + 🔑 SL vélo Z2 Train Low + 🔑 Force max squat/deadlift
  - Natation : 4-5x/sem, focus drill + CSS. CAP : 3x/sem EF + tempo léger
- **Bloc 2 — Chantier [Limiteur #1] (4-6 sem)** : Si VLamax haute → Z2 long Train Low + sweet spot. Si TTE faible → seuil Norvégien. Si VO2max → Billat. Briques vélo→CAP introduites (1x/sem). CSS natation progression. Gut Training démarre 30-40g/h.
  - Séances clés : 🔑 Séance limiteur #1 (2-3x/sem) + 🔑 Brique vélo→CAP + 🔑 CSS seuil natation
  - Volume = 85% du peak. Premières simulations ravitaillement
- **Bloc 3 — Race-Specific + Durabilité (4-6 sem)** : Briques race-pace simulation (vélo @78% FTP + CAP @allure IM). OWS race-pace. SL vélo 5-6h avec Gut 60-80g/h. Volume = peak. Rappels limiteur #1 (1x/sem).
  - Séances clés : 🔑 Brique race-pace simulation + 🔑 SL vélo 5h+ Gut Training + 🔑 OWS race-pace
  - Force = maintien 1x/sem. 1-2 simulations complètes (nat+vélo+CAP enchaînés)
- **Bloc 4 — Affûtage (2-3 sem)** : Mujika exponentiel. Sem -2 : -40% volume, maintien intensité (rappels 3×8min @race-pace). Sem -1 : -60% volume. Activation J-2 (brique courte 45min). Gut test final.
  - Carb loading J-3 à J-1 : 8-12g/kg/j. Dernière SL J-10. Dernière intensité vraie J-5.

#### 70.3 (12-16 sem) — Reverse Perio Lorang / Block Iden-Haug
- **Bloc 1 — Fondation + Intensité (3-4 sem)** : Volume Z2 + force max + technique natation. Reverse perio : blocs courts VO2max vélo 1x/sem. Train Low 2x/sem.
  - Séances clés : 🔑 VO2max vélo (4×4min @115% FTP) + 🔑 SL vélo Z2 2h30 + 🔑 Force max
- **Bloc 2 — Chantier [Limiteur #1] (3-4 sem)** : Seuil vélo prolongé (2×20min @90-95% FTP) si TTE limiteur. SFR si économie. CSS blocs natation. Tempo CAP allure 70.3. Gut Training 40-60g/h. Premières briques.
  - Séances clés : 🔑 Séance limiteur #1 + 🔑 Tempo CAP allure 70.3 + 🔑 CSS blocs natation
- **Bloc 3 — Race-Specific (3-4 sem)** : Race-pace simulation complète. Briques vélo @82-85% FTP + CAP @allure 70.3. OWS race-pace. Gut 60-75g/h. Rappels limiteur #1.
  - Séances clés : 🔑 Simulation 70.3 complète + 🔑 Race-pace blocs natation + 🔑 Brique seuil
- **Bloc 4 — Affûtage (10-14j)** : -35% volume sem 1, -55% sem 2. Rappels courts @race-pace. Activation J-2.

#### MARATHON (12-20 sem) — Canova/Norvégienne/Block Hybride
- **Bloc 1 — Fondation + Force + Allure Courte (4-6 sem)** : Reverse Perio Canova = introduction allure marathon courte dès sem 2 (3-5km @AM dans SL). Volume Z2 progressif (+5-8%/sem). Renfo force max 2x/sem (Rønnestad). Fartlek naturel. Cadence 175-185spm.
  - Séances clés : 🔑 SL progressive (20→26km) + 🔑 Force max + 🔑 Introduction tempo AM court
  - Volume : 60→80km/sem (AG), 80→120km/sem (Competitor), 100→150km/sem (Elite)
- **Bloc 2 — Chantier [Limiteur #1] + Allure Progressive (4-6 sem)** : Si TTE → seuil continu long Norvégienne (2×20min→1×40min). Si VLamax → Z2 long Train Low + tempo AM. Canova : Fast Continuous Run (15km @AM -10s). Augmenter volume @allure spécifique.
  - Séances clés : 🔑 Séance limiteur #1 + 🔑 SL progressive neg split + 🔑 Fast Continuous Run
  - Norvégienne si TTE < 50min : 1 double seuil/sem (Competitor), 2 doubles (Elite)
- **Bloc 3 — Blocs Spécifiques Canova (3-4 sem)** : Canova Special Blocks (journée bloc : matin 15km @AM + soir 10km progressive). SL simulation marathon (30-35km avec finish @AM). Variation of Pace. Volume @allure spécifique = maximum. Rappels limiteur #1 (1x/sem).
  - Séances clés : 🔑 SL simulation marathon + 🔑 Bloc spécifique Canova + 🔑 Allure marathon continu 40-60min
  - Gut Training : 30-45g/h en SL. Simulation ravitaillement identique au jour J
- **Bloc 4 — Affûtage Mujika (2-3 sem)** : Sem -2 : -40% volume, rappels AM (3×8min). Sem -1 : -60%, activation J-2 (20min dont 10min @AM). Dernière SL J-14 à J-10. Dernière VMA/seuil J-7. Carb loading J-3.
  - Race Week : L repos, Ma 8km dont 3×3min @AM, Me 6km EF, J repos, V 5km EF + 4×100m strides, S carb loading + visualisation, D = Jour J

#### SEMI-MARATHON (8-14 sem) — Block Norvégien/Billat Hybride
- **Bloc 1 — Fondation + VO2max (3-4 sem)** : Volume Z2 + introduction VMA courte (30/30 Billat, Reverse Perio). Renfo force 2x/sem. Cadence 178-186spm. SL 14→18km progressive.
  - Séances clés : 🔑 VMA courte (30/30 ×15-20) + 🔑 SL progressive + 🔑 Force max
  - Volume : 35→50km/sem (AG), 50→75km/sem (Competitor), 70→110km/sem (Elite)
- **Bloc 2 — Chantier Seuil/TTE + Allure Semi (3-4 sem)** : Seuil continu long (2×15→2×20min @seuil). Tempo allure semi (3×3km @allure semi). Norvégienne si Competitor+ : 1 double seuil/sem. SL 18→22km avec finish. Rappels VO2max (1x/sem, 5×1000m @VMA).
  - Séances clés : 🔑 Seuil long continu + 🔑 Allure semi blocs + 🔑 SL avec finish tempo
- **Bloc 3 — Race-Specific Semi (2-3 sem)** : Allure semi dominante. 2×5km @allure semi. SL simulation semi (22km dont 10km @allure semi). Fartlek mixte seuil/semi. Rappels VO2max + seuil.
  - Séances clés : 🔑 SL simulation semi + 🔑 Allure semi long (2×5km) + 🔑 Seuil + lactate tolerance combo
- **Bloc 4 — Affûtage (7-10j)** : -35% sem 1, -55% derniers 4j. Rappels courts @allure semi (3×5min). Activation J-2.
  - Race Week : L repos, Ma 8km dont 2×5min @allure semi, Me 6km EF, J repos, V 5km EF + strides, S repos + carb loading, D = Jour J

#### 10K (8-12 sem) — Block Billat/Daniels Hybride
- **Bloc 1 — Fondation + VO2max Intensive (3-4 sem)** : Volume Z2 progressif. VMA courte (30/30 Billat) + VMA longue (5×1000m). Renfo force + pliométrie. SL 14→18km. Reverse Perio : VO2max d'emblée.
  - Séances clés : 🔑 VMA longue (5×1000m @VMA) + 🔑 SL progressive + 🔑 Force + pliométrie
  - Volume : 30→45km/sem (AG), 45→70km/sem (Competitor), 80→120km/sem (Elite)
- **Bloc 2 — Chantier Seuil + Tempo 10K (2-3 sem)** : Seuil continu (2×15min→1×30min). Tempo allure 10K (5×1km @allure 10K). VMA longue maintien. SL 18→22km.
  - Séances clés : 🔑 Seuil continu + 🔑 Allure 10K blocs + 🔑 SL avec finish rapide
- **Bloc 3 — Race-Specific 10K (2-3 sem)** : Allure 10K dominante (5×2000m @allure 10K). Seuil + lactate tolerance combo (Ingebrigtsen : 20min @seuil + 4×400m @110% VMA). SL avec finish @allure 10K.
  - Séances clés : 🔑 Allure 10K long + 🔑 Seuil + lactate tolerance + 🔑 SL finish @allure 10K
- **Bloc 4 — Affûtage (5-7j)** : -40% volume, maintien 2 rappels courts. Activation J-2 (6km dont 4×400m @allure 10K).
  - Race Week : L repos, Ma 8km dont 4×800m @allure 10K, Me 6km EF, J 5km EF + strides, V repos, S activation 4km + 4×200m, D = Jour J

#### 5K (6-10 sem) — Block Ingebrigtsen/Billat
- **Bloc 1 — Fondation + VMA Explosive (2-3 sem)** : Volume Z2. VMA courte explosive (12×400m @VMA r=60s). Pliométrie + force. SL 12→16km.
  - Séances clés : 🔑 VMA courte explosive + 🔑 SL progressive + 🔑 Pliométrie explosive
  - Volume : 25→40km/sem (AG), 40→60km/sem (Competitor), 70→100km/sem (Elite)
- **Bloc 2 — Chantier VO2max + Seuil (2-3 sem)** : Billat 3min/3min (5×3min @100-105% VMA). Seuil continu (20min). Côtes VMA. SL avec finish.
  - Séances clés : 🔑 Billat VO2max + 🔑 Seuil continu + 🔑 SL avec finish @allure 10K
- **Bloc 3 — Race-Specific 5K (2-3 sem)** : Allure 5K dominante (5×1000m @allure 5K). Seuil + lactate tolerance (Ingebrigtsen). Fartlek mixte. Répétitions R (6×400m @R-pace Daniels).
  - Séances clés : 🔑 Allure 5K blocs + 🔑 Seuil + lactate tolerance + 🔑 SL finish @allure 5K
- **Bloc 4 — Affûtage (5-7j)** : -40% volume. 2 rappels @allure 5K courts (3×600m). Activation J-2.
  - Race Week : L repos, Ma 6km dont 3×600m @allure 5K, Me 5km EF, J repos, V 4km EF + 3×100m strides, S repos, D = Jour J

#### TRAIL COURT <42km (8-14 sem) — Block Jornet/Walmsley
- **Bloc 1 — Fondation + Force (3-4 sem)** : Volume D+ progressif. Force excentrique 2x/sem. VMA côtes. Proprioception.
- **Bloc 2 — Chantier Seuil Montée + Technique (3-4 sem)** : Seuil montée long (3×15-20min). Descente technique rapide. SL D+ progressive.
- **Bloc 3 — Race-Specific Trail (2-3 sem)** : Simulation terrain cible. Ultra-longue 4-5h. VMA côtes + descente technique.
- **Bloc 4 — Affûtage (7-10j)** : -35% volume, maintien rappels seuil montée courts.

#### TRAIL ULTRA >42km / UTMB (16-24 sem) — Block D'Haene/Dauwalter/Blanchard
- **Bloc 1 — Fondation Aérobie + Force (5-6 sem)** : Volume D+ massif en Z2. Force excentrique lourde 2x/sem. Proprioception avancée. Gut Training démarrage.
- **Bloc 2 — Chantier Montagne + Back-to-Back (4-6 sem)** : Seuil montée long progressif. SL D+ 4→6h. Back-to-back weekends (SL samedi + SL dimanche). Descente technique intensive.
- **Bloc 3 — Race-Specific Ultra + Simulations (4-6 sem)** : Simulations ultra 6-8h. Simulation nuit obligatoire (1-2x). Ravitaillement complet testé. Back-to-back avec cumul D+.
- **Bloc 4 — Affûtage (2-3 sem)** : Sem -2 : -40%, rappels seuil montée courts. Sem -1 : -60%, activation J-2 (1h vallonné léger). UTMB taper = 14-21j.

#### START TO RUN (12-16 sem) — Périodisation Linéaire Progressive (exception)
⚠️ Pour les débutants, la périodisation par blocs N'EST PAS appropriée. Utiliser une progression linéaire :
- **Phase 1 — Marche dominante (4 sem)** : 70% marche / 30% course. 3 séances/sem max. Renfo PPG 2x/sem. Jamais 2 CAP consécutifs.
- **Phase 2 — Alternance (4 sem)** : 50/50 marche/course. 3-4 séances/sem. Progression +5min course/sem. Renfo maintien.
- **Phase 3 — Course dominante (4 sem)** : 70% course / 30% marche. Objectif 30min continu en fin de phase. SL douce 35-40min.
- **Phase 4 — Course continue (4 sem)** : 30-45min continu. Introduction tempo léger (2-3min @RPE 6). SL 45-50min.


## SEMAINES-TYPES ÉLITE — RÉFÉRENCE (Few-Shot)
Utilise ces micro-cycles réels comme modèles de qualité. Adapte-les au niveau de l'athlète.

### Exemple : Jan Frodeno — Semaine Build IM (22h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, mobilité 30min, foam roller |
| Mardi matin | Natation | CSS Dégressif | 400m éch. 4×(200-300-200) @1:22/100m r=15s. 200m RC. 3800m ~58min |
| Mardi soir | Vélo | Sweet Spot vallonné | 2h30 dont 3×20min @88-92% FTP (280-295W) cad 90. Z2 entre |
| Mercredi matin | CAP | Tempo allure IM | 1h15 dont 3×12min @4:05/km (82% VMA) r=3min trot. Cad 182spm |
| Mercredi soir | Renfo | Force fonctionnelle | Squat 4×6 @75%, fentes bulgares 3×8, deadlift 3×5, core 15min. 45min |
| Jeudi matin | Natation | Seuil + technique | 300m éch drill. 5×400m @1:20/100m r=25s. 8×50m rattrapé. 200m RC. 4000m |
| Jeudi soir | Vélo | Endurance Z2 Train Low | 2h à jeun Z2 (195-220W, 68% FTP), cad 88. Aucune intensité |
| Vendredi matin | CAP | EF vallonnée | 1h Z2 (4:45/km), 180spm, terrain vallonné +200m D+. Sensation aisée |
| Vendredi soir | Natation | Pull aérobie + OWS | Pull buoy 2500m Z2 @1:28/100m. 4×200m OWS simulation. 3200m |
| Samedi | Vélo | Sortie longue + Gut Training | 5h Z2 vallonné (200-230W). Gut training 60g/h glucides. Dernière heure @75% FTP |
| Samedi soir | Renfo | Core + prévention | Gainage 4×60s, pallof press 3×12, élastiques hanches, étirements. 30min |
| Dimanche | Brique | Vélo→CAP Race-Pace | Vélo 2h30 @78% FTP (250W) + enchaînement CAP 45min @4:10/km. Gut 50g/h |

### Exemple : Eliud Kipchoge — Semaine Build Marathon (170km, 13h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | CAP | EF récupération | 50min Z1 (5:15/km), 178spm. Aisance totale, conversation possible |
| Mardi matin | CAP | Tempo marathon | 1h30 dont 2×25min @allure marathon (2:55/km) r=5min trot. 26km total |
| Mardi soir | Renfo | Pliométrie + core | Box jumps 4×8, drop jumps 3×6, fentes sautées 3×10, gainage 4×45s. 40min |
| Mercredi | CAP | EF longue vallonnée | 1h40 Z2 (4:10/km), terrain ondulé. 25km. Cadence 185spm |
| Jeudi matin | CAP | Fartlek kenyan | 1h20 dont pyramide 2-3-5-7-5-3-2min @90-95% VMA, récup trot égale. 20km |
| Jeudi soir | Renfo | Force + prévention | Squat 3×5 @80%, deadlift 3×5, single leg 3×8, excentrique mollets 3×15. 35min |
| Vendredi | CAP | EF récupération | 45min Z1 très léger (5:20/km). Jambes fraîches |
| Samedi | CAP | SL spécifique | 32km dont derniers 12km progressif : 4:00→3:20/km. Neg split. Gut 40g/h |
| Dimanche | CAP | EF + strides | 1h Z2 (4:30/km) + 6×100m accélérations. Renfo core 15min post-run |

### Exemple : Jakob Ingebrigtsen — Semaine Build 5K/10K (130km, 11h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération totale, mobilité, sommeil |
| Mardi matin | CAP | VMA longue | 15min éch. 6×1200m @3:00/km (98% VMA) r=2min30 trot. 15min RC. 18km |
| Mardi soir | Renfo | Circuit explosif | Plio 4×8, squat sauté 3×10, core 4×60s, élastiques hanches. 35min |
| Mercredi | CAP | EF endurance | 1h30 Z2 (3:55/km), 190spm. 23km. Terrain plat |
| Jeudi | CAP | Seuil + tempo | 1h20 dont 2×20min @seuil (3:15/km, 88% VMA) r=4min trot. 20km |
| Vendredi | CAP | EF récupération | 50min Z1 (4:20/km). Très léger, sensation fraîche |
| Samedi | CAP | SL progressive | 1h50 (28km). Premiers 20km @4:00/km, derniers 8km @3:30→3:10/km. Neg split |
| Dimanche | CAP | EF + côtes | 1h10 Z2 (4:00/km) dont 8×150m côte 8% @effort 5K r=descente trot. 17km |

### Exemple : Semaine Base Semi-Marathon Age Group (55km, 7h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, étirements optionnels |
| Mardi | CAP | VMA courte | 20min éch Z2. 2×(10×30s @VMA / 30s trot). 10min RC. 12km total, 55min |
| Mercredi | Renfo | Circuit PPG | Squats 3×15, fentes 3×12, gainage 3×45s, pompes 3×12, chaise 3×30s. 40min |
| Jeudi | CAP | EF vallonnée | 55min Z2 (5:30/km), cadence 175spm, terrain vallonné léger +100m D+. 10km |
| Vendredi | CAP | Récupération active Z1 | 30min très léger Z1 (6:00/km). Ou vélo Z1 45min si jambes lourdes |
| Samedi | CAP | SL progressive | 1h30 (16km). Premiers 10km @5:40/km, derniers 6km @5:00→4:40/km |
| Dimanche | Renfo | Mobilité + core | Foam roller 15min, mobilité hanches/chevilles, gainage 3×40s. 30min |

### Exemple : Lucy Charles-Barclay — Semaine Spécifique 70.3 (18h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, massage, mobilité 30min |
| Mardi matin | Natation | Race-Pace 70.3 | 400m éch drill. 6×500m @1:15/100m (allure course) r=20s. 200m RC. 4100m ~60min |
| Mardi soir | Vélo | Seuil prolongé | 1h45 dont 2×25min @95% FTP (265W) cad 92 r=8min Z2. Terrain plat |
| Mercredi matin | CAP | Seuil allure 70.3 | 1h15 dont 3×15min @3:50/km (87% VMA) r=3min trot. 18km. Cad 184spm |
| Mercredi soir | Renfo | Core + prévention | Gainage 4×50s, pallof press 3×12, single leg deadlift 3×10, band walks 3×15. 35min |
| Jeudi matin | Natation | Vitesse + technique | 300m éch. 12×75m @sprint r=20s. 8×50m finger drag. 300m RC. 2800m |
| Jeudi soir | Vélo | Z2 récupération | 1h30 Z2 léger (175-200W, 65% FTP). Cadence libre. Jambes fraîches |
| Vendredi | CAP | EF + strides | 55min Z2 (4:30/km) + 8×100m accélérations progressives. 13km |
| Samedi | Brique | Simulation 70.3 | Vélo 2h @82% FTP (230W) + CAP 30min @3:55/km immédiat. Gut 70g/h. Transition <2min |
| Samedi soir | Natation | Aérobie long | Pull buoy 3000m @1:24/100m Z2. Focus position + respiration bilat. 42min |
| Dimanche | Vélo | Sortie longue vallonnée | 3h30 Z2 (190-220W) terrain vallonné +800m D+. Ravitaillement solide 40g/h |

### Exemple : Kilian Jornet — Semaine Build Trail Ultra (16h, 120km, +4500m D+)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, sommeil 9h, auto-massage |
| Mardi | CAP/Trail | Montée seuil | 2h dont 4×15min montée @seuil (1000m/h D+) r=5min descente trot. +900m D+ |
| Mercredi matin | Renfo | Excentrique + force | Squat excentrique 4s 4×8, fentes bulgares 3×10, step-ups lestés 3×12, proprioception 10min. 50min |
| Mercredi soir | CAP | EF vallonnée | 1h15 Z2 sentier, terrain technique. +400m D+. Cad adaptée au terrain |
| Jeudi | CAP/Trail | Sortie longue D+ | 3h30 montagne, +1500m D+. Z2 en montée, technique en descente. Ravitaillement 50g/h |
| Vendredi | CAP | Récupération active | 40min Z1 plat très léger (5:30/km). Mobilité chevilles 15min post |
| Samedi matin | CAP/Trail | VMA côtes + descente | 1h30 dont 10×2min côte raide @VO2max r=descente trot + 4×5min descente technique rapide. +600m D+ |
| Samedi soir | Renfo | Core + mobilité | Gainage latéral 3×40s, dead bug 3×12, foam roller 20min, étirements chaîne post. 35min |
| Dimanche | CAP/Trail | Endurance longue terrain | 2h30 Z2 sentier vallonné. +1100m D+. Allure naturelle, ravitaillement pratiqué |

### Exemple : Jim Walmsley — Semaine Base Trail Court 30km (10h, 80km, +2000m D+)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, foam roller, hydratation |
| Mardi | CAP/Trail | VMA côtes | 1h20 dont 8×90s côte 10% @VO2max r=descente trot + 6×30s côte raide sprint. +400m D+. 14km |
| Mercredi matin | Renfo | Excentrique + proprioception | Squat excentrique 5s 4×8, single leg deadlift 3×10, Bosu squats 3×12, proprioception chevilles 10min. 50min |
| Mercredi soir | CAP | EF sentier | 50min Z2 sentier technique. +200m D+. Cadence adaptée au terrain |
| Jeudi | CAP/Trail | Seuil montée | 1h30 dont 3×12min montée @seuil (800m/h D+) r=4min descente facile. +500m D+. 15km |
| Vendredi | CAP | Récupération active | 35min Z1 plat (5:45/km). Mobilité chevilles + hanches 15min |
| Samedi | CAP/Trail | Sortie longue D+ | 2h30 sentier montagneux Z2. +900m D+. Ravitaillement testé 40g/h. Technique descente |
| Dimanche | Renfo + Mobilité | Core + étirements | Gainage 4×45s, hip thrust 3×12, step-ups 3×10, foam roller 20min. 40min |

### Exemple : François D'Haene — Semaine Build Trail Montagne 60km (14h, 100km, +3500m D+)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, auto-massage, sommeil 9h |
| Mardi matin | CAP/Trail | Seuil montée long | 2h dont 5×12min montée @seuil (950m/h D+) r=descente 5min facile. +700m D+ |
| Mardi soir | Renfo | Excentrique lourd + core | Squat excentrique 6s 4×6, step-downs lestés 3×10, fentes descente 3×12, gainage anti-rotation 3×40s. 50min |
| Mercredi | CAP/Trail | Endurance longue vallonnée | 3h Z2 sentier montagne. +1200m D+. Allure naturelle, bâtons si terrain > 20%. Ravitaillement 45g/h |
| Jeudi | Vélo | Cross-training récup | 1h15 vélo Z1 (60% FTP). Récupération active. Zéro intensité. Cadence 80-85 |
| Vendredi matin | CAP/Trail | Tempo vallonné + descente tech | 1h30 dont 4×8min @tempo trail terrain ondulé + 4×3min descente technique rapide. +500m D+ |
| Vendredi soir | Renfo | Proprioception avancée | Bosu single leg 3×30s, planche instable 3×40s, jump lunges 3×8, bande hanches 3×15. 35min |
| Samedi | CAP/Trail | SL montagne (back-to-back J1) | 4h montagne Z2. +1500m D+. Ravitaillement complet 50g/h. Simulation terrain course |
| Dimanche | CAP/Trail | SL récup (back-to-back J2) | 2h30 sentier vallonné Z2 facile sur jambes fatiguées. +600m D+. Objectif : endurance sur pré-fatigue |

### Exemple : Pau Capell — Semaine Peak Trail Ultra UTMB (16h, 110km, +5500m D+)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, compression, sommeil 9h+ |
| Mardi matin | CAP/Trail | Intervalles montée | 2h30 dont 6×10min montée raide @seuil (1000m/h D+) r=5min descente trot. +1000m D+ |
| Mardi soir | Renfo | Résistance fatigue | Circuit : squat excentrique 3×10, burpees 3×8, step-ups 3×15, gainage 4×50s. Enchaîné, peu de repos. 45min |
| Mercredi | CAP/Trail | Endurance longue D+ | 4h30 montagne Z2. +2000m D+. Ravitaillement 60g/h solide + liquide. Gestion effort montée longue |
| Jeudi | Vélo | Cross-training Z1 | 1h vélo Z1 plat. Récupération active pure. Cadence libre |
| Vendredi matin | CAP/Trail | Tempo trail + simulation nutrition | 2h dont 3×15min @tempo trail terrain ondulé + test nutrition course complète 70g/h. +600m D+ |
| Vendredi soir | Renfo | Core anti-fatigue | Dead bug 4×12, pallof press 3×12, planche latérale 3×40s, mobilité colonne 15min. 35min |
| Samedi | CAP/Trail | Ultra-simulation nocturne (back-to-back J1) | 6h départ 5h du matin, montagne, +2000m D+. Simulation nuit + aube. Ravitaillement complet 70g/h. Bâtons |
| Dimanche | CAP/Trail | Récup terrain (back-to-back J2) | 2h sentier facile Z2 sur jambes fatiguées. +400m D+. Objectif : gérer la fatigue, pas la vitesse |

### Exemple : Semaine Affûtage Trail Ultra (Sem -1, 6h, 50km, +1500m D+)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | CAP/Trail | EF vallonnée | 50min Z2 sentier facile. +200m D+. Sensation légère |
| Mardi | CAP/Trail | Rappels seuil montée | 1h dont 3×5min montée @seuil r=3min descente facile. +300m D+. Court et intense |
| Mercredi | Renfo | Activation légère | Circuit léger : squats PDC 2×15, gainage 3×30s, mobilité 15min. 25min |
| Jeudi | CAP | EF récup | 35min Z1 plat très facile. Aucune fatigue résiduelle |
| Vendredi | Repos | Repos complet | Préparation matériel, hydratation, nutrition pré-course |
| Samedi | CAP | Activation pré-course | 20min Z1 + 4×30s accélération progressive. Strides. Fin de l'échauffement pré-course |
| Dimanche | 🏁 | JOUR DE COURSE | Objectif UTMB / Trail Ultra. Stratégie nutrition validée. Bâtons prêts |

### Exemple : Kristian Blummenfelt — Semaine Peak IM (28h, Modèle Olav Aleksander Bu)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi matin | Natation | Technique + aérobie | 500m éch drill (sculling, rattrapé, dog paddle). 3000m pull @1:20/100m Z2. 200m RC. 3700m |
| Lundi soir | Vélo | Z2 Train Low | 2h à jeun Z2 (220-250W, 65% FTP). Cadence 85-90. Aucune intensité |
| Mardi matin | Vélo | VO2max blocs | 2h dont 5×5min @115% FTP (390W) r=5min Z1. Cad 95-100. 15min éch/RC |
| Mardi midi | Natation | CSS continu | 20×100m @1:14/100m r=10s. 2500m total avec éch/RC. 38min |
| Mardi soir | CAP | EF + technique | 50min Z2 (3:55/km). 6×100m accélérations. Cad 190spm. Léger |
| Mercredi matin | Vélo | Sweet spot long | 3h30 dont 2×40min @88% FTP (300W) cad 90. Z2 entre. Terrain vallonné |
| Mercredi soir | Renfo | Force max | Squat 4×4 @85%, deadlift 3×5 @82%, fentes 3×8, core explosif 15min. 50min |
| Jeudi matin | Natation | Seuil pyramide | 400m éch. 200-400-600-800-600-400-200 @1:12-1:16/100m r=20s. 200m RC. 3800m |
| Jeudi soir | Vélo→CAP | Brique tempo | Vélo 1h30 @80% FTP (270W) + CAP 40min @3:45/km. Transition <90s. Gut 60g/h |
| Vendredi matin | Natation | OWS simulation | 3500m OWS : départ beach sprint 200m + 2×1500m @race-pace + navigation bouée |
| Vendredi soir | CAP | Tempo IM progressif | 1h dont 30min Z2 + 30min @allure IM (3:50/km). Neg split. 16km |
| Samedi | Vélo | Ultra-distance | 6h Z2 (210-240W) + dernière 1h30 @75% FTP. Gut training 80g/h. +1200m D+ |
| Samedi soir | Renfo | Core + prévention | Gainage 4×60s, band walks, élastiques épaules, étirements 30min |
| Dimanche | Brique | Race simulation longue | Vélo 3h @78% FTP + CAP 1h @3:55/km. Gut 75g/h complet. Simulation jour J |

### Exemple : Joshua Cheptegei — Semaine Spécifique 10K (150km, 12h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | CAP | EF récupération | 45min Z1 (4:30/km). Très facile, 180spm. Récupération active |
| Mardi matin | CAP | Intervals 10K pace | 15min éch. 5×2000m @2:40/km (allure 10K) r=90s trot. 15min RC. 20km total |
| Mardi soir | Renfo | Pliométrie | Hurdle hops 4×6, drop jumps 3×8, single leg bounds 3×10, core 10min. 30min |
| Mercredi matin | CAP | EF endurance | 1h30 Z2 (3:50/km), terrain plat. 24km. Cad 188spm |
| Mercredi soir | CAP | EF légère + strides | 30min Z1 (4:20/km) + 6×150m accélérations progressives. 9km |
| Jeudi | CAP | Tempo seuil | 1h15 dont 1×30min @3:05/km (seuil, 90% VMA) + 15min @3:15/km. 19km |
| Vendredi | CAP | EF récupération | 50min Z1 (4:15/km). Jambes légères. 12km |
| Samedi | CAP | SL race-pace finish | 25km dont derniers 5km @2:45/km (allure 10K). Neg split brutal. Simulation mentale |
| Dimanche | CAP | EF double + renfo | 1h10 Z2 (3:55/km) 18km. Core post 15min (gainage, bicycle, mountain climbers) |

### Exemple : Des Linden — Semaine Base Marathon Femme Élite (140km, 11h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | CAP | EF récupération | 50min Z1 (5:00/km). Récupération psychologique aussi. Terrain plat |
| Mardi matin | CAP | Seuil long | 1h30 dont 2×20min @3:30/km (seuil) r=5min trot. 22km. Cad 182spm |
| Mardi soir | Renfo | Force générale | Squat 3×6 @75%, hip thrust 3×10, deadlift 3×5, step-ups 3×10. 40min |
| Mercredi | CAP | EF vallonnée | 1h40 Z2 (4:20/km), collines naturelles +250m D+. 23km. Effort régulier en côte |
| Jeudi | CAP | Fartlek structuré | 1h20 dont 6×(4min @allure semi 3:25/km + 3min trot). 19km total |
| Vendredi | CAP | EF récupération | 40min Z1 (5:10/km). Mobilité hanches + chevilles 15min post |
| Samedi | CAP | SL marathon | 2h10 (30km). Premiers 22km @4:30/km, derniers 8km @3:45→3:30/km. Eau + 30g/h |
| Dimanche | CAP | EF + core | 1h Z2 (4:30/km) 14km + gainage 4×45s, dead bug 3×10, pallof 3×12 post |

### Exemple : Molly Seidel — Semaine Build Marathon avec Cross-Training (130km CAP + 2h vélo, 12h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, foam roller, sommeil prioritaire |
| Mardi matin | CAP | Tempo marathon long | 1h40 dont 3×15min @allure marathon (3:35/km) r=3min trot. 24km. Cad 180spm |
| Mardi soir | Renfo | Force + pliométrie | Hip thrust 3×10, squat 3×6 @75%, box jumps 3×8, core 4×45s. 40min |
| Mercredi | CAP | EF récupération | 55min Z1 (5:00/km). Très léger. Respiration nasale possible. 11km |
| Jeudi matin | CAP | Seuil progressif | 1h25 dont 20min @3:35/km + 15min @3:25/km + 10min @3:15/km. Neg split. 20km |
| Jeudi soir | Vélo | Cross-training Z1-Z2 | 1h vélo Z1-Z2 (65% FTP max). Récupération active sans impact. Cadence libre 80-90 |
| Vendredi | CAP | EF + strides | 50min Z2 (4:40/km) + 6×100m accélérations. 12km. Sensation de fraîcheur |
| Samedi | CAP | SL spécifique | 2h15 (32km). Km 1-20 @4:30/km, km 20-28 @3:50/km, km 28-32 @3:35/km. Gut 35g/h |
| Dimanche | Vélo + Renfo | Cross-training + mobilité | Vélo 1h Z1 (récup active, décharger les jambes) + mobilité 20min hanches/chevilles/chaîne post |
⚠️ Cross-training vélo = 2 séances Z1-Z2 uniquement, jamais d'intensité, rôle = récupération active + volume aérobie sans impact

### Exemple : Courtney Dauwalter — Semaine Spécifique Trail Ultra avec Cross-Training (18h, +5000m D+)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, auto-massage, hydratation, sommeil 9h |
| Mardi matin | CAP/Trail | Intervalles montée | 2h dont 6×8min montée @seuil (900m/h D+) r=4min descente facile. +800m D+ |
| Mardi soir | Renfo | Excentrique + core | Squat excentrique 5s 4×8, fentes descente 3×12, step-downs 3×10, planche 4×50s. 45min |
| Mercredi | CAP/Trail | Endurance longue D+ | 4h montagne Z2. +1800m D+. Ravitaillement 50g/h. Pôles optionnels descente technique |
| Jeudi | Vélo | Cross-training récup | 1h15 vélo Z1 (60% FTP). Récupération active. Cadence 80-85. Zéro intensité |
| Vendredi matin | CAP/Trail | Tempo vallonné | 1h30 dont 4×10min @allure tempo trail (-15s/km vs seuil) terrain ondulé. 18km |
| Vendredi soir | Renfo | Proprioception + force | Bosu squats 3×12, single leg deadlift 3×10, jump lunges 3×8, bande hanches 3×15. 35min |
| Samedi | CAP/Trail | Ultra-simulation | 5h Z2 montagne +2000m D+. Ravitaillement complet (solide + liquide 60g/h). Gestion effort descente |
| Dimanche | Vélo + Mobilité | Cross-training + récup | Vélo 1h Z1 plat (récup jambes) + foam roller 20min + étirements 15min |
⚠️ Cross-training vélo en trail = 2 séances Z1 pour récupérer entre les grosses journées montagne sans ajouter d'impact

### Exemple : Semi-Marathon Competitor avec Cross-Training Vélo (75km CAP + 1h30 vélo, 9h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, étirements doux optionnels |
| Mardi | CAP | VMA longue | 15min éch. 5×1000m @VMA (ex: 3:20/km si VMA 18) r=2min trot. 15min RC. 14km, 1h |
| Mercredi matin | CAP | EF endurance | 1h Z2 (4:50/km). 13km. Cadence 178spm. Terrain plat. Aisance |
| Mercredi soir | Renfo | PPG + core | Squats 3×12, fentes latérales 3×10, hip thrust 3×12, gainage 4×40s, pompes 3×15. 40min |
| Jeudi | Vélo | Cross-training Z1-Z2 | 1h vélo Z1-Z2 (max 70% FTP). Récup active sans impact. Alternative si jambes lourdes post-VMA |
| Vendredi | CAP | Tempo allure semi | 1h10 dont 2×15min @allure semi (4:15/km pour 1h30 semi) r=4min trot. 14km |
| Samedi | CAP | SL progressive | 1h40 (18km). Premiers 12km @5:10/km, derniers 6km @4:30→4:10/km. Neg split |
| Dimanche | CAP + Renfo | EF + mobilité | 45min Z2 (5:00/km) 9km + mobilité hanches/chevilles 15min + foam roller 10min |
⚠️ Cross-training vélo semi = 1 séance/sem Z1-Z2 max, rôle = récupérer entre qualité mardi et tempo vendredi

### Exemple : Patrick Lange — Semaine Spécifique IM Age Group Ambitieux (16h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, foam roller, hydratation |
| Mardi matin | Natation | CSS + endurance | 400m éch drill. 8×200m @1:30/100m r=15s. 4×100m bras rattrapé. 200m RC. 3000m ~48min |
| Mardi soir | Vélo | Sweet spot | 1h45 dont 2×15min @87-90% FTP cad 88 r=5min Z2. Terrain plat |
| Mercredi | CAP | EF endurance | 1h10 Z2 (5:15/km). 13km. Cadence 176spm. Conversation possible |
| Jeudi matin | Natation | Technique + vitesse | 300m éch. 8×50m @sprint r=20s. 12×50m catch-up. 200m RC. 2200m |
| Jeudi soir | Vélo | Endurance Z2 Train Low | 1h30 à jeun Z2 (65% FTP). Aucune intensité. Ravitaillement eau uniquement |
| Vendredi | Renfo | Force fonctionnelle | Squat 3×8 @70%, hip thrust 3×10, planche 3×45s, élastiques épaules 3×15. 40min |
| Samedi | Vélo | Sortie longue + Gut Training | 3h30 Z2 vallonné + derniers 45min @75% FTP. Gut training 50g/h glucides. +600m D+ |
| Dimanche | Brique | Vélo→CAP allure IM | Vélo 1h30 @76% FTP + CAP 35min @5:00/km (allure IM). Gut 40g/h. Transition 3min |
⚠️ Age Group IM : max 1 brique/sem. Sortie longue vélo = séance clé #1, brique = séance clé #2. Natation = volume sans stress.

### Exemple : Joshua Kerr — Semaine Spécifique 1500m/Mile (85km, 9h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | CAP | EF récupération | 40min Z1 (4:40/km). Complètement détendu. 9km |
| Mardi matin | CAP | VMA courte | 15min éch. 12×400m @56s (VMA 100%) r=60s trot. 15min RC. 15km total |
| Mardi soir | Renfo | Pliométrie explosive | Drop jumps 4×5, hurdle rebounds 3×8, medball slam 3×10, band sprints 3×30m. 30min |
| Mercredi | CAP | EF endurance | 1h20 Z2 (4:00/km). 20km. Terrain plat. Cad 188spm |
| Jeudi | CAP | Vitesse spécifique | 10min éch. 3×(600m @1:28 + 200m @26s) r=4min. 10min RC. 12km total. Effort maximal |
| Vendredi | CAP | EF légère + drills | 35min Z1 (4:30/km) + drills techniques (A-skip, B-skip, butt kicks) 10min. 9km |
| Samedi | CAP | SL tempo | 1h30 (22km). Km 1-15 @4:05/km Z2, derniers 7km @3:30→3:15/km. Finir fort |
| Dimanche | CAP | EF + strides | 50min Z2 (4:10/km) + 8×150m accélérations progressives 80%→95%. 14km |
⚠️ Demi-fond 1500 : VLamax naturellement élevée (>0.50). Vitesse pure + puissance anaérobie = clés. Volume modéré, qualité maximale.

### Exemple : Daniela Ryf — Semaine Build 70.3 Competitor (14h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, mobilité 20min, sommeil |
| Mardi matin | Natation | Seuil CSS | 400m éch. 5×300m @1:25/100m r=15s. 200m RC. 2600m ~40min |
| Mardi soir | Vélo | Seuil intervalles | 1h30 dont 3×12min @90% FTP r=4min Z2. Terrain plat, cad 90 |
| Mercredi | CAP | Tempo allure 70.3 | 1h10 dont 2×12min @allure 70.3 (4:20/km) r=3min trot. 14km |
| Jeudi matin | Natation | Technique + aérobie | 300m éch drill. 2000m pull @1:32/100m Z2. 6×50m sprint r=15s. 200m RC. 2800m |
| Jeudi soir | Renfo | Core + prévention | Gainage 3×50s, dead bug 3×12, pallof press 3×10, single leg glute bridge 3×12. 35min |
| Vendredi | CAP | EF récupération | 45min Z1 (5:20/km). Jambes légères. 9km |
| Samedi | Vélo | Sortie longue vallonnée | 3h Z2 (65-72% FTP) terrain vallonné +500m D+. Ravitaillement 40g/h. Dernier 30min @78% FTP |
| Dimanche | Brique | Vélo→CAP simulation | Vélo 1h30 @80% FTP + CAP 25min @4:15/km enchaîné. Gut 50g/h. Focus transition |
⚠️ Competitor 70.3 : 2-3 doubles/sem max. Natation = maintien, vélo = progression, CAP = limiter les sorties longues pour rester frais.

### Exemple : Eliud Kipchoge — Semaine Taper Marathon (-40% volume, 100km)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Sommeil, massage, préparation mentale |
| Mardi | CAP | Rappel allure marathon | 50min dont 3×8min @allure marathon (2:55/km) r=3min trot. 14km |
| Mercredi | CAP | EF légère | 45min Z1 (4:30/km). Très facile. Sensation de fraîcheur. 10km |
| Jeudi | CAP | Rappel VMA court | 30min éch + 4×1min @VMA (2:35/km) r=2min trot + 15min RC. 12km |
| Vendredi | CAP | EF récupération | 35min Z1 (4:40/km). Minimaliste. 8km |
| Samedi | CAP | Activation pré-course | 25min Z2 + 4×100m strides @allure 10K + 10min RC. 8km. Tenue de course si possible |
| Dimanche | Course | Jour J | COURSE OBJECTIF. Exécuter le plan de pacing. Discipline > courage |
⚠️ Taper : -40% volume semaine 1, -60% semaine 2. Intensité = rappels courts UNIQUEMENT. Aucune séance longue. Aucune nouvelle charge. Sommeil + nutrition = priorité.

### Exemple : Jim Walmsley — Semaine Base Trail Court/Montagne (14h, 90km, +3500m D+)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, auto-massage, planification semaine |
| Mardi matin | CAP/Trail | Côtes VMA | 1h30 dont 8×3min côte 10% @VO2max r=descente trot. +600m D+. 15km |
| Mardi soir | Renfo | Force endurance | Squat 3×10 @65%, step-ups lestés 3×12, fentes marchées 3×20, gainage 4×45s. 40min |
| Mercredi | CAP/Trail | Endurance sentier | 2h Z2 sentier technique mixte. +700m D+. Cad adaptée terrain. Ravitaillement 40g/h. 20km |
| Jeudi | CAP | EF récupération plat | 50min Z1 (5:00/km) sur route plate. Récup active. 10km |
| Vendredi matin | CAP/Trail | Tempo descente + montée | 1h40 dont 4×(5min montée @seuil + 5min descente technique rapide). +500m D+. 16km |
| Vendredi soir | Renfo | Proprioception + mobilité | Bosu 3×30s, single leg squat 3×8, bande hanches 3×15, foam roller 20min, étirements. 35min |
| Samedi | CAP/Trail | Sortie longue montagne | 3h30 Z2 montagne +1500m D+. Terrain varié. Ravitaillement complet 50g/h. Pôles descente |
| Dimanche | CAP | EF légère + core | 40min Z1 plat (5:10/km) + core 15min (dead bug, bird dog, planche latérale). 8km |
⚠️ Trail court : moins de volume qu'ultra mais plus d'intensité spécifique en côte. Descente = compétence technique à travailler. Ratio montée/descente ~50/50 dans les séances clés.

### Exemple : Laura Philipp — Semaine Base IM Femme Élite (20h, Reverse Periodization Lorang)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, massage, sommeil 9h |
| Mardi matin | Natation | Seuil CSS | 500m éch drill. 6×300m @1:18/100m r=15s. 200m RC. 3500m ~52min |
| Mardi midi | Vélo | VO2max courte (Reverse Perio) | 1h30 dont 6×3min @110% FTP r=3min Z1. Cad 95-100. L'intensité en base = principe Lorang |
| Mardi soir | Renfo | Force max | Squat 4×5 @80%, hip thrust 3×8, deadlift 3×5, core anti-rotation 3×10. 45min |
| Mercredi matin | CAP | EF endurance vallonnée | 1h15 Z2 (4:40/km), +150m D+. 16km. Cad 180spm |
| Mercredi soir | Natation | Technique pure | 2000m drill focus (sculling, fingertip, catch-up, 6-kick). Aucune intensité. 35min |
| Jeudi matin | Vélo | Endurance Z2 Train Low | 2h30 à jeun Z2 (60-68% FTP). Aucun glucide avant 2h. Eau+sel uniquement |
| Jeudi soir | CAP | EF récupération | 40min Z1 (5:10/km). Ultra-léger. 8km |
| Vendredi matin | Natation | OWS + navigation | 3000m OWS : échauffement plage 400m + 4×600m @allure course (1:22/100m) + navigation bouée |
| Vendredi soir | Renfo | Core + prévention | Gainage 4×60s, pallof press 3×12, band walks 3×15, mobilité épaules 10min. 35min |
| Samedi | Vélo | Sortie longue progressive | 4h Z2 + dernière 1h sweet spot @88% FTP. Train Low premier 2h, Gut Training 50g/h dernières 2h |
| Dimanche | Brique | Vélo Z2→CAP tempo | Vélo 2h @72% FTP (récup) + CAP 40min dont 20min @allure IM (4:05/km). Gut 45g/h |
⚠️ Reverse Periodization (Lorang) : en phase Base, inclure de l'intensité courte vélo (VO2max) dès le début. Le volume long vient en Build/Spécifique. Contre-intuitif mais prouvé par Lorang.

### Exemple : Galen Rupp — Semaine Build 10K Age Group Ambitieux (70km, 7h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, étirements optionnels |
| Mardi | CAP | VMA intermittente | 15min éch Z2. 3×(8×30s @VMA / 30s trot). r=3min entre séries. 12min RC. 13km total, 1h |
| Mercredi | CAP | EF endurance | 55min Z2 (5:00/km). 11km. Cad 176spm. Plat, aisance respiratoire |
| Jeudi | CAP | Tempo seuil | 1h dont 20min @allure seuil (4:00/km si VMA 17). r=4min trot. 2e série 15min. 13km |
| Vendredi | Renfo | PPG + core | Squats 3×12, fentes avant 3×10, hip thrust 3×12, gainage 3×45s, mountain climbers 3×20. 35min |
| Samedi | CAP | SL progressive | 1h25 (16km). Km 1-10 @5:20/km, km 10-14 @4:40/km, km 14-16 @4:10/km. Neg split |
| Dimanche | CAP | EF + strides | 45min Z2 (5:10/km) + 6×100m accélérations 80%→95%. 10km. Finir frais |
⚠️ 10K Age Group : 4-5 séances/sem, 1 VMA + 1 seuil + 1 SL = les 3 piliers. Repos > volume pour ce niveau.

### Exemple : Gustav Iden — Semaine Spécifique 70.3 Élite (20h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, compression, nutrition optimisée |
| Mardi matin | Natation | Race-pace blocs | 400m éch. 3×800m @1:10/100m (allure course 70.3) r=30s. 200m RC. 3600m ~48min |
| Mardi midi | Vélo | VO2max→Sweet Spot combo | 2h dont 4×4min @115% FTP r=3min + 2×15min @90% FTP r=5min. Cad 92 |
| Mardi soir | CAP | EF + technique | 45min Z2 (3:50/km) + 6×100m strides. 12km. Léger |
| Mercredi matin | Vélo | Endurance longue vallonnée | 3h Z2 (65-72% FTP) terrain vallonné +800m D+. Ravitaillement 50g/h |
| Mercredi soir | Natation | Pull endurance | Pull buoy 3000m @1:20/100m Z2. Focus rotation + glisse. 40min |
| Jeudi matin | CAP | Seuil allure 70.3 | 1h20 dont 4×10min @allure 70.3 (3:30/km) r=2min30 trot. 18km. Cad 186spm |
| Jeudi soir | Renfo | Force + stabilité | Squat 3×6 @78%, Bulgarian split 3×8, deadlift 3×5, anti-rotation core 3×12. 45min |
| Vendredi matin | Natation | Seuil pyramide | 400m éch. 100-200-300-400-300-200-100 @1:08-1:14/100m r=15s. 200m RC. 2600m |
| Vendredi soir | Vélo | Z2 récupération | 1h15 Z2 léger (60% FTP). Jambes fraîches pour samedi. Cad libre |
| Samedi | Brique | Simulation 70.3 complète | Nat 1900m OWS @race-pace + Vélo 2h @85% FTP + CAP 30min @3:35/km. Gut 75g/h. Full simulation |
| Dimanche | CAP | EF récupération | 1h Z1 (4:20/km). 14km. Digestion de la brique. Mobilité post 15min |
⚠️ Iden : densité extrême mardi (3 séances). Simulation complète samedi avec OWS = modèle réservé élite. Jamais reproduire tel quel en Age Group.

### Exemple : Kelvin Kiptum — Semaine Peak Marathon (200km, 16h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | CAP | EF récupération | 1h Z1 (4:50/km). Totalement relâché. 12km. Préparation mentale |
| Mardi matin | CAP | Tempo marathon long | 1h50 dont 40min continu @allure marathon (2:50/km) + 2×10min @2:45/km. 30km total |
| Mardi soir | Renfo | Pliométrie légère | Box jumps 3×6, bounds 3×8, single leg hops 3×10, core 4×40s. 30min |
| Mercredi matin | CAP | EF endurance | 1h30 Z2 (3:50/km). 24km. Terrain plat. Cad 188spm |
| Mercredi soir | CAP | Récup active | 30min Z1 (4:30/km). 7km. Shake-out |
| Jeudi | CAP | Fartlek progressif | 1h40 dont 8×(3min @90% VMA + 2min trot). Derniers 4km progressif libre. 24km |
| Vendredi | CAP | EF récupération | 50min Z1 (4:40/km). Sensation fraîche. 11km |
| Samedi | CAP | SL simulation marathon | 38km dont km 1-25 @3:30/km, km 25-35 @2:55/km, km 35-38 @2:45/km. Neg split extrême. Gut 50g/h |
| Dimanche matin | CAP | EF + core | 1h10 Z2 (4:00/km) 18km + core post 15min (gainage, crunches, russian twist) |
| Dimanche soir | CAP | Shake-out | 25min Z1 très léger. 5km. Digestion de la SL. Récupération complète |
⚠️ 200km/sem = niveau Kiptum/Kipchoge uniquement. Jamais prescrire ce volume sauf profil élite confirmé avec historique CTL > 120.

### Exemple : Méthode Norvégienne — Semaine Double Seuil Semi-Marathon Élite (100km, 10h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, sommeil 9h, mobilité passive |
| Mardi matin | CAP | 🔑 Double Seuil #1 — Seuil Bas | 15min éch. 5×6min @seuil bas (3:25/km, ~2.0-2.5 mmol/L lactate, RPE 7/10) r=1min trot. 15min RC. 18km |
| Mardi soir | CAP | 🔑 Double Seuil #1 — Seuil Haut | 10min éch. 8×1000m @seuil haut (3:15/km, ~3.5 mmol/L, RPE 8/10) r=1min trot. 10min RC. 16km |
| Mercredi | CAP | EF endurance | 1h20 Z2 (4:15/km). 19km. Terrain plat. Cad 182spm. Récupération du double seuil |
| Jeudi matin | CAP | 🔑 Double Seuil #2 — Seuil Bas | 15min éch. 4×2000m @3:25/km (seuil bas) r=1min30 trot. 15min RC. 18km |
| Jeudi soir | CAP | 🔑 Double Seuil #2 — Seuil Haut | 10min éch. 6×1200m @3:15/km (seuil haut) r=1min trot. 10min RC. 16km |
| Vendredi | CAP | EF récupération | 45min Z1 (4:45/km). 10km. Ultra-léger. Shake-out |
| Samedi | CAP | SL progressive | 1h45 (22km). Km 1-15 @4:15/km Z2, km 15-20 @3:35/km tempo, km 20-22 @3:15/km seuil. Neg split |
| Dimanche | CAP + Renfo | EF + force Rønnestad | 55min Z2 (4:20/km) 13km + Squat 3×4 @85%, hip thrust 3×8, single leg 3×6. 40min total renfo |
⚠️ Méthode norvégienne : 2 doubles seuil/sem = 50min @seuil effectif. JAMAIS dépasser le lactate cible (utiliser FC 85-88% FCmax si pas de lactate). Si RPE >8.5/10 → ralentir. Toujours 48h entre deux doubles.

### Exemple : Méthode Canova — Semaine Special Block Marathon Élite (150km, 13h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | CAP | EF récupération | 50min Z1 (4:40/km). 11km. Relâchement total. Préparation mentale bloc mardi |
| Mardi matin | CAP | 🔑 Bloc Spécifique — Fast Continuous Run | 1h30 dont 15km continu @allure marathon -10s/km (2:45/km). Rythme soutenu mais contrôlé. 22km total |
| Mardi soir | CAP | 🔑 Bloc Spécifique — Progressive Run | 1h10 dont 12km avec derniers 5km progressif 3:15→2:55/km. Finir @allure marathon pile. 16km |
| Mercredi | CAP | EF longue récupération | 1h30 Z2 (4:10/km). 22km. Digestion du bloc. Hydratation ++. Aucune intensité |
| Jeudi | CAP | Fartlek Canova | 1h20 alternance : 6×(2km @allure marathon 2:55/km + 1km @allure semi 2:45/km). Total 18km spécifique |
| Vendredi | CAP | EF récupération | 40min Z1 (4:50/km). 8km. Jambes fraîches |
| Samedi | CAP | 🔑 SL Canova Progressive | 32km : km 1-20 @3:40/km, km 20-27 @3:05/km, km 27-32 @2:55/km (allure marathon). Neg split brutal. Gut 40g/h |
| Dimanche matin | CAP | EF + strides | 55min Z2 (4:15/km) + 8×100m accélérations. 14km |
| Dimanche soir | Renfo | Force Rønnestad maintien | Squat 2×4 @85%, deadlift 2×5 @80%, core 3×45s. 30min. Maintien force acquise |
⚠️ Canova Special Block : mardi = journée bloc avec 2 séances spécifiques (30km+ @allure proche marathon en 1 jour). Ce stress concentré force l'adaptation. Jamais 2 journées bloc dans la même semaine. 48h récup minimum après.

### Exemple : Méthode Billat — Semaine Bloc VO2max 10K (80km, 8h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, mobilité, foam roller |
| Mardi | CAP | 🔑 Billat 30/30 | 15min éch. 3 séries de (10×30s @VMA / 30s arrêt complet). r=4min trot entre séries. 15min RC. 14km, 1h |
| Mercredi | CAP | EF endurance | 1h Z2 (4:40/km). 13km. Récupération. Cad 178spm |
| Jeudi | CAP | 🔑 Billat 3min/3min | 15min éch. 5×3min @100-105% VMA (3:10/km) r=3min trot. 15min RC. 15km, 1h10 |
| Vendredi | CAP + Renfo | EF + pliométrie Rønnestad | 40min Z1 (5:00/km) 8km + Drop jumps 3×5, box jumps 3×8, bounds 3×8, core 4×40s. 30min |
| Samedi | CAP | SL progressive | 1h30 (18km). Km 1-12 @4:50/km, km 12-16 @4:10/km, km 16-18 @3:40/km |
| Dimanche | CAP | EF + strides | 50min Z2 (4:30/km) + 6×150m accélérations progressives. 12km |
⚠️ Bloc Billat : 2 séances VO2max/sem pendant 3-4 sem max (bloc concentré). Temps total @VO2max effectif = 20-25min/sem. Au-delà de 4 sem → basculer vers seuil ou spécifique.

### Exemple : Emile Cairess / Canova — Semaine Spécifique Marathon Modern Elite (160km, 14h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | CAP | EF récupération | 55min Z1 (4:50/km). 12km. Récupération mentale et physique |
| Mardi matin | CAP | 🔑 Variation of Pace (Canova) | 1h50 : alternance 3km @allure marathon (2:58/km) + 1km @allure semi (2:48/km) ×4, puis 5km cool-down. 25km total |
| Mardi soir | Renfo | Force endurance | Hip thrust 3×10, squat 3×6 @75%, lunges 3×8, core anti-rotation 3×12. 35min |
| Mercredi matin | CAP | EF longue | 1h35 Z2 (4:05/km). 24km. Terrain légèrement vallonné. Cad 184spm |
| Mercredi soir | CAP | Shake-out | 30min Z1 (4:35/km). 7km. Relâchement |
| Jeudi | CAP | 🔑 Medium Long + Fast Finish | 1h40 (24km). Km 1-18 @4:00/km, km 18-22 @3:10/km (allure semi), km 22-24 @2:55/km (allure marathon). Sensation forte mais contrôlée |
| Vendredi | CAP | EF récupération | 45min Z1 (4:45/km). 10km. Jambes fraîches pour samedi |
| Samedi | CAP | 🔑 SL marathon simulation Canova | 35km : km 1-22 @3:45/km EF haut, km 22-30 @3:05/km tempo, km 30-35 @2:58/km allure marathon. Gut 45g/h. Simulation mentale. Neg split |
| Dimanche matin | CAP | EF + core | 1h10 Z2 (4:10/km). 17km + core post 15min |
| Dimanche soir | CAP | Shake-out | 20min Z1 (4:50/km). 4km. Digestion |
⚠️ Cairess/Canova moderne : la "Variation of Pace" est la séance signature — alterner allure marathon et allure semi dans la même séance développe la capacité à changer de rythme et à résister à la fatigue spécifique. Volume total @allure spécifique dans cette semaine : ~25km.

### Exemple : Start to Run — Semaine Type Débutant Absolu (3h, 12km course + marche)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, hydratation, sommeil 8h minimum |
| Mardi | CAP | Marche/Course alternée | 30min total : 5×(3min marche rapide + 3min course Z1 à 6:30-7:00/km). Cad 170spm. Respiration aisée |
| Mercredi | Renfo | PPG débutant | Squats au poids du corps 3×10, fentes avant 2×8, gainage 3×20s, chaise murale 3×20s, étirements 10min. 25min |
| Jeudi | Repos | Repos complet | Pas de course 2 jours consécutifs. Marche douce 20min optionnelle |
| Vendredi | CAP | Marche/Course progression | 30min total : 4×(2min marche + 4min course Z1 à 6:15-6:45/km). Légèrement plus de course que mardi |
| Samedi | Mobilité | Mobilité + étirements | Foam roller 15min, mobilité hanches/chevilles, étirements actifs chaîne postérieure. 25min |
| Dimanche | CAP | Sortie longue douce | 35min marche/course : 3×(3min marche + 5min course Z1 à 6:30/km). Terrain plat. Finir en pouvant parler |
⚠️ Start to Run : JAMAIS de fractionné avant 30min de course continue sans pause. Max 3 séances CAP/sem, jamais consécutives. Renfo/mobilité = 30-40% du volume total. Progression = +5min course/sem max.

### Exemple : Ironman Finisher — Semaine Build (10h, Volume Minimal Sécuritaire)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, hydratation, sommeil 8h. Foam roller optionnel |
| Mardi matin | Natation | Endurance technique | 400m éch drill (rattrapé, 6-kick). 1500m continu @1:50/100m Z2. 200m RC. 2100m ~45min |
| Mardi soir | Renfo | PPG fonctionnel | Squats 3×10, fentes 2×10, gainage 3×30s, pompes 2×12, band walks 2×15. 30min |
| Mercredi | Vélo | Endurance Z2 | 1h30 Z2 (60-68% FTP). Terrain plat. Cad 80-85. Conversation possible tout du long |
| Jeudi | CAP | EF endurance | 45min Z2 (5:45/km). 8km. Cad 172spm. Terrain plat, aisance totale |
| Vendredi | Repos | Repos complet | Récupération. Marche 20min optionnelle |
| Samedi | Vélo | Sortie longue douce | 2h30 Z2 plat (62% FTP). Gut training 30g/h (barres + boisson). Dernière 30min @70% FTP |
| Dimanche | Brique douce | Vélo→CAP enchaînement | Vélo 1h Z2 (65% FTP) + CAP 20min Z2 (5:30/km). Transition 5min. Gut 25g/h. Focus sensation enchaînement |
⚠️ Finisher IM : 1 séance/jour MAX. Zéro double. 2 repos/sem minimum. Aucune intensité Z4+. SL vélo = séance clé unique. Natation = technique + confiance eau libre.

### Exemple : Sifan Hassan — Semaine Spécifique Semi-Marathon Femme Élite (120km, 12h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | CAP | EF récupération | 50min Z1 (4:40/km). 11km. Relâchement total. Cad 184spm |
| Mardi matin | CAP | Seuil long continu | 1h40 dont 30min continu @3:15/km (seuil, 88% VMA) + 20min @3:25/km. 24km total |
| Mardi soir | Renfo | Pliométrie + hip stability | Hurdle hops 3×6, single leg bounds 3×8, hip thrust 3×12, band walks 3×15, core 4×40s. 35min |
| Mercredi | CAP | EF longue vallonnée | 1h35 Z2 (4:10/km), collines +200m D+. 23km. Cad 186spm. Effort régulier |
| Jeudi matin | CAP | VMA spécifique semi | 15min éch. 4×2000m @3:00/km (95% VMA) r=2min trot. 15min RC. 20km |
| Jeudi soir | CAP | Shake-out | 25min Z1 (4:45/km). 6km. Récup active |
| Vendredi | CAP | EF récupération | 40min Z1 (4:50/km). Ultra-léger. 8km |
| Samedi | CAP | SL simulation semi | 24km dont km 1-16 @4:00/km, km 16-21 @3:20/km, km 21-24 @3:10/km. Neg split agressif. Gut 30g/h |
| Dimanche | CAP | EF + strides | 1h Z2 (4:15/km) + 8×150m accélérations progressives. 15km. Mobilité post 10min |
⚠️ Hassan/semi élite femme : seuil continu long (30min+) comme séance clé #1, SL avec finish rapide = clé #2. Volume total 120-140km mais qualité > quantité.

### Exemple : Jakob Ingebrigtsen — Semaine Spécifique 5K (110km, 10h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, sommeil 9h, visualisation |
| Mardi matin | CAP | VMA 5K pace | 15min éch. 5×1000m @2:48/km (allure 5K, 97% VMA) r=90s trot. 15min RC. 16km |
| Mardi soir | Renfo | Explosivité | Drop jumps 4×5, squat sauté 3×8, medball throw 3×10, band sprints 3×30m, core 10min. 30min |
| Mercredi | CAP | EF endurance | 1h20 Z2 (3:55/km). 21km. Terrain plat. Cad 190spm |
| Jeudi | CAP | Seuil + lactate tolerance | 1h15 dont 20min @seuil (3:10/km) + 4×400m @2:35/km (110% VMA) r=90s. 18km |
| Vendredi | CAP | EF récupération | 45min Z1 (4:25/km). 10km. Totalement relâché |
| Samedi | CAP | SL avec finish 5K | 1h40 (25km). Km 1-18 @4:00/km Z2, km 18-23 @3:20/km tempo, km 23-25 @2:50/km (allure 5K). Simulation fin de course |
| Dimanche | CAP | EF double + drills | 55min Z2 (4:10/km) 14km + drills techniques 10min (A-skip, high knees, butt kicks) + strides 4×80m |
⚠️ 5K spécifique : combo seuil + lactate tolerance dans la même séance = modèle norvégien adapté. La SL n'est pas longue en durée mais le finish @allure 5K est la clé.

### Exemple : Marathon Age Group — Semaine Build (65km, 7h30)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, étirements doux, foam roller optionnel |
| Mardi | CAP | Tempo marathon | 1h dont 2×12min @allure marathon estimée (5:00/km pour sub-3h30) r=4min trot. 12km |
| Mercredi | Renfo | PPG + core | Squats 3×12, fentes 3×10, hip thrust 3×12, gainage 3×40s, superman 3×12, pompes 3×12. 35min |
| Jeudi | CAP | EF endurance | 55min Z2 (5:20/km). 10km. Cad 175spm. Plat. Aisance respiratoire |
| Vendredi | CAP | Seuil court | 50min dont 15min @seuil (4:35/km si VMA 15) + 10min @seuil. r=4min trot entre. 10km |
| Samedi | CAP | SL progressive | 1h50 (20km). Km 1-14 @5:40/km, km 14-18 @5:10/km, km 18-20 @4:50/km. Ravitaillement 25g/h |
| Dimanche | CAP | EF + mobilité | 40min Z2 (5:30/km) 7km + mobilité hanches/chevilles 15min + foam roller 10min |
⚠️ Marathon Age Group : 5 séances max. SL = séance clé #1 (augmenter 1-2km/sem). Tempo = clé #2 (augmenter durée des blocs, pas l'allure). Jamais de SL >30km pour ce niveau.

### Exemple : Anne Haug — Semaine Décharge 70.3 (-35% volume, 10h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, massage, compression |
| Mardi matin | Natation | Rappel CSS court | 400m éch. 4×200m @1:16/100m r=20s. 200m RC. 1800m ~30min. Sensation de vitesse sans fatigue |
| Mardi soir | Vélo | Rappel sweet spot | 1h dont 2×8min @88% FTP r=5min Z2. Cad 90. Le reste en Z2 léger |
| Mercredi | CAP | EF + rappel allure | 50min dont 40min Z2 (4:30/km) + 2×3min @allure 70.3 (3:50/km). 11km. Maintenir la vitesse |
| Jeudi matin | Natation | Technique + OWS court | 1500m : 500m drill + 2×400m @race-pace OWS. 25min. Confiance |
| Jeudi soir | Renfo | Activation légère | Gainage 3×30s, élastiques hanches 2×12, mobilité épaules 10min. 20min max. Aucune charge lourde |
| Vendredi | Repos | Repos complet | Préparation matériel, nutrition, visualisation. Zéro charge |
| Samedi | Brique courte | Activation pré-course | Vélo 40min Z2 + 15min CAP Z2 (4:20/km). Enchaînement rapide. Gut test final 50g/h. 1h totale |
| Dimanche | Course | Jour J 70.3 | Exécuter le plan de pacing. Discipline > ambition. Gut training rodé |
⚠️ Décharge : -35% volume, aucune séance longue, rappels d'intensité courts (2-3×3-8min). Zéro nouvelle charge. Sommeil + nutrition = 80% de la performance du jour J.

### Exemple : François D'Haene — Semaine Spécifique UTMB/Ultra Trail (22h, 130km, +6000m D+)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, auto-massage, compression, sommeil 9h minimum |
| Mardi matin | CAP/Trail | Seuil montée long | 2h30 dont 3×20min montée @seuil (950m/h D+) pente 12-15% r=8min descente. +1200m D+ |
| Mardi soir | Renfo | Excentrique lourd | Squat excentrique 6s 4×6, step-downs 3×10, Nordic hamstrings 3×5, core 4×50s. 50min |
| Mercredi | CAP/Trail | Endurance technique | 3h sentier technique mixte Z2. +800m D+. Descente technique rapide. Pôles optionnels. Ravitaillement 45g/h |
| Jeudi matin | CAP | EF récupération plat | 45min Z1 (5:15/km). Terrain plat, route. Récup active. 9km |
| Jeudi soir | Renfo | Proprioception avancée | Bosu yeux fermés 3×30s, pistol progressions 3×5, single leg hop stabilisation 3×8, bande hanches 3×15. 35min |
| Vendredi | CAP/Trail | VMA côtes + descente technique | 1h45 dont 8×2min30 côte raide @VO2max r=descente trot + 6×3min descente technique @85% vitesse max. +700m D+ |
| Samedi | CAP/Trail | Ultra-simulation montagne | 7h Z2 montagne alpine +3000m D+. Ravitaillement complet (solide+liquide 60g/h). Simulation nuit si possible (départ 5h). Gestion fatigue mentale |
| Dimanche | Vélo + Mobilité | Récupération active | Vélo 1h15 Z1 plat (55% FTP max). Aucun impact. Foam roller 20min. Étirements 15min. Compression toute la journée |
⚠️ Ultra UTMB : SL 7h = simulation non-négociable en phase spécifique. Inclure 1 simulation nuit. Excentrique = prévention #1 pour descente. Cross-training vélo uniquement en récupération.

### Exemple : 5K Age Group — Semaine Build (40km, 5h30)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, foam roller optionnel |
| Mardi | CAP | 🔑 VMA courte Billat | 15min éch. 2 séries de (8×30s @VMA / 30s trot). r=4min entre séries. 10min RC. 9km, 48min |
| Mercredi | Renfo | PPG + pliométrie légère | Squats 3×12, fentes 3×10, box jumps 3×6, gainage 3×35s, pompes 3×12, corde à sauter 3×30s. 35min |
| Jeudi | CAP | EF endurance | 45min Z2 (5:20/km). 8.5km. Cad 176spm. Terrain plat. Conversation possible |
| Vendredi | CAP | 🔑 Seuil tempo | 50min dont 2×10min @seuil (4:30/km si VMA 14) r=3min trot. 9km |
| Samedi | CAP | SL progressive | 1h10 (12km). Km 1-8 @5:50/km, km 8-11 @5:10/km, km 11-12 @4:45/km |
| Dimanche | Mobilité | Mobilité + étirements | Foam roller 15min, mobilité hanches/chevilles, étirements actifs. 25min |
⚠️ 5K Age Group : 4 CAP/sem max. SL modérée (12-14km). VMA = séance clé #1, seuil = clé #2. Pliométrie légère pour économie. Pas de double séance.

### Exemple : 10K Finisher — Semaine Build (30km, 4h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, hydratation |
| Mardi | CAP | EF endurance | 40min Z2 (6:00/km). 7km. Cadence 172spm. Aisance respiratoire totale |
| Mercredi | Renfo | PPG débutant+ | Squats 3×12, fentes 2×10, gainage 3×30s, chaise 3×25s, superman 2×10. 30min |
| Jeudi | CAP | Tempo léger | 35min dont 2×8min @tempo (5:20/km) r=3min marche. 6km |
| Vendredi | Repos | Repos complet | Repos ou marche 20min |
| Samedi | CAP | SL douce | 55min Z2 (5:50/km). 9.5km. Terrain plat. Respiration nasale quand possible |
| Dimanche | Mobilité | Étirements + foam roller | Foam roller 10min, étirements 15min. Détente |
⚠️ 10K Finisher : 3 CAP/sem max. Aucune VMA. Tempo léger = seule intensité. SL = clé unique. Objectif = terminer confortablement.

### Exemple : Marathon Finisher — Semaine Build (40km, 5h30)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, sommeil 8h+, hydratation |
| Mardi | CAP | EF endurance | 50min Z2 (5:50/km). 8.5km. Cadence 172spm. Tout à Z2, rien au-dessus |
| Mercredi | Renfo | PPG + core | Squats 3×12, fentes 3×10, gainage 3×35s, hip thrust 3×12, superman 3×10. 35min |
| Jeudi | CAP | Tempo léger marathon | 45min dont 15min @allure marathon estimée (5:40/km pour sub-4h) r= 5min marche. 8km |
| Vendredi | Repos | Repos complet | Repos ou marche 20min |
| Samedi | CAP | 🔑 SL progressive | 1h40 (16km). Km 1-12 @6:10/km, km 12-16 @5:40/km. Ravitaillement testé 20g/h |
| Dimanche | CAP | EF récupération | 30min Z1 très léger (6:15/km). 5km. Relâchement total |
⚠️ Marathon Finisher : SL = seule vraie séance clé. Augmenter +1-2km/sem jusqu'à 28-30km max. Aucune VMA. Tempo marathon léger 1x/sem. Gut Training en SL dès sem 4. Objectif = terminer sans marcher.

### Exemple : Semi-Marathon Élite Homme (Joshua Cheptegei style) — Semaine Spécifique (110km, 11h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | CAP | EF récupération | 50min Z1 (4:35/km). 11km. Relâchement complet |
| Mardi matin | CAP | 🔑 Double Seuil Norvégien — Seuil Bas | 15min éch. 4×2km @3:20/km (seuil bas, RPE 7/10) r=1min30 trot. 15min RC. 19km |
| Mardi soir | CAP | 🔑 Double Seuil Norvégien — Seuil Haut | 10min éch. 6×1200m @3:10/km (seuil haut, RPE 8/10) r=1min trot. 10min RC. 15km |
| Mercredi | CAP | EF longue | 1h25 Z2 (4:05/km). 21km. Terrain plat. Récup double seuil |
| Jeudi | CAP | 🔑 Allure semi blocs | 1h20 dont 3×3km @allure semi (3:00/km) r=2min trot. 19km. Cad 188spm |
| Vendredi | CAP | EF récupération | 40min Z1 (4:40/km). 9km. Jambes fraîches |
| Samedi | CAP | SL simulation semi | 22km dont km 1-14 @4:00/km, km 14-19 @3:15/km tempo, km 19-22 @3:00/km (allure semi). Neg split |
| Dimanche | CAP + Renfo | EF + force Rønnestad maintien | 55min Z2 (4:10/km) 13km + Squat 2×4 @85%, hip thrust 3×8, core 3×45s. 35min |
⚠️ Semi élite homme : double seuil norvégien = séance clé #1 (50min+ @seuil effectif). Allure semi = séance signature #2. SL avec finish = clé #3. Volume seuil hebdo = 50-60min pour élite.

### Exemple : 70.3 Age Group Ambitieux — Semaine Build (12h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, foam roller |
| Mardi matin | Natation | Endurance + technique | 400m éch drill. 1500m continu @1:40/100m Z2. 4×100m sprint r=20s. 200m RC. 2600m ~45min |
| Mardi soir | Vélo | 🔑 Sweet spot | 1h30 dont 2×15min @88% FTP cad 88 r=5min Z2. Terrain plat |
| Mercredi | CAP | EF endurance | 55min Z2 (5:10/km). 11km. Cad 176spm. Aisance |
| Jeudi matin | Natation | CSS blocs | 300m éch. 6×200m @CSS r=15s. 200m RC. 2300m. 38min |
| Jeudi soir | Renfo | Force + core | Squat 3×8 @70%, fentes 3×10, hip thrust 3×10, gainage 3×40s. 35min |
| Vendredi | CAP | 🔑 Tempo allure 70.3 | 55min dont 2×12min @allure 70.3 (4:40/km) r=3min trot. 10km |
| Samedi | Vélo | 🔑 SL endurance + Gut | 2h30 Z2 (65% FTP). Gut training 40g/h. Dernière 30min @72% FTP |
| Dimanche | Brique douce | Vélo→CAP | Vélo 1h Z2 (65% FTP) + CAP 20min Z2 (5:00/km). Transition 3min. Gut 30g/h |
⚠️ 70.3 Age Group : doubles limités à 2-3 jours/sem (nat matin + vélo/renfo soir). 1 brique/sem en phase build. SL vélo = séance clé #1. Pas de triples.

### Exemple : IM Competitor — Semaine Spécifique (18h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, massage, foam roller |
| Mardi matin | Natation | 🔑 CSS Race-Pace | 400m éch. 5×400m @1:25/100m (race-pace) r=15s. 200m RC. 3100m ~50min |
| Mardi soir | Vélo | Sweet spot | 1h45 dont 2×20min @88-90% FTP cad 90 r=5min Z2 |
| Mercredi matin | CAP | 🔑 Tempo allure IM | 1h10 dont 3×12min @allure IM (4:20/km, 82% VMA) r=3min trot. 14km |
| Mercredi soir | Renfo | Force fonctionnelle | Squat 3×6 @75%, deadlift 3×5, hip thrust 3×10, core 4×45s. 40min |
| Jeudi matin | Natation | Technique + OWS | 2500m : 500m drill + 2×800m OWS simulation. 42min |
| Jeudi soir | Vélo | Endurance Z2 Train Low | 1h45 à jeun Z2 (65% FTP). Aucune intensité |
| Vendredi | CAP | EF + strides | 50min Z2 (4:40/km) + 6×100m accélérations. 11km |
| Samedi | Vélo | 🔑 SL longue + Gut Training | 4h Z2 vallonné (65-72% FTP). Gut 55g/h. Dernière 1h @73% FTP |
| Samedi soir | Renfo | Core + prévention | Gainage 3×50s, pallof 3×12, étirements 15min. 25min |
| Dimanche | Brique | 🔑 Vélo→CAP Race-Pace | Vélo 2h @76% FTP + CAP 35min @4:25/km. Gut 45g/h. Transition <3min |
⚠️ IM Competitor : 12-14 séances/sem, 5-6 doubles. Nat 3-4x, Vélo 3-4x, CAP 3x, Renfo 2x. Pas de triples. Briques 1-2x/sem en spécifique.

### Exemple : Race Week Marathon — Semaine Taper J-7 (35km, 4h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération totale. Début carb loading J-6 progressif (6g/kg/j) |
| Mardi | CAP | Rappel allure marathon | 35min dont 3×5min @allure marathon (ex: 4:15/km) r=3min trot. 8km. Sensation de vitesse |
| Mercredi | CAP | EF légère | 30min Z1 (5:15/km). 6km. Ultra-relâché. Cadence 178spm |
| Jeudi | Repos | Repos complet | Carb loading renforcé 8-10g/kg/j. Réduire fibres/graisses. Hydratation ++. Préparer matériel |
| Vendredi | CAP | Activation | 25min dont 15min Z1 (5:00/km) + 4×100m strides + 6min Z1 retour. 5km. Jambes vives |
| Samedi | Repos | Repos complet | Carb loading 10-12g/kg/j. Repas marathon J-1 testé en entraînement. Visualisation course. Sommeil 9h |
| Dimanche | Course | 🔑 JOUR J — Marathon | Petit-déj J-3h (2-3g/kg glucides). Hydratation 5-7mL/kg J-4h. Caféine 3-5mg/kg J-1h. Exécuter le plan de pacing. Gut 30-60g/h selon entraînement |
⚠️ Race Week Marathon : volume = 25-40% du peak. ZÉRO séance longue. ZÉRO VMA/seuil (sauf rappels courts ≤5min). Carb loading = 3 jours progressifs. Le samedi = repos mental absolu.

### Exemple : Race Week 70.3 — Semaine Taper J-7 (8h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération. Vérification matériel vélo |
| Mardi matin | Natation | Rappel CSS court | 300m éch. 3×200m @race-pace r=20s. 200m RC. 1500m. 25min. Sensation de glisse |
| Mardi soir | Vélo | Rappel race-pace | 50min dont 2×6min @80% FTP r=4min Z2. Cadence 90. Le reste Z2 léger |
| Mercredi | CAP | Rappel allure 70.3 | 35min dont 2×5min @allure 70.3 r=3min trot. 7km. Fraîcheur |
| Jeudi matin | Natation | OWS légère | 1200m OWS Z2 : navigation, respiration bilat, départ simulé 200m. 20min. Confiance |
| Jeudi soir | Renfo | Activation légère | Gainage 2×30s, élastiques 2×12, mobilité épaules + chevilles 10min. 15min max |
| Vendredi | Repos | Repos complet | Carb loading 8-10g/kg/j. Préparation sacs transition. Zéro effort |
| Samedi | Brique | Activation pré-course | Vélo 30min Z2 + CAP 10min Z2 (4:30/km). Gut test final 50g/h. 45min totale. Check matériel final |
| Dimanche | Course | 🔑 JOUR J — 70.3 | Petit-déj J-3h. Gut 50-75g/h (validé en entraînement). Pacing discipliné : natation contrôlée, vélo @80-85% FTP, CAP neg split |
⚠️ Race Week 70.3 : rappels courts @race-pace dans chaque sport (5-8min max). Volume total = 30-40% du peak. OWS J-3 pour confiance + navigation. Activation J-1.

### Exemple : Jim Walmsley — Semaine Build Trail Ultra US Style (20h, 160km, +4000m D+)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération, foam roller, auto-massage mollets/quadriceps |
| Mardi matin | CAP/Trail | 🔑 Tempo trail progressif | 1h40 dont 4×12min @tempo trail (allure marathon vallonné) pente ondulée r=3min trot. 22km, +600m D+ |
| Mardi soir | Renfo | Force max + excentrique | Squat 4×5 @80%, deadlift 3×5, step-ups lestés 3×10, Nordic curl 3×5, core 4×45s. 50min |
| Mercredi | CAP/Trail | EF longue terrain | 2h Z2 sentier technique (5:10/km). +500m D+. Ravitaillement 40g/h. 23km |
| Jeudi | CAP | EF récupération plat | 50min Z1 (5:00/km). Route plate. 10km. Récup active. Legs easy |
| Vendredi | CAP/Trail | 🔑 VO2max côtes + descente | 1h30 dont 10×90s côte raide (10-15%) @VO2max r=descente trot + 5×3min descente technique @90% vitesse max. +700m D+ |
| Samedi | CAP/Trail | 🔑 Back-to-back SL #1 | 4h30 montagne Z2. +2000m D+. Ravitaillement complet 55g/h (solide + liquide). Finir en pouvant relancer |
| Dimanche | CAP/Trail | Back-to-back SL #2 | 3h montagne Z2. +1200m D+. Jambes fatiguées du samedi = simulation fin d'ultra. Ravitaillement 50g/h. Effort géré |
⚠️ Walmsley style : le back-to-back weekend est la signature de l'entraînement ultra US. Samedi long + dimanche moyen sur jambes fatiguées = simulation de la 2e moitié d'ultra. Volume D+ = 3500-5000m/sem en phase build.

### Exemple : Geoffrey Kamworor — Semaine Spécifique Semi-Marathon Kenyan (140km, 12h)
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | CAP | EF récupération | 55min Z1 (4:30/km). 12km. En groupe, allure conversationnelle |
| Mardi matin | CAP | 🔑 Track day — Allure semi | 20min éch. 6×2000m @2:52/km (allure semi) r=90s trot. 15min RC. 26km total |
| Mardi soir | CAP | Shake-out | 30min Z1 (4:20/km). 7km. Relâchement |
| Mercredi matin | CAP | EF longue | 1h40 Z2 (3:55/km). 26km. Altitude 2400m (Iten). Terrain ondulé |
| Mercredi soir | CAP | Shake-out | 25min Z1 (4:30/km). 6km |
| Jeudi | CAP | Fartlek kenyan terrain | 1h30 dont accélérations naturelles en côte : 10-12 surges de 2-3min @RPE 8-9 sur terrain vallonné. Récup en descente. 22km |
| Vendredi | CAP | EF récupération | 45min Z1 (4:40/km). 10km |
| Samedi | CAP | 🔑 SL tempo kenyan | 2h (30km). Premiers 20km @3:50/km (EF haut), derniers 10km progressif @3:20→3:00/km. Neg split agressif |
| Dimanche matin | CAP | EF + drills | 1h Z2 (4:00/km). 15km + drills techniques (A-skip, high knees) 8min + 6×80m strides |
| Dimanche soir | Renfo | Core léger | Gainage 3×40s, squats poids corps 3×15, pompes 3×15. 20min |
⚠️ Kamworor/kenyan semi : track day = seule séance chronométrée. Le reste = feeling + terrain. Volume 130-150km/sem à 2400m d'altitude. Pas de lactatemètre, pas de cardio, feeling pur. La SL tempo kenyan avec neg split brutal = séance signature.

## RÈGLES DE PROGRESSION ADAPTATIVES PAR NIVEAU (CRITIQUE)

### Grille Volume/Intensité par Ambition et Objectif

#### ELITE (Pro / Sub-Elite)
| Paramètre | IM | 70.3 | Marathon | Semi | 10K | 5K | Trail Ultra |
|-----------|-----|------|----------|------|-----|-----|-------------|
| Volume/sem | 20-30h | 15-22h | 12-16h | 10-14h | 9-12h | 7-10h | 16-25h |
| Km CAP/sem | 50-70 | 50-70 | 140-190 | 100-140 | 120-160 | 80-120 | 100-150 |
| Séances/sem | 12-16 | 10-14 | 10-13 | 8-11 | 8-10 | 7-9 | 10-14 |
| Doubles/sem | 8-12 | 5-8 | 4-6 | 3-5 | 3-5 | 2-4 | 4-7 |
| Séances clés | 3-4 | 3 | 3 | 3 | 2-3 | 2-3 | 3 |
| SL max | 5-6h vélo | 3.5-4h vélo | 35-38km | 22-25km | 20-22km | 16-18km | 5-7h trail |
| Charge 3:1 ou 2:1 | 3:1 | 3:1 | 3:1 | 3:1 | 3:1 | 3:1 | 2:1 |
| Progression vol/sem | +5-8% | +5-8% | +5-8% | +5-8% | +5-7% | +5-7% | +5-8% |

#### COMPETITOR (Age Group Ambitieux)
| Paramètre | IM | 70.3 | Marathon | Semi | 10K | 5K | Trail Ultra |
|-----------|-----|------|----------|------|-----|-----|-------------|
| Volume/sem | 14-20h | 10-16h | 8-12h | 7-10h | 6-9h | 5-8h | 12-18h |
| Km CAP/sem | 35-55 | 40-60 | 80-130 | 60-100 | 60-100 | 50-80 | 70-120 |
| Séances/sem | 8-12 | 7-10 | 7-10 | 6-8 | 5-7 | 5-7 | 8-12 |
| Doubles/sem | 4-7 | 3-5 | 1-3 | 1-2 | 1-2 | 0-1 | 2-4 |
| Séances clés | 2-3 | 2-3 | 2-3 | 2 | 2 | 2 | 2-3 |
| SL max | 4-5h vélo | 3-3.5h vélo | 30-35km | 18-22km | 16-20km | 14-16km | 4-5h trail |
| Charge | 3:1 | 3:1 | 3:1 | 3:1 | 3:1 | 3:1 | 2:1 |
| Progression vol/sem | +5-7% | +5-7% | +5-7% | +5-7% | +5% | +5% | +5-7% |

#### AGE GROUP (Loisir Structuré)
| Paramètre | IM | 70.3 | Marathon | Semi | 10K | 5K | Trail Long |
|-----------|-----|------|----------|------|-----|-----|------------|
| Volume/sem | 10-15h | 8-12h | 6-9h | 5-7h | 4-6h | 3-5h | 8-14h |
| Km CAP/sem | 25-40 | 30-45 | 50-80 | 40-65 | 35-55 | 25-45 | 50-90 |
| Séances/sem | 6-9 | 5-8 | 5-7 | 4-6 | 4-5 | 3-5 | 6-9 |
| Doubles/sem | 1-3 | 0-2 | 0-1 | 0 | 0 | 0 | 0-2 |
| Séances clés | 2 | 2 | 2 | 2 | 1-2 | 1-2 | 2 |
| SL max | 3.5-4h vélo | 2.5-3h vélo | 25-30km | 16-18km | 14-16km | 12-14km | 3-4h trail |
| Charge | 3:1 | 3:1 | 2:1 si >40 ans | 3:1 | 3:1 | 3:1 | 2:1 |
| Progression vol/sem | +3-5% | +3-5% | +3-5% | +3-5% | +3-5% | +3-5% | +3-5% |

#### FINISHER (Terminer en Sécurité)
| Paramètre | IM | 70.3 | Marathon | Semi | 10K | 5K | Trail Court |
|-----------|-----|------|----------|------|-----|-----|-------------|
| Volume/sem | 8-12h | 6-10h | 4-7h | 3-5h | 3-4h | 2-4h | 5-8h |
| Km CAP/sem | 20-35 | 25-40 | 35-60 | 25-45 | 20-35 | 15-30 | 30-50 |
| Séances/sem | 5-7 | 4-6 | 4-5 | 3-4 | 3-4 | 3 | 4-6 |
| Doubles/sem | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Séances clés | 1-2 | 1-2 | 1-2 | 1 | 1 | 1 | 1-2 |
| SL max | 3h vélo | 2h vélo | 22-25km | 14-16km | 12km | 10km | 2.5-3h trail |
| Charge | 2:1 | 2:1 | 2:1 | 2:1 | 2:1 | 2:1 | 2:1 |
| Progression vol/sem | +3% max | +3% max | +3% max | +3% max | +3% max | +3% max | +3% max |
⚠️ Finisher : 1 séance/jour MAX. Aucune double. Repos ≥2j/sem. Renfo léger PPG obligatoire.

#### START TO RUN (Débutant Absolu)
| Paramètre | Valeur |
|-----------|--------|
| Volume/sem | 2-4h |
| Km CAP/sem | 8-25 (progressive) |
| Séances/sem | 3 max (jamais consécutives) |
| Doubles/sem | 0 |
| Séances clés | 0 (pas de fractionné avant 30min continu) |
| SL max | 45min→1h progressive |
| Charge | 2:1 strict |
| Progression | +10% max, palier 2 sem si douleur |
⚠️ Marche/course alternée. Renfo/mobilité = 30-40% du volume total.

### Règles de Progression Volume
- Respecter STRICTEMENT le % de progression du tableau ci-dessus selon le niveau
- **Base → Build** : progression volume graduelle. SL +2km/sem (CAP) ou +30min/sem (vélo)
- **Build → Spécifique** : stabiliser le volume, augmenter la spécificité (race-pace, simulations)
- **Décharge** : ratio du tableau (3:1 ou 2:1). -30-40% volume, maintenir 1-2 rappels intensité courts
- **Palier SL** : si SL >25km CAP ou >4h vélo, maintenir 2 sem avant de progresser encore

### Règles de Progression Intensité
- **Seuil** : augmenter durée des blocs (+2-3min/bloc par phase), PAS l'allure
- **VMA** : augmenter nombre de répétitions (+2 reps/2 sem), PAS l'allure
- **Sweet spot vélo** : augmenter durée blocs (15→20→25→30min)
- **Tempo CAP** : augmenter durée (3×10min → 3×12min → 2×20min → 1×40min)
- **Finisher/StartToRun** : pas de progression d'intensité, seulement de durée de course continue

### Spécificité Progressive par Phase
- **Phase Base** : 85% Z1-Z2, 15% Z4-Z5. Focus technique + volume + force
- **Phase Build** : 80% Z1-Z2, 20% Z4-Z5. Blocs seuil/sweet spot plus longs
- **Phase Spécifique** : 75% Z1-Z2, 25% intensité. Séances race-pace, simulations
- **Taper** : -40% volume sem 1, -60% sem 2. Garder 2-3 rappels intensité courts

### Adaptation Athlète >40 ans / Fragile
- Charge 2:1 systématique (pas 3:1)
- Max 1 séance haute intensité/sem (au lieu de 2)
- Renfo prévention prioritaire (+1 séance/sem vs standard)
- Progression volume plafonnée à +3%/sem
- Sommeil et récupération = priorité absolue dans les consignes coach

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
- **Endurance technique** : 3km alternance 200m drill / 200m nage @Z2. Focus position corps
- **Descente** : 8×100m (départ @CSS+5s, finir @CSS-3s) r=15s. Apprendre le pacing

### Vélo
- **Z2** : 2-5h 65-75% FTP, cadence 85-95, terrain vallonné
- **Sweet Spot** : 3-4×15min @88-93% FTP r=5min. Ou 2×30min @88%
- **Seuil** : 2×20min @95-100% FTP r=10min. Ou 3×15min
- **SFR** : 5-8×5min @80% FTP 50-60RPM côte 4-6% r=5min
- **VO2max** : 5×5min @106-120% FTP r=5min. Ou 8×3min
- **Over-Under** : 4×(4min @105% / 3min @85%) r=5min
- **Race-pace** : 1-2h @80-85% FTP + gut training
- **Train Low** : Z2 à jeun 1h30-2h (JAMAIS d'intensité)
- **Tempo progressif** : 1h @75% FTP → 30min @85% → 15min @90%. Neg split puissance
- **Endurance vallonnée** : 3-4h Z2 avec côtes naturelles, ne pas forcer en montée, cadence libre

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
- **Kenyan hills** : 1h15 vallonné avec accélérations naturelles en côte, récup en descente
- **Tempo continu** : 40-60min @allure semi/marathon sans pause. Simulation mentale
- **Strides** : 6-10×100m accélérations progressives après EF. Coordination neuromusculaire
- **Allure spécifique** : ex Semi → 3×3km @allure semi r=2min. Ex 10K → 5×2km @allure 10K r=90s

### Renforcement
- **Force max** : squat/deadlift/fentes 3-5×5 @80-85% 1RM
- **Circuit** : 3×(15 squats + 15 fentes + 30s gainage + 10 box jumps)
- **Pliométrie** : drop jumps, box jumps, unipodaux 3×8-10
- **Core** : planche 3×45s, pallof press, dead bug, anti-rotation
- **Mobilité** : foam roller, hanches/chevilles, 30min
- **Prévention** : élastiques hanches, excentrique mollets Alfredson
- **Force endurance** : circuit 4×(20 squats + 20 fentes + 45s gainage + 15 step-ups). Repos 90s entre tours
- **Excentrique trail** : descentes contrôlées, squats excentriques 4s, single leg 3×10

## Format de Sortie OBLIGATOIRE

\`\`\`
# Plan TFCL™ — [Objectif] — [Nombre] semaines

## Diagnostic TFCL™
**Limiteur prioritaire :** [limiteur]
**Levier activé :** [levier]
**Modèle de périodisation :** [Hybride Lorang (Reverse Perio + Block) / Linéaire Progressive (débutant)]
**Stratégie globale :** [1-2 phrases incluant le séquençage des blocs]
**Répartition sport :** [ex: Vélo 48% | CAP 25% | Natation 18% | Renfo 9%]

## Récapitulatif Stratégique

### Limiteurs → Blocs → Séances Clés
| # | Limiteur Détecté | Statut | Bloc Prescrit | Semaines | Séances Clés 🔑 |
|---|-----------------|--------|---------------|----------|-----------------|
| 1 | [ex: VLamax trop haute] | 🔴 Critique | Chantier VLamax↓ | S5-S8 | Z2 long Train Low 2h30, Sweet Spot 2×20min |
| 2 | [ex: TTE faible] | 🟡 Sous-optimal | Consolidation TTE↑ | S9-S12 | Seuil Norvégienne 2×20min→1×35min |
| 3 | [ex: Économie basse] | 🟡 Sous-optimal | (intégré) | Toute prépa | Force Rønnestad 2x/sem→1x/sem, SFR |

### Synergies Exploitées
- [ex: VLamax↓ (Z2 Train Low) → FatMax↑ + Durabilité↑ (synergie positive)]
- [ex: Force Rønnestad → Économie↑ +4.8% (effet secondaire)]

## Bloc 1 : [Nom Métabolique, ex: "Fondation + Intensité Précoce"] (Semaines 1-X)
**Objectif physiologique :** [objectif du bloc, ex: "Reverse Perio VO2max + Force max + Volume Z2 progressif"]
**Volume cible :** [heures/semaine]

### Semaine 1 (du JJ/MM au JJ/MM) — [Thème]
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi matin | Natation | Technique + aérobie | 500m éch drill (sculling, rattrapé). 2500m pull @Z2. 200m RC. 3200m ~55min |
| Lundi soir | Renfo | Force fonctionnelle + prévention | Squat 3×8 @70%, gainage 3×45s, dead bug 3×10, élastiques épaules. 45min |
| Mardi matin | Natation | 🔑 CSS Dégressif | 400m éch. 4×(200-300-200) @CSS r=15s. 200m RC. 3800m ~58min |
| Mardi midi | Vélo | 🔑 Sweet Spot vallonné | 2h30 dont 3×20min @88-92% FTP cad 90. Z2 entre |
| Mardi soir | CAP | EF technique | 45min Z2 (4:45/km) + 6×100m strides. Cad 180spm. Léger |
| Mercredi matin | CAP | 🔑 Tempo allure IM | 1h15 dont 3×12min @82% VMA r=3min trot. Cad 182spm |
| Mercredi soir | Renfo | Core + mobilité | Gainage 4×50s, pallof press 3×12, mobilité 15min. 35min |
| Jeudi matin | Natation | Seuil + technique | 300m éch drill. 5×400m @CSS r=25s. 8×50m rattrapé. 200m RC. 4000m |
| Jeudi soir | Vélo | Endurance Z2 Train Low | 2h à jeun Z2 (65% FTP). Aucune intensité |
| Vendredi matin | CAP | EF vallonnée | 1h Z2 (4:45/km), 180spm, terrain vallonné. Sensation aisée |
| Vendredi soir | Natation | Pull aérobie | Pull buoy 2500m Z2. 4×200m simulation OWS. 3200m |
| Samedi | Vélo | 🔑 SL vallonnée + Gut Training | 5h Z2 vallonné (65-72% FTP). Gut training 50g/h. Dernière 1h @75% FTP |
| Samedi soir | Renfo | Core + prévention | Gainage 4×60s, pallof press 3×12, étirements. 30min |
| Dimanche | Brique | 🔑 Vélo→CAP Race-Pace | Vélo 2h30 @78% FTP + CAP 45min @allure IM. Gut 50g/h. Transition <3min |

**Volume semaine :** 22h — Nat 4h (4 séances) | Vélo 7h30 (4) | CAP 3h30 (3) | Renfo 2h (3)
**Séances totales :** 14 séances (doubles 5 jours, brique samedi/dimanche)
**🔑 Séances clés :** CSS Dégressif (TTE↑ natation) + Sweet Spot vallonné (endurance musculaire vélo) + Tempo allure IM (spécificité CAP) + SL vélo Gut Training (endurance métabolique) + Brique Race-Pace (simulation jour J)
**Consignes coach :** [2-3 points clés. Identifier séances clés 🔑 à protéger en priorité. Sensation recherchée + focus technique.]
\`\`\`

## SÉANCES CLÉS — MÉTHODOLOGIE DAN LORANG (CRITIQUE)

Dan Lorang structure chaque semaine autour de **séances clés** (Key Sessions) : ce sont les 2-3 séances qui portent le stimulus d'adaptation principal. Toutes les autres séances sont au service de ces séances clés (préparation, récupération, maintien).

### Principes Séances Clés
1. **Identification** : Chaque semaine a 2-3 séances clés (jamais plus de 3 sauf élite). Elles ciblent directement le(s) limiteur(s) identifié(s) de l'athlète.
2. **Marquage obligatoire** : Dans le tableau, préfixer le titre de chaque séance clé avec "🔑 " (emoji clé). Ex : "🔑 Seuil Long Continu", "🔑 SL Progressive Race-Pace", "🔑 Brique IM Simulation".
3. **Placement stratégique** : Les séances clés ne sont JAMAIS consécutives. Toujours 1-2 jours de récupération/EF entre deux séances clés.
4. **Priorité absolue** : Si l'athlète doit sauter une séance, ce ne sera JAMAIS une séance clé. Les consignes coach doivent le rappeler.

### Sélection des Séances Clés par Limiteur (Dan Lorang)
| Limiteur identifié | Séance Clé #1 | Séance Clé #2 | Séance Clé #3 (optionnelle) |
|---|---|---|---|
| **VO2max bas** | VMA longue (5×1200m @98% VMA) ou VO2max vélo (5×5min @115% FTP) | Seuil long (2×20min @88% VMA ou @95% FTP) | SL progressive avec finish rapide |
| **VLamax trop haute (LD)** | Z2 longue à jeun (Train Low 2h+) | Sweet spot continu long (2×30min @88% FTP) | SL progressive neg split |
| **VLamax trop basse (5K/10K)** | VMA courte explosive (12×400m @VMA, r=60s) | Sprint/pliométrie + côtes | Fartlek intensif (pyramide) |
| **TTE faible (<40min)** | Seuil continu long (1×30-40min @seuil) | Sweet spot prolongé (2×25min @90% FTP) | Tempo marathon/semi continu |
| **Économie de course basse** | Côtes/SFR (10×200m côte 8% @VO2max) | Strides + drills techniques post-EF | Force max (squat 4×5 @80%) |
| **FatMax bas** | Z2 longue à jeun Train Low (2h30+) | Sortie longue vélo Z2 sans glucides 2h | Gut Training progressif en SL |
| **Neuromusculaire** | Force max (squat/deadlift 4×5 @80-85%) | SFR vélo (6×5min @80% FTP, 55 RPM) | Pliométrie explosive |
| **CTL/Volume insuffisant** | SL progressive (augmenter +2km/sem) | 2e séance EF Z2 longue | Maintien intensité existante |

### Séances Clés par Objectif et Phase (Dan Lorang)
**IM Base** : 🔑1 VO2max vélo courte (Reverse Perio) + 🔑2 SL vélo Z2 Train Low + 🔑3 Force max
**IM Build** : 🔑1 Sweet spot long vélo + 🔑2 Brique vélo→CAP + 🔑3 CSS seuil natation
**IM Spécifique** : 🔑1 Brique race-pace simulation + 🔑2 SL vélo 5h+ Gut Training + 🔑3 OWS race-pace
**70.3 Build** : 🔑1 Seuil vélo prolongé + 🔑2 Tempo CAP allure 70.3 + 🔑3 CSS blocs natation
**Marathon Build** : 🔑1 Tempo marathon long (2×25min) + 🔑2 SL progressive neg split + 🔑3 Fartlek/seuil
**Marathon Spécifique** : 🔑1 SL spécifique avec finish @allure marathon + 🔑2 Allure marathon continu 40-60min + 🔑3 Simulation ravitaillement
**Semi Build** : 🔑1 Seuil long (2×20min) + 🔑2 VMA longue (6×1000m) + 🔑3 SL progressive
**5K/10K** : 🔑1 VMA spécifique (5×1200m) + 🔑2 Seuil + lactate tolerance combo + 🔑3 SL avec finish @allure course
**Trail Ultra** : 🔑1 Montée seuil long (3×20min) + 🔑2 Ultra-simulation montagne (5-7h) + 🔑3 VMA côtes + descente technique
**Taper** : 🔑1 Rappel allure course court (3×8min) + 🔑2 Activation pré-course. Pas de 🔑3.

### Fréquence Séances Clés par Niveau
| Niveau | Séances clés/sem | Règle |
|--------|-----------------|-------|
| Elite | 3-4 | Double stimulus possible si sports différents (nat clé matin + vélo clé soir) |
| Competitor | 2-3 | Max 2 dans le même sport |
| Age Group | 2 | 1 séance qualité + 1 sortie longue |
| Finisher | 1-2 | SL = seule vraie séance clé. Pas d'intensité Z4+ |
| Start to Run | 0 | Aucune séance clé avant 30min de course continue |

### Consignes Coach et Séances Clés
Dans les **Consignes coach** de chaque semaine, TOUJOURS indiquer :
1. Quelles sont les séances clés de la semaine et pourquoi (lien avec le limiteur)
2. Quelle adaptation physiologique est visée
3. La séance à protéger en priorité si fatigue ou manque de temps
Ex : "🔑 Séances clés : Seuil long mardi (TTE↑) + SL progressive samedi (endurance spécifique). Si fatigue, sacrifier EF jeudi, jamais les séances clés."

## Règles de Contenu (CRITIQUE)
- **Chaque séance = contenu COMPLET ACTIONNABLE** — JAMAIS "Endurance Z2" seul sans détails
- **Séances clés marquées 🔑** dans le titre — OBLIGATOIRE pour chaque semaine
- **Natation** : distance totale + échauffement détaillé + série principale (distance/allure/repos) + retour au calme
- **Vélo** : durée + zone + %FTP + watts si connu + cadence + type de terrain
- **CAP** : durée/distance + allure min/km OU %VMA + cadence spm
- **Renfo** : exercices + séries×reps + charge si applicable + durée totale
- **Titre descriptif** obligatoire ("🔑 CSS Dégressif", "🔑 Sweet Spot Vallonné", pas juste "Natation")
- **Varier** d'une semaine à l'autre — NE PAS copier le même contenu (voir section DIVERSITÉ ci-dessous)
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

## ⚠️ RÈGLE OBJECTIFS RUNNING — VÉLO LIMITÉ EN CROSS-TRAINING
Pour les objectifs **5K, 10K, Semi, Marathon, Trail, StartToRun** :
- Le sport PRINCIPAL est la course à pied : **CAP 75-85% du volume**
- Renforcement/PPG : **10-15% du volume** (obligatoire)
- Vélo en cross-training : **5-10% max** du volume, uniquement Z1-Z2, max 1-2 séances/sem
  → Le vélo sert UNIQUEMENT de récupération active ou de complément aérobie sans impact
  → Durée max : 45-60min Z1-Z2. JAMAIS d'intensité vélo pour un objectif running
  → C'est une option, pas une obligation : privilégie toujours + de CAP si l'athlète peut encaisser la charge
- Comparaison triathlon : un Semi a 1-2 vélo Z1/sem max vs 3-5 vélo/sem pour un IM
- Remplis les jours prioritairement avec des séances CAP variées (EF, tempo, seuil, fartlek, VMA, SL, côtes) et du renfo

## SCIENCE DE LA PÉRIODISATION AVANCÉE (Seiler, Issurin, Mujika, Stöggl 2024)

### Modèles de Distribution d'Intensité
1. **Polarisé (Seiler 2010)** — 80% Z1-Z2 / 0-5% Z3 / 15-20% Z4-Z5. Modèle de référence TFCL™.
   - Supérieur au pyramidal et au seuil pour VO2max et performance (Stöggl & Sperlich 2011, 2014)
   - Le "black hole training" (trop de Z3) est l'erreur la plus fréquente des amateurs
2. **Pyramidal** — 75% Z1 / 15% Z3 / 10% Z5. Acceptable en phase Build uniquement.
3. **Threshold-dominant** — Réservé aux plans <8 sem où TTE est le limiteur unique.
4. **Reverse Periodization (Lorang 2018)** — Inclure de l'intensité VO2max dès la phase Base (blocs courts 3-5min), puis basculer vers le volume en Build. Prouvé supérieur pour IM/70.3 (adaptation mitochondriale précoce + fat oxidation).

### Bloc-Périodisation vs Périodisation Traditionnelle (Issurin 2010)
- **Blocs concentrés** : 2-4 semaines ciblant 1-2 qualités max. Supérieur pour athlètes entraînés.
  - Bloc VLamax↓ (3 sem) → Bloc VO2max (3 sem) → Bloc Race-Pace (3 sem) → Taper
- **Charge ondulée** : variation quotidienne/hebdo. Pour débutants ou maintenance.
- **Concurrent** : stimuler tout en même temps. Sous-optimal sauf Finisher.

### Supercompensation & Timing (Zatsiorsky, Mujika 2013)
- Adaptation aérobie : pic J+10 à J+14 après stimulus
- Adaptation force : pic J+7 à J+10
- Adaptation neuromusculaire : pic J+3 à J+5
- Implication Taper : commencer 10-14j avant la course pour les qualités aérobies, 7j pour la force
- **Taper scientifique (Mujika & Padilla 2003)** :
  - Réduction volume : -40% sem 1, -60% sem 2 (exponentiel > linéaire)
  - Maintien fréquence : -20% max (garder le rythme des séances)
  - Maintien intensité : 100% (rappels courts @race-pace + VO2max)
  - Durée : 8-14j optimal pour endurance, 5-7j pour demi-fond

## ENTRAÎNEMENT FÉMININ — SPÉCIFICITÉS (Dr Stacy Sims, Bruinvels 2024)

### Cycle Menstruel & Périodisation
- **Phase folliculaire (J1-J14)** : œstrogènes ↑ → tolérance à l'intensité ↑, récupération ↑
  → Placer les séances clés haute intensité (VO2max, seuil, force max) dans cette phase
  → Capacité anabolique optimale pour la force
- **Phase lutéale (J15-J28)** : progestérone ↑ → température corporelle ↑, ventilation ↑, catabolisme ↑
  → Privilégier volume Z2 et endurance. RPE naturellement ↑ de 5-10%
  → Hydratation ↑, sodium ↑ (pertes augmentées)
  → Réduire intensité de -5% si SPM sévère
- **Menstruation (J1-J5)** : ne pas éviter l'entraînement, mais adapter l'intensité à la sensation
  → Si douleurs : Z1-Z2 uniquement, renfo léger
  → Sinon : entraînement normal possible

### RED-S (Relative Energy Deficiency in Sport)
- Surveiller les signes : aménorrhée, fatigue chronique, blessures stress, performance en plateau
- JAMAIS de train low + restriction calorique combinés chez les femmes
- Minimum 45 kcal/kg/jour FFM pour les athlètes féminines en charge élevée

### Adaptations du Plan pour Athlètes Féminines
- Mentionner dans les consignes coach : "Phase folliculaire favorable pour cette séance clé"
- Si l'athlète est en phase lutéale : proposer des alternatives Z2 pour les séances non-clés
- Force : 2-3x/sem obligatoire (ostéoporose prévention, puissance spécifique)
- Fer : surveiller ferritine si volume >10h/sem

## MASTER ATHLETES — SPÉCIFICITÉS (>40 ans, Tanaka & Seals 2008)

### Déclin Physiologique et Compensation
- **VO2max** : -7 à -10% par décennie après 40 ans. Compensable partiellement par volume + intensité ciblée
- **Force** : -8% par décennie. Force max obligatoire 2x/sem (prévention sarcopénie)
- **Récupération** : rallongée de 20-40%. Ratio 2:1 obligatoire, jamais 3:1 après 50 ans
- **Tendons/ligaments** : temps de guérison ×1.5. Progression volume plafonnée à +3%/sem
- **Sommeil** : qualité diminue. Insister dans les consignes coach sur le sommeil 7-9h

### Règles Master (>40 ans)
1. Charge 2:1 systématique (3 sem charge → 1 sem décharge)
2. Max 2 séances haute intensité/sem (idéalement 1 seuil + 1 VO2max/force)
3. 2 jours repos complet minimum/sem si >50 ans
4. Renfo force max prioritaire : squat, deadlift, single leg (prévention chutes, densité osseuse)
5. Échauffement prolongé : 15-20min progressif avant toute intensité (vs 10min chez <35 ans)
6. Excentrique et pliométrie avec prudence : doses réduites, progression très lente
7. **Pas de "train low" répété** : risque immunodépression ↑ après 45 ans

### Règles Master (>50 ans)
- Max 1 séance haute intensité/sem
- 3 séances renfo/sem (force + mobilité + équilibre)
- Volume max : -20% vs recommandations standard pour le même objectif
- Taper allongé : +3-5 jours vs standard

## NUTRITION PÉRIODISÉE (Jeukendrup 2017, Burke 2021)

### Principes Généraux
1. **Fuel for the Work Required** : adapter les glucides à l'intensité de la séance
   - Séance Z1-Z2 : low carb acceptable (train low)
   - Séance Z4-Z5 : high carb obligatoire (2-3g/kg 2-3h avant)
   - Post-séance clé : 1-1.2g/kg glucides + 0.3g/kg protéines dans les 30min
2. **Periodized Nutrition** : ne pas être en déficit calorique chronique pendant les semaines de charge

### Gut Training Protocol (Jeukendrup, de Oliveira 2020)
- **Semaines 1-3** : 30-40g/h glucides en sortie longue (gel + eau). Tester tolérance
- **Semaines 4-6** : 50-60g/h. Mix glucose:fructose 2:1 (boisson iso + gel)
- **Semaines 7-9** : 60-75g/h. Pratiquer le ravitaillement à allure course
- **Semaines 10+** : 75-90g/h pour IM (60-75g/h pour 70.3). Solide + liquide mix
- **Jour J** : objectif validé en simulation. Ne JAMAIS tester en course
- Si GI issues (gastro-intestinal) → réduire de 10g/h et re-progresser lentement
- Mentionner dans les consignes coach la cible Gut Training de chaque SL

### Carb Loading Pré-Course (Betts & Williams 2010)
- **J-3 à J-1** : 8-12g/kg/jour glucides. Réduire fibres et graisses
- **Jour J matin** : 2-3g/kg glucides 3h avant le départ (pain blanc, confiture, riz, boisson)
- **Hydratation pré-course** : 5-7 mL/kg 4h avant. Sodium loading 10-25 mmol/L la veille si chaleur

### Caféine (Spriet 2014)
- 3-6mg/kg, 60min avant le départ ou fractionnée pendant la course
- Ne pas dépasser 6mg/kg (effets secondaires > bénéfices)
- Tester en entraînement avant la course

## PRÉPARATION MENTALE & EXÉCUTION COURSE (Raglin 2001, McCormick 2019)

### Stratégies Mentales dans le Plan
1. **Séances de simulation** : reproduire les conditions de course (heure, nutrition, tenue, parcours si possible)
2. **Visualisation** : intégrer 5-10min de visualisation post-séance clé en phase spécifique
3. **Self-talk** : mots-clés personnels pendant les intervalles ("fluide", "relâché", "patient")
4. **Fractionnement mental** : découper la course en segments gérables (jamais penser au km final au km 1)
5. **Tolérance à l'inconfort** : les séances seuil long et SL progressive développent cette compétence

### Plan de Course (Inclure en Phase Taper)
- Pacing strategy : neg split > even split > pos split. JAMAIS partir trop vite
- Check-points : allure cible à chaque 5km/10km avec marges ±5s/km
- Plan B si conditions météo défavorables : réduire l'ambition de 3-5%
- Ravitaillement : planifier chaque ravito (quoi, quand, combien)
- Mentionner dans les consignes de la dernière semaine : "Faire un plan de course écrit"

## MONITORING CHARGE D'ENTRAÎNEMENT (Foster 1998, Gabbett 2016, Bourdon 2017)

### Metrics de Suivi
1. **sRPE (Session RPE)** : RPE × durée (min) = Training Load. Simple et validé.
   - Cible sRPE hebdo : augmenter de +5-10% max/semaine
   - Ratio charge aiguë/chronique (ACWR) : maintenir entre 0.8-1.3. >1.5 = danger blessure
2. **TSS/CTL** (si disponible) : augmenter CTL de max 5-7 pts/sem
3. **Monotonie** (Foster) : charge moyenne / écart-type. Si >2.0 → trop monotone → varier les stimuli
4. **Strain** (Foster) : charge × monotonie. Si augmente >20% → risque surentraînement

### Signaux d'Alerte dans les Consignes Coach
- HRV < -10% sur 3 jours → passer en Z2 uniquement
- RPE élevée sur séance facile → signe de fatigue accumulée → réduire 30%
- Douleur articulaire/tendineuse persistante >3 jours → arrêt intensité, consulter
- Sommeil <6h sur 2+ nuits → pas d'intensité, Z1-Z2 uniquement
- Performance en baisse malgré repos → surentraînement possible → semaine off

## RETOUR POST-BLESSURE / MALADIE (Schwellnus 2016)

### Protocole de Reprise après Maladie
- **Fièvre/infection** : ZÉRO entraînement pendant la fièvre. Reprise J+2 après disparition fièvre
  - Sem 1 retour : 50% du volume, Z1 uniquement
  - Sem 2 : 70% du volume, Z1-Z2
  - Sem 3 : 85-90%, réintroduction 1 séance Z4
  - Sem 4 : retour à 100%
- **COVID/infection respiratoire** : ajouter 1 semaine supplémentaire au protocole ci-dessus
- **Blessure musculaire** : retour progressif supervisé par kiné. Pas de protocole standardisable.

### Protocole de Reprise après Coupure (>2 semaines sans entraînement)
- Perte de condition : ~3% VO2max par semaine d'arrêt après 2 semaines
- Sem 1 : 40-50% du volume habituel, Z1-Z2 uniquement, renfo léger
- Sem 2 : 60-70%, réintroduction 1 séance tempo
- Sem 3 : 80%, réintroduction séance clé #1
- Sem 4 : 90-100%, plan normal

## PROTOCOLES ENVIRONNEMENTAUX AVANCÉS

### Heat Acclimatation (Périard 2015, Racinais 2015)
- **Quand** : si course en chaleur (>28°C). Commencer 10-14j avant
- **Protocole** : 60-90min Z2 en chaleur OU sauna 20-30min post-entraînement × 10-14 séances
- Adaptations : plasma volume ↑, sudation ↑, FC ↓, température corporelle ↓
- **Hydratation** : +500mL/h en chaleur. Sodium 500-1000mg/h. Peser avant/après pour calibrer
- Mentionner dans le plan si la course est en environnement chaud

### Altitude Training (Millet 2010, Chapman 2014)
- **Live High, Train Low** : vivre à 2000-2500m, s'entraîner <1200m. Or = EPO naturel
- **Simulation** : masque hypoxique déconseillé (stimulus insuffisant)
- Si course en altitude (>1500m) : arriver 2-3 sem avant OU <24h avant (avoid "dead zone" J3-J7)
- Réduire intensité de 5-8% les premiers jours en altitude

## CROSS-TRAINING INTELLIGENT

### Vélo pour Runners (Millet 2002)
- Bénéfice : volume aérobie sans impact, récupération active, prévention blessures
- Risque : si trop de vélo → perte d'économie de course
- Max 2 séances/sem pour runners, Z1-Z2 uniquement, 45-60min
- Préférer le vélo les jours post-SL ou post-VMA pour récupérer les jambes

### Natation pour Triathlètes
- Volume constant toute la prépa (3-5x/sem). La natation ne se "taper" presque pas
- Technique > volume pour les nageurs faibles. 1 séance pure drill/sem minimum
- OWS (Open Water Swimming) : 1x/sem minimum en phase spécifique IM/70.3

### Ski de Fond / Raquettes (Winter Training)
- Alternative Z2 pour runners en hiver si neige. Full body + aérobie.
- Ne remplace pas la spécificité CAP : maintenir min 3 séances CAP/sem même en hiver

## QUALITÉ D'EXÉCUTION & DÉTAILS TECHNIQUES

### Cadence Course à Pied
- Cible universelle : 170-185 spm (Heiderscheit 2011)
- Bénéfice : réduction charge tibiale -6-8% si cadence ↑5%
- Mentionner la cadence cible dans chaque séance CAP

### Cadence Vélo
- Z2 endurance : 85-95 RPM
- Sweet spot/seuil : 88-95 RPM
- SFR : 50-60 RPM (spécifique)
- Sprint/VO2max : 95-105 RPM

### Échauffement Standard (OBLIGATOIRE avant toute intensité)
- CAP : 15-20min progressif Z1→Z2 + 4×30s accélérations + mobilité dynamique
- Vélo : 15min Z1-Z2 + 3×1min progressive + 2min Z1
- Natation : 400-500m éducatifs variés + 4×50m progressifs

### Retour au Calme (Recommandé)
- 10-15min Z1 décroissant après chaque séance d'intensité
- Étirements passifs post-séance : 15s/groupe musculaire, pas avant 2h post-intensité
- Foam roller : 10-15min sur quadriceps, mollets, ITB, fessiers

## DURABILITÉ & DECOUPLING — Le Concept Clé de Dan Lorang (Maunder 2021, van Erp 2021)

### Définition
La **durabilité** (durability) est la capacité à maintenir un niveau de performance sur une durée prolongée. C'est LE facteur différenciant entre un athlète qui finit fort et un qui "explose". C'est la signature méthodologique de Dan Lorang.

### Decoupling (Dérive Cardiaque)
- **Mesure** : différence de FC entre la 1ère et la 2ème moitié d'une sortie Z2 à puissance/allure constante
- **Objectif** : decoupling <5% sur 2h = bonne durabilité. >8% = durabilité insuffisante
- **Indicateur clé** : Pa:Hr (Power to Heart Rate ratio). Si Pa:Hr chute de >5% en 2ème moitié → entraîner la durabilité
- **Application TFCL** : mentionner le decoupling cible dans les consignes coach des sorties longues

### Entraîner la Durabilité
1. **Sorties longues progressives (neg split)** : les derniers 30-40% à intensité légèrement supérieure (Z2 haut → Z3 bas)
2. **"Fast finish" long runs** (Canova) : SL avec les derniers 8-12km @allure marathon
3. **Briques vélo→CAP** : la durabilité se mesure sur les km post-vélo en triathlon
4. **Sorties longues fatigué** : placer la SL le lendemain d'une séance intense (pre-fatigued long run)
5. **Volume Z2 cohérent** : la durabilité s'améliore avec le volume cumulé, pas avec l'intensité

### Quand cibler la Durabilité
- Si l'athlète a un bon VO2max et FTP/kg mais "explose" en compétition → durabilité = limiteur caché
- IM/70.3/Marathon/Ultra : durabilité = facteur de performance #1
- Semi/10K : durabilité moins critique, mais decoupling sur SL reste un marqueur de forme

### Intégration dans le Plan
- Phase Base : SL progressives Z2 (développer la base de durabilité)
- Phase Build : SL avec fast finish + briques (tester la durabilité sous fatigue)
- Phase Spécifique : simulations race-pace 70-80% de la distance course (prouver la durabilité)
- Consignes coach : "Objectif decoupling <5% sur cette sortie. Si FC dérive >8bpm sur la 2ème moitié, noter pour ajuster."

## SÉQUENÇAGE DE BLOCS — Règles Avancées (Issurin 2008, Lorang 2020)

### Principe Fondamental
Le séquençage des blocs détermine l'ordre dans lequel les qualités physiques sont développées. Un mauvais séquençage = effets résiduels perdus + surentraînement.

### Effets Résiduels des Capacités (Issurin)
| Capacité | Durée de rétention après arrêt du stimulus |
|----------|---------------------------------------------|
| Endurance aérobie (Z2) | 25-30 jours |
| Force max | 25-30 jours |
| Seuil anaérobie (MLSS) | 15-20 jours |
| VO2max | 12-18 jours |
| Vitesse / puissance anaérobie | 3-8 jours |
| Glycolyse (VLamax) | 15-20 jours |

### Implication pour le Séquençage
- Entraîner les qualités à **effet résiduel court en dernier** (plus proche de la course)
- Entraîner les qualités à **effet résiduel long en premier** (début de prépa)
- Ordre optimal général : Force/Volume → Seuil/TTE → VO2max → Race-Pace → Taper

### Séquençage par Limiteur Principal
| Limiteur #1 | Bloc 1 (Base) | Bloc 2 (Build) | Bloc 3 (Spécifique) | Bloc 4 (Taper) |
|-------------|---------------|----------------|---------------------|----------------|
| VO2max bas | Volume Z2 + Force | VO2max Billat intensive | Race-pace + rappels VO2max | Rappels courts VO2max |
| VLamax haute | Z2 long Train Low | Z2 + sweet spot long | Race-pace + Z2 maintien | Z2 rappel + race-pace |
| TTE faible | Volume Z2 + Force | Seuil Norvégienne progressive | Seuil long + race-pace | Rappels seuil courts |
| FTP/kg bas | Force max + Z2 | Sweet spot + over-unders | Race-power + rappels SS | Rappels SS courts |
| Économie basse | Force max + plio | SFR + côtes + force maintien | Race-pace + strides | Strides + activation |
| FatMax bas | Train Low Z2 volume | Train Low + SL progressive | Gut Training + simulation | Z2 rappel + nutrition |
| Durabilité | Volume Z2 progressif | SL fast finish + briques | Simulations race-pace longues | SL courte Z2 |

### Règle de Non-Interférence
- **JAMAIS** 2 blocs VO2max consécutifs (>6 sem = surentraînement sympathique)
- **JAMAIS** bloc force max + bloc VO2max le même micro-cycle (interférence AMPK/mTOR)
- Force le matin, endurance le soir = OK. Inverse = interférence prouvée (Doma 2015)
- Après un bloc VLamax↓ (Z2 long) : le seuil/TTE progresse naturellement (synergie)

## FLEXIBILITÉ MÉTABOLIQUE AVANCÉE (San-Millán 2018, Maunder 2023)

### Le Concept
Un athlète d'endurance élite brûle plus de graisse à plus haute intensité (FatMax élevé) → il épargne le glycogène → il "explose" moins. La flexibilité métabolique = la capacité à basculer efficacement entre oxydation lipidique et glucidique.

### Crossover Point (Brooks 1994)
- **Crossover** = intensité où l'oxydation des glucides dépasse celle des lipides
- Athlète entraîné : crossover à ~75-80% VO2max. Non-entraîné : ~50-60%
- Objectif TFCL™ : repousser le crossover vers la droite → plus de graisse brûlée à plus haute intensité

### Périodisation Métabolique (Burke & Hawley 2018)
| Phase | Stratégie Métabolique | Objectif |
|-------|----------------------|----------|
| Base (4-6 sem) | Train Low 2-3x/sem (Z2 à jeun, SL glycogène appauvri) | ↑ Densité mitochondriale, ↑ enzymes β-oxydation |
| Build (4-6 sem) | Train Low 1-2x/sem + Gut Training démarrage 30-40g/h | Maintien FatMax + adaptation gastrique |
| Spécifique (3-4 sem) | Train High pour intensité (full glycogène), Gut Training 60-90g/h | Performance max, validation ravitaillement |
| Taper (1-2 sem) | Carb loading progressif 8-12g/kg/j J-3 à J-1 | Supercompensation glycogène |

### Sleep Low / Train Low Protocoles (Marquet 2016)
- **Sleep Low** : séance intense le soir → dîner sans glucides → séance Z2 à jeun le matin
  - Prouvé : ↑10% performances 10K en 3 semaines (vs contrôle iso-calorique)
  - UNIQUEMENT sur séances Z1-Z2 le matin. JAMAIS d'intensité en état glyco-appauvri
- **Train Low** classique : séance Z2 à jeun 1h30-2h max. Eau + sel + caféine OK
  - Fréquence : 2-3x/sem en Base, 1-2x/sem en Build, 0-1x/sem en Spécifique
  - JAMAIS chez les femmes en restriction calorique (risque RED-S)

## SCIENCE DE LA RÉCUPÉRATION & FENÊTRES D'ADAPTATION (Kellmann 2018, Dupuy 2018)

### Fenêtres de Récupération
| Type de séance | Récupération complète | Récupération partielle (prêt pour Z2) |
|----------------|----------------------|--------------------------------------|
| Z2 endurance | 12-24h | 6-12h |
| Seuil/Sweet spot | 24-48h | 12-24h |
| VO2max intervalles | 48-72h | 24-48h |
| Force max | 48-72h | 24-48h |
| SL >2h30 | 48-72h | 24-36h |
| Brique vélo→CAP | 36-48h | 18-24h |
| Course/Simulation | 72-96h | 48-72h |

### Implication pour la Planification
- **JAMAIS** 2 séances VO2max à <48h d'intervalle
- **JAMAIS** seuil le lendemain de force max (interférence concentric + fatigue SNC)
- Séquence optimale intra-semaine : Repos → Intensité #1 → Z2 → Z2 → Intensité #2 → Z2 → SL
- La récupération est une CAPACITÉ ENTRAÎNABLE : les athlètes entraînés récupèrent plus vite

### Stratégies de Récupération Actives (mentionner dans consignes coach)
1. **Sommeil** : 7-9h/nuit. Impact >30% sur la récupération. Non-négociable.
   - Sieste 20-30min : bénéfice prouvé si nuit <7h ou double séance
2. **Nutrition post-effort** : 1-1.2g/kg glucides + 0.3g/kg protéines dans les 30min (Golden Window)
3. **Compression** : 60-90min post-effort. Effet modéré mais réel sur CK et DOMS (Born 2013)
4. **Eau froide / bain froid** : 10-15min @10-15°C. Efficace pour réduire DOMS MAIS inhibe l'adaptation si chronique → réserver aux phases de compétition, PAS en phase de développement
5. **Massage / foam roller** : 15-20min. Réduction DOMS, aucun effet négatif sur l'adaptation
6. **Récupération active Z1** : 20-30min jogging ou vélo léger. Supérieur au repos passif pour clearance lactate

### Sommeil & Performance (Mah 2011, Simpson 2017)
- Athlètes dormant <6h : risque blessure ×1.7, temps de réaction ↓, VO2max sous-estimé
- Mentionner le sommeil dans les consignes coach des semaines de charge élevée :
  "Semaine de charge élevée : viser 8-9h de sommeil. Sieste 20min post-déjeuner si possible."

## MICRO-CYCLE UNDULATING — Variation Intra-Semaine (Rhea 2002, Plisk & Stone 2003)

### Principe
La variation quotidienne de la charge (Daily Undulating Periodization) prévient la monotonie et maintient des adaptations multiples simultanément. C'est la clé pour les plans >12 semaines.

### Pattern Recommandé Intra-Semaine
| Jour | Type de charge | RPE cible | Exemple |
|------|---------------|-----------|---------|
| Lundi | Repos / Récupération | 0-2 | Repos complet ou mobilité |
| Mardi | Haute intensité #1 | 7-9 | Séance clé #1 (VMA/Seuil) |
| Mercredi | Récupération active / Volume | 4-5 | EF Z2, technique |
| Jeudi | Intensité modérée | 6-7 | Tempo, sweet spot, force |
| Vendredi | Récupération / Pré-load | 3-4 | EF légère, renfo léger |
| Samedi | Volume + qualité #2 | 7-8 | SL progressive, brique |
| Dimanche | Récupération active | 4-5 | EF + strides, core |

### Variation de la Charge Hebdomadaire (Undulating Weekly)
- Sem 1 : 85% charge cible (adaptation)
- Sem 2 : 95% charge cible (stimulus)
- Sem 3 : 100-105% charge cible (surcharge)
- Sem 4 : 60-65% charge cible (décharge)
- Ce pattern = charge ondulée 3:1. Pour >45 ans ou fragile : 2:1 (2 sem charge, 1 sem décharge)

### Règle Anti-Monotonie (Foster 1998)
- Calculer : Monotonie = Charge moyenne quotidienne / Écart-type quotidien
- Si Monotonie > 2.0 → trop uniforme → varier les intensités et durées
- Plan de qualité : chaque semaine doit avoir des jours très différents (RPE 2 à RPE 8-9)

## TAPERING — LA SCIENCE DE L'AFFÛTAGE (Mujika & Padilla 2003, Bosquet 2007, Pyne 2009)

### Modèles de Taper Scientifiquement Validés
Le taper est la phase la PLUS CRITIQUE du plan. Un bon taper = +3 à +6% de performance. Un mauvais taper = performance gâchée.

**4 modèles de taper :**
| Modèle | Description | Gain estimé | Quand l'utiliser |
|--------|-------------|-------------|-----------------|
| Exponentiel rapide (τ=4-5j) | Réduction volume rapide, maintien intensité | +3-6% | IM, 70.3, Marathon — MODÈLE DE RÉFÉRENCE TFCL™ |
| Exponentiel lent (τ=7-8j) | Réduction plus graduelle | +2-4% | Ultra-trail, athlètes anxieux à la coupure |
| Linéaire | Réduction uniforme volume | +1-3% | Semi, 10K, 5K (taper court) |
| Step (palier) | Réduction brutale en 1 step | +0-2% | NON RECOMMANDÉ (risque déconditionnement) |

**Protocole Taper Exponentiel Mujika (RÉFÉRENCE TFCL™) :**
- **Volume** : réduction de 40-60% sur 8-14j (IM) ou 7-10j (Marathon) ou 5-7j (Semi/10K)
  - Jour 1 taper : 80% volume habituel
  - Mi-taper : 50-60%
  - Derniers 3j : 30-40%
- **Intensité** : MAINTENUE à 100% — c'est la clé. Réduire le volume, PAS l'intensité
  - Rappels courts @race-pace : 3-5min blocs, 2-3x dans la semaine
  - Rappels @VMA/seuil : 1 séance rappel de 10-15min d'effort effectif
- **Fréquence** : réduction de 20% max (si 6 séances/sem → min 5). Ne PAS couper des jours entiers
- **Durée optimale du taper** :
  - 5K/10K : 5-7 jours
  - Semi : 7-10 jours
  - Marathon : 10-14 jours (voire 21j si volume précédent >150km/sem)
  - 70.3 : 10-12 jours
  - IM : 14-21 jours
  - Ultra-trail : 14-21 jours

**Erreurs fatales de taper :**
- ❌ Couper l'intensité (le corps perd la "mémoire" de vitesse)
- ❌ Taper trop long (>3 sem pour un marathon = déconditionnement)
- ❌ Taper trop court (<5j pour un IM = fatigue résiduelle)
- ❌ Ajouter une SL de dernière minute "pour se rassurer" → dernière SL à J-10 minimum pour IM/Marathon
- ❌ Augmenter le volume de renfo pendant le taper
- ❌ Tester du nouveau matériel/nutrition pendant le taper

### Supercompensation (Viru & Viru 2000, Zatsiorsky 2006)
Le taper exploite le phénomène de supercompensation : après une phase de charge élevée, la réduction de charge provoque un rebond de performance SUPÉRIEUR au niveau pré-charge.
- **Fenêtre optimale** : 8-14j après le début de la réduction pour les systèmes aérobies
- **Séquence critique** : 3 sem charge élevée → 1 sem step-back → 1-2 sem taper → COURSE = pic de forme
- Si la dernière phase de charge était insuffisante, le taper ne produit PAS de supercompensation → la phase Build/Spécifique doit être suffisamment chargée

## CRITICAL POWER / W' — MODÈLE DE PACING AVANCÉ (Jones 2019, Skiba 2012, Vanhatalo 2011)

### Le Modèle CP/W'
Le modèle Critical Power décompose la performance en 2 composantes :
- **CP (Critical Power)** : puissance soutenable indéfiniment sans accumulation de fatigue (≈ MLSS/FTP). Mesurée en watts (vélo) ou en allure (CP running ≈ allure 60min)
- **W' (W prime)** : réserve anaérobie finie en kilojoules (kJ). Épuisée quand l'effort dépasse CP. Se reconstitue quand l'effort est sous CP

### Application au Pacing Course
| Distance | Stratégie CP/W' | Détails |
|----------|-----------------|---------|
| 5K | Dépenser ~60-70% W' de manière contrôlée | Départ @103-105% CP, derniers 1.5km : utiliser W' restant |
| 10K | Rester proche de CP, dépenser ~40-50% W' | Even pace @100-102% CP, kick final 600m |
| Semi | Effort @96-98% CP, W' quasi intact | Neg split : 1ère moitié @96% CP, 2ème @99-100% CP |
| Marathon | Effort @85-90% CP, W' intact | Even split strict. JAMAIS au-dessus de CP sauf sprint final 200m |
| IM vélo | @75-82% CP (≈ 70-78% FTP), W' intact | Discipline totale. W' = réserve pour la CAP |
| 70.3 vélo | @85-92% CP (≈ 80-88% FTP) | Plus agressif qu'IM mais contrôlé |

### Pacing Negative Split — La Référence Mondiale
**Pourquoi le negative split est supérieur :**
1. Départ conservateur → glycogène épargné → finish plus fort
2. Température corporelle monte progressivement → pas de surchauffe précoce
3. Psychologiquement puissant : dépasser des concurrents en 2ème moitié
4. Kipchoge, Kiptum, Bekele : TOUS utilisent le neg split ou even split

**Implémentation dans le plan :**
- Phase Build : SL avec derniers 30% @allure course (entraîner le neg split)
- Phase Spécifique : simulations complètes avec neg split (marge -3-5s/km début vs fin)
- Consignes course : "Premiers 5km = allure cible +5s/km. Km 5-30 = allure cible. Km 30-42 = allure cible -3-5s/km si les sensations le permettent."

## ATHLÈTE FÉMININE — PÉRIODISATION HORMONALE (Sims 2016, McNulty 2020, Bruinvels 2022, Elliott-Sale 2020)

### Le Cycle Menstruel et la Performance
**Phase folliculaire (J1-J14, règles → ovulation) :**
- Oestrogènes ↑ progressivement → capacité d'entraînement optimale
- **Fenêtre de haute tolérance** : J5-J14 = meilleur moment pour charge élevée, intensité, force max
- Récupération plus rapide, synthèse protéique améliorée
- Capacité VO2max et seuil anaérobie = peak
- **Prescription** : planifier les séances clés les plus exigeantes (VO2max, force max, SL longue)

**Phase ovulatoire (J12-J16) :**
- Pic d'oestrogènes → laxité ligamentaire ↑ → risque blessure LCA ×3-6 (Hewett 2007)
- **Prescription** : prudence sur la pliométrie et les changements de direction. Renfo stabilisateur

**Phase lutéale (J15-J28) :**
- Progestérone ↑ → température corporelle ↑ 0.3-0.5°C, FC ↑ 5-10bpm, ventilation ↑
- Utilisation glycogène ↑ (besoin carbs ↑ +200-300kcal/j)
- Rétention eau, symptômes PMS possibles, récupération ralentie
- **Prescription J15-J21 (lutéale moyenne)** : maintenir le volume mais réduire l'intensité de 5-10%. Z2 prioritaire
- **Prescription J22-J28 (lutéale tardive/PMS)** : décharge naturelle. Réduire volume -20-30%. Yoga, mobilité, Z1 active
- **JAMAIS de test de performance en phase lutéale** → résultats faussement bas

### Adaptation du Plan pour Athlètes Féminines
**Si le cycle est connu (app de suivi) :**
- Séances clés #1 et #2 = phase folliculaire (J5-J14)
- Phase lutéale = volume Z2 + récupération + renfo léger
- Décharge = calquer sur la phase pré-menstruelle (J25-J28)
- **Micro-cycle de 28j** au lieu de 7j linéaire = adaptation optimale

**Si le cycle n'est pas connu :**
- Appliquer la règle standard mais mentionner dans les consignes coach :
  "Si vous êtes en phase lutéale (post-ovulation), réduisez l'intensité de 5-10% et augmentez les glucides."

**Si contraception hormonale (pilule, implant) :**
- Le cycle hormonal est supprimé → périodisation hormonale non applicable
- Appliquer le plan standard

### RED-S (Relative Energy Deficiency in Sport) — Mountjoy 2023
- **Red flags** : aménorrhée >3 mois, fractures de stress, fatigue chronique, perte de poids involontaire, bradycardie
- **Si suspecté** : réduire volume de 30%, ARRÊTER le Train Low, augmenter apport calorique +300-500kcal/j
- **JAMAIS de Train Low pour une athlète à risque RED-S**
- Mentionner dans les consignes coach si le profil est féminin et volume élevé

## HRV-GUIDED TRAINING — ENTRAÎNEMENT PILOTÉ PAR LA VARIABILITÉ CARDIAQUE (Plews 2013, 2017, Kiviniemi 2007)

### Principe
Le HRV (Heart Rate Variability) mesure l'état du système nerveux autonome. Un HRV bas = fatigue accumulée, stress, récupération insuffisante. Un HRV élevé = système parasympathique dominant = prêt pour l'intensité.

### Protocole HRV-Guided (Plews & Laursen)
- **Mesure quotidienne** : au réveil, couché, 1-2min avec app (HRV4Training, Elite HRV, Oura)
- **Baseline** : moyenne mobile 7 jours = référence. Variabilité normale = ±0.5 CV (Coefficient of Variation)
- **Décisions entraînement :**
  - HRV normal (dans la bande 0.5 CV) → suivre le plan prévu
  - HRV bas (< baseline - 0.5 CV) pendant 1 jour → plan prévu mais RPE surveillance
  - HRV bas pendant 2 jours consécutifs → passer en Z2 uniquement
  - HRV bas pendant 3+ jours → repos complet ou mobilité uniquement
  - HRV élevé (> baseline + 0.5 CV) → journée idéale pour séance clé haute intensité

### Tendance HRV et Périodisation
- **HRV en tendance baissière sur 7j** = charge cumulative trop élevée → anticiper la décharge
- **HRV en tendance haussière** = l'athlète absorbe bien la charge → possible de maintenir ou augmenter
- **HRV plat avec fatigue subjective** = dissociation → prioriser le ressenti subjectif

### Intégration dans le Plan TFCL™
- Mentionner dans les consignes coach des semaines de charge élevée :
  "Si HRV < baseline depuis 2 jours : remplacer la séance clé par du Z2 récupération. Reporter la séance clé de 24h."
- Phase Taper : HRV doit remonter. Si HRV ne remonte pas pendant le taper → taper insuffisant → prolonger de 2-3j

## INTERFÉRENCE CONCURRENT TRAINING — Force × Endurance (Hickson 1980, Doma 2015, Fyfe 2014, Murach 2016)

### Le Problème
L'entraînement simultané de force (mTOR pathway) et d'endurance (AMPK pathway) crée une interférence moléculaire. L'AMPK activée par l'endurance INHIBE mTOR → réponse hypertrophique/force réduite.

### Règles Anti-Interférence (Applicables dans le plan)
1. **Séquençage intra-journée** :
   - Force MATIN → Endurance SOIR (6-8h entre les deux) = OPTIMAL
   - Endurance MATIN → Force SOIR = interférence modérée (acceptable si pas d'alternative)
   - Force + Endurance <3h d'écart = interférence MAXIMALE → ÉVITER
2. **Séquençage intra-semaine** :
   - JAMAIS force max le lendemain d'une séance VO2max (fatigue SNC cumulative)
   - Force max le lendemain d'un jour Z2 = OK
   - Force max le lendemain d'un jour repos = OPTIMAL
3. **Nutrition anti-interférence** :
   - 25-30g protéines + 40g glucides dans les 30min post-force (maximiser mTOR)
   - Si séance endurance suit dans <6h : ajouter 1g/kg glucides immédiatement post-force
4. **Type de force selon la phase** :
   - Phase Base : force max (4-6 reps @80-90% 1RM) → 2x/sem
   - Phase Build : force explosive (3-5 reps @70-80% 1RM, tempo rapide) → 2x/sem
   - Phase Spécifique : maintien (2-3 séries, mêmes charges, fréquence réduite 1x/sem)
   - Phase Taper : arrêt force max, 1 séance activation légère/sem

### Rate of Force Development (RFD) — Aagaard 2010
- Le RFD (vitesse de développement de la force) est plus important que la force max pour l'économie de course
- Entraîner le RFD : mouvements explosifs (squat jump, box jump, bounds) + charges modérées accélérées
- Bénéfice : -5% coût énergétique par stride si RFD amélioré → marathon plus rapide à VO2max égale

## IMMUNITÉ & CHARGE D'ENTRAÎNEMENT — Le Modèle J-Curve (Nieman 1994, Walsh 2011, Simpson 2020)

### Le Concept
- **Sédentaire** : risque infection = modéré
- **Exercice modéré régulier** : risque infection = RÉDUIT (-40-50%)
- **Exercice intense/volume élevé** : risque infection = AUGMENTÉ (+100-300%) = la "J-curve"
- **Fenêtre ouverte** (open window) : 3-72h post-exercice intense → immunodépression transitoire

### Règles Immunitaires pour le Plan
1. **Semaines de charge >90% du peak** : risque infectieux élevé
   - Consigne coach : "Semaine de charge haute. Hygiène rigoureuse, sommeil 8h+, vitamine D 2000UI/j, éviter contact malades"
2. **Post-compétition/simulation** : fenêtre immunitaire ouverte 24-72h
   - Consigne : "Récupération immunitaire : pas d'entraînement intense pendant 48-72h post-simulation"
3. **Semaine pré-course** : éviter tout stress immunitaire
   - Éviter foules, transports longs, manque de sommeil, nouveau régime alimentaire
4. **Périodes à risque dans le plan** :
   - Transition Build → Spécifique (charge maximum) : 1 semaine décharge obligatoire
   - Semaine -3 (dernière grosse semaine avant taper) : mentionner le risque

### Supplémentation Evidence-Based (Walsh 2019)
- Vitamine D : 1000-2000 UI/j si déficient (>40% des athlètes en Europe)
- Vitamine C : 200-1000mg/j pendant les blocs de charge (pas en continu)
- Probiotiques : souches Lactobacillus pendant les phases de volume élevé
- **NON recommandé** : antioxydants hautes doses (interfèrent avec adaptations à l'entraînement)

## PACING AVANCÉ & RACE EXECUTION (Abbiss & Laursen 2008, Roelands 2013, Tucker & Noakes 2009)

### Stratégies de Pacing par Distance
| Distance | Stratégie optimale | Détails |
|----------|-------------------|---------|
| 5K | Reverse-J | Départ rapide 200m, stabiliser, kick 600m. Pas d'even pace (trop conservateur) |
| 10K | Slight negative | 1ère moitié @101% allure cible, 2ème @99%. Tolérance ±3s/km |
| Semi | Negative split | 1ère moitié @allure cible +3-5s/km, 2ème moitié @allure cible -2-3s/km |
| Marathon | Even → Negative | Km 1-30 = allure cible stricte. Km 30-42 = si sensations OK, accélérer progressivement |
| IM | Conservative start | Nat @85-90% effort max. Vélo @75-80% FTP (DISCIPLINE). CAP = neg split |
| 70.3 | Moderate aggressive | Nat @90% effort. Vélo @82-88% FTP. CAP = neg split |
| Ultra-trail | Ultra-conservative | Premiers 30% = retenue maximale. Marche en côte dès le début. Accélérer après mi-course SI tout va bien |

### Le "Central Governor" (Noakes 2012)
Le cerveau régule inconsciemment l'effort pour protéger l'organisme. Implication :
- L'athlète a TOUJOURS une réserve (le "sprint final" le prouve)
- Entraîner le cerveau à tolérer l'inconfort → les séances seuil long et SL progressive sont des entraînements MENTAUX
- Stratégie course : s'auto-évaluer à chaque 5km. Si RPE < cible → accélérer légèrement. Si RPE > cible → maintenir (NE PAS ralentir sauf si RPE 10/10)

### Gestion des Conditions Météo (Ely 2007, Périard 2021)
| Température | Ajustement allure | Ajustement hydratation |
|-------------|-------------------|----------------------|
| <10°C (froid) | +0-2s/km (optimal pour marathon) | 400-600mL/h |
| 10-18°C | Allure cible standard | 500-700mL/h |
| 18-25°C | Allure cible -3-5s/km | 700-900mL/h + sodium |
| 25-30°C | Allure cible -8-12s/km | 800-1000mL/h + glace |
| >30°C | Allure cible -15-20s/km, objectif survie | 1000-1200mL/h + refroidissement actif |

Intégrer ces tables dans les consignes de la Race Week : "Consultez la météo 48h avant. Si >25°C, réduire l'ambition d'allure de 8-12s/km."

### Plan B Course (OBLIGATOIRE en Phase Taper)
Tout plan TFCL™ de qualité inclut un **Plan B** dans les consignes de la dernière semaine :
- Plan A : conditions optimales, allure cible, objectif temps
- Plan B : chaleur / vent / pluie / mauvaises sensations → -5% allure cible, objectif "bien courir"
- Plan C : problème médical / GI issues / blessure → objectif "terminer", marche OK, abandon si douleur aiguë

## PSYCHOLOGICAL PERIODIZATION — Périodisation Mentale (Birrer & Morgan 2010, Brick 2016, McCormick 2019)

### Le Coût Cognitif de l'Entraînement
L'entraînement a un coût MENTAL en plus du coût physique. La fatigue mentale ↓ performance de 2-5% (Marcora 2009).

### Périodisation des Stratégies Mentales
| Phase | Focus Mental | Outils |
|-------|-------------|--------|
| Base | Motivation intrinsèque, plaisir, connexion au "pourquoi" | Journal d'entraînement, objectifs intermédiaires |
| Build | Résilience, gestion de l'inconfort | Self-talk positif pendant les séances seuil ("fluide", "patient", "relâché") |
| Spécifique | Visualisation, simulation mentale | Visualisation pré-séance 5min (se voir exécuter la course), dress rehearsal |
| Taper | Confiance, gestion de l'anxiété pré-compétition | Revue des accomplissements, "trust the training", routines pré-course |

### Intégration dans les Consignes Coach
- **Chaque séance clé** : ajouter un focus mental ("Focus : rester relâché dans les derniers blocs")
- **SL simulation** : inclure consigne mentale ("Visualiser le parcours de course pendant les derniers 10km")
- **Race Week** : consigne mentale quotidienne ("J-3 : lister 3 raisons pour lesquelles vous êtes prêt")

### Gestion du "Mental Dark Spot" en Ultra/Marathon
- Km 30-35 marathon (le "mur") = crise physique + mentale
- Km 60-80% ultra = point bas psychologique typique
- **Stratégie** : association (focus technique, cadence, respiration) en 1ère moitié → dissociation (musique mentale, comptage, visualisation) quand la douleur arrive
- Entraîner cette transition en séances SL spécifiques : "À mi-parcours, basculez du focus technique au focus dissociatif"

## LACTATE DYNAMICS AVANCÉES — Au-delà du Seuil (Brooks 2018, San-Millán 2023, Mader 2003)

### Le Lactate Shuttle (Brooks)
Le lactate n'est PAS un déchet. C'est un carburant inter-organes :
- Les fibres rapides (type II) PRODUISENT du lactate → les fibres lentes (type I) le CONSOMMENT comme carburant
- Un athlète endurant = meilleur "recycler" de lactate → seuil plus élevé
- Entraîner le shuttle = entraîner la capacité de clearance : séances Z2 longues + seuil long

### Deux Seuils (San-Millán & Brooks 2018)
| Seuil | Lactate | Description | Zone TFCL |
|-------|---------|-------------|-----------|
| LT1 (seuil aérobie) | ~2.0 mmol/L | Au-dessus = accumulation lente. Base du training aérobie | Z2-Z3 transition |
| LT2 (MLSS/OBLA) | ~4.0 mmol/L | Steady-state max. Au-dessus = accumulation exponentielle | Z5 Seuil |

### FatMax & LT1 — Le Lien Clé
- FatMax (intensité d'oxydation maximale des graisses) se situe typiquement juste sous LT1
- Entraîner à FatMax (Z2 "haut", juste sous LT1) = maximiser la fat oxidation sans accumuler de lactate
- Application IM : les sorties longues Z2 doivent être à FatMax intensity, PAS à Z1 passive
- Mesure : FatMax typiquement à 55-65% VO2max (non-entraîné) → 65-80% VO2max (élite endurant)

### Glycogen Threshold (Impey 2018)
- Il existe un seuil de glycogène musculaire (~300 mmol/kg dry weight) en-dessous duquel la signalisation moléculaire d'adaptation est maximisée
- **Train Low "ciblé"** : démarrer la séance Z2 avec glycogène partiellement appauvri (post-séance intense la veille sans re-feeding) → maximiser les adaptations mitochondriales
- C'est le mécanisme du "Sleep Low / Train Low" (Marquet 2016) : l'adaptation vient du NIVEAU de glycogène, pas juste du jeûne

## ADVANCED BRICK PROTOCOLS — Triathlon (Millet & Vleck 2000, Bonacci 2011, Walsh 2017)

### Physiologie de la Transition Vélo→CAP
- **Run off the bike** : les premières minutes de CAP post-vélo sont caractérisées par :
  - FC ↑ 10-15 bpm vs CAP isolée à même allure
  - VO2 ↑ 5-8% (coût énergétique augmenté)
  - Cadence perturbée (pattern moteur modifié par le vélo)
  - Perception d'effort ↑ (RPE +1-2 points)
- Ces effets diminuent avec l'entraînement spécifique brique → la brique EST une compétence

### Types de Briques (du plus facile au plus exigeant)
| Type | Description | Quand | Niveau |
|------|-------------|-------|--------|
| Brique transition | Vélo Z2 1h + CAP 15min Z2 (focus transition fluide) | Phase Base | Tous |
| Brique allure | Vélo @race-power 1h30 + CAP 20-30min @allure course | Phase Build | AG+ |
| Brique pre-fatigued | Vélo avec intervalles + CAP @allure course immédiat | Phase Spécifique | Competitor+ |
| Brique simulation | Vélo 3-5h @race-power + CAP 45-90min @race-pace + Gut | Phase Spécifique | Competitor+ |
| Brique OWS | Nat OWS + Vélo + CAP enchaînés | Phase Spécifique (1-2x max) | Competitor+ |

### Règles Briques TFCL™
1. **Progression** : commencer par transition courte (15min CAP Z2 post-vélo) → allonger et intensifier progressivement
2. **Fréquence** : 1x/sem en Build, 1-2x/sem en Spécifique (remplace une séance CAP solo)
3. **Transition** : entraîner la transition réelle (changer chaussures, ceinture, casquette) → chronomètre la T2
4. **CAP post-vélo** : les 5 premières minutes = CONTRAINTE (cadence élevée 185+ spm, pas d'allure cible). Laisser le corps s'adapter
5. **Gut Training intégré** : toute brique en phase Spécifique = test nutrition en conditions réelles

## DETRAINING & RETRAINING — Gestion des Interruptions (Mujika & Padilla 2000, Neufer 1989)

### Taux de Perte de Condition
| Durée d'arrêt | Perte VO2max | Perte Force | Perte Seuil | Perte Endurance |
|---------------|-------------|-------------|-------------|-----------------|
| 1 semaine | ~1% | ~0% | ~2% | ~3% |
| 2 semaines | ~3-4% | ~2% | ~5% | ~8% |
| 4 semaines | ~6-8% | ~5% | ~10% | ~15% |
| 8 semaines | ~15-20% | ~10% | ~18% | ~25% |
| 12+ semaines | ~20-25% | ~15% | ~25% | ~35% |

### Principes de Retraining
1. **Le retraining est plus rapide que le training initial** : "muscle memory" (Staron 1991)
2. **Règle 1:2** : pour chaque semaine d'arrêt, 2 semaines pour retrouver le niveau antérieur
3. **Protocole de reprise** :
   - Sem 1 : 40-50% volume habituel, Z1-Z2 uniquement
   - Sem 2 : 60-70%, 1 séance tempo légère
   - Sem 3 : 75-85%, réintroduction séance clé #1
   - Sem 4+ : 90-100%, retour progressif au plan
4. **Force : priorité #1 en reprise** : la force se perd plus lentement mais se regagne lentement → maintenir absolument

### Impact sur le Plan
- Si l'athlète mentionne une interruption récente → adapter les premières semaines du plan (réduction volume)
- Mentionner dans les consignes de la première semaine : "Si vous reprenez après une coupure >10j, réduisez le volume de cette semaine de 30%"

## CRITÈRES DE QUALITÉ D'UN PLAN TFCL™ — CHECKLIST D'EXCELLENCE

### Un Plan de Classe Mondiale DOIT :
1. ✅ **Adresser chaque limiteur identifié** avec au moins 1 séance clé spécifique/sem
2. ✅ **Respecter la polarisation 80/20** (80% Z1-Z2, 20% Z4-Z5, minimiser Z3)
3. ✅ **Progresser le volume de 3-8%/sem** selon le niveau (jamais +10%)
4. ✅ **Inclure 1 jour de repos complet/sem** (vrai repos, pas récup active)
5. ✅ **Varier le contenu** d'une semaine à l'autre (jamais 2 semaines identiques)
6. ✅ **Respecter les fenêtres de récupération** (48h entre 2 intensités similaires)
7. ✅ **Nommer chaque séance précisément** avec zone/allure/durée/reps
8. ✅ **Inclure échauffement et retour au calme** dans les séances d'intensité
9. ✅ **Intégrer la nutrition** (Train Low, Gut Training, post-effort) dans les consignes
10. ✅ **Mentionner la cadence** (CAP spm, vélo RPM) dans chaque séance
11. ✅ **Inclure les séances clés 🔑** avec justification du lien limiteur→séance
12. ✅ **Durabilité** : au moins 1 SL avec fast finish ou neg split/sem en Build/Spécifique
13. ✅ **Race simulation** : au moins 1 simulation complète en Phase Spécifique
14. ✅ **Plan de course** : inclus dans la dernière semaine (pacing, ravito, mental)
15. ✅ **Séquençage de blocs** : respecter les effets résiduels (Issurin) et les règles de non-interférence
16. ✅ **Micro-cycle undulating** : variation RPE 2→9 dans la semaine, pas de monotonie
17. ✅ **Taper scientifique** : modèle exponentiel Mujika (réduire volume, MAINTENIR intensité, rappels @race-pace)
18. ✅ **Plan B course** : stratégie alternative si conditions défavorables mentionnée en Race Week
19. ✅ **Athlète féminine** : si profil féminin, adapter les consignes au cycle menstruel (charge en folliculaire, décharge en lutéale)
20. ✅ **Pacing strategy** : neg split ou even split, JAMAIS positive split. Points de contrôle d'allure inclus
21. ✅ **Fenêtres immunitaires** : consignes hygiène/sommeil pendant les semaines de charge haute
22. ✅ **HRV contingency** : consigne "si HRV bas 2j → Z2 uniquement" dans les semaines de charge
23. ✅ **Anti-interférence force/endurance** : force le matin, endurance le soir. JAMAIS force post-VO2max
24. ✅ **Briques progressives** (triathlon) : de transition courte Z2 → simulation race-pace complète
25. ✅ **Préparation mentale** : focus mental dans chaque séance clé, visualisation en phase spécifique

### Anti-Patterns — ERREURS FRÉQUENTES À ÉVITER :
1. ❌ **Monotonie** : même séance Z2 1h copié-collé chaque mercredi pendant 12 sem
2. ❌ **Z3 excessive** : trop de tempo "confortable" qui n'est ni Z2 ni Z5
3. ❌ **Pas de progression** : même volume et intensité de sem 1 à sem 12
4. ❌ **SL sans objectif** : "Sortie longue 2h" sans indication d'allure, de nutrition, de cadence
5. ❌ **Doubles séances absentes** en triathlon (1 séance/jour pour un IM Competitor = erreur)
6. ❌ **Ignorer les limiteurs** : prescrire du seuil alors que VLamax trop haute est le limiteur #1
7. ❌ **Taper trop court** : <7j pour un marathon, <10j pour un IM
8. ❌ **Pas de décharge** : 12 semaines de charge continue sans semaine de récup
9. ❌ **Intensité en Train Low** : JAMAIS de Z4-Z5 à jeun ou glycogène appauvri
10. ❌ **Vélo dominant pour un objectif running** : un semi-marathonien n'a pas besoin de 3 vélos/sem
11. ❌ **Force abandonnée après la Base** : la force doit être maintenue (1x/sem) toute la prépa
12. ❌ **Copier un plan élite pour un age group** : adapter le volume ET la fréquence, pas juste réduire
13. ❌ **Ignorer la durabilité** : pas de SL progressive ou fast finish → athlète qui "explose" en course
14. ❌ **Séquençage inversé** : VO2max en Base et volume Z2 en Spécifique (sauf Reverse Perio Lorang pour IM)
15. ❌ **Récup insuffisante entre intensités** : <48h entre 2 séances VO2max ou force max
16. ❌ **Taper sans rappels intensité** : couper l'intensité pendant le taper (seul le volume baisse, l'intensité reste)
17. ❌ **Force post-VO2max** : séance force max le lendemain d'une séance VO2max (interférence SNC)
18. ❌ **Plan sans Plan B course** : ne pas mentionner de stratégie alternative si conditions défavorables
19. ❌ **Ignorer le cycle menstruel** : prescrire une semaine de surcharge en phase lutéale tardive pour une athlète féminine
20. ❌ **Pacing positive split** : plan de course qui part trop vite → catastrophe métabolique garantie
21. ❌ **Train Low pour athlète à risque RED-S** : restriction glycogène chez une femme en déficit énergétique

## GARDE-FOUS SÉCURITÉ AVANCÉS

### Red Flags — Arrêt Immédiat (Mentionner dans consignes si contexte pertinent)
- Douleur thoracique à l'effort → arrêt + consultation urgente
- Malaise/syncope → arrêt + consultation
- Douleur articulaire aiguë apparue pendant la séance → arrêt séance, RICE, évaluer J+2
- RPE 10/10 sur séance Z2 → signe majeur de fatigue/maladie → repos 48h

### Règle des 10% (ACSM)
- Ne JAMAIS augmenter le volume hebdo de plus de 10% (kilométrage ou durée)
- Appliquer un "step back" toutes les 3-4 semaines (ratio 3:1 ou 2:1)
- Après un step back : le volume de la semaine de reprise = volume de la semaine pré-step back (pas au-delà)

### Blessures Fréquentes et Prévention Intégrée
- **Syndrome de la bandelette ilio-tibiale** : renfo fessier (clam, band walks) 3x/sem
- **Périostite tibiale** : excentrique mollets (Alfredson), augmentation cadence +5-10%, surface souple
- **Tendinopathie achilléenne** : excentrique Alfredson 2x/jour, réduire côtes et vitesse
- **Fasciite plantaire** : renfo intrinsèques pieds (serviette, marbles), étirements mollets/fascia
- **Douleur genou (runner's knee)** : renfo quadriceps (wall sits, split squats), step-down excentrique
- Intégrer les exercices de prévention pertinents dans les séances Renfo du plan

## 🔄 DIVERSITÉ ET PROGRESSION DES SÉANCES (CRITIQUE — Anti-Répétition)

⚠️ C'est la règle la plus fréquemment violée. Un plan où les séances se répètent à l'identique semaine après semaine est un plan MÉDIOCRE. L'adaptation physiologique nécessite une surcharge PROGRESSIVE et une stimulation VARIÉE.

### Règle #1 : JAMAIS la même séance 2 semaines consécutives
- Si Semaine 3 = "5×1000m @VMA r=2min", Semaine 4 DOIT être différente : "6×800m @VMA r=90s" ou "3×2000m @95% VMA r=3min" ou "Pyramide 400-800-1200-800-400 @VMA"
- Si Semaine 5 = "2×20min @88% FTP", Semaine 6 → "3×15min @90% FTP" ou "1×35min @86% FTP" ou "Over-Under 4×(4min @95% + 3min @82%)"
- Si Semaine 2 natation = "8×200m @CSS r=15s", Semaine 3 → "5×300m @CSS r=20s" ou "Pyramide 100-200-400-200-100 @CSS" ou "6×250m @CSS-2s r=15s"
- Les séances d'EF AUSSI doivent varier : terrain plat → vallonné → EF + strides → EF progressive → fartlek naturel → sentier technique

### Règle #2 : PROGRESSION OBLIGATOIRE des séances clés 🔑
Chaque séance clé doit évoluer au fil des semaines selon au moins UN de ces paramètres :
| Paramètre | Exemple de progression sur 4 semaines |
|-----------|--------------------------------------|
| **Volume** | 3×15min → 2×25min → 1×40min → 2×30min (la plus courante) |
| **Intensité** | 88% FTP → 90% → 92% → 88% (décharge) |
| **Format** | Intervalles courts → moyens → longs → continus |
| **Densité** | r=5min → r=4min → r=3min → r=5min (décharge) |
| **Complexité** | Simple → over-under → variabilité allure → simulation course |
| **Durée totale** | 1h30 → 1h45 → 2h → 1h20 (décharge) |

Exemples concrets de progression 🔑 Seuil sur 8 semaines :
- S1: 3×10min @seuil r=3min — S2: 2×15min @seuil r=4min — S3: 3×12min @seuil r=2min30
- S4 (décharge): 2×10min @seuil r=3min — S5: 2×18min @seuil r=3min — S6: 1×30min @seuil continu
- S7: 3×15min @seuil r=2min (densité↑) — S8: 1×35min @seuil continu (objectif TTE)

Exemples concrets de progression 🔑 VMA sur 6 semaines :
- S1: 2×(8×30/30) @VMA — S2: 6×800m @VMA r=2min — S3: 5×1000m @VMA r=2min30
- S4 (décharge): 3×600m @VMA r=2min — S5: 4×1200m @98% VMA r=3min — S6: 3×2000m @95% VMA r=3min30

Exemples concrets de progression 🔑 SL Marathon sur 8 semaines :
- S1: 22km EF — S2: 24km dont 4km @AM finish — S3: 26km dont 6km @AM finish
- S4 (décharge): 18km EF — S5: 28km dont 8km @AM — S6: 30km dont 10km @AM neg split
- S7: 32km Canova Progressive (15km EF → 10km tempo → 7km @AM) — S8 (décharge): 20km avec 3×3km @AM

### Règle #3 : ROTATION des formats secondaires
Les séances non-clés (EF, renfo, technique) doivent aussi varier cycliquement :

**CAP secondaire — rotation sur 4 semaines :**
- Sem A : EF plat 50min → Sem B : EF vallonnée 55min → Sem C : EF + 6×100m strides → Sem D : Fartlek libre 45min

**Natation secondaire — rotation :**
- Sem A : Technique (drill focus) → Sem B : Pull endurance → Sem C : OWS simulation → Sem D : Descente pacing

**Vélo secondaire — rotation :**
- Sem A : Z2 plat → Sem B : Z2 vallonné → Sem C : Z2 Train Low à jeun → Sem D : Z2 progressif (finish @75%)

**Renfo — rotation :**
- Sem A : Force max (squat 4×5) → Sem B : Circuit (3 tours) → Sem C : Pliométrie + core → Sem D : Force endurance + prévention

### Règle #4 : VARIATION INTRA-BLOC obligatoire
Même au sein d'un même bloc métabolique (ex: "Chantier TTE↑"), les séances clés doivent utiliser des MÉTHODES DIFFÉRENTES pour cibler le même objectif :
- TTE↑ : alterner Norvégienne (5×6min seuil bas), seuil continu long (1×30min), tempo marathon (2×20min @AM), sweet spot vélo (2×25min @88%), cruise intervals Daniels (6×1000m @T-pace)
- VO2max : alterner Billat 30/30, VMA longue (5×1200m), pyramide (400-800-1200-800-400), Billat 3min/3min, VO2max vélo (5×5min @115% FTP), côtes 8×3min
- VLamax↓ : alterner Z2 long plat, Z2 vallonné, Z2 Train Low, sweet spot continu, tempo progressif, SL neg split

### Règle #5 : MARQUEURS DE DIVERSITÉ
Dans les consignes coach de chaque semaine, explique EN QUOI cette semaine diffère de la précédente :
- "🔄 Évolution S3→S4 : passage de intervalles seuil (3×10min) à seuil continu long (1×25min) pour augmenter la tolérance à la monotonie de l'effort."
- "🔄 Évolution S6→S7 : introduction de l'over-under au lieu du sweet spot pur pour diversifier le stimulus métabolique."

### Indicateur de diversité — Auto-vérification
Avant de soumettre chaque semaine, VÉRIFIE :
- [ ] Aucune séance clé n'est identique à la semaine précédente (format ET durée)
- [ ] Les séances EF utilisent un terrain/format différent d'au moins 1 sem sur 2
- [ ] Au moins 1 séance de renfo a un format différent de la semaine précédente
- [ ] La progression en volume/intensité est visible par rapport à la semaine précédente
- [ ] En semaine de décharge, le volume baisse mais les formats restent variés (pas de copier-coller raccourci)
`;
    let userPrompt: string;
    if (regenerateWeek) {
      userPrompt = `Régénère UNIQUEMENT la Semaine ${regenerateWeek.weekNumber} du plan.
Contexte : ${regenerateWeek.phase || "Phase inconnue"}, thème "${regenerateWeek.theme || "Standard"}".
Plan total : ${regenerateWeek.totalWeeks} semaines.

${buildUserPrompt(athleteData, planConfig)}

IMPORTANT : Ne génère QUE la Semaine ${regenerateWeek.weekNumber} au format tableau obligatoire. Pas les autres semaines.

RAPPEL W'bal OBLIGATOIRE : Pour CHAQUE séance d'intervalles de cette semaine, tu DOIS :
1. Mentionner la durée de repos avec justification W'bal (ex: "Repos 2min30 — calibré W'bal 22kJ")
2. Indiquer le nombre max de répétitions avant dégradation W'
3. Étiqueter les efforts supra-CP quand la puissance prescrite dépasse CP
Ces mentions sont OBLIGATOIRES si les données CP/W' sont disponibles dans le profil athlète ci-dessus.`;
    } else {
      userPrompt = buildUserPrompt(athleteData, planConfig);
    }

    // Resolve workout catalog for injection — phase-specific catalogs take priority
    function getWorkoutCatalogForPhase(phase: string): string {
      if (phaseCatalogs && typeof phaseCatalogs === "object") {
        // Map active phase names to catalog keys
        const phaseMap: Record<string, string> = {
          "fondation": "base", "base": "base", "adaptation": "base",
          "build": "build", "chantier": "build", "consolidation": "build", "développement": "build",
          "spécifique": "peak", "peak": "peak", "race-specific": "peak", "compétition": "peak",
          "affûtage": "taper", "taper": "taper", "pre-race": "taper",
        };
        const key = phaseMap[phase.toLowerCase()] || "build";
        const catalog = phaseCatalogs[key];
        if (catalog && typeof catalog === "string" && catalog.length > 0) return catalog;
        // Fallback to any available catalog
        for (const k of ["build", "base", "peak", "taper"]) {
          if (phaseCatalogs[k]) return phaseCatalogs[k];
        }
      }
      // Legacy: single workoutCatalog string
      if (workoutCatalog && typeof workoutCatalog === "string" && workoutCatalog.length > 0) {
        return workoutCatalog;
      }
      return "";
    }

    // For non-chunked plans, inject ALL phase catalogs (plan covers all phases)
    const monoblocCatalogParts: string[] = [];
    for (const phaseKey of ["base", "build", "peak", "taper"]) {
      const cat = getWorkoutCatalogForPhase(phaseKey);
      if (cat && !monoblocCatalogParts.includes(cat)) {
        monoblocCatalogParts.push(cat);
      }
    }
    if (monoblocCatalogParts.length > 0) {
      // Deduplicate: if all phases return the same catalog, inject once
      const uniqueCatalogs = [...new Set(monoblocCatalogParts)];
      userPrompt += "\n\n" + uniqueCatalogs.join("\n\n");
      userPrompt += `\n\n→ Utilise PRIORITAIREMENT les séances du catalogue ci-dessus.
→ Si AUCUNE séance ne correspond, tu peux CRÉER une séance [Custom] en respectant le format et la méthodologie.
→ Ratio cible : ≥80% séances catalogue, ≤20% séances custom.`;
    }

    const totalWeeks = planConfig?.weeksAvailable || 12;
    // Use smaller chunks for triathlon (very verbose output with multi-session days)
    const obj = (planConfig?.objective || "").toUpperCase();
    // Detect verbose plans: triathlon multi-sport plans generate much more text per week
    const isVerbosePlan = /IRON|IM\b|703|70\.3|TRIATHLON|TRI\b/i.test(obj);
    // Dynamic chunk sizing: larger chunks = fewer API calls + better context retention
    // Gemini Flash supports 65k output tokens; ~3-4k tokens/week (verbose) or ~1.5-2k (standard)
    const CHUNK_SIZE = isVerbosePlan ? 6 : 8;
    const needsChunking = !regenerateWeek && totalWeeks > 16;

    // FIX #1: Deduplicate CP/W' — reuse buildCPWprimeSection's logic via shared helper
    const cpwResult = computeCPWprime(athleteData);
    const cpRound = cpwResult?.cpRound ?? null;
    const effectiveCPVal = cpwResult?.effectiveCP ?? null;
    const wprimeKJ = cpwResult?.wprimeKJ ?? null;
    const wEffKJ = cpwResult ? Math.round(cpwResult.wprimeEffJ / 100) / 10 : null;

    // FIX #6: Per-chunk timeout (4 min per chunk call)
    const CHUNK_TIMEOUT_MS = 4 * 60 * 1000;

    // Helper: call AI and stream response, return full text
    let streamError: { code: number; message: string } | null = null;
    async function generateAndStream(
      prompt: string,
      controller: ReadableStreamDefaultController,
      encoder: TextEncoder,
    ): Promise<string> {
      const abortCtrl = new AbortController();
      const timeout = setTimeout(() => abortCtrl.abort(), CHUNK_TIMEOUT_MS);

      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
            stream: true,
            max_tokens: 65536,
          }),
          signal: abortCtrl.signal,
        });

        if (!resp.ok || !resp.body) {
          const errText = await resp.text().catch(() => "Unknown error");
          console.error("AI call error:", resp.status, errText);

          const status = resp.status || 500;
          if (status === 402) {
            streamError = { code: 402, message: "Crédits IA épuisés. Ajoutez des crédits dans les paramètres." };
          } else if (status === 429) {
            streamError = { code: 429, message: "Rate limit dépassé, réessayez dans quelques instants." };
          } else {
            streamError = { code: 500, message: "Erreur du service IA" };
          }

          return "";
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);

            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") continue;

            try {
              const p = JSON.parse(json);
              const token = p.choices?.[0]?.delta?.content;
              if (token) {
                text += token;
                controller.enqueue(encoder.encode(line + "\n\n"));
              }
            } catch {}
          }
        }
        return text;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          console.error("Chunk generation timed out after", CHUNK_TIMEOUT_MS, "ms");
          streamError = { code: 504, message: "Timeout: le bloc a pris trop de temps à générer." };
        }
        return "";
      } finally {
        clearTimeout(timeout);
      }
    }

    // Helper: extract which week numbers were generated in a chunk of text
    function extractGeneratedWeekNumbers(text: string): number[] {
      const nums: number[] = [];
      const re = /^(?:#{2,4}\s*)?\*{0,2}\s*Semaine\s*(\d+)\b/gim;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        nums.push(parseInt(m[1], 10));
      }
      return [...new Set(nums)].sort((a, b) => a - b);
    }

    // FIX #2: Build W'bal reminder using effectiveCP and W' effectif (aligned with client-side)
    const wbalReminder = (effectiveCPVal !== null && wEffKJ !== null)
      ? `\n🔋 RAPPEL W'bal OBLIGATOIRE : Pour CHAQUE séance d'intervalles supra-CP, tu DOIS :
1. Justifier la durée de repos avec le W' individuel (ex: "Repos 2min30 — calibré W'bal ${wEffKJ} kJ")
2. Indiquer le volume max de répétitions avant épuisement du W'
3. Étiqueter les efforts au-dessus de CP effectif (${effectiveCPVal}W) comme "supra-CP"${cpwResult?.cpBounded ? `\n⚠️ CP brut (${cpRound}W) borné à ${effectiveCPVal}W (FTP+10) pour les prescriptions.` : ""}`
      : "";

    if (needsChunking) {
      // === CHUNKED GENERATION for long plans ===
      const encoder = new TextEncoder();
      const MAX_SUMMARY_CHUNKS = 5;

      // Build structured diagnostic from config (always available, includes phase bounds)
      const structuredDiagnostic = buildStructuredDiagnosticBlock(planConfig, totalWeeks);

      const stream = new ReadableStream({
        async start(controller) {
          try {
            let chunkSummaries: string[] = [];
            // Capture diagnostic from first chunk for re-injection
            let extractedDiagnostic = "";
            // FIX #1 (audit recap): Capture Récapitulatif Stratégique from chunk 1
            let extractedRecap = "";
            // FIX C1 (audit): Initialize activePhase from ambition — finisher starts in "Adaptation", not "Fondation"
            const ambKeyForPhase = normalizeAmbKey(planConfig?.ambition || "");
            let activePhase = (ambKeyForPhase === "finisher") ? "Adaptation" : "Fondation";
            const chunks: { start: number; end: number }[] = [];
            for (let s = 1; s <= totalWeeks; s += CHUNK_SIZE) {
              chunks.push({ start: s, end: Math.min(s + CHUNK_SIZE - 1, totalWeeks) });
            }

            const emitChunkBoundary = () => {
              controller.enqueue(
                encoder.encode('data: {"choices":[{"delta":{"content":"\\n\\n"}}]}\n\n')
              );
            };

            for (let ci = 0; ci < chunks.length; ci++) {
              const chunk = chunks[ci];
              const isFirst = ci === 0;
              const expectedWeeks = Array.from(
                { length: chunk.end - chunk.start + 1 },
                (_, i) => chunk.start + i
              );

              // Sliding window summary — only last N chunks
              const slidingSummary = chunkSummaries.slice(-MAX_SUMMARY_CHUNKS).join("\n");

              // Phase-specific workout catalog for this chunk
              const chunkPhaseCatalog = getWorkoutCatalogForPhase(activePhase);

              let chunkPrompt: string;
              if (isFirst) {
                const allChunksSummary = chunks.map(c => `Semaines ${c.start}-${c.end}`).join(", ");
                // FIX C2 (audit): Inject structuredDiagnostic in chunk 1 to anchor phase bounds from the start
                chunkPrompt = `${userPrompt}
${chunkPhaseCatalog ? `\n${chunkPhaseCatalog}\n` : ""}
⚠️ GÉNÉRATION PAR BLOC : Génère UNIQUEMENT les semaines ${chunk.start} à ${chunk.end} (sur ${totalWeeks} total).

📋 DIAGNOSTIC STRUCTURÉ (RÉFÉRENCE pour la cohérence du plan entier) :
${structuredDiagnostic}

Pour ce premier bloc, inclus :
1. Le **Diagnostic TFCL™** complet
2. Le **Récapitulatif Stratégique** couvrant **L'INTÉGRALITÉ du plan de ${totalWeeks} semaines** (${allChunksSummary}), PAS seulement le bloc actuel.
   - Le tableau "Limiteurs → Blocs → Séances Clés" DOIT lister TOUS les blocs/phases du plan entier (ex: Fondation S1-S6, Build S7-S12, Spécifique S13-S26, Affûtage S27-S32).
   - La colonne "Semaines" DOIT couvrir la totalité des ${totalWeeks} semaines.
   - Les synergies doivent concerner le plan global.
   - ⚠️ CHAQUE phase/bloc DOIT avoir des bornes de semaines explicites (ex: "S1-S6", "S7-S12").
   - ⚠️ Les bornes de phase estimées ci-dessus servent de GUIDE. Tu peux ajuster ±1 semaine si les limiteurs le justifient.

Génère ensuite les semaines ${chunk.start} à ${chunk.end} avec leurs tableaux complets.
IMPORTANT : Tu DOIS générer EXACTEMENT ${expectedWeeks.length} semaines (${expectedWeeks.join(", ")}). Ne t'arrête pas avant.${wbalReminder}`;

              } else {
                // FIX #2 (audit recap): Re-inject BOTH diagnostic AND strategic recap
                const diagnosticBlock = structuredDiagnostic + (extractedDiagnostic ? `\n\n📝 Diagnostic généré (résumé) :\n${extractedDiagnostic}` : "");
                
                // FIX #2: Build recap injection section
                const recapSection = extractedRecap
                  ? `\n📋 RÉCAPITULATIF STRATÉGIQUE (généré au bloc 1 — RÉFÉRENCE pour le séquençage) :\n${extractedRecap}\n\n⚠️ Tu DOIS respecter les bornes de phase et les séances clés définies ci-dessus. Si la semaine ${chunk.start} tombe dans un nouveau bloc/phase selon ce récapitulatif, insère l'en-tête de bloc.`
                  : "";

                // FIX C3 (audit): Build multi-objective reminder specific to this chunk's week range
                let multiObjChunkReminder = "";
                if (planConfig?.raceGoals && planConfig.raceGoals.length > 1) {
                  const relevantGoals = planConfig.raceGoals.filter((g: any) => {
                    if (!g.raceDate || !planConfig.planStartDate) return false;
                    const startMs = new Date(planConfig.planStartDate).getTime();
                    const raceMs = new Date(g.raceDate).getTime();
                    const goalWeek = Math.ceil((raceMs - startMs) / (7 * 86400000));
                    // Include goals within ±3 weeks of this chunk's range (taper/recovery window)
                    return goalWeek >= chunk.start - 3 && goalWeek <= chunk.end + 3;
                  });
                  if (relevantGoals.length > 0) {
                    multiObjChunkReminder = `\n\n🎯 RAPPEL MULTI-OBJECTIFS pour ce bloc :`;
                    relevantGoals.forEach((g: any) => {
                      const startMs = new Date(planConfig.planStartDate).getTime();
                      const raceMs = new Date(g.raceDate).getTime();
                      const goalWeek = Math.ceil((raceMs - startMs) / (7 * 86400000));
                      const prio = g.priority === "A" ? "🅰️" : g.priority === "B" ? "🅱️" : "🆎";
                      multiObjChunkReminder += `\n  ${prio} ${g.objective || g.raceName || "Course"} — Semaine ${goalWeek} (${g.raceDate})`;
                      if (g.priority !== "A" && goalWeek >= chunk.start && goalWeek <= chunk.end) {
                        multiObjChunkReminder += ` ⚠️ DANS CE BLOC → Mini-taper S${goalWeek - 1}, Course S${goalWeek}, Récup S${goalWeek + 1}`;
                      }
                    });
                  }
                }

                chunkPrompt = `${userPrompt}
${chunkPhaseCatalog ? `\n📚 CATALOGUE SÉANCES FILTRÉES POUR CETTE PHASE (${activePhase}) :\n${chunkPhaseCatalog}\n` : ""}
⚠️ GÉNÉRATION PAR BLOC (suite) : Génère UNIQUEMENT les semaines ${chunk.start} à ${chunk.end} (sur ${totalWeeks} total).
NE PAS répéter le diagnostic ni le récapitulatif stratégique. NE PAS ajouter d'introduction.
Tu DOIS générer EXACTEMENT ${expectedWeeks.length} semaines : ${expectedWeeks.map(w => `Semaine ${w}`).join(", ")}.

🔴 RÈGLE CRITIQUE — EN-TÊTES DE BLOC :
Si une nouvelle phase/bloc commence dans cette plage de semaines (d'après le Récapitulatif Stratégique du premier bloc), tu DOIS insérer l'en-tête de bloc AVANT la première semaine de ce bloc :
## Bloc N : [Nom Métabolique] (Semaines X-Y)
**Objectif physiologique :** [...]
**Volume cible :** [...]

Puis continue avec les semaines. Chaque bloc doit avoir son en-tête. C'est OBLIGATOIRE pour le parsing.

📋 DIAGNOSTIC STRUCTURÉ (cohérence obligatoire pour ce bloc) :
${diagnosticBlock}
${recapSection}${multiObjChunkReminder}

🔄 PHASE ACTIVE ESTIMÉE : ${activePhase}
→ Les séances clés de ce bloc doivent correspondre à cette phase ET aux limiteurs ci-dessus.
→ Utilise PRIORITAIREMENT les séances du catalogue ci-dessus qui correspondent à cette phase.
→ Si AUCUNE séance du catalogue ne correspond précisément à l'objectif/phase/sport requis, tu peux CRÉER une séance sur mesure en respectant :
  1. Le format identique (titre explicite, zones, durée, structure Warm-up/Main/Cool-down)
  2. Les principes méthodologiques du plan (polarisation 80/20, progression, cohérence de phase)
  3. Marque-la avec [Custom] dans le titre pour la distinguer des protocoles validés
→ Ratio cible : ≥80% séances catalogue, ≤20% séances custom. Si tu dépasses 20% custom, justifie pourquoi.

Résumé des blocs précédents (progression récente) :
${slidingSummary || "Premier bloc de continuation."}

Assure la PROGRESSION LOGIQUE du volume et de l'intensité par rapport aux semaines précédentes.${wbalReminder}`;
              }

              if (!isFirst) emitChunkBoundary();

              // Generate chunk
              const chunkText = await generateAndStream(chunkPrompt, controller, encoder);
              let combinedChunkText = chunkText;

              if (!chunkText) {
                // If this chunk failed, try to continue with remaining chunks instead of breaking
                console.error(`Chunk ${ci + 1}/${chunks.length} failed (empty response). StreamError: ${streamError?.message || "none"}`);
                if (streamError && (streamError.code === 402 || streamError.code === 429)) {
                  // Credit/rate limit errors — stop entirely
                  const errorPayload = `{"error":"${streamError.message}","code":${streamError.code}}`;
                  controller.enqueue(encoder.encode(`data: ${errorPayload}\n\n`));
                  break;
                }
                // For timeouts or transient errors, try one more time with a smaller scope
                console.log(`Retrying full chunk ${ci + 1} after failure...`);
                streamError = null;
                const retryChunkText = await generateAndStream(chunkPrompt, controller, encoder);
                if (!retryChunkText) {
                  console.error(`Chunk ${ci + 1} retry also failed. Skipping to next chunk.`);
                  continue; // Skip this chunk, let the gap-filling in parser handle it
                }
                combinedChunkText = retryChunkText;
              }

              // === FIRST CHUNK EXTRACTIONS ===
              if (isFirst) {
                // Extract Diagnostic
                const diagMatch = chunkText.match(/(?:##\s*(?:1\.\s*)?Diagnostic[^\n]*\n)([\s\S]*?)(?=##\s*(?:2\.\s*)?(?:R[ée]capitulatif|Semaine\s*\d))/i);
                if (diagMatch) {
                  extractedDiagnostic = diagMatch[1].trim().slice(0, 1200);
                } else {
                  const limiterLines = chunkText.match(/(?:Limiteur|L1|L2|stratégi|priorit|VLamax|VO2max|TTE|FTP|FatMax|économie|durabilité)[^\n]*/gi) || [];
                  extractedDiagnostic = limiterLines.slice(0, 15).join("\n");
                }

                // FIX #1 (audit recap): Extract Récapitulatif Stratégique
                extractedRecap = extractStrategicRecap(chunkText);
                
                // FIX #6 (audit recap): Validate chunk 1 output quality
                const validation = validateChunk1HasRecap(chunkText);
                if (!validation.hasRecap) {
                  console.warn("⚠️ Chunk 1 is missing Récapitulatif Stratégique section");
                }
                if (!validation.hasPhases) {
                  console.warn("⚠️ Chunk 1 Récapitulatif has no phase boundaries (SN-SM patterns)");
                }
                if (extractedRecap) {
                  console.log(`✅ Extracted strategic recap (${extractedRecap.length} chars)`);
                } else {
                  console.warn("⚠️ Failed to extract strategic recap — subsequent chunks will lack periodization context");
                }
              }

              // FIX #4 (audit recap): Detect active phase with broader matching
              activePhase = detectActivePhase(combinedChunkText, activePhase);

              // Verify which weeks were generated
              const generatedWeeks = extractGeneratedWeekNumbers(chunkText);
              const missingWeeks = expectedWeeks.filter(w => !generatedWeeks.includes(w));

              // Double retry for missing weeks (with deduplication + diagnostic + recap injection)
              if (missingWeeks.length > 0) {
                console.log(`Chunk ${ci + 1}: missing weeks ${missingWeeks.join(",")}. Retry 1...`);
                
                // FIX #2: Include recap in retry prompts too
                const retryRecapSection = extractedRecap
                  ? `\n📋 RÉCAPITULATIF STRATÉGIQUE (référence) :\n${extractedRecap.slice(0, 1500)}`
                  : "";
                
                const retryPrompt = `${userPrompt}

⚠️ COMPLÉTION DE SEMAINES MANQUANTES : Génère UNIQUEMENT les semaines suivantes : ${missingWeeks.map(w => `Semaine ${w}`).join(", ")}.
NE PAS répéter le diagnostic ni le récapitulatif. NE PAS ajouter d'introduction.

🔴 RÈGLE CRITIQUE — EN-TÊTES DE BLOC :
Si une des semaines manquantes est la PREMIÈRE semaine d'un nouveau bloc/phase, tu DOIS insérer l'en-tête de bloc.

📋 DIAGNOSTIC STRUCTURÉ :
${structuredDiagnostic}
${retryRecapSection}

🔄 PHASE ACTIVE : ${activePhase}

Contexte des semaines déjà générées :
${slidingSummary}
${generatedWeeks.length > 0 ? `Semaines déjà générées dans ce bloc : ${generatedWeeks.join(", ")}` : ""}

Assure la CONTINUITÉ de la progression.${wbalReminder}`;

                emitChunkBoundary();
                const retryText = await generateAndStream(retryPrompt, controller, encoder);
                let allRetryWeeks: number[] = [];
                if (retryText) {
                  combinedChunkText += `\n${retryText}`;
                  allRetryWeeks = extractGeneratedWeekNumbers(retryText);
                  // Update phase from retry text too
                  activePhase = detectActivePhase(retryText, activePhase);
                }

                const stillMissing = missingWeeks.filter(w => !allRetryWeeks.includes(w));

                // Second retry for remaining missing weeks
                if (stillMissing.length > 0) {
                  console.log(`Chunk ${ci + 1}: still missing ${stillMissing.join(",")}. Retry 2...`);
                  // FIX #2 (audit recap): Include recap in retry 2 as well
                  const retry2RecapSection = extractedRecap
                    ? `\n📋 RÉCAPITULATIF STRATÉGIQUE (référence) :\n${extractedRecap.slice(0, 1200)}`
                    : "";

                  const retry2Prompt = `${userPrompt}

⚠️ DERNIÈRE TENTATIVE — Génère UNIQUEMENT : ${stillMissing.map(w => `Semaine ${w}`).join(", ")}.
NE PAS répéter le diagnostic. Génère directement les tableaux.

📋 DIAGNOSTIC STRUCTURÉ :
${structuredDiagnostic}
${retry2RecapSection}

🔄 PHASE ACTIVE : ${activePhase}

Contexte : ${slidingSummary}
Semaines déjà générées : ${[...generatedWeeks, ...allRetryWeeks].sort((a, b) => a - b).join(", ")}${wbalReminder}`;

                  emitChunkBoundary();
                  const retry2Text = await generateAndStream(retry2Prompt, controller, encoder);
                  if (retry2Text) {
                    combinedChunkText += `\n${retry2Text}`;
                    const retry2Weeks = extractGeneratedWeekNumbers(retry2Text);
                    const finalMissing = stillMissing.filter(w => !retry2Weeks.includes(w));
                    if (finalMissing.length > 0) {
                      console.warn(`Final missing weeks after 2 retries: ${finalMissing.join(",")}`);
                    }
                    activePhase = detectActivePhase(retry2Text, activePhase);
                  }
                }
              }

              // FIX M1 (audit): Build ENRICHED summary with limiter progression tracking
              const weekMatches = combinedChunkText.match(/^(?:#{2,4}\s*)?\*{0,2}\s*Semaine\s*\d+[^#\n]*(?:\n(?!#{1,4}\s*\*{0,2}\s*Semaine\s*\d+).*)*/gim) || [];
              const summaryLines = weekMatches.map(w => {
                const numMatch = w.match(/Semaine\s*(\d+)/i);
                const themeMatch = w.match(/[—–:\-]\s*(.+?)[\n|]/);
                // Extract key sessions (🔑) for richer context
                const keySessionMatches = w.match(/🔑[^\n|]*/g) || [];
                const keySummary = keySessionMatches.length > 0 ? ` [Clés: ${keySessionMatches.map(k => k.replace("🔑", "").trim().slice(0, 30)).join(", ")}]` : "";
                // M1: Track limiter-relevant metrics (durations, intensities, volumes)
                const durationMatches = w.match(/(\d+h?\d*['′min]*\s*(?:Z2|endurance|FatMax|seuil|tempo|SFR|force))/gi) || [];
                const durSummary = durationMatches.length > 0 ? ` [Prog: ${durationMatches.slice(0, 2).map(d => d.trim().slice(0, 25)).join(", ")}]` : "";
                return `S${numMatch?.[1] || "?"}: ${themeMatch?.[1]?.trim() || "progression"}${keySummary}${durSummary}`;
              }).join(", ");
              
              // Detect bloc headers in this chunk for phase tracking in summary
              const blocHeaders = combinedChunkText.match(/##\s*Bloc\s*\d*\s*[:—–\-]?\s*[^\n]+/gi) || [];
              const blocInfo = blocHeaders.length > 0 ? ` | Blocs: ${blocHeaders.map(h => h.replace(/^##\s*/i, "").trim().slice(0, 40)).join("; ")}` : "";
              
              // M1: Track longest Z2/endurance session for durability progression
              const z2Durations = combinedChunkText.match(/(\d+)\s*(?:h|min|'|′)\s*(?:\d+\s*(?:min|'|′))?\s*(?:Z2|endurance|FatMax|aérobie)/gi) || [];
              const maxZ2 = z2Durations.length > 0 ? ` | MaxZ2: ${z2Durations[z2Durations.length - 1]?.trim().slice(0, 20)}` : "";

              // FIX M3 (audit): Post-chunk validation — check key sessions target L1/L2
              const keySessionMatches_all = combinedChunkText.match(/🔑[^\n|]*/g) || [];
              const L1Name = (planConfig?.identifiedLimiters?.[0] || "").toLowerCase();
              const L2Name = (planConfig?.identifiedLimiters?.[1] || "").toLowerCase();
              if (L1Name && keySessionMatches_all.length > 0) {
                const L1Keywords = extractLimiterKeywords(L1Name);
                const L2Keywords = L2Name ? extractLimiterKeywords(L2Name) : [];
                const keyTexts = keySessionMatches_all.map(k => k.toLowerCase());
                const L1Hits = keyTexts.filter(t => L1Keywords.some(kw => t.includes(kw))).length;
                const L2Hits = L2Keywords.length > 0 ? keyTexts.filter(t => L2Keywords.some(kw => t.includes(kw))).length : -1;
                if (L1Hits === 0) {
                  console.warn(`⚠️ M3 Validation: Chunk ${ci + 1} (S${chunk.start}-S${chunk.end}) — NO key sessions (🔑) target L1="${L1Name}". Phase: ${activePhase}`);
                }
                if (L2Hits === 0 && activePhase !== "Fondation" && activePhase !== "Adaptation") {
                  console.warn(`⚠️ M3 Validation: Chunk ${ci + 1} (S${chunk.start}-S${chunk.end}) — NO key sessions target L2="${L2Name}" in ${activePhase} phase.`);
                }
              }
              
              chunkSummaries.push(`Semaines ${chunk.start}-${chunk.end} [Phase: ${activePhase}${blocInfo}${maxZ2}]: ${summaryLines || "Plan progressif standard"}`);
            }

            // Send final [DONE]
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (e) {
            console.error("Chunked generation error:", e);
            controller.error(e);
          }
        },
      });


      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // === SINGLE GENERATION for short plans / regenerateWeek ===
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
        max_tokens: 65536,
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

// === STRUCTURED DIAGNOSTIC BLOCK (config-based, always available) ===
// Builds a compact structured block from planConfig for re-injection in chunks
// FIX #3 (audit recap): Now includes estimated phase bounds for the full plan
function buildStructuredDiagnosticBlock(config: any, totalWeeks?: number): string {
  const lines: string[] = [];
  
  // Objective & Ambition
  const objKey = normalizeObjKey(config?.objective || "");
  const ambKey = normalizeAmbKey(config?.ambition || "");
  lines.push(`🎯 Objectif: ${config?.objective || "N/A"} (normalisé: ${objKey})`);
  lines.push(`🏅 Ambition: ${config?.ambition || "N/A"} (normalisé: ${ambKey})`);
  const diagTimeTarget = getTimeTargetHint(config?.objective || "", config?.ambition || "", config?._athleteSex);
  if (diagTimeTarget) lines.push(`🎯 Temps cible: ${diagTimeTarget}`);
  
  // Limiters (structured, ranked)
  if (config?.identifiedLimiters && config.identifiedLimiters.length > 0) {
    lines.push(`\n🔴 LIMITEURS CLASSÉS (${config.identifiedLimiters.length} identifiés) :`);
    config.identifiedLimiters.forEach((l: string, i: number) => {
      const tag = i === 0 ? "L1 (PRIORITAIRE)" : i === 1 ? "L2 (SECONDAIRE)" : `L${i + 1}`;
      lines.push(`  ${tag}: ${l}`);
    });
  } else {
    lines.push(`\n⚠️ Aucun limiteur identifié — plan généraliste.`);
  }
  
  // Active levers
  if (config?.activeLevers && config.activeLevers.length > 0) {
    lines.push(`\n⚡ Leviers actifs: ${config.activeLevers.join(", ")}`);
  }
  
  // Prohibitions
  if (config?.prohibitions && config.prohibitions.length > 0) {
    lines.push(`\n🚫 Interdictions: ${config.prohibitions.join(" | ")}`);
  }
  
  // Volume constraints
  if (config?.weeklyHours) lines.push(`\n📊 Volume: ${config.weeklyHours}h/sem`);
  if (config?.sessionsPerWeek) lines.push(`📊 Séances: ${config.sessionsPerWeek}/sem`);
  if (config?.maxSessionsPerDay) lines.push(`📊 Max/jour: ${config.maxSessionsPerDay}`);

  // FIX C5 (audit): Limiter-aware phase heuristics — adapt durations based on L1 type
  if (totalWeeks && totalWeeks > 10) {
    const tw = totalWeeks;
    const isFinisher = ambKey === "finisher";
    const L1 = (config?.identifiedLimiters?.[0] || "").toLowerCase();
    const L2 = (config?.identifiedLimiters?.[1] || "").toLowerCase();

    // Taper duration depends on objective
    const taperWeeks = ["IM", "TrailUltra"].includes(objKey) ? 3 : ["703", "Marathon"].includes(objKey) ? 2 : ["Semi", "Trail", "TrailMountain"].includes(objKey) ? 2 : 1;
    const raceSpecificWeeks = isFinisher ? 0 : Math.min(4, Math.max(2, Math.floor(tw * 0.15)));
    const remainingWeeks = tw - taperWeeks - raceSpecificWeeks;

    // C5: Adjust fondation/build split based on limiter type
    // High VLamax or durability issues → longer Chantier block (more volume work needed)
    // Economy/technique limiters → longer Fondation (motor pattern adaptation is slow)
    const isVlamaxLimiter = /vlamax|glycoly|sprint|anaerob/i.test(L1);
    const isDurabilityLimiter = /durabilit|tte|endurance|fatmax|lipid/i.test(L1);
    const isEconomyLimiter = /econom|technique|cadence|biom[ée]can/i.test(L1);

    let fondationPct = 0.35; // default
    if (isEconomyLimiter) fondationPct = 0.42; // economy needs longer motor pattern adaptation
    else if (isVlamaxLimiter) fondationPct = 0.30; // VLamax work benefits from earlier Chantier
    else if (isDurabilityLimiter) fondationPct = 0.30; // durability needs more Build volume

    const fondationWeeks = Math.max(3, Math.floor(remainingWeeks * fondationPct));
    const buildWeeks = remainingWeeks - fondationWeeks;

    // C5: Name phases with actual limiter targets
    const L1Short = L1 ? L1.split(/[\s(,]/)[0] : "Limiteur #1";
    const L2Short = L2 ? L2.split(/[\s(,]/)[0] : "Limiteur #2";

    lines.push(`\n📅 BORNES DE PHASE ESTIMÉES (${tw} semaines, ajustées selon L1="${L1Short}") :`);
    if (isFinisher) {
      lines.push(`  Phase 1 — Adaptation : S1-S${fondationWeeks}`);
      lines.push(`  Phase 2 — Développement : S${fondationWeeks + 1}-S${fondationWeeks + buildWeeks}`);
      lines.push(`  Phase 3 — Consolidation : S${fondationWeeks + buildWeeks + 1}-S${tw - taperWeeks}`);
      lines.push(`  Phase 4 — Affûtage : S${tw - taperWeeks + 1}-S${tw}`);
    } else {
      const chantierEnd = fondationWeeks + Math.ceil(buildWeeks * (isVlamaxLimiter || isDurabilityLimiter ? 0.55 : 0.5));
      const consolEnd = fondationWeeks + buildWeeks;
      lines.push(`  Bloc Fondation + Intensité : S1-S${fondationWeeks}${isEconomyLimiter ? " (étendu: adaptation motrice L1)" : ""}`);
      lines.push(`  Bloc Chantier [${L1Short}↓] : S${fondationWeeks + 1}-S${chantierEnd}${isVlamaxLimiter ? " (étendu: chantier métabolique prioritaire)" : ""}`);
      lines.push(`  Bloc Consolidation [${L2Short}] : S${chantierEnd + 1}-S${consolEnd}`);
      lines.push(`  Bloc Race-Specific : S${consolEnd + 1}-S${tw - taperWeeks}`);
      lines.push(`  Bloc Affûtage : S${tw - taperWeeks + 1}-S${tw}`);
    }
    lines.push(`  ⚠️ Ces bornes sont INDICATIVES mais adaptées aux limiteurs détectés. Le Récapitulatif Stratégique du chunk 1 fait foi.`);
  }
  
  return lines.join("\n");
}

// === EXTRACT STRATEGIC RECAP from chunk 1 text ===
// FIX #1 (audit recap): Robust multi-pattern extraction for the Récapitulatif Stratégique
function extractStrategicRecap(chunkText: string): string {
  // Pattern 1: Standard "## Récapitulatif Stratégique" with optional numbering/emoji
  // Captures everything until the next ## heading or ### Semaine
  const patterns = [
    // ## Récapitulatif Stratégique / ## 2. Récapitulatif / ## 📊 Récapitulatif
    /(?:#{2,3}\s*(?:\d+\.\s*)?(?:[\u{1F300}-\u{1FAFF}\u2600-\u27BF]+\s*)?R[ée]capitulatif[^\n]*\n)([\s\S]*?)(?=\n#{2,3}\s*(?:\d+\.\s*)?(?:[\u{1F300}-\u{1FAFF}\u2600-\u27BF]+\s*)?(?:Semaine|Bloc|Phase|Programme|Plan\s))/iu,
    // Broader: match until any ## header that's NOT part of the recap
    /(?:#{2,3}\s*(?:\d+\.\s*)?(?:[\u{1F300}-\u{1FAFF}\u2600-\u27BF]+\s*)?R[ée]capitulatif[^\n]*\n)([\s\S]*?)(?=\n#{2,3}\s)/iu,
  ];

  for (const pattern of patterns) {
    const match = chunkText.match(pattern);
    if (match && match[1].trim().length > 50) {
      // FIX C4 (audit): Increase truncation from 2500 to 4000 chars to preserve later phases in long plans
      return match[1].trim().slice(0, 4000);
    }
  }

  // Fallback: capture any table that references Blocs/Phases with week ranges
  const blocTableMatch = chunkText.match(
    /(\|[^\n]*(?:Bloc|Phase|Limiteur)[^\n]*\|\s*\n\|[\s\-:|]+\|\s*\n(?:\|[^\n]+\|\s*\n)+)/i
  );
  if (blocTableMatch) {
    return blocTableMatch[1].trim().slice(0, 3500);
  }

  // Fallback: capture Synergies + Limiteurs sections (bullet lists + tables combined)
  const limiterTableMatch = chunkText.match(
    /(\|[^\n]*(?:#|Rang|Priorit)[^\n]*Limiteur[^\n]*\|\s*\n\|[\s\-:|]+\|\s*\n(?:\|[^\n]+\|\s*\n)+)/i
  );
  const synergyMatch = chunkText.match(
    /(?:#{2,4}\s*Synergies[^\n]*\n)((?:\s*[-•]\s*[^\n]+\n?)+)/i
  );
  const combined = [
    limiterTableMatch ? limiterTableMatch[1].trim() : "",
    synergyMatch ? `Synergies:\n${synergyMatch[1].trim()}` : "",
  ].filter(Boolean).join("\n\n");
  if (combined.length > 80) return combined.slice(0, 4000);

  // Last resort: capture lines mentioning phase boundaries (S1-SN patterns)
  const phaseLines = chunkText.match(/(?:Fondation|Chantier|Build|Consolidation|Race.Specific|Aff[ûu]tage|Taper|Sp[ée]cifique|D[ée]veloppement|Pr[ée]paration)[^\n]*S\d+[^\n]*/gi) || [];
  if (phaseLines.length > 0) {
    return phaseLines.slice(0, 20).join("\n");
  }

  return "";
}

// === DETECT ACTIVE PHASE from generated text ===
// FIX #4 (audit recap): Broader detection — matches multiple header formats
function detectActivePhase(text: string, currentPhase: string): string {
  // Match various header formats for phase/bloc names
  const patterns = [
    /##\s*Bloc\s*\d+\s*[:—–\-]\s*([^\n(]+)/gi,        // ## Bloc 3 : Race-Specific
    /##\s*Bloc\s+([^\n(]+)\s*\(S/gi,                     // ## Bloc Chantier VLamax↓ (S7-S12)
    /##\s*(Fondation|Chantier|Consolidation|Build|Race.Specific|Affûtage|Taper|Adaptation|Développement)[^\n]*/gi,
    /###\s*Phase\s*\d*\s*[:—–\-]?\s*([^\n]+)/gi,        // ### Phase 2 : Build
    /\*\*Phase\s*(?:active)?\s*[:—–]?\s*\*\*\s*([^\n]+)/gi, // **Phase active :** Build
  ];

  let lastPhase = "";
  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const candidate = (m[1] || m[0]).replace(/^##\s*Bloc\s*\d+\s*[:—–\-]?\s*/i, "").replace(/\*\*/g, "").trim();
      if (candidate && candidate.length > 2 && candidate.length < 80) {
        lastPhase = candidate;
      }
    }
  }

  return lastPhase || currentPhase;
}

// === VALIDATE CHUNK 1 OUTPUT ===
// FIX #6 (audit recap): Check that chunk 1 contains a Récapitulatif with phase boundaries
function validateChunk1HasRecap(chunkText: string): { hasRecap: boolean; hasPhases: boolean } {
  const hasRecap = /##\s*(?:2\.\s*)?R[ée]capitulatif/i.test(chunkText);
  const hasPhases = /S\d+\s*[-–—]\s*S\d+/i.test(chunkText) || /Semaines?\s*\d+\s*[-–àto]\s*\d+/i.test(chunkText);
  return { hasRecap, hasPhases };
}

// === SHARED CP/W' COMPUTATION (used by both buildCPWprimeSection and chunk prompts) ===
// FIXED: P5s and FTP excluded from regression (Jones 2019) — only P30s, P60s, MAP5min used
// FIXED: effectiveCP bounding by FTP, W' floor 10kJ (aligned with client-side criticalPowerModel.ts)
function computeCPWprime(data: any): { cpRound: number; effectiveCP: number; wprimeKJ: number; wprimeJ: number; wprimeEffJ: number; cpBounded: boolean } | null {
  // Only use points within the valid 2-parameter model range (~30s–5min)
  const regressionPoints: { dur: number; pow: number }[] = [];
  if (data?.p30s && data.p30s > 0) regressionPoints.push({ dur: 30, pow: data.p30s });
  if (data?.p60s && data.p60s > 0) regressionPoints.push({ dur: 60, pow: data.p60s });
  if (data?.map5min && data.map5min > 0) regressionPoints.push({ dur: 300, pow: data.map5min });
  if (regressionPoints.length < 2) return null;

  const n = regressionPoints.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of regressionPoints) {
    const x = p.dur, y = p.pow * p.dur;
    sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return null;

  const cp = (n * sumXY - sumX * sumY) / denom;
  const wprime = (sumY - cp * sumX) / n;
  if (cp < 30 || cp > 800 || wprime < 500 || wprime > 80000) return null;

  const cpRound = Math.round(cp);
  const ftp = data?.ftp ? Number(data.ftp) : null;

  // Effective CP — bounded by FTP when CP is suspect (aligned with client-side)
  const CP_FTP_MAX_GAP = 20;
  const CP_FTP_EFFECTIVE_OFFSET = 10;
  let effectiveCP = cpRound;
  let cpBounded = false;
  if (ftp && ftp > 0 && cpRound > ftp + CP_FTP_MAX_GAP) {
    effectiveCP = ftp + CP_FTP_EFFECTIVE_OFFSET;
    cpBounded = true;
  }

  // W' floor — minimum 10kJ for prescription reliability (aligned with client-side)
  const W_PRIME_FLOOR = 10000; // 10 kJ in Joules
  const wprimeEffJ = Math.max(wprime, W_PRIME_FLOOR);

  return { cpRound, effectiveCP, wprimeKJ: Math.round(wprime / 100) / 10, wprimeJ: wprime, wprimeEffJ, cpBounded };
}

// === CRITICAL POWER / W' INLINE MODEL (Skiba 2012) ===
function buildCPWprimeSection(data: any): string | null {
  // Reuse shared computation
  const result = computeCPWprime(data);
  if (!result) return null;

  const { cpRound, effectiveCP, wprimeKJ, wprimeJ: wprime, wprimeEffJ, cpBounded } = result;

  // All points for display (including overlay-only P5s and FTP)
  const points: { dur: number; pow: number; label: string; regression: boolean }[] = [];
  if (data.pmax5s && data.pmax5s > 0) points.push({ dur: 5, pow: data.pmax5s, label: "P5s", regression: false });
  if (data.p30s && data.p30s > 0) points.push({ dur: 30, pow: data.p30s, label: "P30s", regression: true });
  if (data.p60s && data.p60s > 0) points.push({ dur: 60, pow: data.p60s, label: "P60s", regression: true });
  if (data.map5min && data.map5min > 0) points.push({ dur: 300, pow: data.map5min, label: "MAP5min", regression: true });
  if (data.ftp && data.ftp > 0) points.push({ dur: 3600, pow: data.ftp, label: "FTP", regression: false });
  const regressionPts = points.filter(p => p.regression);
  const n = regressionPts.length;

  // R² — computed on regression points only
  let sumX = 0, sumY = 0;
  for (const p of regressionPts) { sumX += p.dur; sumY += p.pow * p.dur; }
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (const p of regressionPts) {
    const yA = p.pow * p.dur;
    const yP = cpRound * p.dur + wprime;
    ssTot += (yA - yMean) ** 2;
    ssRes += (yA - yP) ** 2;
  }
  const r2 = ssTot > 0 ? Math.round((1 - ssRes / ssTot) * 1000) / 1000 : 0;
  const weight = data.weightKg ? Number(data.weightKg) : null;
  const ftp = data.ftp ? Number(data.ftp) : null;

  const lines: string[] = [];
  lines.push(`\n#### ⚡ Modèle Critical Power / W' (Skiba — individualisé)`);
  lines.push(`- **CP (régression brute)** : ${cpRound}W${weight ? ` (${(cpRound / weight).toFixed(2)} W/kg)` : ""}`);
  if (cpBounded) {
    lines.push(`- **⚠️ CP effectif (borné par FTP)** : ${effectiveCP}W${weight ? ` (${(effectiveCP / weight).toFixed(2)} W/kg)` : ""}`);
    lines.push(`  → Le CP brut (${cpRound}W) est artificiellement gonflé (écart >${cpRound - (ftp || 0)}W avec FTP). Le CP effectif = FTP+10W est utilisé pour les prescriptions de repos.`);
  }
  if (ftp) {
    lines.push(`- **FTP (terrain)** : ${ftp}W — référence principale pour l'intensité des séances`);
    lines.push(`  → Le FTP reste la métrique de référence pour calibrer les zones d'entraînement. CP n'est utilisé que pour le modèle W'bal de repos inter-séries.`);
  }
  const wEffKJ = Math.round(wprimeEffJ / 100) / 10;
  const wprimeFloored = wprimeEffJ > wprime;
  lines.push(`- **W' (capacité anaérobie)** : ${wprimeKJ} kJ${weight ? ` (${Math.round(wprime / weight)} J/kg)` : ""}`);
  if (wprimeFloored) {
    lines.push(`- **⚠️ W' effectif (plancher physiologique)** : ${wEffKJ} kJ — Le W' mesuré (${wprimeKJ} kJ) est sous le seuil physiologique. Un plancher de 10 kJ est appliqué pour les prescriptions de repos.`);
  }
  lines.push(`- **Qualité du modèle** : R²=${r2} (${r2 > 0.95 ? "excellent" : r2 > 0.90 ? "bon" : "acceptable"}, ${n} points)`);
  lines.push(`- **Qualité des données** : ${!cpBounded && !wprimeFloored ? "✅ Cohérent" : "⚠️ Bornes appliquées"}`);

  // CRITICAL: Always prioritize FTP over CP for training intensities
  lines.push(`\n#### 🎯 HIÉRARCHIE D'INTENSITÉ`);
  lines.push(`- **Zones d'entraînement** → TOUJOURS basées sur le FTP (${ftp || "n/a"}W), PAS sur le CP`);
  lines.push(`- **Repos inter-séries** → calculés via W'bal avec CP effectif (${effectiveCP}W) et W' effectif (${wEffKJ} kJ)`);
  lines.push(`- **CP brut (${cpRound}W)** → affiché uniquement pour information, JAMAIS utilisé comme cible d'intensité`);

  // W'bal recovery prescriptions — uses effectiveCP and W' floor (aligned with client-side)
  // FIXED: Recovery power = 0W (passive rest) for VO2max/Sprint formats (aligned with client-side criticalPowerModel.ts)
  const calcTau = (recPow: number) => {
    const dcp = effectiveCP - recPow;
    if (dcp <= 0) return 1500;
    return Math.max(200, Math.min(1500, 546 * Math.exp(-0.01 * dcp) + 316));
  };
  const calcRecovery = (intPow: number, intDur: number, recPow: number) => {
    if (intPow <= effectiveCP) return { rest: 60, maxReps: 20 };
    const wbalAfter = Math.max(0, wprimeEffJ - (intPow - effectiveCP) * intDur);
    const depleted = wprimeEffJ - wbalAfter;
    const tau = calcTau(recPow);
    // Time to 75% reconstitution
    const target75 = wprimeEffJ * 0.75;
    const remaining = wprimeEffJ - target75;
    const optRest = depleted > 0 && remaining < depleted ? Math.round(-tau * Math.log(remaining / depleted)) : 60;
    // Max reps via iterative W'bal simulation
    const wCost = (intPow - effectiveCP) * intDur;
    let maxReps = 0;
    let simWbal = wprimeEffJ;
    for (let rep = 0; rep < 30; rep++) {
      simWbal = Math.max(0, simWbal - wCost);
      if (simWbal <= 0) break;
      maxReps++;
      const depNow = wprimeEffJ - simWbal;
      simWbal = wprimeEffJ - depNow * Math.exp(-optRest / tau);
      if (simWbal - wCost <= 0) break;
    }
    return { rest: optRest, maxReps: Math.max(1, maxReps) };
  };

  const fmtRest = (sec: number) => sec >= 120 ? `${Math.round(sec / 60)}min` : `${sec}s`;

  // FIXED: Recovery power aligned with client-side — passive rest (0W) for VO2max/Sprint
  const formats = [
    { label: "30/30 VO2max", pct: 1.20, dur: 30, recPow: 0 },
    { label: "1min @120%", pct: 1.20, dur: 60, recPow: 0 },
    { label: "3min @VO2max", pct: 1.15, dur: 180, recPow: 0 },
    { label: "5min @105%", pct: 1.05, dur: 300, recPow: Math.round(effectiveCP * 0.5) },
    { label: "Over-under 3min", pct: 1.05, dur: 180, recPow: Math.round(effectiveCP * 0.85) },
    { label: "Sprint 10s", pct: 2.00, dur: 10, recPow: 0 },
  ];

  lines.push(`\n#### 🔄 Durées de Repos Optimales W'bal (Skiba 2012 — CP effectif ${effectiveCP}W, W' effectif ${wEffKJ}kJ)`);
  lines.push(`| Format | Puissance | Repos optimal | Reps max |`);
  lines.push(`|--------|-----------|---------------|----------|`);
  for (const f of formats) {
    const pow = Math.round(effectiveCP * f.pct);
    const rec = calcRecovery(pow, f.dur, f.recPow);
    const powLabel = weight ? `${pow}W (${(pow / weight).toFixed(1)}W/kg)` : `${pow}W`;
    lines.push(`| ${f.label} | ${powLabel} | ${fmtRest(rec.rest)} | ${rec.maxReps} |`);
  }
  lines.push(`\n⚠️ UTILISE CES DURÉES DE REPOS quand tu prescris des intervalles. Elles sont calculées à partir du W' individuel de l'athlète (${wEffKJ} kJ) et du CP effectif (${effectiveCP}W).`);
  lines.push(`- Repos trop court = W' non reconstitué → qualité dégradée dès rep 3`);
  lines.push(`- Repos trop long = stimulus insuffisant`);
  lines.push(`\n📝 OBLIGATION D'AFFICHAGE W'bal : Dans CHAQUE séance d'intervalles, mentionne explicitement dans la description :`);
  lines.push(`  1. La durée de repos prescrite ET sa justification W'bal (ex: "Repos 2min30 — calibré W'bal ${wEffKJ}kJ")`);
  lines.push(`  2. Le nombre de répétitions max soutenable (ex: "×6 reps max avant dégradation W'")`);
  lines.push(`  3. Si le format est supra-CP, précise "effort supra-CP (${effectiveCP}W)" dans le titre ou la description`);
  lines.push(`  Cela garantit au coach la traçabilité physiologique de chaque prescription d'intervalles.`);

  return lines.join("\n");
}

function buildUserPrompt(data: any, config: any): string {
  const lines: string[] = ["## Demande de Plan d'Entraînement TFCL™\n"];

  const parseIsoDateUtc = (iso?: string): number | undefined => {
    if (!iso) return undefined;
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return undefined;
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    return Date.UTC(y, m - 1, d);
  };

  const formatIsoDateFr = (iso?: string): string => {
    if (!iso) return "";
    const utc = parseIsoDateUtc(iso);
    if (utc === undefined) return iso;
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(utc));
  };

  const computeGoalWeek = (goal: any): number | undefined => {
    // PRIORITÉ ABSOLUE: calculer depuis les dates (source de vérité)
    if (goal?.raceDate && config?.planStartDate) {
      const raceUtc = parseIsoDateUtc(goal.raceDate);
      const startUtc = parseIsoDateUtc(config.planStartDate);
      if (raceUtc !== undefined && startUtc !== undefined) {
        const days = Math.round((raceUtc - startUtc) / (24 * 3600 * 1000));
        if (days >= 0) return Math.floor(days / 7) + 1;
      }
    }

    // Fallback uniquement si aucune date exploitable
    if (typeof goal?.weeksUntilRace === "number" && Number.isFinite(goal.weeksUntilRace)) {
      return Math.max(1, Math.floor(goal.weeksUntilRace));
    }

    return undefined;
  };

  const getWeekBounds = (weekNumber?: number): { start: string; end: string } | undefined => {
    if (!weekNumber || !config?.planStartDate) return undefined;
    const startUtc = parseIsoDateUtc(config.planStartDate);
    if (startUtc === undefined) return undefined;

    const weekStartUtc = startUtc + (weekNumber - 1) * 7 * 24 * 3600 * 1000;
    const weekEndUtc = weekStartUtc + 6 * 24 * 3600 * 1000;

    const fmt = (ms: number) =>
      new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(ms));

    return { start: fmt(weekStartUtc), end: fmt(weekEndUtc) };
  };

  // --- Config ---
  lines.push("### Configuration du Plan");

  // Multi-objective support
  if (config.raceGoals && config.raceGoals.length > 0) {
    const isMulti = config.raceGoals.length > 1;
    if (isMulti) {
      lines.push("\n#### 🎯 PLANIFICATION MULTI-OBJECTIFS");
      lines.push("Ce plan couvre PLUSIEURS courses/objectifs. Tu DOIS structurer la périodisation pour TOUS les atteindre :\n");
    } else {
      lines.push("\n#### 🎯 OBJECTIF COURSE");
    }

    const sortedGoals = [...config.raceGoals].sort((a: any, b: any) => {
      if (a.raceDate && b.raceDate) return a.raceDate.localeCompare(b.raceDate);
      const prio: Record<string, number> = { A: 1, B: 2, C: 3 };
      return (prio[a.priority] || 3) - (prio[b.priority] || 3);
    });

    sortedGoals.forEach((goal: any, idx: number) => {
      const prioEmoji = goal.priority === "A" ? "🅰️ PRINCIPAL" : goal.priority === "B" ? "🅱️ INTERMÉDIAIRE" : "🆎 SECONDAIRE";
      const goalWeek = computeGoalWeek(goal);
      const bounds = getWeekBounds(goalWeek);
      const weekAnchor = goalWeek ? ` — Échéance: Semaine ${goalWeek}${bounds ? ` (${bounds.start} → ${bounds.end})` : ""}` : "";
      lines.push(`**Objectif ${idx + 1} — ${prioEmoji}** : ${goal.objective}${goal.raceName ? ` (${goal.raceName})` : ""}${goal.raceDate ? ` — Date : ${goal.raceDate}` : ""}${weekAnchor}`);
      if (goalWeek && goal.raceDate) {
        lines.push(`→ Ancrage absolu : la course ${goal.objective} DOIT être planifiée le ${goal.raceDate} (${formatIsoDateFr(goal.raceDate)}), dans S${goalWeek}${bounds ? ` [${bounds.start} → ${bounds.end}]` : ""}.`);
        lines.push(`→ INTERDIT de la placer une semaine avant/après (ex: ${goal.raceDate} ≠ ${goalWeek > 1 ? `S${goalWeek - 1}` : "S1"}).`);
        lines.push(`→ La DERNIÈRE semaine du plan (S${goalWeek}) DOIT être la SEMAINE DE COURSE avec : mini-taper, activation J-2/J-1, et Jour de Course le jour exact de la compétition.`);
      }
    });

    if (isMulti) {
      lines.push("\n### FORMAT OBLIGATOIRE EN SORTIE (MULTI-OBJECTIFS)");
      lines.push("Au début de la réponse, ajoute OBLIGATOIREMENT une section `## Jalons multi-objectifs` avec:");
      lines.push("- Une ligne par objectif (A, B, C) avec la semaine cible exacte (ex: `Objectif B Marathon → S5`).");
      lines.push("- Les semaines de mini-taper et récupération pour chaque objectif B/C (ex: `Mini-taper B: S4`, `Récup post-B: S6`).");
      lines.push("Si cette section est absente, la réponse est INVALIDE.");

      // Calculate inter-race gaps
      const datesGoals = sortedGoals.filter((g: any) => g.raceDate);
      if (datesGoals.length >= 2) {
        lines.push("\n**Intervalles entre courses :**");
        for (let i = 1; i < datesGoals.length; i++) {
          const d1 = new Date(datesGoals[i - 1].raceDate);
          const d2 = new Date(datesGoals[i].raceDate);
          const gapWeeks = Math.round((d2.getTime() - d1.getTime()) / (7 * 24 * 3600 * 1000));
          lines.push(`- ${datesGoals[i - 1].objective} → ${datesGoals[i].objective} : **${gapWeeks} semaines**`);
        }
      }

      lines.push("\n**⚠️ RÈGLES MULTI-OBJECTIFS :**");
      lines.push("1. **Objectif A (PRINCIPAL)** : le plan est optimisé GLOBALEMENT pour cet objectif. C'est le pic de forme principal.");
      lines.push("2. **Objectif B (INTERMÉDIAIRE)** : reçoit un mini-taper de 7-10 jours avant la course + adaptation des 1-2 semaines post-course (récupération + relance).");
      lines.push("3. L'objectif B sert de JALON et de course de préparation. Ne pas sacrifier la progression vers l'objectif A pour un pic total sur B.");
      lines.push("4. Inclure une semaine de récupération post-course B avant de relancer le bloc suivant vers l'objectif A.");
      lines.push("5. **Ne PAS créer 2 blocs indépendants.** La préparation est CONTINUE avec des ajustements autour des courses intermédiaires.");
    }
    lines.push("");
  } else {
    if (config.objective) lines.push(`- **Objectif course :** ${config.objective}`);
    if (config.raceName) lines.push(`- **Nom de la course :** ${config.raceName}`);
    if (config.raceDate) lines.push(`- **Date de course :** ${config.raceDate}`);
  }

  // Inject time target hint based on objective × ambition × sex
  const athleteSex = data?.sex || data?.sexe || null;
  const timeTarget = getTimeTargetHint(config.objective || "", config.ambition || "", athleteSex);
  if (timeTarget) {
    lines.push(`- **🎯 Temps cible estimé :** ${timeTarget}`);
    lines.push(`  → Calibre les allures d'entraînement et la progression pour viser ce temps objectif. Les séances clés doivent être prescrites en cohérence avec cet objectif chronométrique.`);
  }
  if (config.weeksAvailable) lines.push(`- **Semaines disponibles :** ${config.weeksAvailable}`);
  if (config.weeklyHours) {
    lines.push(`- **Heures dispo/semaine :** ${config.weeklyHours}h`);
  } else {
    lines.push(`- **Heures/semaine :** Non spécifié — utilise le volume OPTIMAL recommandé dans la littérature scientifique pour cet objectif × niveau d'ambition (cf. tableaux de référence TFCL ci-dessus).`);
  }
  if (config.sessionsPerWeek) {
    lines.push(`- **Séances/semaine max :** ${config.sessionsPerWeek}`);
  } else {
    lines.push(`- **Séances/semaine :** Non spécifié — utilise le nombre de séances OPTIMAL recommandé dans la littérature scientifique pour cet objectif × niveau d'ambition (cf. tableaux de référence TFCL ci-dessus).`);
  }
  if (config.strengthSessionsPerWeek !== undefined && config.strengthSessionsPerWeek !== null) {
    if (config.strengthSessionsPerWeek === 0) {
      lines.push(`- **⚠️ Renforcement musculaire : 0 séance/sem — NE PAS inclure de séance de renforcement/musculation/PPG dans le plan.**`);
    } else {
      lines.push(`- **🏋️ Renforcement musculaire : ${config.strengthSessionsPerWeek} séance(s)/sem — Inclure EXACTEMENT ${config.strengthSessionsPerWeek} séance(s) de renforcement/PPG par semaine dans le plan.**`);
    }
  }
  if (config.maxSessionsPerDay) {
    const maxLabel = config.maxSessionsPerDay === 1 ? "1 séance/jour max (PAS de doubles)" :
                     config.maxSessionsPerDay === 2 ? "2 séances/jour max (doubles autorisées, PAS de triples)" :
                     "3 séances/jour max (doubles et triples autorisées)";
    lines.push(`- **⚠️ Max séances par jour :** ${maxLabel}`);
    if (config.maxSessionsPerDay === 1) {
      lines.push(`  → RÈGLE STRICTE : 1 seule séance par jour. Aucune double séance. Chaque jour n'a qu'UNE SEULE ligne dans le tableau.`);
    } else if (config.maxSessionsPerDay === 2) {
      lines.push(`  → RÈGLE STRICTE : Maximum 2 séances par jour. Pas de triples. Chaque jour a 1 ou 2 lignes max dans le tableau.`);
    } else if (config.maxSessionsPerDay === 3) {
      // Calculate minimum sessions: 6 training days × 2 min sessions = 12, with some at 3
      const minSessions = 14;
      const maxSessions = 18;
      lines.push(`  → RÈGLE STRICTE : Doubles et triples séances OBLIGATOIRES pour un athlète élite.`);
      lines.push(`  → **MINIMUM ${minSessions} séances par semaine, idéalement ${minSessions}-${maxSessions}.**`);
      lines.push(`  → Chaque jour d'entraînement (hors repos) DOIT avoir 2 ou 3 lignes dans le tableau.`);
      lines.push(`  → Utilise "Lundi matin", "Lundi midi", "Lundi soir" pour séparer les séances.`);
      lines.push(`  → Exemple de structure semaine type avec 1 jour repos :`);
      lines.push(`    Lundi matin : Natation technique | Lundi midi : Renfo/Core | Lundi soir : Vélo Z2`);
      lines.push(`    Mardi matin : Natation seuil | Mardi soir : CAP intervalles`);
      lines.push(`    Mercredi matin : Vélo intensité | Mercredi midi : Renfo | Mercredi soir : CAP récup`);
      lines.push(`    etc.`);
      lines.push(`  → Un jour d'entraînement avec UNE SEULE séance est une ERREUR GRAVE. Ajoute au minimum natation technique, renfo/core ou Z1 récup.`);
      lines.push(`  → VÉRIFIE que le total de séances par semaine est ≥ ${minSessions} avant de soumettre.`);
    }
    // Anti-contradiction: never mix rest + real session on same day
    lines.push(`- **⚠️ Anti-contradiction :** Si un jour a une séance d'entraînement, NE PAS ajouter de ligne "Repos" pour ce même jour. Le Repos est UNIQUEMENT pour les jours sans aucune séance.`);
  }
  if (config.ambition) lines.push(`- **Niveau d'ambition :** ${config.ambition}`);

  // === CONTRAINTE EXPLICITE : RATIOS DE RÉPARTITION SPORTIVE PAR NIVEAU D'AMBITION ===
  const sportRatios = getSportDistributionConstraint((config.objective || "").toUpperCase(), (config.ambition || "").toLowerCase(), config.identifiedLimiters);
  if (sportRatios) {
    lines.push(sportRatios);
  }

  if (config.constraints) lines.push(`- **Contraintes :** ${config.constraints}`);

  // === CALENDAR MAPPING: inject exact dates for each week so the AI can anchor races precisely ===
  if (config.planStartDate && config.weeksAvailable) {
    const startMs = parseIsoDateUtc(config.planStartDate);
    if (startMs !== undefined) {
      const totalW = config.weeksAvailable as number;
      lines.push(`\n### 📅 CALENDRIER ABSOLU (source de vérité pour les dates)`);
      lines.push(`Le plan commence le ${formatIsoDateFr(config.planStartDate)} (lundi). Voici le calendrier exact :\n`);
      
      // Build a lookup of race dates per week for annotation
      const racesByWeek: Record<number, string[]> = {};
      if (config.raceGoals) {
        config.raceGoals.forEach((g: any) => {
          const w = computeGoalWeek(g);
          if (w) {
            if (!racesByWeek[w]) racesByWeek[w] = [];
            racesByWeek[w].push(`${g.priority}: ${g.objective}${g.raceName ? ` (${g.raceName})` : ""} le ${g.raceDate}`);
          }
        });
      }

      for (let w = 1; w <= Math.min(totalW, 30); w++) {
        const wStartMs = startMs + (w - 1) * 7 * 86400000;
        const wEndMs = wStartMs + 6 * 86400000;
        const fmtShort = (ms: number) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(ms));
        const annotation = racesByWeek[w] ? ` ← 🏁 ${racesByWeek[w].join(", ")}` : "";
        lines.push(`- **S${w}** : du ${fmtShort(wStartMs)} au ${fmtShort(wEndMs)}${annotation}`);
      }
      
      lines.push(`\n⚠️ UTILISE CE CALENDRIER pour nommer tes semaines : "### Semaine N (du JJ/MM au JJ/MM) — [Thème]".`);
      lines.push(`⚠️ Quand une course est marquée dans ce calendrier, elle DOIT apparaître dans la semaine correspondante, PAS la semaine d'avant ni d'après.`);
    }
  }

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
  if (data.p30s) lines.push(`- P30s : ${data.p30s}W`);
  if (data.p60s) lines.push(`- P60s : ${data.p60s}W`);
  if (data.map5min) lines.push(`- MAP 5min : ${data.map5min}W`);

  // === CRITICAL POWER / W' MODEL (Skiba 2012 — individualisé) ===
  const cpwSection = buildCPWprimeSection(data);
  if (cpwSection) lines.push(cpwSection);

  lines.push("\n#### Autres Métriques");
  if (data.vma) lines.push(`- VMA : ${data.vma} km/h`);
  if (data.css) lines.push(`- CSS natation : ${data.css} sec/100m`);
  if (data.fcMax) lines.push(`- FC Max : ${data.fcMax} bpm`);

  // --- Computed training zones & pace anchors (TFCL Z1→Z7 methodology) ---
  const formatPace = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = Math.round(totalSec % 60);
    return `${m}'${s.toString().padStart(2, "0")}"`;
  };

  // Build TFCL Z1→Z7 zones table with actual values
  const vmaKmh = data.vma ? Number(data.vma) : null;
  const ftpW = data.ftp ? Number(data.ftp) : null;
  const fcMaxBpm = data.fcMax ? Number(data.fcMax) : null;

  lines.push(`\n#### ⚠️ GRILLE ZONES D'ENTRAÎNEMENT TFCL™ Z1→Z7 (RÉFÉRENCE OBLIGATOIRE)`);
  lines.push(`Ces zones sont les leviers physiologiques utilisés par le coach. Tu DOIS prescrire les séances en utilisant UNIQUEMENT ces zones.`);
  lines.push(`Les valeurs ci-dessous sont calculées à partir du profil de l'athlète. NE PAS inventer d'autres valeurs.\n`);

  // Zone definitions: [name, description, fcLow, fcHigh, vmaLow, vmaHigh, ftpLow, ftpHigh]
  const zones: [string, string, number, number, number, number, number, number][] = [
    ["Z1 Récupération", "Récupération, affûtage, échauffement, lactate de base", 0, 70, 0, 60, 0, 55],
    ["Z2 Endurance Fondamentale", "Lipolyse, volume mitochondrial, base aérobie", 70, 78, 60, 70, 56, 75],
    ["Z3 Endurance Active", "Base aérobie solide, force si basse cadence", 78, 83, 70, 78, 76, 90],
    ["Z4a Allure Marathon / Sweet Spot", "Économie de course, durabilité, spécifique long", 83, 87, 78, 83, 88, 93],
    ["Z4b Allure Semi", "Tolérance à l'inconfort, mental, spécifique moyen", 87, 91, 83, 88, 94, 98],
    ["Z5 Seuil (MLSS)", "Repousser le seuil anaérobie, MLSS", 91, 94, 88, 92, 99, 105],
    ["Z6 VO2max / VMA", "VO2max, cylindrée cardiaque", 95, 100, 95, 105, 106, 120],
    ["Z7 Neuromusculaire / Anaérobie Alactique", "Explosivité, force max, vitesse pure", 0, 0, 120, 200, 150, 300],
  ];

  lines.push(`| Zone | Description | FC | VMA | FTP | Allure CAP |`);
  lines.push(`|------|-------------|----|----|-----|------------|`);
  for (const [name, desc, fcL, fcH, vmaL, vmaH, ftpL, ftpH] of zones) {
    const fcStr = fcMaxBpm
      ? (fcL === 0 && name.includes("Z1") ? `0-${Math.round(fcMaxBpm * fcH / 100)}` :
         fcL === 0 && name.includes("Z7") ? "N/A" :
         `${Math.round(fcMaxBpm * fcL / 100)}-${Math.round(fcMaxBpm * fcH / 100)}`)
      : `${fcL}-${fcH}%`;
    const vmaStr = `${vmaL}-${vmaH}%`;
    const ftpStr = ftpW
      ? `${Math.round(ftpW * ftpL / 100)}-${Math.round(ftpW * ftpH / 100)}W`
      : `${ftpL}-${ftpH}%`;
    // Compute pace range for running if VMA available
    let paceStr = "—";
    if (vmaKmh && vmaKmh > 0 && vmaL > 0 && vmaH <= 200) {
      const paceHigh = 3600 / (vmaKmh * vmaL / 100); // slower (low % VMA)
      const paceLow = 3600 / (vmaKmh * vmaH / 100);  // faster (high % VMA)
      paceStr = `${formatPace(paceLow)}-${formatPace(paceHigh)}/km`;
    }
    lines.push(`| ${name} | ${desc} | ${fcStr} | ${vmaStr} | ${ftpStr} | ${paceStr} |`);
  }

  // Explicit pace hierarchy rule
  if (vmaKmh && vmaKmh > 0) {
    const seuilPace = 3600 / (vmaKmh * 0.90); // Z5 low bound
    lines.push(`\n**Allures spécifiques calculées :**`);
    lines.push(`- Allure EF/Z2 : ${formatPace(3600 / (vmaKmh * 0.65))}-${formatPace(3600 / (vmaKmh * 0.70))}/km`);
    lines.push(`- Allure Marathon (Z4a) : ${formatPace(3600 / (vmaKmh * 0.83))}-${formatPace(3600 / (vmaKmh * 0.78))}/km`);
    lines.push(`- Allure Semi (Z4b) : ${formatPace(3600 / (vmaKmh * 0.88))}-${formatPace(3600 / (vmaKmh * 0.83))}/km`);
    lines.push(`- Allure Seuil (Z5) : ${formatPace(3600 / (vmaKmh * 0.92))}-${formatPace(3600 / (vmaKmh * 0.88))}/km`);
    lines.push(`- Allure VMA (Z6) : ${formatPace(3600 / (vmaKmh * 1.05))}-${formatPace(3600 / (vmaKmh * 0.95))}/km`);
    lines.push(`\n🚨 HIÉRARCHIE INVIOLABLE (du plus lent au plus rapide) : Z2 > Z4a Marathon > Z4b Semi > Z5 Seuil > Z6 VMA`);
    lines.push(`Si une allure spécifique course est plus rapide que le seuil (Z5), c'est une ERREUR. Allure semi TOUJOURS plus lente que seuil.`);
  }

  // --- Identified weaknesses (ranked by importance) ---
  if (config.identifiedLimiters && config.identifiedLimiters.length > 0) {
    lines.push("\n### 🔴 LIMITEURS IDENTIFIÉS PAR L'APP — CLASSÉS PAR IMPORTANCE — SÉANCES CLÉS OBLIGATOIRES");
    lines.push("Les limiteurs ci-dessous sont calculés et classés par le diagnostic TFCL™ (impact pondéré = importance × gap vs cible).");
    lines.push("Le plan DOIT adresser CHAQUE limiteur, du plus critique au moins critique, avec une périodisation séquentielle.");
    lines.push("");
    config.identifiedLimiters.forEach((l: string) => lines.push(l));

    // ====== ENHANCED: Detailed limiter-to-session matrix per phase ======
    lines.push("\n### 📋 MATRICE SÉANCE CLÉ × LIMITEUR × PHASE (Dan Lorang / TFCL™)");
    lines.push("Utilise cette matrice pour sélectionner les séances clés EXACTES selon le limiteur identifié et la phase de préparation.\n");

    lines.push("| Limiteur | Phase Base (4-6 sem) | Phase Build (4-6 sem) | Phase Spécifique (3-4 sem) | Phase Taper (1-2 sem) |");
    lines.push("|----------|---------------------|----------------------|---------------------------|----------------------|");
    lines.push("| VO2max bas | Billat 30/30 (2×8min), 3×3min @VMA | 5×1200m @100% VMA r=3min, VMA longue 4×4min | VMA courte (200-400m) + rappels race pace | 2×(4×200m) @VMA rappel, volume -60% |");
    lines.push("| VLamax trop haute | Z2 long 2h-2h30 Train Low, sweet spot 2×20min @88% FTP | Z2 long 2h30-3h à jeun, tempo long 40-50min @Z4a | Simulation course Z2-Z4a progressive, Train Low maintien | Z2 60-90min, 1 rappel tempo court |");
    lines.push("| TTE faible (<45min) | Seuil continu 2×15min @Z5, Norvégienne simple | Seuil 2×20min→1×30min, Double seuil Norvégienne 2x/sem | Seuil long 1×35-40min, Race pace intégré | 1×20min seuil rappel, volume -50% |");
    lines.push("| FTP/kg bas | Sweet spot 3×12min @88-93% FTP, Z3 tempo 45min | Sweet spot 2×20min, over-unders 6×(3min@105%+2min@85%), Norvégienne vélo | FTP test simulation, race power practice | 1×15min sweet spot rappel |");
    lines.push("| Économie basse | Côtes 8×30s, SFR 3×8min @50rpm, Rønnestad force 2x/sem | Côtes longues 6×2min, pliométrie 80 contacts, force maintien 1x/sem | Rappels côtes courtes, strides post-EF | Strides 6×100m, 1 séance force légère |");
    lines.push("| FatMax bas | Train Low Z2 2h à jeun, Z1 longue 1h30 | Z2 longue 2h30-3h Train Low 2-3x/sem, Gut Training progressif | Simulation nutrition course, Z2 Train Low maintien | Z2 1h à jeun, rappel nutrition |");
    lines.push("| Pmax/Sprint faible | Sprints 6×10s all-out r=3min, force max Rønnestad | Sprints 8×15s, pliométrie drop jumps + bounds, SFR | Rappels 4×8s, maintien plio 1x/sem | 3×6s rappel neuromusculaire |");
    lines.push("| Endurance durabilité | Sorties longues progressives (+10-15min/sem), Z2 2h+ | SL avec finish rapide 25km (derniers 8km @Z4a), briques | Simulation course complète, SL race pace finish | SL courte 60-70min Z2 |");

    lines.push("\n### 🔄 SYNERGIES ENTRE LIMITEURS (Exploiter les interactions positives)");
    lines.push("| Action principale | Effets secondaires positifs |");
    lines.push("|-------------------|---------------------------|");
    lines.push("| VLamax↓ (Z2 long + Train Low) | → TTE↑, FatMax↑, économie glycogène↑ |");
    lines.push("| VO2max↑ (Billat/VMA) | → FTP/kg↑, vitesse aérobie↑, récupération inter-effort↑ |");
    lines.push("| TTE↑ (seuil long Norvégienne) | → allure course↑, résistance fatigue↑, endurance durabilité↑ |");
    lines.push("| Force max (Rønnestad) | → économie↑ (+4.8%), prévention blessures, puissance neuromusculaire↑ |");
    lines.push("| FatMax↑ (Train Low) | → VLamax↓ (synergie), autonomie glycogène↑, durabilité↑ |");
    lines.push("Quand 2 limiteurs ont une synergie positive, les combiner dans la même phase pour maximiser l'effet.\n");

    lines.push("### ⚙️ RÈGLES DE PÉRIODISATION SÉQUENTIELLE STRICTES");
    lines.push("1. **Limiteur #1 (🔴 CRITIQUE)** :");
    lines.push("   - Reçoit la Séance Clé #1 de CHAQUE semaine de la Phase Base à la fin de la Phase Build.");
    lines.push("   - Fréquence : 2-3 stimuli/sem en Base, 2 stimuli/sem en Build, 1-2 rappels en Spécifique.");
    lines.push("   - Le volume/intensité de ce stimulus suit la colonne correspondante dans la matrice ci-dessus.");
    lines.push("2. **Limiteur #2 (🔴 ou 🟡)** :");
    lines.push("   - Reçoit la Séance Clé #2 dès la Phase Base (1-2x/sem), montée en importance en Build (2x/sem).");
    lines.push("   - Si #2 est synergique avec #1, combiner dans certaines séances (ex: Z2 long Train Low travaille VLamax↓ ET FatMax↑).");
    lines.push("3. **Limiteurs #3+ (🟡 SOUS-OPTIMAUX)** :");
    lines.push("   - Intégrés comme composantes secondaires : ex. strides post-EF (économie), rappels force 1x/sem (maintien Rønnestad).");
    lines.push("   - Montée en priorité en Phase Spécifique si les limiteurs #1 et #2 ont suffisamment progressé.");
    lines.push("4. **Principe de non-régression** :");
    lines.push("   - Quand on passe au limiteur suivant, maintenir les acquis du limiteur précédent avec 1 rappel/sem minimum.");
    lines.push("   - Jamais d'abandon complet d'un travail spécifique après une phase.");
    lines.push("5. **Phase Taper** :");
    lines.push("   - Rappels courts de CHAQUE limiteur travaillé (volume -50 à -60%, intensité maintenue).");
    lines.push("   - 1 séance rappel par limiteur adressé dans la dernière semaine pré-course.");

    lines.push("\n⚠️ RÈGLE SÉANCES CLÉS PAR LIMITEUR (RÉSUMÉ RAPIDE) :");
    lines.push("- Limiteur #1 = 'VO2max bas' → clé #1 = VMA/VO2max (Billat 30/30, 5×1200m).");
    lines.push("- Limiteur #1 = 'VLamax trop haute' → clé #1 = Z2 long Train Low + sweet spot long.");
    lines.push("- Limiteur #1 = 'TTE faible' → clé #1 = seuil continu long (Norvégienne 2×20min→1×40min).");
    lines.push("- Limiteur #1 = 'Économie basse' → clé #1 = côtes/SFR + force max (Rønnestad).");
    lines.push("- Limiteur #1 = 'FatMax bas' → clé #1 = Z2 longue à jeun Train Low (2h30+).");
    lines.push("- Limiteur #1 = 'FTP/kg bas' → clé #1 = sweet spot + over-unders + Norvégienne vélo.");
    lines.push("- Le Limiteur #2 reçoit la séance clé #2 avec la même logique.");
    lines.push("- En Phase Spécifique, les séances clés deviennent race-specific tout en maintenant le travail sur les limiteurs principaux.");
  }

  if (config.activeLevers && config.activeLevers.length > 0) {
    lines.push("\n### Leviers TFCL™ Actifs");
    config.activeLevers.forEach((l: string) => lines.push(`- ⚡ ${l}`));
    lines.push("Les leviers actifs doivent être intégrés dans les séances clés 🔑 et les consignes coach.");
  }

  // --- Prohibitions (Sprint Ban, etc.) ---
  if (config.prohibitions && config.prohibitions.length > 0) {
    lines.push("\n### 🚨 INTERDICTIONS / AUTORISATIONS SPÉCIFIQUES À CET ATHLÈTE");
    config.prohibitions.forEach((p: string) => lines.push(`- ${p}`));
    lines.push("Ces règles sont calculées par l'app en fonction de l'objectif, l'ambition et le profil métabolique. Tu DOIS les respecter.");
  }

  // --- Adaptation Predictor Projections ---
  if (config.adaptationProjections && config.adaptationProjections.length > 0) {
    lines.push("\n### 🔮 PROJECTIONS ADAPTATION PREDICTOR™ (Impact attendu du bloc d'entraînement)");
    lines.push("Le module Adaptation Predictor™ a simulé l'impact physiologique attendu. Le plan DOIT s'aligner sur ces projections.");
    lines.push("");

    for (const proj of config.adaptationProjections) {
      const isBest = config.adaptationProjections.indexOf(proj) === 0;
      const tag = isBest ? "⭐ STRATÉGIE RECOMMANDÉE" : "Alternative";
      lines.push(`#### ${tag} : ${proj.leverLabel} (Score impact: ${proj.impactScore}/100 — ${proj.impactLabel})`);
      
      if (proj.metrics && proj.metrics.length > 0) {
        lines.push("Adaptations physiologiques attendues (bloc 4-6 semaines) :");
        for (const m of proj.metrics) {
          const arrow = m.direction === "up" ? "↑" : m.direction === "down" ? "↓" : "→";
          const sign = m.deltaPct > 0 ? "+" : "";
          lines.push(`  - ${m.label}: ${m.current?.toFixed(2) ?? "?"} → ${m.projected?.toFixed(2) ?? "?"} (${sign}${m.deltaPct.toFixed(1)}% ${arrow})`);
        }
      }

      if (proj.performanceImpacts && proj.performanceImpacts.length > 0) {
        const impacts = proj.performanceImpacts
          .filter((p: any) => Math.abs(p.improvementPct) > 0.1)
          .map((p: any) => `${p.distance}: ${p.improvementPct > 0 ? "+" : ""}${p.improvementPct.toFixed(1)}%`)
          .join(", ");
        if (impacts) {
          lines.push(`  Impact performance estimé : ${impacts}`);
        }
      }

      lines.push(`  💡 ${proj.recommendation}`);
      lines.push("");
    }

    lines.push("CONSIGNE : Le plan doit PRIORITAIREMENT appliquer la stratégie recommandée (⭐). Les séances clés doivent refléter les adaptations projetées.");
    lines.push("Mentionne dans le récapitulatif stratégique les projections attendues du Predictor™.");
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
    lines.push("- CAP 75-85% | Renfo 10-15% | Vélo cross-training Z1-Z2 max 5-10%");
    lines.push("- 2 séances qualité/sem + 1 sortie longue progressive");
    lines.push("- Minimum 5 séances CAP/sem : EF, tempo, seuil, SL, fartlek/côtes");
    lines.push("- Vélo optionnel : max 1-2x/sem, 45-60min Z1-Z2 uniquement (récupération active)");
  } else if (obj === "SEMI") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE SEMI-MARATHON");
    lines.push("- CAP 75-85% | Renfo 10-15% | Vélo cross-training Z1-Z2 max 5-10%");
    lines.push("- Accent VMA + seuil. Minimum 4-5 séances CAP/sem.");
    lines.push("- Séances types : EF Z2, Tempo allure semi, VMA 30/30, Seuil 2×20min, SL 15-20km, Fartlek, Côtes");
    lines.push("- Vélo optionnel : max 1-2x/sem, 45-60min Z1-Z2 uniquement");
  } else if (obj === "TRAILULTRA") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE TRAIL ULTRA (>80km)");
    lines.push("- CAP/Trail 65-75% | Renfo 15-20% | Vélo cross-training Z1 5-10%");
    lines.push("- D+ progressif : base 1500m/sem → build 4000m/sem → peak 5000-6000m/sem");
    lines.push("- Back-to-back weekends OBLIGATOIRES en Build/Peak");
    lines.push("- Simulation ultra 6-8h : 1x/mois en Build, 1x en Peak");
    lines.push("- Simulation nuit OBLIGATOIRE : 2-3 sorties nocturnes");
    lines.push("- Force excentrique lourde 2x/sem + proprioception avancée");
    lines.push("- Gut Training progressif 40→90g/h testé en simulation");
    lines.push("- Bâtons : entraînement spécifique si utilisés en course");
    lines.push("- Taper ultra = 14-21j (plus long que route)");
  } else if (obj === "TRAILMOUNTAIN") {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE TRAIL MONTAGNE (42-80km)");
    lines.push("- CAP/Trail 70-80% | Renfo 15-20% | Vélo cross-training Z1 5-10%");
    lines.push("- D+ progressif : base 1000m/sem → build 3000m/sem → peak 4000m/sem");
    lines.push("- Back-to-back weekends en Build/Peak (SL samedi + SL dimanche)");
    lines.push("- Seuil montée long 2x/sem. Descente technique 1x/sem");
    lines.push("- Force excentrique lourd 2x/sem + proprioception");
    lines.push("- Simulation nuit : 1-2 sorties en Peak");
    lines.push("- Gut Training progressif 40→70g/h");
  } else if (["TRAIL", "TRAILSHORT"].includes(obj)) {
    lines.push("\n### ⚠️ RAPPEL COHÉRENCE TRAIL COURT (<42km)");
    lines.push("- CAP/Trail 70-80% | Renfo 20-25% | Vélo Z1 optionnel 0-5%");
    lines.push("- D+ progressif : base 500m/sem → build 1500m/sem → peak 2000m/sem");
    lines.push("- VMA côtes 2x/sem + seuil montée 1x/sem + descente technique 1x/sem");
    lines.push("- Force excentrique prioritaire (prévention quadriceps)");
    lines.push("- Proprioception obligatoire (Bosu, single leg, terrain instable)");
    lines.push("- Séances TOUJOURS en terrain trail/sentier, jamais route");
  } else if (["10K", "10KM", "5K"].includes(obj)) {
    lines.push(`\n### ⚠️ RAPPEL COHÉRENCE ${obj}`);
    lines.push("- CAP 75-85% | Renfo 10-15% | Vélo cross-training Z1-Z2 max 5-10%");
    lines.push("- 1 seuil/tempo + 1 VMA + 1 sortie longue/sem + EF Z2");
    lines.push("- Vélo optionnel : max 1x/sem, 45min Z1-Z2 uniquement");
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

  // Multi-objective: also emit sport coherence for B/C goals
  if (config.raceGoals && config.raceGoals.length > 1) {
    const otherGoals = config.raceGoals.filter((g: any) => g.priority !== "A");
    for (const goal of otherGoals) {
      const goalObj = (goal.objective || "").toUpperCase();
      const goalName = goal.raceName ? ` (${goal.raceName})` : "";
      if (goalObj.includes("MARATHON") || goalObj === "SEMI") {
        lines.push(`\n### ⚠️ RAPPEL : Objectif B${goalName} — ${goal.objective}`);
        lines.push(`- Les semaines précédant cette course B doivent inclure des séances spécifiques à l'allure ${goal.objective}.`);
        lines.push(`- Mini-taper 7-10j avant : réduction volume, rappels allure course.`);
        lines.push(`- Post-course : 1 semaine récupération avant relance vers objectif A.`);
      } else if (["IRONMAN", "IM", "70.3", "703"].some(t => goalObj.includes(t))) {
        lines.push(`\n### ⚠️ RAPPEL : Objectif B${goalName} — ${goal.objective}`);
        lines.push(`- Intégrer natation + vélo + briques dans la préparation vers cette course B.`);
        lines.push(`- Mini-taper 10-14j avant. Simulation race-pace 2 semaines avant la course B.`);
        lines.push(`- Post-course B : 1-2 semaines récupération avant relance.`);
      } else {
        lines.push(`\n### ⚠️ RAPPEL : Objectif B${goalName} — ${goal.objective}`);
        lines.push(`- Inclure des séances spécifiques à cet objectif dans les semaines précédant la date de course.`);
        lines.push(`- Mini-taper 7j avant + récupération post-course.`);
      }
    }
  }

  // Double sessions reminder based on ambition
  const ambition = (config.ambition || "").toLowerCase();
  const isTriathlon = ["IM", "703"].includes(obj);
  if (isTriathlon) {
    lines.push("\n### 🔥🔥🔥 DOUBLES/TRIPLES SÉANCES — RÈGLE #1 LA PLUS IMPORTANTE 🔥🔥🔥");
    lines.push("Un plan triathlon IM/70.3 n'est PAS un plan de course à pied. Un triathlète s'entraîne PLUSIEURS FOIS PAR JOUR.");
    lines.push("⛔ Un jour avec 1 seule séance (hors repos) est une ERREUR GRAVE pour Elite/Competitor.");
    lines.push("");
    if (ambition === "elite") {
      lines.push("Ambition ELITE → minimum 14-16 séances/semaine, 10-14 doubles ou triples.");
      lines.push("- Chaque jour (sauf repos) DOIT avoir 2 ou 3 séances séparées.");
      lines.push("- Utilise la semaine-type Frodeno/Blummenfelt comme référence directe.");
      lines.push("- Volume cible : 22-30h/sem. Nat 4-5 séances, Vélo 4-5, CAP 3-4, Renfo 2-3.");
      lines.push("- Exemples de TRIPLES : Nat matin + Vélo midi + CAP soir. Nat matin + Vélo midi + Renfo soir.");
    } else if (ambition === "competitor") {
      lines.push("Ambition COMPETITOR → minimum 10-12 séances/semaine, 5-8 doubles.");
      lines.push("- Au moins 5 jours avec doubles séances.");
      lines.push("- Volume cible : 15-22h/sem. Nat 3-4 séances, Vélo 3-4, CAP 3-4, Renfo 2.");
    } else if (ambition === "age_group" || ambition === "agegroup") {
      lines.push("Ambition AGE GROUP → 8-10 séances/semaine, 2-4 doubles.");
      lines.push("- 2-3 jours avec doubles séances (nat matin + renfo soir, brique).");
      lines.push("- Volume cible : 10-15h/sem.");
    } else {
      lines.push("Ambition FINISHER → 5-7 séances/semaine, pas de doubles.");
      lines.push("- 1 séance/jour max. Focus terminer en sécurité.");
    }
    lines.push("- Format : UNE LIGNE PAR SÉANCE dans le tableau. 'Mardi matin', 'Mardi midi', 'Mardi soir' = 3 lignes séparées.");
    lines.push("- JAMAIS 2 intensités le même jour sauf brique planifiée.");
    lines.push("- Le tableau d'une semaine Elite IM doit avoir 14-18 lignes (pas 7 !).");
  }

  const weeks = config.weeksAvailable || 12;

  // Multi-objective final reminder
  if (config.raceGoals && config.raceGoals.length > 1) {
    const sortedGoals = [...config.raceGoals].sort((a: any, b: any) => {
      if (a.raceDate && b.raceDate) return a.raceDate.localeCompare(b.raceDate);
      return 0;
    });
    const goalA = sortedGoals.find((g: any) => g.priority === "A");
    const goalsB = sortedGoals.filter((g: any) => g.priority === "B" || g.priority === "C");

    lines.push(`\n---`);
    lines.push(`## 🔥🔥🔥 RAPPEL FINAL MULTI-OBJECTIFS — RÈGLE ABSOLUE 🔥🔥🔥`);
    lines.push(`Ce plan a ${config.raceGoals.length} objectifs de course. Tu DOIS TOUS les intégrer dans la planification :\n`);
    
    sortedGoals.forEach((goal: any) => {
      const prioLabel = goal.priority === "A" ? "🅰️ OBJECTIF PRINCIPAL (pic de forme)" : goal.priority === "B" ? "🅱️ OBJECTIF INTERMÉDIAIRE (mini-taper)" : "🆎 SECONDAIRE";
      const goalWeek = computeGoalWeek(goal);
      const bounds = getWeekBounds(goalWeek);
      const weekInfo = goalWeek ? ` — Semaine cible: S${goalWeek}${bounds ? ` (${bounds.start} → ${bounds.end})` : ""}` : "";
      lines.push(`- **${goal.objective}**${goal.raceName ? ` — ${goal.raceName}` : ""}${goal.raceDate ? ` — ${goal.raceDate}` : ""}${weekInfo} → ${prioLabel}`);
      if (goal.raceDate) {
        lines.push(`  ↳ Date absolue obligatoire: ${goal.raceDate} (${formatIsoDateFr(goal.raceDate)}).`);
      }
    });

    if (goalsB.length > 0) {
      lines.push(`\n### Structure obligatoire pour chaque objectif B/C :`);
      goalsB.forEach((g: any) => {
        const w = computeGoalWeek(g);
        const bounds = getWeekBounds(w);
        if (w) {
          lines.push(`- **${g.objective}${g.raceName ? ` (${g.raceName})` : ""}** : mini-taper en S${Math.max(1, w - 1)}, course en S${w}${bounds ? ` (${bounds.start} → ${bounds.end})` : ""}, récupération en S${w + 1}. Date course IMPÉRATIVE: ${g.raceDate || "n/a"}.`);
        }
      });
      lines.push(`1. **Semaines pré-course B** : les 1-2 semaines avant la course B doivent montrer une RÉDUCTION de volume (-20 à -30%) avec maintien d'intensité courte (mini-taper). Marque-les explicitement "Mini-Taper pour [nom course B]".`);
      lines.push(`2. **Semaine de course B** : la semaine contenant la course B doit inclure la course comme séance principale (ex: "🏁 COURSE : Marathon de Paris"). Volume très réduit le reste de la semaine.`);
      lines.push(`3. **Semaine post-course B** : semaine de récupération (-40% volume, pas d'intensité, régénération). Marque-la "Récupération post-${goalsB[0]?.objective || 'course B'}".`);
      lines.push(`4. **Relance vers objectif A** : après la récupération, reprendre la progression vers l'objectif A avec une montée en charge progressive.`);
      lines.push(`\n⚠️ Si tu génères le plan sans mentionner l'objectif B ni inclure de mini-taper/récupération autour de sa date, le plan est INVALIDE. RECOMMENCE.`);
    }

    if (goalA) {
      lines.push(`\nObjectif principal (A) : ${goalA.objective}${goalA.raceDate ? ` le ${goalA.raceDate}` : ""}. Le pic de forme PRINCIPAL vise cette course.`);
    }
  }

  lines.push(`\n---\nGénère le plan COMPLET de ${weeks} semaines, semaine par semaine, SANS EN OMETTRE AUCUNE. Chaque semaine a son propre tableau. Ne résume jamais. Chaque séance doit être actionnable immédiatement.`);
  if (isTriathlon && ambition !== "finisher") {
    lines.push(`\n⚠️ RAPPEL FINAL : Chaque jour d'entraînement d'un triathlète (sauf repos) doit avoir PLUSIEURS séances (2 ou 3 lignes dans le tableau). Un tableau de semaine IM Elite = 14 à 18 lignes, PAS 7. Si ton tableau a seulement 7-8 lignes pour une semaine IM, RECOMMENCE, c'est insuffisant.`);
  }
  return lines.join("\n");
}
