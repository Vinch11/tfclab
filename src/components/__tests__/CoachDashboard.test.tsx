import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import { CoachDashboard } from "../CoachDashboard";

const athlete = { id: "athlete-a", name: "Athlète A", goal: "Marathon" };
type Props = ComponentProps<typeof CoachDashboard>;
const base: Props = {
  athlete, athletes: [{ id: athlete.id, nom: athlete.name }], ambition: "competitor",
  onSelectAthlete: vi.fn(), onAmbitionChange: vi.fn(), onGoalChange: vi.fn(), onOpenReport: vi.fn(),
  snapshot: null, coverage: null, flow: null, alert: null,
  bilans: <div>Gestion des bilans</div>, analyses: <div>Analyses personnalisées</div>, compass: null,
};

function openDashboard(props: Partial<Props>, path = "/") {
  render(<MemoryRouter initialEntries={[path]}><CoachDashboard {...base} {...props} /></MemoryRouter>);
}

afterEach(cleanup);

describe("Accueil coach", () => {
  it("oriente un athlète sans bilan vers la saisie, y compris depuis un ancien lien de détail", () => {
    openDashboard({}, "/?vue=compass");
    expect(screen.getByRole("heading", { name: "Renseigner le premier bilan" })).toBeVisible();
    expect(screen.queryByRole("progressbar")).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Créer le bilan" }));
    expect(screen.getByText("Gestion des bilans")).toBeVisible();
    fireEvent.click(screen.getByRole("link", { name: "Retour au tableau de bord" }));
    expect(screen.getByRole("link", { name: "Plan d’entraînement" })).toHaveAttribute("href", "/planning/ai-plan");
  });

  it("ouvre le bilan Express et garde ses estimations distinctes des priorités du Compass", () => {
    openDashboard({
      snapshot: { id: "s1", athlete_id: athlete.id, coach_id: "c1", date: "2026-11-17", source: "finisher-express", created_at: "", updated_at: "" },
      compass: <p>Zones du bilan Express</p>,
    }, "/?vue=analyses");
    expect(screen.queryByText("Priorité du Compass")).toBeNull();
    expect(screen.queryByRole("link", { name: "Analyses complémentaires" })).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Voir les estimations" }));
    expect(screen.getByText("Zones du bilan Express")).toBeVisible();
    expect(screen.queryByText("Analyses personnalisées")).toBeNull();
  });
});
