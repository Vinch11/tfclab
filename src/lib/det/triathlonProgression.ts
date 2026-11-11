import type {AppPlanningDetDraft} from './appPlanningDetDraft';
import {engineLimit} from './coachDecision';
import {parseAthleteConstraints} from '@/lib/plan/constraintRules';
import type {PlanConfig} from '@/hooks/useAITrainingPlan';
import type {V3PlanProposal} from './appPlanningV3Proposal';

/** Work backward from the declared long appointments. A recovery week never
 * advances the load ramp. A brick floor includes 20 minutes of transition run
 * in the shared calendar; its bike component is budgeted separately. */
export function longTriathlonTargets(weeks:AppPlanningDetDraft['weeks'],ramp:number,reachable?:(week:AppPlanningDetDraft['weeks'][number],sport:'bike'|'run',minimum:number)=>number){
  const targets={bike:new Map<number,number>(),run:new Map<number,number>()};
  const next={bike:0,run:0};
  for(const week of [...weeks].reverse()){
    if(week.weekType!=='load')continue;
    for(const slot of week.days.flatMap(day=>day.slots)){
      if(slot.role!=='long'||!['run','bike','brick'].includes(slot.sport))continue;
      const sport=slot.sport==='run'?'run':'bike';
      const minimum=Math.max(0,(slot.minimumMinutes??0)-(slot.sport==='brick'?20:0));
      const floor=Math.ceil(Math.max(minimum,next[sport]/(1+ramp))-1e-8);
      const target=reachable?.(week,sport,floor)??floor;
      targets[sport].set(week.week,target);
      next[sport]=target;
    }
  }
  return targets;
}

/** Report the actual pre-race exposures. A race booking carries no exercise
 * evidence, and a timed pool session is not an open-water distance test. */
export function reviewTriathlonExposure(weeks:V3PlanProposal['weeks']){
  const maximum={bike:0,run:0,swim:0};
  let firstBrick:number|undefined,peak=0;
  for(const week of weeks){
    if(week.weekType==='load')peak=Math.max(peak,week.knownMinutes);
    for(const day of week.days)for(const session of day.sessions){
      if(session.role==='race')continue;
      if(session.sport==='brick'&&session.components.some(c=>c.sport==='bike')&&session.components.some(c=>c.sport==='run'))firstBrick??=week.week;
      for(const c of session.components){
        if(c.sport==='bike'||c.sport==='run'||c.sport==='swim')maximum[c.sport]=Math.max(maximum[c.sport],c.durationMinutes??0);
      }
    }
  }
  const transition=firstBrick?`Premier enchaînement vélo-course en S${firstBrick}.`:'Le calendrier ne prévoit aucun enchaînement vélo-course avant la compétition.';
  return `Pic de charge prévu : ${Number(peak.toFixed(1))} min de blocs en une semaine. Séances ou composantes les plus longues : vélo ${maximum.bike} min, course ${maximum.run} min, natation ${maximum.swim} min, récupérations incluses. ${transition} Comparer ces doses aux efforts continus déjà tolérés et à la durée attendue des trois disciplines avant d’approuver le plan.`;
}

export interface TransitionPractice {
  week:number;
  dayIndex:number;
  slotIndex:number;
  originalSport:'run'|'bike';
}

export interface TransitionCadence { beforeFirst:number; betweenPractices:number }
export const transitionCadences:TransitionCadence[]=[3,6].flatMap(betweenPractices=>
  [2,3,4].map(beforeFirst=>({beforeFirst,betweenPractices})));

// The shared calendar counts appointments. A short, familiar bike/run pair
// can replace one existing appointment on a permitted day without adding a
// session. Prioritize an existing run day to avoid an extra day of foot impact.
export function planTransitionPractice(weeks:Pick<AppPlanningDetDraft['weeks'][number],'week'|'weekType'|'days'>[],config:Pick<PlanConfig,'constraints'>,
  canUseClock:(week:number,day:number,from:'run'|'bike')=>boolean=()=>true,cadence=transitionCadences[0]):TransitionPractice[] {
  const load=weeks.filter(w=>w.weekType==='load');
  if(load.some(w=>w.days.some(d=>d.slots.some(s=>s.role!=='race'&&s.sport==='brick'))))return [];
  if(load.length<3)throw engineLimit('Le calendrier de DET manque de semaines de charge pour programmer un premier enchaînement après la familiarisation au vélo et à la course. Réexaminer le délai avec le coach.');
  const rules=parseAthleteConstraints(config.constraints);
  const practices:TransitionPractice[]=[];
  let next=cadence.beforeFirst;
  for(const [index,w] of load.entries()){
    if(index<next)continue;
    const previous=load.slice(0,index).filter(before=>{
      const sports=before.days.flatMap(day=>day.slots.map(s=>s.sport));
      return sports.includes('bike')&&sports.includes('run');
    });
    if(previous.length<2)continue;
    const eligible=w.days.flatMap((day,dayIndex)=>{
      if(rules.bannedSports.some(s=>s==='run'||s==='bike'||s==='any')||
        rules.dayBans.some(b=>b.day===day.day&&['run','bike','any'].includes(b.sport)))return [];
      return day.slots.flatMap((slot,slotIndex)=>{
        const sport=slot.sport;
        if((sport!=='run'&&sport!=='bike')||!['key','support'].includes(slot.role)||
          slot.maximumMinutes!=null||slot.minimumMinutes!=null||
          day.slots.some((s,i)=>i!==slotIndex&&['bike','run','brick'].includes(s.sport))||
          !canUseClock(w.week,dayIndex,sport))return [];
        return [{week:w.week,dayIndex,slotIndex,originalSport:sport} satisfies TransitionPractice];
      });
    });
    const choice=eligible.find(a=>a.originalSport==='run')??eligible[0];
    if(!choice)continue;
    w.days[choice.dayIndex].slots[choice.slotIndex].sport='brick';
    practices.push(choice);
    // Repeat after another loading block, never on a recovery/race appointment.
    next=index+cadence.betweenPractices;
  }
  if(!practices.length)throw engineLimit('DET ne trouve aucun créneau déjà disponible pour travailler la transition vélo-course avant la course. Examiner un créneau qui autorise les deux disciplines et la récupération.');
  return practices;
}
