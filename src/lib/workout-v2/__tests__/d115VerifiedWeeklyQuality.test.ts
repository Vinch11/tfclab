import {describe,it,expect} from "vitest";
import {D12_PROFILES,projectD12Profile} from "../../../../experimental/workout-v2/d12Projection";
describe("D1.15: verified weekly quality is not inferred from key-slot flags",()=>{
 it("refuses the unchanged synthetic cases when no per-slot dose is independently reviewed",()=>{
  const output=D12_PROFILES.map(profile=>{
   const original=projectD12Profile(profile);
   const guarded=projectD12Profile(profile,[],false,true);
   expect(original.status).toBe("candidate");
   expect(guarded.status).toBe("refused");
   expect(guarded.reason).toBe("reviewed_quality_unavailable_week_1");
   expect(guarded.canExport).toBe(false);
   expect(guarded.canPersist).toBe(false);
   expect(original.realPlanValidated).toBe(false);
   return {profile,ordinary:original.status,guarded:guarded.status,reason:guarded.reason};
  });
  console.log("D115_GATED_WEEKLY_QUALITY="+JSON.stringify(output));
 },30000);
});
