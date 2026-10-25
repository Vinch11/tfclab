import { describe, expect, it } from 'vitest';
import { QA_PROFILES } from '@/lib/plan/qa/syntheticProfiles';
import { preparePilotTrainingPlanContext } from '@/lib/plan/qa/preparePilotTrainingPlanContext';
import { buildWorkoutCatalog } from '@/lib/workoutCatalogBuilder';

/** Existing synthetic profiles only. This proves deterministic influence before
 * generation, not that a model produced a medically suitable complete plan. */
describe('first-athlete objective contracts without generation', () => {
  it.each(['B-10K', 'B-SEMI', 'B-MARATHON', 'B-IM'] as const)('%s preserves ranked limiters and changes the proposed catalogue', id => {
    const profile = QA_PROFILES.find(p => p.id === id)!;
    const prepared = preparePilotTrainingPlanContext(profile);
    const cfg = prepared.planConfig;
    expect(cfg.objective).toBe(profile.planConfig.objective);
    expect(cfg.identifiedLimitersRaw?.length).toBeGreaterThan(0);
    expect(prepared.trace.diagnostic.executed).toBe(true);
    expect(prepared.trace.decision.executed).toBe(true);
    const options = { maxItems: 80, phaseOverride: ['build'] as const, strictPhaseFilter: true, rotationSeed: 0,
      prohibitions: cfg.prohibitions };
    const targeted = buildWorkoutCatalog(cfg.objective, 5, 6, cfg.weeksAvailable, { ...options, phaseOverride: ['build'], limiters: cfg.identifiedLimitersRaw });
    const generic = buildWorkoutCatalog(cfg.objective, 5, 6, cfg.weeksAvailable, { ...options, phaseOverride: ['build'], limiters: [] });
    expect(targeted.length).toBeGreaterThan(0);
    expect(targeted.map(w => w.id)).not.toEqual(generic.map(w => w.id));
    expect(targeted.every(w => w.phase.includes('build'))).toBe(true);
  });
});
