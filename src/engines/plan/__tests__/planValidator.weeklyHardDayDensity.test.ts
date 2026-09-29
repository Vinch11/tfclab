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

/**
 * Bug réel signalé par ChatGPT sur un plan 10K généré ("Vince") : la densité
 * hebdomadaire totale ci-dessus peut rester conforme (≥2 jours protégés dans
 * la semaine) alors que 4 jours DURS s'enchaînent sans AUCUNE coupure —
 * exactement l'exemple cité : Mer (5×3min @100%VMA + pliométrie), Jeu (6×5min
 * seuil haut), Ven (8×60s côte), Sam (pyramide 95-105%VMA), puis une sortie
 * longue le dimanche. Lundi+Mardi protégés en tête de semaine suffisent à
 * passer le contrôle de densité totale, alors que l'enchaînement lui-même
 * (aucun jour facile intercalé sur 4 jours consécutifs) est le vrai problème
 * de récupération — un angle mort distinct, non couvert par le comptage
 * total.
 */
describe("validatePolarization — jours durs consécutifs (enchaînement, pas volume total)", () => {
  it("flague 5 jours durs consécutifs même avec 2 jours protégés en tête de semaine (densité totale conforme)", () => {
    const week = makeWeek(
      7,
      [EASY(0), EASY(1), HARD(2), HARD(3), HARD(4), HARD(5), HARD(6)],
      "Chantier",
      "build",
    );
    const result = validatePlan(makePlan([week]));
    // La densité totale ne doit PAS se déclencher ici (5 jours protégés : L, Ma + les 2 EASY comptent comme non-hard).
    expect(result.issues.filter((i) => i.rule === "polarization" && /jour\(s\) réellement protégé/i.test(i.message))).toHaveLength(0);
    const streakIssue = result.issues.find((i) => i.rule === "polarization" && i.week === 7 && /consécutifs/i.test(i.message));
    expect(streakIssue).toBeDefined();
    expect(streakIssue?.message).toMatch(/5 jours consécutifs/);
  });

  it("ne flague pas 3 jours durs consécutifs (seuil toléré, ex. microcycle 3 jours on / 1 off)", () => {
    const week = makeWeek(3, [HARD(0), HARD(1), HARD(2), EASY(3), HARD(4), EASY(5), REST(6)], "Chantier", "build");
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "polarization" && /consécutifs/i.test(i.message))).toHaveLength(0);
  });

  it("ne flague pas des jours durs isolés, même nombreux, s'ils sont espacés d'un jour facile", () => {
    const week = makeWeek(3, [HARD(0), EASY(1), HARD(2), EASY(3), HARD(4), EASY(5), HARD(6)], "Chantier", "build");
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "polarization" && /consécutifs/i.test(i.message))).toHaveLength(0);
  });

  it("n'applique pas ce contrôle à une semaine de décharge", () => {
    const week = makeWeek(3, [HARD(0), HARD(1), HARD(2), HARD(3), HARD(4), HARD(5), HARD(6)], "Décharge", "build");
    const result = validatePlan(makePlan([week]));
    expect(result.issues.filter((i) => i.rule === "polarization" && /consécutifs/i.test(i.message))).toHaveLength(0);
  });
});
