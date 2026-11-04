import{WorkoutLibrary}from'@/lib/workoutLibrary';
import{buildRepairWorkoutMetadata}from'@/lib/plan/repairCatalogMetadata';
import{buildWorkoutCatalog,toInjuryRiskCatalogOption}from'@/lib/workoutCatalogBuilder';
import{getCatalogExclusions,getCatalogSportFilter}from'@/lib/plan/catalogScope';
import type{RepairWorkoutMetadata}from'../../supabase/functions/_shared/repairSportingEquivalence';
import{normalizeRepairSport}from'../../supabase/functions/_shared/repairSportingEquivalence';
import type{V10Profile}from'./v10-profiles';import{auditRecipe}from'./v13-integrity';import{digest}from'./v9-prospective';
const cache=new WeakMap<V10Profile,Map<number,RepairWorkoutMetadata[]>>();
/** Expand a read-only offer, not a permutation search. Actual selected recipes are audited separately. */
export function prospectivePool(p:V10Profile,week:number){let m=cache.get(p);if(!m){m=new Map();cache.set(p,m);}if(!m.has(week)){const q=p.prep.weeklyQuotas[week],a=p.config.ambitionMeta!;m.set(week,buildWorkoutCatalog(p.config.objective!,week,week,p.config.weeksAvailable??16,{sportFilter:getCatalogSportFilter(p.config.objective!),...getCatalogExclusions(p.config.objective!,p.config.raceGoals),maxItems:2000,strictPhaseFilter:true,phaseOverride:[q.phase!],weekContexts:[{objective:p.config.objective!,phase:q.phase,weekType:q.weekType}],rotationSeed:0,limiters:p.config.identifiedLimitersRaw,prohibitions:p.config.prohibitions,injuryRisk:toInjuryRiskCatalogOption(p.config.injuryRisk),beginnerIntensitySignal:{trainingLevel:a.trainingLevel,trainingLevelSource:a.trainingLevelSource,weeklyHours:p.config.weeklyHours??null}}).map(c=>c.repairMetadata));}return m.get(week)!;}
export function originalCard(id:string){const raw=WorkoutLibrary.find(w=>w.id===id);if(!raw)throw Error('SOURCE_MISSING:'+id);return buildRepairWorkoutMetadata(raw);}
/** Narrow, witnessed complete-declared-content audit. No generic interpretation of the302 unknown sources. */
export function targetedTiming(card:RepairWorkoutMetadata){
 const raw=WorkoutLibrary.find(w=>w.id===card.id)!;const previous=auditRecipe(card);let range:[number,number]|null=previous.fullRecipeTimeRange,proof=range?'V13 complete literal parts':null;
 if(card.id==='SEILER_BIKE_Z1_LONG'){
  const main=raw.structure.find(s=>/main/i.test(s.part))?.text??'',m=main.match(/^(\d+)-(\d+) min/);const peripheral=raw.structure.filter(s=>!/main/i.test(s.part));
  if(m&&peripheral.every(s=>/^Intégré/i.test(s.text))){range=[+m[1],+m[2]];proof='90–180 min; warm-up and cool-down explicitly integrated, never added twice';}
 }
 const singleTimed=['A_IM_RUN_PACE','A_RUN_EASY_45_PRO','D_RUN_REGEN','D_BIKE_RECOVERY','V2_RECUP_VELO_REGENERATION'];
 if(singleTimed.includes(card.id)&&raw.structure.length===1){const m=raw.structure[0].text.match(/^(\d+)\s*[–-]\s*(\d+)\s*(?:min|'|’)/);if(m){range=[+m[1],+m[2]];proof='single continuous timed recipe, all declared content; no extra warm-up invented';}}
 if(card.id==='A_RUN_Z2_EASY'){range=[40,90];proof='warm10 + main20–70 + cool5 + optional drills5 retained; main is the only variable';}
 const min=Math.max(card.durationMin[0],range?.[0]??previous.knownMandatoryLowerMin??0),max=Math.min(card.durationMin[1],range?.[1]??Infinity);
 return{sourceId:card.id,sourceHash:digest(card),originalRange:card.durationMin,allDeclaredParts:raw.structure,previousV13:previous,declaredContentRange:range,necessaryRange:[min,max]as[number,number],timingCompleteForDeclaredRecipe:range!==null,proof,individualFeasibilityAttested:false,sourceUnchanged:true,unknowns:range?['actual execution, symptoms and recovery not observed']:['complete protocol elapsed time not established; all source components retained']};
}
export function explicitDose(card:RepairWorkoutMetadata,minutes:number){
 if(card.id==='A_RUN_Z2_EASY')return{warmup:10,main:minutes-20,cooldown:5,optionalDrillsRetained:5,total:minutes,valid:minutes-20>=20&&minutes-20<=70};
 if(card.id==='SEILER_BIKE_Z1_LONG')return{continuousIncludingPeripheral:minutes,warmupIncluded:15,cooldownIncluded:15,total:minutes,valid:minutes>=90&&minutes<=180};
 return{total:minutes,allSourceComponentsUnchanged:true,valid:true};
}
export function sourceSport(c:RepairWorkoutMetadata){return normalizeRepairSport(c.sport);}
