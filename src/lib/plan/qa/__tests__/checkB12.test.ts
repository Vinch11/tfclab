import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    {
      id: "VO2_BILLAT_3030",
      cat: "A", sport: "run", objectif: "vo2max", necessite: "Recommandé",
      when: "Base/Build", avoid: "",
      phase: ["base", "build"],
      durationMin: [40, 55], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "8x(30\"/30\") @VMA", zones: ["Z5"] }],
      tags: ["vo2max", "vma", "billat"],
      variants: {},
    },
    {
      id: "Z2_LONG_TRAINLOW",
      cat: "B", sport: "bike", objectif: "vlamax", necessite: "Recommandé",
      when: "Base", avoid: "",
      phase: ["base", "build"],
      durationMin: [120, 180], metricKey: "power", sportKey: "bike",
      structure: [{ part: "Main", text: "2h30 Z2 à jeun", zones: ["Z2"] }],
      tags: ["z2", "train low", "fatmax"],
      variants: {},
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { checkB12, checkB12ToValidationIssues } from "../checkB12";

function makeSession(overrides: Partial<MergedSession>): MergedSession {
  return {
    weekNumber: 1, weekTheme: "Base", phase: "base", dayName: "Lundi", dayIndex: 0,
    sport: "run", title: "Séance", details: "", isRest: false, isKeySession: false,
    catalogId: null, custom: false, durationMin: 45, zones: [],
    ...overrides,
  };
}

function makePlan(weeksSessions: MergedSession[][]): MergedPlan {
  return {
    title: "P", phases: [], totalWeeks: weeksSessions.length,
    weeks: weeksSessions.map((sessions, i) => ({
      weekNumber: i + 1, theme: "S", phase: i === weeksSessions.length - 1 ? "taper" : "base", sessions,
    })),
  };
}

describe("checkB12 — couverture effective des limiteurs identifiés", () => {
  it("aucun limiteur transmis → skip (info, pass=true)", () => {
    const plan = makePlan([[makeSession({})]]);
    const r = checkB12(plan, undefined);
    expect(r.pass).toBe(true);
    expect(r.level).toBe("info");
  });

  it("Limiteur #1 'VO2max bas' ciblé par une fiche catalogue matchant (via tags) → couverture détectée", () => {
    const plan = makePlan([
      [makeSession({ catalogId: "VO2_BILLAT_3030", weekNumber: 1 })],
      [makeSession({ catalogId: "VO2_BILLAT_3030", weekNumber: 2 })],
    ]);
    const r = checkB12(plan, ["🔴 Limiteur #1 — VO2max bas"]);
    expect(r.pass).toBe(true);
    expect(r.details.some(d => d.startsWith("✅"))).toBe(true);
  });

  it("Limiteur #1 totalement absent du plan (aucune séance ne matche) → FAIL critique", () => {
    const plan = makePlan([
      [makeSession({ title: "Sortie facile", details: "footing tranquille" })],
      [makeSession({ title: "Sortie facile", details: "footing tranquille" })],
    ]);
    const r = checkB12(plan, ["🔴 Limiteur #1 — VO2max bas"]);
    expect(r.pass).toBe(false);
    expect(r.details.some(d => d.startsWith("❌") && d.includes("Limiteur #1"))).toBe(true);
  });

  it("Limiteur #2 totalement absent → FAIL critique (même sévérité que L1)", () => {
    const plan = makePlan([
      [makeSession({ catalogId: "VO2_BILLAT_3030" })],
      [makeSession({ catalogId: "VO2_BILLAT_3030" })],
    ]);
    const r = checkB12(plan, ["Limiteur #1 — VO2max bas", "Limiteur #2 — VLamax trop haute"]);
    expect(r.pass).toBe(false);
    expect(r.details.some(d => d.startsWith("❌") && d.includes("Limiteur #2"))).toBe(true);
  });

  it("Limiteur #3+ totalement absent → warning non bloquant (pass reste true si L1/L2 couverts)", () => {
    const plan = makePlan([
      [makeSession({ catalogId: "VO2_BILLAT_3030" }), makeSession({ catalogId: "Z2_LONG_TRAINLOW", sport: "bike" })],
    ]);
    const r = checkB12(plan, [
      "Limiteur #1 — VO2max bas",
      "Limiteur #2 — VLamax trop haute",
      "Limiteur #3 — Économie basse",
    ]);
    expect(r.pass).toBe(true);
    expect(r.details.some(d => d.startsWith("⚠") && d.includes("Limiteur #3"))).toBe(true);
  });

  it("Limiteur #1 couvert sur seulement 1 semaine/5 (hors dernière, race-week) → warning couverture faible, pass reste true", () => {
    const plan = makePlan([
      [makeSession({ catalogId: "VO2_BILLAT_3030" })],
      [makeSession({ title: "footing", details: "" })],
      [makeSession({ title: "footing", details: "" })],
      [makeSession({ title: "footing", details: "" })],
      [makeSession({ title: "footing", details: "" })], // dernière = race-week, exemptée
    ]);
    const r = checkB12(plan, ["Limiteur #1 — VO2max bas"]);
    expect(r.pass).toBe(true);
    expect(r.details.some(d => d.startsWith("⚠") && d.includes("couverture faible"))).toBe(true);
  });

  it("les séances rest ne comptent jamais comme couverture", () => {
    const plan = makePlan([[makeSession({ isRest: true, sport: "rest", title: "Repos", catalogId: "VO2_BILLAT_3030" })]]);
    const r = checkB12(plan, ["Limiteur #1 — VO2max bas"]);
    expect(r.pass).toBe(false);
  });
});

describe("checkB12ToValidationIssues", () => {
  it("ne convertit que les lignes ❌ (L1/L2 absent), pas les ⚠", () => {
    const result = checkB12(
      makePlan([[makeSession({ title: "footing", details: "" })]]),
      ["Limiteur #1 — VO2max bas", "Limiteur #2 — Économie basse"],
    );
    const issues = checkB12ToValidationIssues(result);
    expect(issues.length).toBe(2);
    expect(issues.every(i => i.rule === "limiter_coverage" && i.severity === "error")).toBe(true);
  });

  it("plan propre → liste vide", () => {
    const result = checkB12(
      makePlan([[makeSession({ catalogId: "VO2_BILLAT_3030" })]]),
      ["Limiteur #1 — VO2max bas"],
    );
    expect(checkB12ToValidationIssues(result)).toEqual([]);
  });
});
