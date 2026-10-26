import { describe,it,expect,vi } from "vitest";
import { writeFileSync,mkdirSync } from "node:fs";
import { planningCases,evaluatePlanningCase,matrixCoverage,OBJECTIVE_PROFILE,supplementaryPlanningCases } from "../planningMatrix";

describe("offline scope inventory and combinatorial planning contracts",()=>{
 it("covers every current objective × coach level × ambition × load state without a model",()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
  const cases=planningCases(),coverage=matrixCoverage(cases);
  expect(Object.keys(OBJECTIVE_PROFILE)).toHaveLength(13);
  expect(cases).toHaveLength(13*4*5*2);
  expect(coverage.missingPairs).toEqual([]);
  const fetch=vi.spyOn(globalThis,"fetch").mockImplementation(()=>{throw new Error("offline_matrix_network_forbidden");});
  const supplemental=supplementaryPlanningCases();
  expect(supplemental).toHaveLength(80);
  const rows=[...cases,...supplemental].map(evaluatePlanningCase);
  expect(rows).toHaveLength(cases.length+supplemental.length);
  expect(rows.every(r=>r.configuration==="passed")).toBe(true);
  for(const row of rows) {
    expect(row.preparationIssues.daily_capacity_conflict??0).toBe(0);
    expect(row.preparationIssues.layout_day_ban_conflict??0).toBe(0);
    expect(row.preparationIssues.catalogue_id_not_roundtripped??0).toBe(0);
    expect(row.preparationIssues.canonical_prescription_contract_conflict??0).toBe(0);
  }
  expect(fetch).not.toHaveBeenCalled();
  const output=process.env.TFCL_GLOBAL_QA_OUTPUT;
  if(output){
   mkdirSync(output,{recursive:true});
   writeFileSync(`${output}/matrix.json`,JSON.stringify({coverage:{...coverage,supplementalCases:supplemental.length,formats:["continuous","lcw_3day"]},rows},null,2));
   const header=["case","objective","level","requested_ambition","effective_ambition","load","physiology","data_quality","format","constraints","duration","intermediate","weeks","configuration","contract_issues","whole_plan","safety","science"];
   const csv=[header,...rows.map(r=>[r.id,r.objective,r.level,r.ambition,r.effectiveAmbition,r.load,r.physiology,r.dataQuality,r.format??"continuous",r.constraints,r.duration,r.intermediate,r.weeks,r.configuration,JSON.stringify(r.preparationIssues),r.completePlanConstruction,r.sportingSafety,r.scientificValidation])].map(row=>row.map(v=>JSON.stringify(String(v??""))).join(",")).join("\n");
   writeFileSync(`${output}/matrix.csv`,csv+"\n");
  }
  expect(rows.every(r=>r.scientificValidation==="requires_human_review")).toBe(true);
  expect(rows.every(r=>r.completePlanConstruction!==undefined)).toBe(true);
  fetch.mockRestore();vi.useRealTimers();
 },180000);
});
