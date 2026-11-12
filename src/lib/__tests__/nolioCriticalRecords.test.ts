import { describe, expect, it } from 'vitest';
import { readCriticalPeriodRecords } from '../nolioCriticalRecords';
import { criticalEffortsFromRecords, fitCriticalEfforts } from '../criticalEfforts';
import { criticalForSessions, parseStoredCriticalMetrics, toStoredCritical } from '../criticalMetrics';
import type { ReviewedRecord } from '../nolioV2Records';

const today = '2026-11-12';
const sports = [{ id: 'run', name: 'Course à pied', sport_base: 'r' }, { id: 'tapis', name: 'Course à pied - Tapis', sport_base: 'r' }, { id: 'bike', name: 'Vélo - Route', sport_base: 'b' }, { id: 'ht', name: 'Vélo - Home Trainer', sport_base: 'b' }, { id: 'swim', name: 'Natation', sport_base: 's' }];
const records = (sportBase: string, cp: number, reserve: number): ReviewedRecord[] => [180, 420, 720].map(t => ({ cat: 'ppr', record_type: 'time', inner_val: t, value: cp + reserve / t, unit: 'W', sportBase, date: today, training_id: `trn_${t}`, sport_name: 'capteur' }));

describe('import records critiques Nolio course/vélo', () => {
  it('lit chaque variante course/vélo et exclut la natation', async () => {
    const calls: string[] = [];
    await readCriticalPeriodRecords(sports, async id => { calls.push(id); return { records: [], complete: true }; });
    expect(calls).toEqual(['run', 'tapis', 'bike', 'ht']);
  });
  it('suspend toute sélection si une variante est incomplète', async () => {
    await expect(readCriticalPeriodRecords(sports, async id => ({ records: [], complete: id !== 'ht' }))).rejects.toThrow('Lecture incomplète');
  });
  it('ne remplace pas un échec par une lecture vide réussie', async () => {
    await expect(readCriticalPeriodRecords(sports, async id => { if (id === 'run') throw new Error('refus'); return { records: [], complete: true }; })).rejects.toThrow('refus');
  });
  it('calcule CP course 320 W et W′ course 24 kJ sans transposer les watts vélo', () => {
    const e = criticalEffortsFromRecords([...records('running', 320, 24000), ...records('cycling', 250, 18000)], true).filter(e => e.sport === 'running');
    const f = fitCriticalEfforts(e, 'running', today);
    expect(f.critical).toBeCloseTo(320); expect(f.reserve).toBeCloseTo(24000); expect(f.status).toBe('estimate');
    expect(e.every(e => !e.confirmed && e.measurement === 'power')).toBe(true);
  });
  it('conserve CP vélo 250 W et W′ vélo 18 kJ', () => {
    const f = fitCriticalEfforts(criticalEffortsFromRecords(records('cycling', 250, 18000)), 'cycling', today);
    expect(f.critical).toBeCloseTo(250); expect(f.reserve).toBeCloseTo(18000);
  });
  it('ne confond jamais puissance course et distance course', () => {
    const power = criticalEffortsFromRecords(records('running', 320, 24000), true);
    expect(criticalEffortsFromRecords(records('running', 320, 24000))).toEqual([]);
    expect(fitCriticalEfforts([power[0], { ...power[1], measurement: 'distance' }], 'running', today).status).toBe('insufficient');
  });
  it('un accord coach ne transforme pas les records course en prescription', () => {
    const e = criticalEffortsFromRecords(records('running', 320, 24000), true).map(e => ({ ...e, confirmed: true }));
    const stored = toStoredCritical(fitCriticalEfforts(e, 'running', today), e, true, today);
    expect(stored?.status).toBe('estimate');
    expect(parseStoredCriticalMetrics({ runningPower: stored }).runningPower?.reserve).toBeCloseTo(24000);
    expect(criticalForSessions({ runningPower: stored ?? undefined }, 'running', today).value).toBeNull();
  });
  it('les sprints de 5 et 30 s sont exclus du fit CP/W′', () => {
    expect(criticalEffortsFromRecords(records('running', 320, 24000).map((r, i) => ({ ...r, inner_val: i === 0 ? 5 : 30 })), true)).toEqual([]);
  });
});