/**
 * Mission Axe C (consigne coach) : `findReplacement` (réconciliateur
 * post-génération) ne doit jamais RÉINTRODUIRE une des 8 fiches à
 * prérequis de niveau confirmé pour un profil non confirmé (untrained/
 * light) — même garde-fou nominatif que celui appliqué au catalogue
 * initial (`workoutCatalogBuilder.ts`), partagé via
 * `levelPrerequisiteCompatibility.ts` (jamais deux listes divergentes).
 * Avant ce correctif, `findReplacement` n'avait AUCUN garde-fou de niveau
 * — une réparation de phase/durée/discipline pouvait réintroduire une de
 * ces 8 fiches même pour un profil untrained/light.
 *
 * Bibliothèque mockée (déterministe, même convention que
 * reconcilerRaceSimObjectiveGuard.test.ts) — reprend l'ID RÉEL
 * `CANOVA_RUN_INTRODUCTIVE_PHASE` avec son `avoid` authentique.
 */
import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout, PhaseTag } from "@/types/workoutLibrary";
import type { PlanChunk, PlanSession } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    // Original : phase "peak" uniquement — placé dans une semaine "build"
    // ci-dessous, ce qui déclenche une substitution PHASE (step 1).
    {
      id: "ORIG_RUN_PEAK_ONLY",
      cat: "B", sport: "run", objectif: "Seuil continu", necessite: "Recommandé",
      when: "Peak", phase: ["peak"],
      avoid: "", durationMin: [55, 70], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "3x10min seuil Z4", zones: ["Z4"] }],
      variants: {}, tags: ["seuil"], goals: ["5k"],
    },
    // Reprend l'ID RÉEL + contenu authentique de CANOVA_RUN_INTRODUCTIVE_PHASE
    // — SEUL candidat sport=run compatible phase "build" + durée 60min dans
    // ce mock, pour prouver que le garde-fou bloque bien la réintroduction
    // même quand c'est l'unique alternative.
    {
      id: "CANOVA_RUN_INTRODUCTIVE_PHASE",
      cat: "B", sport: "course", objectif: "Phase Introductive Canova — premiers contacts avec l'allure course",
      necessite: "Recommandé", when: "Base/Build", phase: ["base", "build"],
      avoid: "Fatigue de base · Moins de 4 semaines d'entraînement régulier",
      durationMin: [55, 70], metricKey: "allure", sportKey: "course",
      structure: [{ part: "Main", text: "4-6×[3-4 min à allure course cible + 2 min récup]", zones: ["Z3", "Z4"] }],
      variants: {}, tags: ["Canova", "introductive"], goals: ["5k"],
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
    custom: false, catalogId: "ORIG_RUN_PEAK_ONLY", durationMin: 60, zones: ["Z4"],
  };
}

describe("runReconciler/findReplacement — garde-fou prérequis de niveau (Mission Axe C)", () => {
  it("profil untrained/manual : même quand CANOVA_RUN_INTRODUCTIVE_PHASE est l'UNIQUE candidat phase/durée compatible, elle n'est jamais réintroduite — la réparation PHASE reste non résolue plutôt que d'introduire une fiche incompatible", () => {
    const s = makeSession();
    const rec = runReconciler([makeChunk(s)], {}, 1, undefined, {
      globalTotalWeeks: 12,
      beginnerIntensitySignal: { trainingLevel: "untrained", trainingLevelSource: "manual" },
    });
    expect(s.catalogId).toBe("ORIG_RUN_PEAK_ONLY"); // inchangée, jamais remplacée par la fiche bannie
    expect(rec.counters.phase_unresolved).toBe(1);
    expect(rec.counters.phase_substituted).toBe(0);
  });

  it("profil trained/manual : le prérequis est satisfait mais l'intention race-pace ne remplace pas un seuil", () => {
    const s = makeSession();
    const rec = runReconciler([makeChunk(s)], {}, 1, undefined, {
      globalTotalWeeks: 12,
      beginnerIntensitySignal: { trainingLevel: "trained", trainingLevelSource: "manual" },
    });
    expect(s.catalogId).toBe("ORIG_RUN_PEAK_ONLY");
    expect(rec.counters.phase_unresolved).toBe(1);
  });

  it("profil untrained/fallback-prudent : l'incertitude de niveau n'autorise pas un changement d'intention", () => {
    const s = makeSession();
    const rec = runReconciler([makeChunk(s)], {}, 1, undefined, {
      globalTotalWeeks: 12,
      beginnerIntensitySignal: { trainingLevel: "untrained", trainingLevelSource: "fallback-prudent" },
    });
    expect(s.catalogId).toBe("ORIG_RUN_PEAK_ONLY");
    expect(rec.counters.phase_unresolved).toBe(1);
  });

  it("sans beginnerIntensitySignal : une intention inconnue du profil ne sert pas de joker", () => {
    const s = makeSession();
    const rec = runReconciler([makeChunk(s)], {}, 1, undefined, { globalTotalWeeks: 12 });
    expect(s.catalogId).toBe("ORIG_RUN_PEAK_ONLY");
    expect(rec.counters.phase_unresolved).toBe(1);
  });
});
