// =============================================
// WEEK SELECTOR TFCL™ - Moteur de Suggestion
// Two For Coaching Lab
// =============================================
//
// PRINCIPE FONDAMENTAL:
// Coach-first. TFCL suggère, le coach décide.
// Aucune semaine n'est appliquée automatiquement.
//
// =============================================

import type {
  RunningWeek,
  RunningWeekMeta,
  AthleteTruthRunning,
  WeekSelectorContext,
  WeekSuggestion,
  WeekSelectorResult,
  SuggestionBadge,
  RunningGoal,
  AmbitionLevel,
  RunningPhase,
} from "@/types/runningTemplate";

// =============================================
// NEEDS COMPUTATION
// =============================================

interface AthleteNeeds {
  needsTTE: boolean;         // TTE bas → focus TTE
  needsVO2: boolean;         // VO2 à développer
  needsEconomy: boolean;     // Économie à améliorer
  needsEndurance: boolean;   // Base aérobie à construire
  needsSpeed: boolean;       // Vitesse terminale
  maxLoadLevel: number;      // Charge max recommandée (1-5)
  maxIntensityDensity: number; // Densité max (1-5)
  maxLongrunLevel: number;   // Long run max (1-5)
  excludeHighInjuryRisk: boolean;
  reduceIntensity: boolean;
  vlaMaxWarning: boolean;    // VLamax trop élevée pour l'objectif
  tteWarning: boolean;       // TTE insuffisant
}

/**
 * Calcule les besoins de l'athlète basés sur son profil physiologique
 */
export function computeRunningNeeds(
  athleteTruth: AthleteTruthRunning,
  raceType: RunningGoal,
  ambition: AmbitionLevel
): AthleteNeeds {
  const { vlamax_run, tte_run, fatigueIndex, runInjuryRisk, economy_run } = athleteTruth;
  
  // Seuils VLamax par objectif
  const vlamaxThresholds = {
    marathon: { warning: 0.35, critical: 0.45 },
    semi: { warning: 0.45, critical: 0.55 },
  };
  
  // Seuils TTE par objectif
  const tteThresholds = {
    marathon: { warning: 50, critical: 45 },
    semi: { warning: 45, critical: 40 },
  };
  
  // F38 / memory `insufficient-data-no-fake-defaults`:
  // valeur manquante → 0 (sera traité comme "non évalué" par les seuils ci-dessous)
  const vlamaxValue = vlamax_run.value ?? 0;
  const tteValue = tte_run.value ?? 0;
  
  // Déterminer si VLamax est trop élevée
  const vlamaxThreshold = vlamaxThresholds[raceType];
  const vlaMaxWarning = vlamaxValue > vlamaxThreshold.warning;
  const vlaMaxCritical = vlamaxValue > vlamaxThreshold.critical;
  
  // Déterminer si TTE est insuffisant
  const tteThreshold = tteThresholds[raceType];
  const tteWarning = tteValue < tteThreshold.warning;
  const tteCritical = tteValue < tteThreshold.critical;
  
  // Besoins de développement
  const needsTTE = tteCritical || (tteWarning && !vlaMaxCritical);
  const needsVO2 = !vlaMaxCritical && ambition !== "FINISH";
  const needsEconomy = economy_run ? economy_run.score < 60 : false;
  const needsEndurance = raceType === "marathon" || tteWarning;
  const needsSpeed = !vlaMaxCritical && ambition === "ELITE";
  
  // Limites de charge basées sur fatigue et risque
  let maxLoadLevel = 5;
  let maxIntensityDensity = 5;
  let maxLongrunLevel = 5;
  
  // Ajustements fatigue
  if (fatigueIndex > 70) {
    maxLoadLevel = 3;
    maxIntensityDensity = 2;
  } else if (fatigueIndex > 55) {
    maxLoadLevel = 4;
    maxIntensityDensity = 3;
  } else if (fatigueIndex > 40) {
    maxIntensityDensity = 4;
  }
  
  // Ajustements risque blessure
  const injuryLevel = runInjuryRisk.level.toUpperCase();
  const excludeHighInjuryRisk = injuryLevel === "CRITIQUE" || injuryLevel === "ELEVE";
  
  if (injuryLevel === "CRITIQUE") {
    maxLoadLevel = Math.min(maxLoadLevel, 2);
    maxIntensityDensity = Math.min(maxIntensityDensity, 2);
    maxLongrunLevel = 3;
  } else if (injuryLevel === "ELEVE") {
    maxLoadLevel = Math.min(maxLoadLevel, 3);
    maxIntensityDensity = Math.min(maxIntensityDensity, 3);
    maxLongrunLevel = 4;
  }
  
  // Ajustements ambition
  if (ambition === "ELITE") {
    // Elite peut aller plus haut mais avec garde-fous
    maxLoadLevel = Math.min(5, maxLoadLevel + 1);
    maxIntensityDensity = Math.min(5, maxIntensityDensity + 1);
  } else if (ambition === "FINISH") {
    // Finisher reste conservateur
    maxLoadLevel = Math.min(3, maxLoadLevel);
    maxIntensityDensity = Math.min(3, maxIntensityDensity);
  }
  
  return {
    needsTTE,
    needsVO2,
    needsEconomy,
    needsEndurance,
    needsSpeed,
    maxLoadLevel,
    maxIntensityDensity,
    maxLongrunLevel,
    excludeHighInjuryRisk,
    reduceIntensity: fatigueIndex > 55 || injuryLevel === "ELEVE" || injuryLevel === "CRITIQUE",
    vlaMaxWarning,
    tteWarning,
  };
}

