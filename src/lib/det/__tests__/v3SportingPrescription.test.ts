import {describe,expect,it} from 'vitest';
import type {PlanConfig} from '@/hooks/useAITrainingPlan';
import {v3SourceContextProblems,roadRunningPrescription,domainMinutes,demandingRunDaysCompatible} from '../v3SportingPrescription';
import {findSource} from '../coachDetContext';
import {coachTarget} from '@/lib/plan/coachPrescriptionText';
import {resolveV3IntensityTargets} from '../../../../scripts/library-v3/resolveV3Intensity';

const config=(objective='Marathon',level='trained',ambition='competitor')=>({objective,ambition,ambitionMeta:{effective:ambition,trainingLevel:level,trainingLevelSource:'manual'}} as PlanConfig);
describe('source applicability and the shared five-input prescription',()=>{
 it('uses the declared training level independently of ambition and physiological performance',()=>{
  expect(v3SourceContextProblems(findSource('V3P_RUN_102')!,config())).toContain('initiation_recipe_for_trained_runner');
  expect(v3SourceContextProblems(findSource('V3P_RUN_102')!,config('Marathon','untrained','finisher'))).toEqual([]);
  expect(v3SourceContextProblems(findSource('V3P_RUN_001')!,config())).toEqual([]);
  expect(roadRunningPrescription(config())?.keySessions).toBe(3);
  expect(roadRunningPrescription(config('Marathon','trained','age_group'))?.keySessions).toBe(2);
 });
 it('keeps walking in trail contexts and does not borrow marathon specificity for another race',()=>{
  expect(v3SourceContextProblems(findSource('V3P_RUN_102')!,config('TrailMountain'))).toEqual([]);
  expect(v3SourceContextProblems(findSource('V3P_RUN_011')!,config('Semi'))).toContain('different_race_specificity');
  expect(v3SourceContextProblems(findSource('V3P_RUN_020')!,config())).toContain('different_race_specificity');
 });
 it('requires context for heat and post-race protocols instead of trusting broad phase tags',()=>{
  expect(v3SourceContextProblems(findSource('V3P_RUN_504')!,config())).toContain('heat_context_not_declared');
  expect(v3SourceContextProblems(findSource('V3P_RUN_504')!,{...config(),constraints:'Préparer une compétition en chaleur'})).toEqual([]);
  expect(v3SourceContextProblems(findSource('V3P_RUN_859')!,config())).toContain('recovery_recipe_for_different_event');
  expect(v3SourceContextProblems({...findSource('V3P_RUN_001')!,title:'Récupération après marathon'},config())).toContain('post_race_recipe_requires_event_context');
 });
 it('does not use a taper reminder to satisfy a development week',()=>{
  expect(v3SourceContextProblems(findSource('V3P_RUN_094')!,config(),'load')).toContain('taper_recipe_in_development');
  expect(v3SourceContextProblems(findSource('V3P_RUN_155')!,config(),'taper')).toEqual([]);
 });
 it('counts real repeated work and catches adjacent demands across week boundaries',()=>{
  expect(domainMinutes(findSource('V3P_RUN_094')!.blocks,'marathon_pace')).toBe(12);
  expect(demandingRunDaysCompatible([1,3,6,8,10])).toBe(true);
  expect(demandingRunDaysCompatible([1,3,6,7,10])).toBe(false);
 });
 it('prescribes the explicit race goal only inside the existing physiological domain',()=>{
  const source=findSource('V3P_RUN_011')!,pace=187*60/42.195;
  const resolved=resolveV3IntensityTargets(source,{runThresholdPaceSecPerKm:240,runRacePacesSecPerKm:{marathon_pace:pace}});
  expect(resolved.targets.find(t=>t.domain==='marathon_pace')).toMatchObject({min:pace,max:pace,source:'coach_race_target',confidence:'model'});
  const impossible=resolveV3IntensityTargets(source,{runThresholdPaceSecPerKm:300,runRacePacesSecPerKm:{marathon_pace:pace}});
  expect(impossible.status).toBe('unresolved');expect(impossible.missing).toContain('race_goal_outside_profile_domain.marathon_pace');
 });
 it('displays running speeds in pace order while retaining old archive text support',()=>{
  const target={domain:'vo2max' as const,metric:'m_per_sec' as const,min:4,max:5,source:'athlete_reference_with_doctrine_model' as const,confidence:'model' as const,note:''};
  expect(coachTarget(target)).toBe('3′20″ à 4′10″ /km');
  expect(coachTarget(target,true)).toBe('4 à 5 m/s');
  expect(target).toMatchObject({metric:'m_per_sec',min:4,max:5});
 });
});
