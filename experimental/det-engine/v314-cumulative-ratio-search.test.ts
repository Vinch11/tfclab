import {describe,expect,it} from 'vitest';
import {assessCumulativeTriathlonRatioPotential,hasExactStrictTriathlonRatio}
  from './v314-cumulative-ratio-search';
import type {TriContribution} from './v312-triathlon-dose-trajectory';
const c=(swim=0,bike=0,run=0,transition=0):TriContribution=>({
  swim,bike,run,transition,
});
describe('DET V314 — final-load cumulative ratio gate (strict, no substitutions)',()=>{
  it('certifies only actual 70.3 minutes inside ALL three ranges',()=>{
    expect(hasExactStrictTriathlonRatio('703',{swim:0,bike:0,run:0},[
      c(18),c(0,43),c(0,0,39),
    ])).toBe(true);
    expect(hasExactStrictTriathlonRatio('703',{swim:0,bike:0,run:0},[
      c(18),c(0,41.63),c(0,0,40.33),
    ])).toBe(false);
  });
  it('rejects an Ironman allocation with excess swimming AND insufficient biking',()=>{
    const p={swim:0,bike:0,run:0};
    expect(hasExactStrictTriathlonRatio('IM',p,[
      c(22.46),c(0,44.24),c(0,0,33.30),
    ])).toBe(false);
    expect(hasExactStrictTriathlonRatio('IM',p,[
      c(18),c(0,50),c(0,0,32),
    ])).toBe(true);
  });
  it('uses already verified cumulative load weeks, never evaluates last week alone',()=>{
    expect(hasExactStrictTriathlonRatio('IM',{swim:80,bike:200,run:120},[
      c(10),c(0,50),c(0,0,40),
    ])).toBe(true); // 90/250/160 = 18/50/32
    expect(hasExactStrictTriathlonRatio('IM',{swim:120,bike:200,run:120},[
      c(10),c(0,50),c(0,0,40),
    ])).toBe(false);
  });
  it('never refuses a feasible certified alternative using optimistic slot bounds',()=>{
    const out=assessCumulativeTriathlonRatioPotential('IM',
      {swim:0,bike:0,run:0},[],[
        [c(18),c(24)],[c(0,42),c(0,50)],[c(0,0,32),c(0,0,36)],
      ]);
    expect(out.verdict).toBe('not_refuted');
    expect(hasExactStrictTriathlonRatio('IM',{swim:0,bike:0,run:0},[
      c(18),c(0,50),c(0,0,32),
    ])).toBe(true);
  });
  it('proves impossible only inside the exact remaining domains',()=>{
    const out=assessCumulativeTriathlonRatioPotential('IM',
      {swim:0,bike:0,run:0},[],[
        [c(35),c(40)],[c(0,35),c(0,38)],[c(0,0,30),c(0,0,33)],
      ]);
    expect(out.verdict).toBe('provably_outside_current_domains');
    expect(out.outside).toContain('swim');
  });
  it('fails closed for unknown bricks, missing sources, impossible doses and invalid ledgers',()=>{
    const prior={swim:0,bike:0,run:0};
    expect(assessCumulativeTriathlonRatioPotential('703',prior,[],[
      [null],[c(0,45)],[c(0,0,35)],
    ]).verdict).toBe('unverified');
    expect(assessCumulativeTriathlonRatioPotential('703',prior,[null],[
      [c(18)],[c(0,45)],[c(0,0,35)],
    ]).verdict).toBe('unverified');
    expect(assessCumulativeTriathlonRatioPotential('703',prior,[],[
      [c(-5)],[c(0,45)],[c(0,0,35)],
    ]).verdict).toBe('unverified');
    expect(hasExactStrictTriathlonRatio('703',
      {swim:Number.NaN,bike:0,run:0},[c(18),c(0,45),c(0,0,37)])).toBe(false);
  });
  it('does not count verified brick transition as a sport minute',()=>{
    expect(hasExactStrictTriathlonRatio('703',{swim:0,bike:0,run:0},[
      c(18),c(0,20),c(0,0,20),c(0,23,19,5),
    ])).toBe(true);
  });
});
