import { describe, expect, it } from 'vitest';
import { reportSports, sportControls, sportTransition } from '../story';

describe('report story', () => {
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

describe('sport journeys', () => {
  it('running chapter never mentions watts', () => {
    expect(sportTransition('run', 1, 2)).toContain('Aucune valeur vélo');
  });
});
