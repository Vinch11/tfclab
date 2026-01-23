/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SIMULATION DE COURSE TFCL™ — Fuel & Risk Model
 * Two For Coaching Lab Method™
 * 
 * DÉFINITION OFFICIELLE:
 * Cette simulation ne prédit pas un résultat exact.
 * Elle compare des scénarios de pacing et de nutrition en fonction du profil TFCL.
 * 
 * MODÈLE MÉTABOLIQUE:
 * - Au-dessus de FatMax → dépendance glucidique augmente
 * - VLamax élevée → crossover plus bas, déplétion plus rapide
 * - TTE faible → dérive et rupture plus tôt
 * - Nutrition planifiée → réduit le risque mais ne l'annule pas
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type RaceType = 'IM' | '70.3' | 'Marathon' | 'Semi' | '10km';
export type AmbitionLevel = 'finish' | 'perf' | 'sub' | 'elite';
export type HeatCondition = 'low' | 'moderate' | 'high';
export type TerrainType = 'flat' | 'hilly';
export type ScenarioType = 'conservative' | 'optimal' | 'aggressive';
export type DepletionRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RaceSimulationInput {
  // Course
  raceType: RaceType;
  raceDate?: string | null;
  distanceKm?: number | null;
  targetDurationMin?: number | null;
  heat: HeatCondition;
  terrain: TerrainType;
  
  // Nutrition
  plannedCarbsGH?: number | null;
  nutritionType?: 'liquid' | 'solid' | 'mixed' | null;
  
  // Ambition
  ambition: AmbitionLevel;
  
  // Profil TFCL (automatique)
  vlamaxEffectif: number | null;
  vlamaxConfidence: number;
  vlamaxDiscipline: 'bike' | 'run';
  tteMin: number | null;
  tteConfidence: number;
  fatmaxCenterPct: number | null;
  fatmaxRange: [number, number] | null; // [min, max] %FTP
  disponibiliteScore: number | null;
  disponibiliteLevel: string | null;
  injuryRiskLevel?: string | null;
  ftp?: number | null;           // W
  vma?: number | null;           // km/h
  paceThreshold?: number | null; // sec/km
  weight?: number | null;        // kg
}

export interface SegmentResult {
  segmentIndex: number;
  distanceKm: number;
  durationMin: number;
  intensityPct: number;           // %FTP ou %VMA
  fuelRiskIndex: number;          // 0-100
  depletionRisk: DepletionRisk;
  glycogenRemaining: number;      // 0-100%
  carbsNeeded: number;            // g/h pour ce segment
  fatigueRisk: number;            // 0-100
  rpeEstimate: number;            // 1-10
  notes: string[];
}

export interface PacingScenario {
  type: ScenarioType;
  label: string;
  description: string;
  targetIntensityPct: number;     // %FTP moyenne
  targetIntensityRange: [number, number];
  estimatedTimeMin: number;
  estimatedTimeRange: [number, number]; // min-max minutes
  breakpointKm: number | null;    // km où ça bascule
  breakpointRisk: string | null;
  segments: SegmentResult[];
  overallFuelRisk: number;        // 0-100
  overallDepletionRisk: DepletionRisk;
  successProbability: number;     // 0-1
  warnings: string[];
  strengths: string[];
}

export interface RaceSimulationResult {
  // Métadonnées
  raceType: RaceType;
  raceLabel: string;
  distanceKm: number;
  ambition: AmbitionLevel;
  ambitionLabel: string;
  
  // Temps estimé global (plage)
  estimatedTimeRange: [number, number]; // [min, max] en minutes
  estimatedTimeLabel: string;           // "3h45 – 4h15"
  timeConfidence: number;               // 0-1
  timeConfidenceLabel: string;
  
  // Scénarios
  scenarios: PacingScenario[];
  recommendedScenario: ScenarioType;
  
  // Risques globaux
  globalFuelRisk: number;
  globalDepletionRisk: DepletionRisk;
  
  // Garde-fous
  guardrails: SimulationGuardrail[];
  
  // Ce qui ferait échouer
  failureRisks: FailureRisk[];
  
  // Sources utilisées
  sourcesUsed: string[];
  missingData: string[];
  
  // Disclaimers
  disclaimer: string;
  methodology: string;
}

