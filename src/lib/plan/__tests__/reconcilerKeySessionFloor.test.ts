/**
 * Fix 4/4 vague 1 (audit "génération de plan IA", volet composition
 * hebdomadaire) — le plancher FLOOR de quota côté réconciliateur client
 * (STEP 4a de runReconciler) ne se déclenchait que si `cnt(sport) === 0`
 * (aucune séance de ce sport DU TOUT). Un sport avec 2-3 séances toutes
 * classées récupération/technique (isKeySession=false) passait donc sans
 * jamais recevoir de séance de qualité. Le fix introduit `cntKey`, qui ne
 * compte que les séances marquées isKeySession=true pour swim/bike/run
 * (renfo garde l'ancien critère de présence simple).
 */
import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk } from "@/lib/plan/planSchema";
import type { WeekQuotaEntry } from "@/lib/plan/validateWeeklyQuotas";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    {
      id: "SWIM_ENDURANCE_BUILD",
      cat: "A", sport: "swim", objectif: "Endurance", necessite: "Obligatoire",
      when: "Toute l'année", phase: ["base", "build"] as any,
      avoid: "", durationMin: [50, 75], metricKey: "pace", sportKey: "swim",
      structure: [{ part: "Main", text: "40' Z2", zones: ["Z2"] }],
      variants: {}, tags: ["endurance", "swim"], goals: ["half"],
    },
    {
      id: "STRENGTH_GENERAL_BUILD",
      cat: "A", sport: "strength", objectif: "Général", necessite: "Recommandé",
      when: "Toute l'année", phase: ["base", "build"] as any,
      avoid: "", durationMin: [40, 50], metricKey: "cardiaque", sportKey: "strength",
      structure: [{ part: "Main", text: "Circuit général", zones: [] }],
      variants: {}, tags: ["renfo"], goals: ["half"],
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { runReconciler } from "@/lib/plan/planReconciler";

function makeQuota(overrides: Partial<WeekQuotaEntry["quota"]> = {}): WeekQuotaEntry {
  return {
    quota: {
      swim: { min: 1, max: 5 },
      bike: { min: 0, max: 0 },
      run: { min: 0, max: 0 },
      brick: { min: 0, max: 0 },
      strength: { min: 1, max: 5 },
      maxSessionsPerDay: 2,
      minFullRestDays: 1,
      ...overrides,
    } as any,
    floors: { minSwimPerWeek: 1, minStrengthPerWeek: 0, longRideWeekly: false, longRunWeekly: false } as any,
    weekType: "load",
    downgraded: false,
  };
}

function makeChunk(sessions: any[], phase = "build"): PlanChunk {
  return {
    weeks: [{ weekNumber: 1, phase, theme: "T", sessions }],
  } as unknown as PlanChunk;
}

describe("runReconciler — plancher FLOOR par séance clé, pas par simple présence (fix 4/4 vague 1)", () => {
  it("swim 100% récup (2 séances, aucune clé) + quota min=1 → le floor s'active quand même", () => {
    const sessions: any[] = [
      { day: "mardi", sport: "swim", title: "Récup", details: "", isKeySession: false, custom: true, durationMin: 30, zones: ["Z1"] },
      { day: "jeudi", sport: "swim", title: "Technique", details: "", isKeySession: false, custom: true, durationMin: 30, zones: ["Z1"] },
    ];
    // P0 (consigne coach, suite PR #376) : phase recalculée numériquement —
    // globalTotalWeeks:10 place la semaine 1 en "base" (pct=10%), compatible
    // avec les fiches mock phase:["base","build"] (sans ça, weekNumber===
    // totalWeeks replié sur 1 semaine locale donnerait "taper", incompatible).
    const rec = runReconciler([makeChunk(sessions)], { 1: makeQuota({ strength: { min: 0, max: 5 } as any }) }, 1, undefined, { globalTotalWeeks: 10 });
    expect(rec.counters.quota_floor_inserted_from_catalog).toBe(1);
    const swimSessions = sessions.filter(s => s.sport === "swim");
    expect(swimSessions.length).toBe(3);
    expect(swimSessions.some(s => s.isKeySession === true && s.catalogId === "SWIM_ENDURANCE_BUILD")).toBe(true);
  });

  it("swim avec une séance déjà clé + quota min=1 → le floor ne se déclenche pas", () => {
    const sessions: any[] = [
      { day: "mardi", sport: "swim", title: "Endurance", details: "", isKeySession: true, custom: true, durationMin: 60, zones: ["Z2"] },
      { day: "jeudi", sport: "swim", title: "Technique", details: "", isKeySession: false, custom: true, durationMin: 30, zones: ["Z1"] },
    ];
    const rec = runReconciler([makeChunk(sessions)], { 1: makeQuota({ strength: { min: 0, max: 5 } as any }) }, 1);
    expect(rec.counters.quota_floor_inserted_from_catalog).toBe(0);
    expect(sessions.filter(s => s.sport === "swim").length).toBe(2);
  });

  it("régression : renfo garde le critère de simple présence (aucune notion de séance clé)", () => {
    const sessions: any[] = [
      { day: "mercredi", sport: "strength", title: "Renfo", details: "", isKeySession: false, custom: true, durationMin: 45, zones: [] },
    ];
    const rec = runReconciler([makeChunk(sessions)], { 1: makeQuota({ swim: { min: 0, max: 5 } as any }) }, 1);
    expect(rec.counters.quota_floor_inserted_from_catalog).toBe(0);
    expect(sessions.filter(s => s.sport === "strength").length).toBe(1);
  });
});

describe("quota rempli sans tag clé — aucune séance supplémentaire", () => {
  it("signale le conflit plutôt qu'insérer puis supprimer une séance sportive", () => {
    const sessions = ["mardi", "jeudi"].map(day => ({ day, sport: "swim", title: "Endurance nage", details: "45min Z2",
      durationMin: 45, zones: ["Z2"], custom: true, catalogId: null, isKeySession: false }));
    const chunk = { weeks: [{ weekNumber: 1, phase: "base", theme: "Fondation", sessions }] } as PlanChunk;
    const before = structuredClone(sessions);
    const quota = makeQuota({ swim: { min: 2, max: 2 }, strength: { min: 0, max: 0 }, totalSessions: { min: 2, max: 2 } });
    const result = runReconciler([chunk], { 1: quota }, 2, undefined, { globalTotalWeeks: 33 });
    expect(chunk.weeks[0].sessions).toEqual(before);
    expect(result.counters.quota_floor_inserted_from_catalog).toBe(0);
    expect(result.counters.quota_floor_unresolved).toBeGreaterThan(0);
  });
});
