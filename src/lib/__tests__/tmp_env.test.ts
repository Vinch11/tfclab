import { computePacingEnvelope } from "@/lib/v2/pacingEnvelopeEngine";
import { it } from "vitest";
it("vince", () => {
  for (const obj of ["Semi","70.3","IM"]) {
    for (const dur of [95, 105, 130]) {
      const e = computePacingEnvelope({
        vlamaxEffectif: { value: 0.6, confidence: 0.8 } as any,
        tteEffectif: { tte_min: 75, confidence: 0.95 } as any,
        fatmax: null as any, potentielPhysiologiqueScore: 70, fatigueIndex: null,
        raceObjective: obj as any, sport: "run",
        vma: 16.5, paceThreshold: 272, weight: 75,
        ambition: "competitor" as any, cpWkg: null, wPrimeJkg: null,
        predictedDurationMin: dur,
        vmaKmh: 16.5,
      } as any);
      console.log(obj, dur, JSON.stringify({ base: (e as any).centerBasePct, adj: (e as any).centerProfileAdjustment, b: e.boundary, ref: (e as any).referenceBase }));
    }
  }
});
