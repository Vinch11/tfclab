import { computePacingEnvelope } from "@/lib/v2/pacingEnvelopeEngine";
import { it } from "vitest";
it("vince", () => {
  for (const half of [5993, 5700]) {
    const e = computePacingEnvelope({
      vlamaxEffectif: { value: 0.6, confidence: 0.8 } as any,
      tteEffectif: { tte_min: 75, confidence: 0.95 } as any,
      fatmax: null as any, potentielPhysiologiqueScore: 70, fatigueIndex: null,
      raceObjective: "Semi" as any, sport: "run",
      vma: 16.5, paceThreshold: 272, weight: 75,
      ambition: "competitor" as any, cpWkg: null, wPrimeJkg: null,
      predictedDurationMin: 100, vmaKmh: 16.5,
      raceChronos: { time_5k_sec: 1241, time_10k_sec: 2660, time_half_sec: half } as any,
    } as any);
    const c = e.boundary.centerPct / 0.9;
    console.log(half, "centerVMA", e.boundary.centerPct, "→%seuil", Math.round(c), "allure", Math.round(272 / (c/100)), (e as any).centerAdjustments);
  }
});
