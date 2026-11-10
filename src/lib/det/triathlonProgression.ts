import type {AppPlanningDetDraft} from './appPlanningDetDraft';
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
