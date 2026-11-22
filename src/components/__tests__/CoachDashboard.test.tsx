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

const snapshot = { id: "s1", athlete_id: athlete.id, coach_id: "c1", date: "2026-11-17", source: "manual", created_at: "", updated_at: "" } as unknown as Props["snapshot"];
const factor = (metric: string, title: string, status: string, facts: string) => ({ metric, title, status, facts, impact: 1, hypothesis: false });
const flow = {
  title: "Tenue au seuil (TTE)", detail: "", gap: undefined, useBlock: true, lever: "", decision: "", instruction: "", link: undefined,
  lead: factor("TTE", "Tenue au seuil (TTE)", "Écart du bilan", "28 min · repère 40 min"),
  others: [factor("VMA", "Vitesse maximale aérobie (VMA)", "Écart modeste", "17 km/h · repère 18 km/h"),
    factor("VLamax", "Profil glycolytique (VLamax)", "Hypothèse à vérifier", "0,7 mmol/L/s")],
} as unknown as Props["flow"];

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

  it("affiche le profil et tous les limiteurs classés sans aucun clic, pour l'objectif et l'ambition choisis", () => {
    openDashboard({ snapshot, flow, profile: <p>Radar du profil physiologique</p> });
    expect(screen.getByText("Radar du profil physiologique")).toBeVisible();
    const section = screen.getByRole("region", { name: "Limiteurs hiérarchisés" });
    expect(section).toHaveTextContent("Marathon");
    expect(section).toHaveTextContent("Compétiteur");
    const items = Array.from(section.querySelectorAll("ol > li"));
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Priorité 1 : Tenue au seuil (TTE)");
    expect(items[1]).toHaveTextContent("Vitesse maximale aérobie (VMA)");
    expect(items[2]).toHaveTextContent("Hypothèse à vérifier");
    expect(screen.queryByText("Autres facteurs classés")).toBeNull();
    expect(screen.getByRole("link", { name: /Levier et décision du Compass/ })).toBeVisible();
    expect(screen.getByText("Bilan de référence")).toBeVisible();
  });

  it("garde la lecture prudente visible quand le Compass ne départage pas encore le premier facteur", () => {
    openDashboard({ snapshot, profile: <p>Profil</p>,
      flow: { ...flow, title: "Tenue au seuil (TTE) ou Profil glycolytique (VLamax)", detail: "Deux lectures concurrentes" } as Props["flow"] });
    expect(screen.getByRole("region", { name: "Limiteurs hiérarchisés" })).toHaveTextContent("Lecture prudente : Tenue au seuil (TTE) ou Profil glycolytique (VLamax)");
  });

  it("sans bilan ni profil, garde l'orientation vers la saisie plutôt qu'un profil vide", () => {
    openDashboard({ snapshot: null, flow: null, profile: null });
    expect(screen.queryByRole("region", { name: "Limiteurs hiérarchisés" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Renseigner le premier bilan" })).toBeVisible();
  });
});
