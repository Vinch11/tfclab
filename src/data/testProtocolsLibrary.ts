/**
 * Bibliothèque de Protocoles de Tests Intégrés TFCL
 * Tests terrain standardisés pour alimenter les modèles V2
 */

export type TestCategory = "VLAMAX" | "TTE" | "FATMAX" | "ECONOMY" | "REFERENCE";
export type TestSport = "bike" | "run" | "triathlon";
export type TestDifficulty = "easy" | "moderate" | "hard";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface TestEquipment {
  name: string;
  required: boolean;
  alternatives?: string[];
}

export interface TestValidityCondition {
  id: string;
  label: string;
  critical: boolean;
}

export interface TestWarmupStep {
  durationMin: number;
  description: string;
  intensity?: string;
}

export interface TestMainStep {
  stepNumber: number;
  description: string;
  durationMin?: number;
  repetitions?: number;
  recoveryMin?: number;
  notes?: string;
}

export interface TestValidationCriteria {
  id: string;
  label: string;
  threshold?: string;
  invalidFlag?: string;
}

export interface TestInputField {
  key: string;
  label: string;
  unit: string;
  type: "number" | "time" | "select";
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  options?: { value: string; label: string }[];
  required: boolean;
}

export interface TestResult {
  primaryValue: number;
  normalizedValue: number;
  unit: string;
  label: string;
}

export interface TFCLImpact {
  parameter: string;
  confidenceBoost: number;
  description: string;
}

export interface IntegratedTestProtocol {
  id: string;
  name: string;
  shortName: string;
  sport: TestSport;
  category: TestCategory;
  difficulty: TestDifficulty;
  
  // Objectif clair
  objective: string;
  targetParameters: string[];
  
  // Précision attendue
  expectedPrecision: ConfidenceLevel;
  reliabilityScore: number; // 0-1
  
  // Matériel requis
  equipment: TestEquipment[];
  
  // Conditions de validité
  validityConditions: TestValidityCondition[];
  
  // Échauffement standardisé
  warmup: TestWarmupStep[];
  
  // Protocole de test
  protocol: TestMainStep[];
  
  // Règles de pacing/cadence
  pacingRules: string[];
  
  // Critères de validation
  validationCriteria: TestValidationCriteria[];
  
  // Champs de saisie
  inputFields: TestInputField[];
  
  // Impact TFCL
  tfclImpact: TFCLImpact[];
  
  // Calcul
  compute: (inputs: Record<string, number>, athleteWeight?: number) => {
    ok: boolean;
    result?: TestResult;
    error?: string;
    confidence: number;
    rawData: Record<string, number>;
  };
}

// ========================================
// TESTS VÉLO
// ========================================

