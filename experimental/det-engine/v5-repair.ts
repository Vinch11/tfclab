/** Reversible whole-plan proposal: truthful recovery labelling and bounded catalogue dose reductions. */
import type{ParsedPlan}from'@/lib/aiPlanParser';import type{PlanAthleteData,PlanConfig}from'@/hooks/useAITrainingPlan';import{prepareGenerationContracts}from'@/lib/plan/prepareGenerationContracts';import{checkSessionCatalogue}from'../../supabase/functions/_shared/sessionCatalogueContract';import{isRaceDaySession}from'../../supabase/functions/_shared/raceDayIdentity';import{validateExperimentalCandidate}from'./v2-validation';import{auditTechnicalPlan}from'./v2-technical-validation';
export function proposeV5Repair(input:ParsedPlan,athlete:PlanAthleteData,config:PlanConfig,reduceDose=false){const plan=structuredClone(input),actions:unknown[]=[];const prep=prepareGenerationContracts(athlete,config,{rotationSeed:0});const metadata=[...new Map([...Object.values(prep.phaseRepairCatalogs).flat(),...prep.chunkRepairCatalogs.flat(),...prep.chunkRegenRepairCatalogs.flat()].map(m=>[m.id,m])).values()];let lastLoad:number|undefined;
 for(const w of plan.weeks){const entry=plan.weeklyQuotas?.[w.weekNumber];if(!entry)continue;const train=w.sessions.filter(s=>!s.isRest&&!isRaceDaySession(s));const total=()=>train.reduce((n,s)=>n+(s.durationMin??0),0);const budget=entry.volumeBudget;const ceiling=budget?Math.min(budget.maxMinutes,lastLoad===undefined?Infinity:lastLoad*(entry.weekType==='recovery'?.7:1+budget.weeklyIncreasePctMax)):Infinity;
  if(reduceDose&&!w.sessions.some(isRaceDaySession)&&total()>ceiling){const excess=()=>Math.max(0,total()-Math.floor(ceiling));const ordered=[...train].sort((a,b)=>(b.durationMin??0)-(a.durationMin??0)||a.dayIndex-b.dayIndex);
   for(const s of ordered){if(!excess())break;const m=metadata.find(m=>m.id===s.catalogId);if(!m||s.custom)continue;let minimum=Math.ceil(m.durationMin[0]);
    // Preserve an already satisfied standalone long floor; never pad another week to erase a ramp violation.
    const floor=s.sport==='run'&&entry.floors.longRunWeekly?entry.floors.slLongRunMin??90:s.sport==='bike'&&entry.floors.longRideWeekly?entry.floors.slLongRideMin??120:0;
    const fulfillsFloor=floor>0&&(s.durationMin??0)>=floor&&!train.some(other=>other!==s&&other.sport===s.sport&&(other.durationMin??0)>=floor);if(fulfillsFloor)minimum=Math.max(minimum,floor);
    if(s.sport==='brick')continue; // Component-aware reduction is a separate contract, never a proportional split.
    const duration=Math.max(minimum,(s.durationMin??0)-excess());if(duration>=(s.durationMin??0))continue;
    const candidate={...s,durationMin:duration};const checked=checkSessionCatalogue(candidate,{catalog:metadata,objective:config.objective,phase:w.phase,weekType:entry.weekType});if(checked.errors.length||checked.unknown.length)continue;
    actions.push({week:w.weekNumber,day:s.dayIndex,rule:'existing_load_to_load_ceiling',before:s.durationMin,after:duration,id:s.catalogId,evidence:'unchanged_card_structure_and_zones_within_original_catalogue_range'});s.durationMin=duration;
   }
  }
  if(entry.weekType==='recovery'&&lastLoad!==undefined&&total()<lastLoad&&total()<=ceiling){const before=w.theme;w.theme=`${w.phase} — récupération`;if(before!==w.theme)actions.push({week:w.weekNumber,rule:'observe_actual_scheduled_and_reduced_recovery',before,after:w.theme,previousLoad:lastLoad,minutes:total(),ceiling});}
  if(entry.weekType==='load'&&!w.sessions.some(isRaceDaySession))lastLoad=total();
 }
 return{status:'candidate' as const,candidate:plan,issues:validateExperimentalCandidate(plan,athlete,config),technical:auditTechnicalPlan(plan),actions,humanReviewRequired:true,expertReviewed:false};}
