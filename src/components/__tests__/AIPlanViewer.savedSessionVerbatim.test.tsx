import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ParsedPlan } from "@/lib/aiPlanParser";
vi.mock("@/contexts/CloudDataContext", () => ({ useCloudDataContext: () => ({ athletes: [], snapshots: [] }) }));
vi.mock("@/lib/aiPlanPDFExport", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/aiPlanPDFExport")>(), exportAIPlanToPDF: vi.fn() }));
import { AIPlanViewer } from "../AIPlanViewer";
import { exportAIPlanToPDF } from "@/lib/aiPlanPDFExport";
import { isRunOnlyHighIntensityBikeSession } from "@/lib/aiPlanWorkoutEnricher";

const DETAILS = "15 min Z1 puis 3×8 min Z4 (r 4 min Z1) puis 10 min Z1";
const plan = (sport: string): ParsedPlan => ({ title: "QA vélo", totalWeeks: 1, phases: [], weeks: [{ weekNumber: 1, phase: "base", theme: "T", sessions: [{
  weekNumber: 1, weekTheme: "T", phase: "base", dayIndex: 0, dayName: "Lundi", sport, title: "Vélo seuil Z4", details: DETAILS,
  durationMin: 70, zones: ["Z4"], custom: true, catalogId: null, isRest: false,
}] }] } as unknown as ParsedPlan);

describe("lecteur : séance sauvegardée affichée telle quelle", () => {
  it("vélo Z4 dans un plan marathon : aucun Z2 substitué, avertissement explicite, PDF reçoit la même séance", () => {
    const p = plan("bike");
    const before = JSON.stringify(p);
    render(<AIPlanViewer plan={p} gapContext={{ objective: "Marathon" }} />);
    expect(screen.getByTestId("bike-intensity-warning")).toBeInTheDocument();
    fireEvent.click(screen.getAllByText(/Vélo seuil/)[0]);
    expect(document.body.textContent).not.toMatch(/dégradé en Z2/);
    expect(document.body.textContent).not.toMatch(/3×8 min Z2/);
    fireEvent.click(screen.getByRole("button", { name: /PDF paysage/ }));
    expect(vi.mocked(exportAIPlanToPDF).mock.calls.at(-1)![0].weeks[0].sessions[0].details).toBe(DETAILS);
    expect(JSON.stringify(p)).toBe(before);
  });
  it("préserve les autres disciplines : pas d'avertissement en triathlon ni pour la course", () => {
    expect(isRunOnlyHighIntensityBikeSession({ sport: "bike", title: "Z4", details: DETAILS }, "Ironman")).toBe(false);
    expect(isRunOnlyHighIntensityBikeSession({ sport: "run", title: "Z4", details: DETAILS }, "Marathon")).toBe(false);
    expect(isRunOnlyHighIntensityBikeSession({ sport: "bike", title: "Z4", details: DETAILS }, "Marathon")).toBe(true);
  });
});
