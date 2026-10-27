import {normalizeRepairGoal} from "../../../../supabase/functions/_shared/repairSportingEquivalence";
import {executableCatalogueDurationRanges} from "../../../../supabase/functions/_shared/sessionCatalogueContract";
import {it,expect} from 'vitest';
import {buildWorkoutCatalog,retainCatalogueDurationCoverage} from '@/lib/workoutCatalogBuilder';
import {catalogueEligibility} from '../../../../supabase/functions/_shared/sessionCatalogueContract';
it('does not let mixed-phase chunk capping consume the compatible weekly family pool',()=>{
 const contexts=[{phase:'base',weekType:'load',objective:'703'},{phase:'build',weekType:'recovery',objective:'703'}];
 const options={strictPhaseFilter:true,phaseOverride:['base' as const,'build' as const],rotationSeed:0};
 const full=buildWorkoutCatalog('703',1,5,16,{...options,maxItems:10000});
 const chosen=buildWorkoutCatalog('703',1,5,16,{...options,maxItems:30,weekContexts:contexts});
 for(const context of contexts){
  const eligible=full.filter(e=>!catalogueEligibility(e.repairMetadata,context).length);
  for(const key of new Set(eligible.map(e=>`${e.sport}:${e.repairMetadata.intentFamily}`))){
   const group=eligible.filter(e=>`${e.sport}:${e.repairMetadata.intentFamily}`===key);
   const retained=chosen.filter(e=>`${e.sport}:${e.repairMetadata.intentFamily}`===key&&!catalogueEligibility(e.repairMetadata,context).length);
   expect(retained.length).toBeGreaterThanOrEqual(Math.min(4,group.length));
   expect(Math.min(...retained.map(e=>e.durationMin[0]))).toBeLessThanOrEqual(Math.min(...group.map(e=>e.durationMin[0])));
   expect(Math.max(...retained.map(e=>e.durationMin[1]))).toBeGreaterThanOrEqual(Math.max(...group.map(e=>e.durationMin[1])));
  }
 }
});

it('dose bounds include only executable goal-matching variants, not arbitrary prose',()=>{
 const card=buildWorkoutCatalog('10K',1,4,12,{maxItems:30})[0].repairMetadata;
 const fixture={...card,durationMin:[100,150] as [number,number],variants:{half:"Z2 40–70 min",ironman:"Z2 80–90 min",other:"court si nécessaire"}};
 expect(executableCatalogueDurationRanges(fixture,'703')).toEqual([[100,150],[40,70]]);
 expect(executableCatalogueDurationRanges(fixture,'10K')).toEqual([[100,150]]);
});

it.each(['ironman','half','sprint','olympic','marathon','semi','10k','5k','trail_short','trail_mountain','trail_ultra','trail_long','start_to_run'])('canonical catalogue goal %s is stable',goal=>{
 expect(normalizeRepairGoal(goal)).toBe(goal);
});
import {catalogueTrainingMinimaForWeek} from '../../../../supabase/functions/_shared/catalogueTrainingMinima';
it('catalogue coverage does not demand a standalone bike already replaced by a mandatory brick',()=>{
 const quota={bike:{min:3,max:3},brick:{min:1,max:1},run:{min:3,max:3}};
 const before=structuredClone(quota);
 expect(catalogueTrainingMinimaForWeek(quota,{objective:'703'},1).bike.min).toBe(2);
 expect(quota).toEqual(before);
});

it('keeps an intermediate activation interval instead of retaining only short/long extremes',()=>{
 const cards=[{id:'short',durationMin:[5,10] as const},{id:'activation',durationMin:[20,30] as const},{id:'contained',durationMin:[21,25] as const},{id:'long',durationMin:[60,90] as const}];
 expect(retainCatalogueDurationCoverage(cards).map(c=>c.id)).toEqual(['short','activation','long']);
 expect(cards[2].durationMin).toEqual([21,25]);
});
