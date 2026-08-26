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
import { computeTrailProfile, isTrailObjective } from "@/lib/trailProfile";
import { computeAmbitionEffective } from "@/lib/ambitionDowngrade";
import { AMBITION_DEFINITIONS } from "@/types/ambitionLevel";
import { getVlamaxTarget as getVlamaxTargetCanonical } from "@/lib/v2/vlamaxTargets";

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
    age: raw.age ?? null,
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
  /** Terrain disponible — critique pour les athlètes urbains préparant un trail montagne */
  terrainAvailability?: "plat" | "vallonne" | "montagne" | "mixte";
  /** Coach lock : désactive le déclassement automatique d'ambition (voir computeAmbitionEffective). */
  lockAmbition?: boolean;
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

  // ── Ambition Effective (déclassement en amont) ────────────────────────────
  // UNE seule mutation : ambitionEffective = min(saisie, max(niveau d'entraînement)).
  // Tout ce qui dérive de l'ambition (volumes, qualités/sem, catalogues signature,
  // pctVMA, progressionPct, prohibitions) DOIT consommer ambitionEffective.
  // ⚠️ `lockAmbition` (coach override) bypasse ce cap.
  const ambitionResolution = computeAmbitionEffective({
    ambitionSaisie: formConfig.ambition ?? diagnostic.ambition,
    trainingLevel: formConfig.trainingLevel,
    tss7d: diagnostic._rawInput.tss7d ?? null,
    lockAmbition: formConfig.lockAmbition,
  });

  const effectiveAmbitionLabel = AMBITION_DEFINITIONS[ambitionResolution.ambitionEffective].label;
  // Mutation locale : formConfig.ambition remplacé par le label effectif pour tout le reste du builder.
  const effectiveFormConfig: PlanFormConfig = { ...formConfig, ambition: effectiveAmbitionLabel };

  // ── Limiteurs enrichis ────────────────────────────────────────────────────
  const limiters = formatLimitersForPrompt(limiterResult, diagnostic.objectif, coachLimiterOrder);
  // Note visible dans le Diagnostic TFCL du plan (prépendée si déclassement)
  if (ambitionResolution.diagnosticNote) {
    limiters.unshift(
      `## 🎯 AMBITION AJUSTÉE`,
      ambitionResolution.diagnosticNote,
      ""
    );
  }
  // ── Limiteurs RAW (noms de métriques, ordre prioritaire) — pour chunks 2..N
  const limitersRaw = buildLimitersRawList(limiterResult, coachLimiterOrder);

  // ── Leviers (L1 + L2) ──────────────────────────────────────────────────────
  const leverIds: string[] = [limiterResult.primaryLever];
  if (
    limiterResult.secondaryLever &&
    limiterResult.secondaryLever !== "maintain" &&
    limiterResult.secondaryLever !== limiterResult.primaryLever
  ) {
    leverIds.push(limiterResult.secondaryLever);
  }
  const levers = leverIds
    .map(l => LEVER_LABELS[l] || l)
    .filter(Boolean);

  // ── Prohibitions (utilise l'ambition EFFECTIVE + VLamax effective sport-aware) ─
  // FIX #3 : passage de la VLamax effective (résolue sport-aware par le diagnostic)
  // pour appliquer le garde-fou #2 Lorang — pas de Sprint Ban si VLamax reste
  // dans la range physiologique acceptable de l'objectif. Source unique alignée
  // avec computeLorangStrategy.
  const prohibitions = buildProhibitions(
    limiterResult,
    diagnostic.objectif,
    ambitionResolution.ambitionEffective,
    diagnostic.effectifs.vlamax.value ?? null,
  );

  // ── Adaptation Projections ────────────────────────────────────────────────
  const projections = buildAdaptationProjections(diagnostic, formConfig.weeksAvailable);

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

  // ── Trail Profile (pré-calcul côté code, injecté chunk 1 uniquement) ──────
  // Cherche l'objectif A (ou primaire) trail dans raceGoals avec distance+D+ renseignés
  let trailProfile: PlanConfig["trailProfile"];
  if (isTrailObjective(formConfig.objective) && formConfig.raceGoals) {
    const primary = formConfig.raceGoals.find(g => g.priority === "A") ?? formConfig.raceGoals[0];
    if (primary) {
      const tp = computeTrailProfile({
        objective: primary.objective || formConfig.objective,
        distanceKm: primary.distanceKm ?? null,
        elevationGainM: primary.elevationGainM ?? null,
        targetTimeMinutes: primary.targetTimeMinutes ?? null,
        maxAltitudeM: primary.maxAltitudeM ?? null,
      });
      if (tp) {
        trailProfile = {
          distanceKm: tp.distanceKm,
          elevationGainM: tp.elevationGainM,
          dPlusPerKm: tp.dPlusPerKm,
          terrainLabel: tp.terrainLabel,
          weeklyDPlusPeakM: tp.weeklyDPlusPeakM,
          weeklyDPlusBaseM: tp.weeklyDPlusBaseM,
          descentTechnicalRequired: tp.descentTechnicalRequired,
          estimatedRaceDurationMin: tp.estimatedRaceDurationMin,
          needsAcclimatation: tp.needsAcclimatation,
          needsNightSimulation: tp.needsNightSimulation,
          gutTrainingTargetGPerH: tp.gutTrainingTargetGPerH,
          summary: tp.summary,
        };
      }
    }
  }

  // ── Volume Ramp (rampe de volume Sem 1 → cible) ──────────────────────────
  // Dérivée de `trainingLevel`. Contrainte dure injectée chunk 1 pour
  // éviter de balancer un volume cible (ex: 12h) dès la Sem 1 à un athlète
  // peu/non entraîné. Règle des 10% + ACWR ≤ 1.3 (Gabbett).
  let volumeRamp: PlanConfig["volumeRamp"];
  if (formConfig.trainingLevel && formConfig.weeklyHours && formConfig.weeklyHours > 0) {
    const target = formConfig.weeklyHours;
    const matrix = {
      untrained:      { pct: 0.40, ramp: 6, cap: 5 as number | null },
      light:          { pct: 0.60, ramp: 4, cap: 8 as number | null },
      trained:        { pct: 0.80, ramp: 2, cap: null as number | null },
      highly_trained: { pct: 0.95, ramp: 1, cap: null as number | null },
    }[formConfig.trainingLevel];
    if (matrix) {
      const pctHours = +(target * matrix.pct).toFixed(1);
      const week1HoursMax = matrix.cap !== null ? Math.min(pctHours, matrix.cap) : pctHours;
      volumeRamp = {
        trainingLevel: formConfig.trainingLevel,
        week1PctTarget: matrix.pct,
        rampWeeks: matrix.ramp,
        week1HoursCap: matrix.cap,
        weeklyHoursTarget: target,
        week1HoursMax,
        weeklyIncreasePctMax: 0.10,
      };
    }
  }

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
    ambition: effectiveFormConfig.ambition,
    ambitionMeta: {
      saisie: ambitionResolution.ambitionSaisie,
      effective: ambitionResolution.ambitionEffective,
      saisieLabel: AMBITION_DEFINITIONS[ambitionResolution.ambitionSaisie].label,
      effectiveLabel: effectiveAmbitionLabel,
      downgraded: ambitionResolution.downgraded,
      trainingLevel: ambitionResolution.effectiveTrainingLevel,
      trainingLevelSource: ambitionResolution.trainingLevelSource,
      diagnosticNote: ambitionResolution.diagnosticNote,
    },
    constraints: formConfig.constraints,
    identifiedLimiters: limiters.length > 0 ? limiters : undefined,
    identifiedLimitersRaw: limitersRaw.length > 0 ? limitersRaw : undefined,
    activeLevers: levers.length > 0 ? levers : undefined,
    prohibitions: prohibitions.length > 0 ? prohibitions : undefined,
    adaptationProjections: projections.length > 0 ? projections : undefined,
    recentLoad,
    _athleteSex: diagnostic._rawInput.sex ?? null,
    trailProfile,
    volumeRamp,
    terrainAvailability: formConfig.terrainAvailability,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATAGE LIMITEURS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Liste légère des noms de limiteurs (métriques), triée par impact décroissant
 * et respectant l'override coach si présent. Utilisée pour l'injection dans
 * les chunks 2..N et les heuristiques L1/L2, sans le markdown lourd.
 */
