import {describe,it,expect} from "vitest";
import {examineD115ThreeProfiles,examineD115V2S3} from "../../../../experimental/workout-v2/d115V2S3Repair";
import {projectD12Profile} from "../../../../experimental/workout-v2/d12Projection";
describe("D1.15 — V2 exact-duration edited CLONE with unchanged native sport checks",()=>{
 it("reports actual structure and native issues for each S3 without approving anything",()=>{
  const before=projectD12Profile("aerobic_dominant",[],true);
  const original=structuredClone(before.candidatePlan);
  const rows=examineD115ThreeProfiles();
  expect(rows).toHaveLength(3);
  expect(rows.map(r=>r.profile)).toEqual(["aerobic_dominant","glycolytic_dominant","balanced_typical"]);
  for(const row of rows){
   expect(row.hasCoachApprovedDose).toBe(false);
   expect(row.mayPublish).toBe(false);expect(row.mayPersist).toBe(false);expect(row.mayExport).toBe(false);
   if(row.status==="candidate_native_rechecked"){
    expect(row.editedPlan?.weeks).toHaveLength(4);
    expect(row.editedPlan?.totalWeeks).toBe(12);
    expect(row.changes.length).toBeGreaterThan(0);
    expect(row.enduranceMinutesAfter).toBe(row.enduranceMinutesBefore);
    expect(row.nativeCriticalAfter).not.toBeNull();
    const edited=row.editedPlan!.weeks.find(w=>w.weekNumber===3)!;
    for(const change of row.changes){
     const s=edited.sessions.find(s=>s.dayName===change.day&&s.sport===change.sport&&
       s.durationMin===change.toMin&&s.title.includes(change.modelId));
     expect(s?.custom).toBe(true);expect(s?.catalogId).toBeNull();
     expect(s?.details).toContain("TOTAL EXACT");
     expect(s?.details).toContain("RÉVISION COACH OBLIGATOIRE");
    }
   }else expect(row.editedPlan).toBeNull();
  }
  expect(before.candidatePlan).toEqual(original);
  console.log("D115_S3_V2_NATIVE_REPLAY="+JSON.stringify(rows.map(({editedPlan,...r})=>r)));
 },60000);
 it("replays deterministically for unchanged synthetic S3",()=>{
  const a=examineD115V2S3("balanced_typical"),b=examineD115V2S3("balanced_typical");
  expect(a).toEqual(b);
  expect(a.status).toBe("no_change_needed");
 },25000);
});
