/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PACING ENVELOPE™ — LONG DISTANCE EXTENSION (TFCL)
 * Two For Coaching Lab Method™
 * 
 * Extension du Pacing Envelope pour les épreuves longue distance (>90 min):
 * - Ironman, Ironman 70.3, Marathon, Ultra
 * 
 * NOUVEAUX CONCEPTS:
 * - LDRI (Long Distance Risk Index)
 * - Discipline Buffer (intensité recommandée vs max autorisée)
 * - Glycogen Collapse Threshold
 * - Duration-aware penalties
 * - Scenario Engine (3 stratégies)
 * 
 * PRINCIPE CLÉ:
 * "The athlete does not lose the race by being too conservative early,
 *  but by exceeding metabolic tolerance too soon."
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { PacingEnvelopeResult, RaceObjective, EnvelopeBoundary } from "./pacingEnvelopeEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LongDistanceInput {
  /** Enveloppe de base */
  baseEnvelope: PacingEnvelopeResult;
  
  /** Durée estimée de course (heures) */
  targetDurationHours: number;
  
  /** VLamax effectif */
  vlamaxValue: number | null;
  vlamaxConfidence: number;
  
  /** TTE confiance */
  tteConfidence: number;
  
  /** Âge de l'athlète */
  athleteAge: number | null;
  
  /** FatMax en % de référence (FTP/VMA) */
  fatmaxPct: number | null;
  
  /** Historique de fade en fin de course (optionnel) */
  historicalFadePattern: HistoricalFade | null;
  
  /** Disponibilité glycogène modélisée (g, optionnel) */
  glycogenAvailability: number | null;

  // ─── CHANTIER D — Contexte physiologique étendu ────────────────────────────
  /** Poids athlète (kg) — pour modèles glycogène & CHO */
  bodyMassKg?: number | null;
  /** Apport glucidique planifié pendant la course (g/h) */
  plannedCarbIntakeGph?: number | null;
  /** Niveau d'entraînement du gut (1=naïf, 2=moyen, 3=trained 90+ g/h) */
  gutTrainingLevel?: 1 | 2 | 3 | null;
  /** Température ambiante prévue (°C) */
  ambientTempC?: number | null;
  /** Humidité relative prévue (%) */
  humidityPct?: number | null;
  /** Niveau d'acclimatation chaleur (0=non, 1=partiel, 2=acclimaté 10-14j) */
  heatAcclimationLevel?: 0 | 1 | 2 | null;
  /** Sport (impact thermique différent run vs bike) */
  sport?: "run" | "bike" | "swim" | null;
}

export interface HistoricalFade {
  /** % de perte de puissance/allure dans le dernier tiers */
  fadePercentage: number;
  /** Nombre de courses analysées */
  racesAnalyzed: number;
  /** Pattern typique */
  pattern: "early_collapse" | "progressive_decay" | "stable" | "negative_split";
}

export interface LongDistanceRiskIndex {
  /** Score LDRI (0-100, plus élevé = plus de risque) */
  score: number;
  /** Niveau de risque */
  level: "low" | "moderate" | "high" | "critical";
  /** Label */
  label: string;
  /** Composantes */
  components: {
    durationRisk: number;
    vlamaxRisk: number;
    ageRisk: number;
    tteConfidenceRisk: number;
    historicalRisk: number;
  };
  /** Message */
  message: string;
}

export interface DisciplineBuffer {
  /** Intensité cible recommandée (% de ref) */
  disciplineTargetPct: number;
  /** Marge sous le max autorisé */
  bufferMarginPct: number;
  /** Label */
  label: string;
  /** Message */
  message: string;
}

export interface GlycogenCollapseThreshold {
  /** Intensité au-dessus de laquelle le glycogène s'épuise trop vite (% de ref) */
  thresholdPct: number;
  /** Temps max à cette intensité avant drift irréversible (min) */
  maxDurationMinutes: number;
  /** Message de warning */
  warningMessage: string;
  /** Explication */
  explanation: string;
}

// ─── CHANTIER D — Modèles physiologiques étendus ─────────────────────────────

export interface GlycogenBudgetModel {
  /** Réserve initiale estimée (g) — Rapoport 2010, ajustée masse */
  initialStoresG: number;
  /** Coût glucidique projeté à l'intensité ambitieuse (g/h) */
  projectedBurnRateGph: number;
  /** Apport glucidique exogène effectivement absorbable (g/h) */
  effectiveCarbIntakeGph: number;
  /** Taux net de déplétion (g/h) — burn − intake */
  netDepletionGph: number;
  /** Temps avant atteinte de la zone critique <20% (min) */
  timeToCriticalMinutes: number | null;
  /** Risque de "bonking" 0-100 */
  bonkRisk: number;
  /** Statut */
  status: "safe" | "tight" | "deficit" | "critical";
  /** Message synthétique */
  message: string;
}

