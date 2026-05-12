/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MINI RAPPORT — Engine de profilage simplifié pour athlète
 *
 * Entrées minimales :
 *   - âge, sexe
 *   - VMA (km/h)
 *   - sprint 15s (mètres parcourus)
 *   - temps semi-marathon ou 20 km (optionnel) — sec
 *
 * Sorties :
 *   - VLamax estimée (calibration P4 : N=15, RMSE 0.073)
 *   - Profil métabolique (explosif / équilibré / endurant)
 *   - MLSS estimée (modèle C : N=44, RMSE 2.64%)
 *   - Allure au seuil (sec/km)
 *   - Zones Z1-Z7 (% VMA)
 *   - Conseils de travail adaptés au profil
 *
 * Ton du verbatim : « athlète éclairé » — termes techniques entre parenthèses.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type ReferenceRaceType = "semi" | "20k";
export type Sex = "M" | "F";
export type ProfileType = "explosif" | "equilibre" | "endurant";
export type VocabularyMode = "expert" | "beginner";

export interface MiniReportInput {
  age: number;
  sex: Sex;
  vmaKmh: number;
  sprint15sM: number;
  /** Temps de référence (secondes) — optionnel */
  referenceTimeSec?: number | null;
  referenceRaceType?: ReferenceRaceType | null;
  /** Nom de l'athlète (optionnel — pour le titre du rapport) */
  athleteName?: string | null;
  /** Mode vocabulaire : 'expert' (défaut, athlète éclairé) ou 'beginner' (ultra-pédagogique) */
  vocabularyMode?: VocabularyMode;
}

export interface TrainingZone {
  id: string;       // Z1..Z7
  label: string;
  pctVmaMin: number;
  pctVmaMax: number;
  paceMinSecPerKm: number;
  paceMaxSecPerKm: number;
  description: string;
  purpose: string;
}

export interface MiniReportResult {
  // Entrées normalisées
  input: Required<Omit<MiniReportInput, "referenceTimeSec" | "referenceRaceType" | "athleteName" | "vocabularyMode">> & {
    referenceTimeSec: number | null;
    referenceRaceType: ReferenceRaceType | null;
    athleteName: string | null;
    vocabularyMode: VocabularyMode;
  };
  // Calculs
  vlamax: number;                    // mmol/L/s (estimée)
  vlamaxConfidence: "good" | "moderate" | "low";
  profile: ProfileType;
  profileLabel: string;              // "Explosif", "Équilibré", "Endurant"
  ceMlPerKgPerKm: number;            // Coût énergétique estimé (mL O2/kg/km)
  mlssPct: number;                   // % de VMA
  paceThresholdSecPerKm: number;     // sec/km
  paceObservedSecPerKm: number | null; // depuis temps semi/20k si fourni
  vmaPaceSecPerKm: number;           // 100% VMA
  zones: TrainingZone[];
  // Verbatim
  profileNarrative: string;
  trainingAdvice: string[];
  caveats: string[];
}

// =============================================
// 1. VLAMAX depuis sprint 15s — Calibration P4
//    VLamax = −0.5066 + 0.01420 · sprint_m
//    Bornes physiologiques [0.20 ; 1.20] mmol/L/s
// =============================================
/**
 * Calibration P4 (N=15) : VLamax = −0.5066 + 0.01420·sprint_m
 * Spécificité course à pied : un sprint 15 s départ arrêté mobilise massivement
 * la PCr (filière alactique) — la corrélation sprint→VLamax est plus faible
 * qu'en sprint cycliste/Wingate. On applique :
 *   - un facteur correctif global de 0.80 (atténuation course à pied)
 *   - un offset négatif pour ramener la moyenne d'un coureur d'endurance vers ~0.40
 *   - bornes physiologiques resserrées [0.20 ; 1.00]
 */
export function estimateVLamaxFromSprint(sprint15sM: number): number {
  const rawP4 = -0.5066 + 0.01420 * sprint15sM;
  const runAdjusted = rawP4 * 0.80 - 0.05;
  return Math.max(0.20, Math.min(1.00, Math.round(runAdjusted * 100) / 100));
}

