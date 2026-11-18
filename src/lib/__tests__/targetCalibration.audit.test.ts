import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { AmbitionTargetsTable } from '@/components/AmbitionTargetsTable';
import { GapAmbitionPanel } from '@/components/GapAmbitionPanel';
import { getTargetsForAmbition, getVLamaxRange, getTTETargetByAmbition, AMBITION_TARGETS } from '../physiologicalTargets';
import { getAgeAdjustedTargets } from '../ageAdjustment';
import { detectUnifiedLimiter, buildCategoryRanking, getMastersVlamaxPriorityFactor, getVo2maxTarget, type UnifiedLimiterInput, type UnifiedGapAnalysis } from '../v2/unifiedLimiterDetection';
import { evaluateVO2max, evaluateTTE, evaluateVLamax, evaluateReadiness } from '../ambitionThresholds';
import { ambitionProgressMetrics } from '../ambitionProgress';
import { getTargetCalibration } from '../targetCalibration';
import { AMBITION_LEVELS_ORDERED } from '@/types/ambitionLevel';
import { assessVmaReference, getVmaReference } from '../coachingCompass/vmaReference';

const base: UnifiedLimiterInput = {
  objectif: 'Marathon', ambition: 'competitor', age: 42, sex: 'F', sportFocus: 'run',
  vo2max: 49, vma: 15, ftpKg: 4, vlamax: .34, tte: 45, wprimeKj: 18,
  fatmax: 60, economyScore: null, availabilityScore: null, hasHealthAlerts: false,
};

describe('Audit des cibles : erreurs ayant un effet sur le diagnostic', () => {
  it('retains equivalent relative deficits regardless of metric units', () => {
    const gaps = ['VO2max', 'VMA', 'FTP/kg'].map((metric, i): UnifiedGapAnalysis => ({ metric, value: [58.28, 16.92, 3.76][i], target: [62, 18, 4][i], gap: [-3.72, -1.08, -.24][i], gapPercent: -6, status: 'acceptable', weight: 1, weightedImpact: 6 }));
    expect(buildCategoryRanking(gaps)[0].metrics).toHaveLength(3);
  });
  it('does not manufacture durability from a predicted or requested race duration', () => {
    const tteTarget = getTTETargetByAmbition('Marathon', 'competitor', 42);
    for (const tte of [tteTarget - .01, tteTarget]) {
      const a = detectUnifiedLimiter({ ...base, tte });
      const b = detectUnifiedLimiter({ ...base, tte, targetRaceDurationMin: 187 });
      expect(b.gapAnalysis).toEqual(a.gapAnalysis);
      expect(b.gapAnalysis.some(g => g.metric === 'Durabilité')).toBe(false);
    }
  });
  it('keeps independently observed FatMax despite a low VLamax', () => {
    const result = detectUnifiedLimiter({ ...base, objectif: 'IM', sportFocus: 'bike', vlamax: .25, fatmax: 20 });
    expect(result.gapAnalysis.find(g => g.metric === 'FatMax')?.weightedImpact).toBeGreaterThan(0);
  });
  it('never calls a below-range VLamax optimal or prescribes lowering it', () => {
    const gap = detectUnifiedLimiter({ ...base, objectif: '5K', vlamax: .1 }).gapAnalysis.find(g => g.metric === 'VLamax')!;
    expect(gap.status).not.toBe('optimal');
    expect(gap.weightedImpact).toBe(0);
    expect(buildCategoryRanking([gap]).every(c => c.totalImpact === 0)).toBe(true);
    expect(evaluateVLamax(.1, '5K').status).toBe('warning');
  });
  it('keeps absolute cycling W prime out of automatic prescription for all body sizes', () => {
    const result = detectUnifiedLimiter({ ...base, sportFocus: 'bike', objectif: 'IM', wprimeKj: 4 });
    expect(result.gapAnalysis.find(g => g.metric === "W' (kJ)")?.prescriptionApplicable).toBe(false);
    expect(result.categoryRanking.flatMap(c => c.metrics).some(g => g.metric === "W' (kJ)")).toBe(false);
  });
  it('does not introduce a masters-only glycolytic priority', () => {
    expect([20, 49, 50, 65, 80].map(getMastersVlamaxPriorityFactor)).toEqual([1, 1, 1, 1, 1]);
  });
  it.each(['StartToRun', 'unknown-event'])('does not rank unsupported competition targets for %s', objectif => {
    const result = detectUnifiedLimiter({ ...base, objectif });
    expect(result.categoryRanking).toEqual([]);
    expect(result.insufficientData).toBe(true);
    expect(result.primaryLimiter).toBe('none');
    if (objectif === 'StartToRun') expect(result.gapAnalysis.some(g => g.metric === 'FTP/kg')).toBe(false);
  });
  it('does not extrapolate adult competition norms to children', () => {
    expect(detectUnifiedLimiter({ ...base, age: 14 }).categoryRanking).toEqual([]);
  });
  it('treats invalid observations as missing, never optimal or a numeric deficit', () => {
    const result = detectUnifiedLimiter({ ...base, vma: NaN, tte: -1, vo2max: Infinity });
    for (const metric of ['VMA', 'TTE', 'VO2max']) {
      expect(result.gapAnalysis.find(g => g.metric === metric)?.status).toBe('unknown');
    }
  });
  it('uses the default ambition for malformed runtime values', () => {
    expect(getVo2maxTarget('IM', 'invalid', 40)).toBe(getVo2maxTarget('IM', 'age_group', 40));
  });
});

