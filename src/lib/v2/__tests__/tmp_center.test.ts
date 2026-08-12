import { describe,it } from "vitest";
import { computePacingEnvelope } from "@/lib/v2/pacingEnvelopeEngine";
const mk=(vla:number,tte:number)=>computePacingEnvelope({vlamaxEffectif:{value:vla,confidence:0.8,source:"test"} as any,tteEffectif:{tte_min:tte,source:"observed"} as any,fatmax:null,potentielPhysiologiqueScore:75,fatigueIndex:null,raceObjective:"marathon" as any,sport:"run",predictedDurationMin:200,ambition:"competitor" as any} as any);
describe("center",()=>{it("varies",()=>{for(const [v,t] of [[0.30,65],[0.45,45],[0.70,30]] as const){const r=mk(v,t)!;console.log(v,t,r.boundary.lowPct,r.boundary.centerPct,r.boundary.highPct,r.centerBasePct,r.centerProfileAdjustment,r.centerAdjustments);}});});