export const BIKE_VLAMAX_SPRINT_15S: IntegratedTestProtocol = {
  id: "bike_vlamax_sprint_15s",
  name: "Test VLamax Vélo – Sprint 15s",
  shortName: "Sprint 15s Vélo",
  sport: "bike",
  category: "VLAMAX",
  difficulty: "moderate",
  
  objective: "Estimer la VLamax de manière plus précise en quantifiant la capacité glycolytique réelle via la puissance maximale sur 15 secondes.",
  targetParameters: ["VLamax", "Pmax"],
  expectedPrecision: "high",
  reliabilityScore: 0.85,
  
  equipment: [
    { name: "Home trainer ou piste", required: true },
    { name: "Capteur de puissance (Assioma, Garmin, Wahoo)", required: true },
    { name: "Montre/compteur GPS", required: true },
    { name: "Ceinture cardio", required: false }
  ],
  
  validityConditions: [
    { id: "rest48h", label: "48h sans intensité haute", critical: true },
    { id: "glycemia", label: "Glycémie correcte (repas 2-3h avant)", critical: true },
    { id: "sleep", label: "Sommeil ≥ 7h", critical: false },
    { id: "temperature", label: "Température ambiante 18-24°C", critical: false },
    { id: "noFatigue", label: "Pas de fatigue résiduelle", critical: true }
  ],
  
  warmup: [
    { durationMin: 10, description: "Zone 2 progressif", intensity: "65-70% FTP" },
    { durationMin: 5, description: "Montée progressive vers Z3", intensity: "75-80% FTP" },
    { durationMin: 6, description: "3×10s accélérations progressives", intensity: "80-90-100%" },
    { durationMin: 4, description: "Récupération complète", intensity: "Z1" }
  ],
  
  protocol: [
    { stepNumber: 1, description: "Position prête, cadence libre", notes: "Départ lancé 20-25 km/h" },
    { stepNumber: 2, description: "Sprint ALL-OUT pendant exactement 15 secondes", notes: "Cadence naturelle, éviter >115 rpm forcé" },
    { stepNumber: 3, description: "Récupération Z1", durationMin: 5 },
    { stepNumber: 4, description: "2ème sprint ALL-OUT 15 secondes", notes: "Même consignes" },
    { stepNumber: 5, description: "Récupération Z1", durationMin: 5 },
    { stepNumber: 6, description: "3ème sprint ALL-OUT 15 secondes (optionnel)", notes: "Si écart >5% entre les 2 premiers" }
  ],
  
  pacingRules: [
    "Cadence libre mais CONSIGNÉE pour chaque sprint",
    "Départ lancé obligatoire (20-25 km/h)",
    "Éviter les pics de cadence >115 rpm non naturels",
    "Engagement maximal dès le départ",
    "Maintenir l'effort jusqu'au signal de fin"
  ],
  
  validationCriteria: [
    { id: "variance", label: "Écart < 5% entre les 2 meilleurs sprints", threshold: "5%", invalidFlag: "variance_too_high" },
    { id: "power_stable", label: "Puissance stable ≥80% de la moyenne sur l'effort", threshold: "80%" },
    { id: "cadence", label: "Cadence cohérente (±10 rpm entre sprints)", threshold: "10 rpm" },
    { id: "rpe", label: "RPE ≥ 9/10 en fin de sprint", threshold: "9/10" }
  ],
  
  inputFields: [
    { key: "power15s_1", label: "Puissance moyenne sprint 1", unit: "W", type: "number", min: 200, max: 2500, step: 1, required: true },
    { key: "power15s_2", label: "Puissance moyenne sprint 2", unit: "W", type: "number", min: 200, max: 2500, step: 1, required: true },
    { key: "power15s_3", label: "Puissance moyenne sprint 3 (opt)", unit: "W", type: "number", min: 200, max: 2500, step: 1, required: false },
    { key: "cadence_avg", label: "Cadence moyenne", unit: "rpm", type: "number", min: 60, max: 150, step: 1, required: true },
    { key: "hr_max", label: "FC max atteinte", unit: "bpm", type: "number", min: 100, max: 220, step: 1, required: false }
  ],
  
  tfclImpact: [
    { parameter: "VLamax", confidenceBoost: 0.15, description: "Augmente la confiance VLamax de +0.15" },
    { parameter: "Pmax", confidenceBoost: 0.10, description: "Calibre la puissance maximale" }
  ],
  
  compute: (inputs, athleteWeight) => {
    const p1 = inputs.power15s_1;
    const p2 = inputs.power15s_2;
    const p3 = inputs.power15s_3 || 0;
    
    if (!p1 || !p2) {
      return { ok: false, error: "Puissances requises", confidence: 0, rawData: inputs };
    }
    
    const powers = [p1, p2, p3].filter(p => p > 0).sort((a, b) => b - a);
    const bestTwo = powers.slice(0, 2);
    const avgPower = (bestTwo[0] + bestTwo[1]) / 2;
    
    // Variance check
    const variance = Math.abs(bestTwo[0] - bestTwo[1]) / avgPower * 100;
    let confidence = 0.85;
    if (variance > 5) confidence = 0.70;
    if (variance > 10) confidence = 0.55;
    
    // VLamax estimation (simplified model)
    const vlamax = avgPower / 1800; // Normalized to typical range
    
    return {
      ok: true,
      result: {
        primaryValue: avgPower,
        normalizedValue: Math.min(0.95, Math.max(0.20, vlamax)),
        unit: "W",
        label: "Puissance 15s"
      },
      confidence,
      rawData: { ...inputs, avgPower, variance, estimatedVlamax: vlamax }
    };
  }
};

