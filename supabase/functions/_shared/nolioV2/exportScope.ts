import type {PlanSessionInput} from './plannedMapper.ts';
export type NolioExportScope={kind:'all'}|{kind:'weeks';from:number;to:number}|{kind:'sessions';keys:string[]};
/** Selector only, never a client workout body or a replacement saved plan. */
export function selectExportScope<T extends Pick<PlanSessionInput,'sessionKey'|'isRest'>>(sessions:T[],input:unknown):{sessions:T[];problems:string[]} {
 if(input===undefined)return {sessions,problems:[]};
 const s=input as Record<string,unknown>|null;
 const bad=()=>({sessions:[],problems:['export_scope_invalid']});
 if(!s||typeof s!=='object'||Array.isArray(s))return bad();
 if(s.kind==='all'&&Object.keys(s).length===1)return {sessions,problems:[]};
 if(s.kind==='weeks'&&Object.keys(s).sort().join(',')==='from,kind,to'&&Number.isSafeInteger(s.from)&&Number.isSafeInteger(s.to)&&(s.from as number)>0&&(s.to as number)>=Number(s.from)&&(s.to as number)<=104){
  const selected=sessions.filter(row=>{const week=Number(/^S(\d+)-/.exec(row.sessionKey)?.[1]);return week>=Number(s.from)&&week<=Number(s.to);});
  return selected.some(row=>!row.isRest)?{sessions:selected,problems:[]}:bad();
 }
 if(s.kind==='sessions'&&Object.keys(s).sort().join(',')==='keys,kind'&&Array.isArray(s.keys)&&s.keys.length>0&&s.keys.length<=5000&&s.keys.every(k=>typeof k==='string'&&/^S\d+-J[0-6]-\d+$/.test(k))&&new Set(s.keys).size===s.keys.length){
  const keys=new Set(s.keys as string[]),selected=sessions.filter(row=>keys.has(row.sessionKey));
  return selected.length===keys.size&&selected.every(row=>!row.isRest)?{sessions:selected,problems:[]}:bad();
 }
 return bad();
}
