/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYMPTÔMES TERRAIN TFCL™ — Système Dan Lorang
 * Two For Coaching Lab Method™
 * 
 * Liste standardisée des symptômes observables terrain et logique de correspondance
 * symptômes → leviers physiologiques.
 * 
 * PHILOSOPHIE:
 * "Les symptômes priment sur les chiffres isolés."
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { TrainingLever, DecisionCase, TFCLObjective } from "./tfclDecisionMatrix";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES SYMPTÔMES
// ═══════════════════════════════════════════════════════════════════════════════

export type TFCLSymptomId = 
  | "early_burn"           // Brûlure musculaire précoce
  | "late_explosion"       // Explosion tardive (>2h / fin de course)
  | "no_pace_change"       // Incapacité à changer de rythme
  | "hill_weakness"        // Manque de puissance en côte
  | "cardio_ok_legs_heavy" // Cardio OK mais jambes lourdes
  | "gi_issues"            // Difficultés digestives en fin d'effort
  | "cant_hold_pace"       // Incapacité à tenir l'allure cible
  | "good_endurance_low_ceiling" // Bonne endurance mais plafond bas
  | "high_hr_drift"        // Forte dérive cardiaque
  | "overgeared_feeling";  // Sensation de sur-régime rapide

export interface TFCLSymptom {
  id: TFCLSymptomId;
  label: string;
  description: string;
  emoji: string;
  category: "metabolic" | "muscular" | "cardiac" | "digestive" | "endurance";
  // Leviers physiologiques associés (par ordre de probabilité)
  associatedLevers: TrainingLever[];
  // Cas décisionnels typiquement associés
  typicalCases: DecisionCase[];
}

export interface SymptomMatch {
  symptom: TFCLSymptom;
  confidence: "high" | "moderate" | "low";
  matchReason: string;
}

