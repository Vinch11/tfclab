/** Explicit mono-sport quotas from the declared coach frequency, experimental only. */
import type {PlanConfig} from '@/hooks/useAITrainingPlan';
import type {ExperimentalAssemblyContract} from './engine';
import type {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import {buildWeeklySlotLayout,type LayoutSport} from '@/engines/plan/weeklySlotLayout';
import {inferWeekType,type WeeklyQuota,type SizingFloors} from '@/engines/plan/sessionSizingMatrix';
import {declaredRaceSlotsForWeek} from '../../supabase/functions/_shared/catalogueTrainingMinima';

export function prepareDedicatedSport(
  p:ReturnType<typeof prepareGenerationContracts>,config:PlanConfig,
  base:ExperimentalAssemblyContract,sport:'bike'|'swim',
){
  base.adapt(p,config);
  const frequency=config.sessionsPerWeek;
  if(!Number.isSafeInteger(frequency)||!frequency||frequency<3||frequency>6||
     !config.weeklyHours||!config.weeksAvailable||config.raceGoals?.length!==1)
    throw Error('dedicated_sport_requires_explicit_frequency_hours_and_one_event');
  for(let week=1;week<=config.weeksAvailable;week++){
    const weekType=inferWeekType(week,config.weeksAvailable,config.objective,
      undefined,config.deloadCadenceWeeks);
    const count=weekType==='recovery'?Math.max(2,Math.round(frequency*.7)):
      weekType==='taper'?Math.max(2,frequency-1):frequency;
    const strength=weekType==='race'?0:config.strengthSessionsPerWeek??1;
    const quota:WeeklyQuota={swim:{min:0,max:0},bike:{min:0,max:0},run:{min:0,max:0},
      brick:{min:0,max:0},strength:{min:strength,max:strength},
      totalSessions:{min:count+strength,max:count+strength},
      maxSessionsPerDay:config.maxSessionsPerDay??1,minFullRestDays:1,
      source:{tier:'practitioner_literature',ref:'Explicit synthetic coach frequency; native taper/recovery modulation, no normative physiological targets inferred'}};
    quota[sport]={min:count,max:count};
    const floors:SizingFloors={minStrengthPerWeek:strength,
      ...(sport==='swim'?{minSwimPerWeek:count}:{}),
      longRideWeekly:sport==='bike'&&['load','recovery'].includes(weekType),
      slLongRideMin:sport==='bike'&&['load','recovery'].includes(weekType)?
        weekType==='recovery'?60:90:undefined};
    const phase=p.phaseCalendar?.[week]??'base';
    p.weeklyQuotas[week]={quota,floors,weekType,downgraded:false,phase,
      layout:buildWeeklySlotLayout(quota,floors,weekType,{
        availableSports:new Set<LayoutSport>([sport,'strength']),
        dayBans:p.dayBans,raceEvents:declaredRaceSlotsForWeek(config,week),
        taperRunFrequencyFloor:0,
      })};
  }
}
