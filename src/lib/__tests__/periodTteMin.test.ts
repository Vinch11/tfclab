import { describe, it, expect } from 'vitest';
import { detectPeriodTests, longestAbove } from '@/lib/periodTestDetection';
describe('durée au seuil minimum', () => {
  const time = Array.from({ length: 1800 }, (_, i) => i);
  const watts = time.map(t => (t >= 300 && t < 1500 ? 190 : 120));
  it('mesure 20 min continues ≥ 95 % FTP', () => expect(longestAbove(time, watts, 188 * 0.95)).toBe(20));
  it('propose « à vérifier », jamais mesuré', () => {
    const t = detectPeriodTests([{ id: '1', name: 'x', date: '2026-10-21', sportBase: 'cycling', time, watts }], { ftpW: 188 }).find(x => x.field === 'tte_observed_min');
    expect(t?.value).toBe(20); expect(t?.confidence).toBe('check');
  });
  it('sans FTP, aucune proposition', () =>
    expect(detectPeriodTests([{ id: '1', name: 'x', date: 'd', sportBase: 'cycling', time, watts }]).some(x => x.field === 'tte_observed_min')).toBe(false));
});
