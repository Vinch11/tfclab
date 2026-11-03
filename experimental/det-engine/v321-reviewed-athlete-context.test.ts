/** DET V3.21 — forbid source-to-athlete FTP/threshold drift (experimental). */
import {describe,expect,it} from 'vitest';
import {buildDetV3ContractFromCatalogue,type V3ReviewedSettings}
  from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext}
  from './v3-test-anchor-fixtures';
import {constructDeterministicPlan} from './engine';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';

function review(id:string):V3ReviewedSettings{
  return {
    id,objective:'703',athleteLevel:'trained',athleteLevelSource:'manual',
    allPrerequisitesChecked:true,individualCoachApproval:true,
    preferReviewedV3:true,athleteAnchors:syntheticV3ReviewAnchors(),
    ...syntheticV3SportingContext(id),
  };
}
function prepared(){
  const f=preparePrevalidationFixture('B-70.3');
  const athlete={...f.athleteData,ftp:300,paceThresholdSecPerKm:240};
  const {contract,report}=buildDetV3ContractFromCatalogue([
    review('V3P_BIKE_002'),review('V3P_RUN_041'),
  ]);
  expect(report.accepted.map(w=>w.id).sort()).toEqual([
    'V3P_BIKE_002','V3P_RUN_041',
  ]);
  return {f,athlete,contract};
}
describe('DET V321 — measured source anchors must belong to planned athlete',()=>{
  it('accepts matching independently reviewed FTP and running-threshold values',()=>{
    const {athlete,contract}=prepared();
    expect(contract.validateReviewedAthleteContext?.(athlete)).toEqual([]);
  });
  it.each([
    {name:'different FTP',patch:{ftp:280},match:'reviewed_bike_ftp_mismatch'},
    {name:'different threshold',patch:{paceThresholdSecPerKm:220},match:'reviewed_run_threshold_pace_mismatch'},
    {name:'missing FTP',patch:{ftp:undefined},match:'reviewed_bike_ftp_mismatch'},
    {name:'missing threshold',patch:{paceThresholdSecPerKm:undefined},
      match:'reviewed_run_threshold_pace_mismatch'},
  ])('refuses $name before attempting any DET search',({patch,match})=>{
    const {f,athlete,contract}=prepared();
    const result=constructDeterministicPlan({...athlete,...patch},
      {...f.planConfig,weeksAvailable:12}, {maxNodes:100,maxMilliseconds:100},{
        ...contract,requireReviewedAthleteContext:true,
      });
    expect(result.status).toBe('refused');
    expect(result.technicallyConstructed).toBe(false);
    expect(result.constraintsSatisfied).toBe(false);
    expect(result.nodes).toBe(0);
    expect(result.reason).toBe('reviewed_athlete_context_refused');
    expect(result.issues.find(i=>
      i.code==='det_v321_reviewed_athlete_context_refused')?.message)
      .toContain(match);
  });
  it('refuses missing evidence provider without consulting the plan catalogue',()=>{
    const {f,athlete}=prepared();
    const r=constructDeterministicPlan(athlete,
      {...f.planConfig,weeksAvailable:12},{maxNodes:100,maxMilliseconds:100},{
        id:'bad-provider',adapt:()=>{},requireReviewedAthleteContext:true,
      });
    expect(r.reason).toBe('reviewed_athlete_context_refused');
    expect(r.nodes).toBe(0);
    expect(r.issues.find(i=>
      i.code==='det_v321_reviewed_athlete_context_refused')?.message)
      .toContain('reviewed_athlete_context_provider_missing');
  });
  it('refuses a provider error without accepting an unrelated valid source',()=>{
    const {f,athlete}=prepared();
    const r=constructDeterministicPlan(athlete,
      {...f.planConfig,weeksAvailable:12},{maxNodes:100,maxMilliseconds:100},{
        id:'unreachable-review',adapt:()=>{},requireReviewedAthleteContext:true,
        validateReviewedAthleteContext:()=>{throw Error('review store offline');},
      });
    expect(r.reason).toBe('reviewed_athlete_context_refused');
    expect(r.nodes).toBe(0);
    expect(r.issues.find(i=>
      i.code==='det_v321_reviewed_athlete_context_refused')?.message)
      .toContain('reviewed_athlete_context_provider_unavailable');
  });
});
