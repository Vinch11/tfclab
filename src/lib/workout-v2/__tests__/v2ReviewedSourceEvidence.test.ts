import {describe,it,expect} from "vitest";
import {inspectV2ReviewedSourceEvidence} from "../../../../experimental/workout-v2/v2ReviewedSourceEvidence";
describe("V2 first source-verified batch, conservative recovery semantics",()=>{
 it("pins actual V1 Main wording, without approving or changing any card",()=>{
  const rows=inspectV2ReviewedSourceEvidence();
  expect(rows).toHaveLength(6);
  expect(rows.every(r=>r.exists&&r.matching)).toBe(true);
  expect(rows.every(r=>r.intent==="recovery"&&!r.coachDoseApproved&&!r.canAutoSelect)).toBe(true);
  console.log("V2_REVIEWED_SOURCE_BATCH="+JSON.stringify(rows));
 });
});
