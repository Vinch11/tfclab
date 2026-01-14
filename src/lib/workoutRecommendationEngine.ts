/**
 * WorkoutRecommendationEngine — Two For Coaching Lab
 * Moteur unifié de recommandation Wahoo / Zwift
 * 
 * PRINCIPES :
 * - Utilise UNIQUEMENT les sources unifiées (VLamaxEffectif, TTEEffectif, etc.)
 * - Chaque recommandation est justifiée et traçable
 * - Jamais prescriptif : le coach reste décisionnaire
 * 
 * ENTRÉES :
 * - vlamaxEffectif (value, source, confidence)
 * - tteEffectif (value, source, confidence)
 * - fatigueEffectif (score, level, confidence)
 * - runInjuryRisk (score, level, confidence)
 * - objectif (IM / 70.3 / Marathon / Semi)
 * - sportFocus ("bike" | "run")
 * 
 * SORTIES :
 * - WorkoutRecommendation[] avec statut RECOMMENDED / NEUTRAL / DISCOURAGED
 */

import { VLamaxEffectif } from "./vlamaxEffectif";
import { TTEEffectif, getTTETarget } from "./tteEffectif";
import { FatigueEffectif } from "./fatigueEffectif";
import { RunInjuryRiskEnvelope } from "./runInjuryRisk";
import { WAHOO_WORKOUTS, WahooWorkoutMapping, WahooPhysioAxis } from "@/data/wahooMapping";

// =============================================
// TYPES
// =============================================

export type RecommendationType = "RECOMMENDED" | "NEUTRAL" | "DISCOURAGED";

export type Platform = "WAHOO" | "ZWIFT";

export interface WorkoutRecommendation {
  platform: Platform;
  workout_id: string;
  workout_name: string;
  workout_type: string;
  recommendation_type: RecommendationType;
  reason_short: string;
  reason_long: string;
  linked_indices: string[];
  confidence: number;
  priority: 1 | 2 | 3;
}

export interface RecommendationRule {
  id: string;
  name: string;
  condition: (ctx: RecommendationContext) => boolean;
  recommended_axes: WahooPhysioAxis[];
  discouraged_axes: WahooPhysioAxis[];
  reason_template: string;
  linked_indices: string[];
}

export interface RecommendationContext {
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  fatigueEffectif: FatigueEffectif;
  runInjuryRisk: RunInjuryRiskEnvelope;
  objectif: string;
  sportFocus: "bike" | "run" | "tri";
}

export interface RecommendationEngineOutput {
  recommendations: WorkoutRecommendation[];
  activeRules: string[];
  diagnosticSummary: string;
  confidenceGlobal: number;
  disclaimer: string;
}

// =============================================
// THRESHOLDS (using centralized CiblesVLamax)
// =============================================

import { CiblesVLamax } from "@/types/testLibrary";

const TTE_TARGETS: Record<string, number> = {
  IM: 55, Ironman: 55,
  "703": 50, "70.3": 50, Half: 50,
  Marathon: 50, Semi: 45,
  Trail: 45, TrailLong: 55, Ultra: 60,
  default: 45,
};

/**
 * Get VLamax threshold from centralized CiblesVLamax
 * Uses the "max" value as the threshold for triggering alerts
 */
function getVLamaxThreshold(objectif: string): number {
  const mapping: Record<string, keyof typeof CiblesVLamax> = {
    "IM": "IM", "Ironman": "IM",
    "703": "703", "70.3": "703", "Half": "703",
    "Marathon": "Marathon", "Semi": "Semi",
    "Trail": "Semi", "TrailLong": "IM", "Ultra": "IM",
  };
  const key = mapping[objectif] || "IM";
  return CiblesVLamax[key]?.max ?? 0.55;
}

function getTTETargetLocal(objectif: string): number {
  return TTE_TARGETS[objectif] || TTE_TARGETS.default;
}

function isLongDistance(objectif: string): boolean {
  return ["IM", "Ironman", "Marathon", "703", "70.3", "Half", "TrailLong", "Ultra"].includes(objectif);
}

// =============================================
// RÈGLES DE RECOMMANDATION STAFF-GRADE
// =============================================