export const BIKE_TTE_FTP: IntegratedTestProtocol = {
  id: "bike_tte_ftp",
  name: "Test TTE Vélo – FTP Constant",
  shortName: "TTE Vélo",
  sport: "bike",
  category: "TTE",
  difficulty: "hard",
  
  objective: "Mesurer le Time To Exhaustion à FTP constant pour calibrer l'endurance au seuil et affiner les recommandations de nutrition/pacing.",
  targetParameters: ["TTE", "FTP validation"],
  expectedPrecision: "high",
  reliabilityScore: 0.90,
  
  equipment: [
    { name: "Home trainer ou parcours plat", required: true },
    { name: "Capteur de puissance calibré", required: true },
    { name: "Cardio-fréquencemètre", required: true },
    { name: "Chronomètre", required: true }
  ],
  
  validityConditions: [
    { id: "rest48h", label: "48-72h sans intensité haute", critical: true },
    { id: "ftpKnown", label: "FTP connu et validé (<4 semaines)", critical: true },
    { id: "nutrition", label: "Glycogène plein (alimentation normalisée 48h)", critical: true },
    { id: "hydration", label: "Hydratation optimale", critical: true },
    { id: "temperature", label: "Température stable (18-24°C)", critical: false }
  ],
  
  warmup: [
    { durationMin: 15, description: "Zone 2 progressive", intensity: "60-70% FTP" },
    { durationMin: 5, description: "Montée au seuil", intensity: "90% FTP" },
    { durationMin: 10, description: "2×2 min à 100% FTP", intensity: "FTP" },
    { durationMin: 5, description: "Récupération complète", intensity: "Z1" }
  ],
  
  protocol: [
    { stepNumber: 1, description: "Stabiliser à 100% FTP exactement", notes: "Cadence 85-95 rpm" },
    { stepNumber: 2, description: "Maintenir aussi longtemps que possible", notes: "Pacing TRÈS régulier" },
    { stepNumber: 3, description: "Arrêter si <97% FTP pendant >30s", notes: "Ou épuisement complet" },
    { stepNumber: 4, description: "Noter le temps exact en minutes", notes: "Arrondir à la minute inférieure" }
  ],
  
  pacingRules: [
    "Cadence stable 85-95 rpm",
    "Pacing TRÈS régulier (éviter le positive split)",
    "Acceptable : monter légèrement les 3 dernières minutes",
    "Si chute <97% FTP pendant >30s → arrêt du test"
  ],
  
  validationCriteria: [
    { id: "power_variance", label: "Variabilité de puissance <5%", threshold: "5%" },
    { id: "pacing", label: "Pacing constant (pas de pic initial)", invalidFlag: "pacing_error" },
    { id: "hr_drift", label: "FC dérive logique (+5-10 bpm sur la durée)", threshold: "5-10 bpm" },
    { id: "rpe", label: "RPE ≥ 9/10 à l'arrêt", threshold: "9/10" }
  ],
  
  inputFields: [
    { key: "ftp_target", label: "FTP cible utilisé", unit: "W", type: "number", min: 100, max: 500, step: 1, required: true },
    { key: "tte_minutes", label: "Durée totale tenue", unit: "min", type: "number", min: 10, max: 120, step: 1, required: true },
    { key: "power_avg", label: "Puissance moyenne réelle", unit: "W", type: "number", min: 100, max: 500, step: 1, required: true },
    { key: "hr_start", label: "FC au départ", unit: "bpm", type: "number", min: 80, max: 200, step: 1, required: false },
    { key: "hr_end", label: "FC à l'arrêt", unit: "bpm", type: "number", min: 100, max: 220, step: 1, required: false }
  ],
  
  tfclImpact: [
    { parameter: "TTE", confidenceBoost: 0.20, description: "Calibration directe du TTE" },
    { parameter: "VLamax", confidenceBoost: 0.10, description: "Affine l'estimation VLamax via endurance" }
  ],
  
  compute: (inputs) => {
    const tte = inputs.tte_minutes;
    const ftpTarget = inputs.ftp_target;
    const powerAvg = inputs.power_avg;
    
    if (!tte || !ftpTarget || !powerAvg) {
      return { ok: false, error: "Données requises manquantes", confidence: 0, rawData: inputs };
    }
    
    // Validate power was close to target
    const powerDiff = Math.abs(powerAvg - ftpTarget) / ftpTarget * 100;
    let confidence = 0.90;
    if (powerDiff > 3) confidence = 0.75;
    if (powerDiff > 5) confidence = 0.60;
    
    // HR drift analysis if available
    if (inputs.hr_start && inputs.hr_end) {
      const hrDrift = inputs.hr_end - inputs.hr_start;
      if (hrDrift < 5 || hrDrift > 20) confidence -= 0.05;
    }
    
    return {
      ok: true,
      result: {
        primaryValue: tte,
        normalizedValue: tte,
        unit: "min",
        label: "TTE observé"
      },
      confidence,
      rawData: { ...inputs, powerDiff }
    };
  }
};

// ========================================
// TESTS COURSE À PIED
// ========================================