function vlamaxConfidenceFromSprint(sprint15sM: number): "good" | "moderate" | "low" {
  // Plage validée resserrée : 70-95 m couvre le cœur de la cohorte runners.
  if (sprint15sM >= 70 && sprint15sM <= 95) return "good";
  if (sprint15sM >= 55 && sprint15sM <= 115) return "moderate";
  return "low";
}

// =============================================
// 2. Profil métabolique
// =============================================
// Seuils recalibrés pour la course à pied (post-correctif sprint→VLamax)
export function classifyProfile(vlamax: number): ProfileType {
  if (vlamax >= 0.65) return "explosif";
  if (vlamax < 0.45) return "endurant";
  return "equilibre";
}

const PROFILE_LABELS: Record<ProfileType, string> = {
  explosif: "Explosif",
  equilibre: "Équilibré",
  endurant: "Endurant",
};

// =============================================
// 3. Coût énergétique (CE) — proxy âge / VMA / sexe
//    Référence trained runner : ~200 mL O2/kg/km
//    Femmes : +5 mL en moyenne (plus petit pas, foulée plus économe variable)
//    Vétéran : +10 mL après 45 ans
// =============================================
// CE recalé sur runner club/loisir (la version précédente, 210 − 0.6·VMA,
// reflétait une moyenne élite trop optimiste).
export function estimateCE(age: number, sex: Sex, vmaKmh: number): number {
  let ce = 220 - 0.7 * vmaKmh;
  if (sex === "F") ce += 5;
  if (age >= 45) ce += 5;
  if (age >= 60) ce += 5;
  return Math.round(Math.max(180, Math.min(245, ce)));
}

// =============================================
// 4. MLSS (% VMA) — Modèle C calibré N=44
//    MLSS_pct = 1 − 0.337·VLamax − 0.0021·(CE − 200)
//    Bornes : [0.78 ; 0.92]
// =============================================
export function estimateMLSSPct(vlamax: number, ceMlPerKgPerKm: number): number {
  const raw = 1 - 0.337 * vlamax - 0.0021 * (ceMlPerKgPerKm - 200);
  return Math.max(0.78, Math.min(0.92, Math.round(raw * 1000) / 1000));
}

// =============================================
// 5. Allures
// =============================================
function vmaToPaceSecPerKm(vmaKmh: number): number {
  return Math.round(3600 / vmaKmh);
}

function paceFromTimeAndDistance(timeSec: number, distanceKm: number): number {
  return Math.round(timeSec / distanceKm);
}

// =============================================
// 6. Zones Z1-Z7 (% VMA)
// =============================================
function buildZones(vmaKmh: number): TrainingZone[] {
  const baseSec = 3600 / vmaKmh; // sec/km à 100% VMA

  const paceFor = (pct: number) => Math.round(baseSec / pct);

  const ZONES: Array<Omit<TrainingZone, "paceMinSecPerKm" | "paceMaxSecPerKm">> = [
    {
      id: "Z1",
      label: "Récupération active",
      pctVmaMin: 50,
      pctVmaMax: 60,
      description: "Allure très facile, conversation aisée. Cardio < 70% FC max.",
      purpose: "Récupération entre séances dures, échauffement, retour au calme.",
    },
    {
      id: "Z2",
      label: "Endurance fondamentale",
      pctVmaMin: 60,
      pctVmaMax: 75,
      description: "Allure confortable, respiration nasale possible. Pilier de la base aérobie.",
      purpose: "Développer la capillarisation, le métabolisme des graisses, l'endurance générale.",
    },
    {
      id: "Z3",
      label: "Endurance critique / Tempo",
      pctVmaMin: 75,
      pctVmaMax: 85,
      description: "Allure soutenue mais maîtrisée, conversation par phrases courtes.",
      purpose: "Améliorer la clairance du lactate sous le seuil, allure marathon/semi.",
    },
    {
      id: "Z4",
      label: "Seuil lactique (MLSS)",
      pctVmaMin: 85,
      pctVmaMax: 92,
      description: "Allure proche d'un effort 1h all-out (≈ semi-marathon rapide).",
      purpose: "Repousser le seuil — pierre angulaire pour les distances 10k à semi.",
    },
    {
      id: "Z5",
      label: "VO2max",
      pctVmaMin: 92,
      pctVmaMax: 100,
      description: "Effort intense, respiration ample. Soutenable 5 à 12 min en continu.",
      purpose: "Élever le plafond aérobie, intervalles de 3 à 6 min ou 30/30.",
    },
    {
      id: "Z6",
      label: "Anaérobie lactique",
      pctVmaMin: 100,
      pctVmaMax: 115,
      description: "Au-dessus de VMA, sollicite la glycolyse rapide (production lactate).",
      purpose: "Tolérance lactique, intervalles courts 30s à 2 min avec repos long.",
    },
    {
      id: "Z7",
      label: "Sprint / Neuromusculaire",
      pctVmaMin: 115,
      pctVmaMax: 150,
      description: "Effort maximal court (< 15 s). Filière phosphocréatine + recrutement.",
      purpose: "Force-vitesse, économie de course, foulée — repos complet entre reps.",
    },
  ];

  return ZONES.map((z) => ({
    ...z,
    paceMinSecPerKm: paceFor(z.pctVmaMax / 100),
    paceMaxSecPerKm: paceFor(z.pctVmaMin / 100),
  }));
}

