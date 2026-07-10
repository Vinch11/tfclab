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
 * 
 * INTÉGRATION RACE READINESS:
 * - Les modificateurs du connecteur Potentiel Physiologique → Simulation sont appliqués
 * - FTP/VMA effectifs ajustés selon la disponibilité
 * - FatMax décalé si disponibilité réduite
 * - Taux de déplétion glycogène modifié
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SimulationModifiers } from './potentielTypes';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type SimulationMode = 'basic' | 'pro';
export type RaceType = 'IM' | '70.3' | 'Marathon' | 'Semi' | '10km';
export type AmbitionLevel = 'finish' | 'perf' | 'sub' | 'elite' | 'world_class';
export type HeatCondition = 'low' | 'moderate' | 'high';
export type TerrainType = 'flat' | 'hilly';
export type ScenarioType = 'conservative' | 'optimal' | 'aggressive';
export type BasicRiskLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type BasicIntensityZone = 'controlled' | 'limit' | 'at_risk';
export type DepletionRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RaceSimulationInput {
  // Course
  raceType: RaceType;
  raceDate?: string | null;
  distanceKm?: number | null;
  targetDurationMin?: number | null;
  heat: HeatCondition;
  // Modèle thermique continu optionnel (Périard 2021, Racinais 2015)
  ambientTempC?: number | null;     // °C — si fourni, écrase le mapping `heat`
  humidityPct?: number | null;      // 0-100 %
  acclimatized?: boolean | null;    // 10-14j d'exposition >25°C
  terrain: TerrainType;
  
  // Nutrition
  plannedCarbsGH?: number | null;
  gutTraining?: boolean;
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
  
  // Modificateurs Potentiel Physiologique (optionnel)
  readinessModifiers?: SimulationModifiers | null;
}

export interface SegmentResult {
  segmentIndex: number;
  distanceKm: number;
  durationMin: number;
  intensityPct: number;           // %FTP ou %VMA
  fuelRiskIndex: number;          // 0-100
  depletionRisk: DepletionRisk;
  glycogenRemaining: number;      // 0-100%
  glycogenWithoutNutrition: number; // 0-100% (courbe sans apport)
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
// BASIC MODE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface BasicSimulationResult {
  mode: 'basic';
  raceType: RaceType;
  raceLabel: string;
  ambition: AmbitionLevel;
  ambitionLabel: string;
  
  // Zone d'intensité conseillée
  intensityZone: BasicIntensityZone;
  intensityZoneLabel: string;
  intensityZoneDescription: string;
  
  // Indice global de risque
  globalRiskLevel: BasicRiskLevel;
  globalRiskLabel: string;
  
  // Messages clairs
  primaryMessage: string;
  secondaryMessages: string[];
  
  // Scénarios simples (sans détails)
  scenarioLabels: { conservative: string; optimal: string; aggressive: string };
  recommendedScenario: ScenarioType;
  
  // Garde-fous
  guardrails: SimulationGuardrail[];
  
  // Disclaimer
  disclaimer: string;
}

export interface ProSimulationResult extends RaceSimulationResult {
  mode: 'pro';
}

export type UnifiedSimulationResult = BasicSimulationResult | ProSimulationResult;

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
  world_class: 'World Class',
};

// Intensité cible par ambition (%FTP ou %VMA)
const AMBITION_INTENSITY: Record<RaceType, Record<AmbitionLevel, number>> = {
  'IM': { finish: 62, perf: 68, sub: 72, elite: 76, world_class: 79 },
  '70.3': { finish: 70, perf: 75, sub: 80, elite: 85, world_class: 88 },
  'Marathon': { finish: 65, perf: 72, sub: 78, elite: 82, world_class: 86 },
  'Semi': { finish: 72, perf: 78, sub: 84, elite: 88, world_class: 92 },
  '10km': { finish: 82, perf: 88, sub: 92, elite: 96, world_class: 100 },
};

