import {describe,expect,it} from "vitest";
import {compareD17ThreeProfiles,composeD17Block,type D17Target} from "../../../../experimental/workout-v2/d17BlockComposition";
import {preparePlanningCaseContext,type PlanningCase} from "@/qa/sports-plan-lab/planningMatrix";
import {D12_PROFILES} from "../../../../experimental/workout-v2/d12CohortAudit";

const limiterFor=(profile:typeof D12_PROFILES[number])=>{
  const {prepared}=preparePlanningCaseContext({
    id:"D1_"+profile,objective:"703",level:"trained",ambition:"age_group",
    load:"known_synthetic",physiology:profile,constraints:"unrestricted",
    duration:"native",intermediate:false,
  } satisfies PlanningCase);
  return prepared.planConfig.identifiedLimitersRaw?.[0]??"NOT_CERTIFIED_LIMITER";
};
const createRequest=(profile:typeof D12_PROFILES[number]):D17Target=>{
  const candidate=composeD17Block(profile);
  const selected=candidate.calendar.flatMap(day=>day.sessions
    .filter(session=>day.week<=3 && session.sport==="bike" && session.key && session.id && session.minutes>=50)
    .map(session=>({day,session}))).sort((a,b)=>b.session.minutes-a.session.minutes)[0];
  if(!selected)throw new Error("D17_BIKE_REFERENCE_SLOT_MISSING");
  return {
    week:selected.day.week,day:selected.day.day,sport:"bike",
    expectedV1Id:selected.session.id!,expectedDurationMin:selected.session.minutes,
    coachRequest:{limiter:limiterFor(profile),focus:"threshold",coachFocusReviewed:true,
      justification:"Synthetic coach review hypothesis, not individual benefit confirmation"},
    anchors:{ftpW:{value:280,verified:false,sport:"bike"}},
    provenance:{anchorEvidenceId:null,verifiedForProvisionalTarget:false},
    readiness:"ready",pain:false,recoveryConcern:false,
  };
};

describe("D1.7 genuine D1 28-day layout with V2 sidecar, fail closed",()=>{
  it("keeps all 28 calendar days and native contradictions for three profiles",()=>{
    const blocks=compareD17ThreeProfiles();
    expect(blocks.map(x=>x.profile)).toEqual([...D12_PROFILES]);
    expect(blocks.map(x=>x.originals.criticalCount)).toEqual([3,4,4]);
    expect(blocks.map(x=>x.originals.volumeMin)).toEqual([
      [360,395,430,300],[360,395,430,300],[360,395,430,300],
    ]);
    for(const b of blocks){
      expect(b.status).toBe("experimental_28_day_preview");
      expect(b.calendar).toHaveLength(28);
      expect(b.calendar[0].date).toBe("2026-10-26");
      expect(b.calendar[27].date).toBe("2026-11-22");
      expect(b.calendar.filter(d=>d.day==="lundi").every(d=>d.rest)).toBe(true);
      expect(b.calendar.filter(d=>!d.rest).length).toBeGreaterThanOrEqual(20);
      expect(b.calendar.filter(d=>d.week<=3).reduce((n,d)=>n+d.sessions.reduce((m,s)=>m+s.minutes,0),0)).toBe(1185);
      expect(b.alternatives).toEqual([]);
      expect(b.ratio.status).toBe("non_conclusive");
      expect(b.ratio.sharePct.bike).toBeNull();
      expect(b.ratio.sharePct.run).toBeNull();
      expect(b.originals.issues.some(i=>i.code==="sport_ratio")).toBe(true);
      expect(b.originals.issues.some(i=>i.code==="race_day")).toBe(false);
      expect(b.targetCompetitionWeek).toBe(12);
      expect(b.maySave).toBe(false);
      expect(b.mayExport).toBe(false);
      expect(b.mayReplaceNativeValidator).toBe(false);
      expect(b.sourceV1Preserved).toBe(true);
      expect(b.realCoachPlanValidated).toBe(false);
    }
  });

  it("binds V2 proposal to an ACTUAL slot, refuses missing evidence without changing the original",()=>{
    const original=composeD17Block("aerobic_dominant");
    const req=createRequest("aerobic_dominant");
    const result=composeD17Block("aerobic_dominant",[req]);
    expect(result.calendar).toEqual(original.calendar);
    expect(result.originals).toEqual(original.originals);
    expect(result.alternatives).toHaveLength(1);
    expect(result.alternatives[0].status).toBe("blocked");
    expect(result.alternatives[0].reasons).toContain("anchor_provenance_unverified");
    expect(result.alternatives[0].proposals).toEqual([]);
    expect(result.ratio).toEqual(original.ratio);
  });

  it("rejects tampered V1 identifier and duplicate slot requests, without rewriting sessions",()=>{
    const req=createRequest("glycolytic_dominant");
    const result=composeD17Block("glycolytic_dominant",[
      {...req,expectedV1Id:"FAKE"},req,req,
    ]);
    expect(result.alternatives.map(x=>x.status)).toEqual(["rejected","rejected","rejected"]);
    expect(result.alternatives.map(x=>x.reasons[0])).toEqual([
      "D17_SELECTED_V1_CHANGED","duplicate_slot_request","duplicate_slot_request",
    ]);
    expect(result.calendar.flatMap(d=>d.sessions).some(s=>s.id==="FAKE")).toBe(false);
  });

  it("a controlled synthetic verified anchor can generate a V2 option on a real day, NEVER a certified dose",()=>{
    const req=createRequest("balanced_typical");
    const result=composeD17Block("balanced_typical",[{
      ...req,
      anchors:{ftpW:{value:280,verified:true,sport:"bike"}},
      provenance:{anchorEvidenceId:"CONTROLLED_QA_EVIDENCE_ONLY",verifiedForProvisionalTarget:true},
    }]);
    expect(result.calendar).toHaveLength(28);
    expect(result.originals.criticalCount).toBe(4);
    const alt=result.alternatives[0];
    expect(alt.status).toBe("structured_candidate_coach_review");
    expect(alt.modelIds).toContain("V2_BIKE_02");
    const candidate=alt.proposals[0];
    expect(candidate.chosen.plannedDurationSec).toBe(req.expectedDurationMin*60);
    expect(candidate.preview.planSession.catalogId).toBeNull();
    expect(candidate.preview.planSession.custom).toBe(true);
    expect(candidate.preview.canAutoInsert).toBe(false);
    expect(candidate.stimulusAudit.individuallySupportedIds).toEqual([]);
    expect(result.maySave).toBe(false);
    expect(result.mayExport).toBe(false);
    expect(result.originals.issues.some(i=>i.code==="sport_ratio")).toBe(true);
  });
});
