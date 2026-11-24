import { describe, expect, it } from 'vitest';
import { isModeledSectionHidden, SHOW_MODELED_MODULES } from '../modeledModules';

describe('modules modélisés masqués', () => {
  it('masque les modules qui contredisaient le bilan, garde les repères factuels', () => {
    expect(SHOW_MODELED_MODULES).toBe(false);
    for (const id of ['pacing-envelope', 'nutrition-v2', 'injury-risk-cap', 'race-time-estimate', 'adaptation-predictor-profil', 'run-mlss-coherence'])
      expect(isModeledSectionHidden(id)).toBe(true);
    for (const id of ['training-zones', 'critical-efforts-profil', 'evolution-chart', 'athlete-refs', 'fat-carb-combustion-profil'])
      expect(isModeledSectionHidden(id)).toBe(false);
  });
});
