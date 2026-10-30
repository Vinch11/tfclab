import { explainD1BrickContract } from './brickContract';
import type { PlanAthleteData, PlanConfig } from '@/hooks/useAITrainingPlan';
import { constructDeterministicPlan } from '../../../../experimental/det-engine/engine';

export const D1_VERSION = 'd1.1-1';
export const D1_ENGINE_REFERENCE = '234112a1fa713b796d1f41faf14819d5ab6d0171';

/** Narrow integration only. All existing sporting controls remain in the engine. */
export function generateD1Block(athlete: PlanAthleteData, config: PlanConfig) {
  if (config.objective !== '703') throw new Error('D1_UNSUPPORTED_OBJECTIVE');
  if (config.ambition !== 'age_group') throw new Error('D1_UNSUPPORTED_AMBITION');
  if (config.ambitionMeta?.trainingLevel !== 'trained') throw new Error('D1_UNSUPPORTED_LEVEL');
  if (!Number.isInteger(config.weeksAvailable) || config.weeksAvailable! < 4) throw new Error('D1_REQUIRES_AT_LEAST_FOUR_WEEKS');
  if (!config.planStartDate || !/^\d{4}-\d{2}-\d{2}$/.test(config.planStartDate) ||
      !Number.isFinite(Date.parse(config.planStartDate)) ||
      new Date(config.planStartDate).toISOString().slice(0, 10) !== config.planStartDate) {
    throw new Error('D1_REQUIRES_VALID_START_DATE');
  }
  const result = constructDeterministicPlan(structuredClone(athlete), structuredClone(config), {
    maxNodes: 20000,
    // Node count is the decision budget. No elapsed-time branch in an ordinary run.
    maxMilliseconds: Number.MAX_VALUE,
  });
  return {
    version: D1_VERSION,
    engineReference: D1_ENGINE_REFERENCE,
    ...result,
    brickContract: explainD1BrickContract(athlete,config),
    candidate: result.candidate ? { ...result.candidate, totalWeeks: 4, weeks: result.candidate.weeks.slice(0, 4) } : undefined,
    trace: result.trace.filter(t => t.week <= 4),
    validationScope: 'full_preparation_original_horizon_retained',
    preparationWeeks: config.weeksAvailable,
    // Assembly and numeric catalogue checks do not establish complete individual recipes.
    prescriptible: false as const,
    prescriptionBlockers: ['individual_recipe_duration_dose_intensity_recovery_not_fully_attested'],
  };
}
