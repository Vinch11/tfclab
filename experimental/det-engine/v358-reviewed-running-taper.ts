/** Source-verified taper semantics. No change to doses, phases or native rules. */
import type {ParsedPlan} from '@/lib/aiPlanParser';
import type {StructuredZoneDose} from './v310-structured-zone-dose';
import {matchingStructuredDose} from './v310-structured-zone-dose';
import {measuredTrainingMinutes} from './v315-measured-deload-selection';

export function annotateVerifiedRunningTaper(plan:ParsedPlan,
  source:((id:string,minutes:number)=>StructuredZoneDose|null|undefined)|undefined){
  let reference:{week:number;minutes:number}|null=null;
  return plan.weeks.flatMap(week=>{
    const kind=plan.weeklyQuotas?.[week.weekNumber]?.weekType;
    const minutes=measuredTrainingMinutes(week.sessions);
    if(kind==='load')reference=minutes===null?null:{week:week.weekNumber,minutes};
    if(kind!=='taper')return [];
    let low=0,unknown=0,total=0,sourceVerified=!!source;
    for(const session of week.sessions.filter(s=>!s.isRest&&s.sport!=='strength')){
      let dose:StructuredZoneDose|null=null;
      try{dose=session.catalogId&&typeof session.durationMin==='number'?
        matchingStructuredDose(source?.(session.catalogId,session.durationMin)??null,session.durationMin):null;}
      catch{dose=null;}
      if(!dose||dose.provenance!=='v3_individually_configured_blocks_only'||
         dose.sourceIds.length!==1||dose.sourceIds[0]!==session.catalogId){
        sourceVerified=false;continue;
      }
      low+=dose.low;unknown+=dose.unknown;total+=dose.durationMin;
    }
    const verified=!!reference&&minutes!==null&&sourceVerified&&total>0&&
      minutes<=reference.minutes*.7+1e-9&&low/total>=.75&&unknown/total<=.30;
    if(verified)week.theme='Affûtage vérifié — '+week.theme;
    return [{week:week.weekNumber,verified,referenceWeek:reference?.week??null,
      referenceMinutes:reference?.minutes??null,minutes,sourceVerified,
      lowMinutes:low,unknownMinutes:unknown,enduranceMinutes:total,
      nativeValidatorsPreserved:true,scientificAttestation:false}];
  });
}
