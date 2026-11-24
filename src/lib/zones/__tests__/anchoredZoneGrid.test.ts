import { describe, expect, it } from 'vitest';
import { anchoredBikeGrid, anchoredRunGrid, GRID_FRACTIONS, THRESHOLD_TO_CRITICAL, bikeGridWatts, runGridPaces } from '../anchoredZoneGrid';
import { readThresholdOrigin, withThresholdOrigin } from '../thresholdOrigin';
import { buildTargetTable } from '@/lib/plan/targetTable';

const today = '2026-11-23';
const zoneOfWatts = (grid: ReturnType<typeof anchoredBikeGrid>, w: number) => grid!.zones.find(z => w >= z.min && (z.max == null || w <= z.max))?.id;
const zoneOfKmh = (grid: ReturnType<typeof anchoredRunGrid>, v: number) => grid!.zones.find(z => v >= z.min && (z.max == null || v <= z.max))?.id;
const critical = (sport: 'cycling' | 'running', value: number, status: 'estimate' | 'confirmed', latestEffortDate = '2026-11-10', verdict?: 'valid' | 'reject') => ({
  [sport]: { critical: value, reserve: sport === 'cycling' ? 18000 : 200, status, efforts: [], r2: 0.99, residualPct: 1, sensitivityPct: 2, warnings: [],
    savedAt: latestEffortDate, latestEffortDate, ...(verdict ? { coachReview: { verdict, text: '', date: latestEffortDate } } : {}) },
});

describe('grille Z1–Z7 ancrée sur le seuil critique', () => {
  const emanuela = { ftp: 188, vma: 13, pace_threshold_sec_per_km: 315, map5min_w: 200, fc_max: 192, weight_kg: 51.9, vlamax: 0.2 };

  it('place la FTP dans Z5 et ne dépend pas de la VO₂max saisie', () => {
    const a = anchoredBikeGrid({ ...emanuela, vo2max: 52 }, { today })!;
    const b = anchoredBikeGrid({ ...emanuela, vo2max: 45.5 }, { today })!;
    expect(zoneOfWatts(a, 188)).toBe('Z5');
    expect(a.zones).toEqual(b.zones);
    expect(a.source).toBe('threshold_unknown');
    expect(b.alerts.join(' ')).toMatch(/modèle VO₂max\/VLamax place le seuil à 157 W/);
    expect(a.alerts.join(' ')).not.toMatch(/modèle VO₂max/);
  });

  it('signale une puissance 5 min sous-maximale sans déplacer les zones', () => {
    const g = anchoredBikeGrid(emanuela, { today })!;
    expect(g.alerts.join(' ')).toMatch(/Puissance 5 min \(200 W\)/);
    expect(g.zones.at(-2)!.max).toBeGreaterThanOrEqual(g.critical * 1.05);
  });

  it('préfère une CP confirmée récente, ignore une CP ancienne, rejetée ou non confirmée', () => {
    expect(anchoredBikeGrid({ ...emanuela, critical_metrics: critical('cycling', 205, 'confirmed') }, { today })!.source).toBe('critical_confirmed');
    expect(anchoredBikeGrid({ ...emanuela, critical_metrics: critical('cycling', 205, 'confirmed', '2026-08-01') }, { today })!.source).toBe('threshold_unknown');
    expect(anchoredBikeGrid({ ...emanuela, critical_metrics: critical('cycling', 205, 'confirmed', '2026-11-10', 'reject') }, { today })!.source).toBe('threshold_unknown');
    const unconfirmed = anchoredBikeGrid({ ...emanuela, critical_metrics: critical('cycling', 230, 'estimate') }, { today })!;
    expect(unconfirmed.source).toBe('threshold_unknown');
    expect(unconfirmed.alerts.join(' ')).toMatch(/CP non confirmée \(230 W\)/);
  });

  it('zones contiguës, sans chevauchement, larges d’au moins 3 % du seuil critique', () => {
    for (const g of [anchoredBikeGrid(emanuela, { today })!, anchoredRunGrid(emanuela, { today })!]) {
      for (let i = 1; i < g.zones.length; i++) expect(g.zones[i].min).toBeCloseTo(g.zones[i - 1].max!, 6);
      for (const z of g.zones.slice(1, 7)) expect(z.max! - z.min).toBeGreaterThanOrEqual(0.03 * g.critical - 1e-9);
      expect(g.zones.map(z => z.id)).toEqual(['Z1', 'Z2', 'Z3', 'Z4a', 'Z4b', 'Z5', 'Z6', 'Z7']);
    }
  });

  it('met l’allure seuil d’un test 20 min dans Z5 et le marque comme mesuré', () => {
    const g = anchoredRunGrid({ ...emanuela, field_sources: withThresholdOrigin({}, 'pace_threshold_sec_per_km', 'test_20min') }, { today })!;
    expect(g.source).toBe('threshold_test');
    expect(g.measured).toBe(true);
    expect(zoneOfKmh(g, 3600 / 315)).toBe('Z5');
    expect(g.firstThreshold / g.critical).toBeCloseTo(GRID_FRACTIONS.run.Z2, 6);
  });

  it('réglages prudents validés par simulation : CP = FTP / 0,965, CS = 1,01 × vitesse seuil, Z2 vélo à 0,75 CP', () => {
    expect(THRESHOLD_TO_CRITICAL.bike).toBeCloseTo(1 / 0.965, 9);
    expect(THRESHOLD_TO_CRITICAL.run).toBe(1.01);
    expect(GRID_FRACTIONS.bike.Z2).toBe(0.75);
    const bike = anchoredBikeGrid({ ftp: 250 }, { today })!;
    expect(bike.critical).toBeCloseTo(250 / 0.965, 6);
    expect(bike.firstThreshold).toBeCloseTo(0.75 * 250 / 0.965, 6);
    expect(zoneOfWatts(bike, 250)).toBe('Z5');
    const run = anchoredRunGrid({ pace_threshold_sec_per_km: 300 }, { today })!;
    expect(run.critical).toBeCloseTo(12 * 1.01, 6);
    expect(zoneOfKmh(run, 12)).toBe('Z5');
  });

  it('signale une VO₂max incohérente avec la VMA (≈ 3,5 × VMA), sans déplacer les zones', () => {
    const watch = anchoredRunGrid({ ...emanuela, vo2max: 52 }, { today })!;
    const coherent = anchoredRunGrid({ ...emanuela, vo2max: 45 }, { today })!;
    expect(watch.alerts.join(' ')).toMatch(/VO₂max saisie \(52 ml\/kg\/min\) incohérente avec la VMA de 13 km\/h/);
    expect(coherent.alerts.join(' ')).not.toMatch(/VO₂max/);
    expect(watch.zones).toEqual(coherent.zones);
  });

  it('n’ancre pas les zones sur une allure de montre ou du calculateur quand la VMA existe', () => {
    for (const origin of ['watch', 'calculator'] as const) {
      const g = anchoredRunGrid({ ...emanuela, field_sources: withThresholdOrigin({}, 'pace_threshold_sec_per_km', origin) }, { today, ambition: 'competitor' })!;
      expect(g.source).toBe('vma_estimate');
      expect(g.measured).toBe(false);
      expect(g.critical).toBeCloseTo(13 * 0.88, 6);
      expect(g.alerts.join(' ')).toMatch(/non utilisée/);
    }
  });

  it('limite un seuil déduit trop proche de la VMA, pas une CS confirmée', () => {
    const near = anchoredRunGrid({ vma: 16, pace_threshold_sec_per_km: 230 }, { today })!;
    expect(near.critical).toBeCloseTo(16 * 0.97, 6);
    expect(near.alerts.join(' ')).toMatch(/très proche de la VMA/);
    const cs = anchoredRunGrid({ vma: 19, pace_threshold_sec_per_km: 205, critical_metrics: critical('running', 18.3 / 3.6, 'confirmed') }, { today })!;
    expect(cs.source).toBe('critical_confirmed');
    expect(cs.critical).toBeCloseTo(18.3, 6);
  });

  it('provenance : lecture, écriture, champ vide conservé', () => {
    const one = withThresholdOrigin({ vo2max: { source: 'lab' } }, 'ftp', 'test_20min');
    expect(readThresholdOrigin(one, 'ftp')).toBe('test_20min');
    expect(one.vo2max).toEqual({ source: 'lab' });
    expect(withThresholdOrigin(one, 'ftp', '')).toEqual(one);
    expect(readThresholdOrigin({ ftp: 'manual-selected' }, 'ftp')).toBeNull();
  });
});

