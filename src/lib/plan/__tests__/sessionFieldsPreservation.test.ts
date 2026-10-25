import { estimateSessionDurationMin } from "@/lib/weeklyVolumeEstimator";
import { it, expect } from "vitest";
import { jsonPlanToParsedPlan } from "../jsonPlanToParsedPlan";
import type { MergedPlan } from "../mergePlanChunks";
it("conserve les données structurées, y compris identité custom et durée", () => {
 const s = { weekNumber: 32, weekTheme: "Course", phase: "taper", dayName: "Dimanche", dayIndex: 6,
  title: "COURSE : Ironman 70.3 Tours", details: "1.9km /90km /21.1km", sport: "brick", custom: true,
  durationMin: 330, zones: ["Z2", "Z3"], isKeySession: true, isRest: false, catalogId: null };
 const parsed = jsonPlanToParsedPlan({ title: "Test", totalWeeks: 32, phases: [], weeks: [{ weekNumber: 32, theme: "Course", phase: "taper", sessions: [s] }] } as MergedPlan);
 expect(parsed.weeks[0].sessions[0]).toEqual(s);
});
it("ne fabrique pas les propriétés historiquement absentes", () => {
 const session = { title: "Ancienne séance", sport: "run", dayIndex: 0 };
 const parsed = jsonPlanToParsedPlan({ title: "Legacy", totalWeeks: 1, phases: [], weeks: [{ weekNumber: 1, sessions: [session] }] } as unknown as MergedPlan);
 expect(parsed.weeks[0].sessions[0]).not.toHaveProperty("durationMin");
 expect(parsed.weeks[0].sessions[0]).not.toHaveProperty("custom");
});

it("la durée prescrite95 prévaut sur la durée catalogue100–150 pour l'affichage du volume", () => {
 expect(estimateSessionDurationMin({ title: "Sortie longue", sport: "run", details: "[ID: A_RUN_DURABILITY_LONG]", durationMin: 95, isRest: false } as never)).toBe(95);
});
