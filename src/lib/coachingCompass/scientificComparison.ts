import type { CoachingCompassInput, RadarAxis } from './types';
import { getTargetsForAmbition, getVmaTargetByAmbition, isKnownPhysiologicalObjective } from '@/lib/physiologicalTargets';
import { getVo2maxTarget } from '@/lib/v2/unifiedLimiterDetection';
import type { AmbitionLevel } from '@/types/ambitionLevel';

/** Compass-only hypotheses; never return these to the diagnostic or planner. */
export function comparisonAxes(input: CoachingCompassInput, axes: RadarAxis[]): RadarAxis[] {
  const ambition = input.ambition as AmbitionLevel;
  const known = isKnownPhysiologicalObjective(input.objectif) && ['finisher', 'age_group', 'competitor', 'elite', 'world_class'].includes(ambition);
  const targets = known ? getTargetsForAmbition(input.objectif, ambition) : null;
  return axes.map(axis => {
    const target = !targets || input.objectif === 'StartToRun' ? null
      : axis.key === 'vo2max' ? getVo2maxTarget(input.objectif, ambition, null)
      : axis.key === 'ftpkg' ? targets.ftp_kg_min
      : axis.key === 'tte' ? targets.tte_min
      : axis.key === 'vma' ? getVmaTargetByAmbition(input.objectif, ambition)
      : null;
    const score = axis.value != null && axis.value > 0 && target != null && target > 0
      ? Math.max(0, Math.min(100, axis.value / target * 100)) : 0;
    return { ...axis, target, score };
  });
}

export function thresholdObservation(input: Pick<CoachingCompassInput, 'vma' | 'paceThresholdSecPerKm'>) {
  const { vma, paceThresholdSecPerKm: pace } = input;
  if (pace == null || !Number.isFinite(pace) || pace <= 0) return null;
  const speed = 3600 / pace;
  return { speed, fractionVma: vma != null && Number.isFinite(vma) && vma > 0 ? speed / vma : null };
}