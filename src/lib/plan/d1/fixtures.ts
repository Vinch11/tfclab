import { preparePlanningCaseContext, type PlanningCase } from '@/qa/sports-plan-lab/planningMatrix';
import fixture from '../../../../docs/d1/fixtures.json';

export function d1Fixture(archetype: string) {
  if (!fixture.profiles.includes(archetype)) throw new Error('UNKNOWN_D1_FIXTURE');
  const spec: PlanningCase = { id: `D1_${archetype}`, objective: '703', level: 'trained',
    ambition: 'age_group', load: 'known_synthetic', physiology: archetype,
    constraints: 'unrestricted', duration: 'native', intermediate: false };
  const { prepared } = preparePlanningCaseContext(spec);
  return { athlete: prepared.athleteData, config: { ...prepared.planConfig,
    planStartDate: fixture.planStartDate } };
}
export const d1Profiles = fixture.profiles;
