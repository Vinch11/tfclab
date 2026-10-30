/**
 * D1.8 — apply ONE structured V2 candidate to a CLONE of the genuine
 * D1.2 candidate and replay unchanged native sporting checks.
 *
 * No production imports, Nolio writes, Supabase writes, policy changes,
 * automatic coach approval, or V1 ID forgery. Tests are OFFLINE QA only.
 */
import type { ParsedPlan, ParsedSession } from "@/lib/aiPlanParser";
import type { MergedPlan } from "@/lib/plan/mergePlanChunks";
import { validateWeeklyQuotas } from "@/lib/plan/validateWeeklyQuotas";
import { computeFinalValidationIssues } from "@/lib/plan/qa/finalValidation";
import { validatePlan } from "@/engines/plan/planValidator";
import { preparePlanningCaseContext, type PlanningCase } from "@/qa/sports-plan-lab/planningMatrix";
import { experimentalDeclaredRaceWeekNumbers } from "./d1EngineReference";
import { projectD12Profile } from "./d12Projection";
import type { D12Profile } from "./d12CohortAudit";
import { composeD17Block, type D17Target } from "./d17BlockComposition";
import type { PlanV2Preview } from "./planBridge";

export type D18Issue = { code: string; week?: number; severity: string; message?: string };
export type D18Result =
  | { status:"refused"; reasons:string[]; originalCritical:number; editedPlan:null; canPublish:false }
  | {
      status:"experiment_revalidated_coach_review";
      originalCritical:number;
      /** Counted from the SAME unchanged validators on both sides. */
      nativeBefore:D18Issue[];
      nativeAfter:D18Issue[];
      remainingCritical:number;
      introducedCritical:D18Issue[];
      resolvedCritical:D18Issue[];
      editedPlan:ParsedPlan; // offline only; not a production-ready plan
      replaced:{week:number;day:string;sport:string;oldV1Id:string;modelId:string;durationMin:number};
      raceWeek:12;
      referenceRatioPolicyUnchanged:true;
      V1LibraryUnchanged:true;
      canPublish:false;
      canPersist:false;
      canExportNolio:false;
      sportsApproved:false;
      coachReviewRequired:true;
    };
const CRITICAL=new Set(["error","critical","blocking"]);
const critical=(issues:readonly D18Issue[])=>issues.filter(i=>CRITICAL.has(i.severity));
const key=(x:D18Issue)=>[x.code,x.week??"all",x.severity,x.message??""].join("|");
const spec=(profile:D12Profile):PlanningCase=>({
  id:"D1_"+profile,objective:"703",level:"trained",ambition:"age_group",
  load:"known_synthetic",physiology:profile,constraints:"unrestricted",
  duration:"native",intermediate:false,
});
const refuse=(reason:string, originalCritical:number):D18Result=>({
  status:"refused",reasons:[reason],originalCritical,editedPlan:null,canPublish:false,
});
function sameActiveSessions(actual:ParsedPlan, expected:ReturnType<typeof composeD17Block>):boolean {
  if(expected.calendar.length!==28 || actual.weeks.length!==4) return false;
  for(const day of expected.calendar) {
    const week=actual.weeks.find(w=>w.weekNumber===day.week);
    if(!week)return false;
    const found=week.sessions.filter(s=>!s.isRest&&s.dayName===day.day)
      .map(s=>({sport:s.sport,id:s.catalogId??null,minutes:s.durationMin??0,key:!!s.isKeySession}));
    if(JSON.stringify(found)!==JSON.stringify(day.sessions))return false;
  }
  return true;
}
/** EXACT original checker calls; no rules or severity removed. */
function nativeChecks(plan:ParsedPlan, profile:D12Profile):D18Issue[] {
  const {prepared}=preparePlanningCaseContext(spec(profile));
  const athlete=prepared.athleteData;
  const config={...prepared.planConfig,planStartDate:"2026-10-26"};
  const raceWeeks=experimentalDeclaredRaceWeekNumbers(config);
  if(raceWeeks.length!==1||raceWeeks[0]!==12)throw new Error("D18_RACE_WEEK_NOT_12");
  const merged:MergedPlan={
    ...plan,
    weeks:plan.weeks.map(w=>({...w,sessions:w.sessions.map(s=>({
      ...s,isKeySession:!!s.isKeySession,catalogId:s.catalogId??null,
      custom:!!s.custom,durationMin:s.durationMin??0,zones:s.zones??[],
    }))})),
  };
  const q=validateWeeklyQuotas(merged,plan.weeklyQuotas??{});
  const validation=validatePlan(plan,config.objective,config.prohibitions,raceWeeks,
    config.identifiedLimitersRaw,undefined,athlete,undefined,
    {sessionsPerWeek:config.sessionsPerWeek,maxSessionsPerDay:config.maxSessionsPerDay,maxDoubleDaysPerWeek:config.maxDoubleDaysPerWeek},
    config.injuryRisk,config.ambition,config.constraints,
    config.raceGoals?.some(g=>g.raceFormat==="lcw_3day"),config.deloadCadenceWeeks,
    config.ambitionMeta?{trainingLevel:config.ambitionMeta.trainingLevel,trainingLevelSource:config.ambitionMeta.trainingLevelSource}:undefined,
    config.raceGoals,config.planStartDate,{maxAvailableWeeklyHours:config.weeklyHours},
    undefined,config.strengthSessionsPerWeek);
  const final=computeFinalValidationIssues(plan,[],{
    objective:config.objective??"",ambition:config.ambition??"finisher",
    vmaKmh:athlete.vma,thresholdPaceSecPerKm:athlete.paceThresholdSecPerKm,
  });
  return [
    ...q.map(i=>({code:i.code,week:i.weekNumber,severity:i.severity,message:i.reason})),
    ...validation.issues.map(i=>({code:i.rule,week:i.week,severity:i.severity,message:i.message})),
    ...final.issues.map(i=>({code:i.rule,severity:i.severity,message:i.message})),
  ];
}
/**
 * Mutation is only on a detached copy. Both before/after run the same full
 * offline validators. Their output is a QA comparison, NOT a sports GO.
 */
