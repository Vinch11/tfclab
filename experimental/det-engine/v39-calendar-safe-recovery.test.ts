import {describe,it,expect} from 'vitest';
import {calendarOnlyRecoverySafe,type ScheduledSport} from './v39-calendar-safe-recovery';

const run=(week:number,dayIndex:number):ScheduledSport=>({week,dayIndex,sport:'run'});
const bike=(week:number,dayIndex:number):ScheduledSport=>({week,dayIndex,sport:'bike'});
const brick=(week:number,dayIndex:number):ScheduledSport=>({week,dayIndex,sport:'brick'});
const requires=(sport:'run'|'bike'|'swim'|'strength',hours:number)=>[{sourceId:'V3P_RUN_008',sport,hours}];

describe('DET V39 — no invented clocks in V3 recovery preselection',()=>{
  it('rejects 48h from Wednesday to Friday, even though dates are two days apart',()=>{
    const slots=[run(1,2),run(1,4)];
    expect(calendarOnlyRecoverySafe(slots[0],requires('run',48),slots)).toBe(false);
    expect(calendarOnlyRecoverySafe(slots[0],requires('run',24),slots)).toBe(true);
  });
  it('admits 48h from Wednesday to Saturday using only guaranteed interval',()=>{
    const slots=[run(1,2),run(1,5)];
    expect(calendarOnlyRecoverySafe(slots[0],requires('run',48),slots)).toBe(true);
  });
  it('checks the actual next exposure across a week boundary and inside a brick',()=>{
    const slots=[bike(1,5),brick(2,0),bike(2,3)];
    expect(calendarOnlyRecoverySafe(slots[0],requires('bike',48),slots)).toBe(false);
    expect(calendarOnlyRecoverySafe(slots[1],requires('bike',48),slots)).toBe(true);
  });
  it('requires same-day separation when one session is a bike/run brick',()=>{
    const slots=[run(1,3),brick(1,3),run(1,6)];
    expect(calendarOnlyRecoverySafe(slots[0],requires('run',1),slots)).toBe(false);
  });
  it('rejects unknown or invalid source recovery hours, without using defaults',()=>{
    const slots=[run(1,0),run(1,3)];
    expect(calendarOnlyRecoverySafe(slots[0],requires('run',NaN),slots)).toBe(false);
    expect(calendarOnlyRecoverySafe(slots[0],requires('run',-1),slots)).toBe(false);
    expect(calendarOnlyRecoverySafe(slots[0],requires('run',0),slots)).toBe(true);
  });
});
