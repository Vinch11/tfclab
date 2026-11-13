import type { CoachingCompassInput, RadarAxis } from './types';

const positive = (v: number | null | undefined) => v != null && Number.isFinite(v) && v > 0;

/** Filled fields are coverage, not protocol validation or a race readiness score. */
export function dashboardCoverage(input: CoachingCompassInput) {
  const run = input.sportFocus === 'run';
  const tri = input.sportFocus === 'triathlon';
  const fields: Array<[string, boolean]> = [
    ['Poids', positive(input.poids)], ['VO₂max', positive(input.vo2max)],
    ...(!run ? [['FTP vélo', positive(input.ftp)], ['VLamax vélo', positive(input.vlamaxEffectif.value)], ['TTE vélo', positive(input.tteEffectif.tte_min) && input.tteEffectif.source !== 'unknown']] as Array<[string, boolean]> : []),
    ...(run || tri ? [['VMA course', positive(input.vma)], ['Seuil course', positive(input.paceThresholdSecPerKm)], ['VLamax course', positive(input.vlamaxRunReference?.value ?? (run ? input.vlamaxEffectif.value : null))], ['TTE course', positive(run ? input.tteEffectif.tte_min : input.tteEffectifRun?.tte_min)]] as Array<[string, boolean]> : []),
  ];
  const manquants = fields.filter(([, available]) => !available).map(([label]) => label);
  return { score: Math.round(100 * (fields.length - manquants.length) / fields.length), manquants, total: fields.length, filled: fields.length - manquants.length };
}

/** Target attainment has exactly the same values and targets as the visible sport axes. */
export function dashboardTargetProgress(axes: readonly RadarAxis[]) {
  const comparable = axes.filter(a => !['fatmax', 'wprime', 'durability'].includes(a.key));
  const metrics = comparable.flatMap(a => {
    if (!positive(a.value) || !positive(a.target)) return [];
    const value = a.value ?? 0;
    const target = a.target ?? 0;
    const progress = Math.max(0, Math.min(100, a.key === 'vlamax' ? 100 * (2 - value / target) : 100 * value / target));
    return [{ ...a, progress }];
  });
  return { progress: metrics.length ? Math.round(metrics.reduce((sum, m) => sum + m.progress, 0) / metrics.length) : null, metrics, total: comparable.length };
}

/** Relative display deficit only. Ranking keeps the engine's original absolute gaps. */
export function relativeCategoryDeficit(metrics: readonly { metric: string; value: number | null; target: number | null; gapPercent?: number }[]) {
  const gaps = metrics.flatMap(m => {
    if (!positive(m.target) || m.value == null || !Number.isFinite(m.value)) return [];
    const pct = ((m.value - (m.target ?? 0)) / (m.target ?? 1)) * 100;
    return [Math.max(0, m.metric === 'VLamax' ? pct : /^W['′]/.test(m.metric) ? Math.abs(pct) : -pct)];
  });
  return gaps.length ? Math.max(...gaps) : null;
}

export function dashboardScoreLabel(category: string) {
  return category === 'ready' ? 'Repères favorables' : category === 'solid' ? 'Base physiologique solide' : category === 'developing' ? 'Profil à développer' : 'Profil à consolider';
}
/** No population defaults or cross-sport substitutes in dashboard nutrition. */
export function hasDashboardNutritionInputs(vo2max: number | null | undefined, vlamax: number | null | undefined, weight: number | null | undefined) {
  return [vo2max, vlamax, weight].every(positive);
}
