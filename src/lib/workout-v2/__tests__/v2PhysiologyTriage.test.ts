import {describe,it,expect} from "vitest";
import {auditV2PhysiologyTriage} from "../../../../experimental/workout-v2/v2PhysiologyTriage";
describe("Full V1 physiology triage, no unreviewed stimulus claims",()=>{
 it("examines all 920, keeps the 25 curated proofs separate from proposals",()=>{
   const audit=auditV2PhysiologyTriage();
   expect(audit.total).toBe(920);
   expect(audit.byStatus.documented).toBe(25);
   expect(Object.values(audit.byStatus).reduce((a,b)=>a+b,0)).toBe(920);
   expect(audit.rows.every(r=>r.reviewRequired&&!r.autoApproved)).toBe(true);
   expect(audit.rows.filter(r=>r.status==="candidate_review").every(r=>r.suggestedIntent==="recovery")).toBe(true);
   console.log("V2_PHYSIOLOGY_TRIAGE_COUNTS="+JSON.stringify(audit.byStatus));
   console.log("V2_PHYSIOLOGY_RECOVERY_REVIEW_SAMPLE="+JSON.stringify(audit.rows.filter(r=>r.status==="candidate_review").slice(0,40)));
 });
});