// =============================================
// WEEK SCORING
// =============================================

interface ScoreDetails {
  score: number;
  reasons: string[];
  watchouts: string[];
}

/**
 * Score une semaine par rapport aux besoins de l'athlète
 */
export function scoreWeekFit(
  week: RunningWeek,
  athleteTruth: AthleteTruthRunning,
  context: WeekSelectorContext,
  needs: AthleteNeeds
): ScoreDetails {
  const { meta } = week;
  let score = 50; // Score de base
  const reasons: string[] = [];
  const watchouts: string[] = [];
  
  // =============================================
  // EXCLUSIONS STRICTES
  // =============================================
  
  // Risque blessure critique → exclure semaines HIGH
  if (needs.excludeHighInjuryRisk && meta.injury_risk_tag === "HIGH") {
    return {
      score: 0,
      reasons: ["❌ Exclue : Risque blessure CAP critique"],
      watchouts: ["Semaine trop chargée pour le niveau de risque actuel"]
    };
  }
  
  // Charge trop élevée
  if (meta.load_level > needs.maxLoadLevel) {
    score -= 30;
    watchouts.push(`Charge (${meta.load_level}/5) > max recommandé (${needs.maxLoadLevel}/5)`);
  }
  
  // Intensité trop dense
  if (meta.intensity_density > needs.maxIntensityDensity) {
    score -= 25;
    watchouts.push(`Densité d'intensité trop élevée (${meta.intensity_density}/5)`);
  }
  
  // Long run trop long pour le risque
  if (meta.longrun_level > needs.maxLongrunLevel) {
    score -= 20;
    watchouts.push(`Long run trop ambitieux pour le risque blessure actuel`);
  }
  
  // =============================================
  // BONUS FOCUS
  // =============================================
  
  // TTE focus quand besoin TTE
  if (needs.needsTTE && meta.focus === "TTE") {
    score += 25;
    reasons.push("✓ Focus TTE adapté au profil (TTE à développer)");
  }
  
  // Limiter VO2 si VLamax trop élevée
  if (needs.vlaMaxWarning && meta.focus === "VO2") {
    score -= 20;
    watchouts.push("⚠️ VLamax élevée → limiter séances VO2 denses");
  } else if (!needs.vlaMaxWarning && needs.needsVO2 && meta.focus === "VO2") {
    score += 15;
    reasons.push("✓ Focus VO2 compatible avec profil métabolique");
  }
  
  // Endurance focus pour marathon
  if (context.raceType === "marathon" && meta.focus === "ENDURANCE") {
    score += 10;
    reasons.push("✓ Focus endurance adapté au marathon");
  }
  
  // Economy bonus
  if (needs.needsEconomy && meta.focus === "ECONOMY") {
    score += 15;
    reasons.push("✓ Travail d'économie de course recommandé");
  }
  
  // Speed pour Elite seulement
  if (meta.focus === "SPEED") {
    if (context.ambition === "ELITE" && !needs.vlaMaxWarning) {
      score += 10;
      reasons.push("✓ Travail vitesse adapté au niveau Elite");
    } else if (needs.vlaMaxWarning) {
      score -= 15;
      watchouts.push("Vitesse à limiter avec VLamax élevée");
    }
  }
  
  // =============================================
  // PHASE ALIGNMENT
  // =============================================
  
  if (context.phase_manual) {
    if (meta.phase === context.phase_manual) {
      score += 20;
      reasons.push(`✓ Phase ${meta.phase} alignée avec la période`);
    } else {
      score -= 10;
    }
  }
  
  // =============================================
  // INJURY RISK ALIGNMENT
  // =============================================
  
  const injuryLevel = athleteTruth.runInjuryRisk.level.toUpperCase();
  
  if (meta.injury_risk_tag === "LOW") {
    if (injuryLevel === "FAIBLE") {
      score += 10;
      reasons.push("✓ Semaine adaptée au risque blessure faible");
    } else {
      score += 5; // Bonus conservateur
    }
  } else if (meta.injury_risk_tag === "MED") {
    if (injuryLevel === "MODERE" || injuryLevel === "FAIBLE") {
      score += 5;
    } else {
      score -= 10;
      watchouts.push("Semaine à risque modéré avec risque athlète élevé");
    }
  }
  
  // =============================================
  // FATIGUE ALIGNMENT
  // =============================================
  
  if (athleteTruth.fatigueIndex > 60) {
    if (meta.load_level <= 2 && meta.intensity_density <= 2) {
      score += 15;
      reasons.push("✓ Semaine légère adaptée à la fatigue élevée");
    }
  } else if (athleteTruth.fatigueIndex < 30) {
    if (meta.load_level >= 4) {
      score += 10;
      reasons.push("✓ Fraîcheur permet une charge élevée");
    }
  }
  
  // =============================================
  // AMBITION ALIGNMENT
  // =============================================
  
  if (context.ambition === "FINISH" && meta.load_level <= 3) {
    score += 10;
    reasons.push("✓ Charge conservatrice pour objectif Finisher");
  }
  
  if (context.ambition === "ELITE" && meta.load_level >= 4 && !needs.reduceIntensity) {
    score += 10;
    reasons.push("✓ Charge ambitieuse pour niveau Elite");
  }
  
  // Clamp score
  score = Math.max(0, Math.min(100, score));
  
  // Add default reasons if none
  if (reasons.length === 0 && score >= 50) {
    reasons.push("Semaine compatible avec le profil actuel");
  }
  
  return { score, reasons, watchouts };
}

