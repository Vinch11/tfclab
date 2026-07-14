import { describe, it, expect } from "vitest";
import { jsonPlanToParsedPlan } from "@/lib/plan/jsonPlanToParsedPlan";
import type { MergedPlan } from "@/lib/plan/mergePlanChunks";
import { extractCatalogId } from "@/lib/catalogIdExtractor";

describe("Phase 1C-A — catalogId structuré (rebranchage)", () => {
  it("jsonPlanToParsedPlan expose catalogId sans préfixer title", () => {
    const merged: MergedPlan = {
      title: "Plan test",
      phases: [],
      totalWeeks: 1,
      weeks: [{
        weekNumber: 1, theme: "S1", phase: "base",
        sessions: [{
          weekNumber: 1, weekTheme: "S1", phase: "base",
          dayName: "Lundi", dayIndex: 0,
          sport: "run", title: "Fractionné VMA courte",
          details: "10×400m @ 105% VMA",
          isRest: false, isKeySession: true,
          catalogId: "A_RUN_VMA_COURTE_10x400", custom: false,
          durationMin: 60, zones: ["Z5"],
        }],
      }],
    };
    const parsed = jsonPlanToParsedPlan(merged);
    const s = parsed.weeks[0].sessions[0];
    expect(s.title).toBe("Fractionné VMA courte");
    expect(s.title.startsWith("A_RUN_")).toBe(false);
    expect(s.catalogId).toBe("A_RUN_VMA_COURTE_10x400");
  });

  it("extractCatalogId : structuredCatalogId prime sur la regex title/details", () => {
    // Cas 1 : id structuré fourni → utilisé tel quel, même si texte ne matche pas
    expect(extractCatalogId("Séance libre", "sans marker", "A_BIKE_SEUIL_LONG"))
      .toBe("A_BIKE_SEUIL_LONG");
    // Cas 2 : id structuré vide/null → fallback regex sur title
    expect(extractCatalogId("Fait B_RUN_SEUIL_30MIN aujourd'hui", "", null))
      .toBe("B_RUN_SEUIL_30MIN");
    // Cas 3 : aucun id nulle part
    expect(extractCatalogId("séance improvisée", "", null)).toBeNull();
  });
});
