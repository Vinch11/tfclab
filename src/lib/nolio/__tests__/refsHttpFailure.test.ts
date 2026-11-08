import {describe,it,expect} from 'vitest';
import {fetchRemoteRefs} from '../../../../supabase/functions/_shared/nolioV2/refs';
describe('sanitized official sports read failures',()=>{
 it.each([[429,'rate_limited'],[401,'authorization'],[403,'authorization'],[503,'provider_error'],[404,'unknown']] as const)('preserves HTTP %s failure without retry or partial success',async(status,reason)=>{
  let calls=0;
  const result=await fetchRemoteRefs({fetch:async()=>{calls++;return {status,text:async()=> 'PRIVATE BODY'};},accessToken:'PRIVATE TOKEN',athleteRef:'usr_TEST',scopes:['planned:read']});
  expect(result).toEqual({ok:false,reason:`sports_read_${reason}`});expect(calls).toBe(1);expect(JSON.stringify(result)).not.toContain('PRIVATE');
 });
});