const RECOMMENDATION_RULES: RecommendationRule[] = [
  // RÈGLE V1 — VLamax trop élevé pour objectif long
  {
    id: "V1_VLAMAX_HIGH",
    name: "VLamax élevé pour longue distance",
    condition: (ctx) => {
      const threshold = getVLamaxThreshold(ctx.objectif);
      return (
        ctx.vlamaxEffectif.value !== null &&
        ctx.vlamaxEffectif.value > threshold &&
        isLongDistance(ctx.objectif)
      );
    },
    recommended_axes: ["VLAMAX_DOWN", "ENDURANCE_BASE", "FORCE_ENDURANCE"],
    discouraged_axes: ["VO2_UP", "HIGH_RISK"],
    reason_template: "VLamax élevé ({{vlamax}}) → dépendance glucidique. Priorité au travail force + Z2 pour abaisser VLamax.",
    linked_indices: ["VLamax Effectif"],
  },

  // RÈGLE V2 — TTE insuffisant
  {
    id: "V2_TTE_LOW",
    name: "TTE insuffisant pour objectif",
    condition: (ctx) => {
      const target = getTTETargetLocal(ctx.objectif);
      return ctx.tteEffectif.tte_min < target - 5;
    },
    recommended_axes: ["TTE_UP", "THRESHOLD_MLSS"],
    discouraged_axes: ["VO2_UP"], // Éviter VO2 courts répétés
    reason_template: "TTE insuffisant ({{tte}} min vs cible {{target}} min) → priorité à la durabilité au seuil.",
    linked_indices: ["TTE Effectif"],
  },

  // RÈGLE V3 — Fatigue élevée (vélo)
  {
    id: "V3_FATIGUE_HIGH",
    name: "Fatigue élevée",
    condition: (ctx) => ctx.fatigueEffectif.score > 55,
    recommended_axes: ["RECOVERY", "ENDURANCE_BASE"],
    discouraged_axes: ["VO2_UP", "HIGH_RISK", "THRESHOLD_MLSS"],
    reason_template: "Fatigue élevée ({{fatigue}}%) → priorité absorption. Éviter intensités élevées.",
    linked_indices: ["Fatigue Fonctionnelle"],
  },

  // RÈGLE V4 — Fatigue modérée (vélo)
  {
    id: "V4_FATIGUE_MODERATE",
    name: "Fatigue modérée",
    condition: (ctx) => ctx.fatigueEffectif.score > 30 && ctx.fatigueEffectif.score <= 55,
    recommended_axes: ["ENDURANCE_BASE", "VLAMAX_DOWN"],
    discouraged_axes: ["HIGH_RISK"],
    reason_template: "Fatigue modérée ({{fatigue}}%) → privilégier tempo/Z2. Limiter VO2 et sprints.",
    linked_indices: ["Fatigue Fonctionnelle"],
  },

  // RÈGLE R1 — Risque Blessure CAP ÉLEVÉ / CRITIQUE
  {
    id: "R1_CAP_RISK_HIGH",
    name: "Risque blessure CAP élevé",
    condition: (ctx) => 
      ctx.sportFocus !== "bike" && 
      (ctx.runInjuryRisk.level === "ELEVE" || ctx.runInjuryRisk.level === "CRITIQUE"),
    recommended_axes: ["RECOVERY", "ENDURANCE_BASE"], // Vélo en substitution
    discouraged_axes: ["VO2_UP", "HIGH_RISK", "THRESHOLD_MLSS"],
    reason_template: "Risque CAP {{level}} ({{score}}%) → limiter intensité CAP, privilégier vélo pour charge cardiovasculaire.",
    linked_indices: ["Risque Blessure CAP"],
  },

  // RÈGLE R2 — Risque CAP modéré
  {
    id: "R2_CAP_RISK_MODERATE",
    name: "Risque blessure CAP modéré",
    condition: (ctx) =>
      ctx.sportFocus !== "bike" &&
      ctx.runInjuryRisk.level === "MODERE",
    recommended_axes: ["ENDURANCE_BASE", "TTE_UP"],
    discouraged_axes: ["HIGH_RISK"],
    reason_template: "Risque CAP modéré → surveiller densité qualité. Privilégier Z2 sur sorties longues.",
    linked_indices: ["Risque Blessure CAP"],
  },
];

