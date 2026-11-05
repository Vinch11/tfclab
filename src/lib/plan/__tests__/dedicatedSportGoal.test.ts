import {describe,it,expect,vi} from 'vitest';
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
import {compareDedicatedProgrammeGoal,dedicatedProgrammeProblems} from '../dedicatedSportGoal';
import {planningFingerprint} from '@/lib/det/appPlanningInput';
import {coachFamilyFor,coachObjectiveKey} from '../../../../experimental/det-engine/v401-coach-inputs-core';
import {buildAppDiagnosticInput} from '../appPlanningPipeline';
import type {AthleteDiagnostic} from '@/engines/diagnostic';
import type {PlanConfig,PlanAthleteData} from '@/hooks/useAITrainingPlan';
const d={objectif:'703',_rawInput:{ftp:300,css:95},limiter:{gapAnalysis:[{metric:'VLamax',weightedImpact:20}]}} as AthleteDiagnostic;
const athlete={nom:'SYNTHETIC',ftp:300,css:95} as PlanAthleteData;
function config(objective:string,target:number|null){return {objective,planningGoalContext:compareDedicatedProgrammeGoal(objective,d,target),identifiedLimitersRaw:[objective==='Cyclisme FTP'?'FTP':'CSS']} as PlanConfig;}
describe('explicit programme comparison, never a replacement physiological diagnosis',()=>{
 it.each([['Cyclisme FTP',330,'FTP',-30],['Natation 1500m',90,'CSS',-5]] as const)('%s retains the actual reference and comparison units',(objective,target,metric,gap)=>{
  const c=config(objective,target),g=c.planningGoalContext!;
  expect(g).toMatchObject({metric,profileObjective:'703',profilePriorities:['VLamax'],causalLimiterDiagnosis:false,scientificAttestation:false});expect(g.gaps[0].gap).toBe(gap);
  expect(d.limiter.gapAnalysis[0].metric).toBe('VLamax');expect(dedicatedProgrammeProblems(c,athlete)).toEqual([]);
 });
 it.each([null,0,-10,NaN,Infinity,250,300])('refuses absent, invalid or non-improving FTP target %s',target=>{expect(dedicatedProgrammeProblems(config('Cyclisme FTP',target),athlete).length).toBeGreaterThan(0);});
 it.each([95,100,null,Infinity])('refuses non-improving or missing CSS target %s',target=>{expect(dedicatedProgrammeProblems(config('Natation 1500m',target),athlete).length).toBeGreaterThan(0);});
 it('refuses a reference or comparison ledger that differs from the actual athlete',()=>{
  const c=config('Cyclisme FTP',330);expect(dedicatedProgrammeProblems(c,{...athlete,ftp:299}).length).toBeGreaterThan(0);
  c.planningGoalContext!.gaps[0].gap=-1;expect(dedicatedProgrammeProblems(c,athlete).length).toBeGreaterThan(0);
 });
 it('a FTP programme is never advertised as a validated time trial',()=>{expect(coachFamilyFor('Cyclisme contre-la-montre')).toBeNull();expect(coachObjectiveKey('Cyclisme contre-la-montre')).toBe('cycling_tt');});
 it('changing the explicit target invalidates the frozen profile/review fingerprint',async()=>{expect(await planningFingerprint(athlete,config('Cyclisme FTP',330))).not.toBe(await planningFingerprint(athlete,config('Cyclisme FTP',340)));});
 it('never normalizes an unknown dedicated physiological reference to 70.3',()=>{
  expect(()=>buildAppDiagnosticInput({objectif:'unknown'},'Cyclisme FTP','age_group',{snapshots:[],tests:[],checkins:[]})).toThrow('existing_physiological_profile_reference_required');
 });
});