export interface CarbStrategyModel {
  /** g/h recommandés selon durée + ambition */
  recommendedGph: number;
  /** g/h max physiologiquement absorbables (gut training) */
  maxAbsorbableGph: number;
  /** Ratio glucose:fructose recommandé */
  glucoseFructoseRatio: string;
  /** Écart entre planifié et recommandé (g/h, négatif = sous-doser) */
  plannedVsRecommendedGap: number;
  /** Niveau de risque GI */
  giRiskLevel: "low" | "moderate" | "high";
  /** Message */
  message: string;
}

export interface ThermalStressModel {
  /** WBGT estimé (°C) */
  wbgtC: number;
  /** Niveau de stress thermique */
  stressLevel: "neutral" | "moderate" | "high" | "extreme";
  /** Pénalité de puissance/allure recommandée (%) */
  intensityPenaltyPct: number;
  /** Augmentation des besoins fluides (mL/h supplémentaires) */
  extraFluidNeedMlPerHour: number;
  /** Message */
  message: string;
}

export type PacingScenarioType = "disciplined" | "ambitious" | "aggressive";

export interface PacingScenario {
  type: PacingScenarioType;
  label: string;
  description: string;
  
  /** Intensité moyenne % ref */
  avgIntensityPct: number;
  
  /** Modification de la courbe de déplétion glycogène */
  glycogenDepletionMultiplier: number;
  
  /** Décroissance puissance/allure en fin de course (%) */
  lateRaceDecayPct: number;
  
  /** Sensation attendue */
  earlyFeeling: string;
  lateFeeling: string;
  
  /** Conséquence */
  outcome: string;
  
  /** Couleur */
  color: "green" | "orange" | "red";
}

export interface LongDistanceEnvelopeResult {
  /** Enveloppe de base */
  baseEnvelope: PacingEnvelopeResult;
  
  /** Limites ajustées pour longue distance */
  adjustedBoundary: EnvelopeBoundary;
  
  /** LDRI */
  ldri: LongDistanceRiskIndex;
  
  /** Discipline Buffer */
  disciplineBuffer: DisciplineBuffer;
  
  /** Glycogen Collapse Threshold */
  glycogenThreshold: GlycogenCollapseThreshold;
  
  /** Scénarios */
  scenarios: PacingScenario[];
  
  /** CHANTIER D — Modèles physiologiques étendus */
  glycogenBudget: GlycogenBudgetModel | null;
  carbStrategy: CarbStrategyModel | null;
  thermalStress: ThermalStressModel | null;
  
  /** Pénalités appliquées */
  penalties: {
    durationPenaltyPct: number;
    glycogenPenaltyPct: number;
    /** CHANTIER D — pénalité thermique additionnelle */
    thermalPenaltyPct: number;
    /** CHANTIER D — pénalité déficit CHO additionnelle */
    carbDeficitPenaltyPct: number;
    totalReductionPct: number;
  };
  
  /** Messages clés */
  keyMessages: {
    staffReportMessage: string;
    athleteMessage: string;
    coachWarning: string;
  };
  