// =============================================
// 7. Verbatim profil + conseils
// =============================================
function buildProfileNarrative(
  profile: ProfileType,
  vlamax: number,
  sex: Sex,
  age: number,
  mode: VocabularyMode = "expert"
): string {
  const vlamaxStr = vlamax.toFixed(2);
  const ageStr = age >= 45 ? "vétéran" : age >= 35 ? "senior" : "jeune adulte";
  const sexStr = sex === "F" ? "athlète féminine" : "athlète masculin";

  if (mode === "beginner") {
    switch (profile) {
      case "explosif":
        return (
          `Ton corps est plutôt **type "moteur diesel turbo"** : il sait produire beaucoup d'énergie ` +
          `très vite (utile pour sprinter, monter une côte, accélérer en fin de course). ` +
          `En contrepartie, à allure modérée tu fabriques rapidement de **l'acide lactique** ` +
          `(ce qui brûle les jambes), et ton corps consomme beaucoup d'énergie sur les longues distances. ` +
          `Concrètement : tu pars vite, mais tu peux "exploser" sur un semi ou un marathon si tu pars trop fort. ` +
          `Indicateur technique (à titre d'info) : VLamax ≈ ${vlamaxStr} (la moyenne d'un coureur d'endurance est autour de 0.40). ` +
          `Ton enjeu : **apprendre à courir lentement et longtemps** pour développer ton "moteur d'endurance".`
        );
      case "endurant":
        return (
          `Ton corps est plutôt **type "diesel longue distance"** : il consomme peu d'énergie à allure ` +
          `modérée et fabrique très peu d'acide lactique. Tu es naturellement à l'aise sur les longues sorties ` +
          `(semi, marathon, trail) et tu récupères vite entre tes séances. ` +
          `En contrepartie, tu manques un peu de "punch" : sur un 5 km ou un 10 km rapide, tu peux te faire ` +
          `décrocher par des coureurs moins endurants mais plus explosifs. ` +
          `Indicateur technique (à titre d'info) : VLamax ≈ ${vlamaxStr} (un sprinter dépasse souvent 0.60). ` +
          `Ton enjeu : **mettre un peu de piquant** dans ton entraînement pour gagner en vitesse.`
        );
      case "equilibre":
        return (
          `Ton corps est **équilibré** entre vitesse et endurance — tu n'as pas de point faible majeur, ` +
          `mais pas non plus d'avantage écrasant dans un domaine particulier. ` +
          `Tu peux performer aussi bien sur du 5 km que sur un semi-marathon, et c'est surtout ` +
          `**la façon dont tu t'entraînes** qui décidera de tes progrès. ` +
          `Indicateur technique (à titre d'info) : VLamax ≈ ${vlamaxStr} (zone typique des coureurs polyvalents). ` +
          `Bon à savoir : tous types d'objectifs te sont accessibles, du moment que ton plan est cohérent avec la cible.`
        );
    }
  }

  switch (profile) {
    case "explosif":
      return (
        `Tu sembles être un profil **explosif**, avec une glycolyse rapide bien développée ` +
        `(VLamax estimée ≈ ${vlamaxStr} mmol/L/s — la moyenne d'un coureur d'endurance se situe autour de 0.40). ` +
        `Ce profil te donne un avantage net sur les efforts courts et puissants (sprints, relances, côtes brèves), ` +
        `mais peut limiter ton endurance au seuil : ton organisme produit beaucoup de lactate à intensité ` +
        `modérée, ce qui dégrade ton coût énergétique sur les distances longues (semi, marathon). ` +
        `En tant que ${sexStr} ${ageStr}, ton enjeu est de **modérer** cette glycolyse pour gagner en économie sur le long.`
      );
    case "endurant":
      return (
        `Tu sembles être un profil **endurant**, avec une glycolyse modérée et donc une ` +
        `excellente capacité à soutenir des allures sub-seuil sans accumulation de lactate ` +
        `(VLamax estimée ≈ ${vlamaxStr} mmol/L/s — un sprinter dépasse souvent 0.60). ` +
        `Tu es naturellement à l'aise sur les distances longues (semi, marathon, ultra) et tu ` +
        `récupères bien entre les séances aérobies. En revanche, tu manques probablement de ` +
        `puissance et de tolérance lactique pour les efforts courts intenses (10k, intervalles VO2max). ` +
        `Pour ton profil ${ageStr}, l'enjeu est d'**ajouter du piquant** sans détruire ta base.`
      );
    case "equilibre":
      return (
        `Tu sembles être un profil **équilibré** entre filière aérobie et glycolytique ` +
        `(VLamax estimée ≈ ${vlamaxStr} mmol/L/s — dans la plage typique des coureurs polyvalents). ` +
        `Cette polyvalence te rend adapté à un large spectre de distances, du 5k au semi-marathon. ` +
        `Ton profil ne te ferme aucune porte mais ne te donne pas non plus d'avantage marqué : ` +
        `c'est la spécificité de ton entraînement qui orientera tes performances. ` +
        `En tant que ${sexStr} ${ageStr}, tu peux progresser de façon significative sur ` +
        `n'importe quelle distance avec une planification ciblée.`
      );
  }
}

