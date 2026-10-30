/** Exhaustive V1 physiology assessment: proposals, not attested prescriptions. */
import {WorkoutLibrary} from "@/lib/workoutLibrary";
import type {LibraryWorkout,PhysiologicalIntent} from "@/types/workoutLibrary";
import {V2_REVIEWED_SOURCE_EVIDENCE} from "./v2ReviewedSourceEvidence";
type State="documented"|"reviewed_literal"|"proposed"|"ambiguous"|"insufficient";
export type SourceAssessment={id:string;sport:string;objective:string;durationMin:[number,number];main:string;zones:string[];intent:PhysiologicalIntent|null;alternatives:PhysiologicalIntent[];state:State;reason:string;provenance:string;autoApproved:false};
const re={
 recovery:/r[eé]cup|r[eé]g[eé]n|regen|recovery|d[eé]crassage/i,
 aerobic:/endurance|a[eé]robi|easy|facile|aisance|fondamental|lt1/i,
 threshold:/seuil|threshold|mlss|sweet.spot|tempo/i,
 vo2:/vo2|vo₂|vma|pma|maximal.a[eé]robie/i,
 technique:/technique|[eé]ducatif|drills?|coordination|[eé]conomie/i,
 strength:/force|musculation|squat|deadlift|soulev[eé]|charges?|r[eé]sistance musculaire/i,
 mobility:/mobilit[eé]|souplesse|gainage|proprioception|stabilit[eé]/i,
 race:/comp[eé]tition|allure sp[eé]cifique|race.pace|simulation.course/i,
 neuromuscular:/strides|lignes? droites?|acc[eé]l[eé]rations?|sprints?|cadence/i,
 brick:/transition v[eé]lo.course|encha[iî]nement v[eé]lo.course|brick/i,
};
function classify(c:LibraryWorkout):SourceAssessment{
 const mainBlocks=c.structure.filter(p=>/^(main|principal|corps)/i.test(p.part.trim()));
 const main=mainBlocks.map(p=>p.text).join(" | ");
 const zones=[...new Set(mainBlocks.flatMap(p=>p.zones.map(z=>z.trim().toUpperCase())))].sort();
 const common={id:c.id,sport:String(c.sport),objective:c.objectif,durationMin:c.durationMin,main,zones,autoApproved:false as const};
 if(c.physiology?.primary&&c.physiology.rationale?.trim())return {...common,intent:c.physiology.primary,alternatives:[],state:"documented",reason:c.physiology.rationale,provenance:"curated_v1"};
 const ev=V2_REVIEWED_SOURCE_EVIDENCE[c.id];
 if(ev&&main.includes(ev.sourceMainExcerpt))return {...common,intent:ev.intent,alternatives:[],state:"reviewed_literal",reason:ev.reason,provenance:"reviewed_main_text"};
 if(!main.trim())return {...common,intent:null,alternatives:[],state:"insufficient",reason:"Main block missing",provenance:"none"};
 const text=main+" "+c.objectif;
 const isStrength=/strength|renforcement/i.test(c.sport);
 const isMixed=/mixed|brick/i.test(c.sport);
 const easy=zones.length>0&&zones.every(z=>z==="Z1"||z==="Z2");
 const allZ1=zones.length===1&&zones[0]==="Z1";
 const high=zones.some(z=>/^Z[4-9]|VO2|ANA/.test(z));
 const alt:PhysiologicalIntent[]=[];
 const add=(ok:boolean,v:PhysiologicalIntent)=>{if(ok&&!alt.includes(v))alt.push(v);};
 add(isMixed&&re.brick.test(text),"mixed_specific");
 add(re.recovery.test(text)&&allZ1,"recovery");
 add(!isStrength&&!isMixed&&re.aerobic.test(text)&&easy,"moderate_lt1");
 add(!isStrength&&re.threshold.test(text)&&high,"mlss");
 add(!isStrength&&re.vo2.test(text)&&high,"vo2max");
 add(!isStrength&&re.race.test(text),"race_specific");
 add(!isStrength&&re.neuromuscular.test(text),"neuromuscular");
 add(re.technique.test(text),"technique_economy");
 add(isStrength&&re.mobility.test(text),"mobility_prevention");
 add(isStrength&&re.strength.test(text),"strength_endurance");
 const unique=alt.length===1&&!["mlss","vo2max"].includes(alt[0]);
 return {...common,intent:unique?alt[0]:null,alternatives:alt,
  state:unique?"proposed":alt.length?"ambiguous":"insufficient",
  reason:!alt.length?"No sufficiently discriminating main stimulus":
    alt.length>1?"Multiple possible stimuli: human review required":
    ["mlss","vo2max"].includes(alt[0])?"Physiological intensity not established by zone or workout label":
    "Candidate from Main structure and objective; no athlete-specific validation",
  provenance:alt.length?"algorithmic_structure_hypothesis":"none"};
}
export function assessAllV1Sources():SourceAssessment[]{return WorkoutLibrary.map(classify);}
export function fullV1AssessmentSummary(){
 const records=assessAllV1Sources();
 return {total:records.length,initiallyMissing:records.filter(x=>x.state!=="documented").length,
 counts:Object.fromEntries(["documented","reviewed_literal","proposed","ambiguous","insufficient"].map(s=>[s,records.filter(r=>r.state===s).length])),
 uniqueIds:new Set(records.map(r=>r.id)).size,autoApproved:0 as const};
}
