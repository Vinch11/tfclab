import { describe, it, expect } from 'vitest';
import type { ParsedPlan } from '@/lib/aiPlanParser';
import { buildNolioCycles } from '../nolioCycles';
import { classifyCycles, sameCycle } from '../../../../supabase/functions/nolio-v2-oauth/cycleContract';
const plan = { title: 'Vince 10 km', totalWeeks: 4, phases: [{ name: 'Base', weeks: 'S1–S2' }, { name: 'Build', weeks: 'S3–S4', objective: 'Allure 10 km' }],
  weeks: [1, 2, 3, 4].map(weekNumber => ({ weekNumber, phase: weekNumber < 3 ? 'Base' : 'Build', theme: `Chantier ${weekNumber}`, sessions: [] })),
  strategicRecap: { limiters: [{ rank: 2, name: 'VMA', weeks: 'S1–S4', block: 'Aérobie', keySessions: 'Intervalles' }, { rank: 1, name: 'VO₂max', weeks: 'S1–S2', block: 'Puissance', keySessions: '' }], synergies: [] },
} as unknown as ParsedPlan;
describe('Cycles Nolio', () => {
  it('date les phases sans chevauchement et conserve les priorités parallèles', () => {
    const cycles = buildNolioCycles(plan, '2026-11-09');
    expect(cycles).toHaveLength(2);
    expect(cycles.map(c => [c.date_start, c.date_end])).toEqual([['2026-11-09', '2026-11-22'], ['2026-11-23', '2026-12-06']]);
    expect(cycles[0].name).toBe('Base · VO₂max / VMA');
    expect(cycles[0].description.indexOf('L1')).toBeLessThan(cycles[0].description.indexOf('L2'));
    expect(cycles[1].description).toContain('Allure 10 km');
  });
  it('préserve les thèmes lorsque le récapitulatif est absent', () => {
    const cycles = buildNolioCycles({ ...plan, strategicRecap: undefined }, '2026-11-09');
    expect(cycles[0].description).toContain('S2 · Chantier 2');
  });
  it('refuse de dater depuis une date absente ou impossible', () => {
    expect(buildNolioCycles(plan, '')).toEqual([]);
    expect(buildNolioCycles(plan, '2026-02-30')).toEqual([]);
  });
  it('ne duplique pas un cycle identique et préserve les autres cycles', () => {
    const drafts = buildNolioCycles(plan, '2026-11-09');
    expect(classifyCycles(drafts, [{ ...drafts[0], id: 'pcyc_one' }]).map(e => e.state)).toEqual(['existing', 'create']);
    expect(classifyCycles(drafts, [{ ...drafts[0], name: 'Coach manuel' }]).map(e => e.state)).toEqual(['conflict', 'create']);
    expect(classifyCycles(drafts, [{ ...drafts[0], description: 'Modifié' }])[0].state).toBe('conflict');
  });
  it('contrôle la description et les deux dates à la relecture', () => {
    const [cycle] = buildNolioCycles(plan, '2026-11-09');
    expect(sameCycle(cycle, { ...cycle, date_end: '2026-11-21' })).toBe(false);
    expect(sameCycle(cycle, { ...cycle, description: 'Perdue' })).toBe(false);
  });
});
import { defaultCycleColor } from '@/lib/plan/nolioCycles';
describe('couleurs douces des cycles', () => {
  it('donne une couleur pastel par phase', () => {
    expect(defaultCycleColor('Fondation', 0)).toBe('#B5DCC4');
    expect(defaultCycleColor('Affûtage', 3)).toBe('#F2B8B5');
  });
});
