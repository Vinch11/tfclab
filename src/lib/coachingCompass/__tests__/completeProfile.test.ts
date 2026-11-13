import { describe, expect, it } from 'vitest';
import { completeProfile, completeProfileHTML } from '../completeProfile';
import { metabolicCurveReview } from '../curveReview';
import { reviewedTte } from '@/lib/testMeasurementReview';
import { calculateCarbOxidation, calculateFatOxidation, findFatMax, findCarbMax, intensityToPowerWatts } from '@/lib/v2/maderMetabolicModel';
import type { CoachingCompassInput } from '../types';
const fixture = (objectif = 'IM'): CoachingCompassInput => ({ ftp: 188, poids: 52, vo2max: 50, tss7d: null, snapshotDate: '2026-11-12', snapshotUpdatedAt: null, pmax5s: null, p30sW: null, p60sW: null, map5minW: null, runEconomyScore: 65, hrDriftPct: 0, vma: 14.2, paceThresholdSecPerKm: 315, fatmax: 68, vlamaxEffectif: { value: .2, confidence: .7, source: 'estimation' }, vlamaxRunReference: null, tteEffectif: { tte_min: 35, confidence: .5, source: 'estimated' }, tteEffectifRun: { tte_min: 40, confidence: .9, source: 'observed' }, fatigueEffectif: null, potentielPhysiologique: null, strategyResult: null, lactateThresholds: null, wprimeKj: null, objectif, ambition: 'competitor', sportFocus: 'triathlon', athleteAge: 51, limiterResult: null });
describe('Complete read-only physiological inventory', () => {
  it.each(['5K', '10K', 'Semi', 'Marathon', 'Trail', '703', 'IM'])('preserves all input contracts for %s', goal => {
    const input = fixture(goal), before = structuredClone(input);
    const groups = completeProfile(input);
    expect(input).toEqual(before);
    expect(groups.find(g => g.sport === 'Course à pied')?.indicators.some(i => i.key === 'durability' && i.value === null)).toBe(true);
  });
  it('keeps VMA, separate TTE, missing course VLamax and CSS visible', () => {
    const groups = completeProfile(fixture(), 95);
    const run = groups.find(g => g.sport === 'Course à pied')?.indicators;
    expect(run?.find(i => i.key === 'vma')?.value).toBe(14.2);
    expect(run?.find(i => i.key === 'vlamax')?.value).toBeNull();
    expect(run?.find(i => i.key === 'tte')?.value).toBe(40);
    expect(groups.find(g => g.sport === 'Vélo')?.indicators.find(i => i.key === 'tte')?.value).toBe(35);
    expect(run?.find(i => i.key === 'drift')?.value).toBe(0);
    expect(groups.find(g => g.sport === 'Natation')?.indicators[0].value).toBe(95);
  });
  it('report inventory retains identical sport values and missing measurements', () => {
    const input = fixture(), before = structuredClone(input);
    const html = completeProfileHTML(input, 95);
    expect(html).toContain('40 min');
    expect(html).toContain('35 min');
    expect(html).toContain('14.2 km/h');
    expect(html).toContain('95 s/100 m');
    expect(input).toEqual(before);
  });
  it('does not use bike FTP as a running curve reference', () => {
    expect(metabolicCurveReview({ sport: 'cap', vo2max: 50, vlamax: .4, weight: 52, ftp: 188 }).oxidation).toBe(false);
    expect(metabolicCurveReview({ sport: 'cap', vo2max: 50, vlamax: .4, weight: 52, vma: 14.2 }).cycling).toBe(false);
  });
  it.each([null, NaN, Infinity, 0])('missing or invalid weight %s cannot yield a curve', weight => {
    expect(metabolicCurveReview({ sport: 'velo', vo2max: 50, vlamax: .2, weight, ftp: 188 }).metabolic).toBe(false);
  });
});
const tte = { tte_minutes: 40, thresholdConfirmed: true, continuousConfirmed: true, exhaustionConfirmed: true, conditionsConfirmed: true, thresholdReference: 'Test 188 W', thresholdDate: '2026-11-10', testDate: '2026-11-12' };
describe('Manual TTE review', () => {
  it('requires an earlier documented threshold', () => {
    expect(reviewedTte(tte, 'bike')).toBe(true);
    expect(reviewedTte({ ...tte, thresholdDate: '2026-11-12' }, 'bike')).toBe(false);
    expect(reviewedTte({ ...tte, thresholdReference: '' }, 'bike')).toBe(false);
  });
  it.each(['thresholdConfirmed', 'continuousConfirmed', 'exhaustionConfirmed'])('requires explicit %s', key => {
    expect(reviewedTte({ ...tte, [key]: false }, 'run')).toBe(false);
  });
  it('capped and voluntary stops cannot become an observed TTE', () => {
    expect(reviewedTte({ ...tte, protocolCapped: true }, 'run')).toBe(false);
    expect(reviewedTte({ ...tte, exhaustionConfirmed: false }, 'run')).toBe(false);
  });
  it('impossible calendar dates cannot validate a threshold test', () => {
    expect(reviewedTte({ ...tte, thresholdDate: '2026-02-31' }, 'run')).toBe(false);
    expect(reviewedTte({ ...tte, testDate: '2026-11-31' }, 'run')).toBe(false);
  });
});
describe('Metabolic curve numerical checks, not experimental validation', () => {
  const profile = { vo2max: 50, vlamax: .2, weight: 52 };
  it('FatMax summary uses the same peak oxidation and watt conversion as the curve', () => {
    const peak = findFatMax(profile);
    expect(peak.fatMaxGrams).toBeCloseTo(calculateFatOxidation(peak.fatMaxIntensity, 50, .2, 52), 2);
    expect(peak.fatMaxPower).toBe(Math.round(intensityToPowerWatts(peak.fatMaxIntensity, 50, 52, .23)));
    expect(peak.carbAtFatMax).toBe(Math.round(calculateCarbOxidation(peak.fatMaxIntensity, 50, .2, 52) * 60));
  });
  it('90 g/h CarbMax is an oxidation crossing, not ingestion measurement', () => {
    const point = findCarbMax(profile, 90);
    expect(point.targetCarbGH).toBe(90);
    expect(point.intensityPct).not.toBeNull();
    if (point.intensityPct == null) throw new Error('Expected modeled crossing');
    expect(calculateCarbOxidation(point.intensityPct, 50, .2, 52) * 60).toBeCloseTo(90, 0);
  });
});