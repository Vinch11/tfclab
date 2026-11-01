/**
 * V3.19 — genuinely different SYNTHETIC athlete and availability contexts.
 * Exploration only: this matrix records full-plan outcomes; it never calls
 * a technically constructed plan sport-safe without the native final gates.
 * No production validator, real athlete record or Supabase write is involved.
 */
import {afterEach,describe,expect,it,vi} from 'vitest';
import {preparePrevalidationFixture} from '@/qa/sports-plan-lab/prevalidationFixtures';
import {constructDeterministicPlan} from './engine';
import {buildDetV3ContractFromCatalogue,type V3ReviewedSettings} from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';

type Goal='703'|'IM';
type Fixture='B-70.3'|'B-IM';
type Scenario={
  id:string;objective:Goal;fixture:Fixture;
  ftp:number;thresholdSecKm:number;cssSec100m:number;vmaKmh:number;
  weeklyHours:number;maxSessionsPerDay:number;
};
const profiles:readonly Scenario[]=[
  {id:'703-reference',objective:'703',fixture:'B-70.3',ftp:280,
    thresholdSecKm:220,cssSec100m:90,vmaKmh:18,weeklyHours:10,maxSessionsPerDay:2},
  {id:'703-slower-physiology',objective:'703',fixture:'B-70.3',ftp:225,
    thresholdSecKm:255,cssSec100m:110,vmaKmh:15.5,weeklyHours:10,maxSessionsPerDay:2},
  {id:'703-restricted-availability',objective:'703',fixture:'B-70.3',ftp:280,
    thresholdSecKm:220,cssSec100m:90,vmaKmh:18,weeklyHours:8,maxSessionsPerDay:1},
  {id:'IM-reference',objective:'IM',fixture:'B-IM',ftp:320,
    thresholdSecKm:205,cssSec100m:85,vmaKmh:19.5,weeklyHours:14,maxSessionsPerDay:2},
  {id:'IM-slower-physiology',objective:'IM',fixture:'B-IM',ftp:245,
    thresholdSecKm:245,cssSec100m:105,vmaKmh:16.5,weeklyHours:14,maxSessionsPerDay:2},
  {id:'IM-restricted-availability',objective:'IM',fixture:'B-IM',ftp:320,
    thresholdSecKm:205,cssSec100m:85,vmaKmh:19.5,weeklyHours:11,maxSessionsPerDay:1},
];
const commonSources=[
  'V3P_BIKE_002','V3P_BIKE_017','V3P_BIKE_090','V3P_BIKE_057',
  'V3P_BIKE_085','V3P_BIKE_089','V3P_BIKE_016',
  'V3P_RUN_001','V3P_RUN_041',
] as const;
const sourceIds=(objective:Goal):string[]=>
  [...commonSources,...(objective==='703'?['V3P_BIKE_012']:
    ['V3P_BIKE_038','V3P_SWIM_194'])];
const blockers=(severity:string)=>['blocking','critical','error'].includes(severity);

