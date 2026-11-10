import type { ProposedV3Session, V3PlanProposal } from './appPlanningV3Proposal';

type Sport = 'swim'|'bike'|'run';
const sports:Sport[] = ['swim','bike','run'];
const isSport = (s:string):s is Sport => s==='swim'||s==='bike'||s==='run';
type Slot = {sport:string; role:string};
type History = V3PlanProposal['weeks'];

export function triathlonTaperTargets(history:History, slots:readonly Slot[], taperIndex:number, taperWeeks:number, race:boolean, availableMinutes:number) {
  const recent=history.filter(w=>w.weekType==='load').slice(-3);
  if(!recent.length||availableMinutes<=0)return null;
  const totals={swim:0,bike:0,run:0}, bricks={swim:0,bike:0,run:0};
  let strength=0;
  for(const week of recent){
    for(const session of week.days.flatMap(d=>d.sessions)){
      if(session.role==='race')return null;
      for(const part of session.components){
        if(part.durationMinutes===null)return null;
        if(part.sport==='strength')strength+=part.durationMinutes;
        else if(isSport(part.sport)){
          totals[part.sport]+=part.durationMinutes;
          if(session.sport==='brick')bricks[part.sport]+=part.durationMinutes;
        }
      }
    }
  }
  const reference=(strength+totals.swim+totals.bike+totals.run)/recent.length;
  if(reference<=0)return null;
  // Centre the load-week-relative search around 60% during the taper.
  // Prolonged tapers descend across weeks. Race duration is explicitly excluded.
  const fraction=race ? .35 : taperWeeks<=1 ? .6 : .7-.2*(taperIndex-1)/(taperWeeks-1);
  const scale=Math.min(fraction,availableMinutes/reference);
  const bySlot=slots.map(()=>({swim:0,bike:0,run:0}));
  for(const sport of sports){
    const single=slots.flatMap((s,i)=>s.role!=='race'&&s.sport===sport?[i]:[]);
    const combined=slots.flatMap((s,i)=>s.role!=='race'&&s.sport==='brick'&&sport!=='swim'?[i]:[]);
    const total=totals[sport]*scale/recent.length;
    // If the loading block had no brick, split the discipline across the
    // scheduled slots. A transition run carries half the weight of a separate run.
    const brickWeight=sport==='run' ? .5 : 1;
    const share=bricks[sport]>0&&totals[sport]>0 ? bricks[sport]/totals[sport] :
      combined.length*brickWeight/(single.length+combined.length*brickWeight||1);
    const brick=!combined.length?0:single.length?total*share:total;
    for(const i of single)bySlot[i][sport]=(total-brick)/single.length;
    for(const i of combined)bySlot[i][sport]=brick/combined.length;
  }
  const distance=(session:ProposedV3Session,index:number)=>{
    if(session.role==='race'||session.sport==='strength')return 0;
    let difference=0;
    for(const part of session.components){
      if(!isSport(part.sport)||part.durationMinutes===null)return Infinity;
      difference+=Math.abs(part.durationMinutes-bySlot[index][part.sport]);
    }
    return difference;
  };
  return {reference,preferred:reference*scale,bySlot,distance};
}