export const RUN_VLAMAX_SPRINT_15S: IntegratedTestProtocol = {
  id: "run_vlamax_sprint_15s_12min",
  name: "Test VLamax CAP – Sprint 15s + 12 min",
  shortName: "VLamax Sprint CAP",
  sport: "run",
  category: "VLAMAX",
  difficulty: "hard",
  
  objective: "Estimer la VLamax course via sprint court (glycolytique) + effort 12 min (aérobie) pour calculer le Sprint Ratio.",
  targetParameters: ["VLamax Run", "VMA estimée"],
  expectedPrecision: "high",
  reliabilityScore: 0.80,
  
  equipment: [
    { name: "Piste 400m ou terrain plat mesuré", required: true },
    { name: "Chronomètre précis", required: true },
    { name: "Cônes de marquage", required: true },
    { name: "Montre GPS", required: false, alternatives: ["Mesure mètre ruban"] },
    { name: "Assistant pour chronométrer", required: true }
  ],
  
  validityConditions: [
    { id: "rest48h", label: "48h sans intensité haute", critical: true },
    { id: "surface", label: "Surface dure et régulière (piste synthétique idéale)", critical: true },
    { id: "weather", label: "Pas de vent fort (< 10 km/h)", critical: true },
    { id: "temperature", label: "Température < 25°C", critical: false },
    { id: "shoes", label: "Chaussures de compétition/pointes recommandées", critical: false }
  ],
  
  warmup: [
    { durationMin: 15, description: "Footing Z2", intensity: "60-65% VMA" },
    { durationMin: 5, description: "Gammes techniques + étirements dynamiques" },
    { durationMin: 6, description: "4×20s accélérations progressives", intensity: "70-80-90-95%" },
    { durationMin: 4, description: "Repos debout", intensity: "Récupération complète" }
  ],
  
  protocol: [
    { stepNumber: 1, description: "Sprint 1 : départ lancé, 15s ALL-OUT", notes: "Mesurer distance exacte" },
    { stepNumber: 2, description: "Récupération complète", durationMin: 5, notes: "Marche/trot très léger" },
    { stepNumber: 3, description: "Sprint 2 : départ lancé, 15s ALL-OUT", notes: "Mesurer distance exacte" },
    { stepNumber: 4, description: "Récupération active", durationMin: 10, notes: "Footing très léger Z1" },
    { stepNumber: 5, description: "12 min ALL-OUT régulier", notes: "Pacing constant, noter distance totale" }
  ],
  
  pacingRules: [
    "Sprints : engagement maximal dès le départ",
    "Sprints : ne pas regarder le chrono pendant l'effort",
    "12 min : pacing régulier du début à la fin",
    "12 min : éviter le départ trop rapide"
  ],
  
  validationCriteria: [
    { id: "sprint_variance", label: "Écart < 5% entre les 2 sprints", threshold: "5%", invalidFlag: "sprint_variance_high" },
    { id: "12min_pacing", label: "Pacing régulier sur 12 min", invalidFlag: "pacing_error" },
    { id: "rpe", label: "RPE ≥ 9/10 en fin de 12 min", threshold: "9/10" }
  ],
  
  inputFields: [
    { key: "dist_sprint_1", label: "Distance sprint 1", unit: "m", type: "number", min: 50, max: 150, step: 0.1, required: true },
    { key: "dist_sprint_2", label: "Distance sprint 2", unit: "m", type: "number", min: 50, max: 150, step: 0.1, required: true },
    { key: "dist_12min", label: "Distance 12 min", unit: "m", type: "number", min: 1500, max: 5000, step: 1, required: true },
    { key: "hr_max_sprint", label: "FC max sprint (opt)", unit: "bpm", type: "number", min: 100, max: 220, step: 1, required: false },
    { key: "hr_max_12min", label: "FC max 12 min (opt)", unit: "bpm", type: "number", min: 100, max: 220, step: 1, required: false }
  ],
  
  tfclImpact: [
    { parameter: "VLamax Run", confidenceBoost: 0.15, description: "Calibration directe VLamax course" },
    { parameter: "VMA", confidenceBoost: 0.10, description: "Estimation VMA via 12 min" }
  ],
  
  compute: (inputs) => {
    const d1 = inputs.dist_sprint_1;
    const d2 = inputs.dist_sprint_2;
    const d12 = inputs.dist_12min;
    
    if (!d1 || !d2 || !d12) {
      return { ok: false, error: "Distances requises manquantes", confidence: 0, rawData: inputs };
    }
    
    // Best sprint distance
    const bestD15 = Math.max(d1, d2);
    const v15 = bestD15 / 15; // m/s
    const v12 = d12 / 720; // 12 min = 720s
    
    // Sprint Ratio
    const srRun = v15 / v12;
    
    // VLamax formula
    const normalized = Math.max(0, Math.min(1, (srRun - 1.55) / 0.35));
    let vlamax = 0.25 + 0.55 * normalized;
    vlamax = Math.max(0.25, Math.min(0.95, vlamax));
    
    // Confidence based on variance
    const variance = Math.abs(d1 - d2) / bestD15 * 100;
    let confidence = 0.80;
    if (variance > 5) confidence = 0.65;
    if (variance > 10) confidence = 0.50;
    
    return {
      ok: true,
      result: {
        primaryValue: vlamax,
        normalizedValue: vlamax,
        unit: "mmol/L/s",
        label: "VLamax estimée"
      },
      confidence,
      rawData: { ...inputs, v15, v12, srRun, variance }
    };
  }
};

