import { describe, expect, it } from 'vitest';
import { computeCoachingCompass, type CoachingCompassInput } from '..';
import { compassReportRows, buildCompassReportReferencesHTML } from '../reportPresentation';
import { mapExportPayloadToProfileReport } from '@/lib/athleteProfileReport/mapPayloadToReport';
import { computePerformanceReport } from '@/lib/performanceReport/computePerformanceReport';

const input = (objectif: string): CoachingCompassInput => ({ objectif, sportFocus: objectif === '10K' ? 'run' : 'triathlon', ambition: 'competitor', athleteAge: 51, ftp: 188, poids: 52, vo2max: 50, tss7d: null, snapshotDate: null, snapshotUpdatedAt: null, pmax5s: null, p30sW: null, p60sW: null, map5minW: null, runEconomyScore: null, hrDriftPct: 1.3, vma: 14.2, paceThresholdSecPerKm: 315, fatmax: null, vlamaxEffectif: { value: .3, confidence: .6, source: 'estimation' }, tteEffectif: { tte_min: 35, confidence: .5, source: 'estimated' }, tteEffectifRun: { tte_min: 40, confidence: .7, source: 'observed' }, fatigueEffectif: null, limiterResult: null, potentielPhysiologique: null, strategyResult: null, lactateThresholds: null, wprimeKj: 7 });
describe('reports share the compass projection', () => {
  it('includes the same independent running observations and priorities in triathlon reports', () => {
    const compass = computeCoachingCompass(input('IM'));
    const html = buildCompassReportReferencesHTML(compass);
    expect(compass.presentation?.runningDiagnostic?.priorities[0]?.key).toBe('tte');
    expect(html).toContain('Diagnostic course indépendant');
    expect(html).toContain('40.0 min');
    expect(html).toContain('14.2 km/h');
  });
  it('includes the identical independent cycling projection without transferring run TTE', () => {
    const compass = computeCoachingCompass(input('IM'));
    const html = buildCompassReportReferencesHTML(compass);
    expect(compass.presentation?.cyclingDiagnostic?.axes.find(a => a.key === 'tte')?.value).toBe(35);
    expect(compass.presentation?.cyclingDiagnostic?.priorities.some(p => p.key === 'tte')).toBe(false);
    expect(html).toContain('Diagnostic vélo indépendant');
    expect(html).toContain('35.0 min');
  });
  it.each(['10K', '703', 'IM'])('%s profile values, targets, sources and performance rows match exactly', goal => {
    const compass = computeCoachingCompass(input(goal));
    const before = structuredClone(compass);
    const payload = { athlete: { name: 'Test', goal }, coachingCompass: compass, effectiveRefs: { ftp: 188, weightKg: 52, vo2max: 50, vma: 14.2 }, vlamax: { value: .3 }, tte: { tte_min: 35 }, unifiedLimiter: { categoryRanking: [], gapAnalysis: [] } };
    const opts = { ambitionLabel: 'Compétiteur', generatedAt: '2026-11-12' };
    const rows = compassReportRows(compass), profile = mapExportPayloadToProfileReport(payload, opts), performance = computePerformanceReport(payload, opts);
    expect(profile.metrics.map(m => [m.key, m.value, m.target?.[0] ?? null, m.source])).toEqual(rows.map(r => [r.key, r.value, r.target, r.source]));
    expect(performance.kpis.map(k => k.label)).toEqual(rows.map(r => r.label));
    expect(performance.parameterRows.map(r => r.name)).toEqual(rows.map(r => r.label));
    expect(profile.sportTte?.map(r => r.value)).toEqual(goal === '10K' ? [35] : [35, 40]);
    if (goal === '10K') expect(performance.physio.fatMaxW).toBeNull();
    else {
      const fatmax = rows.find(r => r.key === 'fatmax');
      expect(performance.physio.fatMaxW).toBe(fatmax?.value != null ? Math.round(188 * fatmax.value / 100) : null);
    }
    expect(compass).toEqual(before);
  });
  it('keeps running TTE 40 and VMA 14.2 with no IM VMA target in both expanded reports', () => {
    const compass = computeCoachingCompass(input('IM'));
    const before = structuredClone(compass);
    const payload = { athlete: { id: 'athlete-a', name: 'Test', goal: 'IM' }, coachingCompass: compass, effectiveRefs: { ftp: 188, weightKg: 52, vo2max: 50, vma: 14.2 }, unifiedLimiter: { categoryRanking: [], gapAnalysis: [] }, tests: [] };
    const opts = { ambitionLabel: 'Compétiteur', generatedAt: '2026-11-13' };
    mapExportPayloadToProfileReport(payload, opts);
    computePerformanceReport(payload, opts);
    const axes = compass.presentation?.disciplineAxes?.run;
    expect(axes?.find(a => a.key === 'tte')?.value).toBe(40);
    expect(axes?.find(a => a.key === 'vma')?.value).toBe(14.2);
    expect(axes?.find(a => a.key === 'vma')?.target).toBeNull();
    expect(compass).toEqual(before);
  });
});