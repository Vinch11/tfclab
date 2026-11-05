import {describe,it,expect} from 'vitest';
import {runFamily,familyCases} from './v359-family-fixture';
import {syntheticV3SportingContext,syntheticV3ReviewAnchors} from './v3-test-anchor-fixtures';
import {runCoachInputsDet} from './v401-coach-inputs-core';
import {familySourcePool,computePoolFingerprint,PINNED_POOL_FINGERPRINTS} from '@/lib/det/familySourcePools';
import {aeroLedger,timeTrialProblems,timeTrialPhysiologyProblems,auditTimeTrial,TT_OBJECTIVE,type TimeTrialDeclaration} from './v410-time-trial-contract';
import type {DetStructuredWorkout} from './v400-structured-workout';
const declaration:TimeTrialDeclaration={aeroWeeks:[5,6],aeroDayIndex:3,athleteId:'synthetic-clm',raceDurationMinutes:60,observedOn:'2026-10-20',reviewReference:'SYNTHETIC field observation only',bikeFitConfirmed:true,symptomScreenClear:true,longestContinuousAeroMinutes:20,maxAeroMinutesPerSession:60,minimumContinuousAeroMinutes:15,minimumAeroMinutesPerSession:30,minimumAeroSessions:2};
describe('V410 CLM contract — synthetic input, never a scientific attestation',()=>{
 it('constructs a complete source-reviewed CLM calendar with exact aero bouts',async()=>{
  const f=runFamily(familyCases.find(c=>c.objective==='Cyclisme FTP')!);
  const athlete={...f.athlete,nom:declaration.athleteId};
  const config={...f.config,constraints:'pas de vélo le mercredi',objective:TT_OBJECTIVE,raceGoals:[{objective:TT_OBJECTIVE,raceDate:f.config.raceDate!,targetTimeMinutes:60,priority:'A' as const}]};
  const reviews=familySourcePool('cycling_tt').ids.map(id=>{const c=syntheticV3SportingContext(id);if(!('sportingReview'in c))throw Error('missing_test_context');return {id,...familySourcePool('cycling_tt').doses[id],objective:TT_OBJECTIVE,athleteLevel:'trained' as const,athleteLevelSource:'manual' as const,allPrerequisitesChecked:true as const,individualCoachApproval:true as const,preferReviewedV3:true as const,expectedAthleteId:athlete.nom,sportingReview:{...c.sportingReview,athleteId:athlete.nom},athleteAnchors:syntheticV3ReviewAnchors(),...(id.includes('STRENGTH')?{verifiedStrengthLoadAndRpe:true as const}:{})};});
  const out=runCoachInputsDet({athlete,config,reviews,timeTrial:declaration,clock:{timeZone:'Europe/Brussels',minutesBySport:{bike:[480,360,480,540,600,480,480],strength:Array(7).fill(1140)}},limits:{maxNodes:60000,maxMilliseconds:120000}});
  const proof=out.out.issues.filter(i=>i.code.includes('v410'));
  expect(out.out.constraintsSatisfied).toBe(true);expect(out.out.candidate?.weeks).toHaveLength(8);expect(proof.some(i=>i.code==='det_v410_time_trial_verified')).toBe(true);
  expect(await computePoolFingerprint(familySourcePool('cycling_tt').ids)).toBe(PINNED_POOL_FINGERPRINTS.cycling_tt);
  const audit=JSON.parse(proof[0].message!);expect(audit.exposures).toHaveLength(2);expect(audit.exposures.every(e=>e.boutsSeconds.join(',')==='930,930')).toBe(true);expect(audit.appointmentsComplete).toBe(true);
  const race=out.out.candidate!.weeks.flatMap(w=>w.sessions).filter(s=>s.title.startsWith('COURSE : '));expect(race).toHaveLength(1);expect(race[0].durationMin).toBe(60);
  const providers={dose:()=>null,limiterKeys:()=>null,primaryDomain:()=>null};
  expect(auditTimeTrial(out.out.candidate!,{...declaration,longestContinuousAeroMinutes:10},'ftp',providers,out.structuredWorkoutForId).verified).toBe(false);
  expect(auditTimeTrial(out.out.candidate!,{...declaration,maxAeroMinutesPerSession:20},'ftp',providers,out.structuredWorkoutForId).verified).toBe(false);
 },180000);
 it('requires coach observation, matching athlete and exact event duration',()=>{
  const config={objective:TT_OBJECTIVE,planStartDate:'2026-10-26',raceDate:'2026-12-20',weeksAvailable:8,raceGoals:[{objective:TT_OBJECTIVE,raceDate:'2026-12-20',priority:'A' as const,targetTimeMinutes:60}]};
  expect(timeTrialProblems(declaration,declaration.athleteId,config)).toEqual([]);
  for(const d of [undefined,{...declaration,athleteId:'other'},{...declaration,symptomScreenClear:false},{...declaration,raceDurationMinutes:90},{...declaration,observedOn:'2027-01-01'},{...declaration,longestContinuousAeroMinutes:10}])expect(timeTrialProblems(d,declaration.athleteId,config).length).toBeGreaterThan(0);
 });
 it('FTP/kg needs the original mass and diagnosis; never becomes absolute FTP',()=>{
  const config={objective:TT_OBJECTIVE,identifiedLimitersRaw:['FTP/kg'],physiologicalTrace:{diagnostic:{limiters:[{metric:'FTP/kg',value:2.5,target:4}]}}} as never;
  expect(timeTrialPhysiologyProblems(config,{ftp:180,weightKg:72})).toEqual([]);
  expect(timeTrialPhysiologyProblems(config,{ftp:180,weightKg:null}).length).toBeGreaterThan(0);
  expect(timeTrialPhysiologyProblems(config,{ftp:180,weightKg:60}).length).toBeGreaterThan(0);
 });
 it('distinguishes continuous bout lengths despite the same total exposure',()=>{
  const w=(count:number,seconds:number):DetStructuredWorkout=>({schema:'det-structured-workout-v1',sourceId:'SYNTHETIC',sport:'bike',chosenDurationMin:(count*seconds+(count-1)*300)/60,exactSeconds:count*seconds+(count-1)*300,nodes:[{kind:'repeat',label:'source',count,betweenSec:300,restAfterLast:false,steps:[{kind:'step',role:'main',label:'Position aéro',domain:'tempo',dose:{seconds},target:{metric:'watts',min:200,max:220,source:'SYNTHETIC' as never,confidence:'estimated' as never}}]}]});
  const a=aeroLedger(w(4,900)),b=aeroLedger(w(6,600));expect(a.valid&&b.valid).toBe(true);expect(a.totalAeroMinutes).toBe(b.totalAeroMinutes);expect(a.boutsSeconds).toEqual([900,900,900,900]);expect(b.longestContinuousMinutes).toBe(10);expect(a.longestContinuousMinutes).toBe(15);
 });
});
