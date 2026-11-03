import {describe,expect,it} from 'vitest';
import {assessStrictStructuredZoneTarget} from './v39-strict-native-polarization-target';
import {assessStructuredZoneNecessaryBounds} from './v310-structured-polarization-bounds';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {annotateVerifiedRunningTaper} from './v358-reviewed-running-taper';
import {prepareReviewed10kPhases} from './v358-running-phase-calendar';
import {reconcileReviewedRunningSpecificity} from './v352-reviewed-marathon-specificity';
import {v3SupplementalCatalogue} from '../../scripts/library-v3/supplementalCatalogue';
import {auditV3Catalogue} from '../../scripts/library-v3/catalogueRuntime';
import {auditV3SportingRegistry,qualifyV3IndividualSportingSource,type V3SportingSourceRecord}
  from '../../scripts/library-v3/sportingQualification800';
import registry from '../../scripts/library-v3/v3SupplementSportingReview20261103.json';
import {syntheticV3SportingContext,syntheticV3ReviewAnchors} from './v3-test-anchor-fixtures';
import {buildDetV3ContractFromCatalogue} from './v31-v3-catalogue';

const plan=()=>({weeks:[1,2].map(n=>({weekNumber:n,phase:n===1?'peak':'taper',
  theme:'original',sessions:[{weekNumber:n,dayIndex:1,dayName:'mardi',sport:'run',
    isRest:false,catalogId:'V3P_RUN_001',durationMin:n===1?100:60,title:'Original',details:''}]})),
  weeklyQuotas:{1:{weekType:'load'},2:{weekType:'taper'}}}) as unknown as ParsedPlan;
const source=()=>({sourceIds:['V3P_RUN_001'],durationMin:60,low:55,mid:0,high:5,unknown:0,
  provenance:'v3_individually_configured_blocks_only' as const});
describe('V358 exact running evidence refuses unsupported shortcuts',()=>{
  it('keeps unknown minutes in the stricter whole-duration denominator',()=>{
    const dose={low:75,nonLow:25,unknown:5};
    expect(assessStrictStructuredZoneTarget([dose]).admissible).toBe(true);
    expect(assessStrictStructuredZoneTarget([dose],true).admissible).toBe(false);
    expect(assessStructuredZoneNecessaryBounds([{dose,isKeyQuality:true}],[],true,true).reason)
      .toBe('easy_fraction_impossible');
  });
  it('annotates a taper only after measured time and exact low-intensity source proof',()=>{
    const p=plan();const original=structuredClone(p.weeks.map(w=>w.sessions));
    expect(annotateVerifiedRunningTaper(p,source)[0].verified).toBe(true);
    expect(p.weeks[1].theme).toContain('Affûtage vérifié');
    expect(p.weeks.map(w=>w.sessions)).toEqual(original);
  });
  it.each(['missing-source','bad-source','insufficient-reduction','too-intense','unknown-duration'])('%s cannot earn a taper exemption',kind=>{
    const p=plan();
    if(kind==='insufficient-reduction')p.weeks[0].sessions[0].durationMin=70;
    if(kind==='unknown-duration')delete p.weeks[1].sessions[0].durationMin;
    const provider=kind==='missing-source'?undefined:()=>kind==='bad-source'?
      {...source(),sourceIds:['V3P_RUN_002']}:kind==='too-intense'?
        {...source(),low:30,high:30}:source();
    expect(annotateVerifiedRunningTaper(p,provider)[0].verified).toBe(false);
    expect(p.weeks[1].theme).toBe('original');
  });
  it.each([8,10,12])('preserves verified foundation and minimum development on %i weeks',weeks=>{
    const foundation=weeks===8?3:4;
    const result=prepareReviewed10kPhases({weeksAvailable:weeks,fondationDurationWeeks:foundation});
    expect(result.verified).toBe(true);
    expect(Object.values(result.calendar!).filter(p=>p==='base')).toHaveLength(foundation);
    expect(Object.values(result.calendar!).filter(p=>p==='build').length).toBeGreaterThanOrEqual(2);
    expect(Object.values(result.calendar!).filter(p=>p==='peak').length).toBeGreaterThanOrEqual(2);
  });
  it('refuses missing foundation, an impossible foundation and an explicit calendar override',()=>{
    expect(prepareReviewed10kPhases({weeksAvailable:8}).verified).toBe(false);
    expect(prepareReviewed10kPhases({weeksAvailable:8,fondationDurationWeeks:6}).verified).toBe(false);
    expect(prepareReviewed10kPhases({weeksAvailable:8,fondationDurationWeeks:3,
      windowWeekPhases:{1:'base'}}).verified).toBe(false);
  });
  it.each(['semi','10k'] as const)('requires goal-specific evidence for %s, preserving all other findings',goal=>{
    const id=goal==='semi'?'V3P_RUN_160':'V3P_RUN_201';
    const p=plan();p.weeks[0].sessions=[{...p.weeks[0].sessions[0],catalogId:id,durationMin:60}];
    const issues=[{code:'phase_coherence',severity:'warning',message:
      'Bloc Race-Specific sans aucune séance allure course/race-pace/simulation détectée'},
      {code:'load_pattern',severity:'error',message:'Do not suppress'}];
    const valid=reconcileReviewedRunningSpecificity(p,issues,
      ()=>({sourceId:id,objective:goal}),()=>({...source(),sourceIds:[id]}),goal);
    expect(valid.verified).toBe(true);
    expect(valid.issues).toEqual([issues[1]]);
    const wrong=reconcileReviewedRunningSpecificity(p,issues,
      ()=>({sourceId:id,objective:'marathon'}),()=>({...source(),sourceIds:[id]}),goal);
    expect(wrong.verified).toBe(false);
    expect(wrong.issues).toEqual(issues);
  });
  it.each(v3SupplementalCatalogue.workouts)('$id is audited separately and requires athlete/source approval',w=>{
    expect(auditV3Catalogue(v3SupplementalCatalogue)).toEqual([]);
    expect(auditV3SportingRegistry(v3SupplementalCatalogue.workouts,
      registry.records as V3SportingSourceRecord[],v3SupplementalCatalogue.workouts.length)).toEqual([]);
    expect(qualifyV3IndividualSportingSource(w,undefined,undefined).allowedToSubmitToDet).toBe(false);
    const c=syntheticV3SportingContext(w.id);
    if(!('sportingReview' in c))throw Error('missing_supplement_review');
    expect(qualifyV3IndividualSportingSource(w,c.sportingReview,c.expectedAthleteId)
      .allowedToSubmitToDet).toBe(true);
    expect(qualifyV3IndividualSportingSource({...w,title:w.title+' changed'},c.sportingReview,
      c.expectedAthleteId).allowedToSubmitToDet).toBe(false);
    const rejected=buildDetV3ContractFromCatalogue([{id:w.id,objective:'10K',athleteLevel:'trained',
      athleteLevelSource:'manual',allPrerequisitesChecked:true,individualCoachApproval:true,
      athleteAnchors:syntheticV3ReviewAnchors(),...c,expectedAthleteId:'other-athlete'}]);
    expect(rejected.report.accepted.some(s=>s.id===w.id)).toBe(false);
    expect(buildDetV3ContractFromCatalogue([]).report.sourceCount).toBe(800);
  });
});
