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
  it("réunit, étiquetés, les écarts mesurés, les hypothèses et la priorité du moteur de plans", () => {
    render(<DashboardLimiters flow={{ ...flow, overlap: { sport: "run", current: 0.57, ceiling: 0.6, range: { low: 0.51, high: 0.63 }, previousValue: 0.67, previousDate: "2026-05-05" } } as unknown as Flow}
      states={states} objective="10 km" ambition="Compétiteur" />);
    const r = region();
    expect(r).toHaveTextContent("Pour l’objectif 10 km · ambition Compétiteur");
    expect(within(r).getByRole("heading", { name: "Écarts mesurés face à l’idéal sourcé" })).toBeVisible();
    expect(within(r).getByRole("heading", { name: "À vérifier" })).toBeVisible();
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

  it("présente l'hypothèse VLamax comme à vérifier, avec la plus haute observation", () => {
    render(<DashboardLimiters flow={{ ...flow, overlap: { sport: "run", current: 0.57, ceiling: 0.6, range: { low: 0.51, high: 0.63 }, previousValue: 0.67, previousDate: "2026-05-05" } } as unknown as Flow}
      states={states} objective="10 km" ambition="Compétiteur" />);
    const text = region().textContent ?? "";
    expect(text).toContain("Profil glycolytique (VLamax) · Course à pied");
    expect(text).toContain("0,57");
    expect(text).toContain("05/05/2026");
    expect(text).toContain("0,67");
    expect(text).toContain("Hypothèse, pas un écart mesuré");
  });

  it("explique que la priorité du moteur suit un repère interne non sourcé", () => {
    render(<DashboardLimiters flow={flow} states={states} objective="10 km" ambition="Compétiteur" />);
    expect(region()).toHaveTextContent("repère interne TFCL (valeur de coaching, non issue d’études)");
    expect(region()).toHaveTextContent("Priorité 1 : Vitesse maximale aérobie (VMA)");
  });

  it("sans états ni hypothèse, garde la seule priorité du moteur", () => {
    render(<DashboardLimiters flow={flow} objective="10 km" ambition="Compétiteur" />);
    expect(screen.queryByRole("heading", { name: "Écarts mesurés face à l’idéal sourcé" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "À vérifier" })).toBeNull();
    expect(region()).toHaveTextContent("Priorité 1 : Vitesse maximale aérobie (VMA)");
  });

  it("aucun écart mesuré : le dit au lieu d'afficher une liste vide", () => {
    render(<DashboardLimiters flow={flow} states={{ sections: [], ranked: [], unmeasured: [] }} objective="10 km" ambition="Compétiteur" />);
    expect(region()).toHaveTextContent("Aucun écart mesuré");
  });
});
