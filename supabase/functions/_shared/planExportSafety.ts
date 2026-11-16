import {raceProtectionForDay,datedRaceGoals,strictRaceDate,RACE_DAYS,type RaceCalendarConfig} from './raceCalendarProtection.ts';
import {normalizeRepairSport,normalizeRepairGoal} from './repairSportingEquivalence.ts';
import {isRaceDaySession} from './raceDayIdentity.ts';
type Session={sport?:string;title?:string;details?:string;dayName?:string;day?:string;durationMin?:number;isRest?:boolean;zones?:string[]};
type Plan={_planStartDate?:string;_objective?:string;_raceDate?:string;_raceGoals?:RaceCalendarConfig['raceGoals'];weeks?:{weekNumber:number;sessions:Session[]}[]};
/** Complete-plan delivery check before new remote writes. Never modifies archives/receipts. */
export function planExportSafetyProblems(value:unknown, calendar:RaceCalendarConfig={}):string[] {
 const plan=value as Plan|null;
 if(!plan||!Array.isArray(plan.weeks))return [];
 const config={planStartDate:plan._planStartDate,objective:plan._objective,raceDate:plan._raceDate,raceGoals:plan._raceGoals,...calendar};
 const start=strictRaceDate(config.planStartDate);
 if(start===undefined)return ['plan_calendar_unverifiable'];
 const problems:string[]=[];
 const active=(s:Session)=>!s.isRest&&normalizeRepairSport(s.sport)!=='rest';
 const demanding=(s:Session)=>/\bZ\s*[3-7]|seuil|MLSS|VO[₂2]max|VMA|tempo|sprint|allure marathon|race.?pace/i.test(`${s.title} ${s.details} ${s.zones?.join(' ')}`);
 const total=(w:NonNullable<Plan['weeks']>[number])=>w.sessions.reduce((n,s)=>n+(active(s)&&normalizeRepairSport(s.sport)!=='strength'&&!isRaceDaySession(s)?s.durationMin??0:0),0);
 for(const w of plan.weeks)for(const s of w.sessions){
  if(!active(s))continue;
  const day=(s.dayName??s.day??'').toLowerCase();
  const p=raceProtectionForDay(config,w.weekNumber,day);
  if(!p)continue;
  if(p.stage==='race'){
   if(!isRaceDaySession(s))problems.push(`race_calendar_extra_training:S${w.weekNumber}`);
   continue;
  }
  if(isRaceDaySession(s)){problems.push(`race_calendar_wrong_day:S${w.weekNumber}`);continue;}
  const cap=p.maxMinutes[normalizeRepairSport(s.sport)];
  if(p.restOnly||cap===0||(cap!==undefined&&(!s.durationMin||s.durationMin>cap))||(p.easyOnly&&demanding(s)))problems.push(`race_calendar_${p.stage}_unsafe:S${w.weekNumber}`);
 }
 for(const goal of datedRaceGoals(config)){
  const race=strictRaceDate(goal.raceDate);if(race===undefined)continue;
  const key=normalizeRepairGoal(goal.objective),rw=Math.floor((race-start)/604800000)+1;
  const week=plan.weeks.find(w=>w.weekNumber===rw),day=RACE_DAYS[(new Date(race).getUTCDay()+6)%7];
  if(week && week.sessions.filter(s=>isRaceDaySession(s)&&(s.dayName??s.day??'').toLowerCase()===day).length!==1)problems.push(`race_calendar_wrong_day:S${rw}`);
  if(key==='marathon'){
   const prep=plan.weeks.filter(w=>w.weekNumber>=rw-4&&w.weekNumber<=rw-2),reference=Math.max(0,...prep.map(total));
   for(const w of plan.weeks.filter(w=>w.weekNumber>rw&&w.weekNumber<=rw+3)){
    const delta=w.weekNumber-rw;if(reference&&total(w)>reference*([0,.45,.7,.9][delta]??1)*1.1+5)problems.push(`race_calendar_reentry_jump:S${w.weekNumber}`);
    // Re-entry intensity is a warning shown in the app, never an export refusal (coach decision 2026-11-16).
   }
  }
 }
 return [...new Set(problems)];
}