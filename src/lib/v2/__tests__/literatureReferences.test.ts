import { describe, it, expect } from "vitest";
import {
  LITERATURE_REFERENCES,
  REFERENCE_DISTRIBUTIONS,
  POPULATION_TARGETS,
  PLAUSIBILITY_BOUNDS,
  checkPlausibility,
} from "../literatureReferences";

describe("literatureReferences", () => {
  it("checkPlausibility flags run_vlamax=0.75 and passes 0.40", () => {
    expect(checkPlausibility("run_vlamax", 0.75)?.outOfDomain).toBe(true);
    expect(checkPlausibility("run_vlamax", 0.40)).toBeNull();
  });

  it("each POPULATION_TARGETS has coherent range (min < mean < max)", () => {
    for (const t of POPULATION_TARGETS) {
      const [min, max] = t.range;
      expect(min).toBeLessThan(t.mean);
      expect(t.mean).toBeLessThan(max);
    }
  });

  it("all REFERENCE_DISTRIBUTIONS source keys exist in LITERATURE_REFERENCES", () => {
    for (const disc of Object.values(REFERENCE_DISTRIBUTIONS)) {
      for (const tier of Object.values(disc)) {
        if (!tier) continue;
        expect(LITERATURE_REFERENCES[tier.vo2max.source]).toBeDefined();
        expect(LITERATURE_REFERENCES[tier.vlamax.source]).toBeDefined();
      }
    }
  });

  it("all POPULATION_TARGETS source keys exist in LITERATURE_REFERENCES", () => {
    for (const t of POPULATION_TARGETS) {
      expect(LITERATURE_REFERENCES[t.source]).toBeDefined();
    }
  });

  it("PLAUSIBILITY_BOUNDS min < max", () => {
    for (const b of PLAUSIBILITY_BOUNDS) expect(b.min).toBeLessThan(b.max);
  });
});
