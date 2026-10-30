import {describe,it,expect} from "vitest";
import {WORKOUT_V2_EXTENDED_CANDIDATES,WORKOUT_V2_RECOVERY_EXTENSION} from "../../../../experimental/workout-v2/v2RecoveryExtension";
import {auditV2Migration} from "../../../../experimental/workout-v2/v2MigrationAudit";
describe("V2 batch 1: separate recovery from key endurance and quality",()=>{
 it("extends 20 pilot recipes with three explicit recovery families, uniquely",()=>{
  expect(WORKOUT_V2_RECOVERY_EXTENSION).toHaveLength(3);
  expect(WORKOUT_V2_EXTENDED_CANDIDATES).toHaveLength(23);
  expect(new Set(WORKOUT_V2_EXTENDED_CANDIDATES.map(m=>m.id)).size).toBe(23);
  expect(new Set(WORKOUT_V2_RECOVERY_EXTENSION.map(m=>m.sport))).toEqual(new Set(["bike","run","swim"]));
  for(const m of WORKOUT_V2_RECOVERY_EXTENSION){
   expect(m.intent).toBe("recovery");
   expect(m.requiresCoachReview).toBe(true);
   expect(m.target.anchor).toBe("rpe");
   expect(m.params.mainSec!.min).toBeGreaterThan(0);
   expect(m.params.mainSec!.max).toBeGreaterThan(m.params.mainSec!.min);
   expect(m.evidence).toHaveLength(0);
  }
 });
 it("does not silently migrate or approve the 920 V1 cards",()=>{
  const audit=auditV2Migration();
  expect(audit.v1Total).toBe(920);
  expect(audit.autoMigrated).toBe(0);
  expect(audit.approved).toBe(0);
 });
});
