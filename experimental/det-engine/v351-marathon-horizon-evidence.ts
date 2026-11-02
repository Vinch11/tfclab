/**
 * DET V3.51 — independent, fail-closed long-marathon evidence.
 * NEVER replaces native periodization, limiter or phase validators.
 * No source title, invented pace or nominal recovery label earns a certificate.
 */
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import {matchingStructuredDose,type StructuredZoneDose} from './v310-structured-zone-dose';
import {verifyReviewedRunningRaceSpecific,type ReviewedRunningSpecificSource} from './v335-reviewed-run-specificity';
import {proposeMeasuredMarathonMesocycles} from './v353-measured-marathon-mesocycles';

export interface MarathonHorizonEvidence {
  verified:boolean;
  horizon:number;
  buildStreaks:readonly {first:number;last:number;weeks:number}[];
  excessiveBuildStreaks:readonly {first:number;last:number;weeks:number}[];
  peakRaceSpecificSources:readonly {week:number;sourceId:string;minutes:number}[];
  buildMesocycleEvidence:{verified:boolean;segments:number;measuredRecoveryBoundaries:number};
  tte:{verifiedMatches:number;allKeySessions:number;unknownKeySessions:number;
    percentage:number|null;minimumPercentage:30;verified:boolean};
  refusals:readonly string[];
  nativeValidatorsPreserved:true;
  scientificAttestation:false;
}
interface MarathonSourceProof {
  dose:(id:string,minutes:number)=>StructuredZoneDose|null|undefined;
  runningSpecific:(id:string)=>ReviewedRunningSpecificSource|null|undefined;
  limiterKeys:(id:string)=>readonly string[]|null|undefined;
}
function isKey(session:ParsedSession):boolean {
  return session.isKeySession===true;
}
const canonical=(key:string)=>key.trim().toLowerCase().replace(/[\s-]+/g,'_');
/** The caller may pass only already athlete-reviewed source callbacks. */
export function auditMarathonHorizon(
  plan:Pick<ParsedPlan,'weeks'|'phases'|'weeklyQuotas'>,proof:MarathonSourceProof,
):MarathonHorizonEvidence {
  const weeks=[...plan.weeks].sort((a,b)=>a.weekNumber-b.weekNumber);
  const refusals:string[]=[];
  if(![16,40].includes(weeks.length))refusals.push('unsupported_marathon_horizon');
  if(weeks.some((week,i)=>week.weekNumber!==i+1))
    refusals.push('non_contiguous_or_repeated_week_numbers');
  const streaks:{first:number;last:number;weeks:number}[]=[];
  let first:number|null=null,last=0;
  const flush=()=>{if(first!==null)streaks.push({first,last,weeks:last-first+1});first=null;};
  for(const week of weeks){
    if(week.phase?.trim().toLowerCase()==='build'){
      if(first===null)first=week.weekNumber;
      last=week.weekNumber;
    }else flush();
  }
  flush();
  const excessiveBuildStreaks=streaks.filter(s=>s.weeks>6);
  // The original 29-week Build streak may be decomposed ONLY when the
  // calendar itself proves exact >=30% recovery boundaries. The projected
  // phase blocks must match what the final native validator actually sees.
  const partition=excessiveBuildStreaks.length?
    proposeMeasuredMarathonMesocycles(plan):null;
  const projected=!!partition?.verified&&
    JSON.stringify(plan.phases)===JSON.stringify(partition.projectedPhases);
  if(excessiveBuildStreaks.length&&!projected)
    refusals.push('build_mesocycle_exceeds_six_weeks');
  // Peak certificates are about THE dose of the workout assigned to THIS
  // athlete, never the name or the mere presence of an approved source ID.
  const peakRaceSpecificSources:{week:number;sourceId:string;minutes:number}[]=[];
  let allKeySessions=0,unknownKeySessions=0,verifiedMatches=0;
  for(const week of weeks)for(const session of week.sessions){
    if(session.isRest||session.title.startsWith('COURSE : '))continue;
    const id=session.catalogId,minutes=session.durationMin;
    const runSource=session.sport==='run'&&typeof id==='string'&&
      /^V3P_RUN_\d{3}$/.test(id)&&
      typeof minutes==='number'&&Number.isFinite(minutes)&&minutes>0;
    if(isKey(session)){
      allKeySessions++;
      if(!runSource||typeof id!=='string'||typeof minutes!=='number'){
        unknownKeySessions++;
      }else{
        let dose:StructuredZoneDose|null|undefined,keys:readonly string[]|null|undefined;
        try{dose=proof.dose(id,minutes);keys=proof.limiterKeys(id);}
        catch{dose=null;keys=null;}
        if(!matchingStructuredDose(dose??null,minutes)||dose!.sourceIds.length!==1||
          dose!.sourceIds[0]!==id||dose!.provenance!=='v3_individually_configured_blocks_only'||
          !Array.isArray(keys)){
          unknownKeySessions++;
        }else if(keys!.some(key=>canonical(key)==='tte'))verifiedMatches++;
      }
    }
    if(week.phase?.trim().toLowerCase()==='peak'&&runSource){
      const decision=verifyReviewedRunningRaceSpecific(session,'marathon',
        proof.runningSpecific,proof.dose);
      if(decision.verified)peakRaceSpecificSources.push({
        week:week.weekNumber,sourceId:decision.sourceId,minutes:decision.highMin,
      });
    }
  }
  const percentage=allKeySessions?100*verifiedMatches/allKeySessions:null;
  const tteVerified=allKeySessions>0&&unknownKeySessions===0&&
    percentage!==null&&percentage>=30;
  if(!tteVerified)refusals.push('tte_source_verified_coverage_below_30_or_unknown');
  if(!peakRaceSpecificSources.length)
    refusals.push('marathon_peak_specific_dose_unproven');
  return {verified:refusals.length===0,horizon:weeks.length,
    buildStreaks:streaks,excessiveBuildStreaks,peakRaceSpecificSources,
    buildMesocycleEvidence:{verified:projected,
      segments:partition?.mesocycles.length??0,
      measuredRecoveryBoundaries:partition?.mesocycles.filter(m=>
        m.recoveryWeek!==null).length??0},
    tte:{verifiedMatches,allKeySessions,unknownKeySessions,percentage,
      minimumPercentage:30,verified:tteVerified},
    refusals,nativeValidatorsPreserved:true,scientificAttestation:false};
}