export const RUN_TTE: IntegratedTestProtocol = {
  id: "run_tte",
  name: "Test TTE CAP – Effort Continu",
  shortName: "TTE CAP",
  sport: "run",
  category: "TTE",
  difficulty: "hard",
  
  objective: "Mesurer le Time To Exhaustion à allure seuil pour calibrer l'endurance et affiner les prédictions de performance longue distance.",
  targetParameters: ["TTE Run", "Allure seuil validation"],
  expectedPrecision: "high",
  reliabilityScore: 0.85,
  
  equipment: [
    { name: "Piste ou parcours plat mesuré", required: true },
    { name: "Montre GPS avec allure", required: true },
    { name: "Cardio-fréquencemètre", required: true }
  ],
  
  validityConditions: [
    { id: "rest48h", label: "48-72h sans intensité haute", critical: true },
    { id: "thresholdKnown", label: "Allure seuil connue (<4 semaines)", critical: true },
    { id: "flat", label: "Parcours plat (<1% dénivelé)", critical: true },
    { id: "weather", label: "Conditions météo favorables", critical: false }
  ],
  
  warmup: [
    { durationMin: 15, description: "Footing progressif", intensity: "Z2" },
    { durationMin: 5, description: "Gammes + étirements dynamiques" },
    { durationMin: 8, description: "2×2 min à allure seuil", intensity: "Allure cible" },
    { durationMin: 5, description: "Récupération", intensity: "Z1" }
  ],
  
  protocol: [
    { stepNumber: 1, description: "Stabiliser exactement à l'allure seuil cible" },
    { stepNumber: 2, description: "Maintenir aussi longtemps que possible", notes: "Pacing très régulier" },
    { stepNumber: 3, description: "Arrêter si allure >5% plus lente pendant 1 min" },
    { stepNumber: 4, description: "Noter le temps exact en minutes" }
  ],
  
  pacingRules: [
    "Pacing ultra-régulier du premier au dernier mètre",
    "Éviter le positive split (départ trop rapide)",
    "Acceptable : légère accélération finale si réserve"
  ],
  
  validationCriteria: [
    { id: "pace_variance", label: "Variabilité d'allure <3%", threshold: "3%" },
    { id: "hr_drift", label: "Dérive cardiaque normale", threshold: "5-15 bpm" },
    { id: "rpe", label: "RPE ≥ 9/10 à l'arrêt", threshold: "9/10" }
  ],
  
  inputFields: [
    { key: "pace_target", label: "Allure seuil cible", unit: "sec/km", type: "number", min: 180, max: 480, step: 1, required: true },
    { key: "tte_minutes", label: "Durée totale tenue", unit: "min", type: "number", min: 10, max: 90, step: 1, required: true },
    { key: "pace_avg", label: "Allure moyenne réelle", unit: "sec/km", type: "number", min: 180, max: 480, step: 1, required: true },
    { key: "distance_total", label: "Distance totale", unit: "m", type: "number", min: 2000, max: 30000, step: 1, required: true }
  ],
  
  tfclImpact: [
    { parameter: "TTE Run", confidenceBoost: 0.20, description: "Calibration directe TTE course" },
    { parameter: "Seuil validation", confidenceBoost: 0.10, description: "Valide l'allure seuil" }
  ],
  
  compute: (inputs) => {
    const tte = inputs.tte_minutes;
    const paceTarget = inputs.pace_target;
    const paceAvg = inputs.pace_avg;
    
    if (!tte || !paceTarget || !paceAvg) {
      return { ok: false, error: "Données requises manquantes", confidence: 0, rawData: inputs };
    }
    
    const paceDiff = Math.abs(paceAvg - paceTarget) / paceTarget * 100;
    let confidence = 0.85;
    if (paceDiff > 3) confidence = 0.70;
    if (paceDiff > 5) confidence = 0.55;
    
    return {
      ok: true,
      result: {
        primaryValue: tte,
        normalizedValue: tte,
        unit: "min",
        label: "TTE observé"
      },
      confidence,
      rawData: { ...inputs, paceDiff }
    };
  }
};

// ========================================
// TESTS FATMAX VÉLO
// ========================================