export interface SimulationGuardrail {
  type: 'warning' | 'critical';
  icon: string;
  title: string;
  message: string;
}

export interface FailureRisk {
  id: string;
  label: string;
  description: string;
  probability: 'low' | 'moderate' | 'high';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════════

const RACE_DISTANCES: Record<RaceType, number> = {
  'IM': 180,        // km vélo Ironman
  '70.3': 90,       // km vélo 70.3
  'Marathon': 42.2,
  'Semi': 21.1,
  '10km': 10,
};

const RACE_LABELS: Record<RaceType, string> = {
  'IM': 'Ironman (vélo)',
  '70.3': '70.3 (vélo)',
  'Marathon': 'Marathon',
  'Semi': 'Semi-Marathon',
  '10km': '10 km',
};

const AMBITION_LABELS: Record<AmbitionLevel, string> = {
  finish: 'Finisher',
  perf: 'Performance',
  sub: 'Objectif chrono',
  elite: 'Elite',
};

// Intensité cible par ambition (%FTP ou %VMA)
const AMBITION_INTENSITY: Record<RaceType, Record<AmbitionLevel, number>> = {
  'IM': { finish: 62, perf: 68, sub: 72, elite: 76 },
  '70.3': { finish: 70, perf: 75, sub: 80, elite: 85 },
  'Marathon': { finish: 65, perf: 72, sub: 78, elite: 82 },
  'Semi': { finish: 72, perf: 78, sub: 84, elite: 88 },
  '10km': { finish: 82, perf: 88, sub: 92, elite: 96 },
};

// Durée référence par type/ambition (minutes)
const REFERENCE_DURATIONS: Record<RaceType, Record<AmbitionLevel, number>> = {
  'IM': { finish: 420, perf: 360, sub: 330, elite: 300 }, // 7h, 6h, 5h30, 5h vélo
  '70.3': { finish: 195, perf: 165, sub: 150, elite: 135 }, // 3h15, 2h45, 2h30, 2h15 vélo
  'Marathon': { finish: 300, perf: 240, sub: 210, elite: 180 },
  'Semi': { finish: 135, perf: 105, sub: 95, elite: 80 },
  '10km': { finish: 60, perf: 48, sub: 42, elite: 36 },
};

export const SIMULATION_DEFINITIONS = {
  official: `La Simulation de Course TFCL™ compare des scénarios de pacing et de nutrition 
en fonction de votre profil métabolique. Elle ne prédit pas un résultat exact.`,
  
  disclaimer: `Cette simulation ne remplace pas l'expérience du coach. 
Les temps estimés sont des plages indicatives avec incertitude explicite.
Les conditions réelles de course peuvent significativement modifier les résultats.`,
  
  methodology: `Modèle Fuel & Risk basé sur:
• FatMax TFCL™ pour le crossover lipides/glucides
• VLamax pour la dépendance glycolytique
• TTE pour la résistance à la fatigue
• Disponibilité TFCL™ pour l'état du jour`,
  
  athleteExplanation: `Cette simulation montre différentes stratégies de course
et leurs risques associés (épuisement glycogène, fatigue).
Choisis le scénario adapté à tes objectifs avec ton coach.`,
};

export const SIMULATION_ACADEMY = {
  title: "Pourquoi TFCL simule des scénarios et pas un temps exact",
  sections: [
    {
      title: "L'incertitude est réelle",
      content: `Même avec un profil physiologique complet, le temps de course dépend de 
nombreux facteurs imprévisibles : météo, terrain exact, gestion mentale, nutrition le jour J.
TFCL affiche des PLAGES de temps, pas des prédictions absolues.`,
    },
    {
      title: "Le rôle de VLamax et FatMax",
      content: `Une VLamax élevée signifie une dépendance accrue aux glucides.
Au-dessus de votre zone FatMax, vous consommez plus de glycogène.
La simulation calcule quand ce stock risque de s'épuiser.`,
    },
    {
      title: "Durabilité (TTE) et fatigue",
      content: `Le TTE indique combien de temps vous pouvez maintenir une intensité élevée.
Un TTE court = dérive plus précoce, risque de rupture.
La simulation identifie le segment où le risque bascule.`,
    },
    {
      title: "Nutrition = modulateur, pas solution",
      content: `Apporter plus de glucides (g/h) réduit le risque d'épuisement
mais ne l'annule jamais. La tolérance gastrique a ses limites.
La simulation intègre vos apports planifiés.`,
    },
    {
      title: "Les 3 scénarios expliqués",
      content: `• Conservateur : faible risque, temps plus lent mais finish quasi-garanti
• Optimal : équilibre risque/performance, pour la majorité des situations
• Agressif : performance maximale mais risque élevé de défaillance`,
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

function getDepletionRisk(fuelRisk: number): DepletionRisk {
  if (fuelRisk >= 80) return 'CRITICAL';
  if (fuelRisk >= 60) return 'HIGH';
  if (fuelRisk >= 40) return 'MEDIUM';
  return 'LOW';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODÈLE FUEL & RISK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcule le FuelRiskIndex pour un segment donné
 * 
 * Règles:
 * - Intensité > FatMax → +20-40 points
 * - VLamax haute (>0.5) → +15-25 points
 * - TTE faible (<40) → +10-15 points
 * - Durée longue → accumulation progressive
 */
function computeSegmentFuelRisk(
  intensityPct: number,
  fatmaxCenter: number | null,
  fatmaxMax: number | null,
  vlamaxEffectif: number | null,
  tteMin: number | null,
  segmentIndex: number,
  totalSegments: number,
  plannedCarbsGH: number | null
): number {
  let risk = 0;
  
  // Base: intensité vs FatMax
  const fatmax = fatmaxMax ?? fatmaxCenter ?? 70;
  const intensityDelta = intensityPct - fatmax;
  
  if (intensityDelta > 0) {
    // Au-dessus de FatMax → dépendance glucidique
    risk += 20 + Math.min(30, intensityDelta * 2);
  }
  
  // VLamax adjustment
  const vlamax = vlamaxEffectif ?? 0.45;
  if (vlamax > 0.5) {
    risk += 15 + (vlamax - 0.5) * 50;
  } else if (vlamax < 0.35) {
    risk -= 10; // Bonus métabolisme aérobie
  }
  
  // TTE adjustment
  const tte = tteMin ?? 45;
  if (tte < 40) {
    risk += 10 + (40 - tte);
  } else if (tte > 60) {
    risk -= 5; // Bonus durabilité
  }
  
  // Progression fatigue (segments tardifs = plus risqués)
  const progressionFactor = segmentIndex / totalSegments;
  risk += progressionFactor * 15;
  
  // Mitigation nutrition
  if (plannedCarbsGH && plannedCarbsGH > 0) {
    const nutritionMitigation = Math.min(20, plannedCarbsGH / 5);
    risk -= nutritionMitigation;
  }
  
  return clamp(risk, 0, 100);
}

/**
 * Calcule le glycogène restant (simulation)
 */
function computeGlycogenRemaining(
  segmentIndex: number,
  totalSegments: number,
  intensityPct: number,
  fatmaxCenter: number | null,
  vlamaxEffectif: number | null,
  plannedCarbsGH: number | null
): number {
  // Modèle simplifié: on part de 100% et on décroît
  const baseDepletion = 100 / totalSegments;
  
  // Facteur d'intensité
  const fatmax = fatmaxCenter ?? 70;
  const intensityFactor = intensityPct > fatmax 
    ? 1 + (intensityPct - fatmax) / 50 
    : 0.8;
  
  // Facteur VLamax
  const vlamax = vlamaxEffectif ?? 0.45;
  const vlamaxFactor = 1 + (vlamax - 0.4) * 1.5;
  
  // Réapprovisionnement nutrition
  const carbsRefuel = plannedCarbsGH ? Math.min(0.3, plannedCarbsGH / 300) : 0;
  
  const depletionPerSegment = baseDepletion * intensityFactor * vlamaxFactor - carbsRefuel * baseDepletion;
  const totalDepletion = depletionPerSegment * (segmentIndex + 1);
  
  return clamp(100 - totalDepletion, 0, 100);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GÉNÉRATION DES SCÉNARIOS
// ═══════════════════════════════════════════════════════════════════════════════

function generateScenario(
  type: ScenarioType,
  input: RaceSimulationInput,
  baseIntensity: number,
  baseDuration: number
): PacingScenario {
  // Ajustements par type de scénario
  const intensityOffset: Record<ScenarioType, number> = {
    conservative: -5,
    optimal: 0,
    aggressive: +5,
  };
  
  const durationMultiplier: Record<ScenarioType, number> = {
    conservative: 1.1,
    optimal: 1.0,
    aggressive: 0.92,
  };
  
  const scenarioLabels: Record<ScenarioType, { label: string; description: string }> = {
    conservative: {
      label: "Conservateur",
      description: "Risque faible, finish quasi-garanti. Idéal pour première course ou conditions difficiles.",
    },
    optimal: {
      label: "Optimal",
      description: "Équilibre risque/performance. Recommandé pour la plupart des situations.",
    },
    aggressive: {
      label: "Agressif",
      description: "Performance maximale mais risque élevé de défaillance. Réservé aux conditions idéales.",
    },
  };
  
  const targetIntensity = clamp(baseIntensity + intensityOffset[type], 50, 98);
  const estimatedDuration = baseDuration * durationMultiplier[type];
  
  // Ajustements conditions
  let conditionFactor = 1.0;
  if (input.heat === 'high') conditionFactor += 0.08;
  if (input.heat === 'moderate') conditionFactor += 0.03;
  if (input.terrain === 'hilly') conditionFactor += 0.05;
  
  const adjustedDuration = estimatedDuration * conditionFactor;
  
  // Générer segments (10 segments)
  const numSegments = 10;
  const distanceKm = input.distanceKm ?? RACE_DISTANCES[input.raceType];
  const segmentDistance = distanceKm / numSegments;
  const segmentDuration = adjustedDuration / numSegments;
  
  const segments: SegmentResult[] = [];
  let breakpointKm: number | null = null;
  let breakpointRisk: string | null = null;
  
  for (let i = 0; i < numSegments; i++) {
    // Intensité légèrement variable (fatigue progression)
    const segmentIntensity = targetIntensity - (i * 0.5); // Léger negative split naturel
    
    const fuelRisk = computeSegmentFuelRisk(
      targetIntensity,
      input.fatmaxCenterPct,
      input.fatmaxRange?.[1] ?? null,
      input.vlamaxEffectif,
      input.tteMin,
      i,
      numSegments,
      input.plannedCarbsGH
    );
    
    const glycogenRemaining = computeGlycogenRemaining(
      i,
      numSegments,
      targetIntensity,
      input.fatmaxCenterPct,
      input.vlamaxEffectif,
      input.plannedCarbsGH
    );
    
    // Détecter point de bascule
    if (!breakpointKm && fuelRisk >= 60) {
      breakpointKm = segmentDistance * i;
      breakpointRisk = `Risque glycogène élevé à partir du km ${Math.round(breakpointKm)}`;
    }
    
    const notes: string[] = [];
    if (fuelRisk >= 70) notes.push("Zone critique glycogène");
    if (glycogenRemaining < 30) notes.push("Réserves faibles");
    if (i >= numSegments - 2) notes.push("Phase finale");
    
    segments.push({
      segmentIndex: i,
      distanceKm: segmentDistance * (i + 1),
      durationMin: segmentDuration * (i + 1),
      intensityPct: segmentIntensity,
      fuelRiskIndex: fuelRisk,
      depletionRisk: getDepletionRisk(fuelRisk),
      glycogenRemaining,
      carbsNeeded: input.plannedCarbsGH ?? 60,
      fatigueRisk: 20 + (i / numSegments) * 50,
      rpeEstimate: Math.min(10, 4 + (i / numSegments) * 5),
      notes,
    });
  }
  
  // Calcul risques globaux
  const avgFuelRisk = segments.reduce((sum, s) => sum + s.fuelRiskIndex, 0) / segments.length;
  const maxFuelRisk = Math.max(...segments.map(s => s.fuelRiskIndex));
  
  // Probabilité de succès
  let successProb = 1.0;
  if (type === 'aggressive') successProb -= 0.15;
  if (maxFuelRisk > 70) successProb -= 0.2;
  if (input.disponibiliteScore && input.disponibiliteScore < 50) successProb -= 0.15;
  if (input.injuryRiskLevel === 'high' || input.injuryRiskLevel === 'critical') successProb -= 0.2;
  successProb = clamp(successProb, 0.3, 0.95);
  
  const warnings: string[] = [];
  const strengths: string[] = [];
  
  if (type === 'aggressive') {
    warnings.push("Risque de défaillance élevé en fin de course");
  }
  if (maxFuelRisk > 70) {
    warnings.push("Déplétion glycogène probable");
  }
  if (input.disponibiliteScore && input.disponibiliteScore < 50) {
    warnings.push("Disponibilité faible aujourd'hui");
  }
  
  if (type === 'conservative') {
    strengths.push("Finish quasi-garanti");
    strengths.push("Marge de sécurité élevée");
  }
  if (type === 'optimal') {
    strengths.push("Bon équilibre risque/performance");
  }
  
  // Plage de temps
  const timeVariation = type === 'conservative' ? 0.05 : type === 'aggressive' ? 0.08 : 0.06;
  
  return {
    type,
    label: scenarioLabels[type].label,
    description: scenarioLabels[type].description,
    targetIntensityPct: targetIntensity,
    targetIntensityRange: [targetIntensity - 2, targetIntensity + 2],
    estimatedTimeMin: adjustedDuration,
    estimatedTimeRange: [
      adjustedDuration * (1 - timeVariation),
      adjustedDuration * (1 + timeVariation),
    ],
    breakpointKm,
    breakpointRisk,
    segments,
    overallFuelRisk: avgFuelRisk,
    overallDepletionRisk: getDepletionRisk(maxFuelRisk),
    successProbability: successProb,
    warnings,
    strengths,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════════════════════

export function computeRaceSimulation(input: RaceSimulationInput): RaceSimulationResult {
  const distanceKm = input.distanceKm ?? RACE_DISTANCES[input.raceType];
  const baseIntensity = AMBITION_INTENSITY[input.raceType][input.ambition];
  const baseDuration = input.targetDurationMin ?? REFERENCE_DURATIONS[input.raceType][input.ambition];
  
  // Sources utilisées
  const sourcesUsed: string[] = [];
  const missingData: string[] = [];
  
  if (input.vlamaxEffectif != null) sourcesUsed.push("VLamax");
  else missingData.push("VLamax");
  
  if (input.tteMin != null) sourcesUsed.push("TTE");
  else missingData.push("TTE");
  
  if (input.fatmaxCenterPct != null) sourcesUsed.push("FatMax TFCL");
  else missingData.push("FatMax TFCL");
  
  if (input.disponibiliteScore != null) sourcesUsed.push("Disponibilité TFCL");
  
  if (input.ftp != null) sourcesUsed.push("FTP");
  if (input.vma != null) sourcesUsed.push("VMA");
  
  // Générer les 3 scénarios
  const scenarios: PacingScenario[] = [
    generateScenario('conservative', input, baseIntensity, baseDuration),
    generateScenario('optimal', input, baseIntensity, baseDuration),
    generateScenario('aggressive', input, baseIntensity, baseDuration),
  ];
  
  // Recommandation
  let recommendedScenario: ScenarioType = 'optimal';
  
  if (input.disponibiliteScore && input.disponibiliteScore < 50) {
    recommendedScenario = 'conservative';
  }
  if (input.injuryRiskLevel === 'high' || input.injuryRiskLevel === 'critical') {
    recommendedScenario = 'conservative';
  }
  if (input.ambition === 'elite' && input.disponibiliteScore && input.disponibiliteScore > 70) {
    recommendedScenario = 'aggressive';
  }
  
  // Temps global
  const optimalScenario = scenarios.find(s => s.type === 'optimal')!;
  const conservativeScenario = scenarios.find(s => s.type === 'conservative')!;
  const aggressiveScenario = scenarios.find(s => s.type === 'aggressive')!;
  
  const timeRangeMin = aggressiveScenario.estimatedTimeRange[0];
  const timeRangeMax = conservativeScenario.estimatedTimeRange[1];
  
  // Confiance
  let timeConfidence = 0.7;
  if (missingData.length >= 2) timeConfidence -= 0.2;
  if (input.vlamaxConfidence < 0.6) timeConfidence -= 0.1;
  if (input.tteConfidence < 0.6) timeConfidence -= 0.1;
  timeConfidence = clamp(timeConfidence, 0.3, 0.9);
  
  // Garde-fous
  const guardrails: SimulationGuardrail[] = [];
  
  if (input.disponibiliteScore && input.disponibiliteScore < 50) {
    guardrails.push({
      type: 'warning',
      icon: '⚠️',
      title: "Disponibilité faible",
      message: "Disponibilité faible aujourd'hui : simulation informative mais prudence.",
    });
  }
  
  if (input.injuryRiskLevel === 'high' || input.injuryRiskLevel === 'critical') {
    guardrails.push({
      type: 'critical',
      icon: '🚨',
      title: "Risque blessure",
      message: "Risque CAP élevé : attention aux scénarios agressifs.",
    });
  }
  
  if (missingData.length >= 2) {
    guardrails.push({
      type: 'warning',
      icon: '📊',
      title: "Données incomplètes",
      message: `Données manquantes : ${missingData.join(', ')}. Confiance réduite.`,
    });
  }
  
  // Risques d'échec
  const failureRisks: FailureRisk[] = [];
  
  if (input.vlamaxEffectif && input.vlamaxEffectif > 0.5 && baseIntensity > 75) {
    failureRisks.push({
      id: 'vlamax_high',
      label: "VLamax élevée + pacing haut",
      description: "Profil glycolytique avec intensité élevée = déplétion rapide",
      probability: 'high',
    });
  }
  
  if (input.plannedCarbsGH && input.plannedCarbsGH < 50 && baseDuration > 180) {
    failureRisks.push({
      id: 'nutrition_low',
      label: "Nutrition insuffisante",
      description: "Apports glucidiques trop faibles pour la durée de course",
      probability: 'moderate',
    });
  }
  
  if (input.tteMin && input.tteMin < 40 && baseDuration > 120) {
    failureRisks.push({
      id: 'tte_low',
      label: "Durabilité limitée",
      description: "TTE faible = risque de rupture en fin de course",
      probability: 'moderate',
    });
  }
  
  return {
    raceType: input.raceType,
    raceLabel: RACE_LABELS[input.raceType],
    distanceKm,
    ambition: input.ambition,
    ambitionLabel: AMBITION_LABELS[input.ambition],
    estimatedTimeRange: [timeRangeMin, timeRangeMax],
    estimatedTimeLabel: `${formatDuration(timeRangeMin)} – ${formatDuration(timeRangeMax)}`,
    timeConfidence,
    timeConfidenceLabel: timeConfidence >= 0.7 ? "Bonne" : timeConfidence >= 0.5 ? "Moyenne" : "Faible",
    scenarios,
    recommendedScenario,
    globalFuelRisk: optimalScenario.overallFuelRisk,
    globalDepletionRisk: optimalScenario.overallDepletionRisk,
    guardrails,
    failureRisks,
    sourcesUsed,
    missingData,
    disclaimer: SIMULATION_DEFINITIONS.disclaimer,
    methodology: SIMULATION_DEFINITIONS.methodology,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function getDepletionRiskColor(risk: DepletionRisk): string {
  switch (risk) {
    case 'LOW': return 'text-green-600 dark:text-green-400';
    case 'MEDIUM': return 'text-amber-600 dark:text-amber-400';
    case 'HIGH': return 'text-orange-600 dark:text-orange-400';
    case 'CRITICAL': return 'text-red-600 dark:text-red-400';
  }
}

export function getDepletionRiskBgColor(risk: DepletionRisk): string {
  switch (risk) {
    case 'LOW': return 'bg-green-100 dark:bg-green-900/30';
    case 'MEDIUM': return 'bg-amber-100 dark:bg-amber-900/30';
    case 'HIGH': return 'bg-orange-100 dark:bg-orange-900/30';
    case 'CRITICAL': return 'bg-red-100 dark:bg-red-900/30';
  }
}

export function getScenarioColor(type: ScenarioType): string {
  switch (type) {
    case 'conservative': return 'text-green-600 dark:text-green-400';
    case 'optimal': return 'text-blue-600 dark:text-blue-400';
    case 'aggressive': return 'text-orange-600 dark:text-orange-400';
  }
}

export function getScenarioBgColor(type: ScenarioType): string {
  switch (type) {
    case 'conservative': return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
    case 'optimal': return 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
    case 'aggressive': return 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const PDF_SIMULATION_SECTION = {
  title: "Simulation de Course TFCL™",
  description: "Scénarios de pacing et risque glycogène",
  disclaimer: SIMULATION_DEFINITIONS.disclaimer,
};
