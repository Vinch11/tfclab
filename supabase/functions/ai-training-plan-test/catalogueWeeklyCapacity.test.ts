import {assertEquals} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {catalogueForWeek, checkSessionCatalogue} from '../_shared/sessionCatalogueContract.ts';
import {isOneTimeTestProtocol, parseWeeklyFrequencyCap} from '../_shared/catalogueWeeklyFrequency.ts';
import type {RepairWorkoutMetadata} from '../_shared/repairSportingEquivalence.ts';
const card:RepairWorkoutMetadata={metadataVersion:1,complete:true,id:'OFFLINE_Z2',sport:'run',title:'Endurance Z2',objective:'10K',intentFamily:'endurance_fondamentale',goals:['10k'],objectiveSpecific:false,phases:['base'],durationMin:[40,60],mainZoneMax:2,specialContext:null,prerequisiteKeys:[],necessity:'Recommandé',when:'Base',avoid:'',tags:[],structure:'Main: 40–60min Z2',zones:['Z2']};
Deno.test('catalogue coverage distinguishes repeat capacity from distinct-card diversity without mutation',()=>{
 const before=JSON.stringify(card);
 const result=catalogueForWeek([card],{objective:'10K',phase:'base'},{run:{min:4},totalSessions:{min:6}});
 assertEquals(result.missingSports,[]);assertEquals(result.limitedDiversitySports,['run']);
 assertEquals(JSON.stringify(card),before);
});
Deno.test('single-use protocols, explicit limits and duplicate catalogue IDs cannot inflate capacity',()=>{
 for(const source of [{...card,tags:['test']},{...card,when:'Base, 1x/semaine max'}]){
  const result=catalogueForWeek([source,source],{phase:'base'},{run:{min:2}});
  assertEquals(result.missingSports,['run']);assertEquals(result.limitedDiversitySports,[]);
 }
 const capped={...card,when:'Base, 2x/semaine max'};
 assertEquals(catalogueForWeek([capped],{phase:'base'},{run:{min:2}}).missingSports,[]);
 assertEquals(catalogueForWeek([capped],{phase:'base'},{run:{min:3}}).missingSports,['run']);
});
Deno.test('missing sport, phase, recovery intensity and real prescription mismatches remain rejected',()=>{
 assertEquals(catalogueForWeek([],{phase:'base'},{run:{min:1}}).missingSports,['run']);
 assertEquals(catalogueForWeek([card],{phase:'peak'},{run:{min:1}}).missingSports,['run']);
 assertEquals(catalogueForWeek([{...card,mainZoneMax:4,zones:['Z4']}],{phase:'base',weekType:'recovery'},{run:{min:1}}).missingSports,['run']);
 const errors=checkSessionCatalogue({catalogId:card.id,title:'Seuil lactique',sport:'run',durationMin:90,zones:['Z5']},{catalog:[card],objective:'10K',phase:'base'}).errors;
 for(const code of ['catalogue_duration','catalogue_intensity_exceeded','catalogue_physiological_intent'])assertEquals(errors.includes(code),true);
});
Deno.test('shared frequency rules preserve the existing validator interpretation',()=>{
 assertEquals(isOneTimeTestProtocol({tags:['TEST']}),true);
 assertEquals(parseWeeklyFrequencyCap('Base/Build, 2x/semaine max'),2);
 assertEquals(parseWeeklyFrequencyCap('Base, sans plafond explicite'),null);
});
Deno.test('both generation paths retain critical true shortfalls and explicit diversity diagnostics',()=>{
 for(const name of ['ai-training-plan','ai-training-plan-test']){
  const source=Deno.readTextFileSync(new URL(`../${name}/jsonPlanHandler.ts`,import.meta.url));
  assertEquals(source.includes('code: "catalogue_diversity_limited", severity: "warning"'),true);
  assertEquals(source.includes('if (missingSports.length || (allowedIds.length > 0 && eligible.length === 0))'),true);
  assertEquals(source.includes('code: "catalogue_pool_insufficient", severity: "critical"'),true);
 }
});
