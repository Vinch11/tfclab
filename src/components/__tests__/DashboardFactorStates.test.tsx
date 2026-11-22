import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DashboardFactorStates } from "../DashboardFactorStates";
import type { CoachingCompassInput, RadarAxis, TFCLCoachingCompassResult } from "@/lib/coachingCompass/types";

afterEach(cleanup);
const axis = (key: string, value: number | null, target: number | null, unit: string, source = "snapshot"): RadarAxis =>
  ({ key, label: key, shortLabel: key, value, target, score: 0, unit, source, icon: "", color: "" });

function show(objectif: string, ambition: string, compass: unknown) {
  const input = { objectif, ambition } as CoachingCompassInput;
  render(<DashboardFactorStates input={input} compass={compass as TFCLCoachingCompassResult} />);
}
const triathlon = {
  presentation: {
    sport: "triathlon",
    disciplineAxes: {
      bike: [axis("vo2max", 68, 62, "ml/kg/min"), axis("ftpkg", 3.4, 4, "W/kg"), axis("tte", 41, 50, "min", "observed")],
      run: [axis("vo2max", 52, 52, "ml/kg/min"), axis("vma", 14.2, null, "km/h")],
    },
  },
};

describe("État des facteurs face à l'idéal", () => {
  it("nomme l'objectif et l'ambition, et sépare les disciplines", () => {
    show("IM", "competitor", triathlon);
    const section = screen.getByRole("region", { name: "État des facteurs face à l’idéal" });
    expect(section).toHaveTextContent("ambition Compétiteur");
    expect(within(section).getByRole("heading", { name: "Vélo" })).toBeVisible();
    expect(within(section).getByRole("heading", { name: "Course à pied" })).toBeVisible();
  });

  it("compare chaque facteur à un idéal chiffré, avec son état et son niveau de preuve", () => {
    show("IM", "competitor", triathlon);
    const items = Array.from(document.querySelectorAll("li"));
    const byLabel = (label: string, sport: "Vélo" | "Course") => {
      const group = screen.getByRole("heading", { name: sport === "Vélo" ? "Vélo" : "Course à pied" }).parentElement!;
      return Array.from(group.querySelectorAll("li")).find(li => li.textContent?.includes(label))!;
    };
    expect(items.length).toBeGreaterThanOrEqual(5);
    // Course : cohorte mesurée (triathlètes compétitifs) → sous la zone.
    const runVo2 = byLabel("VO₂max", "Course");
    expect(runVo2).toHaveTextContent("Sous la zone");
    expect(runVo2).toHaveTextContent("Mesuré");
    expect(byLabel("VMA", "Course")).toHaveTextContent("Sous la zone");
    expect(byLabel("VMA", "Course")).toHaveTextContent("Idéal 15,9–17,5 km/h");
    // Vélo : seuil dérivé.
    const bikeFtp = byLabel("Seuil / poids", "Vélo");
    expect(bikeFtp).toHaveTextContent("Sous la zone");
    expect(bikeFtp).toHaveTextContent("Dérivé");
    expect(bikeFtp).toHaveTextContent("Idéal 4,28–4,8 W/kg");
    // Vélo VO₂max 68 dans la zone dérivée 62,05–68,65.
    expect(byLabel("VO₂max", "Vélo")).toHaveTextContent("Dans la zone");
  });

  it("garde le repère de coaching, étiqueté, quand aucune cohorte ne couvre le facteur", () => {
    show("IM", "competitor", triathlon);
    const bike = screen.getByRole("heading", { name: "Vélo" }).parentElement!;
    const tte = Array.from(bike.querySelectorAll("li")).find(li => li.textContent?.includes("TTE"))!;
    expect(tte).toHaveTextContent("Repère de coaching");
  });

  it("explique d'où vient la valeur et cite des sources PMC", () => {
    show("IM", "competitor", triathlon);
    const links = Array.from(document.querySelectorAll("a")).map(a => a.getAttribute("href"));
    expect(links.some(h => h?.startsWith("https://pmc.ncbi.nlm.nih.gov/articles/PMC"))).toBe(true);
    expect(screen.getAllByText("D’où vient cette valeur").length).toBeGreaterThan(0);
  });

  it("n'invente rien pour un facteur sans valeur : « À mesurer », idéal tout de même affiché", () => {
    show("Marathon", "age_group", { presentation: { sport: "run", axes: [axis("vo2max", null, 50, "ml/kg/min"), axis("vma", 15, null, "km/h")] } });
    const vo2 = Array.from(document.querySelectorAll("li")).find(li => li.textContent?.includes("VO₂max"))!;
    expect(vo2).toHaveTextContent("À mesurer");
    expect(vo2).toHaveTextContent("non renseigné");
    expect(vo2).toHaveTextContent("Idéal");
  });

  it("n'affiche rien sans profil (pas de bloc vide)", () => {
    const input = { objectif: "Marathon", ambition: "competitor" } as CoachingCompassInput;
    const { container } = render(<DashboardFactorStates input={input} compass={{ presentation: undefined } as unknown as TFCLCoachingCompassResult} />);
    expect(container).toBeEmptyDOMElement();
  });
});
