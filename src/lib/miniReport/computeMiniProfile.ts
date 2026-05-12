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
  input: Required<Omit<MiniReportInput, "referenceTimeSec" | "referenceRaceType" | "athleteName">> & {
    referenceTimeSec: number | null;
    referenceRaceType: ReferenceRaceType | null;
    athleteName: string | null;
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
export function estimateVLamaxFromSprint(sprint15sM: number): number {
  const raw = -0.5066 + 0.01420 * sprint15sM;
  return Math.max(0.20, Math.min(1.20, Math.round(raw * 100) / 100));
}

function vlamaxConfidenceFromSprint(sprint15sM: number): "good" | "moderate" | "low" {
  // Plage de calibration : 60-110m couverts par la cohorte N=15
  if (sprint15sM >= 65 && sprint15sM <= 110) return "good";
  if (sprint15sM >= 50 && sprint15sM <= 130) return "moderate";
  return "low";
}

// =============================================
// 2. Profil métabolique
// =============================================
export function classifyProfile(vlamax: number): ProfileType {
  if (vlamax >= 0.55) return "explosif";
  if (vlamax <= 0.35) return "endurant";
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
export function estimateCE(age: number, sex: Sex, vmaKmh: number): number {
  let ce = 210 - 0.6 * vmaKmh; // proxy : VMA élevée → meilleure économie
  if (sex === "F") ce += 5;
  if (age >= 45) ce += 5;
  if (age >= 60) ce += 5;
  return Math.round(Math.max(170, Math.min(240, ce)));
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
  age: number
): string {
  const vlamaxStr = vlamax.toFixed(2);
  const ageStr = age >= 45 ? "vétéran" : age >= 35 ? "senior" : "jeune adulte";
  const sexStr = sex === "F" ? "athlète féminine" : "athlète masculin";

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

function buildTrainingAdvice(profile: ProfileType): string[] {
  switch (profile) {
    case "explosif":
      return [
        "**Privilégier l'endurance fondamentale (Z2)** : 60 à 90 min à 65-72 % VMA, 2 à 3 fois par semaine. C'est ton chantier prioritaire pour gagner en économie.",
        "**Travail sub-seuil (Z3)** plutôt que Z6 : 2 × 20 min ou 3 × 15 min à 78-83 % VMA pour habituer ton corps à clairer le lactate à intensité modérée.",
        "**Réduire la part de séances très intenses** (Z6/Z7) à 1 fois toutes les 2 semaines max, sinon tu renforces ton biais glycolytique.",
        "**Sortie longue à jeun 1×/semaine** (45-75 min en Z1-Z2) pour stimuler la lipolyse et la fonction mitochondriale.",
        "Surveiller la nutrition : éviter les pics de glycémie pré-séance Z2 — un café noir + un peu de gras suffisent.",
      ];
    case "endurant":
      return [
        "**Ajouter 1 séance VO2max (Z5) par semaine** : 5-6 × 3 min à 95-100 % VMA, récup 2 min trot. Tu en as besoin pour élever ton plafond.",
        "**Travail de force-vitesse** : sprints courts 6-8 × 10 s en côte, récup complète. Stimule le recrutement neuromusculaire.",
        "**Tolérance lactique (Z6)** ponctuellement : 8-10 × 1 min à 105-110 % VMA, récup 1 min — utile avant un objectif 10k.",
        "**Conserver le volume Z2** comme socle, mais ne pas en faire à 100 % de l'entraînement : sinon tu plafonnes vite.",
        "Travail de gainage et pliométrie 2×/sem pour économiser ta foulée.",
      ];
    case "equilibre":
      return [
        "**Cibler ton objectif** : pour un semi/marathon, charger en Z2-Z3-Z4 ; pour un 10k ou trail court, ajouter Z5-Z6.",
        "**Une séance qualité « basse intensité » + une « haute intensité » par semaine** (modèle polarisé 80/20).",
        "**Tester ton MLSS** régulièrement (ex : 30 min all-out lactate steady) pour calibrer tes zones avec précision.",
        "**Ne pas négliger les sprints courts** (Z7) : 1×/sem en fin de Z2 pour entretenir la vitesse maximale.",
        "Profil qui répond bien à la périodisation classique : phase aérobie → seuil → VO2max → affûtage.",
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
  const mlssPct = estimateMLSSPct(vlamax, ce);

  const vmaPaceSecPerKm = vmaToPaceSecPerKm(input.vmaKmh);
  const paceThresholdSecPerKm = Math.round(vmaPaceSecPerKm / mlssPct);

  // Allure observée depuis temps semi/20k (si fourni)
  let paceObservedSecPerKm: number | null = null;
  if (input.referenceTimeSec && input.referenceRaceType) {
    const distanceKm = input.referenceRaceType === "semi" ? 21.0975 : 20;
    paceObservedSecPerKm = paceFromTimeAndDistance(input.referenceTimeSec, distanceKm);
  }

  const zones = buildZones(input.vmaKmh);
  const profileNarrative = buildProfileNarrative(profile, vlamax, input.sex, input.age);
  const trainingAdvice = buildTrainingAdvice(profile);

  const caveats: string[] = [
    "Estimation à partir de 4 à 5 paramètres terrain — précision indicative (±5 % sur les allures, ±0.10 mmol/L/s sur la VLamax).",
    "Pour une analyse fine, un test labo lactate (4-5 paliers) ou un test VLamax dédié est recommandé.",
  ];
  if (vlamaxConfidence === "low") {
    caveats.push("Sprint 15s hors plage de calibration — la VLamax estimée est à interpréter avec prudence.");
  }
  if (paceObservedSecPerKm) {
    const deltaSec = paceObservedSecPerKm - paceThresholdSecPerKm;
    if (Math.abs(deltaSec) > 15) {
      caveats.push(
        `Écart entre allure ${input.referenceRaceType === "semi" ? "semi" : "20k"} (${formatPace(paceObservedSecPerKm)}/km) ` +
        `et seuil estimé (${formatPace(paceThresholdSecPerKm)}/km) supérieur à 15 s/km — ta VMA ou ton VLamax pourraient être à recalibrer.`
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
    mlssPct,
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
