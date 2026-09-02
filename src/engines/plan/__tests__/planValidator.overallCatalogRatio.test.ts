import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Bug réel signalé par le coach (audit PDF) : S5 contenait 5 séances sur 12
 * (42%) sans fiche catalogue ("Endurance Z2", "Activation aéro"...,
 * catalogId=null) — bien au-delà du "≤20% custom, dernier recours" que le
 * prompt de génération impose (invariant #8, systemPromptJSON.ts). La Règle
 * #6 existante (validateCatalogRatio) ne voit RIEN de ça car elle ne mesure
 * le ratio catalogue que sur les séances "clés" — ces séances de
 * remplissage génériques ne matchent pas KEY_SESSION_PATTERNS et échappent
 * totalement au contrôle. Vérifié empiriquement que le catalogue contenait
 * pourtant des fiches génériques adaptées (A_RUN_Z2_EASY...) pour cette
 * semaine précise — ce n'est pas un trou de couverture catalogue.
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 5,
    weekTheme: "Spécificité LCW",
    phase: "Bloc 4 · Race-Specific LCW",
    dayName: "Mardi",
    dayIndex: 1,
    sport: "Vélo",
    title: "Séance",
    details: "",
    isRest: false,
    ...overrides,
  };
}

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Chantier", phase = "Chantier"): ParsedWeek {
  return {
    weekNumber,
    theme,
    phase,
    sessions: sessions.map((s, i) => makeSession({ weekNumber, weekTheme: theme, dayIndex: s.dayIndex ?? i, ...s })),
  };
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "Plan TFCL™ — 703 — 7 semaines", phases: [], weeks, totalWeeks: weeks.length };
}

const CUSTOM = (day: number, title: string) => ({ dayIndex: day, title, details: "45min", catalogId: undefined });
const CATALOG = (day: number) => ({ dayIndex: day, title: "SFR côte", details: "70min Z3", catalogId: "V3_BIKE_FORCE_SFR" });

describe("validateCatalogRatio (global) — séances de remplissage sans fiche catalogue", () => {
  it("flague une semaine où >30% des séances actives n'ont aucune fiche catalogue identifiable", () => {
    const week = makeWeek(5, [
      CUSTOM(0, "Endurance Z2"),
      CUSTOM(1, "Activation aéro"),
      CUSTOM(2, "Activation"),
      CATALOG(3),
      CATALOG(4),
    ]);
    const result = validatePlan(makePlan([week]));
    const issue = result.issues.find((i) => i.rule === "overall_catalog_ratio" && i.week === 5);
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("warning");
    expect(issue?.message).toMatch(/3\/5 séances/);
  });

  it("ne flague pas une semaine où la majorité des séances ont une fiche catalogue", () => {
    const week = makeWeek(5, [
      CATALOG(0), CATALOG(1), CATALOG(2), CATALOG(3),
      CUSTOM(4, "Activation"),
    ]);
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "overall_catalog_ratio")).toHaveLength(0);
  });

  it("ignore une semaine trop courte pour être significative (<4 séances actives)", () => {
    const week = makeWeek(5, [CUSTOM(0, "Endurance Z2"), CUSTOM(1, "Activation")]);
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "overall_catalog_ratio")).toHaveLength(0);
  });

  it("ignore une semaine de décharge, même très custom", () => {
    const week = makeWeek(5, [
      CUSTOM(0, "Endurance Z2"), CUSTOM(1, "Activation aéro"), CUSTOM(2, "Activation"),
      CUSTOM(3, "Récup"), CUSTOM(4, "Footing"),
    ], "Décharge", "Décharge");
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "overall_catalog_ratio")).toHaveLength(0);
  });
});
