import { it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { d1Fixture, d1Profiles } from './fixtures';
import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import { assessPreparedGeneration } from '@/lib/plan/prevalidateTrainingPlan';
import { WorkoutLibrary } from '@/lib/workoutLibrary';
import { buildRepairWorkoutMetadata } from '@/lib/plan/repairCatalogMetadata';
import { catalogueEligibility } from '../../../../supabase/functions/_shared/sessionCatalogueContract';
import { checkSessionCatalogue } from '../../../../supabase/functions/_shared/sessionCatalogueContract';
import { normalizeRepairSport, evaluateRepairSportingEquivalence } from '../../../../supabase/functions/_shared/repairSportingEquivalence';
it('records the exact week 2 empty domain without changing eligibility or doses', () => {
  vi.useFakeTimers({toFake:['Date']}); vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
  const log=vi.spyOn(console,'log').mockImplementation(()=>{});
  try {
    const rows=d1Profiles.map(profile=>{
      const {athlete,config}=d1Fixture(profile),prep=prepareGenerationContracts(athlete,config,{rotationSeed:0});
      const report=assessPreparedGeneration(config,prep),w=report.weeks.find(w=>w.week===2)!;
      const catalog=[...new Map([...Object.values(prep.phaseRepairCatalogs).flat(),...prep.chunkRepairCatalogs.flat(),...prep.chunkRegenRepairCatalogs.flat()].map(m=>[m.id,m])).values()];
      const allowed=new Set(w.eligible.map(m=>m.id));
      const context={objective:w.objective,phase:w.phase,weekType:w.weekType};
      return {profile,context,allBrickSources:WorkoutLibrary.filter(card=>normalizeRepairSport(card.sport)==='brick').map(card=>{const m=buildRepairWorkoutMetadata(card);return {id:m.id,duration:m.durationMin,eligible:catalogueEligibility(m,context),inPreparedCatalog:catalog.some(c=>c.id===m.id)};}),slots:prep.weeklyQuotas[2].layout!.days.flatMap((d,dayIndex)=>d.slots.map(slot=>({dayIndex,slot,candidates:catalog.filter(m=>allowed.has(m.id)&&normalizeRepairSport(m.sport)===slot.sport).map(m=>{
        const equivalence=evaluateRepairSportingEquivalence(null,m,{...context,operation:'insertion'});
        const duration=Math.max(m.durationMin[0],slot.minDurationMin??0),max=Math.min(m.durationMin[1],slot.maxDurationMin??Infinity);
        const checked=checkSessionCatalogue({catalogId:m.id,title:m.title,sport:slot.sport,details:m.structure,durationMin:duration,zones:m.mainZoneMax?[`Z${m.mainZoneMax}`]:m.zones},{...context,catalog});
        return {id:m.id,sourceRange:m.durationMin,duration,max,equivalence,checked,accepted:equivalence.compatible&&duration<=max&&!checked.errors.length&&!checked.unknown.length};
      })}))) };
    });
    writeFileSync('docs/d1/evidence/domain-diagnostic.json',JSON.stringify(rows,null,2));
  } finally {log.mockRestore();vi.useRealTimers();}
});
