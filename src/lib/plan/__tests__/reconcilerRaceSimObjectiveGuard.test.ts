/**
 * Mission 2D (palier 1, consigne coach) : `findReplacement` (réconciliateur
 * post-génération) ne doit jamais RÉINTRODUIRE une des 5 fiches *_RACE_SIM
 * incompatibles avec l'objectif courant (5K/10K) — même garde-fou nominatif
 * que celui appliqué au catalogue initial (`workoutCatalogBuilder.ts`),
 * partagé via `raceSimCompatibility.ts` (jamais deux listes divergentes).
 * Avant ce correctif, `findReplacement` n'avait AUCUN garde-fou de distance
 * (retiré avec le correctif #1 de PR #377) — une réparation de phase/durée/
 * discipline pouvait réintroduire une de ces 5 fiches même pour un objectif
 * 5K/10K, exactement le trou documenté en Mission 2D §6.
 *
 * Bibliothèque mockée (déterministe, même convention que
 * reconcilerLimiterBonus.test.ts) — reprend l'ID RÉEL `V3_RUN_10K_RACE_SIM`
 * avec ses `goals`/durée authentiques (cf. enrichedWorkoutsV3.ts) pour que
 * le garde-fou (qui matche sur ID exact) s'applique réellement.
 */
import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout, PhaseTag } from "@/types/workoutLibrary";
import type { PlanChunk, PlanSession } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    // Original : phase "base" uniquement — placé dans une semaine "build"
    // ci-dessous, ce qui déclenche une substitution PHASE (step 1).
    {
      id: "ORIG_RUN_BASE_ONLY",
      cat: "B", sport: "run", objectif: "Seuil continu", necessite: "Recommandé",
      when: "Base", phase: ["base"],
      avoid: "", durationMin: [50, 70], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "3x10min seuil Z4", zones: ["Z4"] }],
      variants: {}, tags: ["seuil"], goals: ["semi"],
    },
    // Reprend l'ID RÉEL + goals/durée authentiques de V3_RUN_10K_RACE_SIM
    // (cf. enrichedWorkoutsV3.ts) — SEUL candidat sport=run compatible phase
    // "build" + durée 50min dans ce mock, pour prouver que le garde-fou
    // bloque bien la réintroduction même quand c'est l'unique alternative.
    {
      id: "V3_RUN_10K_RACE_SIM",
      cat: "Race-Sim", sport: "course", objectif: "Simulation course 10K — dress rehearsal",
      necessite: "Obligatoire", when: "S-2 avant 10K cible", phase: ["build", "peak"],
      avoid: "Plus de 2 fois dans le plan", durationMin: [40, 55], metricKey: "allure", sportKey: "running",
      structure: [{ part: "Main", text: "6-8 km à allure 10K cible", zones: ["Z4"] }],
      variants: {}, tags: ["race-sim", "10k", "simulation"], goals: ["10k"],
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { runReconciler } from "@/lib/plan/planReconciler";

function makeChunk(session: PlanSession, phase: PhaseTag = "build"): PlanChunk {
  return {
    weeks: [{
      weekNumber: 5, phase, theme: "T",
      sessions: [session],
    }],
  };
}

function makeSession(): PlanSession {
  return {
    day: "mardi", sport: "run", title: "Seuil", details: "", isKeySession: true,
    custom: false, catalogId: "ORIG_RUN_BASE_ONLY", durationMin: 50, zones: ["Z4"],
  };
}

describe("runReconciler/findReplacement — garde-fou objectif/distance RACE-SIM (Mission 2D, palier 1)", () => {
  it("objectif 5K : même quand V3_RUN_10K_RACE_SIM est l'UNIQUE candidat phase/durée compatible, elle n'est jamais réintroduite — la réparation PHASE reste non résolue plutôt que d'introduire une fiche incompatible", () => {
    const s = makeSession();
    const rec = runReconciler([makeChunk(s)], {}, 1, undefined, { objectiveKey: "5K", globalTotalWeeks: 12 });
    expect(s.catalogId).toBe("ORIG_RUN_BASE_ONLY"); // inchangée, jamais remplacée par la fiche bannie
    expect(rec.counters.phase_unresolved).toBe(1);
    expect(rec.counters.phase_substituted).toBe(0);
  });

  it("objectif 10K : une race-sim native reste refusée si elle change l'intention seuil initiale", () => {
    const s = makeSession();
    const rec = runReconciler([makeChunk(s)], {}, 1, undefined, { objectiveKey: "10K", globalTotalWeeks: 12 });
    expect(s.catalogId).toBe("ORIG_RUN_BASE_ONLY");
    expect(rec.counters.phase_unresolved).toBe(1);
  });

  it("sans objectiveKey : l'absence d'objectif ne transforme pas race-sim en joker d'intention", () => {
    const s = makeSession();
    const rec = runReconciler([makeChunk(s)], {}, 1, undefined, { globalTotalWeeks: 12 });
    expect(s.catalogId).toBe("ORIG_RUN_BASE_ONLY");
    expect(rec.counters.phase_unresolved).toBe(1);
  });
});
