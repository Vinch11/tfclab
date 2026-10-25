import { describe, it, expect, vi } from "vitest";
import { validatePlan, weekHasRaceDay } from "../planValidator";
import { isRaceEventTitle } from "../../../../supabase/functions/_shared/raceDayIdentity";
import { exportAIPlanToPDF } from "@/lib/aiPlanPDFExport";
import { openPrintableHTML } from "@/lib/openPrintableHTML";
import type { ParsedPlan, ParsedSession } from "@/lib/aiPlanParser";
vi.mock("@/lib/openPrintableHTML", () => ({ openPrintableHTML: vi.fn() }));
const session = (weekNumber: number, dayIndex: number, title: string, sport: string, details: string): ParsedSession => ({ weekNumber, dayIndex, dayName: dayIndex === 6 ? "Dimanche" : "Samedi", weekTheme: "Test", phase: "build", title, sport, details, isRest: false });
// Transcription ciblée des pages 120/132 ; ce n'est pas le JSON original.
const fixture = (): ParsedPlan => ({ title: "703", totalWeeks: 32, phases: [], weeks: [
 { weekNumber: 8, theme: "Course B", phase: "build", sessions: [session(8, 5, "COURSE : 10 km WSL", "run", "Compétition officielle 19 décembre 2026")] },
 { weekNumber: 28, theme: "Build", phase: "build", sessions: [session(28, 5, "Brique Simulation Compétition 70.3", "brick", "Vélo: 120min en Z3. Course: 40min en Z3-Z4a. Cool-down: 5min marche.")] },
 { weekNumber: 32, theme: "Course A", phase: "taper", sessions: [session(32, 0, "Natation facile", "swim", "30min Z2"), session(32, 1, "Vélo facile", "bike", "40min Z2"), session(32, 6, "COURSE : Ironman 70.3 Tours", "brick", "Compétition Objectif A : Natation 1.9km régulière ; Vélo 90km ; CAP 21.1km.")] },
] });
describe("PDF réel 32 semaines — identité et résumé du contrôle sauvegarde", () => {
 it("PDF et validateur voient le même triathlon brick, simulation reste entraînement", () => {
  const plan = fixture(); const before = structuredClone(plan);
  expect(weekHasRaceDay(plan.weeks[2])).toBe(true);
  expect(isRaceEventTitle(plan.weeks[2].sessions.find(s => s.sport === "brick")!)).toBe(true);
  expect(weekHasRaceDay(plan.weeks[1])).toBe(false);
  const result = validatePlan(plan, "703", undefined, [8, 32]);
  expect(result.issues.filter(i => ["race_day", "race_day_unexpected"].includes(i.rule) && i.severity === "error")).toEqual([]);
  exportAIPlanToPDF(plan, undefined, new Date("2026-10-26T00:00:00Z"));
  expect(vi.mocked(openPrintableHTML).mock.calls.flat().join(" ")).toContain("COURSE : Ironman 70.3 Tours");
  expect(plan).toEqual(before);
 });
 it("une vraie course non déclarée reste bloquante sans annoncer une finale absente", () => {
  const plan = fixture(); plan.weeks[1].sessions[0].title = "COURSE : épreuve non déclarée";
  const result = validatePlan(plan, "703", undefined, [8, 32]);
  expect(result.issues.some(i => i.rule === "race_day_unexpected" && i.week === 28 && i.severity === "error")).toBe(true);
  expect(result.summary.overallComment).not.toContain("Jour de course absent");
 });
 it("une véritable absence reste bloquante et sa semaine est indiquée", () => {
  const plan = fixture(); plan.weeks[2].sessions = [session(32, 0, "Endurance", "swim", "30min Z2"), session(32, 1, "Endurance", "bike", "45min Z2"), session(32, 2, "Endurance", "run", "30min Z2")];
  const result = validatePlan(plan, "703", undefined, [8, 32]);
  expect(result.issues.some(i => i.rule === "race_day" && i.week === 32 && i.severity === "error")).toBe(true);
  expect(result.summary.overallComment).toContain("S32");
 });
});