export const BIKE_FATMAX_ESTIMATION: IntegratedTestProtocol = {
  id: "bike_fatmax_estimation",
  name: "Test FatMax Vélo – Estimation Oxydation Lipidique",
  shortName: "FatMax Vélo",
  sport: "bike",
  category: "FATMAX",
  difficulty: "moderate",
  
  objective: "Estimer la zone FatMax (puissance à laquelle l'oxydation des graisses est maximale) via un protocole par paliers progressifs avec suivi de la fréquence cardiaque et de la perception d'effort.",
  targetParameters: ["FatMax W", "FatMax %FTP", "Zone lipidique optimale"],
  expectedPrecision: "medium",
  reliabilityScore: 0.75,
  
  equipment: [
    { name: "Home trainer ou parcours plat", required: true },
    { name: "Capteur de puissance calibré", required: true },
    { name: "Cardio-fréquencemètre précis", required: true },
    { name: "Chronomètre", required: true }
  ],
  
  validityConditions: [
    { id: "fasted", label: "À jeun depuis ≥10h OU repas léger >3h avant", critical: true },
    { id: "rest24h", label: "24-48h sans intensité haute", critical: true },
    { id: "hydration", label: "Hydratation normale (eau uniquement)", critical: true },
    { id: "caffeine", label: "Pas de caféine le jour du test", critical: false },
    { id: "temperature", label: "Température stable (18-22°C)", critical: false }
  ],
  
  warmup: [
    { durationMin: 10, description: "Zone 1 très facile", intensity: "50% FTP" },
    { durationMin: 5, description: "Légère montée vers Z2", intensity: "55-60% FTP" }
  ],
  
  protocol: [
    { stepNumber: 1, description: "Démarrer à 45% FTP", durationMin: 6, notes: "Cadence stable 85-95 rpm" },
    { stepNumber: 2, description: "Monter à 50% FTP", durationMin: 6, notes: "Noter FC moyenne et RPE fin de palier" },
    { stepNumber: 3, description: "Monter à 55% FTP", durationMin: 6, notes: "Noter FC moyenne et RPE fin de palier" },
    { stepNumber: 4, description: "Monter à 60% FTP", durationMin: 6, notes: "Noter FC moyenne et RPE fin de palier" },
    { stepNumber: 5, description: "Monter à 65% FTP", durationMin: 6, notes: "Noter FC moyenne et RPE fin de palier" },
    { stepNumber: 6, description: "Monter à 70% FTP (optionnel)", durationMin: 6, notes: "Si respiration encore nasale possible" },
    { stepNumber: 7, description: "Identifier le palier où RPE passe de 3-4 à 5-6", notes: "= Crossover point estimé" }
  ],
  
  pacingRules: [
    "Cadence stable 85-95 rpm tout le test",
    "Respiration principalement nasale sur paliers bas",
    "Ne pas parler pendant les paliers",
    "Boire par petites gorgées si nécessaire"
  ],
  
  validationCriteria: [
    { id: "hr_stable", label: "FC stable (<5 bpm de variation) sur chaque palier", threshold: "5 bpm" },
    { id: "rpe_progression", label: "RPE progresse logiquement avec paliers", invalidFlag: "rpe_incoherent" },
    { id: "crossover_clear", label: "Point de crossover identifiable", invalidFlag: "crossover_unclear" }
  ],
  
  inputFields: [
    { key: "ftp", label: "FTP utilisé", unit: "W", type: "number", min: 100, max: 500, step: 1, required: true },
    { key: "hr_45pct", label: "FC moyenne à 45%", unit: "bpm", type: "number", min: 80, max: 180, step: 1, required: true },
    { key: "hr_50pct", label: "FC moyenne à 50%", unit: "bpm", type: "number", min: 80, max: 180, step: 1, required: true },
    { key: "hr_55pct", label: "FC moyenne à 55%", unit: "bpm", type: "number", min: 80, max: 180, step: 1, required: true },
    { key: "hr_60pct", label: "FC moyenne à 60%", unit: "bpm", type: "number", min: 80, max: 190, step: 1, required: true },
    { key: "hr_65pct", label: "FC moyenne à 65%", unit: "bpm", type: "number", min: 90, max: 200, step: 1, required: true },
    { key: "rpe_crossover_pct", label: "% FTP au crossover (RPE 4→5)", unit: "%", type: "number", min: 45, max: 80, step: 5, required: true },
    { key: "respiration_nasal_max_pct", label: "% FTP max respiration nasale", unit: "%", type: "number", min: 45, max: 75, step: 5, required: false }
  ],
  
  tfclImpact: [
    { parameter: "FatMax", confidenceBoost: 0.15, description: "Calibration zone FatMax" },
    { parameter: "Nutrition longue distance", confidenceBoost: 0.10, description: "Affine les recommandations nutrition" }
  ],
  
  compute: (inputs) => {
    const ftp = inputs.ftp;
    const crossoverPct = inputs.rpe_crossover_pct;
    const nasalMaxPct = inputs.respiration_nasal_max_pct;
    
    if (!ftp || !crossoverPct) {
      return { ok: false, error: "Données requises manquantes", confidence: 0, rawData: inputs };
    }
    
    // FatMax estimé = crossover point - 5% (zone juste avant transition)
    const fatmaxPct = crossoverPct - 5;
    const fatmaxW = Math.round(ftp * fatmaxPct / 100);
    
    // Zone FatMax = fatmaxPct ± 5%
    const fatmaxLow = Math.round(ftp * (fatmaxPct - 5) / 100);
    const fatmaxHigh = Math.round(ftp * (fatmaxPct + 5) / 100);
    
    // Confiance basée sur cohérence des données
    let confidence = 0.75;
    
    // Vérifier progression FC logique
    const hrs = [inputs.hr_45pct, inputs.hr_50pct, inputs.hr_55pct, inputs.hr_60pct, inputs.hr_65pct].filter(Boolean);
    if (hrs.length >= 4) {
      const progressionOk = hrs.every((hr, i) => i === 0 || hr >= hrs[i - 1]);
      if (!progressionOk) confidence -= 0.10;
    }
    
    // Bonus si respiration nasale cohérente avec crossover
    if (nasalMaxPct && Math.abs(nasalMaxPct - crossoverPct) <= 10) {
      confidence += 0.05;
    }
    
    return {
      ok: true,
      result: {
        primaryValue: fatmaxW,
        normalizedValue: fatmaxPct,
        unit: "W",
        label: `FatMax ~${fatmaxW}W (${fatmaxPct}% FTP)`
      },
      confidence: Math.min(0.85, confidence),
      rawData: { 
        ...inputs, 
        fatmaxW, 
        fatmaxPct, 
        fatmaxLow, 
        fatmaxHigh
      }
    };
  }
};

// ========================================
// TESTS ÉCONOMIE DE COURSE
// ========================================