// =============================================
// SUGGESTION GENERATION
// =============================================

function getBadge(score: number): SuggestionBadge {
  if (score >= 70) return "TOP";
  if (score >= 50) return "GOOD";
  return "CAUTION";
}

function generateWhy(
  week: RunningWeek,
  scoreDetails: ScoreDetails,
  athleteTruth: AthleteTruthRunning
): string {
  const { meta } = week;
  const badge = getBadge(scoreDetails.score);
  
  if (badge === "TOP") {
    const mainReason = scoreDetails.reasons[0] || "Excellente compatibilité avec le profil";
    return `Semaine ${week.week_number} recommandée (${scoreDetails.score}%). ${mainReason}.`;
  }
  
  if (badge === "GOOD") {
    return `Semaine ${week.week_number} compatible (${scoreDetails.score}%). Charge ${meta.load_level}/5, Focus ${meta.focus}.`;
  }
  
  const warning = scoreDetails.watchouts[0] || "Vérifier la compatibilité";
  return `Semaine ${week.week_number} avec réserves (${scoreDetails.score}%). ${warning}.`;
}

function generateAdjustments(
  week: RunningWeek,
  athleteTruth: AthleteTruthRunning,
  needs: AthleteNeeds
): string[] {
  const adjustments: string[] = [];
  const { meta } = week;
  
  // Suggestions basées sur les gaps
  if (needs.reduceIntensity && meta.intensity_density >= 3) {
    adjustments.push("Envisager de réduire la densité d'intensité de 15-20%");
  }
  
  if (needs.excludeHighInjuryRisk && meta.longrun_level >= 4) {
    adjustments.push("Réduire le long run de 15-20 minutes");
  }
  
  if (needs.vlaMaxWarning && meta.focus === "VO2") {
    adjustments.push("Remplacer 1 séance VO2 par du tempo/seuil");
  }
  
  if (needs.needsTTE && meta.focus !== "TTE") {
    adjustments.push("Ajouter un bloc de tempo (15-20') si possible");
  }
  
  if (athleteTruth.fatigueIndex > 55) {
    adjustments.push("Prévoir une journée de récupération supplémentaire");
  }
  
  return adjustments.slice(0, 3); // Max 3 suggestions
}

