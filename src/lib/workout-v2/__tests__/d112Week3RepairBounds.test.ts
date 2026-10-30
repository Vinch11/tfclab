import {describe,it,expect} from "vitest";
import {examineD112Week3Bounds} from "../../../../experimental/workout-v2/d112Week3RepairBounds";
describe("D1.12 minimum minute transfer only (not calendar or athletic approval)",()=>{
 it("finds reproducible S3 numerical bounds without changing the actual plan",()=>{
  const a=examineD112Week3Bounds(3),b=examineD112Week3Bounds(3);
  expect(a).toEqual(b);expect(a).toHaveLength(3);
  expect(a.map(x=>x.profile)).toEqual(["aerobic_dominant","glycolytic_dominant","balanced_typical"]);
  for(const row of a){
   expect(row.status).toBe("lower_bound_only");
   expect(row.calendarFeasible).toBe(false);
   expect(row.individualDoseApproved).toBe(false);
   expect(row.baseline).not.toBeNull();expect(row.proposed).not.toBeNull();
   if(row.baseline&&row.proposed){
    expect(Object.values(row.baseline).reduce((a,b)=>a+b,0)).toBeGreaterThan(0);
    expect(Object.values(row.proposed).reduce((a,b)=>a+b,0)).toBe(Object.values(row.baseline).reduce((a,b)=>a+b,0));
   }
  }
  expect(a[0].transferMin).toBeGreaterThan(0);
  expect(a[1].transferMin).toBeGreaterThan(0);
  expect(a[2].transferMin).toBe(0);
  console.log("D112_S3_TRANSFER_LOWER_BOUNDS="+JSON.stringify(a));
 },30000);
 it("rejects invalid hypothetical tolerance",()=>expect(()=>examineD112Week3Bounds(-1)).toThrow("D112_INVALID_TOLERANCE"));
});
