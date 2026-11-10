import type {V3PlanProposal} from './appPlanningV3Proposal';

export function reviewDate(start:string,week:number) {
  const date=new Date(start+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()+week*7-1);
  return new Intl.DateTimeFormat('fr-BE',{timeZone:'UTC',dateStyle:'short'}).format(date);
}

/** Describe actual work and omissions within each series of loading weeks and its recovery. */
export function addLimiterBlockReview(plan:V3PlanProposal,start:string) {
  const ranks=plan.limiterOrder;
  if(!ranks.length)return;
  const covered=new Map<string,Set<number>>();
  for(const [i,metric] of ranks.entries()) covered.set(metric,new Set(plan.checks.filter(c=>c.code==='ranked_limiter_work'&&
    c.message.startsWith('Rang '+(i+1)+' · '+metric+' · ')&&c.week!==undefined).map(c=>c.week!)));
  for(const check of plan.checks) if(check.code==='ranked_limiter_deferred'&&check.week)
    check.message+=' Réévaluation le '+reviewDate(start,check.week)+'.';
  let first=1;
  for(const w of plan.weeks) {
    const next=plan.weeks[w.week];
    if(next && w.weekType!=='recovery' && next.weekType!=='taper' && next.weekType!=='race')continue;
    const weeks=plan.weeks.slice(first-1,w.week);
    if(weeks.some(v=>v.weekType==='load')) for(const [i,metric] of ranks.entries()){
      const hits=covered.get(metric)!;
      if(weeks.some(v=>hits.has(v.week)))continue;
      const nextWork=[...hits].find(n=>n>w.week);
      const focus=[...new Set(weeks.filter(v=>v.weekType==='load'&&v.focus).map(v=>v.focus))];
      const message='S'+first+'–S'+w.week+' · rang '+(i+1)+' · '+metric+
        ' : aucun bloc direct retenu sur cette période. '+
        (focus.length?'Priorités inscrites au calendrier : '+focus.join(', ')+'. ':'')+
        (nextWork?'Prochaine dose prescrite en S'+nextWork+'. ':'')+'Réexaminer ce choix le '+reviewDate(start,w.week)+'.';
      plan.checks.push({code:'ranked_block_review',week:w.week,status:'pending',message});
    }
    first=w.week+1;
  }
}
