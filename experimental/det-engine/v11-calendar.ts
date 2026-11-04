import type{V10Profile}from'./v10-profiles';import type{Offer}from'./v10-allocation';import{sourceDayContext}from'./v11-source-context';
export type PlacementModel='compact_reference'|'separated_exposures';
export function placeWeek(p:V10Profile,offers:Offer[],week:number,model:PlacementModel,nodeBudget=5000){
 const days=Array.from({length:7},(_,day)=>({day,offers:[]as Offer[]}));let nodes=0;
 const ordered=[...offers].sort((a,b)=>Number(b.role.kind==='long')-Number(a.role.kind==='long')||a.role.id.localeCompare(b.role.id));
 function visit(k:number):boolean{if(++nodes>nodeBudget)return false;if(k===ordered.length)return days.filter(d=>!d.offers.length).length>=p.minRest;const o=ordered[k];for(const day of [...p.availableDays].sort((a,b)=>days[a].offers.length-days[b].offers.length||a-b)){
 if(!Number.isInteger(day)||day<0||day>6||days[day].offers.length>=p.maxDaily||days[day].offers.some(x=>x.role.sport===o.role.sport)||!sourceDayContext(o.card,p,week,day).compatible)continue;
 if(days.some(d=>Math.abs(d.day-day)<=1&&d.offers.some(x=>x.role.kind==='long'&&o.role.kind==='long')))continue;
 if(model==='separated_exposures'&&['run','bike'].includes(o.role.sport)&&days.some(d=>Math.abs(d.day-day)<=1&&d.offers.some(x=>x.role.sport===o.role.sport)))continue;
 days[day].offers.push(o);if(visit(k+1))return true;days[day].offers.pop();}return false;}
 const complete=visit(0);return{complete,days,nodes,model,reason:complete?null:nodes>nodeBudget?'bounded_calendar_search_inconclusive':'availability_or_spacing_conflict'};
}
