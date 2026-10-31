/**
 * Experimental DET V3.15: evidence-gated replacement of a TEXT-ESTIMATED
 * native polarization finding with verified V3 SOURCE BLOCK minutes.
 * A legacy finding may be reclassified only if EVERY load-week endurance
 * workout is fully source-certified and EVERY load week meets the strict
 * Z1/Z2>=75% classifiable and UNKNOWN<=30% thresholds. No source evidence
 * means NO replacement. No change to the production validator.
 */
import type {ParsedPlan} from '@/lib/aiPlanParser';
import type {NativeZoneDose} from './v39-strict-native-polarization-target';

type Issue={code:string;week?:number;severity:string;message?:string};
export interface PolarizationMigration{
  verdict:'replaced_native_text_with_proven_blocks'|'refused'|'not_needed';
  reason:string;
  issues:Issue[];
  weeks:Array<{week:number;lowPct:number;unknownPct:number;sourceCount:number}>;
  nativeFindings:number;
}
const endure=new Set(['swim','bike','run','brick']);
const tolerance=1e-7;
export function reconcileTextPolarizationWithReviewedSources(input:{
  plan:ParsedPlan;weekTypes:Readonly<Record<number,string>>;
  nativeIssues:readonly Issue[];
  certifiedDose:(id:string,durationMin:number)=>NativeZoneDose|null|undefined;
}):PolarizationMigration{
  const {plan,weekTypes,nativeIssues,certifiedDose}=input;
  const findings=nativeIssues.filter(i=>i.code==='polarization'&&
    ['blocking','critical','error'].includes(i.severity));
  const fail=(reason:string):PolarizationMigration=>({
    verdict:'refused',reason,issues:[...nativeIssues],
    weeks:[],nativeFindings:findings.length,
  });
  if(!findings.length)return {
    verdict:'not_needed',reason:'no_blocking_native_polarization',
    issues:[...nativeIssues],weeks:[],nativeFindings:0,
  };
  if(!plan.weeks.length||plan.weeks.some(w=>!weekTypes[w.weekNumber]))
    return fail('week_type_unverified');
  const rows:PolarizationMigration['weeks']=[];
  for(const w of plan.weeks.filter(w=>weekTypes[w.weekNumber]==='load')){
    const sessions=w.sessions.filter(s=>!s.isRest&&endure.has(s.sport));
    if(!sessions.length)return fail('load_week_endurance_empty');
    let low=0,nonLow=0,unknown=0;
    for(const s of sessions){
      const minutes=s.durationMin;
      if(!s.catalogId||typeof minutes!=='number'||
         !Number.isFinite(minutes)||minutes<=0)
        return fail('source_or_duration_not_proven');
      const dose=certifiedDose(s.catalogId,minutes);
      if(!dose||[dose.low,dose.nonLow,dose.unknown].some(v=>
        !Number.isFinite(v)||v<0)||
         Math.abs(dose.low+dose.nonLow+dose.unknown-minutes)>tolerance)
        return fail('source_zone_minutes_not_conserved');
      low+=dose.low;nonLow+=dose.nonLow;unknown+=dose.unknown;
    }
    const known=low+nonLow,total=known+unknown;
    if(known<=0||total<=0)return fail('classifiable_source_minutes_absent');
    const lowPct=100*low/known,unknownPct=100*unknown/total;
    if(lowPct<75-tolerance||unknownPct>30+tolerance)
      return fail('strict_source_zone_target_not_met');
    rows.push({week:w.weekNumber,lowPct,unknownPct,sourceCount:sessions.length});
  }
  if(!rows.length)return fail('no_verified_loading_weeks');
  const verified=new Set(rows.map(w=>w.week));
  if(findings.some(i=>i.week===undefined||!verified.has(i.week)))
    return fail('native_polarization_outside_verified_loading_weeks');
  const issues=nativeIssues.map(issue=>issue.code==='polarization'&&
    ['blocking','critical','error'].includes(issue.severity)&&
    issue.week!==undefined&&verified.has(issue.week)?{
    ...issue,code:'det_native_text_polarization_superseded_by_verified_blocks',
    severity:'warning',message:JSON.stringify({
      historicalNativeSeverity:issue.severity,historicalNativeMessage:issue.message,
      sourceWeek:rows.find(w=>w.week===issue.week),
      sourceProof:'reviewed_individual_v3_blocks_only',
    }),
  }:issue);
  issues.push({code:'det_strict_source_polarization_reconciliation_verified',
    severity:'warning',message:JSON.stringify({
      weeks:rows,nativeFindings:findings.length,
      allLoadWeeksProven:true,
      fullNativeValidatorPreservedAsDiagnostic:true,
      scientificAttestation:false,
    })});
  return {
    verdict:'replaced_native_text_with_proven_blocks',
    reason:'all_load_week_source_minutes_and_strict_thresholds_verified',
    issues,weeks:rows,nativeFindings:findings.length,
  };
}
