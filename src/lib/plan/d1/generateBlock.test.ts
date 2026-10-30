import { afterEach, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { generateD1Block } from './generateBlock';
import { d1Fixture, d1Profiles } from './fixtures';

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
it('records actual generation, 20 repetitions and unchanged refusals for the frozen D1 cohort', () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
  const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() => { throw new Error('NETWORK_FORBIDDEN'); });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const rows = d1Profiles.map(profile => {
    const { athlete, config } = d1Fixture(profile);
    const input = JSON.stringify({ athlete, config });
    const result = generateD1Block(athlete, config);
    for (let n = 1; n < 20; n++) expect(generateD1Block(athlete, config)).toEqual(result);
    expect(JSON.stringify({ athlete, config })).toBe(input);
    expect(result.prescriptible).toBe(false);
    return { profile, athlete, config, result, repetitions: 20,
      days: result.candidate?.weeks.flatMap(w => [...new Set(w.sessions.map(s => s.dayIndex))]).length ?? 0 };
  });
  const { athlete, config } = d1Fixture(d1Profiles[0]);
  expect(() => generateD1Block(athlete, { ...config, objective: 'IM' })).toThrow('D1_UNSUPPORTED_OBJECTIVE');
  expect(() => generateD1Block(athlete, { ...config, ambition: 'finisher' })).toThrow('D1_UNSUPPORTED_AMBITION');
  expect(() => generateD1Block(athlete, { ...config, ambitionMeta: { ...config.ambitionMeta!, trainingLevel: 'untrained' } })).toThrow('D1_UNSUPPORTED_LEVEL');
  expect(() => generateD1Block(athlete, { ...config, weeksAvailable: 3 })).toThrow('D1_REQUIRES_AT_LEAST_FOUR_WEEKS');
  expect(() => generateD1Block(athlete, { ...config, planStartDate: undefined })).toThrow('D1_REQUIRES_VALID_START_DATE');
  const prohibited = generateD1Block(athlete, { ...config, prohibitions: ['run', 'bike', 'swim'] });
  expect(prohibited.status === 'refused' || !prohibited.constraintsSatisfied).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
  mkdirSync('docs/d1/evidence', { recursive: true });
  writeFileSync('docs/d1/evidence/cohort.json', JSON.stringify({ rows, prohibited, networkCalls: fetch.mock.calls.length }, null, 2));
}, 300000);
