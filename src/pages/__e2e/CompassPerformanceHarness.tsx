/** Synthetic data only. Route guarded by import.meta.env.DEV. */
import { useState } from 'react';
import { CompassPerformanceComparison } from '@/components/CompassPerformanceComparison';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
import type { PerformanceGoal } from '@/lib/coachingCompass/performanceComparison';
export default function CompassPerformanceHarness() {
  const [athlete, setAthlete] = useState('A');
  const [goals, setGoals] = useState<Record<string, PerformanceGoal>>({});
  const input = { athleteId: athlete, objectif: athlete === 'A' ? 'Marathon' : 'IM', ambition: 'competitor', athleteAge: 42, athleteSex: 'F', vma: 14, vo2max: 47, paceThresholdSecPerKm: 290, performanceGoal: goals[athlete] } as CoachingCompassInput;
  return <main className="max-w-3xl p-4 mx-auto"><button onClick={() => setAthlete(athlete === 'A' ? 'B' : 'A')}>Changer d’athlète fictif</button><CompassPerformanceComparison key={athlete} input={input} onSave={async goal => { setGoals(previous => ({ ...previous, [athlete]: goal })); return true; }} /></main>;
}
