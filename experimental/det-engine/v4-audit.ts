/** Constraint graph and witnesses, not global infeasibility assertions. */
import type {PlanConfig} from '@/hooks/useAITrainingPlan';
import {parseAthleteConstraints} from '@/lib/plan/constraintRules';
import {effectiveSessionQuota} from '../../supabase/functions/_shared/sessionQuotaAccounting';
import type {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import {explicitBrickComponents} from './v3-ironman';
export const CONSTRAINT_GRAPH={
 nodes:['input','objective','quota','calendar','catalogue','component_dose','volume_budget','solver','key_annotation','sport_validator','candidate'],
 edges:[
  ['input','objective','Missing race geometry prevents a trail-specific numeric contract'],
  ['objective','quota','A global sport ban can erase a nominal triathlon minimum'],
  ['quota','calendar','Minima, total cap, rest and daily capacity must admit a placement'],
  ['calendar','catalogue','Slot windows must intersect phase/level/injury eligible cards'],
  ['catalogue','component_dose','Primary total and explicit component ranges can disagree'],
  ['component_dose','calendar','An introductory brick cannot silently cover a long bike floor'],
  ['calendar','volume_budget','Sum of minimum doses cannot exceed the fixed weekly ceiling'],
  ['catalogue','solver','An empty domain is not repaired by enumerating more permutations'],
  ['solver','key_annotation','The slot key flag does not prove the selected card has an intensity stimulus'],
  ['key_annotation','sport_validator','Flags can mask or falsely declare key stimuli'],
  ['sport_validator','candidate','Assembly, technical schema and sporting conformity are separate'],
 ]};
export function inspectStructuralContracts(config:PlanConfig,prep:ReturnType<typeof prepareGenerationContracts>){
 const rules=parseAthleteConstraints(config.constraints??''),conflicts:Array<{code:string;classification:string;week?:number;evidence:unknown;scope:string}>=[];
 const add=(code:string,classification:string,evidence:unknown,week?:number)=>conflicts.push({code,classification,evidence,week,scope:'current_contract_and_catalogue_only'});
 const trail=/trail/i.test(config.objective),tri=['IM','703','Sprint','Olympic'].includes(config.objective);
 if(trail){const goal=config.raceGoals?.find(g=>g.priority==='A');if(!goal?.distanceKm||goal.elevationGainM==null)add('missing_trail_geometry','insufficient_data',{distance:goal?.distanceKm??null,dplus:goal?.elevationGainM??null});if(!Object.keys(prep.weeklyQuotas).length)add('missing_trail_calendar_contract','implementation_gap','No dedicated deterministic quota; do not use marathon quotas');}
 if(tri&&rules.bannedSports.some(s=>['swim','bike','run'].includes(s)))add('triathlon_discipline_ban','contradictory_constraints',{bans:rules.bannedSports,note:'Conflict with a candidate contract requiring training presence; not a proof of global physiological impossibility'});
 const metadata=[...new Map([...Object.values(prep.phaseRepairCatalogs).flat(),...prep.chunkRepairCatalogs.flat(),...prep.chunkRegenRepairCatalogs.flat()].map(m=>[m.id,m])).values()];
 for(const [key,entry] of Object.entries(prep.weeklyQuotas)){
  const week=Number(key),slots=entry.layout?.days.flatMap(d=>d.slots)??[],bricks=slots.filter(s=>s.sport==='brick').length;
  const effective=effectiveSessionQuota(entry.quota,bricks);
  const physicalMin=entry.quota.swim.min+effective.bike.min+entry.quota.run.min+entry.quota.brick.min+entry.quota.strength.min;
  if(physicalMin>effective.totalSessions.max)add('minimum_count_exceeds_total_cap','contradictory_constraints',{physicalMin,max:effective.totalSessions.max},week);
  for(const slot of slots.filter(s=>!s.isRaceEvent)){
   if((slot.minDurationMin??0)>(slot.maxDurationMin??Infinity))add('empty_slot_interval','contradictory_constraints',{sport:slot.sport,min:slot.minDurationMin,max:slot.maxDurationMin},week);
   if(slot.sport==='brick'&&slot.isLongSession&&entry.phase==='base'){
    const intro=metadata.find(m=>m.id==='BRICK_STAGE1_INTRO'),components=intro?explicitBrickComponents(intro.id):null;
    if(intro&&(slot.minDurationMin??0)>intro.durationMin[1])add('intro_brick_assigned_long_endurance_floor','contract_catalogue_conflict',{slotMin:slot.minDurationMin,primary:intro.durationMin,components:components?.total??null,id:intro.id},week);
   }
  }
 }
 return {conflicts,recognizedRules:rules,globalImpossibilityProven:false};
}
