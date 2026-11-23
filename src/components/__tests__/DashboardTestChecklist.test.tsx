import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardTestChecklist } from "../DashboardTestChecklist";
import type { CoachingCompassInput } from "@/lib/coachingCompass/types";

afterEach(cleanup);
const input = { objectif: "IM", ambition: "competitor", sportFocus: "triathlon", snapshotDate: "2026-11-12", ftp: 250, vo2max: 58, vma: 16.7, paceThresholdSecPerKm: 270,
  pmax5s: 900, p30sW: 600, map5minW: 320, vlamaxRunReference: { value: 0.55, source: "test_terrain" } } as unknown as CoachingCompassInput;
const panel = () => document.querySelector('details[aria-label="Tests à faire pour cet athlète"]') as HTMLDetailsElement;

describe("Tests à faire pour cet athlète", () => {
  it("est replié par défaut et résume l'état sur la ligne du titre", () => {
    render(<DashboardTestChecklist input={input} today="2026-11-20" />);
    expect(panel().open).toBe(false);
    expect(panel().querySelector("summary")).toHaveTextContent("Tests à faire pour cet athlète");
    expect(panel().querySelector("summary")).toHaveTextContent(/\d+ sur \d+ à jour/);
    expect(panel().querySelector("summary")).toHaveTextContent("à faire"); // CP, CS, durabilité jamais faites
  });
  it("une validité dépassée garde la valeur et avertit, sans rien retirer", () => {
    render(<DashboardTestChecklist input={input} today="2027-03-01" />);
    expect(panel().querySelector("summary")).toHaveTextContent("à retester");
    const row = screen.getByText("VMA course (6 min ou 1500 m)").closest("li") as HTMLElement;
    expect(within(row).getByText("À retester")).toBeInTheDocument();
    expect(row).toHaveTextContent("Valeur conservée : 16,7 km/h");
    expect(row).toHaveTextContent("validité 90 jours dépassée");
    expect(row).toHaveTextContent("La valeur reste utilisée");
  });
  it("un test récent est « À jour », un test jamais fait est « À faire »", () => {
    render(<DashboardTestChecklist input={input} today="2026-11-20" />);
    expect(within(screen.getByText("VMA course (6 min ou 1500 m)").closest("li") as HTMLElement).getByText("À jour")).toBeInTheDocument();
    expect(within(screen.getByText("Vitesse critique (CS) et D′").closest("li") as HTMLElement).getByText("À faire")).toBeInTheDocument();
  });
  it("chaque test montre son protocole et la validité ; le lien ouvre l'exporteur Nolio du bon Day", () => {
    const routes: string[] = [];
    render(<DashboardTestChecklist input={input} today="2026-11-20" renderExporter={r => { routes.push(r); return <p data-testid="exp">{r}</p>; }} />);
    const row = screen.getByText("Vitesse critique (CS) et D′").closest("li") as HTMLElement;
    expect(row).toHaveTextContent("1000 m maximal, 30 min de récupération, 3000 m maximal");
    expect(row).toHaveTextContent("Validité : 42 jours");
    expect(screen.queryByTestId("exp")).toBeNull();
    fireEvent.click(within(row).getByRole("button", { name: /protocole détaillé et l’envoyer vers Nolio/ }));
    expect(screen.getByTestId("exp")).toHaveTextContent("cs-day");
  });
  it("VO₂max : pas d'envoi vers Nolio, faute de protocole de terrain", () => {
    render(<DashboardTestChecklist input={input} today="2026-11-20" />);
    const row = screen.getByText("VO₂max", { selector: "h4" }).closest("li") as HTMLElement;
    expect(within(row).queryByRole("button")).toBeNull();
  });
  it("tout tester en quelques jours : plans à faire et complet, envoyables", () => {
    const routes: string[] = [];
    render(<DashboardTestChecklist input={input} today="2026-11-20" renderExporter={(r, plans) => { routes.push(r); return <p data-testid="exp">{r}:{plans["plan-all"]?.sessions.length}</p>; }} />);
    const plan = screen.getByRole("region", { name: "Tout tester en quelques jours" });
    expect(plan).toHaveTextContent("Plan complet : J1 · Bike Day → J2 · Track Day → J3 · Bike Day · Puissance critique → J4 · Track Day · Vitesse critique");
    expect(plan).toHaveTextContent("Tests à faire ou à retester :");
    fireEvent.click(within(plan).getByRole("button", { name: "Voir et envoyer le plan complet" }));
    expect(screen.getByTestId("exp")).toHaveTextContent("plan-all:4");
  });
  it("tout est à jour côté Days : le dit, et le plan complet reste disponible", () => {
    const fresh = { ...input, criticalMetrics: { cycling: { critical: 260, reserve: 18000, status: "confirmed", latestEffortDate: "2026-11-10", efforts: [], warnings: [] },
      running: { critical: 4.2, reserve: 200, status: "confirmed", latestEffortDate: "2026-11-10", efforts: [], warnings: [] } } } as unknown as CoachingCompassInput;
    render(<DashboardTestChecklist input={fresh} today="2026-11-20" />);
    expect(screen.getByRole("region", { name: "Tout tester en quelques jours" })).toHaveTextContent("Tous les tests programmables par les Days sont à jour.");
    expect(screen.queryByRole("button", { name: "Voir et envoyer le plan des tests à faire" })).toBeNull();
    expect(screen.getByRole("button", { name: "Voir et envoyer le plan complet" })).toBeInTheDocument();
  });
  it("sans checklist (débutant), rien n'est rendu", () => {
    const { container } = render(<DashboardTestChecklist input={{ ...input, objectif: "StartToRun" } as CoachingCompassInput} today="2026-11-20" />);
    expect(container).toBeEmptyDOMElement();
  });
});
