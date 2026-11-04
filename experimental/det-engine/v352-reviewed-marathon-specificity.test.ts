import {describe,expect,it} from 'vitest';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {reconcileReviewedMarathonSpecificity} from './v352-reviewed-marathon-specificity';
import type {StructuredZoneDose} from './v310-structured-zone-dose';
const id='V3P_RUN_094';
const dose:StructuredZoneDose={
  low:18,mid:0,high:8,unknown:2,durationMin:28,sourceIds:[id],
  provenance:'v3_individually_configured_blocks_only',
};
const lexical={code:'phase_coherence',severity:'warning',
  message:'Bloc Race-Specific sans aucune séance allure course/race-pace/simulation détectée — absence'};
const build={code:'phase_coherence',severity:'warning',
  message:'Phase "build" trop longue : 29 sem (maximum recommandé 6)'};
const other={code:'limiter_coherence',severity:'error',message:'tte 14%'};
const plan=(title='V3P_RUN_094',sessionId=id)=>{
  return {weeks:[{weekNumber:37,phase:'peak',sessions:[{
    title,details:'',isRest:false,sport:'run',catalogId:sessionId,
    durationMin:28,
  }]}]} as unknown as ParsedPlan;
};
const reviewed=()=>({sourceId:id,objective:'marathon' as const});
const exact=()=>dose;
describe('V3.52 source-backed lexical reconciliation is never a safety bypass',()=>{
  it('reconciles only the exact false-negative warning after source proof',()=>{
    const issues=[lexical,build,other];
    const result=reconcileReviewedMarathonSpecificity(plan(),issues,reviewed,exact);
    expect(result.verified).toBe(true);
    expect(result.sourceEvidence[0].highMin).toBe(8);
    expect(result.originalNativeIssues).toEqual(issues);
    expect(result.issues).toEqual([build,other]);
    expect(result.scientificAttestation).toBe(false);
  });
  it('does not accept a race-pace title without approved exact-dose source',()=>{
    const result=reconcileReviewedMarathonSpecificity(
      plan('simulation allure marathon'),[lexical,build],()=>null,exact);
    expect(result.verified).toBe(false);
    expect(result.issues).toEqual([lexical,build]);
  });
  it('refuses an altered dose and a different running objective',()=>{
    const a=reconcileReviewedMarathonSpecificity(
      plan(),[lexical],reviewed,()=>({...dose,durationMin:29}));
    expect(a.verified).toBe(false);
    const b=reconcileReviewedMarathonSpecificity(
      plan(),[lexical],()=>({sourceId:id,objective:'semi'}),exact);
    expect(b.verified).toBe(false);
  });
  it('cannot remove a non-lexical phase issue or other sporting failure',()=>{
    const result=reconcileReviewedMarathonSpecificity(plan(),[build,other],reviewed,exact);
    expect(result.verified).toBe(false);
    expect(result.issues).toEqual([build,other]);
  });
  it('will not silently reconcile two distinct warnings',()=>{
    const issues=[lexical,{...lexical},build];
    const result=reconcileReviewedMarathonSpecificity(plan(),issues,reviewed,exact);
    expect(result.verified).toBe(false);
    expect(result.issues).toHaveLength(3);
  });
});
