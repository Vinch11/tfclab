import type { PlanAthleteData, PlanConfig } from '@/hooks/useAITrainingPlan';
import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import { BRICK_BASE_703_V2 } from '@/lib/workouts/v2/brickBase703';

/** Explain the unchanged quota; never rewrite it to fit a catalogue source. */
export function explainD1BrickContract(athlete: PlanAthleteData, config: PlanConfig) {
  const prep = prepareGenerationContracts(athlete,config,{rotationSeed:0});
  return Object.entries(prep.weeklyQuotas).filter(([n])=>Number(n)<=4).flatMap(([n,entry])=>
    (entry.layout?.days ?? []).flatMap(day=>day.slots.filter(s=>s.sport==='brick').map(slot=>({
      week:Number(n),weekType:entry.weekType,day:day.dayName,
      bikeFloorMinutes:entry.floors.slLongRideMin ?? null,
      slotMinimumMinutes:slot.minDurationMin ?? null,
      surrogateLongRide:!!slot.isLongSession,
      sourceEnvelopeMinutes:BRICK_BASE_703_V2.sourceEnvelopeSeconds.map(s=>s/60),
      sourceBikeMinutes:BRICK_BASE_703_V2.bikeSeconds.map(s=>s/60),
      sourceRunMinutes:BRICK_BASE_703_V2.runSeconds.map(s=>s/60),
      compatibleBikeFloor:(entry.floors.slLongRideMin??0)*60<=BRICK_BASE_703_V2.bikeSeconds[1],
      compatibleEnvelope:slot.minDurationMin!==undefined&&slot.minDurationMin*60<=BRICK_BASE_703_V2.sourceEnvelopeSeconds[1],
      decision:'coach_arbitration_required' as const,
      reason:'Le brick remplace la sortie longue vélo : minimum natif = plancher vélo + 20 min. Le modèle base existant reste borné à 60–90 min, dont 45–60 min de vélo. La durée de transition ne peut pas remplacer du vélo manquant.',
      origin:'src/engines/plan/weeklySlotLayout.ts:171',
    }))));
}