  /** Métadonnées */
  isLongDistance: boolean;
  targetDurationHours: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

/** Durée min (heures) pour activer le module Long Distance */
export const LONG_DISTANCE_THRESHOLD_HOURS = 1.5;

/** Durée où les pénalités augmentent fortement */
export const CRITICAL_DURATION_HOURS = 4;

/** FatMax + max% pour événements > 4h */
export const FATMAX_MAX_OFFSET_LONG = 12;

/** Buffer discipline par défaut (% sous le max) */
const DISCIPLINE_BUFFER_DEFAULT = 4;

export const LONG_DISTANCE_PHILOSOPHY = {
  core: `"Les athlètes ne perdent pas leur course en étant trop conservateurs au départ,
mais en dépassant leur tolérance métabolique trop tôt."`,

  discipline: `La discipline est invisible. L'effondrement est spectaculaire.`,

  banking: `INTERDICTION de "banker du temps" — 
Chaque minute gagnée précocement coûte 3-5 minutes en fin de course.`,

  elitePattern: `Les champions ultra-endurance commencent SOUS leur potentiel apparent.
L'objectif n'est pas de se sentir fort au départ. L'objectif est d'ÊTRE ENCORE FORT à l'arrivée.`,

  staffMessage: `Pour cet athlète, aller plus fort tôt RÉDUIRA la performance finale.
Le succès longue distance se décide AVANT la mi-course.`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// LDRI — LONG DISTANCE RISK INDEX
// ═══════════════════════════════════════════════════════════════════════════════

function computeLDRI(input: LongDistanceInput): LongDistanceRiskIndex {
  const { targetDurationHours, vlamaxValue, vlamaxConfidence, tteConfidence, athleteAge, historicalFadePattern } = input;

  // 1. Risque durée (non-linéaire après 2h)
  let durationRisk = 0;
  if (targetDurationHours <= 1.5) {
    durationRisk = 10;
  } else if (targetDurationHours <= 3) {
    durationRisk = 20 + (targetDurationHours - 1.5) * 15;
  } else if (targetDurationHours <= 5) {
    durationRisk = 42.5 + (targetDurationHours - 3) * 20;
  } else {
    durationRisk = 82.5 + (targetDurationHours - 5) * 10;
  }
  durationRisk = Math.min(100, durationRisk);

  // 2. Risque VLamax (basse = plus sensible = plus risqué pour erreurs)
  let vlamaxRisk = 50; // default si pas de données
  if (vlamaxValue != null) {
    if (vlamaxValue < 0.30) {
      vlamaxRisk = 90; // Très sensible
    } else if (vlamaxValue < 0.40) {
      vlamaxRisk = 70;
    } else if (vlamaxValue < 0.50) {
      vlamaxRisk = 50;
    } else {
      vlamaxRisk = 30; // Plus tolérant
    }
    // Ajuster par confiance
    vlamaxRisk = vlamaxRisk * (0.5 + 0.5 * vlamaxConfidence);
  }

  // 3. Risque âge (>40 augmente la sensibilité)
  let ageRisk = 40;
  if (athleteAge != null) {
    if (athleteAge < 35) {
      ageRisk = 20;
    } else if (athleteAge < 45) {
      ageRisk = 40;
    } else if (athleteAge < 55) {
      ageRisk = 60;
    } else {
      ageRisk = 80;
    }
  }

  // 4. Risque confiance TTE
  const tteConfidenceRisk = Math.round((1 - tteConfidence) * 60);

  // 5. Risque historique
  let historicalRisk = 30;
  if (historicalFadePattern) {
    switch (historicalFadePattern.pattern) {
      case "early_collapse":
        historicalRisk = 90;
        break;
      case "progressive_decay":
        historicalRisk = 60;
        break;
      case "stable":
        historicalRisk = 30;
        break;
      case "negative_split":
        historicalRisk = 10;
        break;
    }
    // Plus de courses analysées = plus fiable
    historicalRisk = historicalRisk * Math.min(1, 0.5 + historicalFadePattern.racesAnalyzed * 0.1);
  }

  // Score composite (pondéré)
  const score = Math.round(
    durationRisk * 0.35 +
    vlamaxRisk * 0.30 +
    ageRisk * 0.15 +
    tteConfidenceRisk * 0.10 +
    historicalRisk * 0.10
  );

  let level: LongDistanceRiskIndex["level"];
  let label: string;
  let message: string;

  if (score < 30) {
    level = "low";
    label = "Risque faible";
    message = "Profil robuste pour longue distance. Discipline standard recommandée.";
  } else if (score < 55) {
    level = "moderate";
    label = "Risque modéré";
    message = "Attention requise. Le pacing doit rester dans l'enveloppe safe.";
  } else if (score < 75) {
    level = "high";
    label = "Risque élevé";
    message = "Profil sensible ou durée extrême. Discipline absolue requise.";
  } else {
    level = "critical";
    label = "Risque critique";
    message = "Toute erreur de pacing précoce aura des conséquences irréversibles.";
  }

  return {
    score,
    level,
    label,
    components: {
      durationRisk: Math.round(durationRisk),
      vlamaxRisk: Math.round(vlamaxRisk),
      ageRisk: Math.round(ageRisk),
      tteConfidenceRisk,
      historicalRisk: Math.round(historicalRisk),
    },
    message,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISCIPLINE BUFFER
// ═══════════════════════════════════════════════════════════════════════════════

function computeDisciplineBuffer(
  adjustedHighPct: number,
  ldri: LongDistanceRiskIndex,
  targetDurationHours: number
): DisciplineBuffer {
  // Buffer augmente avec le risque
  let bufferMargin = DISCIPLINE_BUFFER_DEFAULT;
  
  if (ldri.level === "high") {
    bufferMargin = 5;
  } else if (ldri.level === "critical") {
    bufferMargin = 6;
  }
  
  // Durée > 5h = buffer supplémentaire
  if (targetDurationHours > 5) {
    bufferMargin += 2;
  }

  const disciplineTargetPct = Math.round(adjustedHighPct - bufferMargin);

  let message: string;
  if (bufferMargin >= 6) {
    message = "Cible prudente obligatoire — marge critique requise pour cette durée/profil.";
  } else if (bufferMargin >= 5) {
    message = "Cible recommandée — conserver une marge de sécurité significative.";
  } else {
    message = "Cible optimale — rester sous le plafond permet de finir fort.";
  }

  return {
    disciplineTargetPct,
    bufferMarginPct: bufferMargin,
    label: `Discipline Target: ${disciplineTargetPct}%`,
    message,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLYCOGEN COLLAPSE THRESHOLD
// ═══════════════════════════════════════════════════════════════════════════════

function computeGlycogenThreshold(
  fatmaxPct: number | null,
  vlamaxValue: number | null,
  targetDurationHours: number
): GlycogenCollapseThreshold {
  // Seuil où l'oxydation glucidique domine
  // = Au-dessus de FatMax + marge (dépend de VLamax)
  
  let thresholdOffset = 15; // par défaut: FatMax + 15%
  
  if (vlamaxValue != null) {
    if (vlamaxValue < 0.35) {
      thresholdOffset = 10; // Très sensible, seuil bas
    } else if (vlamaxValue < 0.45) {
      thresholdOffset = 12;
    } else if (vlamaxValue > 0.55) {
      thresholdOffset = 18; // Plus tolérant
    }
  }

  const baseFatmax = fatmaxPct ?? 65; // fallback si pas de FatMax
  const thresholdPct = Math.round(baseFatmax + thresholdOffset);

  // Temps max au-dessus de ce seuil avant drift irréversible
  let maxDuration = 45; // min
  if (targetDurationHours > 4) {
    maxDuration = 30;
  }
  if (targetDurationHours > 6) {
    maxDuration = 20;
  }

  return {
    thresholdPct,
    maxDurationMinutes: maxDuration,
    warningMessage: `Au-dessus de ${thresholdPct}% : perte de performance différée mais inévitable.`,
    explanation: `À cette intensité, l'oxydation glucidique domine. 
La déplétion glycogénique s'accélère et le drift métabolique devient irréversible après ${maxDuration} min cumulées.`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

function generateScenarios(
  disciplineTargetPct: number,
  adjustedHighPct: number,
  vlamaxValue: number | null
): PacingScenario[] {
  // 1. Disciplined Pacing
  const disciplined: PacingScenario = {
    type: "disciplined",
    label: "Pacing Discipliné",
    description: "Intensité sous la cible — sensation 'trop facile' au départ",
    avgIntensityPct: disciplineTargetPct - 2,
    glycogenDepletionMultiplier: 0.85,
    lateRaceDecayPct: 3,
    earlyFeeling: "Facile, presque ennuyeux. Tentation de pousser.",
    lateFeeling: "Encore de la réserve. Finish contrôlé ou négatif split possible.",
    outcome: "Performance optimale — dernier tiers stable ou en progression.",
    color: "green",
  };

  // 2. Ambitious Pacing
  const ambitious: PacingScenario = {
    type: "ambitious",
    label: "Pacing Ambitieux",
    description: "Au plafond de la zone safe — bon ressenti mais risque si conditions changent",
    avgIntensityPct: adjustedHighPct,
    glycogenDepletionMultiplier: 1.1,
    lateRaceDecayPct: 8,
    earlyFeeling: "Bien, rythmé, confiant.",
    lateFeeling: "Décroissance progressive. Dernier quart difficile.",
    outcome: "Performance correcte si conditions parfaites, dégradation si aléas.",
    color: "orange",
  };

  // 3. Aggressive Pacing
  const aggressiveDelta = vlamaxValue != null && vlamaxValue < 0.40 ? 4 : 6;
  const aggressive: PacingScenario = {
    type: "aggressive",
    label: "Pacing Agressif",
    description: "Au-dessus de la zone safe — sensation 'forte' mais dette métabolique",
    avgIntensityPct: adjustedHighPct + aggressiveDelta,
    glycogenDepletionMultiplier: 1.5,
    lateRaceDecayPct: 20,
    earlyFeeling: "Fort, puissant, 'dans le bon rythme' (faux signal).",
    lateFeeling: "Effondrement brutal. Marche forcée ou DNF.",
    outcome: "Performance dégradée — temps perdu > temps 'gagné' au départ.",
    color: "red",
  };

  return [disciplined, ambitious, aggressive];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════
// CHANTIER D — MODÈLE GLYCOGÈNE (Rapoport 2010, Hawley & Leckey 2015)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Estime la réserve glycogénique totale (foie + muscles).
 * Réf: Rapoport 2010 (J. Appl. Physiol.); ~15 g/kg muscle actif + 100 g foie.
 * Approximation pratique: ~6.5 g/kg masse totale chez athlète bien chargé.
 */
function estimateGlycogenStores(bodyMassKg: number, sport: string): number {
  // Endurance trained ~ 6 à 7 g/kg; cycliste/coureur supplémenté CHO 24h pré-course
  const perKg = sport === "swim" ? 5.5 : 6.5;
  return Math.round(bodyMassKg * perKg);
}

/**
 * Estime le coût glucidique horaire à une intensité donnée.
 * Basé sur Romijn 1993 / Achten & Jeukendrup 2004 :
 * - À 50% VO2max: ~50% lipides, ~50% CHO
 * - À 65% VO2max (~FatMax): ~40% CHO
 * - À 75% VO2max: ~70% CHO
 * - À 85% VO2max: ~90% CHO
 * Couplé à la dépense énergétique brute (kJ/h).
 */
function estimateCarbBurnRate(
  intensityPctRef: number,
  fatmaxPct: number,
  bodyMassKg: number,
  durationHours: number,
  sport: string
): number {
  // Fraction CHO: sigmoïde centrée sur FatMax
  const delta = intensityPctRef - fatmaxPct;
  const choFraction = Math.min(0.95, Math.max(0.30, 0.55 + delta * 0.025));
  
  // Dépense énergétique horaire approximée (kcal/h)
  // Cyclisme ~ 600 kcal/h à 65% FTP pour 70 kg; running ~ 700 kcal/h à allure marathon
  const baseKcalPerHour = sport === "run"
    ? bodyMassKg * 10 * (intensityPctRef / 75) // ~10 kcal/kg/h à allure marathon
    : sport === "bike"
      ? bodyMassKg * 8 * (intensityPctRef / 70)
      : bodyMassKg * 9 * (intensityPctRef / 70);
  
  const choKcalPerHour = baseKcalPerHour * choFraction;
  // 1 g glucides = 4 kcal
  const choGph = choKcalPerHour / 4;
  
  // Décroissance liée à la fatigue: l'oxydation lipidique baisse en fin de course
  // → coût CHO augmente d'environ 5-10% après 3h
  const fatigueMultiplier = 1 + Math.max(0, durationHours - 3) * 0.03;
  
  return Math.round(choGph * fatigueMultiplier);
}

function computeGlycogenBudget(
  input: LongDistanceInput,
  ambitiousIntensityPct: number,
  effectiveFatmax: number
): GlycogenBudgetModel | null {
  const bodyMassKg = input.bodyMassKg;
  if (bodyMassKg == null || bodyMassKg < 30) return null;
  
  const sport = input.sport ?? "bike";
  const initialStoresG = estimateGlycogenStores(bodyMassKg, sport);
  const projectedBurnRateGph = estimateCarbBurnRate(
    ambitiousIntensityPct,
    effectiveFatmax,
    bodyMassKg,
    input.targetDurationHours,
    sport
  );
  
  // Apport effectif: capé par gut training
  const planned = input.plannedCarbIntakeGph ?? 60;
  const gutLevel = input.gutTrainingLevel ?? 2;
  const maxAbsorbable = gutLevel === 3 ? 100 : gutLevel === 2 ? 75 : 60;
  const effectiveCarbIntakeGph = Math.min(planned, maxAbsorbable);
  
  const netDepletionGph = Math.max(0, projectedBurnRateGph - effectiveCarbIntakeGph);
  
  // Zone critique: <20% des réserves (Coyle 1986)
  const criticalReserveG = initialStoresG * 0.20;
  const usableG = initialStoresG - criticalReserveG;
  
  let timeToCriticalMinutes: number | null = null;
  if (netDepletionGph > 0) {
    timeToCriticalMinutes = Math.round((usableG / netDepletionGph) * 60);
  }
  
  // Bonk risk: temps critique vs durée prévue
  const targetMin = input.targetDurationHours * 60;
  let bonkRisk = 0;
  let status: GlycogenBudgetModel["status"];
  let message: string;
  
  if (timeToCriticalMinutes == null || timeToCriticalMinutes >= targetMin * 1.2) {
    bonkRisk = 10;
    status = "safe";
    message = `Budget glycogène confortable: ~${initialStoresG} g de réserves, déplétion nette ${netDepletionGph} g/h.`;
  } else if (timeToCriticalMinutes >= targetMin) {
    bonkRisk = 35;
    status = "tight";
    message = `Budget serré: épuisement projeté à ${Math.round(timeToCriticalMinutes / 60 * 10) / 10}h vs course de ${input.targetDurationHours}h.`;
  } else if (timeToCriticalMinutes >= targetMin * 0.75) {
    bonkRisk = 65;
    status = "deficit";
    message = `Déficit projeté: zone critique atteinte ~${Math.round((targetMin - timeToCriticalMinutes))} min avant l'arrivée. Augmenter CHO/h ou réduire intensité.`;
  } else {
    bonkRisk = 90;
    status = "critical";
    message = `Risque de bonk élevé: réserves épuisées à mi-course. Ajustement nutrition + pacing OBLIGATOIRE.`;
  }
  
  return {
    initialStoresG,
    projectedBurnRateGph,
    effectiveCarbIntakeGph,
    netDepletionGph,
    timeToCriticalMinutes,
    bonkRisk,
    status,
    message,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHANTIER D — STRATÉGIE GLUCIDIQUE (Jeukendrup 2014, King et al. 2022)
// ═══════════════════════════════════════════════════════════════════════════════

function computeCarbStrategy(input: LongDistanceInput): CarbStrategyModel | null {
  const { targetDurationHours } = input;
  
  // Recommandations Jeukendrup 2014 + mises à jour King 2022 (jusqu'à 120 g/h ultra-élites)
  let recommendedGph: number;
  let glucoseFructoseRatio: string;
  
  if (targetDurationHours < 1.5) {
    recommendedGph = 30;
    glucoseFructoseRatio = "1:0";
  } else if (targetDurationHours < 2.5) {
    recommendedGph = 60;
    glucoseFructoseRatio = "2:1";
  } else if (targetDurationHours < 4) {
    recommendedGph = 80;
    glucoseFructoseRatio = "1:0.8";
  } else if (targetDurationHours < 6) {
    recommendedGph = 90;
    glucoseFructoseRatio = "1:0.8";
  } else {
    recommendedGph = 100;
    glucoseFructoseRatio = "1:0.8";
  }
  
  const gutLevel = input.gutTrainingLevel ?? 2;
  const maxAbsorbableGph = gutLevel === 3 ? 120 : gutLevel === 2 ? 90 : 60;
  const cappedRecommendation = Math.min(recommendedGph, maxAbsorbableGph);
  
  const planned = input.plannedCarbIntakeGph ?? cappedRecommendation;
  const plannedVsRecommendedGap = planned - cappedRecommendation;
  
  // Risque GI: planifier > absorbable
  let giRiskLevel: CarbStrategyModel["giRiskLevel"] = "low";
  let message: string;
  
  if (planned > maxAbsorbableGph + 10) {
    giRiskLevel = "high";
    message = `${planned} g/h dépasse la capacité d'absorption (~${maxAbsorbableGph} g/h). Risque GI élevé — entraîner le gut ou réduire.`;
  } else if (plannedVsRecommendedGap < -20) {
    giRiskLevel = "low";
    message = `Sous-doser de ${Math.abs(plannedVsRecommendedGap)} g/h. Recommandé: ${cappedRecommendation} g/h en ratio ${glucoseFructoseRatio}.`;
  } else if (planned > 75 && gutLevel < 2) {
    giRiskLevel = "moderate";
    message = `Gut peu entraîné: ${planned} g/h risqué. Tester en simulation longue avant la course.`;
  } else {
    message = `Stratégie cohérente: ${planned} g/h en ratio ${glucoseFructoseRatio} (cible ${cappedRecommendation} g/h).`;
  }
  
  return {
    recommendedGph: cappedRecommendation,
    maxAbsorbableGph,
    glucoseFructoseRatio,
    plannedVsRecommendedGap,
    giRiskLevel,
    message,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHANTIER D — STRESS THERMIQUE (Périard 2021, Racinais 2015)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Estimation simplifiée WBGT à partir T° + humidité.
 * Approximation pour conditions ensoleillées: WBGT ≈ 0.7*Twb + 0.3*Tdb
 * Ici on utilise une formule pratique (Stull 2011) pour Twb.
 */
function estimateWBGT(tempC: number, humidityPct: number): number {
  const rh = Math.max(5, Math.min(100, humidityPct));
  // Stull 2011 — bulbe humide
  const twb = tempC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659))
    + Math.atan(tempC + rh)
    - Math.atan(rh - 1.676331)
    + 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh)
    - 4.686035;
  // WBGT outdoor ~ 0.7 Twb + 0.2 Tg + 0.1 Tdb. Sans globe, approx: 0.7 Twb + 0.3 Tdb
  return Math.round((0.7 * twb + 0.3 * tempC) * 10) / 10;
}

function computeThermalStress(input: LongDistanceInput): ThermalStressModel | null {
  if (input.ambientTempC == null) return null;
  
  const tempC = input.ambientTempC;
  const humidity = input.humidityPct ?? 50;
  const wbgtC = estimateWBGT(tempC, humidity);
  const acclim = input.heatAcclimationLevel ?? 0;
  const sport = input.sport ?? "bike";
  
  // Périard 2021: catégories WBGT pour endurance
  // <18: neutre | 18-23: modéré | 23-28: élevé | >28: extrême
  let stressLevel: ThermalStressModel["stressLevel"];
  let basePenalty: number;
  
  if (wbgtC < 18) {
    stressLevel = "neutral";
    basePenalty = 0;
  } else if (wbgtC < 23) {
    stressLevel = "moderate";
    basePenalty = 2;
  } else if (wbgtC < 28) {
    stressLevel = "high";
    basePenalty = 5;
  } else {
    stressLevel = "extreme";
    basePenalty = 9;
  }
  
  // Running pénalisé +30% (pas de refroidissement convectif comme vélo)
  if (sport === "run" && basePenalty > 0) {
    basePenalty = Math.round(basePenalty * 1.3);
  }
  
  // Acclimatation: réduit la pénalité de 30 à 60%
  const acclimMultiplier = acclim === 2 ? 0.4 : acclim === 1 ? 0.7 : 1.0;
  const intensityPenaltyPct = Math.round(basePenalty * acclimMultiplier);
  
  // Besoins fluides additionnels (Sawka 2007: +200 mL/h par 5°C au-dessus de 20°C)
  const extraFluidNeedMlPerHour = wbgtC > 20
    ? Math.round((wbgtC - 20) * 50)
    : 0;
  
  let message: string;
  if (stressLevel === "neutral") {
    message = `WBGT ${wbgtC}°C — conditions neutres, pas d'ajustement thermique requis.`;
  } else if (stressLevel === "extreme") {
    message = `WBGT ${wbgtC}°C — stress extrême. Pénalité ${intensityPenaltyPct}% sur intensité, +${extraFluidNeedMlPerHour} mL/h de fluides.`;
  } else {
    message = `WBGT ${wbgtC}°C — ${stressLevel}. Réduire l'intensité de ${intensityPenaltyPct}%, hydratation +${extraFluidNeedMlPerHour} mL/h.`;
  }
  
  return {
    wbgtC,
    stressLevel,
    intensityPenaltyPct,
    extraFluidNeedMlPerHour,
    message,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export function computeLongDistanceEnvelope(input: LongDistanceInput): LongDistanceEnvelopeResult | null {
  const { baseEnvelope, targetDurationHours, fatmaxPct, vlamaxValue } = input;

  if (targetDurationHours < LONG_DISTANCE_THRESHOLD_HOURS) {
    return null;
  }

  // STEP 1: LDRI
  const ldri = computeLDRI(input);

  // STEP 2: Pénalités duration-aware
  let durationPenaltyPct = 0;
  if (targetDurationHours > 2) {
    durationPenaltyPct = Math.round(Math.pow(targetDurationHours - 2, 1.3) * 1.5);
    durationPenaltyPct = Math.min(12, durationPenaltyPct);
  }

  // STEP 3: Pénalité glycogène (heuristique)
  let glycogenPenaltyPct = 0;
  const effectiveFatmax = fatmaxPct ?? 65;
  if (baseEnvelope.boundary.highPct > effectiveFatmax + 15) {
    glycogenPenaltyPct = Math.round((baseEnvelope.boundary.highPct - effectiveFatmax - 15) * 0.5);
    glycogenPenaltyPct = Math.min(8, glycogenPenaltyPct);
  }

  // ─── CHANTIER D — STEP 3b: Modèles physiologiques étendus ──────────────────
  const carbStrategy = computeCarbStrategy(input);
  const glycogenBudget = computeGlycogenBudget(input, baseEnvelope.boundary.highPct, effectiveFatmax);
  const thermalStress = computeThermalStress(input);

  // ─── CHANTIER D — STEP 3c: Pénalités physiologiques additionnelles ─────────
  let thermalPenaltyPct = thermalStress?.intensityPenaltyPct ?? 0;
  
  let carbDeficitPenaltyPct = 0;
  if (glycogenBudget) {
    if (glycogenBudget.status === "critical") carbDeficitPenaltyPct = 6;
    else if (glycogenBudget.status === "deficit") carbDeficitPenaltyPct = 4;
    else if (glycogenBudget.status === "tight") carbDeficitPenaltyPct = 2;
  }

  // STEP 4: Limites ajustées
  const totalReductionPct = durationPenaltyPct + glycogenPenaltyPct + thermalPenaltyPct + carbDeficitPenaltyPct;

  let maxAllowedHigh = baseEnvelope.boundary.highPct - totalReductionPct;
  if (targetDurationHours >= CRITICAL_DURATION_HOURS) {
    const fatmaxCeiling = effectiveFatmax + FATMAX_MAX_OFFSET_LONG;
    maxAllowedHigh = Math.min(maxAllowedHigh, fatmaxCeiling);
  }

  const adjustedHighPct = Math.max(
    baseEnvelope.boundary.lowPct + 3,
    Math.round(maxAllowedHigh)
  );

  const adjustedBoundary: EnvelopeBoundary = {
    ...baseEnvelope.boundary,
    highPct: adjustedHighPct,
    toleratedPct: Math.round(adjustedHighPct + 8),
    forbiddenPct: Math.round(adjustedHighPct + 8),
  };

  // STEP 5-7: Discipline / Glycogen Threshold / Scenarios
  const disciplineBuffer = computeDisciplineBuffer(adjustedHighPct, ldri, targetDurationHours);
  const glycogenThreshold = computeGlycogenThreshold(fatmaxPct, vlamaxValue, targetDurationHours);
  const scenarios = generateScenarios(disciplineBuffer.disciplineTargetPct, adjustedHighPct, vlamaxValue);

  // STEP 8: Messages clés (enrichis CHANTIER D)
  const physioWarnings: string[] = [];
  if (thermalStress && thermalStress.stressLevel !== "neutral") {
    physioWarnings.push(`🌡️ ${thermalStress.message}`);
  }
  if (glycogenBudget && (glycogenBudget.status === "deficit" || glycogenBudget.status === "critical")) {
    physioWarnings.push(`⚠️ ${glycogenBudget.message}`);
  }
  if (carbStrategy && carbStrategy.giRiskLevel === "high") {
    physioWarnings.push(`🍯 ${carbStrategy.message}`);
  }

  const keyMessages = {
    staffReportMessage: `Pour cet athlète, aller plus fort tôt RÉDUIRA la performance finale.
Le succès longue distance se décide AVANT la mi-course.
Une intensité exprimée sans référence n'a aucune valeur physiologique.${physioWarnings.length ? "\n\n" + physioWarnings.join("\n") : ""}`,

    athleteMessage: `Cible recommandée: ${disciplineBuffer.disciplineTargetPct}% de ${baseEnvelope.boundary.referenceShortLabel}.
Rester 'ennuyeux' au départ = finir fort.${carbStrategy ? `\nNutrition: ${carbStrategy.recommendedGph} g/h CHO.` : ""}`,

    coachWarning: ldri.level === "critical" || ldri.level === "high"
      ? `⚠️ LDRI ${ldri.score}/100 — Ce profil ne tolère aucune erreur précoce.`
      : `LDRI ${ldri.score}/100 — ${ldri.label}`,
  };

  return {
    baseEnvelope,
    adjustedBoundary,
    ldri,
    disciplineBuffer,
    glycogenThreshold,
    scenarios,
    glycogenBudget,
    carbStrategy,
    thermalStress,
    penalties: {
      durationPenaltyPct,
      glycogenPenaltyPct,
      thermalPenaltyPct,
      carbDeficitPenaltyPct,
      totalReductionPct,
    },
    keyMessages,
    isLongDistance: true,
    targetDurationHours,
  };
}


// ═══════════════════════════════════════════════════════════════════════════════
// ACADEMY CONTENT EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const LONG_DISTANCE_ACADEMY_CONTENT = {
  title: "Why Long-Distance Races Punish the Brave",
  subtitle: "La discipline bat l'ambition — Philosophie TFCL longue distance",
  
  concepts: [
    {
      title: "Inertie Métabolique",
      content: `L'activation glycolytique précoce NE PEUT PAS être inversée.
Le lactate accumulé dans les 30-60 premières minutes persiste et s'accumule.
Se sentir "bien" au départ ≠ un bon pacing. Le métabolisme n'est pas la sensation.`,
    },
    {
      title: "Irréversibilité de la Dette Glycogène",
      content: `Chaque gramme de glycogène consommé précocement en sur-régime = indisponible pour la fin.
À 70% de déplétion, la capacité à maintenir l'intensité chute brutalement.
L'effondrement arrive 2-3h APRÈS l'erreur, pas immédiatement.`,
    },
    {
      title: "Pourquoi les Élites Semblent 'Lents' au Départ",
      content: `Jan Frodeno (Ironman): ses 10 premiers km vélo semblent "faciles" en TV.
Eliud Kipchoge (Marathon): son premier semi semble "contrôlé".
Ils savent que la discipline précoce = vitesse tardive.`,
    },
  ],
  
  comparison: {
    title: "Pacing Vélo Ironman: Elite vs Age-Group",
    data: [
      { segment: "0-30 km", elite: "68-70% FTP", ageGroup: "78-82% FTP" },
      { segment: "90-120 km", elite: "71-73% FTP", ageGroup: "70-72% FTP" },
      { segment: "150-180 km", elite: "72-75% FTP", ageGroup: "62-66% FTP" },
      { segment: "Marathon", elite: "Course stable", ageGroup: "Marche/Arrêts" },
    ],
  },
  
  closingQuote: `"Discipline is invisible. Collapse is spectacular."
— L'objectif n'est pas de se sentir fort au départ. L'objectif est d'être ENCORE fort à l'arrivée.`,
};
