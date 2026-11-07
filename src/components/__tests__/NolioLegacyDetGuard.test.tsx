import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { blocksLegacyNolioExport, requiresStructuredNolioExport } from "@/lib/nolio/legacyExportGuard";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/contexts/CloudDataContext", () => ({ useCloudDataContext: () => ({ athletes: [], snapshots: [] }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { nolio_id: 42 } }) }) }) }),
  functions: { invoke },
  auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
} }));
import { AIPlanViewer } from "../AIPlanViewer";
import { NolioSendPlanCard } from "../NolioSendPlanCard";
import { NolioSessionButton, type NolioCtx } from "../NolioSessionButton";

const plan = (): ParsedPlan => ({ title: "Fixture", totalWeeks: 1, phases: [], weeks: [{
  weekNumber: 1, phase: "base", theme: "T", sessions: [{ weekNumber: 1, weekTheme: "T", phase: "base",
    dayIndex: 0, dayName: "Lundi", sport: "run", title: "Endurance", details: "30 min faciles",
    durationMin: 30, zones: ["Z2"], custom: false, catalogId: "A_RUN_Z2_EASY", isRest: false,
  }],
}] });
const detPlan = (): ParsedPlan => {
  const p = plan();
  Object.assign(p.weeks[0].sessions[0], { detStructuredWorkout: { schema: "det-structured-workout-v1" } });
  return p;
};

describe("legacy Nolio cannot rebuild saved DET prescriptions", () => {
  it("detects mixed archives, malformed provenance, missing structures and V3 sources without mutating them", () => {
    for (const candidate of [detPlan(), { ...plan(), _provenance: { engine: "det" } },
      { weeks: [{ sessions: [{ detStructureRefusal: { reason: "missing" } }] }] },
      { weeks: [{ sessions: [{ catalogId: "V3B_IM_TAPER_096" }] }] },
      { weeks: [{ sessions: [{ catalogId: "V3P_RUN_084" }] }] }]) {
      const before = JSON.stringify(candidate);
      expect(blocksLegacyNolioExport(candidate)).toBe(true);
      expect(JSON.stringify(candidate)).toBe(before);
    }
    expect(blocksLegacyNolioExport(plan())).toBe(false);
    expect(requiresStructuredNolioExport({ title: "DET endurance" })).toBe(false);
  });

  it("keeps the same common export controls when the plan changes from IA to DET", async () => {
    const view = render(<AIPlanViewer plan={plan()} athleteId="qa" startDate={new Date(2026, 10, 9)} />);
    await waitFor(() => expect(screen.getByTestId("common-nolio-export")).toBeInTheDocument());
    view.rerender(<AIPlanViewer plan={detPlan()} athleteId="qa" startDate={new Date(2026, 10, 9)} />);
    await waitFor(() => expect(screen.getByTestId("common-nolio-export")).toBeInTheDocument());
    expect(screen.queryByText("Envoyer vers Nolio")).not.toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("blocks the standalone whole-plan card", () => {
    render(<NolioSendPlanCard athleteId="qa" parsedPlan={detPlan()} planStartDate={new Date(2026, 10, 9)} />);
    expect(screen.getByRole("status")).toHaveTextContent("blocs sauvegardés");
    expect(screen.queryByRole("button", { name: /Envoyer/ })).not.toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("blocks the standalone session button before any confirmation or invoke", () => {
    const ctx: NolioCtx = { athleteId: "qa", nolioId: 42, planStartDate: new Date(2026, 10, 9), refs: {},
      isSent: () => false, markSent: vi.fn(), isSelected: () => false, toggleSelected: vi.fn(), setManySelected: vi.fn() };
    const { container } = render(<NolioSessionButton session={detPlan().weeks[0].sessions[0]} ctx={ctx} />);
    expect(container).toBeEmptyDOMElement();
    expect(invoke).not.toHaveBeenCalled();
  });
});
