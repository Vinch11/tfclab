import {describe,expect,it} from 'vitest';
import {confirmedNoSameDayOverlap} from './v313-confirmed-no-overlap';
import type {ScheduledSport,ConfirmedSlotStart} from './v39-calendar-safe-recovery';
import type {CoachSessionStart} from './v33-recovery-timing';

const swim:ScheduledSport={week:1,dayIndex:2,sport:'swim'};
const bike:ScheduledSport={week:1,dayIndex:2,sport:'bike'};
const at=(minuteOfDay:number,utcOffsetMinutes=60):CoachSessionStart=>({
  provenance:'coach_confirmed',minuteOfDay,utcOffsetMinutes,
});
const clocks=(a:CoachSessionStart|null,b:CoachSessionStart|null):ConfirmedSlotStart=>
  slot=>slot.sport==='swim'?a:slot.sport==='bike'?b:null;
describe('DET V313 — coach-confirmed overlap prefilter is strict, not a validator waiver',()=>{
  it('refuses a swim prescription that would cross the next confirmed bike start',()=>{
    const start=clocks(at(540),at(660)); // 09:00 swim; 11:00 bike
    expect(confirmedNoSameDayOverlap(swim,130,[swim,bike],start,at(540))).toBe(false);
    expect(confirmedNoSameDayOverlap(swim,120,[swim,bike],start,at(540))).toBe(true);
    expect(confirmedNoSameDayOverlap(bike,180,[swim,bike],start,at(660))).toBe(true);
  });
  it('refuses exactly simultaneous starts and invalid or unconfirmed clocks',()=>{
    const both=clocks(at(600),at(600));
    expect(confirmedNoSameDayOverlap(swim,30,[swim,bike],both,at(600))).toBe(false);
    expect(confirmedNoSameDayOverlap(swim,30,[swim,bike],
      clocks(null,at(660)),at(540))).toBe(false);
    expect(confirmedNoSameDayOverlap(swim,30,[swim,bike],
      clocks(at(540),null),at(540))).toBe(false);
    expect(confirmedNoSameDayOverlap(swim,30,[swim,bike],
      clocks(at(540),at(660)),at(600))).toBe(false);
    expect(confirmedNoSameDayOverlap(swim,undefined,[swim,bike],
      clocks(at(540),at(660)),at(540))).toBe(false);
    expect(confirmedNoSameDayOverlap(swim,30,[swim,bike],
      clocks(at(1440),at(660)),at(1440))).toBe(false);
  });
  it('respects explicit UTC offsets, never compares clock faces alone',()=>{
    const offsets=clocks(at(540,60),at(660,120));
    // Swim 09:00+01 -> 08:00Z. Bike 11:00+02 -> 09:00Z: only 60min.
    expect(confirmedNoSameDayOverlap(swim,80,[swim,bike],offsets,at(540,60))).toBe(false);
    expect(confirmedNoSameDayOverlap(swim,60,[swim,bike],offsets,at(540,60))).toBe(true);
  });
  it('never claims unique start when two same-sport slots share a map key',()=>{
    const extra={...swim};
    expect(confirmedNoSameDayOverlap(swim,45,[swim,extra,bike],
      clocks(at(540),at(660)),at(540))).toBe(false);
  });
  it('does not require any invented clock on isolated single-session days',()=>{
    expect(confirmedNoSameDayOverlap(swim,45,[swim])).toBe(true);
  });
});
