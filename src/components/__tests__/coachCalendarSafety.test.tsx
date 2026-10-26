import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const db = vi.hoisted(() => ({
  versions: [{ id: "synthetic-version", athlete_id: "synthetic-athlete", objective: "10K", created_at: "2026-10-24T12:00:00Z", weeks_count: 1, sessions_count: 1,
    plan_json: { title: "Synthetic", phases: [], totalWeeks: 1, weeks: [{ weekNumber: 1, sessions: [{ dayName: "Samedi", dayIndex: 5, title: "COURSE : 10 km", sport: "run", isRest: false }] }] } }],
  writes: vi.fn(() => { throw new Error("Unexpected DB write"); }),
  invoke: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  functions: { invoke: db.invoke },
  from: (table: string) => {
    const data = table === "athletes" ? [{ id: "synthetic-athlete", name: "Synthetic" }] : db.versions;
    const query = { select: () => query, eq: () => query, order: () => Promise.resolve({ data, error: null }),
      insert: db.writes, delete: db.writes, upsert: db.writes, update: db.writes };
    return query;
  },
} }));
vi.mock("@/contexts/AthleteContext", () => ({ useAthletes: () => ({ currentAthlete: { id: "synthetic-athlete" } }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/components/SidebarLayout", () => ({ SidebarLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/WahooWorkoutLibrary", () => ({ WahooWorkoutLibrary: () => null }));
vi.mock("@/components/WahooPersonalizedRecommendations", () => ({ WahooPersonalizedRecommendations: () => null }));
vi.mock("@/components/StaffSessionLibrary", () => ({ StaffSessionLibrary: () => null }));
vi.mock("@/components/WahooPrintableList", () => ({ WahooPrintableList: () => null }));
import { PlanHistory } from "../PlanHistory";
import PlanLibraryPage from "@/pages/PlanLibraryPage";
import PlanningPage from "@/pages/PlanningPage";
import { IndexSeancesView } from "../IndexSeances";
import { syncWorkoutsToCloud } from "@/lib/syncWorkoutsToCloud";

beforeEach(() => { cleanup(); vi.clearAllMocks(); });

describe("suspended non-atomic replacements", () => {
  it.each(["history", "library"])("%s cannot erase the calendar or archived versions", async target => {
    const historical = structuredClone(db.versions);
    if (target === "history") {
      render(<PlanHistory />);
      fireEvent.click(screen.getByRole("button", { name: /Historique des plans/ }));
    } else render(<PlanLibraryPage />);
    const restore = await screen.findByTitle(/Restauration calendrier suspendue/);
    expect(restore).toBeDisabled();
    fireEvent.click(restore);
    expect(screen.getByText(/Le chargement d’une version/)).toBeInTheDocument();
    if (target === "library") {
      fireEvent.click(screen.getByText("Synthetic"));
      expect(screen.getByText("Samedi")).toBeInTheDocument();
    }
    expect(db.writes).not.toHaveBeenCalled();
    expect(db.versions).toEqual(historical);
  });

  it.each(["planning", "sessions"])("%s disables Sync DB without invoking the destructive endpoint", target => {
    render(target === "planning" ? <PlanningPage /> : <IndexSeancesView />);
    const sync = screen.getByTitle(/Sync DB suspendue/);
    expect(sync).toBeDisabled();
    fireEvent.click(sync);
    expect(db.invoke).not.toHaveBeenCalled();
    expect(db.writes).not.toHaveBeenCalled();
  });

  it("an old caller is refused without any network or database request", async () => {
    const result = await syncWorkoutsToCloud();
    expect(result).toMatchObject({ success: false, inserted: 0, deduplicated: 0, total: 0 });
    expect(result.errors).toEqual([expect.stringContaining("suspendue")]);
    expect(db.invoke).not.toHaveBeenCalled();
    expect(db.writes).not.toHaveBeenCalled();
  });
});
