import {describe,it,expect} from "vitest";
import {assessAllV1Sources,fullV1AssessmentSummary} from "../../../../experimental/workout-v2/v2FullCorpusClassification";
describe("D1.18 exhaustive initial 895 deficiencies",()=>{
 it("creates a traceable assessment for every V1 ID, never asserts automatic approval",()=>{
  const rows=assessAllV1Sources(),summary=fullV1AssessmentSummary();
  expect(rows).toHaveLength(920);
  expect(summary.uniqueIds).toBe(920);
  expect(summary.initiallyMissing).toBe(895);
  expect(summary.counts.documented).toBe(25);
  expect(summary.counts.reviewed_literal).toBe(6);
  expect(Object.values(summary.counts).reduce((n,v)=>n+v,0)).toBe(920);
  expect(rows.every(r=>!!r.reason&&!r.autoApproved)).toBe(true);
  expect(rows.filter(r=>r.state==="ambiguous").every(r=>r.intent===null)).toBe(true);
  // A passing mention of "cadence" or "économie" cannot create an intensity stimulus.
  const endurance=rows.find(r=>r.id==="A_BIKE_Z2_LONG");
  expect(endurance?.alternatives).not.toContain("neuromuscular");
  expect(endurance?.alternatives).not.toContain("technique_economy");
  const racePace=rows.find(r=>r.id==="A_IM_RUN_PACE");
  expect(racePace?.alternatives).not.toContain("technique_economy");
  console.log("V2_FULL_CORPUS_SUMMARY="+JSON.stringify(summary));
  rows.filter(r=>r.state!=="documented").forEach(r=>console.log("V2_CORPUS_RECORD="+JSON.stringify(r)));
 },30000);
});
