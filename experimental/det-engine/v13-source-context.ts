import type{V10Profile}from'./v10-profiles';import type{RepairWorkoutMetadata}from'../../supabase/functions/_shared/repairSportingEquivalence';import{sourceDayContext,sourceWeekContext}from'./v11-source-context';
/** Additional literal restrictions, never a physiological taper/recovery doctrine. */
export function sourceContext(card:RepairWorkoutMetadata,p:V10Profile,week:number,day:number,weekType:string){
 const a=sourceDayContext(card,p,week,day),b=sourceWeekContext(card,weekType),reasons=[...a.reasons,...b.reasons];
 const text=card.when.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),avoid=card.avoid.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(weekType==='taper'&&/\btaper|affut/.test(avoid))reasons.push('source_explicitly_avoids_taper');
 const m=text.match(/j\s*[-−]\s*(\d+)\s*(?:a|à|[-–])\s*j\s*[-−]\s*(\d+)/);
 let relativeRange:number[]|null=null,matchedKnownDate:boolean|null=null;
 if(m){relativeRange=[Math.min(+m[1],+m[2]),Math.max(+m[1],+m[2])];const start=p.config.planStartDate?Date.parse(p.config.planStartDate+'T00:00:00Z'):NaN,session=start+((week-1)*7+day)*86400000;const dates=(p.config.raceGoals??[]).flatMap(g=>g.raceDate?[Date.parse(g.raceDate+'T00:00:00Z')]:[]);matchedKnownDate=Number.isFinite(session)&&dates.some(date=>Number.isFinite(date)&&(date-session)/86400000>=relativeRange![0]&&(date-session)/86400000<=relativeRange![1]);if(!matchedKnownDate)reasons.push('explicit_source_race_window_not_met_or_unknown');}
 return{compatible:!reasons.length,reasons,relativeRange,matchedKnownDate,scope:'literal source offsets/week-type exclusions in experimental layer; no new intensity threshold'};
}
