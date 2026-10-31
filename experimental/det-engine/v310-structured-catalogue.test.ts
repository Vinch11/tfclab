import {describe,expect,it} from 'vitest';
import {buildSyntheticDetV3ContractFromCatalogue} from './v3-test-anchor-fixtures';
import {syntheticV3ReviewAnchors} from './v3-test-anchor-fixtures';
import {V3_BASE_BRICK_ID} from './v31-v3-brick';
import type {V3ReviewedSettings} from './v31-v3-catalogue';
import {assessStrictStructuredZoneTarget} from './v39-strict-native-polarization-target';

const approved=(id:string):V3ReviewedSettings=>({
  id,objective:'703',athleteLevel:'trained',athleteLevelSource:'manual',
  allPrerequisitesChecked:true,individualCoachApproval:true,
  athleteAnchors:syntheticV3ReviewAnchors(),
});
describe('DET V310 — actual V3 candidate bridge consumes EXACT structured block zones',()=>{
  it('links an accepted source and approved brick to the exact prescribed duration',()=>{
    const bridge=buildSyntheticDetV3ContractFromCatalogue([
      approved('V3P_BIKE_002'),approved('V3P_RUN_001'),
    ],[{id:V3_BASE_BRICK_ID,objective:'703',individualCoachApproval:true,
      transitionSeconds:300}]);
    expect(bridge.report.accepted).toHaveLength(2);
    expect(bridge.brickReport.accepted).toHaveLength(1);
    const fn=bridge.contract.sourceStructuredZoneForId;
    expect(fn).toBeDefined();
    const bike=fn!('V3P_BIKE_002',80);
    const run=fn!('V3P_RUN_001',35);
    const brick=fn!(V3_BASE_BRICK_ID,120);
    expect(bike).not.toBeNull();
    expect(run).not.toBeNull();
    expect(brick).not.toBeNull();
    expect((bike!.low+bike!.nonLow+bike!.unknown)).toBeCloseTo(80);
    expect((run!.low+run!.nonLow+run!.unknown)).toBeCloseTo(35);
    expect(brick!.low).toBeCloseTo(bike!.low+run!.low);
    expect(brick!.nonLow).toBeCloseTo(bike!.nonLow+run!.nonLow);
    expect(brick!.unknown).toBeCloseTo(bike!.unknown+run!.unknown+5);
    expect(assessStrictStructuredZoneTarget([brick!]).admissible).toBe(true);
    expect(fn!(V3_BASE_BRICK_ID,119)).toBeNull();
    expect(fn!('B_703_BRICK_RACE_PACE',180)).toBeNull();
    expect(fn!('V3P_RUN_099',60)).toBeNull();
  });
  it('does not turn unreviewed or physically unverified athlete source into easy minutes',()=>{
    const bridge=buildSyntheticDetV3ContractFromCatalogue([]);
    expect(bridge.contract.sourceStructuredZoneForId?.('V3P_BIKE_002',80)).toBeNull();
    expect(assessStrictStructuredZoneTarget([{low:5,nonLow:20,unknown:4}]).admissible).toBe(false);
    expect(assessStrictStructuredZoneTarget([{low:70,nonLow:20,unknown:40}]).admissible).toBe(false);
  });
});
