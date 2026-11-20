/** Synthetic data only. Route guarded by import.meta.env.DEV. */
import { detectUnifiedLimiter } from '@/lib/v2/unifiedLimiterDetection';
import { useState } from 'react';
import { CompassPerformanceComparison } from '@/components/CompassPerformanceComparison';
import type { CoachingCompassInput } from '@/lib/coachingCompass/types';
import type { PerformanceGoal } from '@/lib/coachingCompass/performanceComparison';
export default function CompassPerformanceHarness() {
  const [athlete, setAthlete] = useState('A');
  const [goals, setGoals] = useState<Record<string, PerformanceGoal>>({});
  const limiterResult = detectUnifiedLimiter({
    objectif: athlete === 'A' ? 'Marathon' : 'IM', ambition: 'competitor',
    sportFocus: athlete === 'A' ? 'run' : 'tri', age: 42,
    vo2max: null, ftpKg: null, vma: null, wprimeKj: null, economyScore: null,
    vlamax: 0.8, vlamaxSource: 'power_model', fatmax: 38, fatmaxSource: 'model',
    tte: 14, tteSource: athlete === 'A' ? 'estimated' : 'observed',
    availabilityScore: null, hasHealthAlerts: false,
  });
  const input: CoachingCompassInput = {
    athleteId: athlete, objectif: athlete === 'A' ? 'Marathon' : 'IM',
    ambition: 'competitor', sportFocus: athlete === 'A' ? 'run' : 'triathlon',
    athleteAge: 42, athleteSex: 'F', performanceGoal: goals[athlete], limiterResult,
    ftp: null, poids: null, tss7d: null, snapshotDate: null, snapshotUpdatedAt: null,
    pmax5s: null, p30sW: null, p60sW: null, map5minW: null, wprimeKj: null,
    vma: 14, vo2max: 47, paceThresholdSecPerKm: 290, runEconomyScore: null, hrDriftPct: null,
    fatmax: 38, vlamaxEffectif: { value: 0.8, confidence: 0.4, source: 'power_model' },
    tteEffectif: { tte_min: 14, confidence: 0.5, source: athlete === 'A' ? 'estimated' : 'observed' },
    fatigueEffectif: null, potentielPhysiologique: null, strategyResult: null, lactateThresholds: null,
  };
  return <main className="max-w-3xl p-4 mx-auto"><button onClick={() => setAthlete(athlete === 'A' ? 'B' : 'A')}>Changer d’athlète fictif</button><CompassPerformanceComparison key={athlete} input={input} onSave={async goal => { setGoals(previous => ({ ...previous, [athlete]: goal })); return true; }} /></main>;
}
