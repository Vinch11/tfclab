import {describe,expect,it} from 'vitest';
import {findHallConflictWitness} from './v336-hall-conflict';
import {hasDistinctSourceAssignment} from './v334-distinct-source-feasibility';

describe('DET V336 — fixed-domain source conflict witness',()=>{
  it('finds minimal one-card conflict before adding sport or clock guesses',()=>{
    const domains=[['RUN_A'],['RUN_A'],['RUN_B']];
    const w=findHallConflictWitness(domains);
    expect(w).toMatchObject({slotIndices:[0,1],sourceIds:['RUN_A'],
      slotsRequired:2,distinctSourcesAvailable:1,
      necessaryConditionOnly:true});
    expect(hasDistinctSourceAssignment(domains)).toBe(false);
  });
  it('identifies Hall conflict where every slot has two options',()=>{
    const domains=[['A','B'],['A','B'],['A','B'],['C']];
    const w=findHallConflictWitness(domains);
    expect(w?.slotIndices).toEqual([0,1,2]);
    expect(w?.distinctSourcesAvailable).toBe(2);
    expect(w?.slotsRequired).toBe(3);
  });
  it('never reports an impossible matching when reallocation is feasible',()=>{
    const domains=[['A','B'],['A'],['B','C']];
    expect(hasDistinctSourceAssignment(domains)).toBe(true);
    expect(findHallConflictWitness(domains)).toBe(null);
  });
  it('handles empty domain and independent events correctly',()=>{
    expect(findHallConflictWitness([[],['RUN_A']])?.slotIndices).toEqual([0]);
    expect(findHallConflictWitness([['RUN_A'],['__race_1'],['__race_2']])).toBe(null);
  });
  it('does not invent a certificate when bounded subset proof is disabled',()=>{
    expect(findHallConflictWitness(Array.from({length:13},()=>['A']))).toBe(null);
  });
});
