import {describe,expect,it} from "vitest";
import {auditV3Catalogue,evaluateV3Workout,v3FullCatalogue,v3PilotCatalogue} from "../../scripts/library-v3/catalogueRuntime";
import {resolveV3IntensityTargets} from "../../scripts/library-v3/resolveV3Intensity";
import {buildDetV3ContractFromCatalogue} from "./v31-v3-catalogue";

const card=(id:string)=>{const w=v3FullCatalogue.workouts.find(x=>x.id===id);if(!w)throw Error(id);return w;};
describe("V3 800-candidate catalogue — verifiable source contracts",()=>{
  it("retains 400 historic sources plus 400 new entries in exact 200 per sport distribution",()=>{
    expect(v3PilotCatalogue.workouts).toHaveLength(400);
    expect(v3FullCatalogue.workouts).toHaveLength(800);
    expect(v3FullCatalogue.counts).toEqual({bike:200,run:200,swim:200,strength:200});
    expect(new Set(v3FullCatalogue.workouts.map(x=>x.id)).size).toBe(800);
    expect(auditV3Catalogue(v3FullCatalogue)).toEqual([]);
    expect(v3FullCatalogue.workouts.every(x=>x.status==="candidate"&&x.automaticSelection===false&&
      x.evidence.sessionSpecificValidation===false&&x.prescription.admissibility.requiresIndividualCoachReview===true)).toBe(true);
  });
  it("documents all five requirements for EVERY historical and new source with no empty limiter or missing knob",()=>{
    for(const w of v3FullCatalogue.workouts){
      const p=w.prescription;
      expect(p.physiologicalIntent.statement,w.id).toBe(w.focus);
      expect(p.physiologicalIntent.limiterKeys.length,w.id).toBeGreaterThan(0);
      expect(p.individualization.anchors.length,w.id).toBeGreaterThan(0);
      expect(p.individualization.missingAnchorBehavior,w.id).toBe("unresolved_no_numeric_target");
      expect(p.parameters.length,w.id).toBeGreaterThan(0);
      expect(new Set(p.parameters.map(x=>x.path)).size,w.id).toBe(p.parameters.length);
      expect(p.duration.formula,w.id).toContain("SUM(");
      expect(p.admissibility.requiresLoadAndFatigueCheck,w.id).toBe(true);
      expect(p.admissibility.requiresWeeklySportingValidation,w.id).toBe(true);
      expect(p.admissibility.minimumRecoveryHours,w.id).toBe(w.minimumRecoveryHours);
    }
  });
  it("rejects a corrupted candidate and does not treat metadata presence as scientific approval",()=>{
    const cloned=structuredClone(v3FullCatalogue);
    cloned.workouts[0].prescription.physiologicalIntent.limiterKeys=[];
    expect(auditV3Catalogue(cloned)).toContain("V3P_BIKE_001:INTENT_OR_LIMITERS_MISMATCH");
    const unreviewed=buildDetV3ContractFromCatalogue([]);
    expect(unreviewed.report.sourceCount).toBe(800);
    expect(unreviewed.report.accepted).toHaveLength(0);
    expect(unreviewed.report.rejected).toHaveLength(800);
  });
  it("leaves missing FTP and PMA unresolved and computes watts only from supplied athlete values",()=>{
    const easy=card("V3P_BIKE_106");
    expect(resolveV3IntensityTargets(easy).status).toBe("unresolved");
    const anchored=resolveV3IntensityTargets(easy,{bikeFtpWatts:300});
    expect(anchored.status).toBe("resolved");
    expect(anchored.targets.find(t=>t.domain==="moderate_lt1")).toMatchObject({
      metric:"watts",min:165,max:225,confidence:"model"});
    const vo2=card("V3P_BIKE_151"); // VO2 4-minute fractions
    const noPma=resolveV3IntensityTargets(vo2,{bikeFtpWatts:300});
    expect(noPma.missing).toContain("bike_pma_w_validated_above_vo2_floor");
    const known=resolveV3IntensityTargets(vo2,{bikeFtpWatts:300,bikePmaWatts:390});
    expect(known.targets.find(t=>t.domain==="vo2max")).toMatchObject({min:315,max:390});
  });
  it("computes threshold running pace and forbids unsupplied sprint or vVO2 anchors",()=>{
    const run=card("V3P_RUN_136"); // MLSS controlled reps
    expect(resolveV3IntensityTargets(run).missing).toContain("run_threshold_pace_sec_per_km");
    const result=resolveV3IntensityTargets(run,{runThresholdPaceSecPerKm:240});
    expect(result.status).toBe("resolved");
    const target=result.targets.find(x=>x.domain==="mlss");
    expect(target?.metric).toBe("sec_per_km");
    expect(target?.min).toBeCloseTo(240/1.03,1);
    expect(target?.max).toBeCloseTo(240/0.97,1);
  });
  it("keeps CSS as an explicitly approved MLSS proxy, never a general invented swim pace",()=>{
    const swim=card("V3P_SWIM_156");
    expect(evaluateV3Workout(swim).status).toBe("confirmed"); // timed intervals
    expect(resolveV3IntensityTargets(swim,{cssSecPer100m:95}).status).toBe("unresolved");
    const approved=resolveV3IntensityTargets(swim,{cssSecPer100m:95,coachConfirmsCssAsMlssProxy:true,
      swimDomainPacesSecPer100m:{recovery:135}});
    expect(approved.status).toBe("resolved");
    expect(approved.targets.find(t=>t.domain==="mlss")?.source).toBe("coach_approved_css_proxy");
    expect(evaluateV3Workout(card("V3P_SWIM_001")).status).toBe("unresolved"); // real distance still requires swimmer pace
  });
  it("reserves exact time for new strength, but preserves legacy duration uncertainty",()=>{
    const timed=card("V3P_STRENGTH_101");
    const d=evaluateV3Workout(timed);
    expect(d.status).toBe("confirmed");
    expect(d.seconds&&d.seconds%60).toBe(0);
    expect(timed.blocks.some(b=>b.kind==="repeat")).toBe(true);
    expect(resolveV3IntensityTargets(timed).status).toBe("unresolved");
    expect(resolveV3IntensityTargets(timed,{coachValidatedStrengthLoadAndRpe:true}).status).toBe("resolved");
    const legacy=card("V3P_STRENGTH_021");
    expect(evaluateV3Workout(legacy).status).toBe("estimated");
  });
  it("allows only coach-approved, in-range recovery and target repetition edits",()=>{
    const id="V3P_BIKE_146";
    const base={id,athleteLevel:"trained" as const,athleteLevelSource:"manual" as const,
      objective:"IM",allPrerequisitesChecked:true as const,individualCoachApproval:true as const};
    const denied=buildDetV3ContractFromCatalogue([{...base,overrides:{"1.betweenSec":240}}]);
    expect(denied.report.rejected.find(x=>x.id===id)?.reason).toContain("v3_rest_change_requires_coach_permission");
    const allowed=buildDetV3ContractFromCatalogue([{...base,overrides:{"1.betweenSec":240},allowWorksetChange:true}]);
    expect(allowed.report.accepted.find(x=>x.id===id)).toBeDefined();
    expect(allowed.report.accepted.find(x=>x.id===id)?.durationMin).toEqual([50,50]);
    const bad=buildDetV3ContractFromCatalogue([{...base,overrides:{"1.betweenSec":999},allowWorksetChange:true}]);
    expect(bad.report.accepted.find(x=>x.id===id)).toBeUndefined();
  });
});
