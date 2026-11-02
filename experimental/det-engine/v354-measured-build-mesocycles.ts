/**
 * DET V3.54 — measured mesocycle segmentation audit only.
 * A 29-week "build" macro-phase is not automatically a 29-week mesocycle:
 * actual, source-duration-proven >=30% recovery weeks can delimit shorter
 * loading cycles. This reports evidence; it DOES NOT rewrite phase labels,
 * override native phase coherence, or assert differentiated adaptation.
 */
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {measuredTrainingMinutes} from './v315-measured-deload-selection';

type WeekType='load'|'recovery'|'taper'|'race'|string|undefined;
export interface BuildMesocycle {
  startWeek:number;
  endWeek:number;
  weeks:number;
  loadWeeks:number;
  recoveryWeek:number|null;
  measuredReductionPct:number|null;
  verifiedReduction:boolean;
  totalLoadMinutes:number|null;
  sourceVerified:boolean;
}
export interface BuildMesocycleAudit {
  macroBuildStreaks:readonly {start:number;end:number;weeks:number}[];
  mesocycles:readonly BuildMesocycle[];
  measuredRecoveryCycles:number;
  unverifiedCycles:number;
  allMesocyclesAtMostSixWeeks:boolean;
  differentiatedPhysiologicalFociProven:false;
  phaseLabelsAndNativeValidationUnchanged:true;
  scientificAttestation:false;
}
export function auditMeasuredBuildMesocycles(
  plan:Pick<ParsedPlan,'weeks'>,
  weekTypeFor:(week:number)=>WeekType,
  exactApprovedSourceDurationFor?:(sourceId:string,durationMin:number)=>boolean,
):BuildMesocycleAudit {
  const weeks=[...plan.weeks].sort((a,b)=>a.weekNumber-b.weekNumber);
  const groups:typeof weeks[]=[];
  let buildGroup:typeof weeks=[];
  const closeGroup=()=>{if(buildGroup.length)groups.push(buildGroup);buildGroup=[];};
  for(const week of weeks){
    if(week.phase?.trim().toLowerCase()==='build')buildGroup.push(week);
    else closeGroup();
  }
  closeGroup();
  const macroBuildStreaks=groups.map(g=>({start:g[0].weekNumber,
    end:g[g.length-1].weekNumber,weeks:g.length}));
  const mesocycles:BuildMesocycle[]=[];
  for(const group of groups){
    let fragment:typeof group=[];
    const close=(recovery:boolean)=>{
      if(!fragment.length)return;
      const last=fragment[fragment.length-1];
      const previous=weeks.find(w=>w.weekNumber===last.weekNumber-1);
      const prev=previous?measuredTrainingMinutes(previous.sessions):null;
      const current=measuredTrainingMinutes(last.sessions);
      const measured=recovery&&prev!==null&&current!==null&&prev>0?
        (prev-current)/prev*100:null;
      const verifiedReduction=measured!==null&&measured>=30-1e-7;
      const loading=fragment.filter(w=>weekTypeFor(w.weekNumber)==='load');
      const allMeasured=loading.map(w=>measuredTrainingMinutes(w.sessions));
      const sourcesGood=loading.length>0 && !!exactApprovedSourceDurationFor &&
        loading.every(w=>w.sessions.filter(s=>!s.isRest&&s.sport==='run').some(s=>
          !!s.catalogId&&typeof s.durationMin==='number'&&s.durationMin>0&&
          exactApprovedSourceDurationFor(s.catalogId,s.durationMin)));
      mesocycles.push({startWeek:fragment[0].weekNumber,endWeek:last.weekNumber,
        weeks:fragment.length,loadWeeks:loading.length,
        recoveryWeek:recovery?last.weekNumber:null,measuredReductionPct:measured,
        verifiedReduction,totalLoadMinutes:allMeasured.every(v=>v!==null)?
          allMeasured.reduce<number>((acc,v)=>acc+(v??0),0):null,
        sourceVerified:sourcesGood});
      fragment=[];
    };
    for(const week of group){
      fragment.push(week);
      if(weekTypeFor(week.weekNumber)==='recovery')close(true);
    }
    close(false);
  }
  return {macroBuildStreaks,mesocycles,
    measuredRecoveryCycles:mesocycles.filter(x=>x.verifiedReduction).length,
    unverifiedCycles:mesocycles.filter(x=>!x.verifiedReduction).length,
    allMesocyclesAtMostSixWeeks:mesocycles.every(x=>x.weeks<=6),
    differentiatedPhysiologicalFociProven:false,
    phaseLabelsAndNativeValidationUnchanged:true,scientificAttestation:false};
}