function buildTrainingAdvice(profile: ProfileType, mode: VocabularyMode = "expert"): string[] {
  if (mode === "beginner") {
    switch (profile) {
      case "explosif":
        return [
          "**Cours lentement, longtemps** : 60 à 90 min à allure facile (tu dois pouvoir parler en faisant des phrases entières), 2 à 3 fois par semaine. C'est ta priorité n°1 — c'est ce qui va construire ton « moteur d'endurance ».",
          "**Une séance « tempo » par semaine** : 2 × 20 min à allure soutenue mais pas maximale (tu dois pouvoir dire 2-3 mots à la fois). Ça apprend à ton corps à gérer l'acide lactique.",
          "**Limite les séances très intenses** (sprints, fractionnés courts à fond) : 1 fois toutes les 2 semaines suffit. Tu as déjà la vitesse naturellement — c'est l'endurance qu'il te faut développer.",
          "**Une sortie longue par semaine** (1h15 à 2h très tranquille). Idéalement le matin avec juste un café — ça apprend à ton corps à brûler les graisses.",
          "Renforcement musculaire 1 à 2 fois par semaine (gainage, squats, sauts) pour garder ta puissance naturelle.",
        ];
      case "endurant":
        return [
          "**Continue tes sorties tranquilles** (allure conversationnelle) — c'est ton point fort. Mais ne fais pas QUE ça.",
          "**Ajoute 1 séance "puissance" par semaine** : 5-6 fois 3 min très rapide (presque tout donné), avec 2 min de footing entre chaque. Ça va développer ton plafond de vitesse.",
          "**Fais des petits sprints en côte** une fois par semaine : 6 à 8 sprints de 8-12 secondes en montée, avec récupération complète. Ça travaille ta puissance et ta foulée.",
          "**Avant un objectif court** (10 km, cross), ajoute des séances un peu douloureuses : 8-10 fois 1 min à fond, avec 1 min de récup. Ça apprend à ton corps à supporter l'effort intense.",
          "Gainage et exercices de sauts 2 fois par semaine — ça rend ta foulée plus économique.",
        ];
      case "equilibre":
        return [
          "**Adapte selon ton objectif** : pour un semi/marathon → privilégie les sorties longues et tempo ; pour un 10k ou un trail court → ajoute des séances de vitesse.",
          "**Règle simple "80/20"** : 80% du temps en allure facile (tu peux discuter), 20% en allure dure. Ne te trompe pas dans le dosage.",
          "**Teste-toi régulièrement** (un 30 min en course officielle, ou un semi de prépa) pour bien caler tes allures d'entraînement — ton profil polyvalent réagit bien à un suivi précis.",
          "**Garde quelques sprints courts** (1 fois par semaine, en fin de sortie facile) pour entretenir ta vitesse maximale et ta foulée.",
          "Suis une logique de progression classique : d'abord du foncier (endurance), puis du seuil, puis de la vitesse, puis du repos avant la course.",
        ];
    }
  }

  switch (profile) {
    case "explosif":
      return [
        "**Construire la base aérobie en Z2** : 60 à 90 min à 65-72 % VMA, 2 à 3 fois par semaine. Chantier prioritaire pour gagner en économie et baisser la production de lactate à intensité modérée.",
        "**Travail sub-seuil (Z3) et seuil (Z4)** : 2 × 20 min ou 3 × 15 min à 80-88 % VMA pour entraîner la clairance lactate — ce que ton profil glycolytique pénalise.",
        "**Limiter (sans supprimer) les séances très intenses** Z6/Z7 : 1×/2 sem max sur cycles d'endurance. Tu as déjà la puissance, c'est l'aérobie qu'il faut renforcer.",
        "**Sortie longue 1×/sem** (75-120 min en Z1-Z2, idéalement à jeun léger) pour stimuler la lipolyse et la densité mitochondriale.",
        "Force/pliométrie 1-2×/sem pour exploiter ton avantage neuromusculaire sans dérouter la base aérobie.",
      ];
    case "endurant":
      return [
        "**Préserver le socle Z2** (60-75 % VMA) qui est ton point fort, mais ne pas y consacrer 100 % du volume.",
        "**Ajouter 1 séance VO2max (Z5)** par semaine en cycle dur : 5-6 × 3 min à 95-100 % VMA, récup 2 min trot. Sert à élever ton plafond.",
        "**Travail de force-vitesse hebdo** : 6-8 sprints courts 8-12 s en côte, récup complète. Stimule le recrutement et préserve la foulée.",
        "**Tolérance lactique (Z6)** ponctuellement avant un objectif court (10k, cross) : 8-10 × 1 min à 105-110 % VMA, récup 1 min.",
        "Gainage et pliométrie 2×/sem pour économiser ta foulée — la marge de progression ici est souvent plus grande que sur le métabolique.",
      ];
    case "equilibre":
      return [
        "**Adapter le mix selon l'objectif** : semi/marathon → charger Z2-Z3-Z4 ; 10k ou trail court → ajouter Z5-Z6.",
        "**Modèle polarisé 80/20** : 1 séance qualité basse intensité + 1 séance haute intensité par semaine, le reste en Z1-Z2.",
        "**Tester ton seuil régulièrement** (30 min CP, ou semi de prépa) pour caler tes zones avec précision — ton profil polyvalent répond bien à un calage fin.",
        "**Conserver les sprints courts (Z7)** 1×/sem en fin de Z2 pour entretenir vitesse maximale et économie.",
        "Périodisation classique adaptée : phase aérobie → seuil → VO2max → affûtage.",
      ];
  }
}

