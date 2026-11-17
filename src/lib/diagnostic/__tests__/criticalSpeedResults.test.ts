import { describe, expect, it } from 'vitest';
import { criticalSpeedRecords, criticalSpeedTestRows, reviewCriticalSpeed } from '../criticalSpeedResults';
import { criticalForSessions } from '@/lib/criticalMetrics';

const efforts = criticalSpeedTestRows('2026-11-09').map(e => ({ ...e, value: 4 * e.durationSec + 150, conditions: 'Piste sèche, même montre', confirmed: true }));
describe('critical speed test lifecycle', () => {
  it('prepares separate 3, 7 and 12 minute days', () => {
    expect(efforts.map(e => e.durationSec)).toEqual([180, 420, 720]);
    expect(efforts.map(e => e.date)).toEqual(['2026-11-09', '2026-11-11', '2026-11-13']);
  });
  it('calculates 14.4 km/h and D′ 150 m from real entered distances', () => {
    const { fit } = reviewCriticalSpeed(efforts, false, '2026-11-17');
    expect(fit.critical * 3.6).toBe(14.4); expect(fit.reserve).toBe(150);
  });
  it('requires coach agreement before a confirmed result can feed plans', () => {
    expect(reviewCriticalSpeed(efforts, false, '2026-11-17').stored?.status).toBe('estimate');
    expect(reviewCriticalSpeed(efforts, true, '2026-11-17').stored?.status).toBe('confirmed');
  });
  it('records remain estimates until their actual protocol is confirmed', () => {
    const rows = [180, 420, 720].map(item_seconds => ({ cat: 'par', record_type: 'time', sport_id: 2, item_seconds, value: 4 + 150 / item_seconds, date_recorded: '2026-11-10' }));
    const records = criticalSpeedRecords(rows, '2026-10-01', '2026-11-17');
    expect(records[0].value).toBe(870); expect(records.every(e => !e.confirmed)).toBe(true);
    expect(reviewCriticalSpeed(records, true, '2026-11-17').stored?.status).toBe('estimate');
    expect(criticalSpeedRecords(rows.map(r => ({ ...r, sport_id: 14 })), '2026-10-01', '2026-11-17')).toEqual([]);
  });
  it('old confirmed tests cannot feed plans', () => {
    const stored = reviewCriticalSpeed(efforts, true, '2026-11-17').stored;
    expect(stored).not.toBeNull();
    expect(criticalForSessions(stored ? { running: stored } : {}, 'running', '2026-12-26').value).toBeNull();
  });
});