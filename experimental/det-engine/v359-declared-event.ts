/** Synthetic-only, explicitly declared event estimates and B-race recovery. */
import type {PlanConfig} from '@/hooks/useAITrainingPlan';
import type {ExperimentalAssemblyContract} from './engine';
import type {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import {computeWeekQuotaEntry} from '@/engines/plan/sessionSizingMatrix';
import {buildWeeklySlotLayout,type LayoutSport} from '@/engines/plan/weeklySlotLayout';
import {declaredRaceSlotsForWeek} from '../../supabase/functions/_shared/catalogueTrainingMinima';
import {normalizeRepairGoal} from '../../supabase/functions/_shared/repairSportingEquivalence';

export function resolveDeclaredEvent(config:PlanConfig,week:number,dayIndex:number,sport:string){
  if(!config.planStartDate)throw Error('event_plan_start_missing');
  const date=new Date(Date.parse(config.planStartDate+'T00:00:00Z')+((week-1)*7+dayIndex)*86400000)
    .toISOString().slice(0,10);
  const matches=config.raceGoals?.filter(g=>g.raceDate===date)??[];
  if(matches.length!==1)throw Error('event_date_missing_or_ambiguous');
  const event=matches[0],goal=normalizeRepairGoal(event.objective);
  const expected=['10k','semi','marathon','5k'].includes(goal??'')?'run':
    goal==='cycling'?'bike':goal==='swimming'?'swim':'brick';
  if(sport!==expected||typeof event.targetTimeMinutes!=='number'||
     !Number.isFinite(event.targetTimeMinutes)||event.targetTimeMinutes<=0)
    throw Error('event_sport_or_explicit_duration_estimate_unverified');
  return {...event,targetTimeMinutes:event.targetTimeMinutes};
}

export function prepareMultiGoalMilestones(p:ReturnType<typeof prepareGenerationContracts>,
  config:PlanConfig,base:ExperimentalAssemblyContract){
  base.adapt(p,config);
  if(!config.planStartDate||!config.raceGoals?.length)throw Error('multi_goal_calendar_missing');
  for(const event of config.raceGoals){
    const offset=(Date.parse(event.raceDate+'T00:00:00Z')-Date.parse(config.planStartDate+'T00:00:00Z'))/86400000;
    if(!Number.isSafeInteger(offset)||offset<0||offset>=(config.weeksAvailable??0)*7)
      throw Error('multi_goal_date_outside_plan');
    resolveDeclaredEvent(config,Math.floor(offset/7)+1,offset%7,'run');
    if(event.priority==='A')continue;
    const raceWeek=Math.floor(offset/7)+1;
    for(const [week,weekType] of [[raceWeek,'race'],[raceWeek+1,'recovery']] as const){
      const old=p.weeklyQuotas[week];
      if(!old)throw Error('post_milestone_recovery_outside_plan');
      const adapted=computeWeekQuotaEntry(config.objective??'',config.ambition??'age_group',
        config.weeklyHours??0,weekType,false,{sessionsPerWeek:config.sessionsPerWeek,
          maxSessionsPerDay:config.maxSessionsPerDay});
      if(!adapted)throw Error('multi_goal_native_quota_missing');
      // The first week after a declared B race is a recovery microcycle,
      // without the ordinary deload's compulsory long run. Native frequency,
      // source recovery and the exact >=30% volume reduction still apply.
      const floors={...adapted.floors,...(weekType==='recovery'?
        {longRunWeekly:false,slLongRunMin:undefined}:{}),
        ...(weekType!=='recovery'&&adapted.floors.longRunWeekly?
          {slLongRunMin:old.floors.slLongRunMin}:{})};
      p.weeklyQuotas[week]={...old,...adapted,floors,
        layout:buildWeeklySlotLayout(adapted.quota,floors,weekType,{
          availableSports:new Set<LayoutSport>(['run','bike','strength']),
          dayBans:p.dayBans,raceEvents:declaredRaceSlotsForWeek(config,week),
        })};
    }
  }
}
