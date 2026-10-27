/** Component-aware candidate contracts. Explicit changes are never promoted to the reference contract. */
import type{PlanAthleteData,PlanConfig}from'@/hooks/useAITrainingPlan';import{prepareGenerationContracts}from'@/lib/plan/prepareGenerationContracts';
import{parseAthleteConstraints}from'@/lib/plan/constraintRules';import{WorkoutLibrary}from'@/lib/workoutLibrary';
import{constructDeterministicPlan,type ExperimentalAssemblyContract}from'./engine';import{contextualizeResult}from'./v2-engine';
import{explicitBrickComponents,ironmanContract}from'./v3-ironman';import{validateExperimentalCandidate}from'./v2-validation';
import{auditGlobalProgression,type ExposureDose}from'./v4-progression';import{auditTechnicalPlan}from'./v2-technical-validation';
import{buildWeeklySlotLayout}from'@/engines/plan/weeklySlotLayout';
import{effectiveSessionQuota}from'../../supabase/functions/_shared/sessionQuotaAccounting';
export type IMModel='reference'|'v3_phase_recovery'|'components_keep_long_endurance'|'components_recovery_relief';
export const IM_MODELS:IMModel[]=['reference','v3_phase_recovery','components_keep_long_endurance','components_recovery_relief'];
const stage=(phase:string|undefined,type:string)=>type==='race'||type==='taper'?'BRICK_ACTIVATION_PRE_RACE':phase==='base'?'BRICK_STAGE1_INTRO':phase==='build'?'BRICK_STAGE2_BUILD':phase==='peak'?'BRICK_STAGE4_SPECIFIC':undefined;
export function raceEveDay(day:number,events:ReadonlyArray<{dayName:string}>){const days=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];return events.some(e=>days.indexOf(e.dayName.toLowerCase())===day+1);}
export function allocateBrick(id:string,total:number,minBike=0){const source=explicitBrickComponents(id);if(!source||total<source.total[0]||total>source.total[1])return null;
 const bike=Math.max(source.bike[0],minBike,total-source.run[1]),run=total-bike;
 return bike<=source.bike[1]&&run>=source.run[0]&&run<=source.run[1]?{bike,run,source:id}:null;
}
export function componentContract(model:'components_keep_long_endurance'|'components_recovery_relief'){
 const changes:Array<{week:number;rule:string;before:unknown;after:unknown}> = [];
 const activationDays=new Map<number,Set<number>>();
 const contract:ExperimentalAssemblyContract={id:`det-v4-${model}`,adapt(prep,config){
  if(config.objective!=='IM'||config.raceGoals?.some(g=>g.raceFormat==='lcw_3day'))throw Error('CONTINUOUS_IM_ONLY');
  for(const [number,entry]of Object.entries(prep.weeklyQuotas)){
   activationDays.set(Number(number),new Set(Array.from({length:7},(_,d)=>d).filter(d=>raceEveDay(d,entry.layout?.requiredEvents??[]))));
   if(entry.weekType==='taper'){
    const before=structuredClone(entry),bricks=entry.layout?.days.flatMap(d=>d.slots).filter(s=>s.sport==='brick').length??0;
    entry.quota={...entry.quota,brick:{min:0,max:0},totalSessions:effectiveSessionQuota(entry.quota,bricks).totalSessions};
    entry.floors={...entry.floors,longRideWeekly:false};
    entry.layout=buildWeeklySlotLayout(entry.quota,entry.floors,entry.weekType,{dayBans:prep.dayBans,raceEvents:before.layout?.requiredEvents});
    changes.push({week:Number(number),rule:'explicit_candidate_taper_brick_replaced_by_standalone_bike_frequency',before,after:structuredClone(entry)});continue;
   }
   const week=Number(number);
   for(const day of entry.layout?.days??[])for(const slot of day.slots.filter(s=>s.sport==='brick'&&!s.isRaceEvent)){
    const index=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].indexOf(day.dayName),id=activationDays.get(week)?.has(index)?'BRICK_ACTIVATION_PRE_RACE':stage(entry.phase,entry.weekType),components=id?explicitBrickComponents(id):null;if(!components)throw Error(`EXPLICIT_BRICK_COMPONENTS_UNAVAILABLE:${week}`);
    const before=structuredClone({slot,floors:entry.floors});
    const relief=model==='components_recovery_relief'&&(entry.weekType!=='load'||id==='BRICK_ACTIVATION_PRE_RACE');
    if(relief){entry.floors.longRideWeekly=false;entry.floors.slLongRideMin=undefined;}
    const floor=entry.floors.longRideWeekly?entry.floors.slLongRideMin??0:0;
    const combinedCanCover=components.bike[1]>=floor;
    if(floor>0&&!combinedCanCover){
     const bike=entry.layout?.days.flatMap(d=>d.slots).find(s=>s.sport==='bike'&&!s.isRaceEvent);
     if(!bike)throw Error(`NO_STANDALONE_BIKE_FOR_EXISTING_LONG_FLOOR:${week}`);
     bike.isLongSession=true;bike.minDurationMin=Math.max(bike.minDurationMin??0,floor);slot.isLongSession=false;
    }
    slot.minDurationMin=combinedCanCover&&floor>0?Math.max(components.total[0],floor+components.run[0]):components.total[0];
    slot.maxDurationMin=Math.min(slot.maxDurationMin??Infinity,components.total[1]);
    changes.push({week,rule:relief?'explicit_candidate_recovery_long_floor_relief':'long_endurance_preserved_by_component_or_standalone',before,after:structuredClone({slot,floors:entry.floors})});
   }
  }
 },filterCandidate(m,c){
  if(c.slot.sport!=='brick')return true;
  const onRaceEve=activationDays.get(c.week)?.has(c.dayIndex)??false;
  if(m.id!==(onRaceEve?'BRICK_ACTIVATION_PRE_RACE':stage(c.phase,c.weekType??'load')))return false;
  // Activation is a race-eve card, never a generic taper-week endurance session.
  if(m.id==='BRICK_ACTIVATION_PRE_RACE')return onRaceEve;
  return true;
 },doseRange(m,c){return c.slot.sport==='brick'?explicitBrickComponents(m.id)?.total??null:m.durationMin;}};
 return{contract,changes};
}
export function buildIronmanCandidate(athlete:PlanAthleteData,config:PlanConfig,model:IMModel){
 const bans=parseAthleteConstraints(config.constraints??'').bannedSports.filter(s=>['swim','bike','run'].includes(s));
 if(model.startsWith('components_')&&bans.length)return{model,status:'refused' as const,reason:'candidate_continuity_contract_conflicts_with_training_ban',bans,technicallyConstructed:false,scientificValidity:'not_attested'};
 const variant=model.startsWith('components_')?componentContract(model as 'components_keep_long_endurance'|'components_recovery_relief'):undefined;
 let result;try{result=contextualizeResult(constructDeterministicPlan(athlete,config,{maxNodes:5000,maxMilliseconds:30000},model==='v3_phase_recovery'?ironmanContract('phase_recovery_catalogue'):variant?.contract),athlete,config);}
 catch(error){if(!String(error).includes('NO_STANDALONE_BIKE')&&!String(error).includes('EXPLICIT_BRICK_COMPONENTS'))throw error;return{model,status:'refused' as const,reason:String(error),technicallyConstructed:false,changes:variant?.changes,scientificValidity:'not_attested'};}
 const ledger:ExposureDose[]=result.candidate?.weeks.flatMap(w=>w.sessions.flatMap((s,index)=>{const entry=result.candidate?.weeklyQuotas?.[w.weekNumber],slot=entry?.layout?.days[s.dayIndex]?.slots.find(slot=>slot.sport==='brick');const minBike=slot?.isLongSession&&entry?.floors.longRideWeekly?entry.floors.slLongRideMin??0:0;const component=s.catalogId?allocateBrick(s.catalogId,s.durationMin??0,minBike):null;return s.sport==='brick'&&!s.custom&&component?[{week:w.weekNumber,session:index,components:component,dPlusM:null,dMinusM:null,eccentric:false,runWalk:false,source:'explicit_primary_brick_ranges'}]:[];}))??[];
 const original=prepareGenerationContracts(athlete,config,{rotationSeed:0});
 return{model,...result,changes:variant?.changes??[],ledger,technical:auditTechnicalPlan(result.candidate),
  originalIssues:result.candidate?validateExperimentalCandidate({...result.candidate,weeklyQuotas:original.weeklyQuotas},athlete,config):null,
  global:result.candidate?auditGlobalProgression(result.candidate,ledger,['swim','bike','run']):null,
  scientificValidity:'not_attested',humanReviewRequired:true,
  contractDefinitions:{base:'introductory transition with explicit bike/run components',build:'development constrained by original phase catalogue',peak:'specific card plus preserved long endurance',taper:'race-eve activation only; no card stretched into generic taper',recovery:model==='components_recovery_relief'?'explicit_candidate_relief_not_reference_compliant':'original_long_endurance_obligation_preserved'},catalogueSource:WorkoutLibrary.length};
}
