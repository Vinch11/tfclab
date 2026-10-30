import {describe,it,expect} from "vitest";
import {examineD111WeeklyProfiles} from "../../../../experimental/workout-v2/d111WeekwiseRatios";
describe("D1.11 per-week 70.3 duration evidence, experimental only",()=>{
 it("does not permit pooled S1-S3 ratios to certify individual weeks",()=>{
  const rows=examineD111WeeklyProfiles();
  expect(rows).toHaveLength(9);
  expect(new Set(rows.map(x=>x.profile)).size).toBe(3);
  for(const row of rows){
   expect([1,2,3]).toContain(row.week);
   expect(row.volumeMin).toBeGreaterThan(0);
   expect(row.sportApproved).toBe(false);
   expect(row.canExport).toBe(false);
   if(row.sourceVerified){
    expect(row.nominal?.policyActivated).toBe(false);
    expect(row.plus3?.canCertifyPlan).toBe(false);
    expect(row.nominal?.denominatorSec).toBeGreaterThan(0);
   }else{
    expect(row.nominal).toBeNull();
    expect(row.reasonCodes.length).toBeGreaterThan(0);
   }
  }
  console.log("D111_WEEKWISE_EVIDENCE="+JSON.stringify(rows.map(r=>({
   profile:r.profile,week:r.week,volumeMin:r.volumeMin,
   sourceVerified:r.sourceVerified,reasons:r.reasonCodes,
   nominal:r.nominal?.percentageBounds,nominalStatus:r.nominal?.status,
   plus3Status:r.plus3?.status,criticalCodes:r.originalCriticalCodes
  }))));
 });
});

describe("D1.11 historical blocker ledger",()=>{
 it("pins exact unsupported weeks without relaxing native Lorang checks",()=>{
  const rows=examineD111WeeklyProfiles();
  const outside=rows.filter(r=>r.plus3?.status==="fully_accounted_outside_bands")
    .map(r=>r.profile+":"+r.week);
  expect(outside).toEqual(["aerobic_dominant:3","glycolytic_dominant:3"]);
  const native=rows.filter(r=>r.originalCriticalCodes.includes("lorang_categories"));
  expect(native).toHaveLength(8);
  expect(rows.every(r=>r.sportApproved===false&&r.canExport===false)).toBe(true);
 });
});