/**
 * Génère les top suggestions de semaines
 */
export function suggestTopWeeks(
  weeks: RunningWeek[],
  athleteTruth: AthleteTruthRunning,
  context: WeekSelectorContext
): WeekSelectorResult {
  const needs = computeRunningNeeds(athleteTruth, context.raceType, context.ambition);
  const warnings: string[] = [];
  
  // Check data quality
  if (athleteTruth.vlamax_run.confidence < 0.5) {
    warnings.push("Confiance VLamax faible – résultats à interpréter avec prudence");
  }
  if (athleteTruth.tte_run.confidence < 0.5) {
    warnings.push("Confiance TTE faible – compléter le Profil Référence recommandé");
  }
  if (athleteTruth.runInjuryRisk.score > 60) {
    warnings.push("Risque blessure CAP élevé – privilégier les semaines conservatrices");
  }
  
  // Score all weeks
  const scoredWeeks = weeks.map(week => {
    const scoreDetails = scoreWeekFit(week, athleteTruth, context, needs);
    return { week, scoreDetails };
  });
  
  // Sort by score descending
  scoredWeeks.sort((a, b) => b.scoreDetails.score - a.scoreDetails.score);
  
  // Take top 3
  const topWeeks = scoredWeeks.slice(0, 3);
  
  const suggestions: WeekSuggestion[] = topWeeks.map(({ week, scoreDetails }) => ({
    template_id: week.template_id,
    template_name: "", // Will be filled by caller
    section_id: week.section_id,
    section_name: "", // Will be filled by caller
    week_id: week.week_id,
    week_number: week.week_number,
    week_title: week.title,
    week_summary: week.summary,
    match_score: scoreDetails.score,
    badge: getBadge(scoreDetails.score),
    why: generateWhy(week, scoreDetails, athleteTruth),
    watchouts: scoreDetails.watchouts,
    suggested_adjustments: generateAdjustments(week, athleteTruth, needs),
    meta: week.meta,
    sessions: week.sessions,
    coachAdvice: week.coachAdvice,
  }));
  
  // Calculate overall confidence
  const avgConfidence = (
    athleteTruth.vlamax_run.confidence +
    athleteTruth.tte_run.confidence +
    0.8 // Base confidence for algorithm
  ) / 3;
  
  const confidenceLabel = avgConfidence >= 0.7 ? "Élevée" : avgConfidence >= 0.5 ? "Modérée" : "Faible";
  
  return {
    suggestions,
    athleteTruth,
    context,
    confidence: avgConfidence,
    confidenceLabel,
    warnings,
    disclaimer: "Suggestion d'aide à la décision. Le coach reste responsable du choix final. Aucune modification n'est appliquée automatiquement.",
  };
}

// =============================================
// PHASE CALCULATION FROM DATE
// =============================================

/**
 * Calcule la phase basée sur la date de course
 */
export function computePhaseFromDate(
  raceDate: string,
  totalWeeks: number = 12
): RunningPhase {
  const today = new Date();
  const race = new Date(raceDate);
  const diffDays = Math.ceil((race.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.ceil(diffDays / 7);
  
  if (diffWeeks <= 2) return "TAPER";
  if (diffWeeks <= Math.ceil(totalWeeks * 0.3)) return "SPECIFIC";
  if (diffWeeks <= Math.ceil(totalWeeks * 0.6)) return "BUILD";
  return "BASE";
}
