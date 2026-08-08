import { describe, it, expect } from "vitest";
import { computeRunDurabilityProxy } from "@/lib/durability/runDurabilityFromRecords";
describe("run durability proxy", () => {
  it("estimates TTE from 5k/10k/half", () => {
    const r = computeRunDurabilityProxy([
      { distanceM: 5000, timeSec: 1080 },
      { distanceM: 10000, timeSec: 2250 },
      { distanceM: 21097, timeSec: 4920 },
    ], 1000 / 205);
    expect(r).not.toBeNull();
    console.log(r);
  });
  it("returns null without span", () => {
    expect(computeRunDurabilityProxy([{ distanceM: 5000, timeSec: 1080 }], 4.5)).toBeNull();
  });
});
