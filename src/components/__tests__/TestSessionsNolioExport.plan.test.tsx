import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CoachingCompassInput } from "@/lib/coachingCompass/types";
import { buildTestChecklist, buildTestingPlan } from "@/lib/diagnostic/athleteTestChecklist";

const invoke = vi.fn(async () => ({ data: { sent: 4, errors: [] }, error: null }));
vi.mock("@/contexts/AthleteContext", () => ({ useAthletes: () => ({ currentAthlete: { id: "a1", nom: "Athlète test" } }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { nolio_id: 4242 } }) }) }) }),
    functions: { invoke: (...a: unknown[]) => (invoke as unknown as (...x: unknown[]) => unknown)(...a) },
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
const { TestSessionsNolioExport } = await import("../TestSessionsNolioExport");

const input = { objectif: "IM", ambition: "competitor", sportFocus: "triathlon", snapshotDate: "2026-11-12", ftp: 250, vo2max: 58, vma: 16.7, paceThresholdSecPerKm: 270,
  pmax5s: 900, p30sW: 600, map5minW: 320, vlamaxRunReference: { value: 0.55, source: "test_terrain" } } as unknown as CoachingCompassInput;

beforeEach(() => { invoke.mockClear(); window.confirm = vi.fn(() => true); });
afterEach(() => { cleanup(); });

describe("Exporteur Nolio : plan de tests en quelques jours", () => {
  it("liste les Days du plan, avec une date par jour, et les envoie vers Nolio en une fois", async () => {
    const checklist = buildTestChecklist(input, "2026-11-20");
    const all = buildTestingPlan(checklist, true);
    render(<TestSessionsNolioExport routes={["plan-all", "plan-todo"]} plans={{ "plan-all": { label: "Plan de tests complet (5 Days)", sessions: all.map(d => d.session) }, "plan-todo": { label: "Plan des tests à faire", sessions: [] } }} />);
    expect(screen.getByText(/TFCL Bike Day™ · Sprints et 30 s/)).toBeInTheDocument();
    expect(screen.getByText(/TFCL Track Day™ · VMA, VLamax, vitesse critique/)).toBeInTheDocument();
    expect(screen.getByText(/TFCL Bike Day™ · Puissance critique/)).toBeInTheDocument();
    expect(screen.getByText(/TFCL Durability Day™ · vélo/)).toBeInTheDocument();
    expect(screen.getByText(/TFCL Durability Day™ · course/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Date du premier jour de tests"), { target: { value: "2026-12-01" } });
    const button = await screen.findByRole("button", { name: /Envoyer 5 séance\(s\) vers Nolio/ });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    const [name, { body }] = invoke.mock.calls[0] as unknown as [string, { body: { kind: string; athlete_id: string; nolio_athlete_id: number; planStartDate: string; sessions: { title: string; dayIndex: number }[] } }];
    expect(name).toBe("nolio-send-plan");
    expect(body).toMatchObject({ kind: "test", athlete_id: "a1", nolio_athlete_id: 4242, planStartDate: "2026-12-01" });
    expect(body.sessions.map(s => s.dayIndex)).toEqual([0, 1, 2, 4, 5]);
    expect(body.sessions).toHaveLength(5);
  });
});