function buildLimitersRawList(
  limiterResult: UnifiedLimiterResult,
  coachLimiterOrder?: string[]
): string[] {
  let ranked = [...limiterResult.gapAnalysis]
    .filter(g => g.weightedImpact > 0)
    .sort((a, b) => b.weightedImpact - a.weightedImpact);
  if (coachLimiterOrder && coachLimiterOrder.length > 0) {
    ranked = ranked.sort((a, b) => {
      const idxA = coachLimiterOrder.indexOf(a.metric);
      const idxB = coachLimiterOrder.indexOf(b.metric);
      return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
    });
  }
  return ranked.map(g => g.metric);
}


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

/**
 * Durée suggérée (semaines) du bloc Chantier consacré au limiteur #1 —
 * jusqu'ici une valeur fixe (3-4 sem) identique quel que soit l'ampleur du
 * gap, alors que le diagnostic calcule déjà un statut par métrique
 * ("limiting"/"acceptable"/"optimal"). On utilise `status` plutôt que
 * `weightedImpact` : ce dernier est dans une unité physique propre à chaque
 * métrique (mL/kg/min pour VO2max, %FTP pour VLamax, etc.) et n'est PAS
 * comparable en valeur absolue entre limiteurs différents — `status` est
 * la seule normalisation déjà cross-métrique disponible dans le diagnostic.
 *
 * Le résultat reste toujours dans la plage validée par
 * PHASE_DURATION_RANGE.Chantier = [2, 6] (planValidator.ts) : ceci ne
 * remet pas en cause cette plage, juste où on se positionne dedans.
 */
