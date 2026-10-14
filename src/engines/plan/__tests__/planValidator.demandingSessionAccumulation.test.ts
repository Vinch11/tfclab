/**
 * Audit "B-5K-BEGINNER round 2" (JSON réel) : S4 cumulait sprints + côtes +
 * fartlek intense, S10 cumulait finish kick + côtes VO2max + pyramide
 * lactique — 3 stimuli "high" la même semaine, pour une débutante
 * post-Start-to-Run sur un plan à seulement 3 séances/semaine.
 * `validateWeeklyHardDayDensity` (seuil absolu ≥6/7 jours durs sur toute la
 * semaine calendaire) ne détecte jamais ce cas sur un plan à basse fréquence.
 * `validateDemandingSessionAccumulation` corrige ce point mort, STRICTEMENT
 * scopé à un signal de niveau fiable (jamais le fallback-prudent) et aux
 * niveaux untrained/light — jamais une interdiction globale de VMA/côtes/
 * fartlek, jamais une assimilation ambition=finisher ⟺ débutant.
 */
import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

function session(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "T", phase: "base", dayName: "Lundi", dayIndex: 0,
    sport: "Course", title: "EF Z2 45min", details: "Zone 2 endurance fondamentale",
    isRest: false,
    ...overrides,
  };
}

function week(weekNumber: number, sessions: Partial<ParsedSession>[]): ParsedWeek {
  return {
    weekNumber, theme: "T", phase: "base",
    sessions: sessions.map((s, i) => session({
      weekNumber, dayIndex: i, dayName: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][i],
      ...s,
    })),
  };
}

function plan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "Plan TFCL™ — 5K Test — 12 semaines", phases: [], weeks, totalWeeks: weeks.length };
}

// Reproduit la semaine 4 réelle : 3 séances, les 3 "high" (zones structurées).
const THREE_DEMANDING_SESSIONS: Partial<ParsedSession>[] = [
  { sport: "Course", title: "Sprints côtes", details: "8x200m côte", zones: ["Z6"] as any },
  { sport: "Course", title: "Fartlek intense", details: "6x3min Z5", zones: ["Z5"] as any },
  { sport: "Course", title: "VMA piste", details: "10x400m Z5", zones: ["Z5"] as any },
];

const TWO_DEMANDING_ONE_EASY: Partial<ParsedSession>[] = [
  { sport: "Course", title: "Sprints côtes", details: "8x200m côte", zones: ["Z6"] as any },
  { sport: "Course", title: "VMA piste", details: "10x400m Z5", zones: ["Z5"] as any },
  { sport: "Course", title: "EF Z2 30min", details: "Endurance fondamentale", zones: ["Z2"] as any },
];

function vp(p: ParsedPlan, trainingLevelSignal?: { trainingLevel: string; trainingLevelSource: string } | null) {
  return validatePlan(
    p, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined, undefined,
    trainingLevelSignal,
  );
}

describe("validateDemandingSessionAccumulation — accumulation de séances exigeantes (débutant confirmé uniquement)", () => {
  it("3 séances 'high' la même semaine, niveau untrained/manual → flaguée", () => {
    const result = vp(plan([week(1, THREE_DEMANDING_SESSIONS)]), { trainingLevel: "untrained", trainingLevelSource: "manual" });
    const issue = result.issues.find((i) => i.rule === "demanding_session_accumulation");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("error");
  });

  it("2 séances 'high' seulement (≤ seuil) → pas flaguée", () => {
    const result = vp(plan([week(1, TWO_DEMANDING_ONE_EASY)]), { trainingLevel: "untrained", trainingLevelSource: "manual" });
    expect(result.issues.find((i) => i.rule === "demanding_session_accumulation")).toBeUndefined();
  });

  it("3 séances 'high' mais AUCUN signal de niveau transmis → contrôle inactif (comportement legacy)", () => {
    const result = vp(plan([week(1, THREE_DEMANDING_SESSIONS)]), null);
    expect(result.issues.find((i) => i.rule === "demanding_session_accumulation")).toBeUndefined();
  });

  it("3 séances 'high', niveau untrained MAIS source fallback-prudent → contrôle inactif (fallback jamais traité comme fiable)", () => {
    const result = vp(plan([week(1, THREE_DEMANDING_SESSIONS)]), { trainingLevel: "untrained", trainingLevelSource: "fallback-prudent" });
    expect(result.issues.find((i) => i.rule === "demanding_session_accumulation")).toBeUndefined();
  });

  it("3 séances 'high', niveau 'trained' (confirmé) avec source manual → contrôle inactif (pas un garde-fou pour ce niveau)", () => {
    const result = vp(plan([week(1, THREE_DEMANDING_SESSIONS)]), { trainingLevel: "trained", trainingLevelSource: "manual" });
    expect(result.issues.find((i) => i.rule === "demanding_session_accumulation")).toBeUndefined();
  });

  it("niveau 'light' avec source auto-tss (signal fiable, pas manuel) → contrôle actif quand même", () => {
    const result = vp(plan([week(1, THREE_DEMANDING_SESSIONS)]), { trainingLevel: "light", trainingLevelSource: "auto-tss" });
    expect(result.issues.find((i) => i.rule === "demanding_session_accumulation")).toBeDefined();
  });

  it("un confirmé visant 'finisher' (ambition) mais niveau 'trained' fiable → non flagué (ambition et niveau restent 2 axes distincts)", () => {
    const result = validatePlan(
      plan([week(1, THREE_DEMANDING_SESSIONS)]),
      "5 KM", undefined, undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, "finisher", undefined, undefined, undefined,
      { trainingLevel: "trained", trainingLevelSource: "manual" },
    );
    expect(result.issues.find((i) => i.rule === "demanding_session_accumulation")).toBeUndefined();
  });

  it("n'interdit pas une SEULE séance VMA/côtes/fartlek chez un débutant — seule l'accumulation est signalée", () => {
    const result = vp(
      plan([week(1, [
        { sport: "Course", title: "VMA piste", details: "10x400m Z5", zones: ["Z5"] as any },
        { sport: "Course", title: "EF Z2 30min", details: "Endurance", zones: ["Z2"] as any },
        { sport: "Repos", title: "Repos", details: "", isRest: true },
      ])]),
      { trainingLevel: "untrained", trainingLevelSource: "manual" },
    );
    expect(result.issues.find((i) => i.rule === "demanding_session_accumulation")).toBeUndefined();
  });
});
