/**
 * V3.9 — a NECESSARY, never sufficient, minutes reallocation certificate.
 *
 * Unresolved brick minutes are granted entirely to bike/run, even though
 * real transitions make that optimistic. Any deficit that survives is real.
 * Free weekly capacity is an upper bound, NOT proof an approved session with
 * that dose exists or that load, recovery and polarization permit its use.
 */
import type {ParsedPlan} from '@/lib/aiPlanParser';

type Discipline='swim'|'bike'|'run';
type KnownMinutes=Record<Discipline,number>;

export interface RatioCapacityCertificate {
  scope:'load_weeks_only';
  optimisticCurrentSwimPct:number|null;
  minimumAdditionalNonSwimMinutes:number|null;
  capOnlyAdditionalMinutesMaximum:number|null;
  provablyImpossibleUnderWeeklyCaps:boolean|null;
  interpretation:'necessary_condition_not_feasible_schedule';
}

export function certifySwimRatioCapacity(
  knownMinutes:Readonly<KnownMinutes>,
  unresolvedBrickMinutes:number,
  swimUpperPct:number,
  plan:Pick<ParsedPlan,'weeks'>,
  loadWeeks:readonly number[],
  weeklyCaps:Readonly<Record<number,number>>,
):RatioCapacityCertificate {
  const numbers=[...Object.values(knownMinutes),unresolvedBrickMinutes];
  if(numbers.some(n=>!Number.isFinite(n)||n<0)||
     !Number.isFinite(swimUpperPct)||swimUpperPct<=0||swimUpperPct>=100)
    throw Error('v39_ratio_capacity_invalid_input');
  const optimisticTotal=numbers.reduce((a,b)=>a+b,0);
  const optimisticCurrentSwimPct=optimisticTotal?
    100*knownMinutes.swim/optimisticTotal:null;
  // Even if EVERY unresolved brick minute belongs to endurance (and none
  // to transition), this much real non-swim work must still be added.
  const minimumAdditionalNonSwimMinutes=optimisticTotal?
    Math.max(0,Math.ceil((100*knownMinutes.swim/swimUpperPct-optimisticTotal)-1e-9)):null;
  let capOnlyAdditionalMinutesMaximum:number|null=0;
  const byWeek=new Map(plan.weeks.map(w=>[w.weekNumber,w]));
  for(const weekNumber of loadWeeks){
    const week=byWeek.get(weekNumber);
    const cap=weeklyCaps[weekNumber];
    if(!week||!Number.isFinite(cap)||cap<0){
      capOnlyAdditionalMinutesMaximum=null;
      break;
    }
    const real=week.sessions.filter(s=>!s.isRest);
    // Unknown strength hours do not count as zero. We cannot certify
    // spare hours from an incomplete timetable.
    if(real.some(s=>typeof s.durationMin!=='number'||
       !Number.isFinite(s.durationMin)||s.durationMin<0)){
      capOnlyAdditionalMinutesMaximum=null;
      break;
    }
    const used=real.reduce((sum,s)=>sum+s.durationMin!,0);
    if(used>cap){
      // A pre-existing budget violation is handled by native validation.
      // Its apparent "negative headroom" cannot establish a safe schedule.
      capOnlyAdditionalMinutesMaximum=null;
      break;
    }
    capOnlyAdditionalMinutesMaximum+=cap-used;
  }
  const provablyImpossibleUnderWeeklyCaps=
    minimumAdditionalNonSwimMinutes===null||
    capOnlyAdditionalMinutesMaximum===null?null:
      minimumAdditionalNonSwimMinutes>capOnlyAdditionalMinutesMaximum;
  return {scope:'load_weeks_only',optimisticCurrentSwimPct,
    minimumAdditionalNonSwimMinutes,capOnlyAdditionalMinutesMaximum,
    provablyImpossibleUnderWeeklyCaps,
    interpretation:'necessary_condition_not_feasible_schedule'};
}
