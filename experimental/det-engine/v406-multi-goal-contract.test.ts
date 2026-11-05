import {it,expect} from 'vitest';
import {multiGoalProblems} from './v406-multi-goal-contract';
import type {PlanConfig} from '@/hooks/useAITrainingPlan';
const config:PlanConfig={objective:'Semi',planStartDate:'2026-10-26',weeksAvailable:16,raceDate:'2027-02-14',raceGoals:[{objective:'10K',raceDate:'2026-12-19',priority:'B',targetTimeMinutes:40},{objective:'Semi',raceDate:'2027-02-14',priority:'A',targetTimeMinutes:95}]};
it('valid declarations carry no invented event time',()=>expect(multiGoalProblems(config)).toEqual([]));
it.each([
 {name:'no duration',change:(c:PlanConfig)=>{delete c.raceGoals![0].targetTimeMinutes;},code:'multi_goal_explicit_event_duration_required'},
 {name:'no priority',change:(c:PlanConfig)=>{c.raceGoals![0].priority='C';},code:'multi_goal_priority_not_qualified'},
 {name:'changed main date',change:(c:PlanConfig)=>{c.raceDate='2027-02-13';},code:'multi_goal_primary_date_mismatch'},
 {name:'event in recovery week',change:(c:PlanConfig)=>{c.raceGoals![0].raceDate='2027-02-07';},code:'multi_goal_recovery_window_overlap'},
 {name:'event outside horizon',change:(c:PlanConfig)=>{c.raceGoals![0].raceDate='2026-10-20';},code:'multi_goal_date_outside_plan'},
 {name:'duplicate dates',change:(c:PlanConfig)=>{c.raceGoals![0].raceDate='2027-02-14';},code:'multi_goal_duplicate_date'},
])('$name refuses before engine',({change,code})=>{const c=structuredClone(config);change(c);expect(multiGoalProblems(c)).toContain(code);});

import {projectCertifiedRaceEventsForTrainingQuotas} from './v315-certified-race-quota-projection';
const event={sport:'run',dayIndex:5,dayName:'samedi',custom:true,catalogId:null,durationMin:40,isRest:false,title:'COURSE : 10 km',details:'Épreuve déclarée ; durée planifiée ESTIMÉE par le coach, pas une mesure de performance.'};
const entry={weekType:'race',quota:{maxSessionsPerDay:2,minFullRestDays:1},layout:{officialRaceOutsideTrainingQuota:true,requiredEvents:[{dayName:'samedi',sport:'run'}],days:['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'].map((dayName,i)=>({dayName,slots:i===5?[{sport:'run',isRaceEvent:true}]:[]}))}};
const plan={weeks:[{weekNumber:8,sessions:[event]}]};
it('positive event estimates are bound to the actual declaration before training-quota projection',()=>{
 const p=projectCertifiedRaceEventsForTrainingQuotas(plan as never,{8:entry} as never,()=>40);
 expect(p.verdict).toBe('verified');expect(p.projected!.weeks[0].sessions).toEqual([]);expect(plan.weeks[0].sessions).toHaveLength(1);
 expect(projectCertifiedRaceEventsForTrainingQuotas(plan as never,{8:entry} as never).verdict).toBe('refused');
});
it.each([
 {name:'forged duration',sessions:[{...event,durationMin:41}]},
 {name:'duplicate event',sessions:[event,event]},
 {name:'catalogue source masquerading as event',sessions:[{...event,catalogId:'V3P_RUN_001'}]},
 {name:'invented official declaration',sessions:[{...event,details:'Épreuve inventée'}]},
])('$name cannot alter quota counts',({sessions})=>expect(projectCertifiedRaceEventsForTrainingQuotas({weeks:[{weekNumber:8,sessions}]} as never,{8:entry} as never,()=>40).verdict).toBe('refused'));
