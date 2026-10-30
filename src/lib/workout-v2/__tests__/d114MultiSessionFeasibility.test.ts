import {describe,it,expect} from "vitest";
import {examineD114MultiSession} from "../../../../experimental/workout-v2/d114MultiSessionFeasibility";
describe("D1.14 source-bounded multisession feasibility",()=>{
 it("is reproducible and refuses to claim sport approval",()=>{
  const a=examineD114MultiSession();
  expect(a).toEqual(examineD114MultiSession());
  expect(a).toHaveLength(3);
  for(const row of a){
   expect(row.mayPersist).toBe(false);
   expect(row.mayExport).toBe(false);
   expect(row.sportApproved).toBe(false);
   if(row.status==="source_bounded_candidate_unvalidated")
    expect(row.transfersMin).toBeGreaterThanOrEqual(0);
   else expect(row.reasons.length).toBeGreaterThan(0);
  }
  console.log("D114_MULTI_SESSION_S3="+JSON.stringify(a));
 },30000);
});
