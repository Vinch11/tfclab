import {beforeEach,describe,it,expect,vi} from 'vitest';
import {readExportResume,writeExportResume,pendingRecreation,readOwnedExportArchive} from '../exportResume';
const athleteId='11111111-1111-4111-8111-111111111111',versionId='22222222-2222-4222-8222-222222222222',hash='a'.repeat(64);
const decision={planSha256:hash,refsSha256:'b'.repeat(64),opsSha256:'c'.repeat(64),rows:[{opIndex:0,sessionKey:'S1-J1-0',date:'2026-11-10',title:'Test',binding:'d'.repeat(64)}]};
beforeEach(()=>{sessionStorage.clear();window.history.replaceState({},'', '/ai-plan?other=kept');});
describe('export return context, never delivery authority',()=>{
 it('reads the exact owned archive with its original date, never a guessed latest plan',async()=>{
  const resume={athleteId,versionId,scope:{kind:'all'} as const};
  const plan={title:'Original',phases:[],weeks:[],_planStartDate:'2026-11-09'};
  const ports={user:vi.fn(async()=> 'coach'),read:vi.fn(async()=>({id:versionId,coach_id:'coach',athlete_id:athleteId,plan_json:plan}))};
  expect(await readOwnedExportArchive(resume,'coach',ports)).toEqual({id:versionId,plan_json:plan,startDate:'2026-11-09'});
  ports.read.mockResolvedValue({...await ports.read(),coach_id:'other'});
  expect(await readOwnedExportArchive(resume,'coach',ports)).toBeNull();
 });
 it('refuses an identity change during the read and an archive without an original date',async()=>{
  const resume={athleteId,versionId,scope:{kind:'all'} as const};
  const row={id:versionId,coach_id:'coach',athlete_id:athleteId,plan_json:{title:'Original',phases:[],weeks:[]}};
  const user=vi.fn().mockResolvedValueOnce('coach').mockResolvedValueOnce('other');
  expect(await readOwnedExportArchive(resume,'coach',{user,read:async()=>row})).toBeNull();
  expect(await readOwnedExportArchive(resume,'coach',{user:async()=> 'coach',read:async()=>row})).toBeNull();
 });
 it('recovers exact version, athlete and scope after a reload without copying plan content',()=>{
  const context={athleteId,versionId,scope:{kind:'weeks',from:2,to:3} as const};
  writeExportResume(context);expect(readExportResume(window.location.search)).toEqual(context);
  expect(new URLSearchParams(window.location.search).get('other')).toBe('kept');
  writeExportResume(null);expect(readExportResume(window.location.search)).toBeNull();
 });
 it('rejects malformed selectors and never silently widens selection',()=>{
  for(const scope of [null,{kind:'weeks',from:3,to:2},{kind:'sessions',keys:[]},{kind:'all',consent:true},{kind:'sessions',keys:['S1-J1-0','S1-J1-0']}]){
   expect(readExportResume(new URLSearchParams({nolioAthlete:athleteId,nolioVersion:versionId,nolioScope:JSON.stringify(scope)}).toString())).toBeNull();
  }
 });
 it('keeps an unanswered question bound to the same coach, immutable version and exact hash',()=>{
  pendingRecreation('coach-a',versionId,hash,decision);
  expect(pendingRecreation('coach-a',versionId,hash)).toEqual(decision);
  expect(pendingRecreation('coach-b',versionId,hash)).toBeNull();
  expect(pendingRecreation('coach-a',athleteId,hash)).toBeNull();
  expect(pendingRecreation('coach-a',versionId,'e'.repeat(64))).toBeNull();
  pendingRecreation('coach-a',versionId,hash,null);expect(pendingRecreation('coach-a',versionId,hash)).toBeNull();
 });
 it('fails safely when storage is unavailable',()=>{
  const spy=vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw Error('unavailable');});
  expect(pendingRecreation('coach',versionId,hash)).toBeNull();spy.mockRestore();
 });
});
