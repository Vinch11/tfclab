import type { V3PlanProposal, ProposedV3Workout,ProposedV3Session } from './appPlanningV3Proposal';
import { findSource } from './coachDetContext';
import { fingerprintV3SportingSource } from '../../../scripts/library-v3/sportingQualification800';
import { evaluateV3Workout,type V3Block } from '../../../scripts/library-v3/catalogueRuntime';
import { clockFor, type CoachConfirmedClock } from '../../../experimental/det-engine/v401-coach-inputs-core';
import { calendarOrConfirmedClockRecoverySafe, type ScheduledSport,type ConfirmedSlotStart } from '../../../experimental/det-engine/v39-calendar-safe-recovery';
import { normalizeRepairGoal } from '../../../supabase/functions/_shared/repairSportingEquivalence';
import { hasExactStrictTriathlonRatio, TRIATHLON_STRICT_MINUTE_RANGES } from '../../../experimental/det-engine/v314-cumulative-ratio-search';
import { parseAthleteConstraints } from '@/lib/plan/constraintRules';

type Check=V3PlanProposal['checks'][number];
const absolute=(slot:ScheduledSport)=>(slot.week-1)*7+slot.dayIndex;
const serves=(sport:string,slot:ScheduledSport)=>slot.sport===sport||slot.sport==='brick'&&(['bike','run'].includes(sport)||slot.isRaceEvent&&sport==='swim');
export function proposedRecoveryStatus(session:ProposedV3Session,here:ScheduledSport,slots:readonly ScheduledSport[],start:ConfirmedSlotStart):Check['status']{
  const states=session.components.map(component=>{
    const requirement={sourceId:component.sourceId,sport:component.sport,hours:component.review.minimumRecoveryHours};
    try{
      if(calendarOrConfirmedClockRecoverySafe(here,session.durationMinutes??undefined,[requirement],slots,start))return 'passed' as const;
      const next=slots.filter(s=>absolute(s)>absolute(here)&&serves(component.sport,s)).sort((a,b)=>absolute(a)-absolute(b))[0];
      const uniqueToday=slots.filter(s=>absolute(s)===absolute(here)&&serves(component.sport,s)).length<=1;
      const a=start(here),b=next?start(next):null;
      if(uniqueToday&&a&&b){
        const maximumGap=(absolute(next!)-absolute(here))*1440+b.minuteOfDay-b.utcOffsetMinutes-a.minuteOfDay+a.utcOffsetMinutes-session.knownMinutes;
        // A lower bound on duration can prove INCOMPATIBILITY, never safety.
        if(maximumGap<requirement.hours*60)return 'blocked' as const;
      }
      return 'pending' as const;
    }catch{return 'blocked' as const;}
  });
  return states.includes('blocked')?'blocked':states.includes('pending')?'pending':'passed';
}
function withinSourceBounds(original:readonly V3Block[],configured:readonly V3Block[]):boolean{
  if(original.length!==configured.length)return false;
  const bound=(a:{min:number;max:number},b:{min:number;base:number;max:number}|undefined,integer=false)=>!!b&&
    b.min===a.min&&b.max===a.max&&Number.isFinite(b.base)&&b.base>=a.min&&b.base<=a.max&&(!integer||Number.isSafeInteger(b.base));
  return original.every((a,index)=>{
    const b=configured[index];if(a.kind!==b.kind||a.label!==b.label)return false;
    if(a.kind==='repeat'&&b.kind==='repeat')return bound(a.count,b.count,true)&&
      (a.betweenSecBounds?bound(a.betweenSecBounds,b.betweenSecBounds,true)&&b.betweenSec===b.betweenSecBounds!.base:b.betweenSec===a.betweenSec)&&withinSourceBounds(a.steps,b.steps);
    if(a.kind==='repeat'||b.kind==='repeat'||a.domain!==b.domain||a.role!==b.role)return false;
    if(JSON.stringify(a.rpeRange)!==JSON.stringify(b.rpeRange)||a.sides!==b.sides||a.secPerRep!==b.secPerRep)return false;
    if(a.repsTarget?!bound(a.repsTarget,b.repsTarget,true):b.repsTarget!==undefined)return false;
    if([b.seconds,b.meters,b.reps].filter(Boolean).length!==1)return false;
    return a.kind==='time'?bound(a.seconds!,b.seconds):a.kind==='distance'?bound(a.meters!,b.meters):bound(a.reps!,b.reps,true);
  });
}
function componentMinutes(component:ProposedV3Workout):number|null|'invalid'{
  const source=findSource(component.sourceId);
  if(!source||source.sport!==component.sport||source.primaryDomain!==component.sourceDomain||fingerprintV3SportingSource(source)!==component.sourceFingerprint||!withinSourceBounds(source.blocks,component.blocks))return 'invalid';
  if((['minimumRecoveryHours','minimumLevel','stopRule','prerequisites','contraindications'] as const).some(key=>JSON.stringify(component.review[key])!==JSON.stringify(source[key])))return 'invalid';
  const swimPaces=Object.fromEntries(component.targets.targets.filter(t=>t.domain&&t.metric==='sec_per_100m'&&t.min!==null&&t.min===t.max).map(t=>[t.domain!,t.min!]));
  try{
    const timing=evaluateV3Workout({...source,blocks:component.blocks},{swimPaces});
    const minutes=timing.status==='confirmed'?timing.minutes:null;
    if(component.durationMinutes!==null&&(minutes===null||Math.abs(component.durationMinutes-minutes)>1e-7))return 'invalid';
    return minutes;
  }catch{return 'invalid';}
}
export function auditV3ProposalDoseIntegrity(plan:V3PlanProposal):Check[]{
  return plan.weeks.flatMap(week=>{
    const parts=week.days.flatMap(d=>d.sessions.flatMap(s=>s.components));
    const invalid=parts.filter(c=>componentMinutes(c)==='invalid');
    return [{code:'configured_dose_integrity',week:week.week,status:invalid.length?'blocked' as const:'passed' as const,message:invalid.length?`Dose ou source incohérente : ${invalid.map(c=>c.sourceId).join(', ')}. Aucune durée corrigée silencieusement.`:'Durées numériques cohérentes avec les blocs configurés et l’empreinte de la source ; les valeurs inconnues restent inconnues.'}];
  });
}
/** Arithmetic/calendar evidence about a proposed prescription only. This
 * neither admits a source nor asserts actual athlete readiness/adaptation. */
