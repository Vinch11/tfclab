import {describe,it,expect,vi} from 'vitest';
import {inputFor} from '../../../../scripts/quality/det/form-fixture';
import {generateDetPlanFromPageInput} from '@/lib/plan/detEngineRun';
import {archiveIdentity,isDetArchive,prepareDetScope} from '../../../../supabase/functions/det-nolio-export/contract';
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
describe('envoi DET depuis une version sauvegardée',()=>{
  it('garde les mêmes opérations à travers les trois portées et les clics répétés',async()=>{
    const raw=await generateDetPlanFromPageInput(inputFor({objective:'10K',weeks:8,hours:6,sessions:4},'trained','finisher'));
    if(!isDetArchive(raw))throw Error('Une proposition DET ordinaire doit être archivable.');
    const refs={synthetic:false,athleteId:'usr_PILOTE',sportIds:{run:'spt_RUN',bike:'spt_BIKE',strength:'spt_STRENGTH'},exerciseIds:{},competition:null};
    const id=await archiveIdentity('COACH_A',raw);
    expect(await archiveIdentity('COACH_A',{...raw,_provenance:{...raw._provenance,generatedAt:'2026-12-01T06:00:00Z'}})).toBe(id);
    expect(await archiveIdentity('COACH_B',raw)).not.toBe(id);
    expect(isDetArchive({...raw,_provenance:{...raw._provenance,syntheticFixture:true}})).toBe(false);
    const all=await prepareDetScope(raw,refs,id,{kind:'all'}),week=await prepareDetScope(raw,refs,id,{kind:'weeks',from:1,to:1});
    expect(all.complete&&week.complete,JSON.stringify([all.prepared.problems,...new Set(all.prepared.rows.filter(r=>r.reason && r.status==='refused').map(r=>r.reason))])).toBe(true);
    expect(week.prepared.ops.length).toBeGreaterThan(0);
    const noBike=await prepareDetScope(raw,{...refs,sportIds:{run:'spt_RUN',strength:'spt_STRENGTH'}},id,{kind:'all'});
    expect(noBike.complete).toBe(false);
    expect(noBike.prepared.rows.some(r=>r.reason==='sport_reference_missing:bike')).toBe(true);
    const key=week.prepared.ops[0].sessionKey;
    const session=await prepareDetScope(raw,refs,id,{kind:'sessions',keys:[key]});
    expect(session.complete).toBe(true);
    expect(session.prepared.ops).toEqual(week.prepared.ops.filter(x=>x.sessionKey===key));
    expect(session.prepared.ops).toEqual(all.prepared.ops.filter(x=>x.sessionKey===key));
    expect((await prepareDetScope(raw,refs,id,{kind:'sessions',keys:['S99-J0-0']})).complete).toBe(false);
  });
});
