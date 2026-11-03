import {describe,expect,it} from 'vitest';
import {calendarOnlyRecoverySafe,calendarOrConfirmedClockRecoverySafe,
  type ScheduledSport,type ConfirmedSlotStart} from './v39-calendar-safe-recovery';
import type {CoachSessionStart} from './v33-recovery-timing';
const a:ScheduledSport={week:1,dayIndex:2,sport:'swim'};
const b:ScheduledSport={week:1,dayIndex:3,sport:'swim'};
const req=[{sourceId:'V3P_SWIM_001',sport:'swim',hours:24}];
const at=(minuteOfDay:number,utcOffsetMinutes=60):CoachSessionStart=>({
  provenance:'coach_confirmed',minuteOfDay,utcOffsetMinutes});
const start=(wed:CoachSessionStart|null,thu:CoachSessionStart|null):ConfirmedSlotStart=>
  slot=>slot.dayIndex===a.dayIndex?wed:slot.dayIndex===b.dayIndex?thu:null;
describe('DET V310 — exact confirmed recovery clock, never guessed',()=>{
  it('accepts consecutive-day swimming only when a confirmed gap exceeds the source floor',()=>{
    expect(calendarOnlyRecoverySafe(a,req,[a,b])).toBe(false);
    expect(calendarOrConfirmedClockRecoverySafe(a,45,req,[a,b],start(at(540),at(660)))).toBe(true);
    expect(calendarOrConfirmedClockRecoverySafe(a,45,req,[a,b],start(at(540),at(480)))).toBe(false);
  });
  it('refuses missing, unconfirmed, invalid, and inconsistent clock inputs',()=>{
    expect(calendarOrConfirmedClockRecoverySafe(a,45,req,[a,b])).toBe(false);
    expect(calendarOrConfirmedClockRecoverySafe(a,45,req,[a,b],start(null,at(660)))).toBe(false);
    expect(calendarOrConfirmedClockRecoverySafe(a,45,req,[a,b],start(at(540),null))).toBe(false);
    expect(calendarOrConfirmedClockRecoverySafe(a,undefined,req,[a,b],start(at(540),at(660)))).toBe(false);
    expect(calendarOrConfirmedClockRecoverySafe(a,45,req,[a,b],start(
      {...at(540),provenance:'unconfirmed' as 'coach_confirmed'},at(660)))).toBe(false);
    expect(calendarOrConfirmedClockRecoverySafe(a,45,req,[a,b],start(at(1440),at(660)))).toBe(false);
  });
  it('handles offsets rather than treating two clock face times as UTC times',()=>{
    const fixed=start(at(540,120),at(660,60));
    expect(calendarOrConfirmedClockRecoverySafe(a,45,req,[a,b],fixed)).toBe(true);
    const tooShort=start(at(540,60),at(600,120));
    expect(calendarOrConfirmedClockRecoverySafe(a,45,req,[a,b],tooShort)).toBe(false);
  });
  it('rejects ambiguous same-day same-sport duplicate slots',()=>{
    const other:ScheduledSport={week:1,dayIndex:2,sport:'swim'};
    expect(calendarOrConfirmedClockRecoverySafe(a,45,req,[a,other,b],start(at(540),at(660)))).toBe(false);
  });
  it('preserves an already-proven calendar-only gap without requiring exact clocks',()=>{
    const friday:ScheduledSport={week:1,dayIndex:4,sport:'swim'};
    expect(calendarOnlyRecoverySafe(a,req,[a,friday])).toBe(true);
    expect(calendarOrConfirmedClockRecoverySafe(a,45,req,[a,friday])).toBe(true);
  });
});
