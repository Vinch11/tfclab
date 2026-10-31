import {describe,it,expect} from 'vitest';
import {planTriathlonRatioTrajectory,triathlonCandidateDoseDistance,
  type TriContribution} from './v312-triathlon-dose-trajectory';

const c=(swim=0,bike=0,run=0,transition=0):TriContribution=>({
  swim,bike,run,transition,
});
describe('DET V312 — advisory source-dose trajectory, no validator bypass',()=>{
  it('aims for intermediate swim doses instead of blindly selecting minimum',()=>{
    const domains=[
      {id:'s1',choices:[c(30),c(45),c(55)]},
      {id:'s2',choices:[c(30),c(45),c(55)]},
      {id:'b',choices:[c(0,190),c(0,260),c(0,320)]},
      {id:'r',choices:[c(0,0,95),c(0,0,110),c(0,0,120)]},
    ];
    const trajectory=planTriathlonRatioTrajectory('703',domains,{
      swim:0,bike:0,run:0,
    },480);
    expect(trajectory).not.toBeNull();
    expect(trajectory?.sportTargetMinutes.swim).toBeGreaterThan(60);
    expect(trajectory?.sportTargetMinutes.swim).toBeLessThan(110);
    const preferred=trajectory?.preferredBySlot.s1;
    expect(triathlonCandidateDoseDistance(c(45),preferred)).toBeLessThan(
      triathlonCandidateDoseDistance(c(55),preferred));
  });
  it('carries verified earlier load-week imbalance forward without fabricating new sessions',()=>{
    const domains=[
      {id:'s',choices:[c(20),c(40),c(60)]},
      {id:'b',choices:[c(0,100),c(0,160),c(0,200)]},
      {id:'r',choices:[c(0,0,70),c(0,0,100)]},
    ];
    const normal=planTriathlonRatioTrajectory('IM',domains,{swim:0,bike:0,run:0},600);
    const afterExcessSwim=planTriathlonRatioTrajectory('IM',domains,{
      swim:300,bike:100,run:100,
    },600);
    expect(normal?.sportTargetMinutes.swim).toBeGreaterThan(
      afterExcessSwim!.sportTargetMinutes.swim);
    expect(afterExcessSwim?.sportTargetMinutes.swim).toBe(20);
    expect(afterExcessSwim?.sportTargetMinutes.bike).toBeGreaterThan(
      normal!.sportTargetMinutes.bike);
  });
  it('leaves exact approved brick transitions outside sport ratios',()=>{
    const domain=[
      {id:'s',choices:[c(30),c(40)]},
      {id:'brick',choices:[c(0,80,25,5),c(0,100,35,5)]},
      {id:'b',choices:[c(0,90),c(0,120)]},
      {id:'r',choices:[c(0,0,60),c(0,0,80)]},
    ];
    const t=planTriathlonRatioTrajectory('703',domain,{swim:0,bike:0,run:0},600);
    expect(t?.low.bike).toBe(170);
    expect(t?.high.run).toBe(115);
    expect(t?.preferredBySlot.brick.swim).toBe(0);
  });
  it('permits only physically meaningful in-range replay targets',()=>{
    const domains=[
      {id:'swim',choices:[c(30),c(60)]},
      {id:'bike',choices:[c(0,90),c(0,160)]},
      {id:'run',choices:[c(0,0,80),c(0,0,110)]},
    ];
    const normal=planTriathlonRatioTrajectory('IM',domains,
      {swim:0,bike:0,run:0},500);
    const tuned=planTriathlonRatioTrajectory('IM',domains,
      {swim:0,bike:0,run:0},500,{swim:.15,bike:.55,run:.30});
    expect(normal).not.toBeNull();
    expect(tuned).not.toBeNull();
    expect(tuned!.sportTargetMinutes.swim).toBeLessThan(normal!.sportTargetMinutes.swim);
    expect(tuned!.sportTargetMinutes.bike).toBeGreaterThan(normal!.sportTargetMinutes.bike);
    expect(planTriathlonRatioTrajectory('IM',domains,
      {swim:0,bike:0,run:0},500,{swim:.10,bike:.60,run:.30})).toBeNull();
    expect(planTriathlonRatioTrajectory('IM',domains,
      {swim:0,bike:0,run:0},500,{swim:.16,bike:.54,run:.29})).toBeNull();
  });
  it('refuses missing sources and invalid cumulative minutes',()=>{
    expect(planTriathlonRatioTrajectory('IM',[
      {id:'x',choices:[null,c(10)]},
    ],{swim:0,bike:0,run:0},600)).toBeNull();
    expect(planTriathlonRatioTrajectory('IM',[
      {id:'x',choices:[c(20)]},
    ],{swim:Number.NaN,bike:0,run:0},600)).toBeNull();
    expect(planTriathlonRatioTrajectory('IM',[
      {id:'x',choices:[c(-20)]},
    ],{swim:0,bike:0,run:0},600)).toBeNull();
  });
  it('never claims an approved plan or assigns a previously nonexistent source dose',()=>{
    const t=planTriathlonRatioTrajectory('IM',[
      {id:'s',choices:[c(40),c(60)]},
      {id:'b',choices:[c(0,150)]},
      {id:'r',choices:[c(0,0,95)]},
    ],{swim:0,bike:0,run:0},550);
    expect(t?.interpretation).toBe('advisory_sort_only_not_feasibility_evidence');
    expect(t?.sportTargetMinutes.bike).toBe(150);
    expect(t?.preferredBySlot.b).toEqual({swim:0,bike:150,run:0});
    expect(triathlonCandidateDoseDistance(null,t?.preferredBySlot.b)).toBe(Infinity);
  });
});
