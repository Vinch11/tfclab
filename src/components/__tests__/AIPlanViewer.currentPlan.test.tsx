import { normalizeRepairSport } from "../../../supabase/functions/_shared/repairSportingEquivalence";
import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { validateSessionCataloguePlan } from "@/lib/plan/sessionCatalogueValidation";
vi.mock("@/contexts/CloudDataContext", () => ({ useCloudDataContext: () => ({ athletes: [], snapshots: [] }) }));
vi.mock("@/lib/aiPlanPDFExport", () => ({ exportAIPlanToPDF: vi.fn() }));
vi.mock("@/components/SessionReplaceDialog", async importOriginal => ({
 ...await importOriginal<object>(),
 SessionReplaceDialog: ({ open, onChoose }: { open: boolean; onChoose: (value: unknown) => void }) => open ?
  <button onClick={() => onChoose(WorkoutLibrary.find(w => w.id === "A_RUN_Z2_EASY"))}>Choisir fiche sûre</button> : null,
}));
import { AIPlanViewer } from "../AIPlanViewer";
import { exportAIPlanToPDF } from "@/lib/aiPlanPDFExport";
import { restoreStructuredPlan } from "@/lib/plan/restoreStructuredPlan";
const fixture = (): ParsedPlan => ({ title: "Fixture", totalWeeks: 1, phases: [], weeks: [{ weekNumber: 1, phase: "base", theme: "Fondation", sessions: [{
 weekNumber: 1, weekTheme: "Fondation", phase: "base", dayIndex: 0, dayName: "Lundi", sport: "run", title: "Sortie longue", details: "60min Z2",
 durationMin: 60, zones: ["Z2"], custom: false, catalogId: "A_RUN_DURABILITY_LONG", isRest: false,
}] }] });
describe("état courant contrôlé : affichage / export / diagnostic / sauvegarde", () => {
 it("une édition sauvegardée sans quotas est conservée après fermeture et export de la version rouverte", () => {
  let archive = "";
  function Harness() {
   const [plan, setPlan] = useState(fixture());
   return <AIPlanViewer plan={plan} onPlanChange={setPlan} onSaveToPlan={() => { archive = JSON.stringify(plan); }} />;
  }
  const first = render(<Harness />);
  fireEvent.click(screen.getByTitle("Remplacer cette séance par une séance de la bibliothèque"));
  fireEvent.click(screen.getByText("Choisir fiche sûre"));
  fireEvent.click(screen.getByRole("button", { name: /Sauvegarder au planning/ }));
  first.unmount();
  const reopened = restoreStructuredPlan(JSON.parse(archive))!;
  expect(reopened).not.toHaveProperty("weeklyQuotas");
  expect(reopened.weeks[0].sessions[0]).toMatchObject({ durationMin: 60, custom: false, catalogId: "A_RUN_Z2_EASY" });
  expect(validateSessionCataloguePlan(reopened).filter(i => i.severity === "error")).toEqual([]);
  const second = render(<AIPlanViewer plan={reopened} />);
  fireEvent.click(screen.getByRole("button", { name: /PDF paysage/ }));
  expect(vi.mocked(exportAIPlanToPDF).mock.calls.at(-1)![0].weeks).toEqual(JSON.parse(archive).weeks);
  second.unmount();
 });

 it("une édition remonte au parent, remplace l'ID et conserve la durée sans modifier l'original", () => {
  const original = fixture(), before = structuredClone(original), saved = vi.fn();
  let current = original;
  function Harness() {
   const [plan, setPlan] = useState(original); current = plan;
   return <><output data-testid="diagnostic">{validateSessionCataloguePlan(plan).filter(i => i.severity === "error").length}</output>
    <AIPlanViewer plan={plan} onPlanChange={setPlan} onSaveToPlan={() => saved(plan)} /></>;
  }
  render(<Harness />);
  expect(Number(screen.getByTestId("diagnostic").textContent)).toBeGreaterThan(0);
  fireEvent.click(screen.getByTitle("Remplacer cette séance par une séance de la bibliothèque"));
  fireEvent.click(screen.getByText("Choisir fiche sûre"));
  expect(validateSessionCataloguePlan(current).filter(i => i.severity === "error")).toEqual([]);
  expect(screen.getByTestId("diagnostic")).toHaveTextContent("0");
  fireEvent.click(screen.getByRole("button", { name: /PDF paysage/ }));
  fireEvent.click(screen.getByRole("button", { name: /Sauvegarder au planning/ }));
  const exported = vi.mocked(exportAIPlanToPDF).mock.calls.at(-1)![0];
  expect(exported.weeks).toBe(current.weeks);
  expect(saved.mock.calls[0][0]).toBe(current);
  expect(current.weeks[0].sessions[0]).toMatchObject({ durationMin: 60, custom: false, catalogId: "A_RUN_Z2_EASY", dayIndex: 0, weekNumber: 1 });
  expect(normalizeRepairSport(current.weeks[0].sessions[0].sport)).toBe("run");
  expect(original).toEqual(before);
 });
});
