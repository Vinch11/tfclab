/** Reserve actual development and peak weeks before the existing 10K taper. */
import {inferWeekType} from '@/engines/plan/sessionSizingMatrix';
import {buildPeriodizationCalendar} from '@/lib/plan/periodizationCalendar';
import type {PeriodizationPhase} from '../../supabase/functions/_shared/periodizationBounds';

export function prepareReviewed10kPhases(config:{weeksAvailable?:number;
  fondationDurationWeeks?:number;windowWeekPhases?:Record<number,PeriodizationPhase>}){
  const weeks=config.weeksAvailable??0,foundation=config.fondationDurationWeeks??0;
  const refuse=(reason:string)=>({verified:false as const,calendar:null,reason});
  if(![8,10,12].includes(weeks)||!Number.isInteger(foundation)||foundation<2)
    return refuse('unsupported_horizon_or_unverified_foundation');
  if(config.windowWeekPhases)return refuse('explicit_phase_calendar_requires_separate_review');
  const original=buildPeriodizationCalendar({...config,objective:'10K'});
  if(!original)return refuse('unverified_native_phase_calendar');
  const counts=(phase:PeriodizationPhase)=>Object.values(original).filter(p=>p===phase).length;
  const peakHasLoad=Object.entries(original).some(([week,phase])=>
    phase==='peak'&&inferWeekType(Number(week),weeks,'10K')==='load');
  if(['base','build','peak'].every(p=>counts(p as PeriodizationPhase)>=2&&
     counts(p as PeriodizationPhase)<=6)&&counts('taper')>=1&&counts('taper')<=3&&peakHasLoad)
    return {verified:true as const,calendar:original,reason:'native_phases_already_admissible'};
  const taperStart=Array.from({length:weeks},(_,i)=>i+1)
    .find(w=>inferWeekType(w,weeks,'10K')==='taper');
  if(!taperStart)return refuse('missing_native_taper');
  const peakStart=taperStart-2;
  if(peakStart-foundation-1<2||foundation>6)
    return refuse('foundation_and_minimum_development_do_not_fit');
  const calendar:Record<number,PeriodizationPhase>={};
  for(let week=1;week<=weeks;week++)calendar[week]=week<=foundation?'base':
    week<peakStart?'build':week<taperStart?'peak':'taper';
  return {verified:true as const,calendar,reason:null};
}
