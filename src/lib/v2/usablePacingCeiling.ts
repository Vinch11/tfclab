/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * USABLE PACING CEILING™ — TFCL Core Decision Engine
 * Two For Coaching Lab Method™
 * 
 * FOUNDATIONAL PRINCIPLE:
 * Performance on race day = Potential × Availability × Discipline
 * 
 * Where:
 * - Potential = physiological ceiling (VO2max, VLamax, Economy, TTE)
 * - Availability = freshness, recovery, stress state (Potentiel Physiologique)
 * - Discipline = respect of the Pacing Envelope™
 * 
 * TFCL never evaluates one without the others.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { PotentielV2Result } from "./potentielTypes";
import type { PacingEnvelopeResult } from "./pacingEnvelopeEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type PacingDecisionStatus = 'CRITICAL' | 'RESTRICTED' | 'NORMAL' | 'OPTIMAL';
export type ConsequenceType = 'stability' | 'warning' | 'collapse';

export interface UsablePacingCeilingInput {
  envelope: PacingEnvelopeResult;
  potentielPhysiologique: PotentielV2Result;
  targetRaceDurationMin?: number | null;
}

export interface UsablePacingCeiling {
  // Core values
  absoluteCeilingPct: number;      // Envelope upper bound (potential)
  usableCeilingPct: number;        // Adjusted by readiness
  potentielMultiplier: number;     // 0.0 - 1.0
  
  // Usable intensity range
  targetIntensityPct: number;      // Recommended target (center)
  targetRangePct: [number, number]; // [min, max] safe range today
  
  // Decision status
  status: PacingDecisionStatus;
  statusLabel: string;
  statusEmoji: string;
  
  // Messages
  primaryMessage: string;
  warningMessage: string | null;
  disciplineMessage: string;
  
  // Explanations
  explanation: {
    why: string;
    consequence: string;
    coachAdvice: string;
  };
  
  // Metadata
  sources: string[];
  timestamp: string;
}

export interface ConsequenceSimulationResult {
  scenario: 'disciplined' | 'envelope_edge' | 'envelope_violation';
  scenarioLabel: string;
  
  // Intensity profile
  intensityPct: number;
  intensityRelativeToUsable: 'below' | 'at' | 'above';
  
  // Temporal markers
  metabolicControlLossTime: number | null;   // minutes (null = never)
  recoveryPossible: boolean;
  glycogenCollapseTime: number | null;       // minutes (null = never)
  driftOnsetTime: number | null;             // minutes (null = never)
  
  // Consequence descriptors
  consequences: ConsequenceDescriptor[];
  
  // Risk level
  riskLevel: number;  // 0-100
  riskLabel: string;
  
  // TFCL sentence templates
  sentences: string[];
}

