import { describe, expect, it } from "vitest";
import { originDisplaySource, readThresholdOrigin, withThresholdOrigin, isMeasuredOrigin } from "@/lib/zones/thresholdOrigin";
import { metricSourceLabel } from "@/lib/coachingCompass/presentation";
import { computeRunningCompassDiagnostic } from "@/engines/diagnostic/runningCompassDiagnostic";

describe("provenance de la VMA", () => {
  it("se range dans field_sources.vma et se relit", () => {
    const fs = withThresholdOrigin({ ftp: { source: "cp_test" } }, "vma", "vma_test");
    expect(readThresholdOrigin(fs, "vma")).toBe("vma_test");
    expect(readThresholdOrigin(fs, "ftp")).toBe("cp_test");
  });
  it("devient une source lisible dans les rapports, sans ancrer les zones", () => {
    expect(metricSourceLabel(originDisplaySource("vma_test")!)).toBe("🏃 Test terrain déclaré");
    expect(metricSourceLabel(originDisplaySource("entered")!)).toBe("✍️ Saisie coach");
    expect(metricSourceLabel(originDisplaySource("watch")!)).toBe("⌚ Montre");
    expect(originDisplaySource(null)).toBeNull();
    expect(isMeasuredOrigin("vma_test")).toBe(false);
  });
  it("le diagnostic course affiche la provenance déclarée", () => {
    const base = { objectif: "IM", ambition: "competitor" as const, age: 40, vma: 13, vo2max: 48, vo2Source: "shared", paceThresholdSecPerKm: 305, vlamax: null, tte: null, economy: null, drift: null };
    expect(computeRunningCompassDiagnostic(base).axes.find(a => a.key === "vma")?.source).toBe("snapshot");
    expect(computeRunningCompassDiagnostic({ ...base, vmaSource: "observed" }).axes.find(a => a.key === "vma")?.source).toBe("observed");
  });
});
