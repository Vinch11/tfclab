// =============================================
// PLANNER ADVISORY ENGINE
// Génère des suggestions d'adaptation basées sur les données physiologiques
// =============================================

import { format } from 'date-fns';
import { 
  PlannerAdvice, 
  AdvicePayload, 
  THRESHOLDS_BY_OBJECTIVE, 
  DEFAULT_THRESHOLDS 
} from '@/types/plannerAdvice';
import { VLamaxEffectif } from '@/lib/vlamaxEffectif';
import { TTEEffectif } from '@/lib/tteEffectif';
import { RaceReadinessEffectif } from '@/lib/raceReadinessEffectif';
import { RaceType } from '@/types/planner';

// =============================================
// TYPES D'ENTRÉE
// =============================================

export interface AdvisoryEngineInput {
  athleteId: string;
  objectif: RaceType;
  // Données du jour
  stressScore?: number | null;
  sleepQuality?: number | null;
  energyLevel?: number | null;
  // Données effectifs
  vlamaxEffectif?: VLamaxEffectif | null;
  tteEffectif?: TTEEffectif | null;
  raceReadiness?: RaceReadinessEffectif | null;
  // État du plan
  todayWorkoutType?: string | null;
  isWorkoutAdjusted?: boolean;
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export function generatePlannerAdvices(input: AdvisoryEngineInput): PlannerAdvice[] {
  const advices: PlannerAdvice[] = [];
  const now = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");
  const thresholds = THRESHOLDS_BY_OBJECTIVE[input.objectif] || DEFAULT_THRESHOLDS;

  // RÈGLE A - LIFE FIRST (Stress)
  const lifeFirstAdvice = evaluateLifeFirst(input, now, thresholds);
  if (lifeFirstAdvice) advices.push(lifeFirstAdvice);

  // RÈGLE B - TTE vs Cible
  const tteAdvice = evaluateTTE(input, now, thresholds);
  if (tteAdvice) advices.push(tteAdvice);

  // RÈGLE C - VLamax trop haut
  const vlamaxAdvice = evaluateVLamax(input, now, thresholds);
  if (vlamaxAdvice) advices.push(vlamaxAdvice);

  // RÈGLE D - Race Readiness fraîcheur
  const freshnessAdvice = evaluateFreshness(input, now);
  if (freshnessAdvice) advices.push(freshnessAdvice);

  // Trier par sévérité décroissante
  return advices.sort((a, b) => b.severity - a.severity);
}

// =============================================
// RÈGLE A - LIFE FIRST
// Si stress > 7 → remplacer par Z2
// =============================================

function evaluateLifeFirst(
  input: AdvisoryEngineInput, 
  now: string, 
  _thresholds: typeof DEFAULT_THRESHOLDS
): PlannerAdvice | null {
  const { athleteId, stressScore, isWorkoutAdjusted } = input;

  if (stressScore == null || stressScore <= 7) return null;

  // Si déjà ajusté, ne pas re-générer l'advice avec can_apply
  const alreadyApplied = isWorkoutAdjusted === true;

  return {
    id: `life_first_${athleteId}_${format(new Date(), 'yyyyMMdd')}`,
    athlete_id: athleteId,
    date_scope: 'TODAY',
    severity: 3, // Critique
    title: 'Stress élevé détecté',
    message: 'Séance adaptée automatiquement (Life-First). Le corps a besoin de récupération pour absorber la charge.',
    why: `Stress ${stressScore}/10 > 7 : préserver la qualité de récupération pour mieux absorber la charge. On ne construit pas la performance sur un corps stressé.`,
    suggested_action: 'REPLACE_TODAY_WITH_Z2',
    payload: {
      replaceWith: 'Z2_45',
      duration_min: 45,
    },
    can_apply: !alreadyApplied,
    created_at: now,
    source: 'life_first',
    auto_applied: alreadyApplied,
  };
}

// =============================================
// RÈGLE B - TTE vs CIBLE
// Si TTE < cible - 5 min → suggérer tempo/seuil long
// =============================================

function evaluateTTE(
  input: AdvisoryEngineInput, 
  now: string, 
  thresholds: typeof DEFAULT_THRESHOLDS
): PlannerAdvice | null {
  const { athleteId, tteEffectif, objectif } = input;

  if (!tteEffectif || tteEffectif.source === 'unknown') return null;

  const tte = tteEffectif.tte_min;
  const target = thresholds.tteTarget;
  const gap = target - tte;

  // Si TTE est suffisant ou proche, pas de suggestion
  if (gap <= 5) return null;

  // Déterminer la sévérité selon le gap
  const severity = gap > 15 ? 3 : gap > 10 ? 2 : 1;

  return {
    id: `tte_gap_${athleteId}_${format(new Date(), 'yyyyMMdd')}`,
    athlete_id: athleteId,
    date_scope: 'WEEK',
    severity: severity as 0 | 1 | 2 | 3,
    title: 'TTE insuffisant pour l\'objectif',
    message: 'Prioriser des blocs seuil/tempo longs pour développer l\'endurance au seuil.',
    why: `TTE actuel ${tte} min < cible ${target} min (objectif ${objectif}). L'endurance au seuil doit être développée pour tenir l'intensité sur la durée de course.`,
    suggested_action: 'SWAP_WORKOUT_TYPE',
    payload: {
      swapFrom: 'VO2',
      swapTo: 'TEMPO_LONG',
    },
    can_apply: true,
    created_at: now,
    source: 'tte',
  };
}

// =============================================
// RÈGLE C - VLAMAX TROP HAUT
// Si VLamax > seuil → favoriser Z2 + force basse cadence
// =============================================

function evaluateVLamax(
  input: AdvisoryEngineInput, 
  now: string, 
  thresholds: typeof DEFAULT_THRESHOLDS
): PlannerAdvice | null {
  const { athleteId, vlamaxEffectif, objectif } = input;

  if (!vlamaxEffectif || vlamaxEffectif.value == null) return null;

  const vlamax = vlamaxEffectif.value;
  const maxAllowed = thresholds.vlamaxMax;
  const ideal = thresholds.vlamaxIdeal;

  // Si VLamax est dans la cible, pas de suggestion
  if (vlamax <= maxAllowed) return null;

  // Calculer l'écart
  const excess = vlamax - maxAllowed;
  const severity = excess > 0.15 ? 3 : excess > 0.08 ? 2 : 1;

  // Message adapté selon l'objectif
  const isLongDistance = ['ironman', '70.3', 'marathon'].includes(objectif);

  return {
    id: `vlamax_high_${athleteId}_${format(new Date(), 'yyyyMMdd')}`,
    athlete_id: athleteId,
    date_scope: 'PHASE',
    severity: severity as 0 | 1 | 2 | 3,
    title: 'Profil trop glycolytique',
    message: isLongDistance 
      ? 'Favoriser Z2 long + force basse cadence pour baisser VLamax et améliorer l\'économie de carburant.'
      : 'VLamax au-dessus de l\'optimal. Intégrer des séances Z2 et force basse cadence.',
    why: `VLamax ${vlamax.toFixed(2)} > ${maxAllowed.toFixed(2)} (idéal ≤ ${ideal.toFixed(2)} pour ${objectif}). Une VLamax élevée augmente la dépendance aux glucides, risquant l'épuisement sur longue distance.`,
    suggested_action: 'SWAP_WORKOUT_TYPE',
    payload: {
      swapFrom: 'SPEED',
      swapTo: 'Z2_LONG',
      add: 'LOW_CADENCE_FORCE',
    },
    can_apply: true,
    created_at: now,
    source: 'vlamax',
  };
}

// =============================================
// RÈGLE D - RACE READINESS FRAÎCHEUR
// Si score fraîcheur faible → mini deload 48h
// =============================================

function evaluateFreshness(
  input: AdvisoryEngineInput, 
  now: string
): PlannerAdvice | null {
  const { athleteId, raceReadiness } = input;

  if (!raceReadiness) return null;

  // Vérifier le score de fraîcheur
  const freshnessScore = raceReadiness.details?.fraicheur ?? 25;
  const maxFreshness = 25; // Score max pour fraîcheur

  // Si fraîcheur > 50% du max, pas de suggestion
  if (freshnessScore > maxFreshness * 0.5) return null;

  // Vérifier aussi l'interprétation globale
  const isLowFreshness = freshnessScore <= maxFreshness * 0.4 || 
    raceReadiness.interpretation?.mainLimitations?.some(l => 
      l.toLowerCase().includes('fraîcheur') || l.toLowerCase().includes('fatigue')
    );

  if (!isLowFreshness) return null;

  const severity = freshnessScore <= maxFreshness * 0.25 ? 3 : freshnessScore <= maxFreshness * 0.35 ? 2 : 1;

  return {
    id: `freshness_low_${athleteId}_${format(new Date(), 'yyyyMMdd')}`,
    athlete_id: athleteId,
    date_scope: 'WEEK',
    severity: severity as 0 | 1 | 2 | 3,
    title: 'Fraîcheur insuffisante',
    message: 'Mini allègement 48–72h conseillé avant la prochaine séance qualité.',
    why: `Score fraîcheur ${freshnessScore}/${maxFreshness} bas + charge récente. Mieux vaut absorber la charge accumulée avant d'ajouter de l'intensité.`,
    suggested_action: 'DELOAD_48H',
    payload: {},
    can_apply: true,
    created_at: now,
    source: 'race_readiness',
  };
}

// =============================================
// HELPERS
// =============================================

export function getSeverityLabel(severity: 0 | 1 | 2 | 3): string {
  switch (severity) {
    case 3: return 'Critique';
    case 2: return 'Important';
    case 1: return 'Attention';
    default: return 'Info';
  }
}

export function getSeverityColor(severity: 0 | 1 | 2 | 3): string {
  switch (severity) {
    case 3: return 'text-red-400';
    case 2: return 'text-orange-400';
    case 1: return 'text-yellow-400';
    default: return 'text-blue-400';
  }
}

export function getSeverityBgColor(severity: 0 | 1 | 2 | 3): string {
  switch (severity) {
    case 3: return 'bg-red-500/10 border-red-500/50';
    case 2: return 'bg-orange-500/10 border-orange-500/50';
    case 1: return 'bg-yellow-500/10 border-yellow-500/50';
    default: return 'bg-blue-500/10 border-blue-500/50';
  }
}

export function getSourceIcon(source: PlannerAdvice['source']): string {
  switch (source) {
    case 'life_first': return '🧘';
    case 'tte': return '⏱️';
    case 'vlamax': return '⚡';
    case 'race_readiness': return '🎯';
    default: return '💡';
  }
}

export function getScopeLabel(scope: PlannerAdvice['date_scope']): string {
  switch (scope) {
    case 'TODAY': return 'Aujourd\'hui';
    case 'WEEK': return 'Cette semaine';
    case 'PHASE': return 'Phase actuelle';
    default: return scope;
  }
}
