/**
 * Fix B3 (audit "génération de plan IA") : le réconciliateur client
 * (planReconciler.ts::findReplacement) n'avait aucune notion de "facteur
 * limitant" — contrairement au serveur (jsonPlanHandler.ts::matchesLimiter)
 * qui cible explicitement le limiteur L1 de l'athlète à l'insertion. Le
 * client, qui s'exécute APRÈS sur les mêmes chunks (substitutions phase/
 * durée/discipline), pouvait donc remplacer une insertion pertinente par
 * une fiche générique sans jamais tenir compte de ce ciblage.
 *
 * `RunReconcilerOptions.primaryLimiter` (libellé brut, ex. "VO2max") est
 * converti en mots-clés (limiterKeywords.ts, mirror du extractLimiterKeywords
 * serveur) et injecté dans `findReplacement` comme bonus de score DOMINANT
 * (avant intention/durée/diversité) — même priorité absolue que le tri à 2
 * niveaux du serveur.
 */
import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    // Original : phase "base" uniquement — la semaine "build" ci-dessous
    // déclenche donc une substitution PHASE (step 1 de runOnePass).
    {
      id: "ORIG_RUN_BASE_ONLY",
      cat: "B", sport: "run", objectif: "Seuil continu", necessite: "Recommandé",
      when: "Base", phase: ["base"] as any,
      avoid: "", durationMin: [50, 70], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "3x10min seuil Z4", zones: ["Z4"] }],
      variants: {}, tags: ["seuil"], goals: ["semi"],
    },
    // Candidat "intention proche" — même cat, goal partagé, même famille de
    // zone, même necessite, durée très proche de la cible (60min). Gagnerait
    // SANS bonus limiteur (intentScore élevé, faible pénalité de durée).
    {
      id: "NEAR_INTENT_RUN_BUILD",
      cat: "B", sport: "run", objectif: "Seuil continu proche", necessite: "Recommandé",
      when: "Build", phase: ["build"] as any,
      avoid: "", durationMin: [55, 75], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "2x15min seuil Z4", zones: ["Z4"] }],
      variants: {}, tags: ["seuil"], goals: ["semi"],
    },
    // Candidat ciblant le limiteur VO2max — cat différente, aucun goal
    // partagé, famille de zone différente, necessite différente → intentScore
    // nul, perdrait largement face au candidat "intention proche" sur ce seul
    // critère. Durée : range large [45,90] pour rester un candidat VALIDE
    // (ficheDurationContains exige dur∈[a,b] — un filtre dur, pas un score),
    // mais médiane (67.5) plus éloignée de la cible (60) que le concurrent
    // (NEAR, médiane 65). Son texte contient "vo2"/"30/30" (mots-clés
    // extractLimiterKeywords pour "vo2max").
    {
      id: "LIMITER_MATCH_RUN_BUILD",
      cat: "A", sport: "run", objectif: "Intervalles VO2max 30/30", necessite: "Optionnel",
      when: "Build", phase: ["build"] as any,
      avoid: "", durationMin: [45, 90], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "12x30/30 VO2 Z5", zones: ["Z5"] }],
      variants: {}, tags: ["vo2"], goals: ["10k"],
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { runReconciler } from "@/lib/plan/planReconciler";

function makeChunk(session: any, phase = "build"): PlanChunk {
  return {
    weeks: [{
      weekNumber: 1, phase, theme: "T",
      sessions: [session],
    }],
  } as unknown as PlanChunk;
}

function makeSession(): any {
  return {
    day: "mardi", sport: "run", title: "Seuil", details: "", isKeySession: true,
    custom: false, catalogId: "ORIG_RUN_BASE_ONLY", durationMin: 60, zones: ["Z4"],
  };
}

describe("runReconciler — findReplacement priorise le limiteur L1 (fix B3)", () => {
  it("SANS primaryLimiter : le candidat de plus forte intention/durée proche l'emporte (comportement existant préservé)", () => {
    const s = makeSession();
    const rec = runReconciler([makeChunk(s)], {}, 1, undefined, { objectiveKey: "Marathon" });
    expect(s.catalogId).toBe("NEAR_INTENT_RUN_BUILD");
    expect(rec.counters.phase_substituted).toBe(1);
  });

  it("AVEC primaryLimiter='VO2max' : le candidat ciblant le limiteur l'emporte MALGRÉ une intention/durée bien moins favorables", () => {
    const s = makeSession();
    const rec = runReconciler([makeChunk(s)], {}, 1, undefined, { objectiveKey: "Marathon", primaryLimiter: "VO2max" });
    expect(s.catalogId).toBe("LIMITER_MATCH_RUN_BUILD");
    expect(rec.counters.phase_substituted).toBe(1);
  });

  it("primaryLimiter sans AUCUN candidat correspondant : repli sur le comportement normal (intention/durée)", () => {
    const s = makeSession();
    // "Natation" ne matche ni NEAR_INTENT_RUN_BUILD ni LIMITER_MATCH_RUN_BUILD.
    const rec = runReconciler([makeChunk(s)], {}, 1, undefined, { objectiveKey: "Marathon", primaryLimiter: "Natation" });
    expect(s.catalogId).toBe("NEAR_INTENT_RUN_BUILD");
    expect(rec.counters.phase_substituted).toBe(1);
  });
});
