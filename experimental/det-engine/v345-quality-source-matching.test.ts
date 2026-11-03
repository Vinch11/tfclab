import {describe,it,expect} from 'vitest';
import {assessQualityAnchoredSourceMatching as check} from './v345-quality-source-matching';
const choice=(sourceId:string|null,verifiedKeyQuality=false)=>
  ({sourceId,verifiedKeyQuality});

describe('V3.45 necessary source matching with one exact quality anchor',()=>{
  it('does not mistake mere source matching for joint quality feasibility',()=>{
    const x=check([[choice('V3P_RUN_100',true)],
      [choice('V3P_RUN_100')]]);
    expect(x.verdict).toBe('provably_unreachable_in_current_domains');
    expect(x.reason).toBe('all_quality_anchors_conflict_with_source_uniqueness');
  });
  it('reports not refuted when a distinct assignment including true quality exists',()=>{
    const x=check([[choice('V3P_RUN_100',true),choice('V3P_RUN_200')],
      [choice('V3P_RUN_100'),choice('V3P_RUN_300')]]);
    expect(x.verdict).toBe('not_refuted');
    expect(x.checkedAnchors).toBe(1);
    expect(x.sportingAttestation).toBe(false);
  });
  it('never treats an easy or title-only candidate as source-backed quality',()=>{
    const x=check([[choice('V3P_RUN_100'),choice('V3P_RUN_200')],
      [choice('V3P_RUN_300')]]);
    expect(x.verdict).toBe('provably_unreachable_in_current_domains');
    expect(x.reason).toBe('no_approved_quality_key_source');
  });
  it('does not conclude impossibility with an unidentified source',()=>{
    const x=check([[choice('V3P_RUN_100',true)],[choice(null)]]);
    expect(x.verdict).toBe('unverified');
    expect(x.reason).toBe('unknown_source_identity');
  });
  it('does not certify empty or absent domains as sport-valid',()=>{
    expect(check([]).verdict).toBe('unverified');
    expect(check([[choice('V3P_RUN_100',true)],[]]).verdict).toBe('unverified');
  });
  it('detects a Hall-style deficit even when multiple quality anchors exist',()=>{
    const x=check([[choice('Q1',true),choice('Q2',true)],
      [choice('Q1'),choice('Q2')],[choice('Q1'),choice('Q2')]]);
    expect(x.verdict).toBe('provably_unreachable_in_current_domains');
    expect(x.checkedAnchors).toBe(2);
  });
});