export interface SymptomAnalysisResult {
  selectedSymptoms: TFCLSymptomId[];
  matchedCase: DecisionCase;
  matchedLever: TrainingLever;
  confidence: "élevé" | "modéré" | "faible";
  confidenceScore: number; // 0-100
  interpretation: string;
  sessionsToFavor: string[];
  sessionsToLimit: string[];
  coherenceWithMetrics: "forte" | "modérée" | "faible";
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOGUE DE SYMPTÔMES
// ═══════════════════════════════════════════════════════════════════════════════

export const TFCL_SYMPTOMS: Record<TFCLSymptomId, TFCLSymptom> = {
  early_burn: {
    id: "early_burn",
    label: "Brûlure musculaire précoce",
    description: "Sensation d'acidose et de brûlure dans les jambes rapidement après le début de l'effort, même à intensité modérée.",
    emoji: "🔥",
    category: "metabolic",
    associatedLevers: ["decrease_vlamax", "increase_fat_oxidation"],
    typicalCases: ["A", "D"],
  },
  late_explosion: {
    id: "late_explosion",
    label: "Explosion tardive (>2h)",
    description: "Craquage énergétique après plusieurs heures d'effort, le \"mur\" en marathon ou Ironman.",
    emoji: "💥",
    category: "metabolic",
    associatedLevers: ["decrease_vlamax", "increase_fat_oxidation"],
    typicalCases: ["A", "D"],
  },
  no_pace_change: {
    id: "no_pace_change",
    label: "Incapacité à changer de rythme",
    description: "Difficulté à accélérer ou répondre aux changements d'allure, profil \"diesel\" figé.",
    emoji: "🚂",
    category: "muscular",
    associatedLevers: ["increase_vo2max"],
    typicalCases: ["B"],
  },
  hill_weakness: {
    id: "hill_weakness",
    label: "Manque de puissance en côte",
    description: "Perte significative de puissance ou allure dès que la pente augmente.",
    emoji: "⛰️",
    category: "muscular",
    associatedLevers: ["increase_vo2max", "increase_tte"],
    typicalCases: ["B", "C"],
  },
  cardio_ok_legs_heavy: {
    id: "cardio_ok_legs_heavy",
    label: "Cardio OK mais jambes lourdes",
    description: "Sensation que le cœur pourrait en faire plus mais les jambes ne suivent pas.",
    emoji: "🦵",
    category: "muscular",
    associatedLevers: ["increase_tte", "decrease_vlamax"],
    typicalCases: ["C", "A"],
  },
  gi_issues: {
    id: "gi_issues",
    label: "Difficultés digestives",
    description: "Problèmes gastro-intestinaux pendant ou après les efforts longs (nausées, crampes).",
    emoji: "🤢",
    category: "digestive",
    associatedLevers: ["increase_fat_oxidation"],
    typicalCases: ["D"],
  },
  cant_hold_pace: {
    id: "cant_hold_pace",
    label: "Incapacité à tenir l'allure cible",
    description: "Décrochage progressif de l'allure planifiée, sans pouvoir maintenir le rythme voulu.",
    emoji: "📉",
    category: "endurance",
    associatedLevers: ["increase_tte", "recovery"],
    typicalCases: ["C", "E"],
  },
  good_endurance_low_ceiling: {
    id: "good_endurance_low_ceiling",
    label: "Bonne endurance mais plafond bas",
    description: "Capable de durer longtemps mais incapable d'aller vite, même sur courte distance.",
    emoji: "🐢",
    category: "cardiac",
    associatedLevers: ["increase_vo2max"],
    typicalCases: ["B"],
  },
  high_hr_drift: {
    id: "high_hr_drift",
    label: "Forte dérive cardiaque",
    description: "La fréquence cardiaque augmente progressivement à puissance constante (>10% sur effort long).",
    emoji: "📈",
    category: "cardiac",
    associatedLevers: ["increase_tte", "recovery", "increase_fat_oxidation"],
    typicalCases: ["C", "E", "D"],
  },
  overgeared_feeling: {
    id: "overgeared_feeling",
    label: "Sensation de sur-régime rapide",
    description: "Impression d'être dans le rouge très vite, de ne pas pouvoir gérer son effort.",
    emoji: "🔴",
    category: "metabolic",
    associatedLevers: ["decrease_vlamax", "increase_fat_oxidation"],
    typicalCases: ["A", "D"],
  },
};

export const ALL_SYMPTOMS: TFCLSymptom[] = Object.values(TFCL_SYMPTOMS);

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIQUE DE CORRESPONDANCE SYMPTÔMES → LEVIERS
// ═══════════════════════════════════════════════════════════════════════════════

interface SymptomPhysioMatch {
  conditions: {
    vlamax?: "high" | "low" | "normal" | "any";
    vo2max?: "high" | "low" | "normal" | "any";
    tte?: "high" | "low" | "normal" | "any";
    fatmax?: "high" | "low" | "normal" | "any";
    freshness?: "high" | "low" | "normal" | "any";
  };
  requiredSymptoms: TFCLSymptomId[];
  optionalSymptoms?: TFCLSymptomId[];
  resultCase: DecisionCase;
  lever: TrainingLever;
  interpretation: string;
  sessionsToFavor: string[];
  sessionsToLimit: string[];
}

// Règles de correspondance Dan Lorang
const SYMPTOM_MATCHING_RULES: SymptomPhysioMatch[] = [
  // Règle 1: VLamax élevée + explosion/brûlure → ↓ VLamax
  {
    conditions: { vlamax: "high", tte: "any" },
    requiredSymptoms: ["late_explosion"],
    optionalSymptoms: ["early_burn", "overgeared_feeling"],
    resultCase: "A",
    lever: "decrease_vlamax",
    interpretation: "Métabolisme trop glycolytique. Tu consommes tes réserves de glucides trop rapidement, ce qui provoque un \"mur\" en fin d'effort.",
    sessionsToFavor: [
      "Zone 2 stricte (60-70% FTP)",
      "SFR / basse cadence (50-60 rpm)",
      "Sorties longues fuelées intelligemment",
      "Séances low-carb occasionnelles",
    ],
    sessionsToLimit: [
      "Intervalles Z4/Z5 répétés",
      "Lactique prolongé",
      "Sprints courts fréquents",
    ],
  },
  {
    conditions: { vlamax: "high" },
    requiredSymptoms: ["early_burn"],
    optionalSymptoms: ["overgeared_feeling", "late_explosion"],
    resultCase: "A",
    lever: "decrease_vlamax",
    interpretation: "Production lactique excessive. L'acidose arrive trop tôt dans l'effort, signe d'une VLamax trop élevée pour ton objectif.",
    sessionsToFavor: [
      "Zone 2 stricte prolongée",
      "Force à basse cadence",
      "Tempo long sous-seuil",
    ],
    sessionsToLimit: [
      "Intensités > seuil",
      "Travail anaérobie",
      "Sprints répétés",
    ],
  },
  
  // Règle 2: VO2max faible + plafond bas → ↑ VO2max
  {
    conditions: { vo2max: "low", vlamax: "low" },
    requiredSymptoms: ["good_endurance_low_ceiling"],
    optionalSymptoms: ["no_pace_change", "hill_weakness"],
    resultCase: "B",
    lever: "increase_vo2max",
    interpretation: "Profil \"diesel\" avec plafond aérobie limité. Tu tiens longtemps mais tu ne peux pas aller vite. Il faut développer ton moteur.",
    sessionsToFavor: [
      "Intervalles courts (30/30, 40/20)",
      "Intensités > SV2 (2-3x/semaine)",
      "Côtes courtes explosives",
      "Variété des stimuli",
    ],
    sessionsToLimit: [
      "Volume lent excessif",
      "Séances longues monotones",
      "Zone 2 exclusive",
    ],
  },
  {
    conditions: { vo2max: "low" },
    requiredSymptoms: ["no_pace_change"],
    optionalSymptoms: ["hill_weakness", "good_endurance_low_ceiling"],
    resultCase: "B",
    lever: "increase_vo2max",
    interpretation: "Manque de variabilité aérobie. Tu ne peux pas répondre aux changements de rythme car ton plafond VO2max te limite.",
    sessionsToFavor: [
      "Intervalles courts haute intensité",
      "Fartlek varié",
      "Côtes 30-60 secondes",
    ],
    sessionsToLimit: [
      "Endurance fondamentale exclusive",
      "Tempo monotone",
    ],
  },
  
  // Règle 3: TTE faible + incapacité à tenir l'allure → ↑ TTE
  {
    conditions: { tte: "low", vlamax: "normal", vo2max: "normal" },
    requiredSymptoms: ["cant_hold_pace"],
    optionalSymptoms: ["cardio_ok_legs_heavy", "high_hr_drift"],
    resultCase: "C",
    lever: "increase_tte",
    interpretation: "Endurance spécifique insuffisante. Ton profil métabolique est bon mais tu ne tiens pas assez longtemps au seuil.",
    sessionsToFavor: [
      "Blocs tempo / sweet spot longs (20-40min)",
      "Progressions au seuil",
      "Économie d'allure",
      "Sorties longues avec finish à tempo",
    ],
    sessionsToLimit: [
      "Séances trop courtes",
      "Intervalles courts exclusifs",
      "Sprint et VO2 isolé",
    ],
  },
  {
    conditions: { tte: "low" },
    requiredSymptoms: ["cardio_ok_legs_heavy"],
    optionalSymptoms: ["cant_hold_pace", "high_hr_drift"],
    resultCase: "C",
    lever: "increase_tte",
    interpretation: "Déconnexion cardio-musculaire. Ton cœur peut en faire plus mais tes muscles ne suivent pas - travail de durabilité nécessaire.",
    sessionsToFavor: [
      "Sweet spot progressif",
      "Tempo avec variations",
      "Sorties longues structurées",
    ],
    sessionsToLimit: [
      "Séances très courtes",
      "Travail exclusif en intensité",
    ],
  },
  
  // Règle 4: Difficultés digestives + effort long → Nutrition / Gut Training
  {
    conditions: { fatmax: "low" },
    requiredSymptoms: ["gi_issues"],
    optionalSymptoms: ["late_explosion", "high_hr_drift"],
    resultCase: "D",
    lever: "increase_fat_oxidation",
    interpretation: "Limitation énergétique et digestive. Dépendance aux glucides trop élevée avec un système digestif non entraîné.",
    sessionsToFavor: [
      "Entraînement à 80-90g glucides/h",
      "Gut training progressif",
      "Longues sorties avec nutrition de course",
      "Stabilisation intensité Z2",
    ],
    sessionsToLimit: [
      "Sorties sans nutrition",
      "Intensités élevées sans prise alimentaire",
      "Variations brutales d'intensité",
    ],
  },
  {
    conditions: { fatmax: "low" },
    requiredSymptoms: ["late_explosion"],
    optionalSymptoms: ["gi_issues", "overgeared_feeling"],
    resultCase: "D",
    lever: "increase_fat_oxidation",
    interpretation: "Crossover trop précoce. Tu dépends des glucides à trop basse intensité, ce qui épuise tes réserves prématurément.",
    sessionsToFavor: [
      "Longues sorties à glycémie basse",
      "Entraînement à jeun (matin)",
      "Sorties Z2 longues (>3h)",
    ],
    sessionsToLimit: [
      "Sucres rapides systématiques",
      "Haute intensité en fin de sortie longue",
    ],
  },
  
  // Règle 5: Profil OK + fatigue → Récupération
  {
    conditions: { freshness: "low" },
    requiredSymptoms: ["high_hr_drift"],
    optionalSymptoms: ["cant_hold_pace", "cardio_ok_legs_heavy"],
    resultCase: "E",
    lever: "recovery",
    interpretation: "Fatigue systémique. Ton profil physiologique est correct mais ton corps montre des signes de surcharge.",
    sessionsToFavor: [
      "Réduction charge 40-50%",
      "Récupération active légère",
      "Qualité sommeil prioritaire",
      "Préservation système nerveux",
    ],
    sessionsToLimit: [
      "Séances clés exigeantes",
      "Volume élevé",
      "Stress additionnel",
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS D'ANALYSE
// ═══════════════════════════════════════════════════════════════════════════════

type MetricLevel = "high" | "low" | "normal";

interface PhysioContext {
  vlamax: MetricLevel;
  vo2max: MetricLevel;
  tte: MetricLevel;
  fatmax: MetricLevel;
  freshness: MetricLevel;
}

function matchCondition(
  condition: "high" | "low" | "normal" | "any" | undefined,
  actual: MetricLevel
): boolean {
  if (condition === undefined || condition === "any") return true;
  return condition === actual;
}

/**
 * Analyse les symptômes sélectionnés et le contexte physiologique
 * pour produire une recommandation cohérente.
 */
export function analyzeSymptoms(
  selectedSymptoms: TFCLSymptomId[],
  physioContext: PhysioContext,
  dataCompleteness: number // 0-100
): SymptomAnalysisResult {
  // Trouver la règle la plus pertinente
  let bestMatch: SymptomPhysioMatch | null = null;
  let bestScore = 0;
  
  for (const rule of SYMPTOM_MATCHING_RULES) {
    // Vérifier les conditions physiologiques
    const conditionsMatch = 
      matchCondition(rule.conditions.vlamax, physioContext.vlamax) &&
      matchCondition(rule.conditions.vo2max, physioContext.vo2max) &&
      matchCondition(rule.conditions.tte, physioContext.tte) &&
      matchCondition(rule.conditions.fatmax, physioContext.fatmax) &&
      matchCondition(rule.conditions.freshness, physioContext.freshness);
    
    if (!conditionsMatch) continue;
    
    // Compter les symptômes requis présents
    const requiredPresent = rule.requiredSymptoms.filter(s => 
      selectedSymptoms.includes(s)
    ).length;
    
    // Au moins un symptôme requis doit être présent
    if (requiredPresent === 0) continue;
    
    // Compter les symptômes optionnels présents
    const optionalPresent = (rule.optionalSymptoms || []).filter(s => 
      selectedSymptoms.includes(s)
    ).length;
    
    // Score = symptômes requis × 2 + symptômes optionnels
    const score = requiredPresent * 2 + optionalPresent;
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = rule;
    }
  }
  
  // Si aucune règle ne correspond, fallback
  if (!bestMatch) {
    return {
      selectedSymptoms,
      matchedCase: "C", // Cas par défaut
      matchedLever: "increase_tte",
      confidence: "faible",
      confidenceScore: 30,
      interpretation: "Symptômes non suffisamment caractéristiques pour une recommandation précise. Analyse complémentaire recommandée.",
      sessionsToFavor: ["Maintenir l'entraînement actuel", "Ajouter des tests TFCL"],
      sessionsToLimit: ["Changements drastiques de charge"],
      coherenceWithMetrics: "faible",
    };
  }
  
  // Calculer la confiance
  const symptomCoverage = selectedSymptoms.length / 3; // 3 symptômes = couverture max
  const dataQuality = dataCompleteness / 100;
  const confidenceScore = Math.round(Math.min(100, (bestScore / 4) * 50 + symptomCoverage * 25 + dataQuality * 25));
  
  const confidence: "élevé" | "modéré" | "faible" = 
    confidenceScore >= 70 ? "élevé" :
    confidenceScore >= 45 ? "modéré" : "faible";
  
  // Évaluer la cohérence avec les métriques
  const coherenceWithMetrics: "forte" | "modérée" | "faible" = 
    dataCompleteness >= 80 && bestScore >= 3 ? "forte" :
    dataCompleteness >= 50 || bestScore >= 2 ? "modérée" : "faible";
  
  return {
    selectedSymptoms,
    matchedCase: bestMatch.resultCase,
    matchedLever: bestMatch.lever,
    confidence,
    confidenceScore,
    interpretation: bestMatch.interpretation,
    sessionsToFavor: bestMatch.sessionsToFavor,
    sessionsToLimit: bestMatch.sessionsToLimit,
    coherenceWithMetrics,
  };
}

/**
 * Suggère automatiquement des symptômes basés sur les métriques physiologiques.
 */
export function suggestSymptomsFromMetrics(
  physioContext: PhysioContext
): TFCLSymptomId[] {
  const suggestions: TFCLSymptomId[] = [];
  
  if (physioContext.vlamax === "high") {
    suggestions.push("early_burn", "late_explosion", "overgeared_feeling");
  }
  
  if (physioContext.vo2max === "low") {
    suggestions.push("good_endurance_low_ceiling", "no_pace_change", "hill_weakness");
  }
  
  if (physioContext.tte === "low") {
    suggestions.push("cant_hold_pace", "cardio_ok_legs_heavy");
  }
  
  if (physioContext.fatmax === "low") {
    suggestions.push("gi_issues", "late_explosion");
  }
  
  if (physioContext.freshness === "low") {
    suggestions.push("high_hr_drift", "cant_hold_pace");
  }
  
  // Dédupliquer
  return [...new Set(suggestions)];
}

/**
 * Catégoriser une valeur en high/normal/low basé sur l'objectif.
 */
export function categorizeMetric(
  value: number | null,
  target: number,
  thresholdPct: number = 0.1,
  inverse: boolean = false // true pour VLamax où "high" = au-dessus de la cible
): MetricLevel {
  if (value === null) return "normal"; // Fallback si donnée manquante
  
  const deviation = (value - target) / target;
  
  if (inverse) {
    // Pour VLamax: au-dessus de la cible = "high" (problème)
    if (deviation > thresholdPct) return "high";
    if (deviation < -thresholdPct) return "low";
    return "normal";
  } else {
    // Pour les autres métriques: en dessous = "low" (problème)
    if (deviation > thresholdPct) return "high";
    if (deviation < -thresholdPct) return "low";
    return "normal";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES UI
// ═══════════════════════════════════════════════════════════════════════════════

export const SYMPTOM_CATEGORY_LABELS: Record<TFCLSymptom["category"], { label: string; color: string }> = {
  metabolic: { label: "Métabolique", color: "amber" },
  muscular: { label: "Musculaire", color: "purple" },
  cardiac: { label: "Cardiaque", color: "red" },
  digestive: { label: "Digestif", color: "green" },
  endurance: { label: "Endurance", color: "blue" },
};

export const TFCL_SYMPTOM_PHILOSOPHY = `TFCL ne cherche pas la précision absolue d'un laboratoire.
TFCL cherche la décision la plus robuste pour orienter l'entraînement.`;
