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
import type { PlanChunk, PlanSession, DayLower } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => ({ WorkoutLibrary: [] as LibraryWorkout[] }));

import { runReconciler } from "@/lib/plan/planReconciler";

// `sport: "rest"` est volontairement utilisé ici avec `durationMin: 30` (pas 0)
// pour simuler un repos "placeholder" tel que produit par le générateur avant
// réconciliation — ne correspond à AUCUNE variante stricte de `PlanSession`
// (`zSessionRest` exige `durationMin: 0`), d'où la nécessité de l'assertion.
function session(day: DayLower, sport: string, title: string, isKeySession = false): PlanSession {
  return { day, sport, title, details: "", isKeySession, custom: true, catalogId: null, durationMin: 30, zones: [] } as PlanSession;
}

function makeChunk(weekNumber: number, sessions: PlanSession[]): PlanChunk {
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
    // Aucune séance D'ENTRAÎNEMENT supprimée — toujours les 2 vraies séances.
    expect(chunk.weeks[0].sessions.filter(s => s.sport !== "rest").length).toBe(2);
    expect(rec.logs.some(l => l.includes("[max_sessions_per_day_moved]"))).toBe(true);
  });

  it("le déplacement sur un jour de repos retire le placeholder repos désormais contradictoire (P0, consigne coach round 3)", () => {
    // Reproduit exactement l'anomalie du JSON réel 2026-10-14 : 8/12 semaines
    // avaient "Lundi" en double dans le plan final (une entrée "Repos" ET une
    // vraie séance), parce que enforceMaxSessionsPerDay déplaçait l'excédent
    // vers "lundi" (jour le moins chargé) sans jamais retirer le placeholder
    // repos déjà présent à ce jour.
    const run = session("mercredi", "run", "Course clé 5K", true);
    const strength = session("mercredi", "strength", "Renforcement Core Intégré");
    const restLundi = session("lundi", "rest", "Repos");
    const restMardi = session("mardi", "rest", "Repos");
    const chunk = makeChunk(5, [run, strength, restLundi, restMardi]);
    const rec = runReconciler([chunk], {}, 1, undefined, { maxSessionsPerDay: 1, globalTotalWeeks: 99, globalWeekOffset: 0 });

    expect(rec.counters.max_sessions_per_day_moved).toBe(1);
    expect(strength.day).toBe("lundi");
    const sessions = chunk.weeks[0].sessions;
    // Plus aucune entrée "Repos" sur lundi (le jour a reçu une vraie séance).
    expect(sessions.some(s => s.sport === "rest" && s.day === "lundi")).toBe(false);
    // Le jour de repos "mardi" (non concerné par le déplacement) reste intact.
    expect(sessions.some(s => s.sport === "rest" && s.day === "mardi")).toBe(true);
    // Une seule entrée au total pour "lundi", et c'est bien la séance déplacée.
    expect(sessions.filter(s => s.day === "lundi").length).toBe(1);
    expect(sessions.filter(s => s.day === "lundi")[0]).toBe(strength);
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
    const days: DayLower[] = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
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