// Durée référence par type/ambition (minutes)
const REFERENCE_DURATIONS: Record<RaceType, Record<AmbitionLevel, number>> = {
  'IM': { finish: 420, perf: 360, sub: 330, elite: 300, world_class: 270 },
  '70.3': { finish: 195, perf: 165, sub: 150, elite: 135, world_class: 122 },
  'Marathon': { finish: 300, perf: 240, sub: 210, elite: 180, world_class: 155 },
  'Semi': { finish: 135, perf: 105, sub: 95, elite: 80, world_class: 70 },
  '10km': { finish: 60, perf: 48, sub: 42, elite: 36, world_class: 32 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALISATION DES TYPES DE COURSE
// ═══════════════════════════════════════════════════════════════════════════════

const RACE_TYPE_ALIASES: Record<string, RaceType> = {
  'IM': 'IM',
  'Ironman': 'IM',
  'ironman': 'IM',
  'IRONMAN': 'IM',
  '70.3': '70.3',
  '703': '70.3',
  'Half': '70.3',
  'half': '70.3',
  'HALF': '70.3',
  'Marathon': 'Marathon',
  'marathon': 'Marathon',
  'MARATHON': 'Marathon',
  'Semi': 'Semi',
  'semi': 'Semi',
  'SEMI': 'Semi',
  'SemiMarathon': 'Semi',
  'Semi-Marathon': 'Semi',
  '10km': '10km',
  '10K': '10km',
  '10k': '10km',
};

/**
 * Normalise un type de course vers les valeurs supportées
 */
export function normalizeRaceType(input: string): RaceType {
  const normalized = RACE_TYPE_ALIASES[input];
  if (normalized) return normalized;
  
  // Fallback: essayer de détecter par contenu
  const lower = input.toLowerCase();
  if (lower.includes('ironman') || lower === 'im') return 'IM';
  if (lower.includes('70.3') || lower === '703' || lower.includes('half')) return '70.3';
  if (lower.includes('marathon') && !lower.includes('semi')) return 'Marathon';
  if (lower.includes('semi')) return 'Semi';
  if (lower.includes('10')) return '10km';
  
  // Default to 70.3 as safe middle ground
  return '70.3';
}

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

  philosophy: `TFCL privilégie toujours une décision robuste à une précision illusoire.
La version BASIC est volontairement prudente.
La version PRO apporte plus de finesse, pas plus de certitude.`,

  basicDescription: `Version simplifiée basée sur des indicateurs robustes. 
Recommandée si les données sont partielles.`,

  proDescription: `Version avancée intégrant VLamax, TTE, FatMax et nutrition. 
Recommandée pour une analyse staff.`,
};

export const SIMULATION_MODE_LABELS: Record<SimulationMode, { label: string; badge: string; description: string }> = {
  basic: {
    label: "BASIC – Décision robuste",
    badge: "BASIC",
    description: "Version simplifiée basée sur des indicateurs robustes. Recommandée si les données sont partielles.",
  },
  pro: {
    label: "PRO – Analyse complète",
    badge: "PRO",
    description: "Version avancée intégrant VLamax, TTE, FatMax et nutrition. Recommandée pour une analyse staff.",
  },
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

export const SIMULATION_ACADEMY_BASIC = {
  title: "Simulation BASIC : décider sans sur-précision",
  sections: [
    {
      title: "Pourquoi une version BASIC ?",
      content: `La version BASIC n'est PAS une version dégradée. 
Elle est volontairement plus conservative et plus robuste.
Idéale quand les données sont incomplètes ou pour une première approche.`,
    },
    {
      title: "Ce qui est utilisé",
      content: `• Type de course et allure cible
• Disponibilité TFCL™ (état du jour)
• Potentiel Physiologique V2 (potentiel global)
Pas de chiffres VLamax ou TTE explicites.`,
    },
    {
      title: "Ce qui est affiché",
      content: `• Zone d'intensité : Sous contrôle / Limite / À risque
• Indice global : LOW / MODERATE / HIGH
• Messages clairs et actionnables`,
    },
    {
      title: "Quand l'utiliser ?",
      content: `• Première course sur un format
• Données physiologiques incomplètes
• Besoin d'une décision rapide et sûre`,
    },
  ],
};

export const SIMULATION_ACADEMY_PRO = {
  title: "Simulation PRO : exploiter VLamax, TTE et FatMax",
  sections: [
    {
      title: "Données requises",
      content: `• VLamax (discipline pertinente, vélo ou CAP)
• TTE effectif
• FatMax TFCL™ (plage)
• Disponibilité TFCL™
Sans ces données, la version PRO reste accessible mais avec confiance réduite.`,
    },
    {
      title: "Analyse segment par segment",
      content: `La version PRO décompose la course en segments (10% distance).
Pour chaque segment : risque glycogène, intensité relative, RPE estimé.
Identification du "point de bascule" où le risque devient critique.`,
    },
    {
      title: "Comparaison de scénarios",
      content: `• Conservateur : finish quasi-garanti, marge de sécurité
• Optimal : équilibre risque/performance
• Agressif : performance maximale, risque de défaillance élevé`,
    },
    {
      title: "Nutrition intégrée",
      content: `Les g/h planifiés sont intégrés dans le modèle Fuel & Risk.
La simulation montre l'impact de la nutrition sur les réserves glycogène.
Avertissement si apports insuffisants pour la durée de course.`,
    },
    {
      title: "Quand l'utiliser ?",
      content: `• Profil physiologique bien documenté
• Course importante avec objectif chrono
• Analyse staff avant briefing`,
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

// ─────────────────────────────────────────────────────────────────────────────
// MODÈLE THERMIQUE CONTINU (Périard 2021, Racinais 2015, Junge 2016)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Pénalité thermique non-linéaire (fraction de ralentissement perf).
 * - Continu si ambientTempC fourni (avec humidité + acclimatation)
 * - Fallback discret sur HeatCondition sinon
 * Modèle: Teq ≈ T + 0.3 × max(0, RH - 40)
 *         pénalité ≈ 0.005 × max(0, Teq - 18)^1.4 ; acclimaté ×0.65
 */
function computeHeatPenalty(
  ambientTempC: number | null | undefined,
  humidityPct: number | null | undefined,
  acclimatized: boolean | null | undefined,
  fallbackHeat: HeatCondition
): number {
  if (typeof ambientTempC === 'number' && Number.isFinite(ambientTempC)) {
    const rh = typeof humidityPct === 'number' ? Math.max(0, Math.min(100, humidityPct)) : 50;
    const equivalentTempC = ambientTempC + 0.3 * Math.max(0, rh - 40);
    const excess = Math.max(0, equivalentTempC - 18);
    let penalty = 0.005 * Math.pow(excess, 1.4);
    if (acclimatized) penalty *= 0.65;
    return Math.min(penalty, 0.25);
  }
  switch (fallbackHeat) {
    case 'high':     return 0.10;
    case 'moderate': return 0.04;
    case 'low':
    default:         return 0.0;
  }
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
  plannedCarbsGH: number | null,
  gutTraining: boolean,
  scenarioType?: ScenarioType,
  readinessModifiers?: SimulationModifiers | null
): number {
  let risk = 0;
  
  // F38-bis: FatMax manquant → skip la contribution FatMax (pas de valeur fantôme 70).
  const fatmaxShift = readinessModifiers?.fatmaxShiftPct ?? 0;
  const fatmaxRaw = fatmaxMax ?? fatmaxCenter;
  const fatmax = fatmaxRaw != null ? fatmaxRaw + fatmaxShift : null;

  // Facteur scénario pour le risque
  const scenarioRiskFactor = scenarioType === 'conservative' ? 0.6 
    : scenarioType === 'aggressive' ? 1.5 
    : 1.0;

  if (fatmax != null) {
    const intensityDelta = intensityPct - fatmax;
    if (intensityDelta > 0) {
      // Au-dessus de FatMax → dépendance glucidique - impact plus fort
      risk += (25 + Math.min(40, intensityDelta * 3)) * scenarioRiskFactor;
    } else {
      // En dessous de FatMax → faible risque (encore plus faible en conservateur)
      risk += Math.max(0, 10 + intensityDelta) * scenarioRiskFactor;
    }
  }

  // VLamax adjustment - impact plus prononcé (F38-bis: skip si manquant)
  if (vlamaxEffectif != null && vlamaxEffectif > 0) {
    const vlamax = vlamaxEffectif;
    if (vlamax > 0.5) {
      risk += (20 + (vlamax - 0.5) * 80) * scenarioRiskFactor;
    } else if (vlamax < 0.35) {
      risk -= 15; // Bonus métabolisme aérobie plus fort
    }
  }
  
  // TTE adjustment - appliquer multiplicateur si présent
  // F38: si tteMin manquant, on n'applique aucune correction (pas de défaut 45 fictif)
  const tteUsableMultiplier = readinessModifiers?.tteUsableMultiplier ?? 1.0;
  const tte = tteMin != null && tteMin > 0 ? tteMin * tteUsableMultiplier : null;
  if (tte != null && tte < 40) {
    risk += (12 + (40 - tte) * 1.5) * scenarioRiskFactor;
  } else if (tte != null && tte > 60) {
    risk -= 8; // Bonus durabilité plus fort
  }
  
  // Appliquer élargissement des zones de risque si présent
  const riskZoneWidening = readinessModifiers?.riskZoneWidening ?? 1.0;
  
  // Progression fatigue (segments tardifs = plus risqués) - progression non-linéaire
  const progressionFactor = Math.pow(segmentIndex / totalSegments, 1.5);
  risk += progressionFactor * 25 * scenarioRiskFactor * riskZoneWidening;
  
  // Mitigation nutrition – basée sur l'absorption intestinale réelle
  if (plannedCarbsGH && plannedCarbsGH > 0) {
    const absorbedGH = computeAbsorbedCarbsGH(plannedCarbsGH, gutTraining);
    const nutritionMitigation = Math.min(30, (absorbedGH / 60) * 25);
    risk -= nutritionMitigation;
  }
  
  return clamp(risk, 0, 100);
}

/**
 * Modèle d'absorption intestinale des glucides (Jeukendrup 2014, 2017)
 * - Glucose seul: max ~60 g/h (transporteur SGLT1 saturé)
 * - Glucose + Fructose (2:1): max ~90 g/h
 * - Gut training avancé: jusqu'à ~120 g/h (Pfeiffer 2012, Ironman data)
 * Retourne les g/h réellement absorbés (plafond intestinal appliqué)
 */
function computeAbsorbedCarbsGH(plannedCarbsGH: number, gutTraining: boolean = false): number {
  if (plannedCarbsGH <= 0) return 0;
  
  // Absorption glucose seul: saturation SGLT1 à ~60g/h
  const glucoseMax = 60; // g/h
  // Avec fructose (GLUT5): +30g/h via transporteur distinct
  const fructoseMax = 30; // g/h
  // Gut training: étend le plafond de ~10-20%
  const gutTrainingBonus = gutTraining ? 1.15 : 1.0;
  
  // On suppose un ratio glucose:fructose 2:1 si apport > 60g/h
  let absorbed: number;
  if (plannedCarbsGH <= glucoseMax) {
    // Tout passe par SGLT1, absorption quasi-linéaire
    absorbed = plannedCarbsGH * 0.92; // ~8% de pertes GI
  } else {
    // Au-delà de 60g/h, le surplus passe par fructose (GLUT5)
    const glucoseAbsorbed = glucoseMax * 0.95;
    const fructoseIntake = plannedCarbsGH - glucoseMax;
    const fructoseAbsorbed = Math.min(fructoseMax, fructoseIntake) * 0.90;
    absorbed = glucoseAbsorbed + fructoseAbsorbed;
  }
  
  // Appliquer bonus gut training
  absorbed *= gutTrainingBonus;
  
  // Plafond absolu physiologique: 120g/h
  return Math.min(120, absorbed);
}

/**
 * Calcule le glycogène restant (simulation)
 * Modèle basé sur la dépense glucidique brute vs absorption nette
 * 
 * Réserves musculaires typiques: ~400-500g glycogène (= 100%)
 * La courbe reflète: dépense brute - absorption réelle = déplétion nette
 */
function computeGlycogenRemaining(
  segmentIndex: number,
  totalSegments: number,
  intensityPct: number,
  fatmaxCenter: number | null,
  vlamaxEffectif: number | null,
  plannedCarbsGH: number | null,
  gutTraining: boolean,
  scenarioType?: ScenarioType,
  readinessModifiers?: SimulationModifiers | null,
  totalRaceDurationMin?: number | null,
  weightKg?: number | null,
  carbLoaded?: boolean,
  tteMin?: number | null
): number {
  // ─────────────────────────────────────────────────────────────────
  // STOCK GLYCOGÉNIQUE DYNAMIQUE (Areta 2018, Burke 2017, Jeukendrup 2014)
  // Référence: 12-15 g/kg de masse corporelle (musculaire + hépatique)
  // - Sans carb-loading: ~12 g/kg
  // - Avec carb-loading (>8 g/kg/j x 2-3j): ~15 g/kg
  // Fallback à 450g si poids inconnu (athlète ~65 kg non chargé)
  // ─────────────────────────────────────────────────────────────────
  const baseGlycogenPerKg = carbLoaded ? 15 : 12;
  const totalGlycogenG = weightKg && weightKg > 0
    ? weightKg * baseGlycogenPerKg
    : 450;
  
  // Appliquer le décalage FatMax si modificateurs présents
  const fatmaxShift = readinessModifiers?.fatmaxShiftPct ?? 0;
  const fatmax = (fatmaxCenter ?? 70) + fatmaxShift;
  const intensityDelta = intensityPct - fatmax;
  
  // ─────────────────────────────────────────────────────────────────
  // FIX P1: Courbe glucidique NON-LINÉAIRE au-dessus de FatMax
  // Référence: Romijn 1993, Frandsen 2017, Maunder 2018
  // Au-dessus de FatMax la dépendance glucidique suit une croissance
  // exponentielle douce (saturation ~3.5-4.5 g/min selon profil).
  // ─────────────────────────────────────────────────────────────────
  let carbBurnGPerMin: number;
  if (intensityDelta > 0) {
    // Modèle exponentiel saturé: y = a + (max-a) * (1 - exp(-k*Δ))
    const baseAt0 = 1.2;          // g/min à FatMax
    const ceiling = 4.2;          // g/min plafond physiologique
    const k = 0.06;               // pente de croissance
    carbBurnGPerMin = baseAt0 + (ceiling - baseAt0) * (1 - Math.exp(-k * intensityDelta));
  } else {
    // En dessous FatMax: dépendance lipidique dominante, faible burn glucidique
    carbBurnGPerMin = Math.max(0.4, 1.0 + intensityDelta * 0.025);
  }
  
  // ─────────────────────────────────────────────────────────────────
  // FIX P1: VLamax — relation NON-LINÉAIRE (Mader-Heck, Quittmann 2025)
  // Exposant 0.85 (audit littérature 2024-2025): saturation de l'impact
  // glycolytique aux VLamax très élevées (au-delà de 0.7 mmol/L/s).
  // VLamax 0.35 → ×1.0 ; 0.55 → ×1.40 ; 0.75 → ×1.83
  // ─────────────────────────────────────────────────────────────────
  const vlamax = vlamaxEffectif ?? 0.45;
  const vlamaxMultiplier = Math.pow(vlamax / 0.35, 0.85);
  carbBurnGPerMin *= clamp(vlamaxMultiplier, 0.7, 2.2);
  
  // Facteur scénario
  let scenarioFactor = 1.0;
  if (scenarioType === 'conservative') scenarioFactor = 0.75;
  else if (scenarioType === 'aggressive') scenarioFactor = 1.35;
  
  // Multiplicateur readiness
  const glycogenDepletionMultiplier = readinessModifiers?.glycogenDepletionRateMultiplier ?? 1.0;
  
  // ─────────────────────────────────────────────────────────────────
  // FIX P2: Fatigue progressive MODULÉE PAR DURABILITÉ (TTE)
  // Référence: Maunder 2021, Clark 2022 — la durabilité (TTE long)
  // atténue la dérive du coût glucidique en fin de course.
  //   TTE 60min+ : +8%   |   TTE 45min : +15%   |   TTE 25min : +30%
  // ─────────────────────────────────────────────────────────────────
  // F38: si TTE manquant, on choisit le facteur médian (≈ TTE 45) sans prétendre l'avoir mesuré
  const tteRef = tteMin != null && tteMin > 0 ? tteMin : 45;
  const durabilityFactor = clamp(0.40 - (tteRef - 25) * 0.0089, 0.08, 0.35);
  const progressionFactor = 1 + Math.pow(segmentIndex / totalSegments, 1.2) * durabilityFactor;
  
  // ─────────────────────────────────────────────────────────────────
  // FIX P0: Durée réelle du segment (bug critique corrigé)
  // Avant: 60/totalSegments → assumait 1h de course quelle que soit la distance
  // Conséquence: déplétion sous-estimée ~6-10× sur IM/Marathon
  // Maintenant: durée totale réelle / nombre de segments
  // ─────────────────────────────────────────────────────────────────
  const effectiveTotalDurationMin = totalRaceDurationMin && totalRaceDurationMin > 0
    ? totalRaceDurationMin
    : 60; // fallback historique
  const segmentDurationMin = effectiveTotalDurationMin / totalSegments;
  const carbBurnPerSegment = carbBurnGPerMin * segmentDurationMin * scenarioFactor * glycogenDepletionMultiplier * progressionFactor;
  
  // Absorption nette par segment (g) – modèle intestinal réel
  const absorbedGH = computeAbsorbedCarbsGH(plannedCarbsGH ?? 0, gutTraining);
  const absorbedPerSegment = (absorbedGH / 60) * segmentDurationMin; // g absorbés ce segment
  
  // Déplétion nette cumulée
  let cumulativeDepletion = 0;
  for (let s = 0; s <= segmentIndex; s++) {
    const segProgression = 1 + Math.pow(s / totalSegments, 1.2) * durabilityFactor;
    const segBurn = carbBurnGPerMin * segmentDurationMin * scenarioFactor * glycogenDepletionMultiplier * segProgression;
    const netBurn = Math.max(0, segBurn - absorbedPerSegment);
    cumulativeDepletion += netBurn;
  }
  
  const remaining = ((totalGlycogenG - cumulativeDepletion) / totalGlycogenG) * 100;
  return clamp(remaining, 0, 100);
}

// ═══════════════════════════════════════════════════════════════════════════════
// GÉNÉRATION DES SCÉNARIOS
// ═══════════════════════════════════════════════════════════════════════════════

function generateScenario(
  type: ScenarioType,
  input: RaceSimulationInput,
  baseIntensity: number,
  baseDuration: number,
  readinessModifiers?: SimulationModifiers | null
): PacingScenario {
  // Vérifier si ce scénario est autorisé par les modificateurs
  const allowedScenarios = readinessModifiers?.allowedScenarios ?? ['conservative', 'optimal', 'aggressive'];
  const isScenarioAllowed = allowedScenarios.includes(type);
  
  // Ajustements par type de scénario - intensité nettement différenciée
  const intensityOffset: Record<ScenarioType, number> = {
    conservative: -10,  // Beaucoup plus conservateur
    optimal: 0,
    aggressive: +8,     // Plus agressif
  };
  
  // Durées nettement différenciées entre scénarios (impact visible sur le temps)
  const durationMultiplier: Record<ScenarioType, number> = {
    conservative: 1.10,   // +10% temps (finisher secure)
    optimal: 1.0,
    aggressive: 0.92,     // -8% temps (chrono ambitieux)
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
      label: isScenarioAllowed 
        ? "Agressif" 
        : "Agressif (non disponible)",
      description: isScenarioAllowed
        ? "Performance maximale mais risque élevé de défaillance. Réservé aux conditions idéales."
        : "Ce scénario est désactivé en raison de la disponibilité physiologique actuelle.",
    },
  };
  
  // Appliquer les multiplicateurs FTP/seuil effectifs
  const ftpMultiplier = readinessModifiers 
    ? (readinessModifiers.effectiveFtpMultiplier[0] + readinessModifiers.effectiveFtpMultiplier[1]) / 2
    : 1.0;
  
  // Ajuster l'intensité de base selon les modificateurs
  const adjustedBaseIntensity = baseIntensity * ftpMultiplier;
  
  const targetIntensity = clamp(adjustedBaseIntensity + intensityOffset[type], 50, 98);
  const estimatedDuration = baseDuration * durationMultiplier[type];
  
  // ─────────────────────────────────────────────────────────────────
  // FIX P1: Modèle thermique CONTINU (Périard 2021, Racinais 2015,
  //          Junge 2016 — humidité + acclimatation)
  // Si ambientTempC fourni → calcul WBGT-like, sinon fallback discret.
  // Pénalité non-linéaire au-delà de 18°C (seuil endurance).
  // ─────────────────────────────────────────────────────────────────
  const heatPenalty = computeHeatPenalty(
    input.ambientTempC,
    input.humidityPct,
    input.acclimatized,
    input.heat
  );
  
  let conditionFactor = 1.0 + heatPenalty;
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
    // Appliquer les options de pacing selon les modificateurs
    const negativeSplitAllowed = readinessModifiers?.negativeSplitAllowed ?? false;
    const lateBoostAllowed = readinessModifiers?.lateRaceIntensityBoostAllowed ?? false;
    
    let segmentIntensity: number;
    if (negativeSplitAllowed && type === 'aggressive' && i >= numSegments - 3) {
      // Negative split : intensité croissante en fin de course (mode BLUE uniquement)
      segmentIntensity = targetIntensity + ((i - (numSegments - 3)) * 1.5);
    } else if (lateBoostAllowed && type === 'aggressive' && i === numSegments - 1) {
      // Boost final autorisé
      segmentIntensity = targetIntensity + 3;
    } else {
      // Légère dérive naturelle
      segmentIntensity = targetIntensity - (i * 0.5);
    }
    
    const gutTraining = input.gutTraining ?? false;
    
    const fuelRisk = computeSegmentFuelRisk(
      targetIntensity,
      input.fatmaxCenterPct,
      input.fatmaxRange?.[1] ?? null,
      input.vlamaxEffectif,
      input.tteMin,
      i,
      numSegments,
      input.plannedCarbsGH,
      gutTraining,
      type,
      readinessModifiers
    );
    
    const glycogenRemaining = computeGlycogenRemaining(
      i,
      numSegments,
      targetIntensity,
      input.fatmaxCenterPct,
      input.vlamaxEffectif,
      input.plannedCarbsGH,
      gutTraining,
      type,
      readinessModifiers,
      adjustedDuration,
      input.weight,
      input.gutTraining, // proxy carb-loading (préparation nutritionnelle)
      input.tteMin
    );
    
    // Courbe sans nutrition pour comparaison
    const glycogenWithoutNutrition = computeGlycogenRemaining(
      i,
      numSegments,
      targetIntensity,
      input.fatmaxCenterPct,
      input.vlamaxEffectif,
      0, // pas d'apport
      false,
      type,
      readinessModifiers,
      adjustedDuration,
      input.weight,
      false,
      input.tteMin
    );
    
    // Détecter point de bascule
    if (!breakpointKm && fuelRisk >= 60) {
      breakpointKm = segmentDistance * i;
      breakpointRisk = `Risque glycogène élevé à partir du km ${Math.round(breakpointKm)}`;
    }
    
    const notes: string[] = [];
    if (fuelRisk >= 70) notes.push("Zone critique glycogène");
    if (glycogenRemaining < 20) notes.push("Réserves critiques (< 20% — seuil d'effondrement, Coyle/Rauch)");
    else if (glycogenRemaining < 30) notes.push("Réserves faibles");
    if (i >= numSegments - 2) notes.push("Phase finale");
    
    segments.push({
      segmentIndex: i,
      distanceKm: segmentDistance * (i + 1),
      durationMin: segmentDuration * (i + 1),
      intensityPct: segmentIntensity,
      fuelRiskIndex: fuelRisk,
      depletionRisk: getDepletionRisk(fuelRisk),
      glycogenRemaining,
      glycogenWithoutNutrition,
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
  if (type === 'aggressive') {
    strengths.push("Chrono optimal si conditions parfaites");
  }
  
  // Plage de temps plus étroite par scénario
  // Plages de temps beaucoup plus étroites (2-3%)
  const timeVariation = type === 'conservative' ? 0.025 : type === 'aggressive' ? 0.03 : 0.02;
  
  return {
    type,
    label: scenarioLabels[type].label,
    description: scenarioLabels[type].description,
    targetIntensityPct: targetIntensity,
    targetIntensityRange: [targetIntensity - 1, targetIntensity + 1],
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
  // Normaliser le type de course pour éviter les erreurs d'accès
  const raceType = normalizeRaceType(input.raceType);
  
  const distanceKm = input.distanceKm ?? RACE_DISTANCES[raceType];
  const baseIntensity = AMBITION_INTENSITY[raceType]?.[input.ambition] ?? 70;

  // ─────────────────────────────────────────────────────────────────────────────
  // Durée de référence : priorité à la physiologie réelle de l'athlète.
  // Pour les courses CAP (10km/Semi/Marathon), AMBITION_INTENSITY = %VMA → on
  // dérive le temps cible depuis VMA × %VMA plutôt qu'une table figée par
  // ambition (qui sous-estimait grossièrement les athlètes à VMA élevée).
  // Fallback à REFERENCE_DURATIONS uniquement si VMA absente.
  // ─────────────────────────────────────────────────────────────────────────────
  const isRunRace = raceType === '10km' || raceType === 'Semi' || raceType === 'Marathon';
  let physioDuration: number | null = null;
  if (isRunRace && input.vma != null && input.vma > 0) {
    const targetSpeedKmh = input.vma * (baseIntensity / 100);
    if (targetSpeedKmh > 0) {
      physioDuration = (distanceKm / targetSpeedKmh) * 60; // min
    }
  }
  const baseDuration =
    input.targetDurationMin
    ?? physioDuration
    ?? REFERENCE_DURATIONS[raceType]?.[input.ambition]
    ?? 180;
  
  // Récupérer les modificateurs Potentiel Physiologique
  const readinessModifiers = input.readinessModifiers;
  
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
  
  // Ajouter source si modificateurs appliqués
  if (readinessModifiers) {
    sourcesUsed.push("Potentiel Physiologique Modifiers");
  }
  
  // Déterminer les scénarios autorisés
  const allowedScenarios = readinessModifiers?.allowedScenarios ?? ['conservative', 'optimal', 'aggressive'];
  
  // Générer les 3 scénarios avec modificateurs
  const scenarios: PacingScenario[] = [
    generateScenario('conservative', input, baseIntensity, baseDuration, readinessModifiers),
    generateScenario('optimal', input, baseIntensity, baseDuration, readinessModifiers),
    generateScenario('aggressive', input, baseIntensity, baseDuration, readinessModifiers),
  ];
  
  // Recommandation — prendre en compte les scénarios autorisés par Potentiel Physiologique
  let recommendedScenario: ScenarioType = 'optimal';
  
  // Si scénario agressif non autorisé par les modificateurs, ne jamais le recommander
  const canRecommendAggressive = allowedScenarios.includes('aggressive');
  
  if (input.disponibiliteScore && input.disponibiliteScore < 50) {
    recommendedScenario = 'conservative';
  }
  if (input.injuryRiskLevel === 'high' || input.injuryRiskLevel === 'critical') {
    recommendedScenario = 'conservative';
  }
  if (canRecommendAggressive && input.ambition === 'elite' && input.disponibiliteScore && input.disponibiliteScore > 70) {
    recommendedScenario = 'aggressive';
  }
  
  // Si le scénario optimal n'est pas autorisé, forcer conservateur
  if (!allowedScenarios.includes('optimal') && recommendedScenario === 'optimal') {
    recommendedScenario = 'conservative';
  }
  
  // Temps global
  const optimalScenario = scenarios.find(s => s.type === 'optimal')!;
  const conservativeScenario = scenarios.find(s => s.type === 'conservative')!;
  const aggressiveScenario = scenarios.find(s => s.type === 'aggressive')!;
  
  // Calculer la plage globale à partir des scénarios individuels
  // Au lieu d'utiliser les extrêmes, on utilise le scénario optimal comme référence
  const optimalCenter = optimalScenario.estimatedTimeMin;
  
  // Confiance basée sur les données disponibles
  let timeConfidence = 70; // Score sur 100
  if (missingData.length >= 2) timeConfidence -= 20;
  if (input.vlamaxConfidence < 0.6) timeConfidence -= 10;
  if (input.tteConfidence < 0.6) timeConfidence -= 10;
  
  // Bonus si données calibrées
  const hasCalibration = input.vlamaxEffectif !== null && input.tteMin !== null;
  if (hasCalibration && input.vlamaxConfidence >= 0.7) {
    timeConfidence += 10;
  }
  
  timeConfidence = clamp(timeConfidence, 30, 90);
  
  // ─────────────────────────────────────────────────────────────────
  // FIX P0: Incertitude alignée sur la littérature scientifique
  // Avant: ±2% (fausse précision — ~5min sur 4h irréaliste)
  // Maintenant: plancher ±5% conforme à l'état de l'art
  // (Maunder 2021, Joyner & Coyle 2008, Skiba 2014)
  // ─────────────────────────────────────────────────────────────────
  let uncertaintyPct: number;
  if (timeConfidence >= 75) {
    uncertaintyPct = 0.05; // ±5% — plancher scientifique réaliste
  } else if (timeConfidence >= 55) {
    uncertaintyPct = 0.07; // ±7%
  } else if (timeConfidence >= 40) {
    uncertaintyPct = 0.10; // ±10%
  } else {
    uncertaintyPct = 0.15; // ±15% (données très partielles)
  }
  
  // Calculer la plage finale en utilisant l'incertitude
  const timeRangeMin = optimalCenter * (1 - uncertaintyPct);
  const timeRangeMax = optimalCenter * (1 + uncertaintyPct);
  
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
  
  // Garde-fou pour les modificateurs Potentiel Physiologique
  if (readinessModifiers) {
    // Ajouter un avertissement si FTP/seuil effectif est réduit
    const ftpMultiplier = (readinessModifiers.effectiveFtpMultiplier[0] + readinessModifiers.effectiveFtpMultiplier[1]) / 2;
    if (ftpMultiplier < 0.97) {
      guardrails.push({
        type: 'warning',
        icon: '⚡',
        title: "Paramètres ajustés",
        message: `FTP effectif réduit à ${Math.round(ftpMultiplier * 100)}% • FatMax décalé de ${readinessModifiers.fatmaxShiftPct}% en raison de la disponibilité.`,
      });
    }
    
    // Avertir si scénario agressif désactivé
    if (!readinessModifiers.allowedScenarios.includes('aggressive')) {
      guardrails.push({
        type: 'warning',
        icon: '🚫',
        title: "Scénario agressif non disponible",
        message: "La disponibilité physiologique actuelle ne permet pas un scénario agressif.",
      });
    }
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
    timeConfidence: timeConfidence / 100, // Normaliser en 0-1 pour compatibilité
    timeConfidenceLabel: timeConfidence >= 75 ? "Haute" : timeConfidence >= 55 ? "Moyenne" : timeConfidence >= 40 ? "Limitée" : "Faible",
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
// BASIC MODE SIMULATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface BasicSimulationInput {
  raceType: RaceType;
  ambition: AmbitionLevel;
  heat: HeatCondition;
  terrain: TerrainType;
  
  // Données simplifiées
  disponibiliteScore: number | null;
  disponibiliteLevel: string | null;
  potentielPhysiologiqueScore?: number | null; // 0-100
  ftp?: number | null;
  vma?: number | null;
  paceThreshold?: number | null;
  injuryRiskLevel?: string | null;
}

/**
 * Calcule la zone d'intensité BASIC
 */
function computeBasicIntensityZone(
  ambition: AmbitionLevel,
  disponibiliteScore: number | null,
  potentielPhysiologiqueScore: number | null
): { zone: BasicIntensityZone; label: string; description: string } {
  const dispo = disponibiliteScore ?? 70;
  const readiness = potentielPhysiologiqueScore ?? 70;
  const globalScore = (dispo + readiness) / 2;
  
  // Ajustement selon ambition
  const ambitionPenalty: Record<AmbitionLevel, number> = {
    finish: 0,
    perf: 10,
    sub: 20,
    elite: 30,
    world_class: 40,
  };
  
  const adjustedScore = globalScore - ambitionPenalty[ambition];
  
  if (adjustedScore >= 60) {
    return {
      zone: 'controlled',
      label: "Sous contrôle",
      description: "Ce scénario est compatible avec ton état actuel.",
    };
  } else if (adjustedScore >= 40) {
    return {
      zone: 'limit',
      label: "Limite",
      description: "Risque de dérive si pacing agressif. Prudence recommandée.",
    };
  } else {
    return {
      zone: 'at_risk',
      label: "À risque",
      description: "Disponibilité insuffisante pour ce scénario.",
    };
  }
}

/**
 * Calcule le risque global BASIC
 */
function computeBasicGlobalRisk(
  ambition: AmbitionLevel,
  heat: HeatCondition,
  terrain: TerrainType,
  disponibiliteScore: number | null,
  injuryRiskLevel: string | null
): { level: BasicRiskLevel; label: string } {
  let riskScore = 0;
  
  // Ambition
  const ambitionRisk: Record<AmbitionLevel, number> = {
    finish: 0,
    perf: 15,
    sub: 30,
    elite: 45,
    world_class: 55,
  };
  riskScore += ambitionRisk[ambition];
  
  // Conditions
  if (heat === 'high') riskScore += 20;
  else if (heat === 'moderate') riskScore += 10;
  
  if (terrain === 'hilly') riskScore += 15;
  
  // Disponibilité
  const dispo = disponibiliteScore ?? 70;
  if (dispo < 50) riskScore += 25;
  else if (dispo < 70) riskScore += 10;
  
  // Risque blessure
  if (injuryRiskLevel === 'high' || injuryRiskLevel === 'critical') {
    riskScore += 20;
  }
  
  if (riskScore >= 60) return { level: 'HIGH', label: "Élevé" };
  if (riskScore >= 30) return { level: 'MODERATE', label: "Modéré" };
  return { level: 'LOW', label: "Faible" };
}

export function computeBasicSimulation(input: BasicSimulationInput): BasicSimulationResult {
  // Normaliser le type de course
  const raceType = normalizeRaceType(input.raceType);
  const raceLabel = RACE_LABELS[raceType] ?? input.raceType;
  const ambitionLabel = AMBITION_LABELS[input.ambition] ?? input.ambition;
  
  // Zone d'intensité
  const intensityResult = computeBasicIntensityZone(
    input.ambition,
    input.disponibiliteScore,
    input.potentielPhysiologiqueScore ?? null
  );
  
  // Risque global
  const riskResult = computeBasicGlobalRisk(
    input.ambition,
    input.heat,
    input.terrain,
    input.disponibiliteScore,
    input.injuryRiskLevel ?? null
  );
  
  // Messages
  const secondaryMessages: string[] = [];
  
  if (input.disponibiliteScore && input.disponibiliteScore < 50) {
    secondaryMessages.push("Disponibilité insuffisante pour un scénario agressif.");
  }
  if (input.heat === 'high') {
    secondaryMessages.push("Chaleur forte : adapter l'hydratation et le pacing.");
  }
  if (input.terrain === 'hilly') {
    secondaryMessages.push("Dénivelé : gérer l'effort dans les montées.");
  }
  if (input.injuryRiskLevel === 'high' || input.injuryRiskLevel === 'critical') {
    secondaryMessages.push("Risque blessure élevé : privilégier un scénario conservateur.");
  }
  
  // Scénario recommandé
  let recommendedScenario: ScenarioType = 'optimal';
  if (riskResult.level === 'HIGH' || intensityResult.zone === 'at_risk') {
    recommendedScenario = 'conservative';
  }
  
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
  
  return {
    mode: 'basic',
    raceType: input.raceType,
    raceLabel,
    ambition: input.ambition,
    ambitionLabel,
    intensityZone: intensityResult.zone,
    intensityZoneLabel: intensityResult.label,
    intensityZoneDescription: intensityResult.description,
    globalRiskLevel: riskResult.level,
    globalRiskLabel: riskResult.label,
    primaryMessage: intensityResult.description,
    secondaryMessages,
    scenarioLabels: {
      conservative: "Conservateur – finish quasi-garanti",
      optimal: "Optimal – équilibre risque/performance",
      aggressive: "Agressif – performance maximale, risque élevé",
    },
    recommendedScenario,
    guardrails,
    disclaimer: SIMULATION_DEFINITIONS.disclaimer,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODE ELIGIBILITY CHECK
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProModeEligibility {
  eligible: boolean;
  missingData: string[];
  confidence: number;
  message: string;
}

export function checkProModeEligibility(input: RaceSimulationInput): ProModeEligibility {
  const missingData: string[] = [];
  
  if (input.vlamaxEffectif == null) missingData.push("VLamax");
  if (input.tteMin == null) missingData.push("TTE");
  if (input.fatmaxCenterPct == null) missingData.push("FatMax TFCL");
  if (input.disponibiliteScore == null) missingData.push("Disponibilité TFCL");
  
  const eligible = missingData.length <= 1;
  
  let confidence = 1.0 - (missingData.length * 0.2);
  if (input.vlamaxConfidence < 0.6) confidence -= 0.1;
  if (input.tteConfidence < 0.6) confidence -= 0.1;
  confidence = clamp(confidence, 0.3, 1.0);
  
  const message = eligible
    ? missingData.length === 0
      ? "Profil complet. Version PRO disponible avec confiance maximale."
      : `Version PRO disponible. Donnée manquante : ${missingData.join(', ')}.`
    : `Données insuffisantes pour la version PRO. La version BASIC est recommandée. Manquant : ${missingData.join(', ')}.`;
  
  return { eligible, missingData, confidence, message };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADDITIONAL UI HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function getBasicRiskColor(level: BasicRiskLevel): string {
  switch (level) {
    case 'LOW': return 'text-green-600 dark:text-green-400';
    case 'MODERATE': return 'text-amber-600 dark:text-amber-400';
    case 'HIGH': return 'text-red-600 dark:text-red-400';
  }
}

export function getBasicRiskBgColor(level: BasicRiskLevel): string {
  switch (level) {
    case 'LOW': return 'bg-green-100 dark:bg-green-900/30';
    case 'MODERATE': return 'bg-amber-100 dark:bg-amber-900/30';
    case 'HIGH': return 'bg-red-100 dark:bg-red-900/30';
  }
}

export function getIntensityZoneColor(zone: BasicIntensityZone): string {
  switch (zone) {
    case 'controlled': return 'text-green-600 dark:text-green-400';
    case 'limit': return 'text-amber-600 dark:text-amber-400';
    case 'at_risk': return 'text-red-600 dark:text-red-400';
  }
}

export function getIntensityZoneBgColor(zone: BasicIntensityZone): string {
  switch (zone) {
    case 'controlled': return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
    case 'limit': return 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800';
    case 'at_risk': return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
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

export const PDF_SIMULATION_BASIC_SECTION = {
  title: "Simulation de Course — VERSION BASIC",
  description: "Décision robuste basée sur indicateurs simplifiés",
  disclaimer: SIMULATION_DEFINITIONS.disclaimer,
};

export const PDF_SIMULATION_PRO_SECTION = {
  title: "Simulation de Course — VERSION PRO",
  description: "Analyse complète avec VLamax, TTE, FatMax",
  disclaimer: SIMULATION_DEFINITIONS.disclaimer,
};
