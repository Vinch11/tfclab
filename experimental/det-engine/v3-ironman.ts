/** Reversible candidate contracts. None replaces the TFCL production or reference contract. */
import {WorkoutLibrary} from '@/lib/workoutLibrary';
import type {ExperimentalAssemblyContract} from './engine';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {isRaceDaySession} from '../../supabase/functions/_shared/raceDayIdentity';
const stageId=(phase:string)=>phase==='base'?'BRICK_STAGE1_INTRO':phase==='build'?'BRICK_STAGE2_BUILD':phase==='peak'?'BRICK_STAGE4_SPECIFIC':undefined;
export function explicitBrickComponents(id:string){
 const fiche=WorkoutLibrary.find(w=>w.id===id);if(!fiche)return null;
 const read=(part:string)=>{const p=fiche.structure.find(p=>p.part.toLowerCase()===part.toLowerCase());
  const m=p?.text.match(/^(\d+)\s*[–-]\s*(\d+)'/);return m?[Number(m[1]),Number(m[2])] as [number,number]:null;};
 const bike=read('Bike'),run=read('Run');
 return bike&&run?{bike,run,total:[bike[0]+run[0],bike[1]+run[1]] as [number,number],source:id}:null;
}
export type IronmanModel='reference'|'phase_catalogue_dose'|'phase_component_consistent'|'phase_with_standalone_endurance'|'phase_recovery_catalogue';
export const IRONMAN_MODELS:IronmanModel[]=['reference','phase_catalogue_dose','phase_component_consistent','phase_with_standalone_endurance','phase_recovery_catalogue'];
export function ironmanContract(model:IronmanModel):ExperimentalAssemblyContract|undefined{
 if(model==='reference')return undefined;
 return {id:`det-v3-im-${model}`,adapt(prep,config){
  if(config.objective!=='IM'||config.raceGoals?.some(g=>g.raceFormat==='lcw_3day'))throw Error('IRONMAN_CONTINUOUS_ONLY');
  for(const entry of Object.values(prep.weeklyQuotas)){
   if(entry.weekType!=='load'&&!(model==='phase_recovery_catalogue'&&entry.weekType==='recovery'))continue; // Taper/race untouched.
   const id=stageId(entry.phase??''),fiche=WorkoutLibrary.find(w=>w.id===id);if(!fiche)continue;
   const component=explicitBrickComponents(fiche.id);
   const range=model==='phase_component_consistent'&&component?component.total:fiche.durationMin;
   const slots=entry.layout?.days.flatMap(d=>d.slots)??[];
   for(const slot of slots.filter(s=>s.sport==='brick'&&s.isLongSession&&!s.isRaceEvent)){
    if(model==='phase_with_standalone_endurance'){
     const bike=slots.find(s=>s.sport==='bike'&&!s.isRaceEvent);
     if(!bike)continue; // Do not invent an extra slot or silently remove the long endurance requirement.
     bike.minDurationMin=Math.max(bike.minDurationMin??0,entry.floors.slLongRideMin??0);
     bike.isLongSession=true;
    }
    slot.minDurationMin=entry.weekType==='recovery'?Math.min(slot.minDurationMin??range[0],range[0]):range[0];
    slot.maxDurationMin=Math.min(slot.maxDurationMin??Infinity,range[1]);
   }
  }
 }};
}
export function auditIronmanExposure(plan:ParsedPlan){
 const weeks=plan.weeks.map(w=>{
  const active=w.sessions.filter(s=>!s.isRest&&!isRaceDaySession(s));
  const dose=(sport:string)=>active.filter(s=>s.sport===sport).reduce((n,s)=>n+(s.durationMin??0),0);
  const bricks=active.filter(s=>s.sport==='brick');
  return {week:w.weekNumber,phase:w.phase,type:plan.weeklyQuotas?.[w.weekNumber]?.weekType??'unknown',race:w.sessions.some(isRaceDaySession),
   swim:dose('swim'),bikeStandalone:dose('bike'),runStandalone:dose('run'),brick:dose('brick'),total:active.reduce((n,s)=>n+(s.durationMin??0),0),
   bricks:bricks.map(s=>({id:s.catalogId,duration:s.durationMin,components:s.catalogId?explicitBrickComponents(s.catalogId):null,
    nextDay:active.filter(n=>n.dayIndex===s.dayIndex+1).map(n=>({sport:n.sport,id:n.catalogId,duration:n.durationMin}))}))};
 });
 return {weeks,rollingThreeWeekMinutes:weeks.map((w,i)=>({week:w.week,minutes:weeks.slice(Math.max(0,i-2),i+1).reduce((n,x)=>n+x.total,0)})),
  missingStandaloneDisciplines:weeks.filter(w=>!w.race&&(!w.swim||!w.bikeStandalone||!w.runStandalone)).map(w=>w.week),
  fatigueResponse:'not_attested',recoveryAdequacy:'existing_validators_plus_expert_review',componentDose:'ranges_only_never_proportional_split'};
}
