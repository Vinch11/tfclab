import {describe,it,expect} from "vitest";
import {examineD113SourceDurationRepairs} from "../../../../experimental/workout-v2/d113S3SourceDurationRepairs";
describe("D1.13 non-destructive source-bound S3 edit search",()=>{
 it("never asserts approval without native revalidation",()=>{
  const result=examineD113SourceDurationRepairs();
  expect(result).toHaveLength(3);
  for(const row of result){
   expect(row.nativeRevalidationRequired).toBe(true);
   expect(row.sportApproved).toBe(false);
   expect(row.mayPersist).toBe(false);
   if(row.status==="candidate_unvalidated"){
    const original=row.sessions.reduce((n,s)=>n+s.before,0);
    expect(row.sessions.reduce((n,s)=>n+s.after,0)).toBe(original);
    for(const s of row.changed){
     expect(s.sourceMin).not.toBeNull();expect(s.sourceMax).not.toBeNull();
     expect(s.after).toBeGreaterThanOrEqual(s.sourceMin!);
     expect(s.after).toBeLessThanOrEqual(s.sourceMax!);
    }
   }else expect(row.reasons.length).toBeGreaterThan(0);
  }
  console.log("D113_SOURCE_BOUNDED_WEEK3="+JSON.stringify(result.map(r=>({
   profile:r.profile,status:r.status,reasons:r.reasons,changed:r.changed,
   missingSource:r.sessions.filter(s=>s.sourceMin===null).map(s=>s.id),
   ratios:r.ratios
  }))));
 },30000);
});