describe('Canonical comparisons across every supported goal and ambition', () => {
  it('keeps engine and exposed targets identical, with explicit demographic limits', () => {
    for (const objectif of Object.keys(AMBITION_TARGETS)) for (const ambition of AMBITION_LEVELS_ORDERED) {
      for (const age of [20, 29, 30, 39, 40, 49, 50, 59, 60, 70, 80]) for (const sex of ['M', 'F'] as const) {
        const result = detectUnifiedLimiter({ ...base, sportFocus: undefined, objectif, ambition, age, sex });
        for (const g of result.gapAnalysis) {
          expect(Number.isFinite(g.target), `${objectif}/${ambition}/${g.metric}`).toBe(true);
          expect(Number.isFinite(g.weightedImpact)).toBe(true);
          if (g.metric === 'TTE') expect(g.target).toBe(result.targetsUsed.tte_min);
          if (g.metric === 'VMA') expect(g.target).toBe(result.targetsUsed.vma_min);
          if (g.metric === 'FTP/kg') expect(g.target).toBe(result.targetsUsed.ftp_kg_min);
        }
        expect(result.targetCalibration.sex).toBe(sex);
        expect(result.targetCalibration.canCertifyAmbition).toBe(false);
        expect(getTargetsForAmbition(objectif, ambition).vlamax).toEqual(getVLamaxRange(objectif, ambition));
      }
    }
  });
  it('aligns Half with 70.3 and keeps Ultra on running when sport is omitted', () => {
    expect(detectUnifiedLimiter({ ...base, objectif: '10 KM' }).insufficientData).toBe(false);
    expect(getVLamaxRange('Half')).toEqual(getVLamaxRange('703'));
    expect(getVLamaxRange('Half-Ironman')).toEqual(getVLamaxRange('703'));
    expect(getVLamaxRange('Ultra')).toEqual(getVLamaxRange('Ultra', undefined, 'run'));
  });
  it('does not impose a 35-minute floor on short-distance TTE', () => {
    expect(getAgeAdjustedTargets('5K', 42, 'finisher').tteTarget).toBe(getTTETargetByAmbition('5K', 'finisher', 42));
  });
  it('aligns UI status with engine thresholds, including rounding boundaries', () => {
    const target = getVo2maxTarget('Marathon', 'competitor', 42);
    expect(evaluateVO2max(target * .8, 'Marathon', 'competitor', 42).status).toBe('critical');
    expect(evaluateVO2max(target * .999, 'Marathon', 'competitor', 42).status).toBe('warning');
    const tte = getTTETargetByAmbition('Marathon', 'competitor', 42);
    expect(evaluateTTE(tte * .86, 'Marathon', 'competitor', 42).status).toBe('warning');
    expect(evaluateReadiness(65, 'competitor').status).toBe('warning');
  });
});

describe('Coach-facing scientific interpretation', () => {
  it('separates observations by sport and preserves missing values', () => {
    const bikeOnly = { ftp: 300, weight_kg: 75, tte_observed_min: 60, vlamax: .3 };
    const run = ambitionProgressMetrics(bikeOnly, 'Marathon', 'competitor', 42);
    expect(Object.values(run).every(m => m.value === null && m.progress === null)).toBe(true);
    const withRun = ambitionProgressMetrics({ ...bikeOnly, vma: 17, tte_observed_min_run: 38, vlamax_run: .4 }, 'Marathon', 'competitor', 42);
    expect(withRun.expression.value).toBe(17);
    expect(withRun.tte.value).toBe(38);
    expect(withRun.vlamax.value).toBe(.4);
  });
  it('renders all five ambition levels without the Academy world-class crash', () => {
    const html = renderToStaticMarkup(createElement(AmbitionTargetsTable));
    expect(html).toContain('Repères de coaching');
    expect(html).toContain('VMA (km/h)');
  });
  it('does not fabricate a time or required VMA from an ambition label', () => {
    const html = renderToStaticMarkup(createElement(GapAmbitionPanel, { vmaKmh: 17, ambition: 'competitor', objective: 'Marathon' }));
    expect(html).toContain('Chrono visé non renseigné');
    expect(html).not.toContain('VMA requise</');
    const explicit = renderToStaticMarkup(createElement(GapAmbitionPanel, { vmaKmh: 17, ambition: 'competitor', objective: 'Marathon', targetTimeMinutes: 187 }));
    expect(explicit).not.toContain('Chrono visé non renseigné');
    expect(explicit).toContain('3h07');
  });
  it('never promotes a cohort sensitivity scenario to a readiness verdict', () => {
    expect(assessVmaReference(17, getVmaReference('Marathon', 'competitor')).label).toContain('ne valide pas');
    expect(getTargetCalibration(50, 'F').note).toContain('les femmes de 50 ans');
    expect(getTargetCalibration(null, null).age).toBeNull();
  });
});
