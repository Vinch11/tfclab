/**
 * DET V3.53 — build mesocycles only where the SELECTED calendar contains
 * a measured >=30% recovery week. This changes phase-block STRUCTURE
 * (not a workout, source dose, training quota or athlete review).
 * A renamed phase without the actual time reduction never earns a block.
 * Experimental-only; nothing in the released planner imports this module.
 */
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {measuredTrainingMinutes} from './v315-measured-deload-selection';

export interface MeasuredMarathonMesocycle {
  first:number;last:number;weeks:number;
  recoveryWeek:number|null;reductionPct:number|null;
}
export interface MeasuredMarathonMesocycleCertificate {
  verified:boolean;
  projectedPhases:ParsedPlan['phases'];
  mesocycles:readonly MeasuredMarathonMesocycle[];
  originallyLongBuildStreaks:readonly {first:number;last:number;weeks:number}[];
  refusals:readonly string[];
  workoutsAndQuotasUnchanged:true;
  scientificAttestation:false;
}
type Calendar = Pick<ParsedPlan,'weeks'|'weeklyQuotas'>;
type Span={name:string;first:number;last:number};
const phaseName=(name:string)=>name.trim().toLowerCase();

export function proposeMeasuredMarathonMesocycles(
  plan:Calendar,
):MeasuredMarathonMesocycleCertificate {
  const weeks=[...plan.weeks].sort((a,b)=>a.weekNumber-b.weekNumber);
  const refusals:string[]=[];
  const mesocycles:MeasuredMarathonMesocycle[]=[];
  const projectedPhases:ParsedPlan['phases']=[];
  const originallyLongBuildStreaks:{first:number;last:number;weeks:number}[]=[];
  const finish=(verified:boolean):MeasuredMarathonMesocycleCertificate=>({
    verified,projectedPhases:verified?projectedPhases:[],
    mesocycles,originallyLongBuildStreaks,refusals,
    workoutsAndQuotasUnchanged:true,scientificAttestation:false,
  });
  if(!weeks.length||weeks.some((week,i)=>week.weekNumber!==i+1)){
    refusals.push('non_contiguous_or_missing_weeks');return finish(false);
  }
  if(!plan.weeklyQuotas){
    refusals.push('original_week_type_evidence_missing');return finish(false);
  }
  const spans:Span[]=[];
  for(const week of weeks){
    const name=phaseName(week.phase??'');
    const previous=spans[spans.length-1];
    if(previous&&phaseName(previous.name)===name)previous.last=week.weekNumber;
    else spans.push({name,first:week.weekNumber,last:week.weekNumber});
  }
  for(const span of spans)if(span.name==='build'&&span.last-span.first+1>6)
    originallyLongBuildStreaks.push({
      first:span.first,last:span.last,weeks:span.last-span.first+1,
    });
  if(!originallyLongBuildStreaks.length){
    refusals.push('no_long_build_streak_to_resolve');return finish(false);
  }
  const recovery=(weekNumber:number):number|null=>{
    if(plan.weeklyQuotas?.[weekNumber]?.weekType!=='recovery'||weekNumber<=1)
      return null;
    const prev=measuredTrainingMinutes(weeks[weekNumber-2].sessions);
    const current=measuredTrainingMinutes(weeks[weekNumber-1].sessions);
    if(prev===null||current===null||prev<=0||current>prev*0.7+1e-9)return null;
    return 100*(prev-current)/prev;
  };
  let counter=0;
  // Boundary search uses verified reduction weeks, NOT equally sized labels.
  const segment=(first:number,last:number):MeasuredMarathonMesocycle[]|null=>{
    const len=last-first+1;
    if(len>=2&&len<=6)return [{
      first,last,weeks:len,recoveryWeek:null,reductionPct:null,
    }];
    for(let cut=first+1;cut<=Math.min(first+5,last-2);cut++){
      const drop=recovery(cut);
      if(drop===null)continue;
      const rest=segment(cut+1,last);
      if(rest)return [{
        first,last:cut,weeks:cut-first+1,recoveryWeek:cut,reductionPct:drop,
      },...rest];
    }
    return null;
  };
  for(const span of spans){
    if(span.name==='build'&&span.last-span.first+1>6){
      const pieces=segment(span.first,span.last);
      if(!pieces){
        refusals.push('no_measured_recovery_boundaries_for_build_'+span.first+'_'+span.last);
        continue;
      }
      // The trailing build segment transitions into Peak; preceding segments
      // MUST have an authentic measured deload at their boundary.
      for(const piece of pieces){
        mesocycles.push(piece);
        projectedPhases.push({name:'build - mesocycle '+(++counter),
          weeks:'S'+piece.first+'-S'+piece.last});
      }
    }else{
      projectedPhases.push({name:span.name,weeks:'S'+span.first+'-S'+span.last});
    }
  }
  if(refusals.length)return finish(false);
  return finish(true);
}
