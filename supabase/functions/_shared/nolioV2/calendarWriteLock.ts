import type {RpcClient} from './ledgerSupabase.ts';
/** Independent of the per-version operation key: serialize writes to one
 * provider calendar, including different TFCLab athlete records/versions. */
export async function withCalendarWriteLock<T>(a:{client:RpcClient;coachId:string;athleteRef:string;planVersionId:string;run:()=>Promise<T>}):Promise<T>{
 const requestId=crypto.randomUUID();
 const args={p_coach_id:a.coachId,p_athlete_ref:a.athleteRef,p_plan_version_id:a.planVersionId,p_request_id:requestId};
 const begin=await a.client.rpc('nolio_v2_begin_calendar_write',args);
 if(begin.error||begin.data!==true)throw Error('calendar_write_busy_or_unavailable');
 try{return await a.run();}
 finally{
  // A failed release keeps the short lease; it never grants a second writer.
  try{await a.client.rpc('nolio_v2_end_calendar_write',args);}catch{/* bounded lease stays held */}
 }
}
