import { describe, expect, it } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedSession } from "@/lib/aiPlanParser";

function plan(sessions: Partial<ParsedSession>[]): ParsedPlan {
  return { title: "5K", totalWeeks: 1,
    phases: [{ name: "Fondation", weeks: "S1-S3" }, { name: "Affûtage", weeks: "S4" }], weeks: [{
    weekNumber: 1, theme: "Affûtage", phase: "taper", sessions: sessions.map((s, i) => ({
      weekNumber: 1, weekTheme: "Affûtage", phase: "taper", dayIndex: i,
      dayName: ["Lundi", "Mardi", "Mercredi", "Jeudi"][i], sport: "run", isRest: false,
      title: "Footing", details: "20min Z2", ...s,
    })),
  }] };
}

describe("affûtage : exception limitée à la compétition", () => {
  it("exempte la course sans exempter une séance VMA de la même semaine", () => {
    const result = validatePlan(plan([
      { title: "🏁 COURSE OBJECTIF — 5 KM", details: "Course au seuil Z5", zones: ["Z5"] },
      { title: "Fractionné VMA", details: "5x3min Z5" },
    ]), "5 KM");
    const issues = result.issues.filter(i => i.rule === "phase_coherence" && i.week === 1);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("Fractionné VMA");
  });

  it.each(["Simulation compétition", "Activation race day", "Préparation course objectif", "Fractionné avant compétition"])("n'exempte pas %s", title => {
    expect(validatePlan(plan([{ title, details: "30min de fractionné VMA" }]), "5 KM")
      .issues.some(i => i.rule === "phase_coherence" && i.week === 1)).toBe(true);
  });
});

describe("repos : contexte passif vs activité réelle", () => {
  it.each(["Régénération musculaire.", "Fraîcheur musculaire avant la sortie longue.",
    "Préparation mentale de la semaine de course.", "Préparation des affaires de course.",
    "Journée sans entraînement cardio ni renforcement."])("accepte %s", details => {
    expect(validatePlan(plan([{ isRest: true, sport: "rest", title: "Repos", details }, {}, {}, {}]))
      .issues.some(i => i.rule === "rest_day_coherence")).toBe(false);
  });

  it.each(["30 min de course", "Musculation 20 min", "Vélo Z1 30min", "Renforcement musculaire",
    "Préparation des affaires de course. Puis 30min de course Z2."])("signale encore %s", details => {
    expect(validatePlan(plan([{ isRest: true, sport: "rest", title: "Repos", details }, {}, {}, {}]))
      .issues.some(i => i.rule === "rest_day_coherence" && i.week === 1)).toBe(true);
  });
});