// =============================================
// 8. Pipeline principal
// =============================================
export function computeMiniReport(input: MiniReportInput): MiniReportResult {
  const vlamax = estimateVLamaxFromSprint(input.sprint15sM);
  const vlamaxConfidence = vlamaxConfidenceFromSprint(input.sprint15sM);
  const profile = classifyProfile(vlamax);
  const ce = estimateCE(input.age, input.sex, input.vmaKmh);
  const mlssPctModel = estimateMLSSPct(vlamax, ce);

  const vmaPaceSecPerKm = vmaToPaceSecPerKm(input.vmaKmh);

  // Allure observée depuis temps semi/20k (si fourni)
  let paceObservedSecPerKm: number | null = null;
  let mlssPctEffective = mlssPctModel;
  let mlssAnchorSource: "model_C" | "race_anchor" = "model_C";

  if (input.referenceTimeSec && input.referenceRaceType) {
    const distanceKm = input.referenceRaceType === "semi" ? 21.0975 : 20;
    paceObservedSecPerKm = paceFromTimeAndDistance(input.referenceTimeSec, distanceKm);

    // Ratio race→MLSS : un coureur entraîné soutient ~90 % MLSS sur semi/20k.
    // → vMLSS_kmh = vRace_kmh / 0.90  ; mlssPct = vMLSS / VMA
    const RACE_TO_MLSS_RATIO = 0.90;
    const vRaceKmh = (distanceKm / input.referenceTimeSec) * 3600;
    const vMlssKmh = vRaceKmh / RACE_TO_MLSS_RATIO;
    const mlssPctFromRace = vMlssKmh / input.vmaKmh;

    // Sanity bounds : on n'accepte le recalage que si plausible
    if (mlssPctFromRace >= 0.75 && mlssPctFromRace <= 0.95) {
      mlssPctEffective = Math.round(mlssPctFromRace * 1000) / 1000;
      mlssAnchorSource = "race_anchor";
    }
  }

  const paceThresholdSecPerKm = Math.round(vmaPaceSecPerKm / mlssPctEffective);

  const zones = buildZones(input.vmaKmh);
  const profileNarrative = buildProfileNarrative(profile, vlamax, input.sex, input.age);
  const trainingAdvice = buildTrainingAdvice(profile);

  const caveats: string[] = [
    "Estimation à partir de 4 à 5 paramètres terrain — précision indicative (±5 % sur les allures, ±0.10 mmol/L/s sur la VLamax).",
    "Pour une analyse fine, un test labo lactate (4-5 paliers) ou un test VLamax dédié est recommandé.",
  ];
  if (mlssAnchorSource === "race_anchor") {
    caveats.push(
      `Allure au seuil ancrée sur ton temps ${input.referenceRaceType === "semi" ? "semi-marathon" : "20 km"} (ratio race→MLSS = 0.90) — plus fiable que l'estimation modèle.`
    );
  }
  if (vlamaxConfidence === "low") {
    caveats.push("Sprint 15s hors plage validée (70-95 m) — la VLamax estimée est à interpréter avec prudence.");
  } else if (vlamaxConfidence === "moderate") {
    caveats.push("Sprint 15s en marge de la plage validée — confiance modérée sur la VLamax.");
  }
  if (paceObservedSecPerKm && mlssAnchorSource === "model_C") {
    const deltaSec = paceObservedSecPerKm - paceThresholdSecPerKm;
    if (Math.abs(deltaSec) > 15) {
      caveats.push(
        `Écart marqué entre allure ${input.referenceRaceType === "semi" ? "semi" : "20k"} (${formatPace(paceObservedSecPerKm)}/km) ` +
        `et seuil estimé (${formatPace(paceThresholdSecPerKm)}/km) — VMA ou sprint 15s peut-être à recalibrer.`
      );
    }
  }

  return {
    input: {
      age: input.age,
      sex: input.sex,
      vmaKmh: input.vmaKmh,
      sprint15sM: input.sprint15sM,
      referenceTimeSec: input.referenceTimeSec ?? null,
      referenceRaceType: input.referenceRaceType ?? null,
      athleteName: input.athleteName ?? null,
    },
    vlamax,
    vlamaxConfidence,
    profile,
    profileLabel: PROFILE_LABELS[profile],
    ceMlPerKgPerKm: ce,
    mlssPct: mlssPctEffective,
    paceThresholdSecPerKm,
    paceObservedSecPerKm,
    vmaPaceSecPerKm,
    zones,
    profileNarrative,
    trainingAdvice,
    caveats,
  };
}

// =============================================
// Helpers de formatage
// =============================================
export function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatTime(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function parseTimeToSec(input: string): number | null {
  const parts = input.trim().split(":").map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}
