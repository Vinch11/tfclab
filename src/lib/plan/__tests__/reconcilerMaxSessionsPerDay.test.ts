/**
 * Audit "B-5K-BEGINNER round 2" (JSON réel) : `planConfig.maxSessionsPerDay=1`
 * transmis au prompt, mais rien ne le faisait respecter en aval — le run réel
 * avait 2 séances (course + renforcement) le mercredi, S1 à S8, malgré cette
 * consigne explicite (`validateSessionDensity` le DÉTECTAIT déjà, 8 erreurs
 * "error" — rien ne le CORRIGEAIT). `enforceMaxSessionsPerDay` (planReconciler.ts)
 * déplace l'excédent vers un jour disponible, ne supprime JAMAIS une séance,
 * et signale explicitement un calendrier réellement impossible.
 */
import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => ({ WorkoutLibrary: [] as LibraryWorkout[] }));

import { runReconciler } from "@/lib/plan/planReconciler";

function session(day: string, sport: string, title: string, isKeySession = false): any {
  return { day, sport, title, details: "", isKeySession, custom: true, durationMin: 30, zones: [] };
}

function makeChunk(weekNumber: number, sessions: any[]): PlanChunk {
  return {
    weeks: [{ weekNumber, phase: "base", theme: "T", sessions }],
  } as unknown as PlanChunk;
}

describe("runReconciler — maxSessionsPerDay (P0, jamais de suppression silencieuse)", () => {
  it("2 séances le même jour, max=1 → l'excédent est déplacé vers le jour le moins chargé de la semaine", () => {
    const run = session("mercredi", "run", "Course 5K");
    const strength = session("mercredi", "strength", "Renforcement");
    const chunk = makeChunk(1, [
      run,
      strength,
      session("lundi", "rest", "Repos"),
    ]);
    const rec = runReconciler([chunk], {}, 1, undefined, { maxSessionsPerDay: 1, globalTotalWeeks: 99, globalWeekOffset: 0 });
    expect(rec.counters.max_sessions_per_day_moved).toBe(1);
    expect(rec.counters.max_sessions_per_day_unresolved ?? 0).toBe(0);
    // Les deux séances ne sont plus sur le même jour.
    expect(run.day).not.toBe(strength.day);
    // Aucune séance supprimée.
    expect(chunk.weeks[0].sessions.length).toBe(3);
    expect(rec.logs.some(l => l.includes("[max_sessions_per_day_moved]"))).toBe(true);
  });

  it("séance-clé conservée sur son jour d'origine, la non-clé est déplacée", () => {
    const key = session("mercredi", "run", "Course clé 5K", true);
    const other = session("mercredi", "strength", "Renforcement", false);
    const chunk = makeChunk(1, [key, other]);
    runReconciler([chunk], {}, 1, undefined, { maxSessionsPerDay: 1, globalTotalWeeks: 99, globalWeekOffset: 0 });
    expect(key.day).toBe("mercredi");
    expect(other.day).not.toBe("mercredi");
  });

  it("calendrier réellement impossible : 2 séances/jour sur TOUS les jours de la semaine, max=1 → aucun déplacement possible, rien supprimé", () => {
    const days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
    const sessions = days.flatMap((d) => [session(d, "run", `${d}-a`), session(d, "strength", `${d}-b`)]);
    const chunk = makeChunk(1, sessions);
    const rec = runReconciler([chunk], {}, 1, undefined, { maxSessionsPerDay: 1, globalTotalWeeks: 99, globalWeekOffset: 0 });
    expect(rec.counters.max_sessions_per_day_moved ?? 0).toBe(0);
    // 1 excédent par jour (2 séances - max 1) × 7 jours = 7 séances à déplacer,
    // aucune ne trouve de jour disponible (tous déjà à 2 ≥ max 1).
    expect(rec.counters.max_sessions_per_day_unresolved).toBe(7);
    expect(chunk.weeks[0].sessions.length).toBe(14); // aucune supprimée
    expect(rec.logs.some(l => l.includes("[max_sessions_per_day_unresolved]") && l.includes("aucun jour"))).toBe(true);
  });

  it("maxSessionsPerDay non fourni → comportement legacy inchangé (aucune application)", () => {
    const run = session("mercredi", "run", "Course 5K");
    const strength = session("mercredi", "strength", "Renforcement");
    const chunk = makeChunk(1, [run, strength]);
    const rec = runReconciler([chunk], {}, 1);
    expect(rec.counters.max_sessions_per_day_moved ?? 0).toBe(0);
    expect(run.day).toBe("mercredi");
    expect(strength.day).toBe("mercredi");
  });
});