export function auditV3ProposalRecovery(plan:V3PlanProposal,startDate:string,clock?:CoachConfirmedClock):Check[]{
  const rows=plan.weeks.flatMap(week=>week.days.flatMap((day,dayIndex)=>day.sessions.map(session=>({
    week:week.week,dayIndex,day:day.day,session,sport:session.sport,isRaceEvent:session.role==='race',
  }))));
  const slots:ScheduledSport[]=rows.map(r=>({week:r.week,dayIndex:r.dayIndex,sport:r.sport,isRaceEvent:r.isRaceEvent}));
  const checks:Check[]=[];
  // A regular training time is not the start time of an official race.
  const provider=clock?clockFor(clock,startDate):undefined;
  const start=(slot:ScheduledSport)=>slot.isRaceEvent?null:provider?.(slot)??null;
  for(const row of rows){
    if(row.isRaceEvent)continue;
    for(const component of row.session.components){
      const requirement={sourceId:component.sourceId,sport:component.sport,hours:component.review.minimumRecoveryHours};
      const status=proposedRecoveryStatus({...row.session,components:[component]},row,slots,start),safe=status==='passed';
      checks.push({code:'source_recovery',week:row.week,status,message:
        `${component.sourceId} · ${row.day} : ${requirement.hours} h avant la prochaine sollicitation ${component.sport}. `+
        (safe?'Espacement du calendrier compatible dans cet horizon ; disponibilité réelle à revoir.':status==='blocked'?'Horaires déclarés incompatibles ou invalides : corriger le placement.':'Espacement non prouvé sans horaires/durée complets ; aucune heure supposée.')});
    }
  }
  for(const week of plan.weeks)for(const [dayIndex,day] of week.days.entries()){
    if(day.sessions.length<2)continue;
    try{
      const windows=day.sessions.map(session=>{
        const value=start({week:week.week,dayIndex,sport:session.sport,isRaceEvent:session.role==='race'});
        return value?{begin:value.minuteOfDay-value.utcOffsetMinutes,end:value.minuteOfDay-value.utcOffsetMinutes+session.knownMinutes,complete:session.durationMinutes!==null}:null;
      });
      const ordered=windows.filter((w):w is NonNullable<typeof w>=>!!w).sort((a,b)=>a.begin-b.begin);
      const conflict=ordered.some((window,i)=>i>0&&ordered.slice(0,i).some(prior=>prior.end>window.begin));
      const complete=windows.every(w=>w?.complete);
      checks.push({code:'same_day_overlap',week:week.week,status:conflict?'blocked':complete?'passed':'pending',message:`${day.day} : ${conflict?'chevauchement déjà prouvé par les durées connues, à corriger':complete?'aucun chevauchement entre les créneaux déclarés':'chevauchement non vérifiable tant que les horaires ou durées manquent'}.`});
    }catch{checks.push({code:'same_day_overlap',week:week.week,status:'blocked',message:`${day.day} : horaires déclarés invalides ou ambigus.`});}
  }
  return checks;
}

