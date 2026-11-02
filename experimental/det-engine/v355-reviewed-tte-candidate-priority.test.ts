import {describe,expect,it} from 'vitest';
import type {ParsedSession} from '@/lib/aiPlanParser';
import type {StructuredZoneDose} from './v310-structured-zone-dose';
import {isVerifiedTtePriorityCandidate} from './v355-reviewed-tte-candidate-priority';
const id='V3P_RUN_137';
const dose:StructuredZoneDose={
  low:18,mid:0,high:32,unknown:9,durationMin:59,
  sourceIds:[id],provenance:'v3_individually_configured_blocks_only',
};
const session={catalogId:id,title:'No threshold word required',details:'',
  sport:'run',isKeySession:true,durationMin:59,isRest:false} as ParsedSession;
const config={enabled:true,primaryLimiterIsTte:true,weekType:'load'};
const approved={
  exactDose:()=>dose,limiterKeys:()=>['fractional_utilization','threshold_tolerance'],
  primaryDomain:()=> 'mlss',
};
describe('V3.55 TTE ranking is read-only and requires exact source proof',()=>{
  it('prioritizes only personally reviewed, exact V3 MLSS work',()=>{
    expect(isVerifiedTtePriorityCandidate(session,config,approved)).toBe(true);
  });
  it('never prioritizes if TTE is not primary or the week is recovery',()=>{
    expect(isVerifiedTtePriorityCandidate(session,{...config,primaryLimiterIsTte:false},approved)).toBe(false);
    expect(isVerifiedTtePriorityCandidate(session,{...config,weekType:'recovery'},approved)).toBe(false);
    expect(isVerifiedTtePriorityCandidate(session,{...config,enabled:false},approved)).toBe(false);
  });
  it('never turns a generic pace/durability source or title into TTE',()=>{
    expect(isVerifiedTtePriorityCandidate({...session,title:'TTE SEUIL CONTINU',
      catalogId:'V3P_RUN_155'},config,{...approved,
      exactDose:()=>({...dose,sourceIds:['V3P_RUN_155']}),
      primaryDomain:()=> 'marathon_pace',
    })).toBe(false);
  });
  it('refuses 19min of exact Z4 and mismatched total dose',()=>{
    expect(isVerifiedTtePriorityCandidate(session,config,{...approved,
      exactDose:()=>({...dose,low:31,high:19})})).toBe(false);
    expect(isVerifiedTtePriorityCandidate(session,config,{...approved,
      exactDose:()=>({...dose,durationMin:60})})).toBe(false);
  });
  it('does not give key ranking to a non-key, another sport or an unreviewed source',()=>{
    expect(isVerifiedTtePriorityCandidate({...session,isKeySession:false},config,approved)).toBe(false);
    expect(isVerifiedTtePriorityCandidate({...session,sport:'bike'},config,approved)).toBe(false);
    expect(isVerifiedTtePriorityCandidate(session,config,{...approved,limiterKeys:()=>null})).toBe(false);
  });
  it('fails closed on missing or throwing provider',()=>{
    expect(isVerifiedTtePriorityCandidate(session,config,{...approved,
      exactDose:()=>null})).toBe(false);
    expect(isVerifiedTtePriorityCandidate(session,config,{...approved,
      primaryDomain:()=>{throw Error('missing_source');}})).toBe(false);
  });
});
