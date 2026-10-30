import {describe,it,expect} from "vitest";
import {examineD115Cohort} from "../../../../experimental/workout-v2/d115V2S3Copy";
import {projectD12Profile} from "../../../../experimental/workout-v2/d12Projection";
describe("D1.15: exact V2 structured copy-edit plus unchanged native validation",()=>{
 it("does not confuse synthetic V2 duration with an approved physiological prescription",()=>{
  const rows=examineD115Cohort();
  expect(rows).toHaveLength(3);
  for(const row of rows){
   expect(row.sportsApproved).toBe(false);
   expect(row.canPublish).toBe(false);
   expect(row.canPersist).toBe(false);
   expect(row.canExport).toBe(false);
   if(row.status==="copy_edited_native_revalidated"){
    expect(row.changes).toHaveLength(2);
    expect(row.afterRatio.status).toBe("fully_accounted_inside_bands");
    expect(row.afterRatio.canCertifyPlan).toBe(false);
    expect(row.originalCalendarUnchanged).toBe(true);
    expect(row.editedPlan.totalWeeks).toBe(12);
    const unchanged=projectD12Profile(row.profile,[],true).candidatePlan!;
    expect(unchanged.weeks.find(w=>w.weekNumber===3)?.sessions
      .filter(s=>s.catalogId===null).length).not.toBeGreaterThan(
      row.editedPlan.weeks.find(w=>w.weekNumber===3)?.sessions
      .filter(s=>s.catalogId===null).length??0);
    for(const c of row.changes){
     expect(c.steps.reduce((sum,s)=>sum+s.durationSec,0)).toBe(c.newMinutes*60);
     expect(c.oldMinutes).not.toBe(c.newMinutes);
    }
   } else expect(row.reasons.length).toBeGreaterThan(0);
  }
  console.log("D115_V2_COPY_NATIVE="+JSON.stringify(rows.map(r=>
    r.status==="blocked"?{profile:r.profile,status:r.status,reasons:r.reasons}:
    {profile:r.profile,status:r.status,
     changes:r.changes.map(({steps,...rest})=>({...rest,stepCount:steps.length})),
     before:r.beforeRatio.percentageBounds,after:r.afterRatio.percentageBounds,
     remainingCritical:r.remainingCritical.map(i=>i.code),
     introducedCritical:r.introducedCritical.map(i=>i.code)}
  )));
 },45000);
});