export const RUN_ECONOMY: IntegratedTestProtocol = {
  id: "run_economy",
  name: "Test Économie de Course – Coût Énergétique",
  shortName: "Économie CAP",
  sport: "run",
  category: "ECONOMY",
  difficulty: "moderate",
  
  objective: "Estimer l'économie de course (coût énergétique par km) via un test sous-maximal avec mesure de la fréquence cardiaque à allure constante. Plus la FC est basse à une allure donnée, meilleure est l'économie.",
  targetParameters: ["Économie (HR/pace)", "Coût cardiaque", "Efficience relative"],
  expectedPrecision: "medium",
  reliabilityScore: 0.70,
  
  equipment: [
    { name: "Piste 400m ou parcours plat mesuré", required: true },
    { name: "Montre GPS avec allure instantanée", required: true },
    { name: "Cardio-fréquencemètre précis (ceinture)", required: true },
    { name: "Capteur de puissance running (optionnel)", required: false, alternatives: ["Stryd", "Garmin Running Power"] }
  ],
  
  validityConditions: [
    { id: "rest24h", label: "24-48h sans intensité haute", critical: true },
    { id: "flat", label: "Surface plate et régulière", critical: true },
    { id: "weather", label: "Conditions météo stables (pas de vent >10 km/h)", critical: true },
    { id: "nutrition", label: "Repas léger 2-3h avant", critical: false },
    { id: "shoes", label: "Chaussures habituelles d'entraînement", critical: false }
  ],
  
  warmup: [
    { durationMin: 15, description: "Footing très progressif", intensity: "Z1-Z2" },
    { durationMin: 5, description: "Gammes techniques légères" },
    { durationMin: 5, description: "3×30s à l'allure test", intensity: "Allure marathon" }
  ],
  
  protocol: [
    { stepNumber: 1, description: "Palier 1 : 6 min à allure marathon + 30 sec/km", durationMin: 6, notes: "Allure très confortable" },
    { stepNumber: 2, description: "Récupération", durationMin: 2, notes: "Marche ou trot très léger" },
    { stepNumber: 3, description: "Palier 2 : 6 min à allure marathon", durationMin: 6, notes: "Allure marathon estimée" },
    { stepNumber: 4, description: "Récupération", durationMin: 2, notes: "Marche ou trot très léger" },
    { stepNumber: 5, description: "Palier 3 : 6 min à allure semi-marathon", durationMin: 6, notes: "Allure semi estimée" },
    { stepNumber: 6, description: "Noter FC moyenne des 3 dernières minutes de chaque palier" }
  ],
  
  pacingRules: [
    "Allure TRÈS stable sur chaque palier (variabilité <5 sec/km)",
    "Cadence naturelle (ne pas forcer une cadence particulière)",
    "Respiration régulière, ne pas parler",
    "Laisser la FC se stabiliser (ignorer les 3 premières minutes)"
  ],
  
  validationCriteria: [
    { id: "pace_stable", label: "Allure stable sur chaque palier (<5 sec/km)", threshold: "5 sec/km" },
    { id: "hr_stable", label: "FC stabilisée (<3 bpm de variation) sur 3 dernières min", threshold: "3 bpm" },
    { id: "hr_progression", label: "FC augmente logiquement entre paliers", invalidFlag: "hr_incoherent" }
  ],
  
  inputFields: [
    { key: "pace_1", label: "Allure palier 1 (lent)", unit: "sec/km", type: "number", min: 240, max: 600, step: 1, required: true },
    { key: "hr_1", label: "FC moyenne palier 1 (min 3-6)", unit: "bpm", type: "number", min: 100, max: 180, step: 1, required: true },
    { key: "pace_2", label: "Allure palier 2 (marathon)", unit: "sec/km", type: "number", min: 210, max: 480, step: 1, required: true },
    { key: "hr_2", label: "FC moyenne palier 2 (min 3-6)", unit: "bpm", type: "number", min: 110, max: 190, step: 1, required: true },
    { key: "pace_3", label: "Allure palier 3 (semi)", unit: "sec/km", type: "number", min: 180, max: 420, step: 1, required: true },
    { key: "hr_3", label: "FC moyenne palier 3 (min 3-6)", unit: "bpm", type: "number", min: 120, max: 200, step: 1, required: true },
    { key: "fc_max", label: "FC max connue", unit: "bpm", type: "number", min: 150, max: 220, step: 1, required: false },
    { key: "power_avg", label: "Puissance moyenne (si dispo)", unit: "W", type: "number", min: 150, max: 500, step: 1, required: false }
  ],
  
  tfclImpact: [
    { parameter: "Économie de course", confidenceBoost: 0.15, description: "Calibration économie via test terrain" },
    { parameter: "Prédiction performance", confidenceBoost: 0.10, description: "Affine les prédictions marathon/semi" }
  ],
  
  compute: (inputs) => {
    const { pace_1, hr_1, pace_2, hr_2, pace_3, hr_3, fc_max, power_avg } = inputs;
    
    if (!pace_1 || !hr_1 || !pace_2 || !hr_2 || !pace_3 || !hr_3) {
      return { ok: false, error: "Données requises manquantes", confidence: 0, rawData: inputs };
    }
    
    // Calculer le "coût cardiaque" par km/h
    // Plus bas = meilleure économie
    const speed1 = 3600 / pace_1; // km/h
    const speed2 = 3600 / pace_2;
    const speed3 = 3600 / pace_3;
    
    const costPerKmh_1 = hr_1 / speed1;
    const costPerKmh_2 = hr_2 / speed2;
    const costPerKmh_3 = hr_3 / speed3;
    
    const avgCost = (costPerKmh_1 + costPerKmh_2 + costPerKmh_3) / 3;
    
    // Interpréter le coût cardiaque
    // Référence : ~10-12 bpm/(km/h) = excellente économie
    // ~14-16 bpm/(km/h) = économie moyenne
    // >18 bpm/(km/h) = économie à améliorer
    let economyLabel: string;
    let economyScore: number;
    
    if (avgCost <= 11) {
      economyLabel = "Excellente";
      economyScore = 95;
    } else if (avgCost <= 13) {
      economyLabel = "Très bonne";
      economyScore = 85;
    } else if (avgCost <= 15) {
      economyLabel = "Bonne";
      economyScore = 70;
    } else if (avgCost <= 17) {
      economyLabel = "Moyenne";
      economyScore = 55;
    } else {
      economyLabel = "À améliorer";
      economyScore = 40;
    }
    
    // Confiance
    let confidence = 0.70;
    
    // Vérifier progression logique
    if (hr_1 < hr_2 && hr_2 < hr_3) {
      confidence += 0.05;
    } else {
      confidence -= 0.10;
    }
    
    // Bonus si FC max connue (permet calcul %FCmax)
    if (fc_max) {
      confidence += 0.05;
    }
    
    // Bonus si puissance disponible
    if (power_avg) {
      confidence += 0.05;
    }
    
    return {
      ok: true,
      result: {
        primaryValue: economyScore,
        normalizedValue: avgCost,
        unit: "bpm/(km/h)",
        label: `Économie : ${economyLabel} (${avgCost.toFixed(1)} bpm/km/h)`
      },
      confidence: Math.min(0.85, confidence),
      rawData: { 
        ...inputs, 
        speed1, speed2, speed3,
        costPerKmh_1, costPerKmh_2, costPerKmh_3,
        avgCost,
        economyScore
      }
    };
  }
};

