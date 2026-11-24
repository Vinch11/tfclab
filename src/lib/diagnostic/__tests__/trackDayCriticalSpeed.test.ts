import { describe, expect, it } from 'vitest';
import { criticalSpeedFromTrack } from '../trackDayCriticalSpeed';
import { anchoredRunGrid, THRESHOLD_TO_CRITICAL } from '@/lib/zones/anchoredZoneGrid';
import { withThresholdOrigin } from '@/lib/zones/thresholdOrigin';

describe('Track Day — vitesse critique 1 500 m + 3 000 m', () => {
  // Coureuse fictive : CS 3,35 m/s (12,06 km/h), D′ 150 m → 1 500 m en 403 s, 3 000 m en 851 s.
  const t1500 = (1500 - 150) / 3.35, t3000 = (3000 - 150) / 3.35;

  it('retrouve CS et D′ du modèle distance–temps', () => {
    const cs = criticalSpeedFromTrack(t1500, t3000);
    expect(cs.valid).toBe(true);
    expect(cs.csMs).toBeCloseTo(3.35, 6);
    expect(cs.dPrimeM).toBeCloseTo(150, 6);
  });

  it('refuse des temps incohérents', () => {
    expect(criticalSpeedFromTrack(400, 790).error).toMatch(/pas maximal/);
    expect(criticalSpeedFromTrack(400, 1100).error).toMatch(/beaucoup plus lent/);
    expect(criticalSpeedFromTrack(100, 800).error).toMatch(/1 500 m hors/);
    expect(criticalSpeedFromTrack(0, 800).valid).toBe(false);
  });

  it("l'allure seuil enregistrée (CS / 1,01) redonne la CS dans la grille corrigée, marquée comme mesurée", () => {
    const cs = criticalSpeedFromTrack(t1500, t3000);
    const pace = Math.round(3600 / ((cs.csMs * 3.6) / THRESHOLD_TO_CRITICAL.run));
    const grid = anchoredRunGrid({ vma: 14, pace_threshold_sec_per_km: pace, field_sources: withThresholdOrigin({}, 'pace_threshold_sec_per_km', 'track_day_cs') }, { today: '2026-11-24' })!;
    expect(grid.critical).toBeCloseTo(cs.csMs * 3.6, 1);
    expect(grid.source).toBe('threshold_test');
    expect(grid.measured).toBe(true);
  });
});
