import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ComponentProps } from "react";
import { DashboardLimiters } from "../DashboardLimiters";
import type { FactorStates, FactorRow } from "@/lib/coachingCompass/factorStates";

afterEach(cleanup);
type Flow = ComponentProps<typeof DashboardLimiters>["flow"];
const factor = (metric: string, title: string, status: string, facts: string) => ({ metric, title, status, facts, impact: 1, hypothesis: false });
const flow = {
  title: "Vitesse maximale aérobie (VMA)", detail: "", gap: undefined, overlap: null,
  lead: factor("VMA", "Vitesse maximale aérobie (VMA)", "Écart modeste", "16,7 km/h · repère 17,58 km/h (-5 %)"), others: [],
} as unknown as Flow;
const row = (key: string, label: string, value: number, low: number, high: number, unit: string, state: FactorRow["state"] = "below"): FactorRow =>
  ({ key, label, unit, value, zone: { low, high, point: (low + high) / 2 }, tier: "derived", state, basis: null, evidence: [], engineNote: null });
const states: FactorStates = {
  sections: [],
  ranked: [
    { r: row("vo2max", "VO₂max", 50, 57.3, 63.7, "ml/kg/min"), sport: "run", gap: 12.7 },
    { r: row("vma", "VMA", 16.7, 16.8, 18.5, "km/h"), sport: "run", gap: 0.6 },
  ],
  unmeasured: [{ r: { ...row("tte", "TTE", 0, 0, 0, "min"), value: null, state: "missing" }, sport: "bike" }],
};
const region = () => screen.getByRole("region", { name: "Limiteurs hiérarchisés" });

describe("Limiteurs hiérarchisés", () => {
  it("réunit les écarts face à l'idéal et la priorité du moteur de plans, sans section à part pour les hypothèses", () => {
    render(<DashboardLimiters flow={{ ...flow, overlap: { sport: "run", current: 0.57, ceiling: 0.6, range: { low: 0.51, high: 0.63 }, previousValue: 0.67, previousDate: "2026-05-05" } } as unknown as Flow}
      states={states} objective="10 km" ambition="Compétiteur" />);
    const r = region();
    expect(r).toHaveTextContent("Pour l’objectif 10 km · ambition Compétiteur");
    expect(within(r).getByRole("heading", { name: "Écarts face à l’idéal sourcé" })).toBeVisible();
    expect(within(r).queryByRole("heading", { name: "À vérifier" })).toBeNull();
    expect(within(r).getByRole("heading", { name: "Priorité du moteur de plans" })).toBeVisible();
  });

  it("classe les écarts dans l'ordre reçu, avec valeur, idéal et écart en %", () => {
    render(<DashboardLimiters flow={flow} states={states} objective="10 km" ambition="Compétiteur" />);
    const items = Array.from(region().querySelectorAll("ol")[0].querySelectorAll("li"));
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Écart 1 : VO₂max");
    expect(items[0]).toHaveTextContent("50 ml/kg/min · idéal 57,3–63,7 ml/kg/min");
    expect(items[0]).toHaveTextContent("−12,7 %");
    expect(items[1]).toHaveTextContent("VMA");
    expect(region()).toHaveTextContent("Non mesurés, donc non classés : TTE (vélo)");
  });

  it("la VLamax à vérifier garde son rang dans la hiérarchie, avec un petit message au coach", () => {
    const vla = row("vlamax", "VLamax", 0.57, 0.4, 0.5, "mmol/L/s", "above");
    const withVla: FactorStates = { ...states, sections: [{ sport: "run", rows: [vla] }],
      ranked: [states.ranked[0], { r: vla, sport: "run", gap: 14 }, states.ranked[1]] };
    render(<DashboardLimiters flow={{ ...flow, overlap: { sport: "run", current: 0.57, ceiling: 0.6, range: { low: 0.51, high: 0.63 }, previousValue: 0.67, previousDate: "2026-05-05" } } as unknown as Flow}
      states={withVla} objective="10 km" ambition="Compétiteur" />);
    const items = Array.from(region().querySelectorAll("ol")[0].querySelectorAll("li"));
    expect(items).toHaveLength(3);
    expect(items[0]).not.toHaveTextContent("Peut-être à vérifier");
    expect(items[1]).toHaveTextContent("Écart 2 : VLamax");
    expect(items[1]).toHaveTextContent("Peut-être à vérifier pour être sûr");
    expect(items[1]).toHaveTextContent("jusqu’à 0,63");
    expect(items[1]).toHaveTextContent("05/05/2026 : 0,67");
    expect(items[1]).toHaveTextContent("test de lactate");
  });

  it("explique que la priorité du moteur suit un repère interne non sourcé", () => {
    render(<DashboardLimiters flow={flow} states={states} objective="10 km" ambition="Compétiteur" />);
    expect(region()).toHaveTextContent("repère interne TFCL (valeur de coaching, non issue d’études)");
    expect(region()).toHaveTextContent("Priorité 1 : Vitesse maximale aérobie (VMA)");
  });

  it("sans états ni hypothèse, garde la seule priorité du moteur", () => {
    render(<DashboardLimiters flow={flow} objective="10 km" ambition="Compétiteur" />);
    expect(screen.queryByRole("heading", { name: "Écarts face à l’idéal sourcé" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "À vérifier" })).toBeNull();
    expect(region()).toHaveTextContent("Priorité 1 : Vitesse maximale aérobie (VMA)");
  });

  it("aucun écart mesuré : le dit au lieu d'afficher une liste vide", () => {
    render(<DashboardLimiters flow={flow} states={{ sections: [], ranked: [], unmeasured: [] }} objective="10 km" ambition="Compétiteur" />);
    expect(region()).toHaveTextContent("Aucun écart mesuré");
  });
});