export interface ConsequenceDescriptor {
  type: ConsequenceType;
  icon: string;
  title: string;
  description: string;
  timeWindow?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<PacingDecisionStatus, {
  label: string;
  emoji: string;
  potentielThreshold: number;
}> = {
  CRITICAL: {
    label: 'Critique',
    emoji: '🔴',
    potentielThreshold: 50,
  },
  RESTRICTED: {
    label: 'Restreint',
    emoji: '🟠',
    potentielThreshold: 65,
  },
  NORMAL: {
    label: 'Normal',
    emoji: '🟢',
    potentielThreshold: 80,
  },
  OPTIMAL: {
    label: 'Optimal',
    emoji: '🔵',
    potentielThreshold: 100,
  },
};

export const USABLE_PACING_DEFINITIONS = {
  principle: `Performance on race day = Potential × Availability × Discipline
  
TFCL never evaluates one without the others.`,

  usableCeiling: `The Usable Pacing Ceiling is the MAX intensity allowed today,
even if the athlete is fitter on paper.

It is calculated as:
USABLE_PACING_CEILING = Pacing Envelope™ upper bound × Potentiel Physiologique %`,

  disciplineBuffer: `Elite athletes don't race at the edge.
They race BELOW it.

The Discipline Buffer is the gap between what's possible and what's smart.`,

  disclaimer: `TFCL never promotes risk for ego or rankings.
Simulation is educational, not predictive.
Potentiel Physiologique always gates Pacing.`,

  methodology: `
1. Potential (Pacing Envelope upper bound) defines the physiological maximum
2. Availability (Potentiel Physiologique %) reduces this to today's usable ceiling
3. Discipline (target below usable) ensures execution margin
4. Consequences simulate what happens at each intensity level`,
};

export const CONSEQUENCE_SENTENCES = {
  // Stability sentences
  stability: [
    "Your body can defend this intensity today.",
    "Metabolic control maintained throughout.",
    "Recovery reserves available for the final third.",
  ],
  
  // Warning sentences
  warning: [
    "This pacing exceeds what your body can defend today.",
    "Fatigue will appear before it can be managed.",
    "Early strength becomes late weakness.",
    "You are borrowing energy you cannot repay.",
  ],
  
  // Collapse sentences
  collapse: [
    "Metabolic control will be lost.",
    "This intensity guarantees late-race collapse.",
    "The cost of early aggression is final.",
    "There is no recovery from this decision.",
  ],
  
  // Discipline sentences
  discipline: [
    "The decision prioritizes finish stability over early performance.",
    "Discipline adapts performance to reality.",
    "The best decision is the one your body can execute today.",
    "Elite pacing looks boring early. It looks brilliant late.",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getStatus(potentielScore: number): PacingDecisionStatus {
  if (potentielScore >= STATUS_CONFIG.OPTIMAL.potentielThreshold) return 'OPTIMAL';
  if (potentielScore >= STATUS_CONFIG.NORMAL.potentielThreshold) return 'NORMAL';
  if (potentielScore >= STATUS_CONFIG.RESTRICTED.potentielThreshold) return 'RESTRICTED';
  return 'CRITICAL';
}

function getRandomSentence(sentences: string[]): string {
  return sentences[Math.floor(Math.random() * sentences.length)];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION: Compute Usable Pacing Ceiling
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Computes the Usable Pacing Ceiling based on Pacing Envelope and Potentiel Physiologique
 * 
 * The Usable Ceiling is ALWAYS <= Envelope Upper Bound
 * Potentiel Physiologique acts as a gate that reduces available intensity
 */
export function computeUsablePacingCeiling(
  input: UsablePacingCeilingInput
): UsablePacingCeiling {
  const { envelope, potentielPhysiologique } = input;
  
  const sources: string[] = ['Pacing Envelope™', 'Potentiel Physiologique V2'];
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Extract base values
  // ─────────────────────────────────────────────────────────────────────────────
  const absoluteCeilingPct = envelope.boundary.highPct;
  const potentielScore = potentielPhysiologique.readiness.score;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Calculate readiness multiplier
  // ─────────────────────────────────────────────────────────────────────────────
  // Readiness score (0-100) maps to multiplier (0.5-1.0)
  // Score of 100 = 1.0 (full access)
  // Score of 50 = 0.75 (25% reduction)
  // Score of 0 = 0.5 (50% reduction - emergency only)
  const potentielMultiplier = clamp(0.5 + (potentielScore / 200), 0.5, 1.0);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Calculate usable ceiling
  // ─────────────────────────────────────────────────────────────────────────────
  // USABLE_PACING_CEILING = Envelope upper bound × Readiness %
  // But we apply it as a reduction from the ceiling, not a direct percentage
  const reductionPct = absoluteCeilingPct * (1 - potentielMultiplier);
  const usableCeilingPct = Math.round(absoluteCeilingPct - reductionPct);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Calculate target intensity range
  // ─────────────────────────────────────────────────────────────────────────────
  // Target is 3-5% BELOW usable ceiling (discipline buffer)
  const disciplineBuffer = potentielScore >= 80 ? 3 : potentielScore >= 65 ? 4 : 5;
  const targetIntensityPct = Math.round(usableCeilingPct - disciplineBuffer);
  
  // Range is narrower when readiness is lower
  const rangeWidth = potentielScore >= 80 ? 6 : potentielScore >= 65 ? 5 : 4;
  const targetRangePct: [number, number] = [
    Math.max(envelope.boundary.lowPct, targetIntensityPct - Math.floor(rangeWidth / 2)),
    Math.min(usableCeilingPct, targetIntensityPct + Math.floor(rangeWidth / 2)),
  ];
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Determine status
  // ─────────────────────────────────────────────────────────────────────────────
  const status = getStatus(potentielScore);
  const statusConfig = STATUS_CONFIG[status];
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 6: Generate messages
  // ─────────────────────────────────────────────────────────────────────────────
  let primaryMessage: string;
  let warningMessage: string | null = null;
  let disciplineMessage: string;
  
  if (status === 'CRITICAL') {
    primaryMessage = `Disponibilité insuffisante. Plafond réduit à ${usableCeilingPct}% de la référence.`;
    warningMessage = "Tout dépassement de l'enveloppe utilisable aujourd'hui engendrera une défaillance précoce.";
    disciplineMessage = "Aujourd'hui, la discipline n'est pas une option — c'est la seule stratégie viable.";
  } else if (status === 'RESTRICTED') {
    primaryMessage = `Disponibilité modérée. Plafond ajusté à ${usableCeilingPct}% (vs ${absoluteCeilingPct}% potentiel).`;
    warningMessage = "Le scénario agressif est fortement déconseillé.";
    disciplineMessage = "Rester dans la zone cible maximise les chances de finish solide.";
  } else if (status === 'NORMAL') {
    primaryMessage = `Disponibilité correcte. Plafond utilisable à ${usableCeilingPct}%.`;
    warningMessage = null;
    disciplineMessage = "La zone optimale est accessible. Le respect de l'enveloppe reste clé.";
  } else {
    primaryMessage = `Conditions optimales. Accès complet au potentiel (${usableCeilingPct}%).`;
    warningMessage = null;
    disciplineMessage = "Stratégies ambitieuses possibles avec gestion des risques explicite.";
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 7: Generate explanation
  // ─────────────────────────────────────────────────────────────────────────────
  const explanation = {
    why: `Potentiel Physiologique de ${potentielScore}/100 applique un multiplicateur de ${(potentielMultiplier * 100).toFixed(0)}% sur le plafond de l'enveloppe.`,
    consequence: status === 'CRITICAL' || status === 'RESTRICTED'
      ? "Dépasser ce plafond aujourd'hui coûtera plus qu'il ne rapportera."
      : "L'intensité cible est accessible avec marge de sécurité.",
    coachAdvice: status === 'CRITICAL'
      ? "Considérer un objectif secondaire ou un report."
      : status === 'RESTRICTED'
        ? "Préparer l'athlète à respecter la discipline malgré les sensations."
        : "L'athlète peut viser son objectif avec confiance.",
  };
  
  return {
    absoluteCeilingPct,
    usableCeilingPct,
    potentielMultiplier,
    targetIntensityPct,
    targetRangePct,
    status,
    statusLabel: statusConfig.label,
    statusEmoji: statusConfig.emoji,
    primaryMessage,
    warningMessage,
    disciplineMessage,
    explanation,
    sources,
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSEQUENCE SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simulates consequences for three pacing scenarios
 * 
 * This simulation does NOT estimate time.
 * It simulates CONSEQUENCES.
 */
export function simulateConsequences(
  usableCeiling: UsablePacingCeiling,
  targetRaceDurationMin: number
): ConsequenceSimulationResult[] {
  const scenarios: ConsequenceSimulationResult[] = [];
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: Disciplined pacing (below usable ceiling)
  // ─────────────────────────────────────────────────────────────────────────────
  const disciplinedIntensity = usableCeiling.targetIntensityPct;
  scenarios.push({
    scenario: 'disciplined',
    scenarioLabel: 'Pacing Discipliné',
    intensityPct: disciplinedIntensity,
    intensityRelativeToUsable: 'below',
    metabolicControlLossTime: null, // Never
    recoveryPossible: true,
    glycogenCollapseTime: null, // Never
    driftOnsetTime: targetRaceDurationMin * 0.85, // Very late, if at all
    consequences: [
      {
        type: 'stability',
        icon: '✅',
        title: 'Contrôle métabolique maintenu',
        description: 'Oxydation lipidique prioritaire. Réserves glycogène préservées.',
      },
      {
        type: 'stability',
        icon: '🔋',
        title: 'Réserves disponibles',
        description: 'Marge de manœuvre pour le dernier tiers si nécessaire.',
      },
    ],
    riskLevel: 15,
    riskLabel: 'Faible',
    sentences: [
      CONSEQUENCE_SENTENCES.stability[0],
      CONSEQUENCE_SENTENCES.discipline[0],
    ],
  });
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: Envelope-edge pacing
  // ─────────────────────────────────────────────────────────────────────────────
  const edgeIntensity = usableCeiling.usableCeilingPct;
  const edgeDriftOnset = targetRaceDurationMin * 0.6; // Drift starts at 60%
  scenarios.push({
    scenario: 'envelope_edge',
    scenarioLabel: 'Limite de l\'enveloppe',
    intensityPct: edgeIntensity,
    intensityRelativeToUsable: 'at',
    metabolicControlLossTime: targetRaceDurationMin * 0.75,
    recoveryPossible: true, // Possible but not guaranteed
    glycogenCollapseTime: null, // Unlikely if nutrition is correct
    driftOnsetTime: edgeDriftOnset,
    consequences: [
      {
        type: 'warning',
        icon: '⚠️',
        title: 'Dérive métabolique probable',
        description: `Début de dérive estimé autour de ${Math.round(edgeDriftOnset)} min.`,
        timeWindow: `${Math.round(edgeDriftOnset)}-${Math.round(targetRaceDurationMin * 0.7)} min`,
      },
      {
        type: 'warning',
        icon: '🔥',
        title: 'Consommation glycogène accélérée',
        description: 'Dépendance glucidique élevée. Nutrition critique.',
      },
    ],
    riskLevel: 50,
    riskLabel: 'Modéré',
    sentences: [
      CONSEQUENCE_SENTENCES.warning[1],
      "Le finish dépendra de la discipline nutritionnelle.",
    ],
  });
  
  // ─────────────────────────────────────────────────────────────────────────────
  // SCENARIO 3: Envelope violation
  // ─────────────────────────────────────────────────────────────────────────────
  const violationIntensity = usableCeiling.usableCeilingPct + 5;
  const collapseTime = targetRaceDurationMin * 0.5; // Collapse at 50%
  scenarios.push({
    scenario: 'envelope_violation',
    scenarioLabel: 'Dépassement de l\'enveloppe',
    intensityPct: violationIntensity,
    intensityRelativeToUsable: 'above',
    metabolicControlLossTime: targetRaceDurationMin * 0.35,
    recoveryPossible: false,
    glycogenCollapseTime: collapseTime,
    driftOnsetTime: targetRaceDurationMin * 0.25,
    consequences: [
      {
        type: 'collapse',
        icon: '🔴',
        title: 'Perte de contrôle métabolique',
        description: `Irréversible après ${Math.round(targetRaceDurationMin * 0.35)} min.`,
        timeWindow: `${Math.round(targetRaceDurationMin * 0.25)}-${Math.round(targetRaceDurationMin * 0.35)} min`,
      },
      {
        type: 'collapse',
        icon: '💀',
        title: 'Effondrement glycogène',
        description: `Rupture probable autour de ${Math.round(collapseTime)} min. Aucune récupération possible.`,
        timeWindow: `~${Math.round(collapseTime)} min`,
      },
    ],
    riskLevel: 90,
    riskLabel: 'Critique',
    sentences: [
      CONSEQUENCE_SENTENCES.collapse[0],
      CONSEQUENCE_SENTENCES.collapse[2],
      CONSEQUENCE_SENTENCES.warning[3],
    ],
  });
  
  return scenarios;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHART DATA GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface DecisionChartDataPoint {
  time: number;           // minutes
  timePct: number;        // % of total duration
  intensity: number;      // % of reference
  zone: 'safe' | 'risk' | 'forbidden';
  riskIndex: number;      // 0-100
  glycogenRemaining: number; // 0-100%
  driftActive: boolean;
  label: string;
}

/**
 * Generates chart data for the "Potential × Availability → Decision" graphic
 */
export function generateDecisionChartData(
  usableCeiling: UsablePacingCeiling,
  targetRaceDurationMin: number,
  scenario: ConsequenceSimulationResult
): DecisionChartDataPoint[] {
  const points: DecisionChartDataPoint[] = [];
  const steps = 10;
  
  for (let i = 0; i <= steps; i++) {
    const timePct = i / steps;
    const time = Math.round(targetRaceDurationMin * timePct);
    
    // Calculate intensity (stable for disciplined, degrading for violation)
    let intensity = scenario.intensityPct;
    if (scenario.scenario === 'envelope_violation' && timePct > 0.4) {
      // Forced reduction after collapse
      intensity = Math.max(50, intensity - (timePct - 0.4) * 30);
    } else if (scenario.scenario === 'envelope_edge' && timePct > 0.7) {
      // Slight reduction after drift
      intensity = Math.max(55, intensity - (timePct - 0.7) * 15);
    }
    
    // Determine zone
    let zone: 'safe' | 'risk' | 'forbidden';
    if (intensity <= usableCeiling.targetRangePct[1]) {
      zone = 'safe';
    } else if (intensity <= usableCeiling.usableCeilingPct + 5) {
      zone = 'risk';
    } else {
      zone = 'forbidden';
    }
    
    // Calculate risk index
    let riskIndex = 0;
    if (scenario.scenario === 'envelope_violation') {
      riskIndex = Math.min(100, 30 + timePct * 70);
    } else if (scenario.scenario === 'envelope_edge') {
      riskIndex = Math.min(70, 10 + timePct * 40);
    } else {
      riskIndex = Math.min(30, 5 + timePct * 15);
    }
    
    // Glycogen remaining (simplified model)
    const baseDepletion = timePct * 0.5; // 50% depletion over full duration
    const intensityFactor = (intensity - 60) / 20; // Higher intensity = faster depletion
    let glycogenRemaining = 100 - (baseDepletion + intensityFactor * timePct * 0.3) * 100;
    glycogenRemaining = Math.max(0, Math.min(100, glycogenRemaining));
    
    // Drift active
    const driftActive = scenario.driftOnsetTime != null && time >= scenario.driftOnsetTime;
    
    // Label
    let label = '';
    if (timePct === 0) label = 'Départ';
    else if (timePct === 0.5) label = 'Mi-course';
    else if (timePct === 1) label = 'Arrivée';
    else if (driftActive && !points[points.length - 1]?.driftActive) label = 'Dérive';
    
    points.push({
      time,
      timePct: Math.round(timePct * 100),
      intensity: Math.round(intensity),
      zone,
      riskIndex: Math.round(riskIndex),
      glycogenRemaining: Math.round(glycogenRemaining),
      driftActive,
      label,
    });
  }
  
  return points;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const PACING_DECISION_COLORS = {
  CRITICAL: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30' },
  RESTRICTED: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' },
  NORMAL: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  OPTIMAL: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
};
