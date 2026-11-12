import { describe, expect, it } from 'vitest';
import { computeCoachingCompass } from '..';
import { buildSportReferences } from '../sportPresentation';
import type { CoachingCompassInput } from '../types';
import type { StoredCriticalSport } from '@/lib/criticalMetrics';
const stored = (critical: number, reserve: number): StoredCriticalSport => ({ critical, reserve, status: 'estimate', efforts: [], r2: null, residualPct: 0, sensitivityPct: null, warnings: [], savedAt: '2026-11-12', latestEffortDate: '2026-11-12' });
const input = (objectif: string, sportFocus: CoachingCompassInput['sportFocus']): CoachingCompassInput => ({
  objectif, sportFocus, ambition: 'competitor', athleteAge: 51, ftp: 188, poids: 52, vo2max: 50, tss7d: null, snapshotDate: null, snapshotUpdatedAt: null,
  pmax5s: null, p30sW: null, p60sW: null, map5minW: null, runEconomyScore: null, hrDriftPct: 1.3, vma: 14.2, paceThresholdSecPerKm: 315, fatmax: null,
  vlamaxEffectif: { value: .3, confidence: .6, source: 'estimation' }, tteEffectif: { tte_min: 35, confidence: .7, source: 'observed' }, tteEffectifRun: { tte_min: 40, confidence: .7, source: 'observed' }, fatigueEffectif: null,
  limiterResult: { primaryLimiter: 'anaerobic_capacity', confidence: 70, gapAnalysis: [{ metric: "W'", gap: -10, weightedImpact: 20 }] }, potentielPhysiologique: null, strategyResult: null, lactateThresholds: null,
  wprimeKj: 7, criticalMetrics: { running: stored(4, 200), runningPower: stored(320, 24000), cycling: stored(250, 18000) },
});
describe('sport-separated compass projection', () => {
  it.each(['5K', '10K', 'Semi', 'Marathon', 'Trail'])('%s never presents cycling W′ as running reserve', goal => {
    const x = input(goal, 'bike'), result = computeCoachingCompass(x);
    expect(result.presentation?.sportReferences.every(r => r.sport === 'running')).toBe(true);
    expect(result.presentation?.sportReferences.find(r => r.label === 'W′ course')?.value).toBe(24);
    expect(result.presentation?.axes.some(a => a.key === 'wprime')).toBe(false);
    const legacy = computeCoachingCompass({ ...x, criticalMetrics: undefined });
    expect(result.limiter).toEqual(legacy.limiter); expect(result.decision).toEqual(legacy.decision); expect(result.radarAxes).toEqual(legacy.radarAxes);
  });
  it('cycling uses only cycling CP 250 W and W′ 18 kJ', () => {
    const refs = buildSportReferences(input('Velo', 'bike'));
    expect(refs.map(r => r.value)).toEqual([250, 18]); expect(refs.every(r => r.sport === 'cycling')).toBe(true);
  });
  it.each(['703', 'IM'])('%s keeps 24 kJ running and 18 kJ cycling distinct', goal => {
    const result = computeCoachingCompass(input(goal, 'triathlon'));
    expect(result.presentation?.sportReferences.find(r => r.label === 'W′ course')?.value).toBe(24);
    expect(result.presentation?.sportReferences.find(r => r.label === 'W′ vélo')?.value).toBe(18);
    expect(result.presentation?.axes.some(a => a.key === 'tte')).toBe(false);
    expect(result.presentation?.tteBike?.tte_min).toBe(35); expect(result.presentation?.tteRun?.tte_min).toBe(40);
  });
  it('missing running data remains unknown despite a cycling W′ of 7 kJ', () => {
    expect(buildSportReferences({ ...input('10K', 'run'), criticalMetrics: null }).every(r => r.value === null)).toBe(true);
  });
  it('running never displays FTP-based FatMax or cycling VLamax as running data', () => {
    const view = computeCoachingCompass(input('10K', 'bike')).presentation;
    expect(view?.axes.some(a => a.key === 'fatmax')).toBe(false);
    expect(view?.axes.find(a => a.key === 'vlamax')?.value).toBeNull();
  });
  it('never uses an FTP-derived VO2max as a measured running value', () => {
    expect(computeCoachingCompass({ ...input('10K', 'run'), vo2max: null }).presentation?.axes.find(a => a.key === 'vo2max')?.value).toBeNull();
  });
});