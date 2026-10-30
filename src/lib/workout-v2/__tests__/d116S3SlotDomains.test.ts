import {describe,it,expect} from "vitest";
import {explainD116S3Domains} from "../../../../experimental/workout-v2/d115V2S3Repair";
describe("D1.16 actual S3 V2 duration slot bottlenecks",()=>{
 it("shows all real slots, fixed key sessions and adjustable endurance, without approval",()=>{
  const rows=explainD116S3Domains();
  expect(rows).toHaveLength(3);
  const baselineRecoveryOnKey = [4,5,5];
  rows.forEach((r,index)=>{
   expect(r.week).toBe(3);expect(r.mayExport).toBe(false);expect(r.sportApproved).toBe(false);
   expect(r.slots.length).toBeGreaterThan(0);
   for(const s of r.slots)if(s.key)expect(s.eligibleForDurationChange).toBe(false);
   // Selection ordering must not make the pre-existing recovery-on-key defect worse.
   expect(r.slots.filter(s=>s.keyOnRecoveryCard).length).toBeLessThanOrEqual(baselineRecoveryOnKey[index]);
  });
  console.log("D116_S3_SLOT_DOMAINS="+JSON.stringify(rows));
 },30000);
});
