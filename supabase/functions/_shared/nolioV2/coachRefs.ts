import type {NolioV2Refs} from './plannedMapper.ts';
/** Only an exact unique official Triathlon sport on the selected provider
 * athlete may supply the competition mapping. No guessed ID or fuzzy match. */
export function withCoachCompetitionSport(refs:NolioV2Refs,remote:unknown,loadedAt:unknown,now:number):NolioV2Refs{
 if(refs.sportIds.brick)return refs;
 const r=remote as {athleteRef?:unknown;sports?:Array<{sport?:unknown;name?:unknown;isActive?:unknown}>}|null;
 const time=typeof loadedAt==='string'?Date.parse(loadedAt):NaN;
 if(!r||r.athleteRef!==refs.athleteId||!Array.isArray(r.sports)||!Number.isFinite(time)||time>now+60000||now-time>3600000)return refs;
 const ids=[...new Set(r.sports.filter(s=>s.isActive===true&&typeof s.name==='string'&&s.name.trim().toLowerCase()==='triathlon'&&typeof s.sport==='string'&&/^spt_[A-Za-z0-9]+$/.test(s.sport)).map(s=>s.sport as string))];
 return ids.length===1?{...refs,sportIds:{...refs.sportIds,brick:ids[0]}}:refs;
}
type Store={from:(table:string)=>{select:(columns:string)=>{eq:(key:string,value:string)=>{eq:(key:string,value:string)=>{maybeSingle:()=>PromiseLike<{data:{remote_refs:unknown;remote_refs_loaded_at:unknown}|null;error:unknown}>}}}}};
export async function coachRefsForPlan(store:Store,ctx:{coachId:string;athleteId:string;plan:unknown;refs:NolioV2Refs;now:number}){
 const p=ctx.plan as {_provenance?:{engine?:string;mode?:string;syntheticFixture?:boolean}}|null;
 if(p?._provenance?.engine!=='det'||p._provenance.mode!=='app-profile'||p._provenance.syntheticFixture!==false||ctx.refs.sportIds.brick)return ctx.refs;
 const r=await store.from('nolio_v2_oauth_grants').select('remote_refs,remote_refs_loaded_at').eq('coach_id',ctx.coachId).eq('athlete_id',ctx.athleteId).maybeSingle();
 return !r.error&&r.data?withCoachCompetitionSport(ctx.refs,r.data.remote_refs,r.data.remote_refs_loaded_at,ctx.now):ctx.refs;
}
