import { describe, it, expect } from "vitest";
import { computeTTEEffectif } from "@/lib/tteEffectif";

// =============================================
// TTE EFFECTIF — SPORT-AWARE SELECTION (bike vs run)
// Vérifie que le champ TTE observé pertinent est utilisé selon `sport`
// et l'inférence via `objectif`.
// =============================================

describe("computeTTEEffectif — sport-aware", () => {
  it("sport=bike → utilise tte_observed_min (ignore run)", () => {
    const r = computeTTEEffectif({
      ftp: 280,
      tte_mode: "OBSERVED",
      tte_observed_min: 55,
      tte_observed_min_run: 40,
      sport: "bike",
      objectif: "IM",
    });
    expect(r.source).toBe("observed");
    expect(r.tte_min).toBe(55);
  });

  it("sport=run → utilise tte_observed_min_run (ignore bike)", () => {
    const r = computeTTEEffectif({
      ftp: 280,
      tte_mode: "OBSERVED",
      tte_observed_min: 55,
      tte_observed_min_run: 42,
      sport: "run",
      objectif: "Marathon",
    });
    expect(r.source).toBe("observed");
    expect(r.tte_min).toBe(42);
  });

  it("sport=run sans tte run mais bike présent → NE retombe PAS sur bike (source estimated/unknown)", () => {
    const r = computeTTEEffectif({
      ftp: 280,
      tss_7d: 500,
      tte_mode: "OBSERVED",
      tte_observed_min: 55,
      tte_observed_min_run: null,
      sport: "run",
      objectif: "Marathon",
    });
    expect(r.tte_min).not.toBe(55);
  });

  it("inférence: objectif Marathon + seul TTE run → sport run auto", () => {
    const r = computeTTEEffectif({
      ftp: 280,
      tte_mode: "OBSERVED",
      tte_observed_min: null,
      tte_observed_min_run: 44,
      objectif: "Marathon",
    });
    expect(r.tte_min).toBe(44);
    expect(r.source).toBe("observed");
  });

  it("inférence: objectif IM (tri) + TTE bike seul → sport bike auto", () => {
    const r = computeTTEEffectif({
      ftp: 280,
      tte_mode: "OBSERVED",
      tte_observed_min: 58,
      tte_observed_min_run: null,
      objectif: "IM",
    });
    expect(r.tte_min).toBe(58);
    expect(r.source).toBe("observed");
  });
});
