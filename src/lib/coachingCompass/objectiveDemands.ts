/** Display-only requirements. Describes demands, never creates training zones. */
import type { ObjectifType } from '@/types/athlete';
import { positive, type PerformanceGoal } from './performanceComparison';
export const OBJECTIVE_DEMANDS = {
  IM: { kind: 'tri', runKm: 42.195, bikeKm: 180, swimM: 3800, checks: ['Tenue de la puissance sur longue durée', 'Course après 180 km de vélo', 'Nutrition et tolérance digestive sur la durée visée'] },
  '703': { kind: 'tri', runKm: 21.0975, bikeKm: 90, swimM: 1900, checks: ['Tenue de la puissance sur 90 km', 'Semi-marathon après vélo', 'Nutrition et gestion de l’intensité'] },
  Sprint: { kind: 'tri', runKm: 5, bikeKm: 20, swimM: 750, checks: ['Vitesse natation et transitions', 'Puissance soutenable sur 20 km', '5 km après vélo'] },
  Olympic: { kind: 'tri', runKm: 10, bikeKm: 40, swimM: 1500, checks: ['Natation en eau libre', 'Puissance soutenable sur 40 km', '10 km après vélo'] },
  '5K': { kind: 'road', runKm: 5, checks: ['Performance récente sur 5 km', 'Vitesse aérobie et tenue à l’allure visée'] },
  '10K': { kind: 'road', runKm: 10, checks: ['Performance récente sur 10 km', 'Seuil et tenue à l’allure visée'] },
  Semi: { kind: 'road', runKm: 21.0975, checks: ['Performance récente sur semi', 'Tenue de l’allure et dérive après fatigue'] },
  Marathon: { kind: 'road', runKm: 42.195, checks: ['Durabilité à l’allure visée', 'Nutrition éprouvée et régularité du rythme'] },
  StartToRun: { kind: 'beginner', checks: ['Durée de course continue actuellement tolérée', 'Régularité et récupération entre séances'] },
  Trail: { kind: 'trail', checks: ['Parcours : distance, dénivelé et technicité', 'Montées, descentes et tenue après fatigue'] },
  TrailShort: { kind: 'trail', checks: ['Vitesse en montée sur pente comparable', 'Technique et tolérance musculaire en descente'] },
  TrailMountain: { kind: 'trail', checks: ['Dénivelé, altitude et technicité du parcours', 'Montées et descentes prolongées'] },
  TrailUltra: { kind: 'trail', checks: ['Durée totale, barrières horaires et dénivelé', 'Tolérance musculaire, nutrition et gestion de la nuit'] },
} satisfies Record<ObjectifType, { kind: string; runKm?: number; bikeKm?: number; swimM?: number; checks: string[] }>;
export function objectiveDemands(objective: string) {
  return OBJECTIVE_DEMANDS[objective as ObjectifType] as { kind: string; runKm?: number; bikeKm?: number; swimM?: number; checks: string[] } | undefined;
}
export function compareDisciplines(objective: string, goal: PerformanceGoal | null, current: { ftp?: number | null; css?: number | null }) {
  const demands = objectiveDemands(objective);
  const tri = demands?.kind === 'tri';
  const swimPace = tri && demands.swimM && positive(goal?.swimMinutes) ? goal.swimMinutes * 60 / (demands.swimM / 100) : null;
  const bikeSpeed = tri && demands.bikeKm && positive(goal?.bikeMinutes) ? demands.bikeKm * 60 / goal.bikeMinutes : null;
  return {
    demands, swimPace, bikeSpeed,
    swimGap: swimPace && positive(current.css) ? swimPace - current.css : null,
    powerFraction: tri && positive(goal?.bikeWatts) && positive(current.ftp) ? goal.bikeWatts / current.ftp : null,
    remainingMinutes: tri && goal && positive(goal.swimMinutes) && positive(goal.bikeMinutes) && positive(goal.runMinutes)
      ? goal.minutes - goal.swimMinutes - goal.bikeMinutes - goal.runMinutes : null,
    // Trail average pace is descriptive only: no flat-ground physiology comparison.
    trailPace: demands?.kind === 'trail' && goal && positive(goal.distanceKm) ? goal.minutes * 60 / goal.distanceKm : null,
  };
}

/** Barbosa 2023, Tables 1–2. Descriptive Olympic cohort, never a podium target. */
export function olympicCohort(sex: string | null | undefined) {
  return sex === 'F' ? { n: 20, age: '42,7 ± 7,3', vo2: '49,7 ± 7,6', mas: '14,9 ± 1,8', seconds: 9489, secondsSd: 1357 }
    : sex === 'M' ? { n: 20, age: '43,7 ± 9,3', vo2: '54,6 ± 5,0', mas: '17,1 ± 1,6', seconds: 8825, secondsSd: 920 } : null;
}
