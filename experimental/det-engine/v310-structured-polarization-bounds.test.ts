import {describe,expect,it} from 'vitest';
import {assessStructuredZoneNecessaryBounds,type BoundedZoneChoice} from './v310-structured-polarization-bounds';
const card=(low:number,nonLow:number,unknown=0,isKeyQuality=false):BoundedZoneChoice=>({
  dose:{low,nonLow,unknown},isKeyQuality,
});
describe('DET V310 — mathematically optimistic, source-preserving polarization bounds',()=>{
  it('proves below-75 only when every remaining domain has insufficient EASY margin',()=>{
    const result=assessStructuredZoneNecessaryBounds([],
      [[card(60,0),card(20,20)],[card(0,35)],[card(10,0)]],false);
    expect(result.reason).toBe('easy_fraction_impossible'); // 70 - 3*35 < 0
    expect(result.maxEasyMargin).toBe(-35);
  });
  it('is stronger than separately maximizing low and minimizing nonlow across different candidates',()=>{
    const result=assessStructuredZoneNecessaryBounds([],
      [[card(90,45),card(60,0)],[card(0,25)]],false);
    // Independent old max-low/min-nonlow bound: 90/115 >75%, misleading.
    // Exact per-slot best low-3*nonlow: 60 - 75 = -15.
    expect(result.reason).toBe('easy_fraction_impossible');
    expect(result.maxEasyMargin).toBe(-15);
  });
  it('cannot falsely refuse a real 75% compliant distribution',()=>{
    const r=assessStructuredZoneNecessaryBounds([card(60,0)],
      [[card(0,20,0,true)]],true);
    expect(r.reason).toBe('not_refuted');
    expect(r.maxEasyMarginWithQuality).toBe(0);
  });
  it('accounts for obligatory key quality EVEN if a non-quality source is much easier',()=>{
    const r=assessStructuredZoneNecessaryBounds([],
      [[card(80,0),card(0,45,0,true)],[card(50,0)]],true);
    expect(r.maxEasyMargin).toBe(130);
    expect(r.maxEasyMarginWithQuality).toBe(-85);
    expect(r.reason).toBe('easy_fraction_impossible');
  });
  it('preserves existing chosen key quality and finds valid easy volume',()=>{
    const r=assessStructuredZoneNecessaryBounds([card(0,20,0,true)],
      [[card(80,0)],[card(0,0)]],true);
    expect(r.reason).toBe('not_refuted');
  });
  it('returns a separate unknown-time proof and no made-up Z1 recovery',()=>{
    const r=assessStructuredZoneNecessaryBounds([],
      [[card(75,0,55)],[card(25,0,25)]],false);
    expect(r.maxEasyMargin).toBe(100);
    expect(r.minUnknownMargin).toBe(7*80-3*100);
    expect(r.reason).toBe('unknown_fraction_impossible');
  });
  it('does not mistake a missing source for mathematical impossibility',()=>{
    const r=assessStructuredZoneNecessaryBounds([],
      [[card(60,0)],[null]],false);
    expect(r.reason).toBe('missing_certified_slot');
    expect(r.maxEasyMargin).toBeNull();
  });
  it('does not claim quality when no key-quality candidate is available',()=>{
    const r=assessStructuredZoneNecessaryBounds([],
      [[card(60,0)],[card(40,0)]],true);
    expect(r.reason).toBe('required_quality_unavailable');
  });
  it('ignores a null candidate when a certified alternative exists',()=>{
    const r=assessStructuredZoneNecessaryBounds([],
      [[null,card(90,0)],[card(0,20)]],false);
    expect(r.reason).toBe('not_refuted');
  });
});
