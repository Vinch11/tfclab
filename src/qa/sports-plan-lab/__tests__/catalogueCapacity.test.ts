import {expect,it} from 'vitest';
import {WorkoutLibrary} from '@/lib/workoutLibrary';
import {buildRepairWorkoutMetadata} from '@/lib/plan/repairCatalogMetadata';
import {catalogueForWeek,checkSessionCatalogue} from '../../../../supabase/functions/_shared/sessionCatalogueContract';
const intro=()=>buildRepairWorkoutMetadata(WorkoutLibrary.find(w=>w.id==='BRICK_STAGE1_INTRO')!);
it('distinguishes limited diversity from missing weekly capacity without constructing repeated sessions',()=>{
 const card=intro(),before=structuredClone(card);
 const result=catalogueForWeek([card],{objective:'703',phase:'base',weekType:'recovery'},{brick:{min:2}});
 expect(result.missingSports).toEqual([]);
 expect(result.limitedDiversitySports).toEqual(['brick']);
 expect(result.eligible).toEqual([before]);expect(card).toEqual(before);
});
it('retains a genuine shortfall for single-use tests and explicitly capped protocols',()=>{
 for(const card of [{...intro(),tags:['test']},{...intro(),when:'Base, 1x/semaine max'}]){
  expect(catalogueForWeek([card],{objective:'703',phase:'base'},{brick:{min:2}}).missingSports).toEqual(['brick']);
 }
});
it('does not count duplicate IDs as separate capacity for a capped card',()=>{
 const card={...intro(),when:'Base, 1x/semaine max'};
 expect(catalogueForWeek([card,card],{objective:'703',phase:'base'},{brick:{min:2}}).missingSports).toEqual(['brick']);
});
it('keeps absent sport, wrong phase and recovery intensity exclusions blocking',()=>{
 const card=intro();
 expect(catalogueForWeek([],{phase:'base'},{brick:{min:1}}).missingSports).toEqual(['brick']);
 expect(catalogueForWeek([card],{phase:'peak'},{brick:{min:1}}).missingSports).toEqual(['brick']);
 expect(catalogueForWeek([{...card,mainZoneMax:4,zones:['Z4']}],{phase:'base',weekType:'recovery'},{brick:{min:1}}).missingSports).toEqual(['brick']);
 const errors=checkSessionCatalogue({catalogId:card.id,title:card.title,sport:'brick',durationMin:150,zones:['Z4']},{catalog:[card],phase:'base',weekType:'recovery',objective:'703'}).errors;
 expect(errors).toContain('catalogue_duration');expect(errors).toContain('catalogue_intensity_exceeded');
});
it('uses explicit frequency capacity without silently granting more uses',()=>{
 const card={...intro(),when:'Base, 2x/semaine max'};
 expect(catalogueForWeek([card],{phase:'base'},{brick:{min:2}}).missingSports).toEqual([]);
 expect(catalogueForWeek([card],{phase:'base'},{brick:{min:3}}).missingSports).toEqual(['brick']);
});
