import { describe, expect, it } from 'vitest';
import type { DbSnapshot } from '@/hooks/useCloudData';
import { assessmentResults } from '../assessmentContract';

const snapshot = { id: 's', athlete_id: 'a', date: '2026-11-17', vo2max: 52, weight_kg: 52, vlamax: 0.4, vlamax_run: 0.5, vlamax_source: 'lab', ftp: 188, vma: 13, pace_threshold_sec_per_km: 315, tte_observed_min: 35, tte_observed_min_run: 40 } as DbSnapshot;
describe('assessment information contract', () => {
  it('retains usable bike results stored in a bilan without separate test sheets', () => {
    const results = assessmentResults(snapshot, 'bike');
    expect(results.find(r => r.key === 'vo2')?.available).toBe(true);
    expect(results.find(r => r.key === 'fatmax')?.available).toBe(true);
    expect(results.find(r => r.key === 'threshold')?.available).toBe(true);
    expect(results.find(r => r.key === 'critical')?.available).toBe(false);
  });
  it('does not use cycling TTE as a completed running test', () => {
    expect(assessmentResults({ ...snapshot, tte_observed_min_run: null }, 'run').find(r => r.key === 'tte')?.available).toBe(false);
    expect(assessmentResults(snapshot, 'run').find(r => r.key === 'tte')?.available).toBe(true);
  });
  it('does not mark fuel calculations available without recorded weight', () => {
    expect(assessmentResults({ ...snapshot, weight_kg: null }, 'bike').find(r => r.key === 'fuel')?.available).toBe(false);
  });
});