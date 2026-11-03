import {describe,expect,it} from 'vitest';
import {hasDistinctSourceAssignment} from './v334-distinct-source-feasibility';

describe('DET V3.34 — approved source IDs are never reused inside a week',()=>{
  it('rejects two slots that both only admit the same one approved ID',()=>{
    expect(hasDistinctSourceAssignment([['V3P_RUN_130'],['V3P_RUN_130']]))
      .toBe(false);
  });
  it('rejects a Hall-type conflict despite each slot having two choices',()=>{
    expect(hasDistinctSourceAssignment([
      ['V3P_RUN_130','V3P_RUN_125'],
      ['V3P_RUN_130','V3P_RUN_125'],
      ['V3P_RUN_130','V3P_RUN_125'],
    ])).toBe(false);
  });
  it('allows a real reassignment rather than a false greedy rejection',()=>{
    expect(hasDistinctSourceAssignment([
      ['V3P_RUN_125','V3P_RUN_130'],
      ['V3P_RUN_125'],
      ['V3P_RUN_190','V3P_RUN_130'],
    ])).toBe(true);
  });
  it('does not mistake two independent official events for the same source',()=>{
    expect(hasDistinctSourceAssignment([
      ['V3P_RUN_125'],['__official_event_slot_1'],
      ['__official_event_slot_2'],
    ])).toBe(true);
  });
  it('is a necessary check only, not a quality or recovery certificate',()=>{
    expect(hasDistinctSourceAssignment([])).toBe(true);
    expect(hasDistinctSourceAssignment([['a','a'],['b']])).toBe(true);
    expect(hasDistinctSourceAssignment([['a'],[]])).toBe(false);
  });
});
