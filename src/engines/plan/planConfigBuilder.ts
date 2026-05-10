/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL PLAN ENGINE™ — Plan Config Builder
 * 
 * Construit le PlanConfig enrichi à partir du Diagnostic Engine.
 * Encapsule la logique de formatage des limiteurs, leviers et prohibitions
 * pour injection dans le prompt IA.
 * 
 * Remplace la logique manuelle de AITrainingPlanPage.buildConfig()
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { AthleteDiagnostic } from "@/engines/diagnostic";
import type { PlanConfig, PlanAthleteData, RaceGoal, AdaptationProjection } from "@/hooks/useAITrainingPlan";
import type { UnifiedLimiterResult } from "@/engines/diagnostic";
import { computeAdaptationPrediction, type AdaptationPredictorInput } from "@/lib/v2/adaptationPredictor";
import { computeCRR, computeChargeScore, getCRRTargets } from "@/lib/chargeRecenteReference";

// ═══════════════════════════════════════════════════════════════════════════════
// ATHLETE DATA EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extrait PlanAthleteData depuis un AthleteDiagnostic
 * Remplace le calcul manuel dans computeAthleteContext()
 */
export function buildPlanAthleteDataFromDiagnostic(
  diagnostic: AthleteDiagnostic
): PlanAthleteData {
  const raw = diagnostic._rawInput;
  return {
    nom: raw.athleteName,
    sex: raw.sex ?? null,
    ftp: raw.ftp,
    weightKg: raw.weightKg,
    vlamax: diagnostic.effectifs.vlamax.value,
    vlamaxRun: raw.vlamaxRun,
    vo2max: raw.vo2max,
    vma: raw.vma,
    css: raw.css,
    fcMax: null, // Not in DiagnosticInput — passed separately if needed
    tte: diagnostic.effectifs.tte.tte_min,
    pmax5s: raw.pmax5s,
    p30s: raw.p30sW,
    p60s: raw.p60sW,
    map5min: raw.map5minW,
    paceThresholdSecPerKm: raw.paceThresholdSecPerKm ?? null,
    runEconomyScore: raw.runEconomyScore ?? null,
    // Run MLSS Modèle C — fallback effectif si pace_threshold manquant
    runMLSSEffectivePct: diagnostic.runMLSS?.effectivePct ?? null,
    runMLSSEffectiveSource: diagnostic.runMLSS?.effectiveSource ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVER LABELS
// ═══════════════════════════════════════════════════════════════════════════════

const LEVER_LABELS: Record<string, string> = {
  increase_vo2max: "Développer VO2max",
  decrease_vlamax: "Réduire VLamax (Sprint Ban)",
  increase_tte: "Augmenter TTE",
  increase_fat_oxidation: "Améliorer FatMax / Train Low",
  recovery: "Récupération prioritaire",
  force_endurance: "Force Max / SFR",
  increase_ftp_kg: "Développer FTP/kg",
  adjust_anaerobic: "Ajuster W'",
  maintain: "Maintenir le profil",
};

const METRIC_TO_LIMITER_MAP: Record<string, string> = {
  "VO2max": "VO2max bas",
  "FTP/kg": "FTP/kg bas (puissance au seuil)",
  "VLamax": "VLamax trop haute (LD)",
  "TTE": "TTE faible (<40min)",
  "FatMax": "FatMax bas",
  "Économie": "Économie de course basse",
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORM CONFIG — Ce que la page fournit
// ═══════════════════════════════════════════════════════════════════════════════

export type CoachTrainingLevel = "untrained" | "light" | "trained" | "highly_trained";

export interface PlanFormConfig {
  objective: string;        // Label (e.g. "Ironman 70.3")
  raceName?: string;
  raceDate?: string;
  raceGoals?: RaceGoal[];   // Multi-objective (A, B, C)
  planStartDate?: string;   // yyyy-MM-dd
  weeksAvailable?: number;
  weeklyHours?: number;
  sessionsPerWeek?: number;
  maxSessionsPerDay?: number;
  strengthSessionsPerWeek?: number;
  ambition?: string;        // Label (e.g. "Age Group")
  constraints?: string;
  /** Évaluation rapide du niveau d'entraînement actuel — utilisé comme fallback CRR si TSS 7j absent */
  trainingLevel?: CoachTrainingLevel;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Construit un PlanConfig complet depuis un AthleteDiagnostic + config de formulaire.
 * Encapsule toute la logique de formatage des limiteurs pour le prompt IA.
 */
export function buildPlanConfigFromDiagnostic(
  diagnostic: AthleteDiagnostic,
  formConfig: PlanFormConfig,
  coachLimiterOrder?: string[]  // Coach-overridden limiter order (metric names)
): PlanConfig {
  const limiterResult = diagnostic.limiter;
  
  // ── Limiteurs enrichis ────────────────────────────────────────────────────
  const limiters = formatLimitersForPrompt(limiterResult, diagnostic.objectif, coachLimiterOrder);

  // ── Leviers (L1 + L2) ──────────────────────────────────────────────────────
  const leverIds: string[] = [limiterResult.primaryLever];
  // Add secondary lever from L2 gap if different from L1
  const l2Gap = limiterResult.gapAnalysis
    .filter(g => g.weightedImpact > 0)
    .sort((a, b) => b.weightedImpact - a.weightedImpact)[1];
  if (l2Gap) {
    const l2LeverMap: Record<string, string> = {
      "VO2max": "increase_vo2max",
      "FTP/kg": "increase_ftp_kg",
      "VLamax": "decrease_vlamax",
      "TTE": "increase_tte",
      "FatMax": "increase_fat_oxidation",
      "Économie": "force_endurance",
    };
    const l2Lever = l2LeverMap[l2Gap.metric];
    if (l2Lever && l2Lever !== limiterResult.primaryLever) {
      leverIds.push(l2Lever);
    }
  }
  const levers = leverIds
    .map(l => LEVER_LABELS[l] || l)
    .filter(Boolean);

  // ── Prohibitions ──────────────────────────────────────────────────────────
  const prohibitions = buildProhibitions(limiterResult, diagnostic.objectif, diagnostic.ambition);

  // ── Adaptation Projections ────────────────────────────────────────────────
  const projections = buildAdaptationProjections(diagnostic);

  // ── Charge Récente de Référence (CRR) ────────────────────────────────────
  // Hiérarchie: NOLIO > SNAPSHOT(tss7d) > MANUAL(coach trainingLevel) > UNKNOWN
  const crrTargets = getCRRTargets(diagnostic.objectif);
  let manualEstimate: number | null = null;
  if (formConfig.trainingLevel && (diagnostic._rawInput.tss7d ?? null) === null) {
    // Estimation conservatrice basée sur la cible objectif
    const { chargeMinimale: mn, chargeOptimale: opt, chargeMaximale: mx } = crrTargets;
    switch (formConfig.trainingLevel) {
      case "untrained":      manualEstimate = Math.round(mn * 0.30); break;
      case "light":          manualEstimate = Math.round(mn * 0.70); break;
      case "trained":        manualEstimate = Math.round((mn + opt) / 2); break;
      case "highly_trained": manualEstimate = Math.round((opt + mx) / 2); break;
    }
  }
  const crr = computeCRR({
    tss7d: diagnostic._rawInput.tss7d ?? null,
    manualOverride: manualEstimate,
  });
  const chargeScore = computeChargeScore(crr, diagnostic.objectif);
  const recentLoad = {
    tss7d: crr.value,
    source: crr.source,
    status: chargeScore.status,
    label: crr.label,
    recommendation: chargeScore.recommendation,
    target: {
      min: crrTargets.chargeMinimale,
      opt: crrTargets.chargeOptimale,
      max: crrTargets.chargeMaximale,
    },
  };

  return {
    objective: formConfig.objective,
    raceName: formConfig.raceName,
    raceDate: formConfig.raceDate,
    raceGoals: formConfig.raceGoals,
    planStartDate: formConfig.planStartDate,
    weeksAvailable: formConfig.weeksAvailable,
    weeklyHours: formConfig.weeklyHours,
    sessionsPerWeek: formConfig.sessionsPerWeek,
    maxSessionsPerDay: formConfig.maxSessionsPerDay,
    strengthSessionsPerWeek: formConfig.strengthSessionsPerWeek,
    ambition: formConfig.ambition,
    constraints: formConfig.constraints,
    identifiedLimiters: limiters.length > 0 ? limiters : undefined,
    activeLevers: levers.length > 0 ? levers : undefined,
    prohibitions: prohibitions.length > 0 ? prohibitions : undefined,
    adaptationProjections: projections.length > 0 ? projections : undefined,
    recentLoad,
    _athleteSex: diagnostic._rawInput.sex ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATAGE LIMITEURS
// ═══════════════════════════════════════════════════════════════════════════════

function formatLimitersForPrompt(
  limiterResult: UnifiedLimiterResult,
  _objectif: string,
  coachLimiterOrder?: string[]
): string[] {
  const limiters: string[] = [];

  // Sort ALL gaps by weighted impact (highest = most limiting)
  let rankedGaps = [...limiterResult.gapAnalysis]
    .filter(g => g.weightedImpact > 0)
    .sort((a, b) => b.weightedImpact - a.weightedImpact);

  // If coach provided a custom order, re-sort to match it
  const hasCoachOverride = coachLimiterOrder && coachLimiterOrder.length > 0;
  if (hasCoachOverride) {
    rankedGaps = rankedGaps.sort((a, b) => {
      const idxA = coachLimiterOrder.indexOf(a.metric);
      const idxB = coachLimiterOrder.indexOf(b.metric);
      // Items not in the coach order go to the end
      const posA = idxA >= 0 ? idxA : 999;
      const posB = idxB >= 0 ? idxB : 999;
      return posA - posB;
    });
  }

  if (rankedGaps.length > 0) {
    if (hasCoachOverride) {
      limiters.push(`## ⚙️ CLASSEMENT DES LIMITEURS — ORDRE PERSONNALISÉ PAR LE COACH`);
      limiters.push(`⚠️ Le coach a modifié l'ordre de priorité des limiteurs. Cet ordre PRIME sur le classement automatique par impact.\n`);
    } else {
      limiters.push(`## CLASSEMENT DES LIMITEURS PAR IMPORTANCE (du plus critique au moins critique)`);
    }
    limiters.push(`Total : ${rankedGaps.length} limiteur(s) détecté(s). Le plan DOIT les adresser TOUS, par ordre de priorité.\n`);

    rankedGaps.forEach((g, idx) => {
      const rank = idx + 1;
      const limiterCategory = METRIC_TO_LIMITER_MAP[g.metric] || g.metric;
      const statusEmoji = g.status === "limiting" ? "🔴 CRITIQUE" : "🟡 SOUS-OPTIMAL";
      const impactScore = g.weightedImpact.toFixed(1);

      limiters.push(`### Limiteur #${rank} — ${g.metric} (Impact: ${impactScore}/100)`);
      limiters.push(`- Statut : ${statusEmoji}`);
      limiters.push(`- Valeur actuelle : ${g.value?.toFixed(2) ?? "?"} vs cible : ${g.target?.toFixed(2)}`);
      limiters.push(`- Catégorie séances clés : "${limiterCategory}" (cf. tableau Séances Clés par Limiteur Dan Lorang)`);
      
      if (rank === 1) {
        limiters.push(`- 🎯 PRIORITÉ ABSOLUE : Ce limiteur doit recevoir la séance clé #1 de chaque semaine pendant les premières phases (Base/Build).`);
      } else if (rank === 2) {
        limiters.push(`- ⚡ PRIORITÉ HAUTE : Ce limiteur doit recevoir la séance clé #2 de chaque semaine.`);
      } else {
        limiters.push(`- 📋 PRIORITÉ SECONDAIRE : Adresser via 1-2 séances complémentaires/sem ou intégré dans les phases Build/Spécifique.`);
      }
      limiters.push("");
    });

    // Periodization rules
    limiters.push(`## RÈGLE DE PÉRIODISATION SÉQUENTIELLE DES LIMITEURS`);
    limiters.push(`- Phase Base : Focus principal sur le Limiteur #1 (séances clés #1 et #2). Limiteur #2 en maintien.`);
    limiters.push(`- Phase Build : Limiteur #1 toujours prioritaire mais le Limiteur #2 monte en importance (séance clé #2 dédiée).`);
    limiters.push(`- Phase Spécifique : Intégration de tous les limiteurs dans un contexte race-specific.`);
    limiters.push(`- Les limiteurs 🔴 CRITIQUES doivent être traités AVANT les 🟡 SOUS-OPTIMAUX.`);
    limiters.push(`- Interactions positives : VLamax↓ améliore aussi TTE et FatMax. VO2max↑ améliore aussi FTP/kg. Exploiter ces synergies.`);
  }

  // Primary limiter context
  if (limiterResult.primaryLimiter !== "none") {
    limiters.push(`\n## Synthèse TFCL™`);
    limiters.push(`🎯 LIMITEUR PRIMAIRE : ${limiterResult.limiterLabel} — ${limiterResult.limiterExplanation}`);
  }

  return limiters;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROHIBITIONS
// ═══════════════════════════════════════════════════════════════════════════════

function isLongDistanceObjective(objectif: string): boolean {
  const lower = objectif.toLowerCase();
  return (
    lower.includes("ironman") ||
    lower.includes("70.3") ||
    lower === "im" ||
    lower === "703" ||
    lower.includes("marathon") ||
    lower.includes("trail") ||
    lower.includes("ultra")
  );
}

function isShortDistanceObjective(objectif: string): boolean {
  const lower = objectif.toLowerCase();
  return (
    lower.includes("semi") ||
    lower.includes("10k") ||
    lower.includes("10km") ||
    lower.includes("5k") ||
    lower.includes("5km")
  );
}

function buildProhibitions(
  limiterResult: UnifiedLimiterResult,
  objectif: string,
  ambition: string
): string[] {
  const prohibitions: string[] = [];
  const amb = ambition.toLowerCase();
  const isLD = isLongDistanceObjective(objectif);
  const isFinisher = amb === 'finisher';
  
  const vlamaxGap = limiterResult.gapAnalysis.find(g => g.metric === "VLamax");
  const vlamaxIsLimiting = vlamaxGap && vlamaxGap.status === "limiting";

  // Sprint Ban: long distance + non-finisher + VLamax too high
  if (isLD && !isFinisher && vlamaxIsLimiting) {
    prohibitions.push(
      "🚫 SPRINT BAN STRICT — VLamax trop haute pour cet objectif longue distance. " +
      "INTERDITS : sprints all-out, Tabata, micro-intervalles explosifs (<20s), " +
      "sprints neuromusculaires (6×10s, 8×20s, etc.), pliométrie explosive (drop jumps, hurdle rebounds), " +
      "efforts erratiques non-structurés. " +
      "Ces formats AUGMENTENT la VLamax et sont CONTRE-PRODUCTIFS pour l'endurance."
    );

    // Also restrict heavy VO2max blocks when VLamax is high
    prohibitions.push(
      "🚫 RESTRICTION VO2max LOURD — Avec une VLamax élevée, les blocs VO2max longs (≥5min @>110% FTP) " +
      "stimulent excessivement la glycolyse et aggravent le problème. " +
      "AUTORISÉ : intervalles VO2max COURTS et CONTRÔLÉS (3-4×3min @105-110% FTP max, repos longs ≥4min). " +
      "INTERDIT : 5×5min @115% FTP, Tabata VO2max, 30/30 longs. " +
      "PRIORITÉ : Sweet Spot prolongé (2×20min @88-92% FTP), seuil Norvégien, Z2 volume."
    );
  }
  
  // For semi/10K/5K: sprints are BENEFICIAL
  if (isShortDistanceObjective(objectif)) {
    prohibitions.push(
      "✅ SPRINTS AUTORISÉS : objectif courte/moyenne distance — les sprints et la pliométrie " +
      "sont bénéfiques pour l'économie de course et la puissance neuromusculaire."
    );
  }

  return prohibitions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTATION PROJECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function buildAdaptationProjections(diagnostic: AthleteDiagnostic): AdaptationProjection[] {
  const raw = diagnostic._rawInput;
  const snapshot: Record<string, unknown> = {
    vo2max: raw.vo2max,
    vlamax: diagnostic.effectifs.vlamax.value,
    ftp: raw.ftp,
    weight_kg: raw.weightKg,
    tte_observed_min: diagnostic.effectifs.tte.tte_min,
    run_hr_drift_pct: raw.runHrDriftPct,
    run_economy_score: raw.runEconomyScore,
  };

  const input: AdaptationPredictorInput = {
    snapshot,
    limiterId: diagnostic.limiter.primaryLimiter !== "none" ? diagnostic.limiter.primaryLimiter : null,
    limiterLabel: diagnostic.limiter.primaryLimiter !== "none" ? diagnostic.limiter.limiterLabel : null,
    objectif: diagnostic.objectif,
  };

  try {
    const result = computeAdaptationPrediction(input);
    // Keep only the best scenario + top 2 alternatives
    const sorted = [...result.scenarios].sort((a, b) => {
      if (a.lever.id === result.bestScenarioId) return -1;
      if (b.lever.id === result.bestScenarioId) return 1;
      return b.overallImpactScore - a.overallImpactScore;
    });

    return sorted.slice(0, 3).map(s => ({
      leverId: s.lever.id,
      leverLabel: s.lever.label,
      impactScore: s.overallImpactScore,
      impactLabel: s.impactLabel,
      metrics: s.metrics
        .filter(m => m.available && m.significance !== "none")
        .map(m => ({
          label: m.label,
          current: m.current,
          projected: m.projected,
          deltaPct: m.deltaMidPct,
          direction: m.direction,
        })),
      performanceImpacts: s.performancePredictions.map(p => ({
        distance: p.distance,
        improvementPct: p.improvementPct,
      })),
      recommendation: s.recommendation,
    }));
  } catch {
    return [];
  }
}