// ========================================
// SEMAINE DE RÉFÉRENCE TFCL
// ========================================

export interface ReferenceWeekDay {
  day: number;
  type: "rest" | "test" | "recovery";
  testId?: string;
  title: string;
  description: string;
}

export const TFCL_REFERENCE_WEEK: {
  title: string;
  objective: string;
  days: ReferenceWeekDay[];
  completionBadge: string;
  globalConfidenceBoost: number;
} = {
  title: "Semaine de Référence TFCL",
  objective: "Collecter des données standardisées pour améliorer TOUS les modèles V2 avec un niveau de confiance maximal.",
  days: [
    { day: 1, type: "test", testId: "bike_vlamax_sprint_15s", title: "Sprint Vélo", description: "Test VLamax Vélo Sprint 15s" },
    { day: 2, type: "recovery", title: "Récupération", description: "Z1-Z2 récupération active" },
    { day: 3, type: "test", testId: "bike_tte_ftp", title: "TTE Vélo", description: "Test TTE Vélo FTP constant" },
    { day: 4, type: "rest", title: "Repos", description: "Repos complet" },
    { day: 5, type: "test", testId: "run_vlamax_sprint_15s_12min", title: "Sprint CAP", description: "Test VLamax CAP Sprint 15s + 12 min" },
    { day: 6, type: "recovery", title: "Récupération", description: "Z1-Z2 récupération active" },
    { day: 7, type: "test", testId: "run_tte", title: "TTE CAP", description: "Test TTE CAP effort continu" }
  ],
  completionBadge: "Profil TFCL Calibré ✓",
  globalConfidenceBoost: 0.25
};

// ========================================
// BIBLIOTHÈQUE COMPLÈTE
// ========================================

export const INTEGRATED_TESTS_LIBRARY: IntegratedTestProtocol[] = [
  BIKE_VLAMAX_SPRINT_15S,
  BIKE_TTE_FTP,
  BIKE_FATMAX_ESTIMATION,
  RUN_VLAMAX_SPRINT_15S,
  RUN_TTE,
  RUN_ECONOMY
];

// Helpers
export function getTestById(id: string): IntegratedTestProtocol | undefined {
  return INTEGRATED_TESTS_LIBRARY.find(t => t.id === id);
}

export function getTestsBySport(sport: TestSport): IntegratedTestProtocol[] {
  return INTEGRATED_TESTS_LIBRARY.filter(t => t.sport === sport);
}

export function getTestsByCategory(category: TestCategory): IntegratedTestProtocol[] {
  return INTEGRATED_TESTS_LIBRARY.filter(t => t.category === category);
}

export function getConfidenceLabel(confidence: number): { label: string; color: string } {
  if (confidence >= 0.80) return { label: "Élevée", color: "text-green-500" };
  if (confidence >= 0.65) return { label: "Moyenne", color: "text-yellow-500" };
  return { label: "Faible", color: "text-orange-500" };
}

export function getDifficultyLabel(difficulty: TestDifficulty): { label: string; color: string } {
  switch (difficulty) {
    case "easy": return { label: "Facile", color: "text-green-500" };
    case "moderate": return { label: "Modéré", color: "text-yellow-500" };
    case "hard": return { label: "Difficile", color: "text-red-500" };
  }
}
