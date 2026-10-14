import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Audit "B-5K-BEGINNER round 3" (JSON réel 2026-10-14, consigne coach) : S11
 * (semaine d'affûtage, 3 séances) signalait "2 séance(s) exigeante(s) sur 3"
 * — les deux séances citées étaient `D_TAPER_RUN_OPENER` ("Main: 20' Z1-Z2 +
 * 4x30s allure course (Z4a) r=2' Z1 + 5' Z1 cool", structure réelle du
 * catalogue — un opener standard présent dans TOUS les plans course avant
 * compétition) et un shakeout similaire. Cause racine : la classification
 * d'intensité se basait uniquement sur la ZONE MAXIMALE atteinte dans le
 * texte, pas sur le TEMPS réellement passé à cette intensité — 2 minutes de
 * strides sur 20 (10%) comptaient comme "exigeant", exactement comme une
 * vraie séance seuil/VO2max de 20-30 minutes.
 */

function session(overrides: Partial<ParsedSession> = {}): ParsedSession {
  return {
    weekNumber: 1, weekTheme: "T", phase: "taper", dayName: "Mardi", dayIndex: 1,
    sport: "Course", title: "", details: "", isRest: false,
    ...overrides,
  };
}

function week(weekNumber: number, sessions: Partial<ParsedSession>[]): ParsedWeek {
  return {
    weekNumber, theme: "T", phase: "taper",
    sessions: sessions.map((s, i) => session({
      weekNumber, dayIndex: i, dayName: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"][i],
      ...s,
    })),
  };
}

function plan(weeks: ParsedWeek[]): ParsedPlan {
  return { title: "Plan TFCL™ — 5K Test — 12 semaines", phases: [], weeks, totalWeeks: weeks.length };
}

function vp(p: ParsedPlan, trainingLevelSignal?: { trainingLevel: string; trainingLevelSource: string } | null) {
  return validatePlan(
    p, undefined, undefined, undefined, undefined, undefined, undefined, undefined,
    undefined, undefined, undefined, undefined, undefined, undefined,
    trainingLevelSignal,
  );
}

// Reproduit EXACTEMENT S11 du run réel : structure catalogue de
// D_TAPER_RUN_OPENER ("Main: 20' Z1-Z2 + 4x30s allure course (Z4a) r=2' Z1 +
// 5' Z1 cool") et un shakeout équivalent (surtout Z1-Z2, quelques foulées
// Z4). La 3e séance est un renfo, non course, non concernée.
const S11_REAL_SHAPE: Partial<ParsedSession>[] = [
  {
    sport: "Course", title: "Activation et Rappel Allure",
    details: "Main: 20' Z1-Z2 + 4x30s allure course (Z4a) r=2' Z1 + 5' Z1 cool. [ID: D_TAPER_RUN_OPENER]",
    zones: ["Z1", "Z2", "Z4a"],
  },
  {
    sport: "Course", title: "Shakeout run",
    details: "Main: 15' Z1-Z2 + 3x20s accélération (Z4) r=1' Z1 + 5' Z1 cool. [ID: D_RUN_SHAKEOUT]",
    zones: ["Z1", "Z2", "Z4"],
  },
  {
    sport: "Renfo", title: "Force excentrique ischio-jambiers", details: "Nordic hamstring 3x8",
    zones: [],
  },
];

// Contre-exemple : une VRAIE séance seuil/VO2max (bloc substantiel, pas un
// opener) — doit rester détectée comme exigeante, sans régression.
const GENUINE_THRESHOLD_SESSION: Partial<ParsedSession> = {
  sport: "Course", title: "Tempo soutenu (seuil 10K)",
  details: "Warm-up: 15' Z1-Z2 | Main: 2x12' Z4a-Z4b r=4' trot | Cool-down: 10' Z1. [ID: B_10K_TEMPO_20]",
  zones: ["Z1", "Z2", "Z4a", "Z4b"],
};

describe("validateDemandingSessionAccumulation — classification pondérée par temps (fix round 3)", () => {
  it("S11 réel (2 openers d'affûtage) → PLUS signalé comme accumulation de séances exigeantes", () => {
    const result = vp(plan([week(11, S11_REAL_SHAPE)]), { trainingLevel: "untrained", trainingLevelSource: "manual" });
    expect(result.issues.find((i) => i.rule === "demanding_session_accumulation")).toBeUndefined();
  });

  it("une vraie séance seuil/VO2max (bloc substantiel) reste détectée — préserve la détection des charges importantes", () => {
    // 3 vraies séances qualité (même fiche répétée aux fins du test — seule
    // la CLASSIFICATION individuelle de chaque séance est testée ici) sur un
    // plan à 3 séances/semaine (seuil = demandingSessionCap(3) = 1).
    const result = vp(
      plan([week(4, [
        GENUINE_THRESHOLD_SESSION,
        GENUINE_THRESHOLD_SESSION,
        { sport: "Course", title: "EF Z2 30min", details: "30min Z2 continu", zones: ["Z2"] },
      ])]),
      { trainingLevel: "untrained", trainingLevelSource: "manual" },
    );
    const issue = result.issues.find((i) => i.rule === "demanding_session_accumulation");
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("error");
  });

  it("une SEULE vraie séance seuil parmi 3 reste non signalée (sous le seuil proportionnel)", () => {
    const result = vp(
      plan([week(4, [
        GENUINE_THRESHOLD_SESSION,
        { sport: "Course", title: "EF Z2 30min", details: "30min Z2 continu", zones: ["Z2"] },
        { sport: "Course", title: "EF Z2 40min", details: "40min Z2 continu", zones: ["Z2"] },
      ])]),
      { trainingLevel: "untrained", trainingLevelSource: "manual" },
    );
    expect(result.issues.find((i) => i.rule === "demanding_session_accumulation")).toBeUndefined();
  });
});
