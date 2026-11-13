import { describe, expect, it } from 'vitest';
import type { DbTest } from '@/hooks/useCloudData';
import { sportProgressionSeries } from '../sportProgression';

const test = (id: string, sport: string, date: string, raw: Record<string, unknown>): DbTest => ({ id, athlete_id: 'a', coach_id: 'c', sport, type: 'threshold', name: 'Test seuil', date, raw }) as DbTest;
describe('real sport progression', () => {
  it('uses dated measured bike power, never FTP targets or calculated FTP', () => {
    const series = sportProgressionSeries([test('2', 'bike', '2026-03-01', { power_avg: 276, ftp: 262, protocolId: '20min' }), test('1', 'bike', '2026-01-01', { power_avg: 260, protocolId: '20min' }), test('3', 'bike', '2026-04-01', { ftp_target: 300, ftp: 285 })], 'a', 'bike');
    expect(series[0].points.map(p => p.value)).toEqual([260, 276]);
    expect(series[0].points.map(p => p.date)).toEqual(['2026-01-01', '2026-03-01']);
  });
  it('keeps real VMA in running and excludes another athlete', () => {
    const tests = [test('1', 'course', '2026-01-01', { vma: 16, protocolId: '6min' }), test('2', 'course', '2026-03-01', { vma: 17, protocolId: '6min' }), { ...test('3', 'course', '2026-04-01', { vma: 22, protocolId: '6min' }), athlete_id: 'b' }, test('4', 'bike', '2026-05-01', { vma: 24, power_avg: 300 })];
    expect(sportProgressionSeries(tests, 'a', 'run')[0].points.map(p => p.value)).toEqual([16, 17]);
  });
  it('never invents measurements for an empty sport', () => {
    expect(sportProgressionSeries([], 'a', 'bike')).toEqual([]);
  });
  it('does not connect unknown or different protocols', () => {
    const series = sportProgressionSeries([test('1', 'course', '2026-01-01', { vma: 16 }), test('2', 'course', '2026-02-01', { vma: 17 }), test('3', 'course', '2026-03-01', { vma: 18, protocolId: 'track' })], 'a', 'run');
    expect(series.map(s => s.points.length)).toEqual([1, 1, 1]);
  });
  it('excludes marked estimates and invalid dates', () => {
    expect(sportProgressionSeries([test('1', 'course', '2026-02-30', { vma: 17 }), test('2', 'course', '2026-03-01', { vma: 18, estimated: true })], 'a', 'run')).toEqual([]);
  });
  it('reads stored TFCL numeric inputs and keeps their declared day protocol', () => {
    const series = sportProgressionSeries([test('1', 'bike', '2026-01-01', { power_avg: '260', source: 'TFCL_TESTING_WEEK', dayKey: 'D5' }), test('2', 'bike', '2026-03-01', { power_avg: '276', source: 'TFCL_TESTING_WEEK', dayKey: 'D5' })], 'a', 'bike');
    expect(series[0].points.map(p => p.value)).toEqual([260, 276]);
    expect(series[0].protocol).toBe('TFCL_TESTING_WEEK:D5');
  });
});