export function auditV3ProposalSportMinutes(plan:V3PlanProposal,constraints?:string):Check[]{
  const key=normalizeRepairGoal(plan.objective);
  const objective=({half:'703',ironman:'IM',sprint:'Sprint',olympic:'Olympic'} as const)[key as 'half'|'ironman'|'sprint'|'olympic'];
  if(!objective)return [];
  if(parseAthleteConstraints(constraints).bannedSports.length)return [{code:'sport_minute_ratios',status:'pending',message:'Une discipline est exclue : proportions adaptées à revoir, sans appliquer le ratio triathlon standard.'}];
  const components=plan.weeks.filter(w=>w.weekType==='load'&&!w.days.some(d=>d.sessions.some(s=>s.role==='race'))).flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components))).filter(c=>c.sport!=='strength');
  const actual=components.map(componentMinutes);
  if(actual.some(n=>n==='invalid'))return [{code:'sport_minute_ratios',status:'blocked',message:'Proportions refusées : une dose numérique ne correspond pas aux blocs configurés ou à sa source.'}];
  if(!components.length||actual.some(n=>n===null))return [{code:'sport_minute_ratios',status:'pending',message:'Proportions en minutes non vérifiables : une durée cardio manque. Les composantes vélo/course sont séparées, sans partage forfaitaire.'}];
  const minutes={swim:0,bike:0,run:0};
  for(const [index,component] of components.entries()){if(!(component.sport in minutes))return [{code:'sport_minute_ratios',status:'pending',message:'Discipline non décomposable pour le contrôle des minutes.'}];minutes[component.sport as keyof typeof minutes]+=actual[index] as number;}
  const total=minutes.swim+minutes.bike+minutes.run;
  const valid=hasExactStrictTriathlonRatio(objective,minutes,[]);
  const detail=(Object.keys(minutes) as Array<keyof typeof minutes>).map(sport=>`${sport} ${total?Math.round(1000*minutes[sport]/total)/10:0} % (cible ${TRIATHLON_STRICT_MINUTE_RANGES[objective][sport].join('–')} %)`).join(' ; ');
  return [{code:'sport_minute_ratios',status:valid?'passed':'blocked',message:`Minutes d'exercice des semaines de charge sans épreuve, renforcement et transitions exclus : ${detail}. ${valid?'Répartition compatible avec les plages existantes.':'Répartition à corriger ; le plan reste bloqué.'}`}];
}
