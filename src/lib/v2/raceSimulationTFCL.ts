/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RACE SIMULATION TFCL™ — Module de Simulation de Course (CAP)
 * 
 * Ce module NE DONNE PAS un temps unique.
 * Il produit des SCÉNARIOS basés sur le Pacing Envelope™.
 * 
 * Boucle décisionnelle complète:
 * 1️⃣ Avant: Simulation → Scénarios
 * 2️⃣ Pendant: Discipline pacing
 * 3️⃣ Après: Analyse → Recalibration
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ReadinessState } from "./potentielTypes";
import type { PacingEnvelopeRunResult, PacingZoneDefinitionRun, RunningDistance } from "./pacingEnvelopeRunning";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — SIMULATION INPUTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SimulationInputs {
  distance: RunningDistance;
  pacing_envelope: PacingEnvelopeRunResult;
  vlamax_run_v2: number | null;
  vo2max_run: number | null;
  durability_index: number | null;       // TTE en minutes
  fatmax_intensity: number | null;       // % du seuil
  race_readiness_state: ReadinessState;
  race_readiness_score: number;          // 0-100
  threshold_pace_sec_km: number | null;  // Seuil en sec/km
  athlete_weight_kg?: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — SIMULATION OUTPUTS
// ═══════════════════════════════════════════════════════════════════════════════

export type SimulationScenarioType = "ROBUST" | "AMBITIOUS" | "AGGRESSIVE";

export interface GlycogenCurvePoint {
  distance_pct: number;
  glycogen_remaining_pct: number;
  depletion_rate: number;
  zone_at_point: "GREEN" | "ORANGE" | "RED";
}

export interface FatigueCurvePoint {
  distance_pct: number;
  fatigue_index: number;           // 0-100
  central_fatigue_risk: number;    // 0-100
}

export interface PacingCurvePoint {
  distance_pct: number;
  intensity_pct: number;           // % du seuil
  pace_sec_km: number | null;
  zone: "GREEN" | "ORANGE" | "RED";
}

export interface SimulationScenario {
  type: SimulationScenarioType;
  label: string;
  description: string;
  
  // Courbes de simulation
  pacing_curve: PacingCurvePoint[];
  glycogen_curve: GlycogenCurvePoint[];
  fatigue_curve: FatigueCurvePoint[];
  
  // Points critiques
  glycogen_depletion_point_pct: number | null;  // % de la course où déplétion critique
  metabolic_cost_index: number;                  // 0-100 (coût global)
  failure_probability_pct: number;               // Probabilité d'effondrement
  
  // Plages de temps (pas de valeurs absolues!)
  estimated_time_range: {
    min_seconds: number | null;
    max_seconds: number | null;
    confidence_pct: number;
  } | null;
  
  // Messages
  risk_warning: string | null;
  decision_robustness: "ROBUST" | "FRAGILE" | "VERY_FRAGILE";
  recommendation: string;
}

export interface SimulationResult {
  // Inputs utilisés
  distance: RunningDistance;
  readiness_state: ReadinessState;
  
  // Les 3 scénarios
  scenarios: SimulationScenario[];
  
  // Scénario recommandé
  recommended_scenario: SimulationScenarioType;
  recommended_rationale: string;
  
  // Contraintes Pacing Envelope
  envelope_constraints: {
    max_first_third_pct: number;
    forbidden_zone_early: "RED";
    discipline_required: boolean;
  };
  
  // Métadonnées
  confidence: number;
  sources_used: string[];
  missing_data: string[];
  
  // Textes TFCL
  philosophy: string;
  disclaimer: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES — PARAMÈTRES DE SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════

const GLYCOGEN_PARAMS = {
  initial_pct: 100,
  base_depletion_per_pct_distance: {
    "10K": 3.5,
    "HM": 3.0,
    "MARATHON": 2.5,
  },
  zone_multiplier: {
    GREEN: 1.0,
    ORANGE: 1.35,
    RED: 1.8,
  },
  vlamax_amplifier: (vlamax: number) => 1 + Math.max(0, (vlamax - 0.35) * 2),
  critical_threshold: 15,  // % en dessous duquel effondrement
};

const FATIGUE_PARAMS = {
  base_accumulation_per_pct: {
    "10K": 0.8,
    "HM": 0.6,
    "MARATHON": 0.5,
  },
  zone_multiplier: {
    GREEN: 1.0,
    ORANGE: 1.5,
    RED: 2.5,
  },
  durability_dampener: (durability: number) => Math.max(0.5, 1 - (durability - 45) / 60),
  central_threshold: 70,  // Seuil fatigue centrale
};

const DISTANCE_DURATION_ESTIMATES: Record<RunningDistance, { elite_min: number; amateur_max: number }> = {
  "10K": { elite_min: 27, amateur_max: 70 },
  "HM": { elite_min: 58, amateur_max: 150 },
  "MARATHON": { elite_min: 120, amateur_max: 330 },
};

const TFCL_TEXTS = {
  philosophy: `La simulation TFCL ne prédit pas un temps — elle révèle les conséquences de chaque stratégie.
La performance n'est pas un hasard, elle est la conséquence directe d'une décision tenue ou non.`,
  
  disclaimer: `Ces scénarios sont des projections métaboliques basées sur votre profil physiologique actuel.
Le temps final dépend de l'exécution disciplinée du pacing choisi.`,
  
  lorang_principle: `"La course se gagne avant le départ, en choisissant la bonne stratégie — pas la plus ambitieuse."`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getZoneForIntensity(intensity: number, envelope: PacingEnvelopeRunResult): "GREEN" | "ORANGE" | "RED" {
  const greenZone = envelope.zones.find(z => z.zone === "GREEN");
  const orangeZone = envelope.zones.find(z => z.zone === "ORANGE");
  
  if (greenZone && intensity >= greenZone.rangePctThreshold[0] && intensity <= greenZone.rangePctThreshold[1]) {
    return "GREEN";
  }
  if (orangeZone && intensity >= orangeZone.rangePctThreshold[0] && intensity <= orangeZone.rangePctThreshold[1]) {
    return "ORANGE";
  }
  return "RED";
}

function intensityToPace(intensity: number, thresholdPace: number): number {
  return Math.round(thresholdPace * (100 / intensity));
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE — COMPUTE SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════

export function computeRaceSimulation(inputs: SimulationInputs): SimulationResult {
  const {
    distance,
    pacing_envelope,
    vlamax_run_v2,
    vo2max_run,
    durability_index,
    fatmax_intensity,
    race_readiness_state,
    race_readiness_score,
    threshold_pace_sec_km,
  } = inputs;

  const sourcesUsed: string[] = [];
  const missingData: string[] = [];

  // Tracker les sources
  if (vlamax_run_v2 != null) sourcesUsed.push("VLamax CAP");
  else missingData.push("VLamax CAP");
  
  if (vo2max_run != null) sourcesUsed.push("VO2max CAP");
  else missingData.push("VO2max CAP");
  
  if (durability_index != null) sourcesUsed.push("Durabilité CAP");
  else missingData.push("Durabilité CAP");
  
  sourcesUsed.push("Pacing Envelope™");
  sourcesUsed.push("Potentiel Physiologique");

  // ─────────────────────────────────────────────────────────────────────────────
  // EXTRAIRE LES BORNES DE L'ENVELOPPE
  // ─────────────────────────────────────────────────────────────────────────────
  const greenZone = pacing_envelope.zones.find(z => z.zone === "GREEN");
  const orangeZone = pacing_envelope.zones.find(z => z.zone === "ORANGE");
  
  const greenMin = greenZone?.rangePctThreshold[0] ?? 88;
  const greenMax = greenZone?.rangePctThreshold[1] ?? 92;
  const orangeMax = orangeZone?.rangePctThreshold[1] ?? 95;
  const greenCenter = (greenMin + greenMax) / 2;

  // ─────────────────────────────────────────────────────────────────────────────
  // GÉNÉRER LES 3 SCÉNARIOS
  // ─────────────────────────────────────────────────────────────────────────────
  const scenarios: SimulationScenario[] = [
    generateScenario("ROBUST", {
      distance,
      greenMin, greenMax, orangeMax, greenCenter,
      vlamax: vlamax_run_v2,
      durability: durability_index,
      potentielState: race_readiness_state,
      potentielScore: race_readiness_score,
      thresholdPace: threshold_pace_sec_km,
      envelope: pacing_envelope,
    }),
    generateScenario("AMBITIOUS", {
      distance,
      greenMin, greenMax, orangeMax, greenCenter,
      vlamax: vlamax_run_v2,
      durability: durability_index,
      potentielState: race_readiness_state,
      potentielScore: race_readiness_score,
      thresholdPace: threshold_pace_sec_km,
      envelope: pacing_envelope,
    }),
    generateScenario("AGGRESSIVE", {
      distance,
      greenMin, greenMax, orangeMax, greenCenter,
      vlamax: vlamax_run_v2,
      durability: durability_index,
      potentielState: race_readiness_state,
      potentielScore: race_readiness_score,
      thresholdPace: threshold_pace_sec_km,
      envelope: pacing_envelope,
    }),
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // DÉTERMINER LE SCÉNARIO RECOMMANDÉ
  // ─────────────────────────────────────────────────────────────────────────────
  let recommendedScenario: SimulationScenarioType = "ROBUST";
  let recommendedRationale = "Scénario discipliné recommandé — maximise la probabilité de finir dans les meilleures conditions.";
  
  if (race_readiness_state === "GREEN" && (vlamax_run_v2 ?? 0.4) < 0.35 && (durability_index ?? 45) >= 55) {
    recommendedScenario = "AMBITIOUS";
    recommendedRationale = "Profil physiologique favorable (VLamax basse + durabilité élevée) — scénario ambitieux envisageable.";
  } else if (race_readiness_state === "RED") {
    recommendedScenario = "ROBUST";
    recommendedRationale = "Potentiel Physiologique faible — discipline maximale requise pour éviter l'effondrement.";
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CALCULER LA CONFIANCE
  // ─────────────────────────────────────────────────────────────────────────────
  let confidence = 0.5;
  if (vlamax_run_v2 != null) confidence += 0.15;
  if (durability_index != null) confidence += 0.15;
  if (vo2max_run != null) confidence += 0.1;
  if (threshold_pace_sec_km != null) confidence += 0.1;
  confidence = clamp(confidence, 0.3, 0.95);

  return {
    distance,
    readiness_state: race_readiness_state,
    scenarios,
    recommended_scenario: recommendedScenario,
    recommended_rationale: recommendedRationale,
    envelope_constraints: {
      max_first_third_pct: greenMax,
      forbidden_zone_early: "RED",
      discipline_required: pacing_envelope.discipline_required,
    },
    confidence,
    sources_used: sourcesUsed,
    missing_data: missingData,
    philosophy: TFCL_TEXTS.philosophy,
    disclaimer: TFCL_TEXTS.disclaimer,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GÉNÉRATION D'UN SCÉNARIO
// ═══════════════════════════════════════════════════════════════════════════════

interface ScenarioParams {
  distance: RunningDistance;
  greenMin: number;
  greenMax: number;
  orangeMax: number;
  greenCenter: number;
  vlamax: number | null;
  durability: number | null;
  potentielState: ReadinessState;
  potentielScore: number;
  thresholdPace: number | null;
  envelope: PacingEnvelopeRunResult;
}

function generateScenario(type: SimulationScenarioType, params: ScenarioParams): SimulationScenario {
  const {
    distance, greenMin, greenMax, orangeMax, greenCenter,
    vlamax, durability, potentielState, potentielScore, thresholdPace, envelope
  } = params;

  // ─────────────────────────────────────────────────────────────────────────────
  // DÉFINIR LE PROFIL DE PACING PAR SCÉNARIO
  // ─────────────────────────────────────────────────────────────────────────────
  let pacingProfile: { first: number; middle: number; last: number };
  let label: string;
  let description: string;
  let baseFailureProbability: number;
  let decisionRobustness: "ROBUST" | "FRAGILE" | "VERY_FRAGILE";
  
  switch (type) {
    case "ROBUST":
      pacingProfile = {
        first: greenMin + 1,
        middle: greenCenter,
        last: greenMax - 1,
      };
      label = "Scénario ROBUSTE";
      description = "Pacing intégralement en zone verte — performance maximisée avec risque minimisé";
      baseFailureProbability = 8;
      decisionRobustness = "ROBUST";
      break;
      
    case "AMBITIOUS":
      pacingProfile = {
        first: greenCenter,
        middle: greenMax,
        last: orangeMax - 2,
      };
      label = "Scénario AMBITIEUX";
      description = "Entrée tardive en zone orange — performance possible mais fragile";
      baseFailureProbability = 25;
      decisionRobustness = "FRAGILE";
      break;
      
    case "AGGRESSIVE":
      pacingProfile = {
        first: greenMax + 2,
        middle: orangeMax,
        last: orangeMax + 3,
      };
      label = "Scénario AGRESSIF";
      description = "Rouge précoce — maximise le risque d'effondrement";
      baseFailureProbability = 55;
      decisionRobustness = "VERY_FRAGILE";
      break;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GÉNÉRER LA COURBE DE PACING (10 points)
  // ─────────────────────────────────────────────────────────────────────────────
  const pacingCurve: PacingCurvePoint[] = [];
  for (let i = 0; i <= 100; i += 10) {
    let intensity: number;
    if (i <= 33) {
      // Premier tiers
      const t = i / 33;
      intensity = pacingProfile.first + (pacingProfile.middle - pacingProfile.first) * t * 0.5;
    } else if (i <= 66) {
      // Milieu
      const t = (i - 33) / 33;
      intensity = pacingProfile.first + (pacingProfile.middle - pacingProfile.first) * (0.5 + t * 0.5);
    } else {
      // Dernier tiers
      const t = (i - 66) / 34;
      intensity = pacingProfile.middle + (pacingProfile.last - pacingProfile.middle) * t;
    }
    
    pacingCurve.push({
      distance_pct: i,
      intensity_pct: Math.round(intensity * 10) / 10,
      pace_sec_km: thresholdPace ? intensityToPace(intensity, thresholdPace) : null,
      zone: getZoneForIntensity(intensity, envelope),
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SIMULER LA DÉPLÉTION GLYCOGÉNIQUE
  // ─────────────────────────────────────────────────────────────────────────────
  const glycogenCurve: GlycogenCurvePoint[] = [];
  let glycogen = GLYCOGEN_PARAMS.initial_pct;
  let depletionPoint: number | null = null;
  
  const baseDepletion = GLYCOGEN_PARAMS.base_depletion_per_pct_distance[distance];
  const vlamaxAmp = GLYCOGEN_PARAMS.vlamax_amplifier(vlamax ?? 0.35);
  
  for (let i = 0; i <= 100; i += 10) {
    const point = pacingCurve.find(p => p.distance_pct === i);
    const zone = point?.zone ?? "GREEN";
    const zoneMultiplier = GLYCOGEN_PARAMS.zone_multiplier[zone];
    
    const depletionRate = baseDepletion * zoneMultiplier * vlamaxAmp;
    glycogen = Math.max(0, glycogen - depletionRate);
    
    if (glycogen <= GLYCOGEN_PARAMS.critical_threshold && depletionPoint === null) {
      depletionPoint = i;
    }
    
    glycogenCurve.push({
      distance_pct: i,
      glycogen_remaining_pct: Math.round(glycogen),
      depletion_rate: Math.round(depletionRate * 10) / 10,
      zone_at_point: zone,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SIMULER L'ACCUMULATION DE FATIGUE
  // ─────────────────────────────────────────────────────────────────────────────
  const fatigueCurve: FatigueCurvePoint[] = [];
  let fatigue = 0;
  
  const baseFatigue = FATIGUE_PARAMS.base_accumulation_per_pct[distance];
  const durabilityDampener = FATIGUE_PARAMS.durability_dampener(durability ?? 45);
  
  for (let i = 0; i <= 100; i += 10) {
    const point = pacingCurve.find(p => p.distance_pct === i);
    const zone = point?.zone ?? "GREEN";
    const zoneMultiplier = FATIGUE_PARAMS.zone_multiplier[zone];
    
    fatigue = Math.min(100, fatigue + baseFatigue * zoneMultiplier * durabilityDampener);
    
    fatigueCurve.push({
      distance_pct: i,
      fatigue_index: Math.round(fatigue),
      central_fatigue_risk: fatigue >= FATIGUE_PARAMS.central_threshold ? Math.round((fatigue - 60) * 2) : 0,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CALCULER LE COÛT MÉTABOLIQUE GLOBAL
  // ─────────────────────────────────────────────────────────────────────────────
  const finalGlycogen = glycogenCurve[glycogenCurve.length - 1]?.glycogen_remaining_pct ?? 50;
  const finalFatigue = fatigueCurve[fatigueCurve.length - 1]?.fatigue_index ?? 50;
  const metabolicCostIndex = clamp(
    Math.round((100 - finalGlycogen) * 0.5 + finalFatigue * 0.5),
    0, 100
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // AJUSTER LA PROBABILITÉ D'ÉCHEC
  // ─────────────────────────────────────────────────────────────────────────────
  let failureProbability = baseFailureProbability;
  
  // Amplifier si VLamax élevée
  if ((vlamax ?? 0.35) > 0.45) {
    failureProbability += 15;
  }
  
  // Amplifier si durabilité faible
  if ((durability ?? 45) < 40) {
    failureProbability += 10;
  }
  
  // Amplifier si readiness faible
  if (potentielState === "ORANGE") {
    failureProbability += 10;
  } else if (potentielState === "RED") {
    failureProbability += 25;
  }
  
  // Amplifier si déplétion glycogène prévue avant la fin
  if (depletionPoint !== null && depletionPoint < 90) {
    failureProbability += 20;
  }
  
  failureProbability = clamp(failureProbability, 5, 95);

  // ─────────────────────────────────────────────────────────────────────────────
  // GÉNÉRER LE WARNING
  // ─────────────────────────────────────────────────────────────────────────────
  let riskWarning: string | null = null;
  
  if (type === "AGGRESSIVE") {
    riskWarning = "⚠️ Performance possible MAIS effondrement probable. Coût métabolique exponentiel.";
  } else if (type === "AMBITIOUS" && depletionPoint !== null && depletionPoint < 85) {
    riskWarning = "⚠️ Risque de déplétion glycogène avant la fin si exécution imparfaite.";
  } else if (failureProbability > 40) {
    riskWarning = "⚠️ Profil actuel incompatible avec ce scénario — discipline recommandée.";
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GÉNÉRER LA RECOMMANDATION
  // ─────────────────────────────────────────────────────────────────────────────
  let recommendation: string;
  
  if (type === "ROBUST") {
    recommendation = "Scénario de référence TFCL — privilégier cette stratégie pour maximiser la robustesse de la performance.";
  } else if (type === "AMBITIOUS") {
    recommendation = "Envisageable uniquement si Potentiel Physiologique GREEN et profil VLamax favorable (< 0.38).";
  } else {
    recommendation = "Non recommandé — ce scénario maximise le risque d'effondrement et compromet la performance finale.";
  }

  return {
    type,
    label,
    description,
    pacing_curve: pacingCurve,
    glycogen_curve: glycogenCurve,
    fatigue_curve: fatigueCurve,
    glycogen_depletion_point_pct: depletionPoint,
    metabolic_cost_index: metabolicCostIndex,
    failure_probability_pct: failureProbability,
    estimated_time_range: null, // Pas de temps absolu dans TFCL
    risk_warning: riskWarning,
    decision_robustness: decisionRobustness,
    recommendation,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT HELPER — FORMAT PACING FOR DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

export function formatPaceSecKm(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}'${sec.toString().padStart(2, "0")}"`;
}

export function getScenarioColor(type: SimulationScenarioType): string {
  switch (type) {
    case "ROBUST": return "hsl(var(--success))";
    case "AMBITIOUS": return "hsl(var(--warning))";
    case "AGGRESSIVE": return "hsl(var(--destructive))";
  }
}

export function getScenarioEmoji(type: SimulationScenarioType): string {
  switch (type) {
    case "ROBUST": return "✅";
    case "AMBITIOUS": return "⚠️";
    case "AGGRESSIVE": return "🚨";
  }
}
