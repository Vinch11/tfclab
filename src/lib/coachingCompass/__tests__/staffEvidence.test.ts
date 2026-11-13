import { describe, it, expect } from 'vitest';
import { staffEvidenceRows } from '../staffEvidence';
import type { DbSnapshot, DbTest } from '@/hooks/useCloudData';

const snapshot: DbSnapshot = { id: 's', athlete_id: 'a', coach_id: 'c', date: '2026-11-12', source: 'terrain', ftp: 188, tte_observed_min: 35, tte_observed_min_run: 40, run_hr_drift_pct: 0 };
const baseTest: DbTest = { id: 't', athlete_id: 'a', coach_id: 'c', date: '2026-11-10', name: 'Course', type: 'FIT_IMPORT', sport: 'run', raw: null, note: null, reliability: null, vlamax: null };
describe('Staff raw evidence contracts', () => {
  it('keeps bike/run durations and raw values without inferring certified measurements', () => {
    const before = JSON.stringify(snapshot);
    const rows = staffEvidenceRows('a', snapshot, []);
    expect(rows.find(r => r.sport === 'Vélo' && r.result === '35 min')).toBeDefined();
    expect(rows.find(r => r.sport === 'Course' && r.result === '40 min')).toBeDefined();
    expect(rows.find(r => r.result === '188 W')?.sensor).toBe('Capteur non renseigné');
    expect(rows.find(r => r.result === '0 %')).toBeDefined();
    expect(JSON.stringify(snapshot)).toBe(before);
  });
  it('never imports another athlete’s results', () => {
    const foreign: DbTest = { ...baseTest, athlete_id: 'other', raw: { p30s: 500 } };
    expect(staffEvidenceRows('other', snapshot, [])).toEqual([]);
    expect(staffEvidenceRows('a', null, [foreign])).toEqual([]);
  });
  it('retains raw sensor results but excludes model estimates and confidence', () => {
    const test: DbTest = { ...baseTest, raw: { sensor: 'Stryd', bestEfforts: { p30s: 380 }, ftpEstimated: 300, confidence: .9, pgly: 12, egly: 50 } };
    const row = staffEvidenceRows('a', null, [test])[0];
    expect(row.result).toBe('Puissance 30 s : 380 W');
    expect(row.sensor).toBe('Stryd');
    expect(row.status).toContain('non déduite');
  });
});