// =============================================
// MOTEUR DE RECOMMANDATION
// =============================================

export function computeWorkoutRecommendations(
  context: RecommendationContext
): RecommendationEngineOutput {
  const { vlamaxEffectif, tteEffectif, fatigueEffectif, runInjuryRisk, objectif, sportFocus } = context;

  // 1. Identifier les règles actives
  const activeRules: RecommendationRule[] = RECOMMENDATION_RULES.filter(rule => rule.condition(context));
  const activeRuleIds = activeRules.map(r => r.id);

  // 2. Collecter les axes recommandés et déconseillés
  const recommendedAxes = new Set<WahooPhysioAxis>();
  const discouragedAxes = new Set<WahooPhysioAxis>();

  for (const rule of activeRules) {
    rule.recommended_axes.forEach(axis => recommendedAxes.add(axis));
    rule.discouraged_axes.forEach(axis => discouragedAxes.add(axis));
  }

  // 3. Classifier chaque workout
  const recommendations: WorkoutRecommendation[] = [];

  for (const workout of WAHOO_WORKOUTS) {
    // Filtrer par sport
    if (sportFocus === "bike" && workout.sport !== "bike") continue;
    if (sportFocus === "run" && workout.sport !== "run") continue;
    // tri = accepte les deux

    const recommendation = classifyWorkout(
      workout,
      recommendedAxes,
      discouragedAxes,
      activeRules,
      context
    );

    recommendations.push(recommendation);
  }

  // 4. Trier: RECOMMENDED en premier, puis NEUTRAL, puis DISCOURAGED
  recommendations.sort((a, b) => {
    const order: Record<RecommendationType, number> = {
      RECOMMENDED: 0,
      NEUTRAL: 1,
      DISCOURAGED: 2,
    };
    if (order[a.recommendation_type] !== order[b.recommendation_type]) {
      return order[a.recommendation_type] - order[b.recommendation_type];
    }
    return a.priority - b.priority;
  });

  // 5. Générer le diagnostic
  const diagnosticSummary = generateDiagnosticSummary(activeRules, context);

  // 6. Confiance globale
  const confidenceGlobal = Math.min(
    vlamaxEffectif.confidence,
    tteEffectif.confidence,
    fatigueEffectif.confidence,
    runInjuryRisk.confidence
  );

  return {
    recommendations,
    activeRules: activeRuleIds,
    diagnosticSummary,
    confidenceGlobal,
    disclaimer: "Two For Coaching Lab éclaire la décision, il ne remplace pas le coach. Ces recommandations sont des aides à la décision, non des prescriptions.",
  };
}

// =============================================
// CLASSIFICATION DES WORKOUTS
// =============================================

function classifyWorkout(
  workout: WahooWorkoutMapping,
  recommendedAxes: Set<WahooPhysioAxis>,
  discouragedAxes: Set<WahooPhysioAxis>,
  activeRules: RecommendationRule[],
  context: RecommendationContext
): WorkoutRecommendation {
  const primaryAxis = workout.primary_axis;
  const secondaryAxis = workout.secondary_axis;

  let recommendation_type: RecommendationType = "NEUTRAL";
  let reason_short = "";
  let reason_long = "";
  const linked_indices: string[] = [];
  let priority: 1 | 2 | 3 = 2;

  // Vérifier si l'axe principal est déconseillé
  const isDiscouraged = discouragedAxes.has(primaryAxis);
  const isRecommended = recommendedAxes.has(primaryAxis) || (secondaryAxis && recommendedAxes.has(secondaryAxis));

  if (isDiscouraged) {
    recommendation_type = "DISCOURAGED";
    priority = 3;

    // Trouver la règle qui décourage
    const discourageRule = activeRules.find(r => r.discouraged_axes.includes(primaryAxis));
    if (discourageRule) {
      reason_short = `Déconseillé (${discourageRule.name})`;
      reason_long = formatReason(discourageRule.reason_template, context);
      linked_indices.push(...discourageRule.linked_indices);
    }
  } else if (isRecommended) {
    recommendation_type = "RECOMMENDED";
    priority = 1;

    // Trouver la règle qui recommande
    const recommendRule = activeRules.find(
      r => r.recommended_axes.includes(primaryAxis) || (secondaryAxis && r.recommended_axes.includes(secondaryAxis))
    );
    if (recommendRule) {
      reason_short = `Recommandé (${recommendRule.name})`;
      reason_long = formatReason(recommendRule.reason_template, context);
      linked_indices.push(...recommendRule.linked_indices);
    }
  } else {
    // Neutre
    reason_short = "Compatible avec le profil actuel";
    reason_long = "Cette séance n'est ni spécifiquement recommandée ni déconseillée selon les indices actuels.";
  }

  // Ajouter l'annotation staff
  if (reason_long) {
    reason_long += ` — ${workout.staff_annotation}`;
  }

  return {
    platform: "WAHOO",
    workout_id: workout.wahoo_id,
    workout_name: workout.wahoo_name,
    workout_type: workout.category,
    recommendation_type,
    reason_short,
    reason_long,
    linked_indices: [...new Set(linked_indices)],
    confidence: calculateWorkoutConfidence(context, linked_indices),
    priority,
  };
}

