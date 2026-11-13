import { describe, expect, it } from 'vitest';
import { buildDisciplineAxes } from '../disciplineAxes';
import type { CoachingCompassInput, RadarAxis } from '../types';

const input = { objectif: 'IM', ambition: 'competitor', athleteAge: 51, vo2max: 50, vma: 14.2, vlamaxRunReference: null, tteEffectif: { tte_min: 35, source: 'estimated', confidence: .7 }, tteEffectifRun: { tte_min: 40, source: 'observed', confidence: .95 } } as CoachingCompassInput;
const axes: RadarAxis[] = ['vo2max', 'vlamax', 'ftpkg', 'fatmax'].map(key => ({ key, label: key, shortLabel: key, value: key === 'vlamax' ? .2 : 50, score: 80, target: 60, unit: '', icon: '', color: '', source: 'estimation' }));
describe('Triathlon discipline references', () => {
  it('keeps bike FTP/FatMax separate and does not fill missing run VLamax from cycling', () => {
    const result = buildDisciplineAxes(input, axes);
    expect(result.bike.map(a => a.key)).toEqual(['vo2max', 'vlamax', 'ftpkg', 'fatmax', 'tte']);
    expect(result.run.map(a => a.key)).toEqual(['vo2max', 'vlamax', 'vma', 'tte']);
    expect(result.run.find(a => a.key === 'vlamax')?.value).toBeNull();
    expect(result.run.find(a => a.key === 'vma')?.value).toBe(14.2);
  });
  it('uses the stored running VLamax without modifying the bike axes or inputs', () => {
    const before = structuredClone(axes);
    const result = buildDisciplineAxes({ ...input, vlamaxRunReference: { value: .47, source: 'snapshot' } }, axes);
    expect(result.run.find(a => a.key === 'vlamax')?.value).toBe(.47);
    expect(result.bike.find(a => a.key === 'vlamax')?.value).toBe(.2);
    expect(axes).toEqual(before);
  });
  it('does not convert cycling VO2 estimates into a running measurement', () => {
    expect(buildDisciplineAxes({ ...input, vo2max: null }, axes).run.find(a => a.key === 'vo2max')?.value).toBeNull();
  });
  it('compares 35 min bike and 40 min run TTE separately', () => {
    const result = buildDisciplineAxes(input, axes);
    expect(result.bike.find(a => a.key === 'tte')?.value).toBe(35);
    expect(result.run.find(a => a.key === 'tte')?.value).toBe(40);
    expect(result.run.find(a => a.key === 'vma')?.target).toBeNull();
    expect(result.runningDiagnostic.priorities.map(p => p.key)).toContain('tte');
  });
  it('bike watts, TTE and priorities cannot alter the running diagnosis', () => {
    const before = buildDisciplineAxes(input, axes).runningDiagnostic;
    const changed = buildDisciplineAxes({ ...input, ftp: 600, wprimeKj: 40, tteEffectif: { tte_min: 150, source: 'observed', confidence: .95 } }, axes).runningDiagnostic;
    expect(changed).toEqual(before);
  });
});