export function computeChantierDurationWeeks(
  primaryLimiterStatus: "optimal" | "acceptable" | "limiting" | string | undefined,
  weeksAvailable: number | null | undefined,
): number {
  const base = primaryLimiterStatus === "limiting" ? 5
    : primaryLimiterStatus === "acceptable" ? 4
    : 3; // "optimal" ou statut inconnu → repli sur la valeur générique d'origine
  if (!weeksAvailable || weeksAvailable <= 0) return base;
  // Un Chantier ne doit pas à lui seul écraser Fondation/Consolidation/
  // Race-Specific/Affûtage sur un plan court — plafond à ~35% du plan total.
  const capFromTotal = Math.max(2, Math.round(weeksAvailable * 0.35));
  return Math.max(2, Math.min(base, capFromTotal, 6));
}

function buildProhibitions(
  limiterResult: UnifiedLimiterResult,
  objectif: string,
  ambition: string,
  vlamaxEffective: number | null = null,
): string[] {
  const prohibitions: string[] = [];
  const amb = ambition.toLowerCase();
  const isLD = isLongDistanceObjective(objectif);
  const isFinisher = amb === 'finisher';

  const vlamaxGap = limiterResult.gapAnalysis.find(g => g.metric === "VLamax");
  const vlamaxIsLimiting = vlamaxGap && vlamaxGap.status === "limiting";

  // ─── GARDE-FOU #2 Lorang (audit Cath juillet 2026) ─────────────────────────
  // Ne JAMAIS déclencher Sprint Ban si VLamax reste dans la fourchette
  // physiologique acceptable de l'objectif (range.max de vlamaxTargets).
  // Source unique alignée avec computeLorangStrategy → évite le désaccord
  // "Lorang dit no ban / planConfig dit ban" observé sur Cath (VLamax 0.44,
  // 70.3 age_group, dans la range).
  let withinPhysioRange = false;
  if (vlamaxEffective !== null && isLD) {
    try {
      const range = getVlamaxTargetCanonical(objectif, 'run');
      withinPhysioRange = vlamaxEffective <= range.max;
    } catch {
      withinPhysioRange = false;
    }
  }

  // Sprint Ban: long distance + non-finisher + VLamax too high + guardrail OK
  if (isLD && !isFinisher && vlamaxIsLimiting && !withinPhysioRange) {
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
  } else if (isLD && !isFinisher && vlamaxIsLimiting && withinPhysioRange) {
    // eslint-disable-next-line no-console
    console.log(
      `🛡️ [planConfigBuilder] Sprint Ban court-circuité (garde-fou #2 Lorang) — ` +
      `VLamax ${vlamaxEffective?.toFixed(2)} ≤ range.max ${getVlamaxTargetCanonical(objectif, 'run').max.toFixed(2)} ` +
      `(${objectif}/run). Valeur physiologiquement acceptable, pas de ban.`
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

function buildAdaptationProjections(
  diagnostic: AthleteDiagnostic,
  weeksAvailable: number,
): AdaptationProjection[] {
  const raw = diagnostic._rawInput;
  // Audit P0 — B1 : on transmet sport_main, vlamax_run et les champs nécessaires
  // au resolver CAP. Sans cela, les coureurs/traileurs recevaient la VLamax vélo.
  const snapshot: Record<string, unknown> = {
    vo2max: raw.vo2max,
    vlamax: raw.vlamax,
    vlamax_run: raw.vlamaxRun,
    vma: raw.vma,
    pace_threshold_sec_per_km: raw.paceThresholdSecPerKm,
    sport_main: raw.sportFocus,
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
    sportMain: raw.sportFocus,
    weeksAvailable,
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
