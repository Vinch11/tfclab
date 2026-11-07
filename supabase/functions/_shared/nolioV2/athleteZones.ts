/** Read-only exploration of the documented ZoneWrapper response. No mapper,
 * operation key, source prescription, remote activity or receipt is changed. */
import type {FetchLike} from './httpFetch.ts';
import type {NolioV2Refs} from './plannedMapper.ts';
import {sessionsFromPlanJson} from './planSessions.ts';

export type AthleteZoneWrapper={name:string;stream:string;unit:string;sports:string[];active:boolean|null;zones:{name:string;order:number;min:string;max:string}[]};
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
// Reject control characters in provider labels before displaying the projection.
// eslint-disable-next-line no-control-regex
const controls=/[\u0000-\u001f\u007f]/u;
const text=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=120&&!controls.test(v);
const bound=(v:unknown):v is string=>typeof v==='string'&&v.length<=40&&!controls.test(v);
export function parseAthleteZoneWrappers(v:unknown):AthleteZoneWrapper[]|null{
 if(!Array.isArray(v)||v.length>100)return null;
 const out:AthleteZoneWrapper[]=[];
 for(const w of v){
  if(!obj(w)||!text(w.name)||!text(w.stream_type)||!text(w.unit)||!Array.isArray(w.sports)||w.sports.length>100||!w.sports.every(s=>typeof s==='string'&&/^spt_[A-Za-z0-9]+$/.test(s))||!Array.isArray(w.zones)||w.zones.length>50||(w.is_active!==undefined&&typeof w.is_active!=='boolean'))return null;
  const zones:AthleteZoneWrapper['zones']=[];
  for(const z of w.zones){
   if(!obj(z)||!text(z.name)||!Number.isSafeInteger(z.order)||Number(z.order)<0||!bound(z.min)||!bound(z.max))return null;
   zones.push({name:z.name,order:Number(z.order),min:z.min,max:z.max});
  }
  out.push({name:w.name,stream:w.stream_type,unit:w.unit,sports:[...w.sports] as string[],active:typeof w.is_active==='boolean'?w.is_active:null,zones});
 }
 return out;
}

export async function readAthleteZones(a:{fetch:FetchLike;accessToken:string;athleteRef:string;scopes:string[];budgetMs?:number}):Promise<{ok:true;wrappers:AthleteZoneWrapper[]}|{ok:false;reason:string}>{
 if(!/^usr_[A-Za-z0-9]+$/.test(a.athleteRef)||!a.accessToken)return {ok:false,reason:'zones_binding_invalid'};
 // This typed endpoint requires settings:read. No unscoped fallback to the
 // coach's zones or undocumented response shape is permitted.
 if(!a.scopes.includes('settings:read'))return {ok:false,reason:'zones_settings_read_scope_missing'};
 const ctl=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const work=async()=>{
   const r=await a.fetch('https://www.nolio.io/api/v2/settings/zones/wrappers/?'+new URLSearchParams({athlete:a.athleteRef}),{method:'GET',redirect:'error',signal:ctl.signal,headers:{Authorization:`Bearer ${a.accessToken}`,Accept:'application/json'}});
   if(r.status!==200)return {ok:false as const,reason:`zones_http_${r.status}`};
   const body=await r.text();if(body.length>512_000)return {ok:false as const,reason:'zones_response_too_large'};
   const wrappers=parseAthleteZoneWrappers(JSON.parse(body));
   return wrappers?{ok:true as const,wrappers}:{ok:false as const,reason:'zones_response_invalid'};
  };
  return await Promise.race([work(),new Promise<{ok:false;reason:string}>(resolve=>{timer=setTimeout(()=>{ctl.abort();resolve({ok:false,reason:'zones_read_timeout'});},Math.min(12000,Math.max(1,a.budgetMs??10000)));})]);
 }catch{return {ok:false,reason:'zones_read_failed'};}finally{if(timer)clearTimeout(timer);}
}
const numeric=(s:string)=>/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)&&Number.isFinite(Number(s))?Number(s):null;
export function powerZoneSummary(plan:unknown,refs:NolioV2Refs,wrappers:AthleteZoneWrapper[]):string{
 const lines=['Zones de puissance Nolio — lecture seule.'];
 const ceilings=new Map<string,{sport:string;max:number}>();
 const sessions=sessionsFromPlanJson(plan);
 if(sessions.problems.length)return 'Lecture des séances impossible ; aucune correspondance de zone confirmée.';
 for(const s of sessions.sessions){
  const works=s.detStructuredWorkout?[s.detStructuredWorkout]:s.detStructuredComponents?[s.detStructuredComponents.bike,s.detStructuredComponents.run]:[];
  for(const w of works){
   const walk=(nodes:typeof w.nodes)=>{for(const n of nodes){if(n.kind==='repeat')walk(n.steps);else if(n.target?.metric==='watts'&&(n.target.min===0||n.target.min===null)&&typeof n.target.max==='number'&&Number.isFinite(n.target.max)&&n.target.max>0)ceilings.set(`${w.sport}|${n.target.max}`,{sport:w.sport,max:n.target.max});}};
   walk(w.nodes);
  }
 }
 let count=0;
 for(const [sport,id] of Object.entries(refs.sportIds)){
  for(const w of wrappers.filter(w=>w.stream==='watts'&&w.unit==='W'&&w.sports.includes(id))){
   for(const z of w.zones){lines.push(`${sport} · ${z.name} : ${z.min}–${z.max} W${w.active===false?' (inactive)':w.active===null?' (activation non précisée)':''}`);count++;}
  }
 }
 if(!count)lines.push('Aucune zone de puissance en watts explicitement associée aux sports du plan.');
 for(const c of ceilings.values()){
  const ws=wrappers.filter(w=>w.stream==='watts'&&w.unit==='W'&&w.active===true&&w.sports.includes(refs.sportIds[c.sport]??''));
  const matches=ws.flatMap(w=>w.zones).filter(z=>numeric(z.min)===0&&numeric(z.max)===c.max);
  const unique=matches.length===1&&ws.flatMap(w=>w.zones).filter(z=>z.name===matches[0].name).length===1;
  lines.push(`Plafond prévu ${c.sport} ≤ ${c.max} W : ${unique?`bornes identiques à « ${matches[0].name} »` :matches.length?'association ambiguë':'aucune correspondance exacte confirmée'}.`);
 }
 lines.push('Ces correspondances sont une analyse des bornes, pas une activation de l’export par zones. Aucune séance modifiée ou envoyée.');
 const result=lines.join('\n');
 return result.length<=14000?result:result.slice(0,13700)+'\nListe tronquée ; aucune activation de l’export par zones. Aucune séance modifiée ou envoyée.';
}
