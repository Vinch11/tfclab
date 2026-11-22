import { expect, it } from "vitest";
import { durabilitySession, latestPairs, durabilityProtocol, validPair } from "./durabilityDay";
it("uses identical paired targets and keeps the Day separate",()=>{
  const [session] = durabilitySession("run",65,"5:15");
  expect(session.structuredWorkout[1]).toEqual(session.structuredWorkout[3]);
  expect(session.structuredWorkout[1]).toMatchObject({step_duration_value:600,notes:expect.stringContaining("5:15 min/km")});
  expect(session.structuredWorkout[2]).toMatchObject({step_duration_value:3900});
  expect(session.details).toContain("un autre jour");
  expect(durabilitySession("run",20,"5:99")).toEqual([]);
});
it("keeps actual intensity, conditions and each athlete’s latest result per sport",()=>{
  const raw={day:"2026-01-02",sport:"bike",between:60,target:"200",early:"200",late:"195",hr1:130,hr2:140,rpe1:3,rpe2:5,context:"Vent en fin de sortie"};
  expect(validPair(raw)).toBe(true);
  const test={athlete_id:"a",type:durabilityProtocol,raw};
  expect(latestPairs([test,{...test,athlete_id:"b"},{...test,raw:{...raw,day:"2025-12-30"}}],"a")).toEqual([raw]);
});

import { pairedDecoupling } from './durabilityDay';
it('compares output per beat with the right sign and converts running pace to speed', () => {
  const pair = { day: '2026-01-02', sport: 'bike' as const, between: 60, target: '200', early: '200', late: '200', hr1: 140, hr2: 150, rpe1: 3, rpe2: 5, context: 'Même parcours' };
  expect(pairedDecoupling(pair)).toBeCloseTo(6.6667);
  expect(pairedDecoupling({ ...pair, hr2: 140 })).toBe(0);
  expect(pairedDecoupling({ ...pair, sport: 'run', target: '5:00', early: '5:00', late: '5:30', hr2: 140 })).toBeCloseTo(9.0909);
  expect(pairedDecoupling({ ...pair, hr2: 0 })).toBeNull();
});