describe('table des plans et interrupteur de grille', () => {
  const input = { ftp: 188, vma: 13, fcMax: 192, paceThresholdSecPerKm: 315, vlamax: 0.2, vo2max: 52, weightKg: 51.9, objective: 'IM', ambition: 'competitor' };

  it('grille activée par défaut ; l’ancienne reste disponible explicitement', () => {
    const byDefault = buildTargetTable(input);
    const anchored = buildTargetTable({ ...input, gridMode: 'anchored' });
    const legacy = buildTargetTable({ ...input, gridMode: 'current' });
    expect(byDefault.bikeZonesW).toEqual(anchored.bikeZonesW);
    expect(byDefault.runPacesSecPerKm).toEqual(anchored.runPacesSecPerKm);
    expect(byDefault.meta.zoneSource.bike).toBe('anchored');
    expect(legacy.meta.zoneSource.bike).toBe('derived');
  });

  it('activée, la table reprend la grille ancrée et des FC distinctes par zone', () => {
    const t = buildTargetTable({ ...input, gridMode: 'anchored', snapshot: { map5min_w: 200 } });
    const grid = anchoredBikeGrid({ ftp: 188, map5min_w: 200, fc_max: 192 }, { today })!;
    expect(t.bikeZonesW).toEqual(bikeGridWatts(grid));
    expect(t.runPacesSecPerKm.Z5).toEqual(runGridPaces(anchoredRunGrid({ vma: 13, pace_threshold_sec_per_km: 315 }, { today })!).Z5);
    expect(t.meta.zoneSource).toEqual({ bike: 'anchored', run: 'anchored', hr: 'anchored' });
    expect(new Set([t.fcZonesBpm.Z4a?.join(), t.fcZonesBpm.Z4b?.join(), t.fcZonesBpm.Z5?.join()]).size).toBe(3);
  });
});
