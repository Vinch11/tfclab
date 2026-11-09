import { WorkoutLibrary } from '@/lib/workoutLibrary';
import { getDoctrineDomain, type DoctrineDomainId } from '@/lib/zones/tfclDoctrine';
import type { PlanConfig } from '@/hooks/useAITrainingPlan';
import type { prepareGenerationContracts } from './prepareGenerationContracts';
import { catalogueEligibility, checkSessionCatalogue, type CatalogueContract } from '../../../supabase/functions/_shared/sessionCatalogueContract';
import { normalizeRepairSport } from '../../../supabase/functions/_shared/repairSportingEquivalence';
import { catalogueWeeklyUsageCapacity } from '../../../supabase/functions/_shared/catalogueWeeklyFrequency';
import type { PlanChunk, PlanSession } from './planSchema';

export interface ControlledPlanPreparation {
  chunks: PlanChunk[];
  contracts: Record<number,CatalogueContract>;
  issues: Array<{week:number;code:string;severity:'blocking'}>;
}
/** Explicitly reviewed physiology only. A title/zone is never a domain resolver.
 * Dedicated trail/LCW paths stay closed until their own stimulus contracts exist.
 */
export function prepareControlledPrescription(config:PlanConfig, prepared:ReturnType<typeof prepareGenerationContracts>):ControlledPlanPreparation {
  const issues:ControlledPlanPreparation['issues']=[];
  const contracts:Record<number,CatalogueContract>={};
  const weeks:PlanChunk['weeks']=[];
  const counts=new Map<string,number>();
  const add=(week:number,code:string)=>issues.push({week,code,severity:'blocking'});
  if (/trail/i.test(config.catalogObjective??config.objective??'')) add(0,'controlled_trail_contract_unavailable');
  if (config.raceGoals?.some(g=>g.raceFormat&&g.raceFormat!=='continuous')) add(0,'controlled_stage_contract_unavailable');
  const sourceById=new Map(WorkoutLibrary.map(w=>[w.id,w]));
  const limiter=(config.identifiedLimitersRaw?.[0]??'').toLowerCase();
  const priority:DoctrineDomainId|undefined=/vo2|vma|pma/.test(limiter)?'vo2max':/ftp|tte/.test(limiter)?'mlss':/vlamax|fatmax/.test(limiter)?'moderate_lt1':undefined;
  for(let week=1;week<=(config.weeksAvailable??0);week++) {
    const entry=prepared.weeklyQuotas[week];
    const chunkIndex=prepared.chunksForQuota.findIndex(c=>week>=c.start&&week<=c.end);
    const primary=prepared.chunkRepairCatalogs[chunkIndex]?.length?prepared.chunkRepairCatalogs[chunkIndex]:prepared.phaseRepairCatalogs[entry?.phase??'base']??[];
    const catalog=[...new Map([...primary,...(prepared.chunkRegenRepairCatalogs[chunkIndex]??[])].map(m=>[m.id,m])).values()];
    const contract:CatalogueContract={phase:entry?.phase,weekType:entry?.weekType,objective:prepared.catalogObjective,catalog};
    contracts[week]=contract;
    if(!entry?.layout||!entry.phase||!entry.volumeBudget) {add(week,'controlled_week_contract_unavailable');continue;}
    const sessions:PlanSession[]=[];
    let total=0;
    for(const day of entry.layout.days) {
      if(day.isRest) sessions.push({day:day.dayName,sport:'rest',title:'Repos',details:'Repos complet',custom:true,catalogId:null,durationMin:0,zones:[],isKeySession:false});
      for(const slot of day.slots) {
        // Events are prescribed later by the authoritative race-calendar engine.
        // Until transport carries its exact stages/dose, do not guess a race.
        if(slot.isRaceEvent) {add(week,'controlled_event_prescription_unavailable');continue;}
        const selectedDomain:DoctrineDomainId|undefined=slot.sport==='strength'?undefined:
          slot.isActivation?'recovery':slot.isLongSession||!slot.isKeySession?'moderate_lt1':priority;
        if(slot.sport!=='strength'&&!selectedDomain) {add(week,'controlled_stimulus_unavailable');continue;}
        const choices=contract.catalog.flatMap(m=>{
          const source=sourceById.get(m.id);
          if(!source?.physiology || !source.physiology.rationale || catalogueEligibility(m,contract).length || normalizeRepairSport(m.sport)!==slot.sport) return [];
          // A reviewed primary stimulus is required. Strength has its own
          // non-metabolic taxonomy; never invent an aerobic domain for it.
          if(slot.sport==='strength') {
            if(!['max_strength','strength_endurance','mobility_prevention'].includes(source.physiology.primary)) return [];
          } else if(source.physiology.primary!==selectedDomain) return [];
          if(m.prerequisiteKeys.length||m.specialContext) return [];
          if(source.prerequisites?.blockAutomaticSelection||source.prerequisites?.requireExplicitCoachApproval||source.prerequisites?.requireVerifiedProfile||source.prerequisites?.minimumTrainingLevel||source.prerequisites?.minimumWeeklyHours) return [];
          if(selectedDomain) getDoctrineDomain(selectedDomain);
          const durationMin=Math.max(m.durationMin[0],slot.minDurationMin??0);
          if(durationMin>Math.min(m.durationMin[1],slot.maxDurationMin??Infinity)) return [];
          const key=`${week}:${m.id}`;
          if((counts.get(key)??0)>=catalogueWeeklyUsageCapacity(m)) return [];
          const session:PlanSession={day:day.dayName,sport:slot.sport,title:m.title,details:m.structure,custom:false,catalogId:m.id,durationMin,zones:[...m.zones],isKeySession:!!slot.isKeySession};
          const check=checkSessionCatalogue(session,contract);
          if(check.errors.length||check.unknown.length) return [];
          return [{session,domain:selectedDomain,usage:counts.get(m.id)??0}];
        }).sort((a,b)=>a.usage-b.usage||a.session.durationMin-b.session.durationMin||String(a.session.catalogId).localeCompare(String(b.session.catalogId)));
        const choice=choices.find(c=>total+c.session.durationMin<=entry.volumeBudget.maxMinutes);
        if(!choice) {add(week,'controlled_reviewed_candidate_unavailable');continue;}
        sessions.push(choice.session);total+=choice.session.durationMin;
        const id=choice.session.catalogId;
        if(id) {counts.set(id,(counts.get(id)??0)+1);const key=`${week}:${id}`;counts.set(key,(counts.get(key)??0)+1);}
      }
    }
    weeks.push({weekNumber:week,phase:entry.phase,theme:`${contract.objective} · S${week+(config.globalWeekOffset??0)}`,sessions});
  }
  const unique=[...new Map(issues.map(i=>[`${i.week}:${i.code}`,i])).values()];
  return {contracts,issues:unique,chunks:unique.length?[]:[{title:config.raceName??config.objective??'Plan',weeks,phases:weeks.map(w=>({name:w.phase,weeks:`S${w.weekNumber}`,objective:contracts[w.weekNumber].objective}))}]};
}