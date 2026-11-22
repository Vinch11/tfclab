import { describe, it, expect } from 'vitest';
import { sessionDurability, summarizeDurability, parseStoredDurability } from './longSessionDurability';
const ride = (min: number, early: number, late: number) => { const t: number[] = []; const w: number[] = []; for (let s = 0; s <= min * 60; s += 10) { t.push(s); w.push(s < min * 20 ? early : s > min * 40 ? late : early - 10); } return { t, w }; };
describe('durabilité sorties longues', () => {
  it('calcule la baisse de puissance de fin de sortie vélo', () => { const { t, w } = ride(180, 200, 180); expect(sessionDurability('bike', { id: 'a', date: 'd', name: 'n' }, t, w)?.changePct).toBe(-10); });
  it('refuse une sortie vélo de moins de 2 h', () => { const { t, w } = ride(100, 200, 180); expect(sessionDurability('bike', { id: 'a', date: 'd', name: 'n' }, t, w)).toBeNull(); });
  it('accepte une course de 90 min', () => { const { t, w } = ride(90, 12, 11.4); expect(sessionDurability('run', { id: 'a', date: 'd', name: 'n' }, t, w)?.changePct).toBe(-5); });
  it('calcule le même début/fin avec une moyenne par minute', () => {
    const t = Array.from({ length: 181 }, (_, minute) => minute * 60);
    const w = t.map(seconds => seconds < 60 * 60 ? 200 : 180);
    expect(sessionDurability('bike', { id: 'minute', date: 'd', name: 'n' }, t, w)?.changePct).toBe(-10);
  });
  it('exige au moins deux séances et fait la moyenne', () => {
    const s = (c: number) => ({ id: String(c), date: 'd', name: 'n', durationMin: 180, early: 200, late: 0, changePct: c });
    expect(summarizeDurability('bike', [s(-10), s(-10)], 'a', 'b', 'c')).toBeNull();
    expect(summarizeDurability('bike', [s(-10), s(-4)], 'a', 'b', 'c')?.meanChangePct).toBe(-7);
  });
  it('relit sans mélanger les sports', () => {
    const v = summarizeDurability('bike', [{ id: 'x', date: 'd', name: 'n', durationMin: 180, early: 1, late: 1, changePct: -3 }, { id: 'y', date: 'd', name: 'n', durationMin: 180, early: 1, late: 1, changePct: -5 }], 'a', 'b', 'c');
    const p = parseStoredDurability(JSON.stringify({ durability: { bike: v } }));
    expect(p.bike?.meanChangePct).toBe(-4); expect(p.run).toBeUndefined();
  });
});
import { durabilityReportHTML } from './longSessionDurability';
describe('rapport durabilité', () => {
  it('annonce une durabilité non mesurée sans valeur inventée', () => { expect(durabilityReportHTML(null, ['run'])).toContain('Pas encore mesurée'); });
});

it('requires continuous full 20-minute windows and weights uneven samples by elapsed time', () => {
  const session = { id: 's', date: '2026-01-01', name: 'Sortie' };
  expect(sessionDurability('run', session, [0, 600, 1800, 3600, 5400], [10, 10, 10, 10, 10])).toBeNull();
  const time = Array.from({ length: 91 }, (_, i) => i * 60);
  // The only eligible early window lasts exactly 20 min. Extra samples in its
  // second half must not give that portion extra weight.
  const extra = Array.from({ length: 600 }, (_, i) => 1200 + i);
  const irregular = [...new Set([...time, ...extra])].sort((a, b) => a - b);
  const values = irregular.map(t => t >= 600 && t < 1200 ? 8 : t < 1800 ? 12 : 9);
  expect(sessionDurability('run', session, irregular, values)).toMatchObject({ early: 10, late: 9, changePct: -10 });
  expect(sessionDurability('run', session, irregular, values.map((v, i) => irregular[i] === 900 ? null : v))).toBeNull();
});
