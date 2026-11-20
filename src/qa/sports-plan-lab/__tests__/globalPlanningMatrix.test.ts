import { createHash } from 'node:crypto';
import planningBaseline from './planningContractBaseline.json';
import targetCalibrationTransitions from './targetCalibrationTransitions.json';
import { matrixCsv } from "../matrixCsv";
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
  const output=process.env.TFCL_GLOBAL_QA_OUTPUT;
  if(output){
   mkdirSync(output,{recursive:true});
   writeFileSync(`${output}/matrix.json`,JSON.stringify({coverage:{...coverage,supplementalCases:supplemental.length,formats:["continuous","lcw_3day"]},rows},null,2));
   const header=["case","objective","level","requested_ambition","effective_ambition","load","physiology","data_quality","format","constraints","duration","intermediate","weeks","configuration","contract_issues","whole_plan","safety","science"];
   const csv=matrixCsv([header,...rows.map(r=>[r.id,r.objective,r.level,r.ambition,r.effectiveAmbition,r.load,r.physiology,r.dataQuality,r.format??"continuous",r.constraints,r.duration,r.intermediate,r.weeks,r.configuration,JSON.stringify(r.preparationIssues),r.completePlanConstruction,r.sportingSafety,r.scientificValidation])]);
   writeFileSync(`${output}/matrix.csv`,csv);
  }
  for(const row of rows) {
    expect(row.preparationIssues.quota_contradiction??0).toBe(0);
    for(const residual of row.residuals??[]) if(residual.mechanical) {
      expect(residual.mechanical.admissibleByNecessaryBound).toBe(false);
      expect(residual.mechanical.branches.every(branch=>branch.reasons.length>0)).toBe(true);
      expect(residual.mechanical.branches.every(branch=>!branch.reasons.includes('minimum_above_total_max'))).toBe(true);
    }
    expect(row.preparationIssues.daily_capacity_conflict??0).toBe(0);
    expect(row.preparationIssues.layout_day_ban_conflict??0).toBe(0);
    expect(row.preparationIssues.catalogue_id_not_roundtripped??0).toBe(0);
    expect(row.preparationIssues.canonical_prescription_contract_conflict??0).toBe(0);
  }
  // Audit 2026-11-18: verify the ten intentional limiter-only changes before
  // replaying the original baseline. Do not rebaseline doses, warnings or pools.
  for (const transition of targetCalibrationTransitions) {
    expect(rows.find(row => row.id === transition.id)?.limiterOrder).toEqual(transition.after);
  }
  // Compare the unchanged training contracts with the original PR head. Only the
  // removal of unconfirmed VLamax/TTE priorities and the catalogue choices they
  // drive differed when replaying both versions on the same 600 profiles.
  const contracts = rows.map(({ weekly, limiterOrder, catalogueSignature: _catalogue, promptMaxChars: _prompt, residuals: _residuals, preparationIssues, ...fixed }) => ({
    ...fixed,
    weekly: weekly.map(({ catalog: _catalog, exclusions: _exclusions, ...week }) => week),
    limiterOrder: limiterOrder.filter(metric => !['VLamax', 'TTE'].includes(metric)),
    issues: Object.entries(preparationIssues).filter(([key]) => !['catalogue_slot_duration_unavailable', 'catalogue_week_diversity_limited'].includes(key)),
  }));
  expect(createHash('sha256').update(JSON.stringify(contracts)).digest('hex')).toBe('d221cdb99d1334b5b6c6f523541abfa3cd403b1f2c12cf8d4bcbd877f6ef72d3');
  // Also lock the new priorities, actual catalogue choices and preparation issues.
  const invariants=rows.map(({preparationIssues,weekly,residuals:_residuals,...identity})=>({...identity,
    preparationIssues:Object.fromEntries(Object.entries(preparationIssues).filter(([key])=>!key.startsWith('catalogue_week_'))),
    weekly:weekly.map(({missingSports:_missingSports,...week})=>week),
    limiterOrder:targetCalibrationTransitions.find(change=>change.id===identity.id)?.before ?? identity.limiterOrder}));
  expect(createHash('sha256').update(JSON.stringify(invariants)).digest('hex')).toBe('8bc0026bdae78626c303923369e42a04cf6ff63ee38e8d054709a7d40641e2a9');
  expect(rows.filter(r=>Object.keys(r.preparationIssues).some(k=>k.startsWith('preflight_'))).map(r=>r.id)).toEqual(planningBaseline.blockedIds);
  expect(rows.reduce((sum,r)=>sum+(r.preparationIssues.catalogue_week_sport_shortfall??0),0)).toBe(0);
  const diversity=rows.flatMap(r=>(r.residuals??[]).flatMap(w=>(w.catalogue??[]).map(c=>({id:r.id,week:w.week,sport:c.sport}))));
  const priorAlerts = planningBaseline.catalogueAlerts.filter(alert =>
    !(alert.id === '703:highly_trained:competitor:unknown' && alert.sport === 'brick' && [4,8,11].includes(alert.week)));
  expect(diversity).toEqual(priorAlerts);
  expect(fetch).not.toHaveBeenCalled();
  expect(rows.every(r=>r.scientificValidation==="requires_human_review")).toBe(true);
  expect(rows.every(r=>r.completePlanConstruction!==undefined)).toBe(true);
  fetch.mockRestore();vi.useRealTimers();
 },300000);
});