export function experimentD18Replacement(
  profile:D12Profile, request:D17Target, chosenModelId:string,
):D18Result {
  const view=composeD17Block(profile,[request]);
  const baseline=view.originals.criticalCount;
  if(view.status!=="experimental_28_day_preview")return refuse("D18_PREVIEW_UNAVAILABLE",baseline);
  if(view.alternatives.length!==1)return refuse("D18_ALTERNATIVE_COUNT",baseline);
  const option=view.alternatives[0];
  if(option.status!=="structured_candidate_coach_review")
    return refuse(option.reasons[0]??"D18_NO_STRUCTURED_CANDIDATE",baseline);
  const proposals=option.proposals.filter(p=>p.modelId===chosenModelId);
  if(proposals.length!==1)return refuse("D18_MODEL_NOT_UNIQUE_OR_UNAVAILABLE",baseline);
  const proposal=proposals[0];
  const preview:PlanV2Preview=proposal.preview;
  if(preview.canAutoInsert!==false || preview.canExportNolio!==false ||
    preview.planSession.custom!==true || preview.planSession.catalogId!==null ||
    preview.plannedDurationSec!==request.expectedDurationMin*60 ||
    proposal.stimulusAudit.individuallySupportedIds.length!==0)
    return refuse("D18_PREVIEW_CONTRACT_CHANGED",baseline);
  const built=projectD12Profile(profile,[],true);
  const original=built.candidatePlan;
  if(!original||built.status!=="candidate"||!sameActiveSessions(original,view))
    return refuse("D18_SOURCE_D1_DRIFT_OR_UNAVAILABLE",baseline);
  const edited=structuredClone(original);
  const week=edited.weeks.find(w=>w.weekNumber===request.week);
  const dayIndex=["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"].indexOf(request.day);
  const index=week?.sessions.findIndex(s=>!s.isRest&&s.dayIndex===dayIndex&&
    s.sport===request.sport&&s.catalogId===request.expectedV1Id&&
    s.durationMin===request.expectedDurationMin)??-1;
  if(!week||index<0)return refuse("D18_STALE_SOURCE_SESSION",baseline);
  const source=week.sessions[index];
  const changed:ParsedSession={
    ...source,title:preview.planSession.title,details:preview.planSession.details,
    durationMin:preview.planSession.durationMin,custom:true,catalogId:null,
    /** The V2 model is a candidate, NOT a verified key dose. */
    isKeySession:false,zones:[],
  };
  week.sessions.splice(index,1,changed);
  const before=nativeChecks(original,profile);
  const after=nativeChecks(edited,profile);
  const beforeCritical=critical(before),afterCritical=critical(after);
  const beforeKeys=new Set(beforeCritical.map(key));
  const afterKeys=new Set(afterCritical.map(key));
  return {
    status:"experiment_revalidated_coach_review",originalCritical:baseline,
    nativeBefore:before,nativeAfter:after,
    remainingCritical:afterCritical.length,
    introducedCritical:afterCritical.filter(i=>!beforeKeys.has(key(i))),
    resolvedCritical:beforeCritical.filter(i=>!afterKeys.has(key(i))),
    editedPlan:edited,
    replaced:{week:request.week,day:request.day,sport:request.sport,
      oldV1Id:request.expectedV1Id,modelId:chosenModelId,durationMin:changed.durationMin??0},
    raceWeek:12,referenceRatioPolicyUnchanged:true,V1LibraryUnchanged:true,
    canPublish:false,canPersist:false,canExportNolio:false,
    sportsApproved:false,coachReviewRequired:true,
  };
}
