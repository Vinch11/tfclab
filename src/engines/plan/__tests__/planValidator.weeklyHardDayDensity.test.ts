import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Bug réel signalé par le coach (audit d'un plan IA généré, PDF) : semaine
 * "Développement TTE" avec un stimulus modéré/dur sur 6 jours/7 (Sweet Spot
 * mardi, test durabilité Z2 2h30 mercredi, Seuil Gimenez jeudi, Tempo
 * Marathon Canova vendredi, sortie longue avec blocs Z3 samedi, negative
 * split race-pace dimanche) — un seul jour (lundi) réellement protégé. La
 * Règle #1 Polarisation (ratio low/mid/high en TEMPS sur toute la semaine)
 * peut très bien rester dans les clous : chaque bloc dur est individuellement
 * court face au volume Z1-Z2 du jour qui le porte. Ce contrôle regarde
 * l'ESPACEMENT des jours qualité, pas le ratio temps agrégé.
 */
function makeSession(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "build",
    dayName: "Lundi",
    dayIndex: 0,
    sport: "Vélo",
    title: "Séance",
    details: "",
    isRest: false,
    ...overrides,
  };
}

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function makeWeek(weekNumber: number, sessions: Partial<ParsedSession>[], theme = "Standard", phase = "build"): ParsedWeek {
  return {
    weekNumber,
    theme,
    phase,
    sessions: sessions.map((s) => makeSession({ weekNumber, weekTheme: theme, ...s })),
  };
}

function makePlan(weeks: ParsedWeek[]): ParsedPlan {
  return {
    title: "Plan TFCL™ — 70.3 Test Athlete — 7 semaines",
    phases: [],
    weeks,
    totalWeeks: weeks.length,
  };
}

const HARD = (day: number) => ({ dayIndex: day, dayName: DAYS[day], title: "Séance dure", details: "40min Z4 seuil continu" });
const EASY = (day: number) => ({ dayIndex: day, dayName: DAYS[day], title: "Séance facile", details: "45min Z1 footing facile" });
const REST = (day: number) => ({ dayIndex: day, dayName: DAYS[day], title: "Repos", details: "", isRest: true });

describe("validatePolarization — densité de jours qualité dans la semaine", () => {
  it("flague une semaine avec 6/7 jours portant un stimulus modéré/dur (1 seul jour protégé)", () => {
    const week = makeWeek(3, [REST(0), HARD(1), HARD(2), HARD(3), HARD(4), HARD(5), HARD(6)], "Développement TTE", "build");
    const result = validatePlan(makePlan([week]));
    const issue = result.issues.find((i) => i.rule === "polarization" && i.week === 3 && /jour\(s\) réellement protégé/i.test(i.message));
    expect(issue).toBeDefined();
    expect(issue?.message).toMatch(/6\/7/);
  });

  it("ne flague pas une semaine équilibrée (2 jours durs, repos/facile le reste)", () => {
    const week = makeWeek(3, [REST(0), HARD(1), EASY(2), EASY(3), HARD(4), EASY(5), REST(6)], "Chantier", "build");
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "polarization" && /jour\(s\) réellement protégé/i.test(i.message))).toHaveLength(0);
  });

  it("n'applique pas ce contrôle à une semaine de décharge, même très chargée en apparence", () => {
    const week = makeWeek(3, [REST(0), HARD(1), HARD(2), HARD(3), HARD(4), HARD(5), HARD(6)], "Décharge", "build");
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "polarization" && /jour\(s\) réellement protégé/i.test(i.message))).toHaveLength(0);
  });

  it("n'applique pas ce contrôle à une semaine trop courte pour être significative (<5 séances actives)", () => {
    const week = makeWeek(3, [REST(0), HARD(1), HARD(2), HARD(3)], "Chantier", "build");
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "polarization" && /jour\(s\) réellement protégé/i.test(i.message))).toHaveLength(0);
  });
});
