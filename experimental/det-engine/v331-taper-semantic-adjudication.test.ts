/**
 * V3.31: metamorphic taper checks. The SAME exact MLSS source dose must not
 * become "safe" merely by being called CSS instead of "seuil".
 * Explicit synthetic coach authorization is separate from source approval.
 */
import {describe,it,expect} from 'vitest';
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import type {RepairWorkoutMetadata} from '../../supabase/functions/_shared/repairSportingEquivalence';
import type {StructuredZoneDose} from './v310-structured-zone-dose';
import {reconcileReviewedTaperSemantics,type NativeTaperIssue,
  type ExplicitTaperCoachReview} from './v331-taper-semantic-adjudication';

const session=(patch:Partial<ParsedSession>={}):ParsedSession=>({
  weekNumber:11,weekTheme:'taper',phase:'taper',dayIndex:2,
  dayName:'Mercredi',sport:'swim',title:'CSS — rappel allégé',
  details:'20 min avec 2 x 2 min MLSS',
  catalogId:'V3P_SWIM_160',custom:false,isRest:false,
  isKeySession:true,durationMin:20,zones:['Z4'],...patch,
});
const card=(patch:Partial<RepairWorkoutMetadata>={}):RepairWorkoutMetadata=>({
  id:'V3P_SWIM_160',phases:['taper'],mainZoneMax:4,
  tags:['individual-coach-approval-recorded',
    'v3-sporting-source-individually-reviewed-candidate',
    'v3-intensity-anchors-individually-verified'],...patch,
} as RepairWorkoutMetadata);
const dose=(patch:Partial<StructuredZoneDose>={}):StructuredZoneDose=>({
  sourceIds:['V3P_SWIM_160'],durationMin:20,
  low:14,mid:0,high:4,unknown:2,
  provenance:'v3_individually_configured_blocks_only',...patch,
});
const review=(patch:Partial<ExplicitTaperCoachReview>={}):ExplicitTaperCoachReview=>({
  athleteContextId:'synthetic-703-9h',weekNumber:11,
  sourceId:'V3P_SWIM_160',durationMin:20,highMin:4,unknownMin:2,
  intent:'brief_controlled_mlss_reminder',individuallyApproved:true,...patch,
});
const nativeError=(s:ParsedSession):NativeTaperIssue=>({
  code:'phase_coherence',week:s.weekNumber,severity:'error',
  message:'S'+s.weekNumber+': "'+s.title+
    '" inadapté en phase "'+s.phase+'" — contenu typique d\'une phase différente',
});
const plan=(sessions:ParsedSession[]):ParsedPlan=>({
  weeks:[{weekNumber:11,phase:'taper',sessions}],
} as unknown as ParsedPlan);
function check(sessions:ParsedSession[],options:{
  cards?:RepairWorkoutMetadata[];dose?:StructuredZoneDose|null;
  native?:NativeTaperIssue[];
  review?:ExplicitTaperCoachReview|null;
  athleteContextId?:string;
  throwProvider?:boolean;
}={}){
  return reconcileReviewedTaperSemantics({
    plan:plan(sessions),nativeIssues:options.native??[],
    cards:options.cards??[card()],athleteContextId:options.athleteContextId??'synthetic-703-9h',
    source:options.throwProvider?()=>{throw Error('unavailable');}:()=>options.dose===undefined?dose():options.dose,
    explicitReviewFor:()=>options.review===undefined?review():options.review,
  });
}
describe('DET V331 — exact-source taper semantic parity (experimental only)',()=>{
  it('accepts source-verified CSS only with separate individual dose approval',()=>{
    const out=check([session()]);
    expect(out.verdict).toBe('verified');
    expect(out.decisions[0].disposition).toBe('accepted_source_reviewed');
    expect(out.decisions[0].structuredDose).toMatchObject({
      lowMin:14,highMin:4,unknownMin:2,scientificAttestation:false,
    });
    expect(out.experimentalOnly).toBe(true);
  });
  it('reconciles exactly one native "seuil" error with unchanged dose, keeping original blocking finding',()=>{
    const s=session({title:'Seuil contrôlé — rappel allégé',zones:['Z2']});
    const error=nativeError(s);
    const out=check([s],{native:[error]});
    expect(out.verdict).toBe('verified');
    expect(out.issues).toEqual([{...error,severity:'warning'}]);
    expect(out.originalNativeIssues).toEqual([error]);
    expect(out.decisions[0].disposition).toBe('native_seuil_text_reconciled');
    expect(out.decisions[0].originalNativeIssue).toEqual(error);
    expect(out.decisions[0].structuredDose).toMatchObject({highMin:4,unknownMin:2});
  });
  it('never relaxes unrelated native blockers or non-threshold forbidden content',()=>{
    const s=session({title:'Seuil fractionné VO2 max'});
    const error=nativeError(s);
    const other={code:'injury_risk_compliance',severity:'error',week:11,
      message:'unrelated hazard'};
    const out=check([s],{native:[error,other]});
    expect(out.verdict).toBe('blocked');
    expect(out.issues).toEqual([error,other]);
    expect(out.decisions[0].reason).toBe('native_forbidden_non_threshold_taper_content');
  });
  it('refuses absent or mismatched coach decision even for CSS with a real dose',()=>{
    for(const decision of [
      null,review({athleteContextId:'some-other-athlete'}),
      review({weekNumber:10}),review({sourceId:'V3P_SWIM_999'}),
      review({durationMin:21}),review({highMin:3}),
      review({unknownMin:0}),review({individuallyApproved:false as true}),
    ]){
      const out=check([session()],{review:decision});
      expect(out.verdict).toBe('blocked');
      expect(out.decisions[0].reason)
        .toBe('explicit_individual_taper_review_missing_or_mismatched');
    }
  });
  it('refuses threshold title if native phase error is absent, ambiguous, or title duplicated',()=>{
    const s=session({title:'Seuil contrôlé'});
    expect(check([s]).verdict).toBe('blocked');
    expect(check([s],{native:[nativeError(s),nativeError(s)]}).verdict).toBe('blocked');
    expect(check([s,session({title:s.title,dayIndex:4})],
      {native:[nativeError(s)]}).verdict).toBe('blocked');
  });
  it('refuses textual Z4 claim with no real high dose or unavailable source',()=>{
    expect(check([session()],{dose:dose({low:18,high:0})}).verdict).toBe('blocked');
    expect(check([session()],{dose:null}).verdict).toBe('blocked');
    expect(check([session()],{throwProvider:true}).verdict).toBe('blocked');
    expect(check([session({isKeySession:false})]).verdict).toBe('blocked');
    expect(check([session()],{cards:[card({tags:[]})]}).verdict).toBe('blocked');
    expect(check([session()],{dose:dose({low:3,high:15})}).verdict).toBe('blocked');
  });
  it('leaves unrelated native warning/mandatory error untouched',()=>{
    const unrelated={code:'recovery',severity:'error',message:'48h missing'};
    const out=check([session()],{native:[unrelated]});
    expect(out.verdict).toBe('verified'); // only THIS semantic issue verified
    expect(out.issues).toEqual([unrelated]); // engine must still block on it
  });
  it('ignores genuine declared race event but not a disguised hard workout',()=>{
    const race=session({title:'COURSE : 70.3',details:
      'Épreuve déclarée ; durée à confirmer par le coach.',durationMin:0,
      catalogId:undefined,custom:true,sport:'brick'});
    expect(check([race]).verdict).toBe('verified');
    expect(check([session({title:'Simulation COURSE : 70.3 — seuil'})])
      .verdict).toBe('blocked');
  });
  it('fails closed when athlete identity needed for separate coach review is absent',()=>{
    expect(check([session()],{athleteContextId:' '}).verdict).toBe('blocked');
  });
});
