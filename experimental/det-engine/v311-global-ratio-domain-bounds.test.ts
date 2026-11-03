import {describe,it,expect} from 'vitest';
import {assessGlobalSourceRatioEnvelope,type ExactSportMinutes,
  type RatioSlotDomain,type RatioTargetRanges} from './v311-global-ratio-domain-bounds';

const im:RatioTargetRanges={
  swim:[15,20],bike:[45,55],run:[25,35],
};
const c=(swim=0,bike=0,run=0,transition=0):ExactSportMinutes=>({
  swim,bike,run,transition,
});
const slot=(week:number,sport:string,...choices:(ExactSportMinutes|null)[]):RatioSlotDomain=>({
  week,sport,choices,
});
describe('DET V311 — conservative source-domain minute-ratio certificate',()=>{
  it('accepts as NOT REFUTED a complete exact 18/50/32 IM allocation',()=>{
    const out=assessGlobalSourceRatioEnvelope([
      slot(1,'swim',c(18)),slot(1,'bike',c(0,50)),
      slot(1,'run',c(0,0,32)),
    ],im);
    expect(out.verdict).toBe('not_refuted');
    expect(out.offendingSports).toEqual([]);
    expect(out.bounds?.swim.minPct).toBe(18);
    expect(out.bounds?.bike.maxPct).toBe(50);
  });
  it('proves impossible WITHOUT DFS if every candidate leaves swim too high and bike too low',()=>{
    const out=assessGlobalSourceRatioEnvelope([
      slot(1,'swim',c(38),c(40)),
      slot(1,'bike',c(0,29),c(0,31)),
      slot(1,'run',c(0,0,30)),
    ],im);
    expect(out.verdict).toBe('provably_unreachable_in_current_domains');
    expect(out.offendingSports).toContain('swim');
    expect(out.offendingSports).toContain('bike');
    expect(out.bounds!.swim.minPct).toBeGreaterThan(20);
    expect(out.bounds!.bike.maxPct).toBeLessThan(45);
  });
  it('uses optimistic independent extrema, never rejects a real alternative',()=>{
    const slots=[
      slot(1,'swim',c(15),c(25)),
      slot(1,'bike',c(0,48),c(0,58)),
      slot(2,'run',c(0,0,30),c(0,0,40)),
    ];
    const out=assessGlobalSourceRatioEnvelope(slots,im);
    expect(out.verdict).toBe('not_refuted');
    const admissible=[c(15),c(0,48),c(0,0,30)];
    const actual={swim:15,bike:48,run:30};
    const total=actual.swim+actual.bike+actual.run;
    expect(admissible).toHaveLength(3);
    for(const sport of ['swim','bike','run'] as const){
      const pct=100*actual[sport]/total;
      expect(pct).toBeGreaterThanOrEqual(out.bounds![sport].minPct-1e-8);
      expect(pct).toBeLessThanOrEqual(out.bounds![sport].maxPct+1e-8);
    }
  });
  it('does not fabricate a legacy brick split or an uncertain source dose',()=>{
    const out=assessGlobalSourceRatioEnvelope([
      slot(1,'swim',c(18)),slot(1,'bike',c(0,50)),
      slot(1,'run',c(0,0,32)),slot(2,'brick',null),
    ],im);
    expect(out.verdict).toBe('unverified');
    expect(out.bounds).toBeNull();
    expect(out.offendingSports).toEqual([]);
  });
  it('keeps verified brick transitions OUTSIDE endurance denominator',()=>{
    const out=assessGlobalSourceRatioEnvelope([
      slot(1,'swim',c(18)),slot(1,'bike',c(0,30)),
      slot(1,'run',c(0,0,22)),
      slot(1,'brick',c(0,20,10,5)),
    ],im);
    expect(out.verdict).toBe('not_refuted');
    expect(out.bounds!.swim.minPct).toBe(18);
    expect(out.bounds!.bike.minPct).toBe(50);
  });
  it('refuses tampered nonfinite or negative doses rather than certifying a bound',()=>{
    const out=assessGlobalSourceRatioEnvelope([
      slot(1,'bike',c(0,30)),
      slot(1,'run',c(0,0,30)),
      slot(1,'swim',c(Number.NaN),c(-1)),
    ],im);
    expect(out.verdict).toBe('unverified');
    expect(out.reason).toBe('unverified_source_or_brick_dose');
  });
});
