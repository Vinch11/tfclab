/** Whole-plan observations and contract checks. No universal injury-risk threshold. */
import type{ParsedPlan}from'@/lib/aiPlanParser';import{isRaceDaySession}from'../../supabase/functions/_shared/raceDayIdentity';
import{brickDisciplineEvidence}from'./v3-ironman-review';
export interface ExposureDose {week:number;session:number;dPlusM:number|null;dMinusM:number|null;eccentric:boolean;runWalk:boolean;
 components?:{bike:number;run:number;source:string};source:string;}
export function auditGlobalProgression(plan:ParsedPlan,ledger:ExposureDose[]=[],requiredSports:string[]=[]){
 const issues:Array<{code:string;week:number;classification:'contract'|'methodological'|'unknown';severity:'error'|'warning';evidence:unknown}>=[];
 const add=(code:string,week:number,classification:'contract'|'methodological'|'unknown',evidence:unknown)=>issues.push({code,week,classification,severity:classification==='contract'?'error':'warning',evidence});
 const weeks=plan.weeks.map(w=>{
  const training=w.sessions.map((s,index)=>({s,index})).filter(({s})=>!s.isRest&&!isRaceDaySession(s));
  const doses=training.map(({index})=>ledger.find(d=>d.week===w.weekNumber&&d.session===index));
  const minutes=(sport:string)=>training.filter(({s})=>s.sport===sport).reduce((n,{s})=>n+(s.durationMin??0),0);
  const components=training.flatMap(({s,index})=>{
   const dose=ledger.find(d=>d.week===w.weekNumber&&d.session===index);
   if(dose?.components){if(Math.abs(dose.components.bike+dose.components.run-(s.durationMin??0))>1e-9)add('component_total_mismatch',w.weekNumber,'contract',{index,id:s.catalogId,dose});return[dose.components];}
   return[];
  });
  const brickUnknown=training.filter(({s,index})=>s.sport==='brick'&&!ledger.some(d=>d.week===w.weekNumber&&d.session===index&&d.components));
  const present=Object.fromEntries(requiredSports.map(sport=>[sport,training.some(({s})=>s.sport===sport)||training.some(({s})=>s.sport==='brick'&&s.catalogId&&brickDisciplineEvidence(s.catalogId)[sport as 'swim'|'bike'|'run'])]));
  for(const [sport,known]of Object.entries(present))if(!known)add('required_discipline_not_evidenced',w.weekNumber,'unknown',{sport,race:w.sessions.some(isRaceDaySession)});
  const declared=plan.weeklyQuotas?.[w.weekNumber];
  const total=training.reduce((n,{s})=>n+(s.durationMin??0),0);
  if(declared?.volumeBudget&&total>declared.volumeBudget.maxMinutes+1e-9)add('existing_weekly_volume_ceiling',w.weekNumber,'contract',{minutes:total,max:declared.volumeBudget.maxMinutes});
  const vertical=(key:'dPlusM'|'dMinusM')=>{const relevant=training.filter(({s})=>s.sport==='run');const values=relevant.map(({index})=>ledger.find(d=>d.week===w.weekNumber&&d.session===index)?.[key]);return{known:values.filter((v):v is number=>v!=null).reduce((n,v)=>n+v,0),unknownSessions:values.filter(v=>v==null).length};};
  for(const d of doses.filter(Boolean))for(const value of[d!.dPlusM,d!.dMinusM,d!.components?.bike,d!.components?.run])if(value!=null&&(!Number.isFinite(value)||value<0))add('invalid_exposure_dose',w.weekNumber,'contract',d);
  return{week:w.weekNumber,phase:w.phase,type:declared?.weekType??'unknown',race:w.sessions.some(isRaceDaySession),total,
   swim:minutes('swim'),bike:minutes('bike')+components.reduce((n,d)=>n+d.bike,0),run:minutes('run')+components.reduce((n,d)=>n+d.run,0),brickUnknownMinutes:brickUnknown.reduce((n,{s})=>n+(s.durationMin??0),0),
   longestRun:Math.max(0,...training.filter(({s})=>s.sport==='run').map(({s})=>s.durationMin??0)),dPlus:vertical('dPlusM'),dMinus:vertical('dMinusM'),
   eccentricSessions:doses.filter(d=>d?.eccentric).length,runWalkSessions:doses.filter(d=>d?.runWalk).length,present};
 });
 if(new Set(weeks.map(w=>w.week)).size!==plan.totalWeeks||weeks.length!==plan.totalWeeks||weeks.some((w,i)=>w.week!==i+1))add('incomplete_global_timeline',0,'contract',weeks.map(w=>w.week));
 for(let i=1;i<weeks.length;i++){
  const previous=weeks[i-1],current=weeks[i];
  if(current.type==='recovery'&&!current.race&&current.total>=previous.total&&previous.type==='load')add('declared_recovery_not_lower',current.week,'methodological',{previous:previous.total,current:current.total});
 }
 const windows=[2,3,4].flatMap(size=>weeks.filter((_,i)=>i>=size-1).map((w,i)=>{const slice=weeks.slice(i,i+size);return{from:slice[0].week,to:w.week,size,
  minutes:Object.fromEntries(['total','swim','bike','run','brickUnknownMinutes'].map(key=>[key,slice.reduce((n,w)=>n+w[key as 'total'],0)])),
  dPlusKnown:slice.reduce((n,w)=>n+w.dPlus.known,0),dMinusKnown:slice.reduce((n,w)=>n+w.dMinus.known,0),unknownVerticalSessions:slice.reduce((n,w)=>n+w.dPlus.unknownSessions+w.dMinus.unknownSessions,0)};}));
 return{version:'det-v4-global-progression-1',weeks,windows,issues,contractPassed:!issues.some(i=>i.severity==='error'),
  coverage:{calendar:'executed',weeklyVolume:'conditional_on_existing_budget',brickDose:'explicit_components_only',vertical:'known_doses_only_unknowns_counted',physiologicalAdaptation:'not_attested',muscleTolerance:'not_inferred_from_scheduled_exposures'},humanReviewRequired:true};
}
/** Strict relative acceptance for a reduction-only correction; increasing a prior week is never a fix. */
export function compareGlobalCorrection(before:ParsedPlan,after:ParsedPlan,beforeLedger:ExposureDose[]=[],afterLedger:ExposureDose[]=[]){
 const a=auditGlobalProgression(before,beforeLedger),b=auditGlobalProgression(after,afterLedger);
 const increases=b.windows.flatMap(w=>{const prior=a.windows.find(p=>p.from===w.from&&p.to===w.to);return Object.entries(w.minutes).filter(([key,value])=>value>(prior?.minutes[key]??0)+1e-9).map(([discipline,value])=>({from:w.from,to:w.to,discipline,before:prior?.minutes[discipline]??null,after:value}));});
 const firstWeekIncrease=(b.weeks[0]?.total??0)>(a.weeks[0]?.total??0);
 return{accepted:b.contractPassed&&!increases.length&&!firstWeekIncrease,increases,firstWeekIncrease,before:a,after:b,policy:'relative_reduction_only_not_a_universal_physiological_limit'};
}
