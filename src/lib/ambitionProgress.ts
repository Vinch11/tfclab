import type { DbSnapshot } from '@/hooks/useCloudData';
import type { AmbitionLevel } from '@/types/ambitionLevel';
import { getTargetsForAmbition, getTTETargetByAmbition, getVLamaxRange } from './physiologicalTargets';
import { getPerformanceAgeFactor } from './v2/unifiedLimiterDetection';
import { isRunningOnlyPrescription } from './limiterPrescription';

/** Every series compares one metric/protocol. No average over changing missing values. */
export function ambitionProgressMetrics(snapshot: Partial<DbSnapshot>, objective: string, ambition: AmbitionLevel, age: number | null, weight?: number | null) {
  const running = isRunningOnlyPrescription(objective);
  const base = getTargetsForAmbition(objective, ambition);
  const range = getVLamaxRange(objective, ambition, running ? 'run' : 'bike');
  const positive = (n?: number | null) => n != null && Number.isFinite(n) && n > 0 ? n : null;
  const vlamax = positive(running ? snapshot.vlamax_run : snapshot.vlamax);
  const mass = positive(snapshot.weight_kg) ?? positive(weight);
  const ftp = positive(snapshot.ftp);
  const expression = running ? positive(snapshot.vma) : ftp && mass ? ftp / mass : null;
  const expressionBase = running ? base.vma_min : base.ftp_kg_min;
  const expressionTarget = expressionBase == null ? null : Math.round(expressionBase * getPerformanceAgeFactor(age) * 100) / 100;
  const tte = positive(running ? snapshot.tte_observed_min_run : snapshot.tte_observed_min);
  const tteTarget = getTTETargetByAmbition(objective, ambition, age);
  const ratio = (value: number | null, target: number | null) => value != null && target != null && target > 0 ? value / target * 100 : null;
  return {
    expression: { label: running ? 'VMA course' : 'FTP/kg vélo', unit: running ? 'km/h' : 'W/kg', value: expression, target: expressionTarget, progress: ratio(expression, expressionTarget) },
    tte: { label: running ? 'TTE course observé' : 'TTE vélo observé', unit: 'min', value: tte, target: tteTarget, progress: ratio(tte, tteTarget) },
    vlamax: { label: running ? 'VLamax course' : 'VLamax vélo', unit: 'mmol/L/s', value: vlamax, target: range.optimal, range,
      progress: vlamax == null ? null : vlamax < range.min ? vlamax / range.min * 100 : vlamax <= range.max ? 100 : range.max / vlamax * 100 },
  };
}
