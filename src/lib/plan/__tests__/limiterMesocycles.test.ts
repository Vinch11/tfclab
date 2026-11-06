import { describe, expect, it } from 'vitest';
import { buildLimiterMesocycles, limiterScheduleWindow, limiterMesocyclePrompt } from '../limiterMesocycles';
const priorities = ['VLamax','TTE','VO2max','FTP','Économie','FatMax'];
const calendar = (length:number) => Object.fromEntries(Array.from({length},(_,i)=>[i+1,{weekType:i+1>length-2?'taper':(i+1)%4===0?'recovery':'load',phase:i<12?'base':'build'}]));
describe('shared limiter development/maintenance intent',()=>{
  it('retains every raw priority and revisits them on a long preparation',()=>{
    const input = calendar(64), before=JSON.stringify(input), schedule=buildLimiterMesocycles(priorities,input);
    expect(schedule.priorities).toEqual(priorities);expect(schedule.withoutDedicatedBlock).toEqual([]);
    for(const limiter of priorities) expect(schedule.blocks.filter(block=>block.focus===limiter).length).toBeGreaterThanOrEqual(2);
    expect(schedule.blocks.slice(0,7).map(block=>block.focus)).toEqual([...priorities,priorities[0]]);
    expect(JSON.stringify(input)).toBe(before);
  });
  it('keeps the primary in maintenance when another limiter has the complementary focus',()=>{
    const schedule=buildLimiterMesocycles(priorities,calendar(40));
    expect(schedule.byWeek[5]).toMatchObject({focus:'TTE',primary:'VLamax',maintenance:expect.arrayContaining(['VLamax','FatMax'])});
    expect(schedule.byWeek[4]).toMatchObject({mode:'maintenance',focus:null});
    expect(schedule.byWeek[39]).toMatchObject({mode:'race_integration',focus:null});
    expect(schedule.byWeek[40]).toMatchObject({mode:'race_integration',focus:null});
  });
  it('does not promise dedicated blocks when the horizon is too short',()=>{
    const schedule=buildLimiterMesocycles(priorities,calendar(8));
    expect(schedule.withoutDedicatedBlock).toContain('FatMax');
    expect(limiterMesocyclePrompt(schedule,[1,2])).toContain('Horizon insuffisant');
  });
  it('keeps a regenerated window on the global block instead of restarting its priorities',()=>{
    const full=buildLimiterMesocycles(priorities,calendar(64));
    const part=limiterScheduleWindow(full,28,8);
    for(let w=1;w<=8;w++) expect(part.byWeek[w]).toMatchObject({globalWeek:w+28,focus:full.byWeek[w+28].focus,block:full.byWeek[w+28].block});
    expect(part.byWeek[1].focus).toBe('TTE');
    expect(limiterMesocyclePrompt(part,[1])).toContain('S1');
  });
  it('never invents a limiter or turns recovery into an extra work block',()=>{
    expect(buildLimiterMesocycles([],calendar(40)).blocks).toEqual([]);
    const s=buildLimiterMesocycles(['VLamax'],calendar(16));
    expect(s.blocks.every(block=>block.focus==='VLamax')).toBe(true);
    expect(Object.values(s.byWeek).filter(w=>w.mode==='maintenance').every(w=>w.focus===null)).toBe(true);
  });
});

import { synchronizeLimiterMesocycles } from '../limiterMesocycles';
it('follows a goal-specific recovery change made before DET assembly',()=>{
  const original=calendar(16), initial=buildLimiterMesocycles(priorities,original);
  const weeklyQuotas=Object.fromEntries(Object.entries(original).map(([week,row])=>[week,{...row,limiterFocus:initial.byWeek[Number(week)]}]));
  weeklyQuotas[5].weekType='recovery';
  const p={limiterCalendar:original,limiterMesocycles:initial,weeklyQuotas};
  synchronizeLimiterMesocycles(p,priorities,0,16);
  expect(p.weeklyQuotas[5].limiterFocus).toMatchObject({mode:'maintenance',focus:null});
  expect(p.weeklyQuotas[6].limiterFocus).toMatchObject({mode:'development',focus:'TTE'});
});
