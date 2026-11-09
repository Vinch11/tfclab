import {checkSessionCatalogue, type CatalogueContract} from './sessionCatalogueContract.ts';
import {planningFeasibility, type MechanicalQuota, type MechanicalLayout} from './planningFeasibility.ts';
import {catalogueWeeklyUsageCapacity} from './catalogueWeeklyFrequency.ts';
export interface FixedSession {day:string;sport:string;title:string;details:string;durationMin:number;zones:string[];custom:boolean;catalogId:string|null;isKeySession:boolean;variantKey?:string;}
export interface FixedWeek {weekNumber:number;phase:string;theme:string;sessions:FixedSession[];}
export interface FixedChunk {title?:string;phases?:Array<{name:string;weeks:string;objective?:string}>;weeks:FixedWeek[];}
export interface FixedQuota {quota:MechanicalQuota;layout?:MechanicalLayout;phase?:string;weekType?:string;volumeBudget?:{maxMinutes:number;globalWeek:number;weeklyIncreasePctMax:number};}
/** Independent of provider enforcement. Validation precedes every paid request. */
export function validateFixedPlan(chunks:FixedChunk[],contracts:Record<number,CatalogueContract>,quotas:Record<number,FixedQuota>,expected:number):string[] {
 const issues:string[]=[];
 const weeks=chunks.flatMap(c=>c.weeks);
 if(!Number.isInteger(expected)||expected<=0||weeks.length!==expected||weeks.some((w,i)=>w.weekNumber!==i+1)) issues.push('controlled_week_coverage');
 let previousLoad:{minutes:number;globalWeek:number}|undefined;
 for(const week of weeks) {
  const contract=contracts[week.weekNumber],entry=quotas[week.weekNumber];
  const fail=(code:string)=>issues.push(`S${week.weekNumber}:${code}`);
  if(!contract||!entry?.layout||!entry.volumeBudget||contract.phase!==week.phase) {fail('controlled_contract_missing');continue;}
  for(const reason of planningFeasibility(entry.quota,entry.layout)) fail(reason);
  if(entry.layout.days.length!==7||new Set(entry.layout.days.map(d=>d.dayName)).size!==7) fail('controlled_layout_days');
  const weeklyUsage=new Map<string,number>();
  for(const day of entry.layout.days) {
   const actual=week.sessions.filter(s=>s.day===day.dayName&&s.sport!=='rest');
   if(actual.length!==day.slots.length) fail('controlled_layout_count');
   day.slots.forEach((slot,index)=>{
    const session=actual[index];
    if(!session||slot.isRaceEvent||session.sport!==slot.sport||session.isKeySession!==!!slot.isKeySession) {fail('controlled_layout_identity');return;}
    if(session.durationMin<(slot.minDurationMin??0)||session.durationMin>(slot.maxDurationMin??Infinity)) fail('controlled_slot_duration');
   });
   if(day.isRest&&actual.length) fail('controlled_rest');
  }
  for(const session of week.sessions) {
   if(!entry.layout.days.some(d=>d.dayName===session.day)) fail('controlled_unknown_day');
   if(session.sport==='rest') {if(session.durationMin!==0||session.catalogId!==null||session.custom!==true) fail('controlled_rest_identity');continue;}
   if(session.custom||!session.catalogId) {fail('controlled_custom_forbidden');continue;}
   const metadata=contract.catalog.find(m=>m.id===session.catalogId);
   if(!metadata) {fail('controlled_catalog_missing');continue;}
   // Exact source identity/protocol: no title or details rewrite to make an ID fit.
   if(session.title!==metadata.title||session.details!==metadata.structure||JSON.stringify(session.zones)!==JSON.stringify(metadata.zones)) fail('controlled_protocol_changed');
   const check=checkSessionCatalogue(session,contract);
   check.errors.forEach(fail);check.unknown.forEach(fail);
   weeklyUsage.set(metadata.id,(weeklyUsage.get(metadata.id)??0)+1);
   if((weeklyUsage.get(metadata.id)??0)>catalogueWeeklyUsageCapacity(metadata)) fail('controlled_weekly_frequency');
  }
  const total=week.sessions.reduce((sum,s)=>sum+s.durationMin,0);
  const budget=entry.volumeBudget;
  if(!Number.isFinite(total)||total>budget.maxMinutes) fail('controlled_volume_budget');
  if(previousLoad&&budget.globalWeek>previousLoad.globalWeek) {
   const limit=previousLoad.minutes*(entry.weekType==='recovery'?0.7:1+budget.weeklyIncreasePctMax);
   if(total>limit+1e-6) fail('controlled_load_progression');
  }
  if(entry.weekType==='load') previousLoad={minutes:total,globalWeek:budget.globalWeek};
 }
 return [...new Set(issues)];
}
export const EXPLANATION_RESPONSE_FORMAT={type:'json_schema',json_schema:{name:'tfcl_plan_explanations',strict:true,schema:{type:'object',properties:{weeks:{type:'array',items:{type:'object',properties:{weekNumber:{type:'integer'},explanation:{type:'string'}},required:['weekNumber','explanation'],additionalProperties:false}}},required:['weeks'],additionalProperties:false}}};
/** Never hydrate prescription fields from a provider response. */
export function attachFixedExplanations(chunk:FixedChunk,response:unknown):FixedChunk & {weeks:Array<FixedWeek & {weeklyNotes:string}>} {
 if(!response||typeof response!=='object'||Array.isArray(response)) throw Error('CONTROLLED_EXPLANATION_INVALID');
 const root=response as Record<string,unknown>;
 if(Object.keys(root).some(k=>k!=='weeks')||!Array.isArray(root.weeks)||root.weeks.length!==chunk.weeks.length) throw Error('CONTROLLED_EXPLANATION_COVERAGE');
 const notes=new Map<number,string>();
 for(const raw of root.weeks) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw)) throw Error('CONTROLLED_EXPLANATION_INVALID');
  const row=raw as Record<string,unknown>;
  if(Object.keys(row).some(k=>!['weekNumber','explanation'].includes(k))) throw Error('CONTROLLED_EXPLANATION_FIELD_FORBIDDEN');
  if(typeof row.weekNumber!=='number'||!chunk.weeks.some(w=>w.weekNumber===row.weekNumber)||notes.has(row.weekNumber)||typeof row.explanation!=='string'||row.explanation.length>6000) throw Error('CONTROLLED_EXPLANATION_REFERENCE');
  notes.set(row.weekNumber,row.explanation);
 }
 return {...chunk,weeks:chunk.weeks.map(w=>({...w,sessions:w.sessions.map(s=>({...s,zones:[...s.zones]})),weeklyNotes:notes.get(w.weekNumber)??''}))};
}