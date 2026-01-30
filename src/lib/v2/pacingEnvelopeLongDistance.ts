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
  
  /** Pénalités appliquées */
  penalties: {
    durationPenaltyPct: number;
    glycogenPenaltyPct: number;
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

export function computeLongDistanceEnvelope(input: LongDistanceInput): LongDistanceEnvelopeResult | null {
  const { baseEnvelope, targetDurationHours, fatmaxPct, vlamaxValue } = input;

  if (targetDurationHours < LONG_DISTANCE_THRESHOLD_HOURS) {
    // Pas une épreuve longue distance
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Calculer LDRI
  // ─────────────────────────────────────────────────────────────────────────────
  const ldri = computeLDRI(input);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Pénalités duration-aware
  // ─────────────────────────────────────────────────────────────────────────────
  let durationPenaltyPct = 0;
  if (targetDurationHours > 2) {
    // Pénalité non-linéaire après 2h
    durationPenaltyPct = Math.round(Math.pow(targetDurationHours - 2, 1.3) * 1.5);
    durationPenaltyPct = Math.min(12, durationPenaltyPct); // cap à 12%
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Pénalité glycogène
  // ─────────────────────────────────────────────────────────────────────────────
  let glycogenPenaltyPct = 0;
  const effectiveFatmax = fatmaxPct ?? 65;
  
  // Si le haut de l'enveloppe de base est significativement au-dessus de FatMax
  if (baseEnvelope.boundary.highPct > effectiveFatmax + 15) {
    glycogenPenaltyPct = Math.round((baseEnvelope.boundary.highPct - effectiveFatmax - 15) * 0.5);
    glycogenPenaltyPct = Math.min(8, glycogenPenaltyPct);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Calcul des limites ajustées
  // ─────────────────────────────────────────────────────────────────────────────
  const totalReductionPct = durationPenaltyPct + glycogenPenaltyPct;
  
  // RÈGLE DURE: Pour > 4h, ne jamais dépasser FatMax + 10-15%
  let maxAllowedHigh = baseEnvelope.boundary.highPct - totalReductionPct;
  if (targetDurationHours >= CRITICAL_DURATION_HOURS) {
    const fatmaxCeiling = effectiveFatmax + FATMAX_MAX_OFFSET_LONG;
    maxAllowedHigh = Math.min(maxAllowedHigh, fatmaxCeiling);
  }

  const adjustedHighPct = Math.max(
    baseEnvelope.boundary.lowPct + 3, // minimum 3% de largeur
    Math.round(maxAllowedHigh)
  );

  const adjustedBoundary: EnvelopeBoundary = {
    ...baseEnvelope.boundary,
    highPct: adjustedHighPct,
    toleratedPct: Math.round(adjustedHighPct + 8),
    forbiddenPct: Math.round(adjustedHighPct + 8),
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Discipline Buffer
  // ─────────────────────────────────────────────────────────────────────────────
  const disciplineBuffer = computeDisciplineBuffer(adjustedHighPct, ldri, targetDurationHours);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 6: Glycogen Collapse Threshold
  // ─────────────────────────────────────────────────────────────────────────────
  const glycogenThreshold = computeGlycogenThreshold(fatmaxPct, vlamaxValue, targetDurationHours);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 7: Scénarios
  // ─────────────────────────────────────────────────────────────────────────────
  const scenarios = generateScenarios(disciplineBuffer.disciplineTargetPct, adjustedHighPct, vlamaxValue);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 8: Messages clés
  // ─────────────────────────────────────────────────────────────────────────────
  const keyMessages = {
    staffReportMessage: `Pour cet athlète, aller plus fort tôt RÉDUIRA la performance finale.
Le succès longue distance se décide AVANT la mi-course.
Une intensité exprimée sans référence n'a aucune valeur physiologique.`,
    
    athleteMessage: `Cible recommandée: ${disciplineBuffer.disciplineTargetPct}% de ${baseEnvelope.boundary.referenceShortLabel}.
Rester 'ennuyeux' au départ = finir fort.`,
    
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
    penalties: {
      durationPenaltyPct,
      glycogenPenaltyPct,
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
