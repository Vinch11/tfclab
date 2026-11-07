import type {NolioV2Http} from './plannedClient.ts';
import type {V2Operation} from './plannedMapper.ts';
import {originMarker} from './marker.ts';
import {ID_PREFIX} from './httpFetch.ts';

export type CalendarConflict = {status:'clear'|'conflict'|'unknown'; count:number; reason:string};
const unknown=(reason:string):CalendarConflict=>({status:'unknown',count:0,reason});
const MARKER=/\[TFCLab-QA [a-f0-9]{24}\]/g;
/** Read-only, bounded scan. Titles/targets can change between regenerated plans.
 * A foreign marker or a known old remote ID on the same sport/day is a conflict,
 * never an instruction to adopt, delete or overwrite that provider activity. */
export async function checkCalendarConflict(a:{
 http:Pick<NolioV2Http,'listPage'|'getDetail'>; athleteRef:string;
 op:V2Operation; currentMarkers:Set<string>; priorRemoteIds:Set<string>;
 deadline:number; now?:()=>number;
}):Promise<CalendarConflict>{
 const now=a.now??Date.now, date=a.op.body.date_start,sport=a.op.body.sport;
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||typeof sport!=='string')return unknown('calendar_operation_invalid');
 const seen=new Set<string>();let after:string|null=null,conflicts=0;
 try{
  for(let page=0;page<50;page++){
   if(now()>=a.deadline)return unknown('calendar_read_timeout');
   const r=await a.http.listPage(a.op.path,a.athleteRef,date,after);
   if(!r.ok)return unknown('calendar_read_failed');
   if(r.hasMore&&!r.items.length)return unknown('calendar_pagination_invalid');
   for(const item of r.items){
    const id=item.id;
    if(typeof id!=='string'||!ID_PREFIX[a.op.path]?.test(id)||seen.has(id))return unknown('calendar_pagination_invalid');
    seen.add(id);
    if(seen.size>500)return unknown('calendar_read_limit');
    if(now()>=a.deadline)return unknown('calendar_read_timeout');
    // List projections can omit description/sport. Only the detail is evidence.
    const d=await a.http.getDetail(a.op.path,id,a.athleteRef);
    if(!d.ok||d.item.id!==id)return unknown('calendar_detail_failed');
    if(typeof d.item.date_start!=='string'||typeof d.item.sport!=='string')return unknown('calendar_detail_invalid');
    if(d.item.date_start!==date)return unknown('calendar_day_divergent');
    if(d.item.sport!==sport)continue;
    if(d.item.description!=null&&typeof d.item.description!=='string')return unknown('calendar_detail_invalid');
    const markers=(typeof d.item.description==='string'?d.item.description:'').match(MARKER)??[];
    if(a.priorRemoteIds.has(id)||markers.some(m=>!a.currentMarkers.has(m)))conflicts++;
   }
   if(now()>=a.deadline)return unknown('calendar_read_timeout');
   if(!r.hasMore)return {status:conflicts?'conflict':'clear',count:conflicts,reason:conflicts?'previous_version_calendar_conflict':'calendar_clear'};
   const last=r.items.at(-1)?.id;
   if(typeof last!=='string'||last===after)return unknown('calendar_pagination_invalid');
   after=last;
  }
 }catch{return unknown('calendar_read_failed');}
 return unknown('calendar_read_limit');
}

export async function markersForVersion(planVersionId:string,ops:V2Operation[]):Promise<Set<string>>{
 return new Set(await Promise.all(ops.map(op=>originMarker(planVersionId,op))));
}
