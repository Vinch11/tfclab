import { describe, expect, it } from 'vitest';
import { anchoredBikeGrid, anchoredRunGrid } from '../anchoredZoneGrid';
import { garminFiveZones } from '../garminZones';

describe('zones Garmin (5 zones)', () => {
  const snap = { ftp: 188, vma: 13, pace_threshold_sec_per_km: 305, map5min_w: 230, fc_max: 192 };
  it('course : frontières sur le premier seuil et la vitesse critique, FC contiguës jusqu’à la FC max', () => {
    const grid = anchoredRunGrid(snap, { today: '2026-11-24' })!;
    const z = garminFiveZones(grid, 192);
    expect(z.map(x => x.tfcl)).toEqual(['Z1', 'Z2', 'Z3 + Z4a', 'Z4b + Z5', 'Z6 + Z7']);
    expect(z[1].max).toBeCloseTo(grid.firstThreshold, 6);
    expect(z[3].max).toBeCloseTo(grid.critical, 6);
    for (let i = 1; i < 5; i++) expect(z[i].hr![0]).toBe(z[i - 1].hr![1]);
    expect(z[4].hr![1]).toBe(192);
    expect(z[4].max).toBeNull();
  });
  it('vélo : la FTP tombe en zone orange', () => {
    const z = garminFiveZones(anchoredBikeGrid(snap, { today: '2026-11-24' })!, 192);
    expect(188).toBeGreaterThanOrEqual(z[3].min);
    expect(188).toBeLessThanOrEqual(z[3].max!);
  });
});
