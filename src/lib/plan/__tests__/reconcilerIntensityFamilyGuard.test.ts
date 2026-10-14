/**
 * Audit "B-5K-BEGINNER round 2" (suite, consigne coach) : "Une réparation de
 * durée ne doit jamais transformer silencieusement une séance d'endurance
 * facile en séance VO2max, lactique, sprint ou VMA." Reproduit le mécanisme
 * confirmé côté client : `findReplacement` (planReconciler.ts), utilisé par
 * la substitution de DURÉE (`id_substituted_duration`) et par les filets
 * dédoublonnage/cumul-à-jeun, n'avait qu'un bonus de score SOUPLE (+2 points
 * dans `intentScore`) pour la famille d'intensité — insuffisant dès qu'un
 * candidat de famille différente est le seul (ou le mieux noté) match sport/
 * phase/durée disponible. `preserveOriginalFamily`/`requireFamily` en font
 * désormais un garde-fou DUR : jamais de repli vers une famille différente,
 * conflit signalé si aucun candidat compatible n'existe.
 *
 * La substitution PHASE (STEP 1, `phase_substituted`) reste volontairement
 * SANS ce garde-fou : c'est justement parce que la fiche d'origine est mal
 * placée (phase incompatible) qu'on la remplace — cf.
 * reconcilerPhaseLabelFallback.test.ts (remplace bien un VMA par une fiche
 * "easy" quand la phase réelle est "base").
 */
import { describe, it, expect } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk } from "@/lib/plan/planSchema";
import type { WeekQuotaEntry } from "@/lib/plan/validateWeeklyQuotas";
import { vi } from "vitest";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    // Original : sortie facile 45min, phase build (valide pour sa semaine),
    // mais 45min est hors plage d'une fiche catalogue qui en couvrirait 60 —
    // déclenche STEP 2 (durée), jamais STEP 1 (phase déjà compatible).
    {
      id: "EASY_RUN_45",
      cat: "A", sport: "run", objectif: "Sortie facile", necessite: "Recommandé",
      when: "Build", phase: ["base", "build"] as any,
      avoid: "", durationMin: [40, 50], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "40' Z2 continu", zones: ["Z2"] }],
      variants: {}, tags: ["endurance"], goals: ["10k"],
    },
    // Candidat VMA — même sport/phase, durée 60min CONTIENT la cible (60),
    // scorerait le mieux sur la seule durée s'il n'y avait pas le garde-fou.
    {
      id: "VMA_RUN_60",
      cat: "A", sport: "run", objectif: "VMA piste", necessite: "Recommandé",
      when: "Build", phase: ["base", "build"] as any,
      avoid: "", durationMin: [55, 65], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "10x400m Z5", zones: ["Z5"] }],
      variants: {}, tags: ["vma"], goals: ["10k"],
    },
    // Alternative facile — même durée cible, famille préservée : celle que
    // le garde-fou doit choisir.
    {
      id: "EASY_RUN_60",
      cat: "A", sport: "run", objectif: "Sortie facile longue", necessite: "Recommandé",
      when: "Build", phase: ["base", "build"] as any,
      avoid: "", durationMin: [55, 65], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "55' Z2 continu", zones: ["Z2"] }],
      variants: {}, tags: ["endurance"], goals: ["10k"],
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { runReconciler } from "@/lib/plan/planReconciler";

function makeSession(durationMin: number): any {
  return {
    day: "mardi", sport: "run", title: "Sortie facile", details: "", isKeySession: false,
    custom: false, catalogId: "EASY_RUN_45", durationMin, zones: ["Z2"],
  };
}

function makeChunk(session: any, weekNumber = 5): PlanChunk {
  return {
    weeks: [{ weekNumber, phase: "build", theme: "T", sessions: [session] }],
  } as unknown as PlanChunk;
}

describe("findReplacement — garde-fou famille d'intensité (réparation de durée)", () => {
  it("45min easy → cible 60min : choisit l'alternative EASY, jamais le VMA (même s'il score mieux sur la seule durée)", () => {
    const s = makeSession(60); // durée demandée par l'IA incompatible avec EASY_RUN_45 (40-50)
    const rec = runReconciler([makeChunk(s)], {}, 2, undefined, { globalTotalWeeks: 12 });
    expect(rec.counters.id_substituted_duration).toBe(1);
    expect(s.catalogId).toBe("EASY_RUN_60");
    expect(s.catalogId).not.toBe("VMA_RUN_60");
  });

  it("aucune alternative EASY disponible (catalogue restreint au VMA) → non résolu, jamais de VMA introduit", () => {
    const s = makeSession(60);
    const injected = new Set(["VMA_RUN_60"]); // seule alternative de durée compatible, mais famille différente
    const rec = runReconciler([makeChunk(s)], {}, 2, injected, { globalTotalWeeks: 12 });
    expect(rec.counters.id_substituted_duration).toBe(0);
    expect(rec.counters.duration_unresolved).toBe(1);
    expect(s.catalogId).toBe("EASY_RUN_45"); // conservée telle quelle, jamais dégradée
  });
});

describe("findReplacement — plancher SL (sortie longue run) : requireFamily explicite", () => {
  function makeQuota(): WeekQuotaEntry {
    return {
      quota: {
        swim: { min: 0, max: 0 }, bike: { min: 0, max: 0 }, run: { min: 1, max: 5 },
        brick: { min: 0, max: 0 }, strength: { min: 0, max: 0 },
        maxSessionsPerDay: 2, minFullRestDays: 1,
      } as any,
      floors: { minSwimPerWeek: 0, minStrengthPerWeek: 0, longRideWeekly: false, longRunWeekly: true, slLongRunMin: 60 } as any,
      weekType: "load",
      downgraded: false,
    };
  }

  it("plancher SL run (aucune séance run du tout) → insère EASY, jamais le VMA même mieux noté sur la durée", () => {
    const chunk: PlanChunk = {
      weeks: [{ weekNumber: 5, phase: "build", theme: "T", sessions: [] }],
    } as unknown as PlanChunk;
    const rec = runReconciler([chunk], { 5: makeQuota() }, 1, undefined, { globalTotalWeeks: 12 });
    expect(rec.counters.quota_floor_inserted_from_catalog).toBe(1);
    const inserted = (chunk.weeks[0].sessions as any[])[0];
    expect(inserted.catalogId).toBe("EASY_RUN_60");
  });
});
