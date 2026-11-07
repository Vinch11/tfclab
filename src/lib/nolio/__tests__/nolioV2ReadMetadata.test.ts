import {describe,it,expect,vi} from 'vitest';
import {exactRemoteMatch,remoteMismatchFields,reconcileExact} from '../../../../supabase/functions/_shared/nolioV2/plannedClient';
import type {V2Operation} from '../../../../supabase/functions/_shared/nolioV2/plannedMapper';
const sent={name:'Endurance',sport:'spt_SYNTH',date_start:'2026-11-10',athletes:['usr_SYNTH'],description:'Prescription\n\n[marker]',duration:{value:30,unit:'min'},workout:[{kind:'step',duration:{value:30,unit:'min'},targets:[{type:'rpe',rpe:3}]}]};
// Official current read shape: single activity, normalized units, node IDs,
// aggregate totals returned alongside the per-activity prescription.
const read=()=>({...sent,id:'ptrn_SYNTH',parts:[],duration:{value:1800,unit:'s'},total_duration:{value:1800,unit:'s'},total_distance:null,workout:[{...sent.workout[0],id:'node_SYNTH',duration:{value:1800,unit:'s'}}]});
describe('current Nolio read-only multipart metadata',()=>{
 it('accepts an intact single activity with documented aggregate metadata',()=>{expect(exactRemoteMatch(read(),sent)).toBe(true);expect(remoteMismatchFields(read(),sent)).toEqual([]);});
 it('never discards a non-empty provider multipart list',()=>{const r={...read(),parts:['ptrn_SYNTH','ptrn_SECOND']};expect(exactRemoteMatch(r,sent)).toBe(false);expect(remoteMismatchFields(r,sent)).toContain('parts');});
 it.each(['duration','workout','date_start','athletes','description'] as const)('still rejects changed %s with equal aggregate totals',(field)=>{const r:Record<string,unknown>=read();r[field]=field==='duration'?{value:1801,unit:'s'}:field==='workout'?[{...sent.workout[0],targets:[{type:'rpe',rpe:8}]}]:field==='date_start'?'2026-11-11':field==='athletes'?['usr_OTHER']:'Changed';expect(exactRemoteMatch(r,sent)).toBe(false);});
 it('requires the documented single-part shape before discarding aggregates',()=>{const r:Record<string,unknown>=read();delete r.parts;expect(exactRemoteMatch(r,sent)).toBe(false);});
 it('does not ignore future undocumented metadata',()=>{expect(exactRemoteMatch({...read(),future_field:true},sent)).toBe(false);});
 it('reconciles one exact complete provider read without ever creating an activity',async()=>{const post=vi.fn();const http={post,listPage:async()=>({ok:true as const,items:[read()],hasMore:false}),getDetail:async()=>({ok:true as const,item:read()})};const op:V2Operation={kind:'training',sessionKey:'S1-J1-1',path:'/api/v2/planned/trainings/',sourceId:'SYNTH',precisionNotes:[],body:sent};expect(await reconcileExact(http,op,'usr_SYNTH',sent,'[marker]')).toEqual({kind:'exact',id:'ptrn_SYNTH'});expect(post).not.toHaveBeenCalled();});
});
