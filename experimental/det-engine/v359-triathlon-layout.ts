/** Experimental frequency reconciliation before layout. Never waive a quota. */
import type {PlanConfig,PlanAthleteData} from '@/hooks/useAITrainingPlan';
import type {ExperimentalAssemblyContract} from './engine';
import {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import {computeWeeklySessionQuota,applySessionsPerWeekTarget} from '@/engines/plan/sessionSizingMatrix';
import {buildWeeklySlotLayout,type LayoutSport} from '@/engines/plan/weeklySlotLayout';
import {declaredRaceSlotsForWeek} from '../../supabase/functions/_shared/catalogueTrainingMinima';

export function preserveTriathlonTaperFrequency(
  preparation:ReturnType<typeof prepareGenerationContracts>,config:PlanConfig,
  _athlete:PlanAthleteData,base:ExperimentalAssemblyContract,
){
  base.adapt(preparation,config);
  for(const [raw,entry] of Object.entries(preparation.weeklyQuotas)){
    const week=Number(raw);
    const native=computeWeeklySessionQuota(config.objective??'',config.ambition??'age_group',
      config.weeklyHours??0,entry.weekType,false);
    if(!native)throw Error('missing_native_triathlon_quota');
    const adjusted=config.sessionsPerWeek?applySessionsPerWeekTarget(native,
      config.sessionsPerWeek,entry.weekType,native.quota.brick.min,
      ['taper','race'].includes(entry.weekType)?Math.min(2,native.quota.run.min):0):native;
    const quota={...adjusted.quota,maxSessionsPerDay:Math.min(adjusted.quota.maxSessionsPerDay,
      config.maxSessionsPerDay??adjusted.quota.maxSessionsPerDay)};
    const floors={...adjusted.floors,
      slLongRideMin:adjusted.floors.longRideWeekly?entry.floors.slLongRideMin:undefined,
      slLongRunMin:adjusted.floors.longRunWeekly?entry.floors.slLongRunMin:undefined};
    const available=new Set<LayoutSport>(['swim','bike','run','brick','strength']);
    preparation.weeklyQuotas[week]={...entry,quota,floors,
      layout:buildWeeklySlotLayout(quota,floors,entry.weekType,{
        availableSports:available,raceEvents:declaredRaceSlotsForWeek(config,week),
        dayBans:preparation.dayBans,
        ...(entry.weekType==='race'&&quota.brick.max===0&&declaredRaceSlotsForWeek(config,week).length?{officialRaceOutsideTrainingQuota:true as const}:{}),
      })};
  }
}
