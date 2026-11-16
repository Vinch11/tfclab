import {describe,it,expect} from 'vitest';
import {validateRaceTrajectory} from '../raceCalendarValidation';
import {validateCoachVolumeBudgets} from '../coachVolumeValidation';
import {raceProtectionForDay,protectedRaceWeekType} from '../../../../supabase/functions/_shared/raceCalendarProtection';
import {computeAdaptationPrediction} from '@/lib/v2/adaptationPredictor';
const config={planStartDate:'2026-11-16',objective:'Ironman',raceDate:'2027-06-27',raceGoals:[{objective:'Marathon',raceDate:'2027-02-21',priority:'B'}]};
const session=(minutes:number,sport='bike',title='Endurance Z2')=>({title,details:'',sport,durationMin:minutes,isRest:false,dayName:'jeudi',zones:['Z2']});
const week=(weekNumber:number,minutes:number)=>({weekNumber,phase:'build',sessions:[session(minutes)]});
describe('Manu complete trajectory regression',()=>{
 it('does not turn S12 into a third taper week for the B marathon',()=>{
  expect(raceProtectionForDay(config,12,'dimanche')).toBeUndefined();
  expect(protectedRaceWeekType(config,12,'load')).toBe('load');
  expect(protectedRaceWeekType(config,13,'load')).toBe('taper');
 });
 it('permits a genuine marathon reminder before the B race',()=>{
  expect(raceProtectionForDay(config,14,'lundi')).toMatchObject({easyOnly:false,maxMinutes:{run:45}});
 });
 it('progressively restores aerobic duration rather than imposing ten identical capped days',()=>{
  expect(raceProtectionForDay(config,16,'jeudi')).toMatchObject({maxMinutes:{bike:120,run:45},easyOnly:true});
  expect(raceProtectionForDay(config,17,'jeudi')).toMatchObject({maxMinutes:{bike:180,run:75},easyOnly:false});
 });
 it('rejects S17 16h40 after the stored pre-marathon 9h25 reference even without quotas',()=>{
  const issues=validateRaceTrajectory({weeks:[week(12,560),week(13,565),week(15,55),week(16,160),week(17,1000)]},config);
  expect(issues.some(i=>i.rule==='race_calendar_reentry_jump' && i.message.startsWith('S17:'))).toBe(true);
 });
 it('accepts a progressive recovery with no forced minimum hours',()=>{
  expect(validateRaceTrajectory({weeks:[week(12,780),week(15,55),week(16,500),week(17,650)]},config)).toEqual([]);
 });
 it('rejects missing significant marathon reminders',()=>{
  expect(validateRaceTrajectory({weeks:[week(13,565)]},config).some(i=>i.rule==='race_calendar_marathon_reminder_missing')).toBe(true);
  const w={...week(13,500),sessions:[session(45,'run',"2×10' à allure marathon")]};
  expect(validateRaceTrajectory({weeks:[w]},config)).toEqual([]);
 });
 it('requires a dedicated 2h bike and 1h run at Ironman J-14',()=>{
  expect(validateRaceTrajectory({weeks:[week(30,75)]},config).filter(i=>i.rule==='race_calendar_taper_long_missing')).toHaveLength(2);
  expect(validateRaceTrajectory({weeks:[{...week(30,120),sessions:[session(120),session(60,'run')]}]},config)).toEqual([]);
 });
 it('does not lose the load reference across race and weeks without budgets',()=>{
  const budget=(globalWeek:number)=>({globalWeek,maxMinutes:1200,weeklyIncreasePctMax:.1,referenceSource:'coach' as const});
  const quotas={12:{weekType:'load',volumeBudget:budget(12)},14:{weekType:'race',volumeBudget:budget(14)},17:{weekType:'load',volumeBudget:budget(17)}};
  const issues=validateCoachVolumeBudgets({weeks:[week(12,560),{...week(14,210),sessions:[session(210,'run','🏁 COURSE Marathon')]},week(15,55),week(16,160),week(17,1000)]},quotas);
  expect(issues.some(i=>i.week===17 && i.rule==='coach_load_violation')).toBe(true);
 });
 it('removes unvalidated TTE and durability deltas from every prediction and score input',()=>{
  const result=computeAdaptationPrediction({snapshot:{vo2max:50,vlamax:.4,ftp:220,weight_kg:60,tte_observed_min:40,run_hr_drift_pct:2},objectif:'Ironman',limiterId:null,limiterLabel:null});
  expect(result.currentState.tte_min).toBe(40);
  expect(result.scenarios.length).toBeGreaterThan(0);
  expect(result.scenarios.flatMap(s=>s.metrics).some(m=>m.id==='tte'||m.id==='durability')).toBe(false);
 });
});