import {describe,it,expect} from 'vitest';
import {verifyPrimaryRunningSession,auditPrimaryRunningCoverage,type PrimarySourceEvidence} from './v408-primary-limiter-evidence';
import type {ParsedSession} from '@/lib/aiPlanParser';
const s={sport:'run',isKeySession:true,isRest:false,catalogId:'V3P_RUN_167',durationMin:40,title:'Titre arbitraire',weekNumber:1} as ParsedSession;
const dose={sourceIds:['V3P_RUN_167'],durationMin:40,low:26,mid:0,high:8,unknown:6,provenance:'v3_individually_configured_blocks_only' as const};
const p:PrimarySourceEvidence={dose:()=>dose,limiterKeys:()=>['aerobic_ceiling','severe_domain_tolerance'],primaryDomain:()=>'vo2max'};
describe('V408 exact primary limiter evidence',()=>{
 it.each(['vo2max','vma_velocity'] as const)('%s preserves its own key',key=>{
  const proof=verifyPrimaryRunningSession(s,key,p);expect(proof.verified).toBe(true);
  expect(proof.scientificAttestation).toBe(false);
  expect(verifyPrimaryRunningSession({...s,title:'Pas de VO2, ni VMA'},key,p).verified).toBe(true);
 });
 it.each([
  {name:'wrong source',dose:()=>({...dose,sourceIds:['V3P_RUN_169']})},
  {name:'wrong duration',dose:()=>({...dose,durationMin:41})},
  {name:'not enough exact work',dose:()=>({...dose,high:7,low:27})},
  {name:'missing domain',primaryDomain:()=>null},
  {name:'missing source intent',limiterKeys:()=>['aerobic_capacity']},
 ])('$name cannot earn coverage',mutation=>expect(verifyPrimaryRunningSession(s,'vo2max',{...p,...mutation}).verified).toBe(false));
 it('all original key flags remain in denominator, including other sports',()=>{
  const keys=[s,...Array.from({length:3},()=>({...s,sport:'bike'} as ParsedSession))];
  const out=auditPrimaryRunningCoverage({weeks:[{sessions:keys} as never]},'vo2max',p);
  expect(out.allKeySessions).toBe(4);expect(out.percentage).toBe(25);expect(out.verified).toBe(false);
 });
 it('generic easy time is not enough to claim a VLamax-targeted source',()=>{
  expect(verifyPrimaryRunningSession(s,'vlamax_reduction',{...p,dose:()=>({...dose,low:40,high:0,unknown:0}),primaryDomain:()=>'moderate_lt1'}).verified).toBe(false);
 });
 it('VLamax reduction preserves its distinct co-contribution basis',()=>{
  const proof=verifyPrimaryRunningSession(s,'vlamax_reduction',{dose:()=>({...dose,low:40,high:0,unknown:0}),primaryDomain:()=>'moderate_lt1',limiterKeys:()=>['aerobic_capacity']});
  expect(proof).toMatchObject({verified:true,basis:'long_aerobic_low_40min',scientificAttestation:false});
 });
});
