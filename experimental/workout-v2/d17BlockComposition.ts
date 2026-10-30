/**
 * D1.7: 28-day D1 reference schedule + V2 alternative proposals in ONE
 * experimental view. No V1 session is replaced and no issue is reclassified.
 * An annotation is NOT plan validation or a saved prescription.
 */
import type { DayLower } from "@/lib/plan/planSchema";
import type { WorkoutV2Input } from "./instantiate";
import { D12_PROFILES, projectD12Profile } from "./d12Projection";
import type { D12Profile } from "./d12CohortAudit";
import { preparePlanningCaseContext, type PlanningCase } from "@/qa/sports-plan-lab/planningMatrix";
import { auditD14DurationRatios, type D14RatioEvidence } from "./d14RatioEvidence";
import { proposeD16V2ForSlot, type D16CoachRequest, type D16Provenance, type D16Result } from "./d16V2SlotProposals";

const DAYS = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"] as const satisfies readonly DayLower[];
type Sport = "swim" | "bike" | "run" | "brick" | "strength";
const SPORTS: readonly Sport[] = ["swim","bike","run","brick","strength"];
export interface D17Target {
  week:number;
  day:DayLower;
  sport:"swim"|"bike"|"run";
  /** Optimistic concurrency key: source must match the actual selected V1 card. */
  expectedV1Id:string;
  expectedDurationMin:number;
  coachRequest:D16CoachRequest;
  anchors:WorkoutV2Input["anchors"];
  provenance:D16Provenance;
  readiness:WorkoutV2Input["readiness"];
  pain:boolean;
  recoveryConcern:boolean;
}
export interface D17Day {
  date:string;week:number;day:DayLower;
  sessions:Array<{sport:Sport;id:string|null;minutes:number;key:boolean}>;
  rest:boolean;
}
export interface D17Alternative {
  target:{week:number;day:DayLower;sport:D17Target["sport"]};
  status:D16Result["status"]|"rejected";
  reasons:string[];
  modelIds:string[];
  /** The actual V2 sidecars (not substitutions in the base calendar). */
  proposals:D16Result["proposals"];
}
export interface D17Block {
  profile:D12Profile;
  status:"experimental_28_day_preview"|"refused";
  reason:string|null;
  calendar:D17Day[];
  originals:{weeks:number;issues:ReturnType<typeof projectD12Profile>["criticalDetails"];criticalCount:number;volumeMin:number[]};
  ratio:D14RatioEvidence;
  alternatives:D17Alternative[];
  realCoachPlanValidated:false;
  sourceV1Preserved:true;
  targetCompetitionWeek:12;
  maySave:false;mayExport:false;mayReplaceNativeValidator:false;
}
const spec=(profile:D12Profile):PlanningCase=>({
  id:"D1_"+profile,objective:"703",level:"trained",ambition:"age_group",
  load:"known_synthetic",physiology:profile,constraints:"unrestricted",
  duration:"native",intermediate:false,
});
const date=(offset:number)=>new Date(Date.UTC(2026,9,26+offset)).toISOString().slice(0,10);
const emptyRatio=()=>auditD14DurationRatios([]);
/** Genuine D1 experimental four-week output + optional V2 alternatives. */
export function composeD17Block(profile:D12Profile,requests:readonly D17Target[]=[]):D17Block {
  if(!D12_PROFILES.includes(profile))throw new Error("D17_UNKNOWN_PROFILE");
  const base=projectD12Profile(profile);
  const invalid=base.status!=="candidate"||base.weeksConstructed!==4||
    base.weeklyPreview.some(w=>w.week<1||w.week>4)||
    base.weeklyPreview.length!==4;
  const fixed={profile,realCoachPlanValidated:false as const,sourceV1Preserved:true as const,
    targetCompetitionWeek:12 as const,maySave:false as const,mayExport:false as const,
    mayReplaceNativeValidator:false as const};
  const originals={weeks:base.weeksConstructed,issues:base.criticalDetails,
    criticalCount:base.countCritical,volumeMin:base.weeklyPreview.map(w=>w.volumeMin)};
  if(invalid)return {...fixed,originals,status:"refused",reason:base.reason??"D17_REFERENCE_NOT_BUILT",
    calendar:[],ratio:emptyRatio(),alternatives:[]};
  const calendar:D17Day[]=Array.from({length:28},(_,offset)=>{
    const week=Math.floor(offset/7)+1,day=DAYS[offset%7];
    const entries=base.weeklyPreview.find(w=>w.week===week)!.sessions;
    const sessions=entries.filter(s=>s.day===day && SPORTS.includes(s.sport as Sport))
      .map(s=>({sport:s.sport as Sport,id:s.id,minutes:s.minutes,key:s.key}));
    return {date:date(offset),week,day,sessions,rest:sessions.length===0};
  });
  const originalCount=base.weeklyPreview.reduce((n,w)=>n+w.sessions.length,0);
  if(calendar.reduce((n,d)=>n+d.sessions.length,0)!==originalCount) {
    return {...fixed,originals,status:"refused",reason:"D17_DAY_MAPPING_LOSS",
      calendar:[],ratio:emptyRatio(),alternatives:[]};
  }
  const {prepared}=preparePlanningCaseContext(spec(profile));
  const limiters=prepared.planConfig.identifiedLimitersRaw??[];
  const alternatives:D17Alternative[]=[];
  const seen=new Set<string>();
  for(const request of requests) {
    const target={week:request.week,day:request.day,sport:request.sport};
    const key=`${request.week}|${request.day}|${request.sport}`;
    const reject=(code:string)=>alternatives.push({target,status:"rejected",reasons:[code],modelIds:[],proposals:[]});
    if(seen.has(key)){reject("duplicate_slot_request");continue;}
    seen.add(key);
    const day=calendar.find(x=>x.week===request.week&&x.day===request.day);
    const matches=day?.sessions.filter(s=>s.sport===request.sport)??[];
    if(matches.length!==1){reject("D17_SLOT_ABSENT_OR_AMBIGUOUS");continue;}
    const selected=matches[0];
    if(!selected.id || selected.id!==request.expectedV1Id||
      selected.minutes!==request.expectedDurationMin){reject("D17_SELECTED_V1_CHANGED");continue;}
    if(!Number.isSafeInteger(selected.minutes)||selected.minutes<=0){reject("D17_DURATION_INVALID");continue;}
    const currentWeek=base.weeklyPreview.find(w=>w.week===request.week);
    if(!currentWeek){reject("D17_WEEK_NOT_IN_PREVIEW");continue;}
    const proposal=proposeD16V2ForSlot({
      goal:"half",phase:"base",level:"trained",
      slot:{week:request.week,day:request.day,sport:request.sport,
        durationSec:selected.minutes*60,key:selected.key,weekType:request.week===4?"recovery":"load"},
      profileLimiters:limiters,
      coachRequest:request.coachRequest,
      anchors:request.anchors,provenance:request.provenance,
      readiness:request.readiness,pain:request.pain,recoveryConcern:request.recoveryConcern,
    });
    alternatives.push({target,status:proposal.status,reasons:proposal.reasons,
      modelIds:proposal.proposals.map(p=>p.modelId),proposals:proposal.proposals});
  }
  const ratio=auditD14DurationRatios(base.weeklyPreview.filter(w=>w.week<=3)
    .flatMap(w=>w.sessions.map(s=>({sport:s.sport,durationMin:s.minutes}))));
  return {...fixed,status:"experimental_28_day_preview",reason:null,calendar,originals,ratio,alternatives};
}

/** Zero trust: no profile can be promoted by a lack of requested reviews. */
export function compareD17ThreeProfiles():D17Block[] {
  return D12_PROFILES.map(profile=>composeD17Block(profile));
}
