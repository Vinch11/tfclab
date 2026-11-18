/** Read-only goal reading. Internal targets and extrapolations never establish priorities. */
import type { ObjectifType } from '@/types/athlete';
import type { RadarAxis } from './types';
import { assessVmaReference, getVmaReference } from './vmaReference';
import { computeFactorVerdict, type FactorEvidence } from './factorVerdict';

export const COMPASS_OBJECTIVES: Record<Exclude<ObjectifType, 'StartToRun'>, { label: string; focus: string }> = {
  '5K': { label: '5 km', focus: 'Réserve de vitesse et vitesse soutenable sur 5 km' },
  '10K': { label: '10 km', focus: 'Vitesse soutenable et maintien de l’allure sur 10 km' },
  Semi: { label: 'Semi-marathon', focus: 'Vitesse soutenable et endurance sur la distance' },
  Marathon: { label: 'Marathon', focus: 'Tenue de l’allure, endurance prolongée et alimentation' },
  Sprint: { label: 'Triathlon Sprint', focus: 'Capacités dans les trois disciplines et course après vélo' },
  Olympic: { label: 'Triathlon Olympique', focus: 'Vitesse soutenable dans les trois disciplines et enchaînement' },
  '703': { label: '70.3', focus: 'Endurance vélo et course après vélo, natation et alimentation' },
  IM: { label: 'Ironman', focus: 'Endurance prolongée, course après vélo, natation et alimentation' },
  Trail: { label: 'Trail', focus: 'Endurance et exigences du parcours : durée, dénivelé et terrain' },
  TrailShort: { label: 'Trail court', focus: 'Vitesse en montée, aisance en descente et tenue de l’effort' },
  TrailMountain: { label: 'Trail montagne', focus: 'Endurance en montée et descente, dénivelé et altitude' },
  TrailUltra: { label: 'Ultra-trail', focus: 'Endurance prolongée, terrain et alimentation' },
};

export type ObjectiveFactorStatus = 'priority' | 'confirm' | 'no_gap' | 'unavailable';
export interface ObjectiveFactor { key: string; label: string; status: ObjectiveFactorStatus; reason: string }
export const FACTOR_STATUS_LABELS: Record<ObjectiveFactorStatus, string> = {
  priority: 'À travailler en priorité', confirm: 'À confirmer', no_gap: 'Pas de manque apparent', unavailable: 'Non évaluable',
};

export function readObjectiveFactor(axis: RadarAxis, objective: string, ambition: string, evidence: FactorEvidence[] = []): ObjectiveFactor {
  const base = { key: axis.key, label: axis.label };
  if (axis.value == null || !Number.isFinite(axis.value) || axis.value <= 0) return { ...base, status: 'unavailable', reason: 'Mesure absente : aucun manque physiologique conclu.' };
  // Only explicitly supported observations may establish an objective priority.
  const supported = evidence.filter(e => e.referenceQuality === 'supported');
  const verdict = computeFactorVerdict(supported);
  if (verdict.kind === 'probable_limiter') return { ...base, status: 'priority', reason: supported.filter(e => e.status === 'deficit').map(e => e.detail).join(' ') };
  if (supported.some(e => e.status === 'deficit')) return { ...base, status: 'confirm', reason: 'Observations insuffisantes ou contradictoires pour retenir une priorité.' };
  if (supported.some(e => e.status === 'ok')) return { ...base, status: 'no_gap', reason: 'Observations compatibles avec le besoin retenu ; la réussite n’est pas garantie.' };
  const reference = axis.key === 'vma' ? getVmaReference(objective, ambition) : null;
  if (reference) {
    const assessment = assessVmaReference(axis.value, reference);
    return { ...base, status: 'confirm', reason: assessment.status === 'below'
      ? `${assessment.gapKmh?.toFixed(1)} km/h sous le scénario extrapolé : confronter aux performances et à la tenue de l’allure.`
      : 'Pas d’écart défavorable au scénario VMA ; ce scénario extrapolé ne valide pas le besoin de l’épreuve.' };
  }
  if (axis.target == null || axis.target <= 0) return { ...base, status: 'unavailable', reason: 'Valeur disponible, mais référence adaptée à l’objectif absente.' };
  return { ...base, status: 'confirm', reason: 'Comparaison à une cible interne : elle ne suffit pas à établir un manque pour cet objectif.' };
}

export function getObjectiveContext(objective: string) {
  return Object.entries(COMPASS_OBJECTIVES).find(([key]) => key === objective)?.[1] ?? null;
}