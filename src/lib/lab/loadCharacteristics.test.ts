import { describe, expect, it } from 'vitest';
import { labEnergyContribution, labLoadCharacteristics, labObservedPoints } from './loadCharacteristics';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
import type { DbSnapshot } from '@/hooks/useCloudData';

const input = { vo2max: 52, poids: 52, vma: 13, vlamaxEffectif: { value: 0.4 }, vlamaxRunReference: { value: 0.6 } } as CoachingCompassInput;
describe('100%lab load characteristics', () => {
  it('keeps lactate kinetics and energy split cycling-only', () => {
    const run = labLoadCharacteristics(input, 'run');
    expect(run.rows.every(r => r.production === null && r.lactate === null)).toBe(true);
    expect(labEnergyContribution(input, 'run')).toEqual([]);
    expect(labLoadCharacteristics(input, 'bike').rows[40].production).toBeGreaterThan(0);
  });
  it('places stored records with a model gap and no curve without weight', () => {
    const pts = labObservedPoints({ date: '2026-11-12', ftp: 188, map5min_w: 222 } as DbSnapshot, input, 'bike');
    expect(pts.map(p => p.key)).toEqual(['p300', 'ftp']);
    expect(pts[1].gapPct).toBeTypeOf('number');
    expect(labLoadCharacteristics({ ...input, poids: null }, 'bike').rows).toEqual([]);
  });
});
