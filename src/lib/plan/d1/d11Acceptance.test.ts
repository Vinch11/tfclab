import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { d1Fixture, d1Profiles } from './fixtures';
import { generateD1Block } from './generateBlock';
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it('D1.1 replays unchanged D1 profiles, records actual generation acceptance and never qualifies repeated refusals as plans',()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
  const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
  vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
  const baseline=JSON.parse(readFileSync('docs/d1/evidence/cohort.json','utf8'));
  const rows=d1Profiles.map(profile=>{
    const input=d1Fixture(profile),old=baseline.rows.find((r:any)=>r.profile===profile);
    expect(input).toEqual({athlete:old.athlete,config:old.config});
    const before=structuredClone(input), result=generateD1Block(input.athlete,input.config);
    let fullPlanComparisons=0;
    for(let i=1;i<20;i++){
      const replay=generateD1Block(input.athlete,input.config);
      expect(replay).toEqual(result);
      if(result.candidate&&replay.candidate){expect(replay.candidate).toEqual(result.candidate);fullPlanComparisons++;}
    }
    expect(input).toEqual(before);
    // Known safety witness, not a successful-generation assertion.
    expect(result.reason).toBe(old.result.reason);
    expect(result.brickContract.find(c=>c.week===2)?.slotMinimumMinutes).toBe(100);
    expect(result.brickContract.find(c=>c.week===2)?.compatibleBikeFloor).toBe(false);
    const days=result.candidate?.weeks.reduce((n,w)=>n+new Set(w.sessions.map(s=>s.dayIndex)).size,0)??0;
    return{profile,input,inputHash:hash(input),result,resultHash:hash(result),days,
      generationAcceptance:days===28&&result.constraintsSatisfied&&result.prescriptible,
      resultRepetitions:20,fullPlanComparisons,
      planHash:result.candidate?hash(result.candidate):null,
      doses:result.candidate?.weeks.map(w=>({week:w.weekNumber,minutes:w.sessions.reduce((n,s)=>n+(s.durationMin??0),0)}))??null,
      individualizationProven:false};
  });
  expect(fetch).not.toHaveBeenCalled();
  writeFileSync('docs/d1.1/evidence/cohort.json',JSON.stringify({rows,networkCalls:fetch.mock.calls.length,
    successful28DayPlans:rows.filter(r=>r.generationAcceptance).length,
    planDeterminismProven:rows.every(r=>r.fullPlanComparisons===19&&r.days===28)},null,2));
},300000);
