import { parseStoredCriticalMetrics, type StoredCriticalSport } from '@/lib/criticalMetrics';
import { deduceSportMainFromGoal } from '@/lib/sportMainDeduction';
import type { CoachingCompassInput } from './types';

export interface SportReference {
  sport: 'running' | 'cycling';
  label: string;
  value: number | null;
  unit: string;
  source: string;
  conditions: string;
}

/** Display context only: never changes the diagnostic's input sport or ranking. */
export function compassDisplaySport(input: CoachingCompassInput): 'run' | 'bike' | 'triathlon' {
  const goal = deduceSportMainFromGoal(input.objectif);
  return goal === 'run' ? 'run' : goal === 'tri' ? 'triathlon' : input.sportFocus ?? 'bike';
}

export function buildSportReferences(input: CoachingCompassInput): SportReference[] {
  const sport = compassDisplaySport(input);
  const metrics = parseStoredCriticalMetrics(input.criticalMetrics);
  const refs: SportReference[] = [];
  const add = (s: SportReference['sport'], m: StoredCriticalSport | undefined, power: boolean) => {
    const source = !m ? 'unknown' : m.status === 'confirmed' ? 'observed' : 'records';
    const conditions = m?.efforts.map(e => e.conditions).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ') ?? '';
    const name = s === 'cycling' ? 'vélo' : 'course';
    refs.push({ sport: s, label: `${power ? 'CP' : 'Vitesse critique'} ${name}`, value: m ? (power ? m.critical : m.critical * 3.6) : null, unit: power ? 'W' : 'km/h', source, conditions });
    refs.push({ sport: s, label: `${power ? 'W′' : 'D′'} ${name}`, value: m ? (power ? m.reserve / 1000 : m.reserve) : null, unit: power ? 'kJ' : 'm', source, conditions });
  };
  if (sport !== 'bike') {
    // Reject old malformed running entries containing power: never render watts as distance.
    const run = metrics.running?.efforts.some(e => e.measurement === 'power') ? undefined : metrics.running;
    add('running', run, false);
    add('running', metrics.runningPower, true);
  }
  if (sport !== 'run') {
    add('cycling', metrics.cycling, true);
    if (!metrics.cycling && input.wprimeKj && input.wprimeKj > 0) {
      const reserve = refs.find(r => r.label === 'W′ vélo');
      if (reserve) { reserve.value = input.wprimeKj; reserve.source = 'estimation'; reserve.conditions = 'Estimation historique depuis les puissances vélo'; }
    }
  }
  return refs;
}