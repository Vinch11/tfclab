/**
 * Dernière correction ciblée (consigne coach explicite, contre-vérification
 * Codex sur b691980), point B — INTENSITÉ : "STRUCTURE AMBITION (non
 * négociable)" (promptHelpers.ts) impose un nombre fixe de qualités/semaine
 * selon l'ambition (3 pour "elite") — jusqu'ici SEULEMENT dans le prompt,
 * jamais vérifié sur le plan réellement généré, ni adapté au type de
 * semaine réellement programmée. `validateRecoveryWeekIntensity` contrôle
 * le RÉSULTAT : une semaine `scheduledWeekType==="recovery"` ne doit jamais
 * hériter du même nombre de séances exigeantes qu'une semaine de charge.
 */
import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";
import type { PlanAthleteData } from "../types";

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
  return { title: "Plan TFCL™ — Test Recovery Intensity — 10 semaines", phases: [], weeks, totalWeeks: weeks.length };
}

// Même construction que planValidator.demandingSessionAccumulation.test.ts :
// pas de durée "Xmin" parsable dans `details` → repli sur classifySessionIntensity
// via le champ `zones` structuré, qui classe directement "high".
const THREE_DEMANDING_SESSIONS: Partial<ParsedSession>[] = [
  { sport: "Course", title: "Sprints côtes", details: "8x200m côte", zones: ["Z6"] },
  { sport: "Course", title: "Fartlek intense", details: "6x3min Z5", zones: ["Z5"] },
  { sport: "Course", title: "VMA piste", details: "10x400m Z5", zones: ["Z5"] },
];

const ONE_DEMANDING_TWO_EASY: Partial<ParsedSession>[] = [
  { sport: "Course", title: "VMA piste courte", details: "6x300m Z5", zones: ["Z5"] },
  { sport: "Course", title: "EF Z2 30min", details: "Endurance fondamentale", zones: ["Z2"] },
  { sport: "Vélo", title: "EF Z1 45min", details: "Récupération active", zones: ["Z1"] },
];

const THREE_EASY: Partial<ParsedSession>[] = [
  { sport: "Course", title: "EF Z2 30min", details: "Endurance fondamentale", zones: ["Z2"] },
  { sport: "Vélo", title: "EF Z1 45min", details: "Récupération active", zones: ["Z1"] },
  { sport: "Natation", title: "Technique Z1", details: "Technique", zones: ["Z1"] },
];

// Athlète 42 ans → cadence 2:1 (recoveryEveryNWeeks=3, cf. inferWeekType) :
// semaine 3 (et 6, 9) = "recovery". Semaine 1 = "load".
const ATHLETE_42: PlanAthleteData = { age: 42 };

describe("validateRecoveryWeekIntensity — une semaine de récupération ne doit pas hériter du nombre de qualités d'une semaine de charge", () => {
  it("semaine 3 (recovery, cadence 2:1 à 42 ans) avec 3 séances exigeantes → signalée comme erreur", () => {
    const p = plan([
      week(1, THREE_EASY), week(2, THREE_EASY), week(3, THREE_DEMANDING_SESSIONS),
      week(4, THREE_EASY), week(5, THREE_EASY), week(6, THREE_EASY),
      week(7, THREE_EASY), week(8, THREE_EASY), week(9, THREE_EASY), week(10, THREE_EASY),
    ]);
    const result = validatePlan(p, "703", undefined, undefined, undefined, undefined, ATHLETE_42);
    const issue = result.issues.find((i) => i.rule === "recovery_week_intensity");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("error");
    expect(issue?.week).toBe(3);
    expect(issue?.message).toMatch(/3 séance\(s\) exigeante\(s\)/);
    expect(issue?.message).toMatch(/RÉCUPÉRATION/);
  });

  it("semaine 3 (recovery) avec UNE SEULE séance exigeante (maintien) → non signalée", () => {
    const p = plan([
      week(1, THREE_EASY), week(2, THREE_EASY), week(3, ONE_DEMANDING_TWO_EASY),
      week(4, THREE_EASY), week(5, THREE_EASY), week(6, THREE_EASY),
      week(7, THREE_EASY), week(8, THREE_EASY), week(9, THREE_EASY), week(10, THREE_EASY),
    ]);
    const result = validatePlan(p, "703", undefined, undefined, undefined, undefined, ATHLETE_42);
    expect(result.issues.find((i) => i.rule === "recovery_week_intensity")).toBeUndefined();
  });

  it("semaine 3 (recovery) sans aucune séance exigeante → non signalée", () => {
    const p = plan([
      week(1, THREE_EASY), week(2, THREE_EASY), week(3, THREE_EASY),
      week(4, THREE_EASY), week(5, THREE_EASY), week(6, THREE_EASY),
      week(7, THREE_EASY), week(8, THREE_EASY), week(9, THREE_EASY), week(10, THREE_EASY),
    ]);
    const result = validatePlan(p, "703", undefined, undefined, undefined, undefined, ATHLETE_42);
    expect(result.issues.find((i) => i.rule === "recovery_week_intensity")).toBeUndefined();
  });

  it("semaine 1 (load, pas recovery) avec 3 séances exigeantes → jamais signalée par CETTE règle (hors périmètre)", () => {
    const p = plan([
      week(1, THREE_DEMANDING_SESSIONS), week(2, THREE_EASY), week(3, THREE_EASY),
      week(4, THREE_EASY), week(5, THREE_EASY), week(6, THREE_EASY),
      week(7, THREE_EASY), week(8, THREE_EASY), week(9, THREE_EASY), week(10, THREE_EASY),
    ]);
    const result = validatePlan(p, "703", undefined, undefined, undefined, undefined, ATHLETE_42);
    expect(result.issues.find((i) => i.rule === "recovery_week_intensity")).toBeUndefined();
  });

  it("aucun âge transmis (cadence par défaut 3:1, recovery=semaine 4) : la semaine 4 avec 3 séances exigeantes est signalée", () => {
    const p = plan([
      week(1, THREE_EASY), week(2, THREE_EASY), week(3, THREE_EASY), week(4, THREE_DEMANDING_SESSIONS),
      week(5, THREE_EASY), week(6, THREE_EASY), week(7, THREE_EASY), week(8, THREE_EASY),
      week(9, THREE_EASY), week(10, THREE_EASY),
    ]);
    const result = validatePlan(p, "703");
    const issue = result.issues.find((i) => i.rule === "recovery_week_intensity");
    expect(issue).toBeDefined();
    expect(issue?.week).toBe(4);
  });
});
