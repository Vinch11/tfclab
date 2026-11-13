import { describe, expect, it } from 'vitest';
import { evolutionSectionHTML, reportSports, sportControls, snapshotSeries } from '../story';

const t = (id: string, date: string, d: number) => ({ id, athlete_id: 'a', coach_id: 'c', sport: 'course', type: 'sprint', name: 'Sprint 15s CAP', date, raw: { bestDistance: d, sprint_attempts: [d], protocolId: 'D1' } }) as any;

describe('report story', () => {
  it('compares only recorded tests of the athlete and flags missing series', () => {
    const html = evolutionSectionHTML({ athleteId: 'a', tests: [t('1', '2026-04-21', 83.3), t('2', '2026-05-05', 115), { ...t('3', '2026-05-06', 200), athlete_id: 'b' }], snapshots: [], sports: ['run'] });
    expect(html).toContain('2 tests');
    expect(html).toContain('+31,7');
    expect(html).not.toContain('200');
    expect(html).toContain('Série continue non enregistrée');
  });
  it('shows no invented history when nothing is recorded for a sport', () => {
    expect(evolutionSectionHTML({ athleteId: 'a', tests: [], snapshots: [], sports: ['bike'] })).toContain('Aucun test ni historique comparable');
  });
  it('never converts bike values into run series', () => {
    const s = snapshotSeries([{ athlete_id: 'a', date: '2026-01-01', ftp: 200 }, { athlete_id: 'a', date: '2026-02-01', ftp: 210 }], 'a', 'run');
    expect(s.every(f => f.points.length === 0)).toBe(true);
  });
  it('tells triathlon in both sports and running goals in running only', () => {
    expect(reportSports('Ironman', false)).toEqual(['bike', 'run']);
    expect(reportSports('10 km', false)).toEqual(['run']);
  });
  it('controls follow sport and open questions', () => {
    const c = sportControls({ sports: ['run'], tteKnown: false, vlamaxPriority: false, longEvent: false });
    expect(c.some(x => x.startsWith('Vélo'))).toBe(false);
    expect(c.some(x => /Temps tenu au seuil non mesuré/.test(x))).toBe(true);
  });
});