function reviewsFor(s:Scenario):V3ReviewedSettings[]{
  const athleteId='synthetic-v319-'+s.id;
  return sourceIds(s.objective).map(id=>{
    const context=syntheticV3SportingContext(id);
    if(!('sportingReview' in context))throw Error('v319_missing_source:'+id);
    const original=syntheticV3ReviewAnchors();
    const swimPaces=Object.fromEntries(
      Object.entries(original.swimDomainPacesSecPer100m??{}).map(([domain,pace])=>[
        domain,Math.round(pace*s.cssSec100m/90*100)/100,
      ]),
    ) as typeof original.swimDomainPacesSecPer100m;
    const runVvo2=s.vmaKmh/3.6;
    return {
      id,objective:s.objective,athleteLevel:'trained',
      athleteLevelSource:'manual',allPrerequisitesChecked:true,
      individualCoachApproval:true,preferReviewedV3:true,
      expectedAthleteId:athleteId,
      sportingReview:{...context.sportingReview,athleteId},
      athleteAnchors:{
        ...original,bikeFtpWatts:s.ftp,bikePmaWatts:Math.round(s.ftp*1.3),
        bikeSprintPowerRangeWatts:[s.ftp*2,s.ftp*2.9],
        runThresholdPaceSecPerKm:s.thresholdSecKm,
        runVvo2SpeedMps:runVvo2,
        runSprintSpeedRangeMps:[runVvo2+.2,runVvo2+2],
        swimDomainPacesSecPer100m:swimPaces,
      },
      ...(id==='V3P_BIKE_002'?{targetDurationMin:65}:
        id==='V3P_BIKE_016'?{targetDurationMin:139}:{}),
    };
  });
}
function runProfile(s:Scenario){
  const fixture=preparePrevalidationFixture(s.fixture);
  const athlete={
    ...fixture.athleteData,nom:'QA '+s.id,
    ftp:s.ftp,paceThresholdSecPerKm:s.thresholdSecKm,
    css:s.cssSec100m,vma:s.vmaKmh,
  };
  const raceDate=s.objective==='703'?'2027-01-17':'2027-02-14';
  const cfg={...fixture.planConfig,
    planStartDate:'2026-10-26',raceDate,
    raceGoals:[{objective:s.objective,raceDate,priority:'A' as const}],
    weeklyHours:s.weeklyHours,maxSessionsPerDay:s.maxSessionsPerDay,
    _outputFormat:'json' as const,
  };
  const {contract,report}=buildDetV3ContractFromCatalogue(reviewsFor(s));
  const approved=new Map(report.accepted.map(card=>[card.id,card]));
  // This source must be independently reviewed and its FTP-specific dose resolved.
  expect(approved.has('V3P_BIKE_002')).toBe(true);
  expect(report.sourceCount).toBe(800);
  const out=constructDeterministicPlan(
    athlete,cfg,{maxNodes:6000,maxMilliseconds:5000},{
      ...contract,enforceWeeklyHoursCap:true,
      enforceCalendarSafeV3Recovery:true,improveV3RecoveryLayout:true,
      annotateVerifiedDeloads:true,auditVerifiedMultisportMinutes:true,
      filterDeclaredSprintBanCandidates:true,requireRealQualityOnLoadWeeks:true,
      preferSourceBackedMultisportBalance:'swim',
      applyReviewedMinuteSportRatio:true,
      auditStructuredPolarizationSources:true,
    },
  );
  const hard=out.issues.filter(i=>blockers(i.severity));
  const selected=out.trace.filter(t=>t.id.startsWith('V3P_'));
  expect(selected.every(t=>approved.has(t.id))).toBe(true);
  expect(out.humanReviewRequired).toBe(true);
  expect(out.sportingRelevance).toBe('not_attested');
  expect(out.nodes).toBeLessThanOrEqual(6000);
  expect(out.constraintsSatisfied).toBe(out.technicallyConstructed&&hard.length===0);
  if(out.technicallyConstructed){
    expect(out.candidate?.weeks).toHaveLength(cfg.weeksAvailable);
    for(const week of out.candidate!.weeks){
      const training=week.sessions.filter(session=>!session.isRest);
      const known=training.reduce((minutes,session)=>minutes+(session.durationMin??0),0);
      expect(known).toBeLessThanOrEqual(s.weeklyHours*60);
      if(training.some(session=>session.durationMin===undefined))
        expect(out.constraintsSatisfied).toBe(false);
    }
  } else {
    expect(out.constraintsSatisfied).toBe(false);
  }
  console.info('DET_V319_PROFILE_MATRIX',JSON.stringify({
    profile:s.id,objective:s.objective,
    fitness:{ftp:s.ftp,thresholdSecKm:s.thresholdSecKm,
      cssSec100m:s.cssSec100m,vmaKmh:s.vmaKmh},
    availability:{weeklyHours:s.weeklyHours,maxSessionsPerDay:s.maxSessionsPerDay},
    admittedSources:report.accepted.length,
    technicallyConstructed:out.technicallyConstructed,
    constraintsSatisfied:out.constraintsSatisfied,
    weeks:out.candidate?.weeks.length??0,
    nodes:out.nodes,reason:out.reason??null,
    blockingCodes:[...new Set(hard.map(issue=>issue.code))],
    selectedV3:selected.map(t=>t.id),
  }));
  return {s,approved,out};
}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('DET V3.19 — different athletes and availability, actual complete-plan solver',()=>{
  it.each(['703','IM'] as const)('%s explores reference, physiological shift and availability shift without inventing GO',goal=>{
    vi.stubGlobal('fetch',()=>{throw Error('DET_V319_NETWORK_FORBIDDEN');});
    const inputs=profiles.filter(s=>s.objective===goal);
    expect(inputs).toHaveLength(3);
    const [reference,physiology,availability]=inputs.map(runProfile);
    // Individualization must change a REAL admitted source's calculated targets,
    // not merely the test's input labels. Availability alone must not change FTP.
    const structures=[reference,physiology,availability].map(r=>
      r.approved.get('V3P_BIKE_002')!.structure);
    expect(structures[0]).toContain('CIBLES INDIVIDUALISÉES');
    expect(structures[0]).not.toBe(structures[1]);
    expect(structures[0]).toBe(structures[2]);
    expect(availability.s.weeklyHours).toBeLessThan(reference.s.weeklyHours);
    expect(availability.s.maxSessionsPerDay).toBeLessThan(reference.s.maxSessionsPerDay);
  });

  it('refuses transferring a source approval between two distinct synthetic identities',()=>{
    const reference=profiles[0];
    const stolen=reviewsFor(reference).find(r=>r.id==='V3P_BIKE_002')!;
    const otherId='synthetic-v319-another-athlete';
    const {contract,report}=buildDetV3ContractFromCatalogue([
      {...stolen,expectedAthleteId:otherId},
    ]);
    expect(report.accepted.some(card=>card.id===stolen.id)).toBe(false);
    expect(report.rejected.find(card=>card.id===stolen.id)?.reason)
      .toContain('athlete_scoped_review_identity_missing_or_mismatched');
    expect(contract.sourceStructuredZoneForId?.(stolen.id,65)).toBeNull();
  });
});