// =============================================
// HELPERS
// =============================================

function formatReason(template: string, context: RecommendationContext): string {
  return template
    .replace("{{vlamax}}", context.vlamaxEffectif.value?.toFixed(2) || "—")
    .replace("{{tte}}", String(context.tteEffectif.tte_min))
    .replace("{{target}}", String(getTTETargetLocal(context.objectif)))
    .replace("{{fatigue}}", String(context.fatigueEffectif.score))
    .replace("{{level}}", context.runInjuryRisk.levelLabel || context.runInjuryRisk.level)
    .replace("{{score}}", String(context.runInjuryRisk.score));
}

function calculateWorkoutConfidence(
  context: RecommendationContext,
  linkedIndices: string[]
): number {
  let confidence = 0.6;

  for (const index of linkedIndices) {
    if (index.includes("VLamax")) {
      confidence = Math.max(confidence, context.vlamaxEffectif.confidence);
    }
    if (index.includes("TTE")) {
      confidence = Math.max(confidence, context.tteEffectif.confidence);
    }
    if (index.includes("Fatigue")) {
      confidence = Math.max(confidence, context.fatigueEffectif.confidence);
    }
    if (index.includes("CAP")) {
      confidence = Math.max(confidence, context.runInjuryRisk.confidence);
    }
  }

  return Math.min(confidence, 0.95);
}

function generateDiagnosticSummary(
  activeRules: RecommendationRule[],
  context: RecommendationContext
): string {
  if (activeRules.length === 0) {
    return "Profil équilibré. Toutes les séances sont compatibles avec l'état actuel.";
  }

  const parts: string[] = [];

  for (const rule of activeRules) {
    parts.push(formatReason(rule.reason_template, context));
  }

  return parts.join(" ");
}

// =============================================
// GUIDELINE FATIGUE VÉLO (pour affichage)
// =============================================

export const FATIGUE_VELO_GUIDELINE = [
  { range: "<30%", recommendation: "Séances qualitatives OK", axes_ok: ["VO2_UP", "THRESHOLD_MLSS", "TTE_UP"] },
  { range: "30–45%", recommendation: "Intensité contrôlée (éviter densité)", axes_ok: ["TTE_UP", "VLAMAX_DOWN"] },
  { range: "45–60%", recommendation: "Priorité tempo/Z2", axes_ok: ["ENDURANCE_BASE", "VLAMAX_DOWN"] },
  { range: ">60%", recommendation: "Récupération active uniquement", axes_ok: ["RECOVERY"] },
];

// =============================================
// EXPORT POUR PDF
// =============================================

export interface RecommendationSummaryForPDF {
  platform: string;
  workout_name: string;
  status: "OK" | "Prudence" | "À éviter";
  reason: string;
  physio_target: string;
}

export function getRecommendationSummaryForPDF(
  recommendations: WorkoutRecommendation[]
): RecommendationSummaryForPDF[] {
  return recommendations.slice(0, 15).map(rec => ({
    platform: rec.platform,
    workout_name: rec.workout_name,
    status: rec.recommendation_type === "RECOMMENDED" 
      ? "OK" 
      : rec.recommendation_type === "NEUTRAL" 
        ? "Prudence" 
        : "À éviter",
    reason: rec.reason_short,
    physio_target: rec.workout_type,
  }));
}
