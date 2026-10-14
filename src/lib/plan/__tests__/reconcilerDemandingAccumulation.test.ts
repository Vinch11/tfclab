/**
 * Audit "B-5K-BEGINNER round 2" (JSON réel, consigne coach suite PR #376) :
 * S4/S10 cumulaient 3 séances "vo2" (sprints côtes + fartlek intense + VMA
 * piste) dans la MÊME semaine d'une débutante à seulement 3 séances/semaine.
 * `validateDemandingSessionAccumulation` (planValidator.ts) DÉTECTE déjà ce
 * cas après génération — ce test reproduit le garde-fou PROACTIF côté
 * réconciliateur (`enforceDemandingAccumulation`, planReconciler.ts) qui
 * l'empêche d'apparaître en sortie, au lieu de seulement le signaler.
 *
 * Même seuil proportionnel que le validateur (`demandingSessionCap` :
 * Math.max(1, Math.floor(activeCount/2))) — sur 3 séances actives, au plus 1
 * peut rester "vo2" ; l'excédent est downgradé vers une alternative
 * threshold/easy, JAMAIS supprimé. Strictement scopé à un signal de niveau
 * fiable (manual/auto-tss) et untrained/light — un confirmé (même visant
 * "finisher") garde l'accès complet aux séances exigeantes.
 */
import { describe, it, expect } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk } from "@/lib/plan/planSchema";
import { vi } from "vitest";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    // Les 3 séances "qualitatives" réelles du cas S4/S10 — toutes famille "vo2".
    {
      id: "VMA_PISTE",
      cat: "A", sport: "run", objectif: "VMA piste", necessite: "Recommandé",
      when: "Build", phase: ["base", "build"] as any,
      avoid: "", durationMin: [55, 65], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "10x400m Z5", zones: ["Z5"] }],
      variants: {}, tags: ["vma"], goals: ["5k"],
    },
    // Alternative threshold/easy disponible — celle que le garde-fou doit
    // choisir pour l'excédent (jamais une suppression, jamais un autre vo2).
    {
      id: "EF_LONGUE",
      cat: "A", sport: "run", objectif: "Endurance fondamentale", necessite: "Recommandé",
      when: "Build", phase: ["base", "build"] as any,
      avoid: "", durationMin: [55, 65], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "60' Z2 continu", zones: ["Z2"] }],
      variants: {}, tags: ["endurance"], goals: ["5k"],
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { runReconciler } from "@/lib/plan/planReconciler";

function qualSession(day: string): any {
  return {
    day, sport: "run", title: "VMA piste", details: "", isKeySession: false,
    custom: false, catalogId: "VMA_PISTE", durationMin: 60, zones: ["Z5"],
  };
}

function makeThreeQualChunk(): PlanChunk {
  return {
    weeks: [{
      weekNumber: 5, phase: "build", theme: "T",
      sessions: [qualSession("mardi"), qualSession("jeudi"), qualSession("samedi")],
    }],
  } as unknown as PlanChunk;
}

describe("enforceDemandingAccumulation — garde-fou proactif accumulation (débutant confirmé uniquement)", () => {
  it("3 séances 'vo2' / 3 actives, niveau untrained + source manual (fiable) → downgrade l'excédent (seuil=1), jamais de suppression", () => {
    const chunk = makeThreeQualChunk();
    const rec = runReconciler([chunk], {}, 2, undefined, {
      globalTotalWeeks: 12,
      beginnerIntensitySignal: { trainingLevel: "untrained", trainingLevelSource: "manual" },
    });

    const sessions = chunk.weeks[0].sessions as any[];
    expect(sessions.length).toBe(3); // jamais de suppression silencieuse
    const vo2Count = sessions.filter((s) => s.catalogId === "VMA_PISTE").length;
    expect(vo2Count).toBeLessThanOrEqual(1); // demandingSessionCap(3) = 1
    expect(rec.counters.demanding_accumulation_downgraded).toBe(2);
    expect(sessions.filter((s) => s.catalogId === "EF_LONGUE").length).toBe(2);
  });

  it("même semaine, niveau 'trained' (confirmé) avec source manual → aucune modification (accès complet préservé)", () => {
    const chunk = makeThreeQualChunk();
    const rec = runReconciler([chunk], {}, 2, undefined, {
      globalTotalWeeks: 12,
      beginnerIntensitySignal: { trainingLevel: "trained", trainingLevelSource: "manual" },
    });

    const sessions = chunk.weeks[0].sessions as any[];
    expect(sessions.filter((s) => s.catalogId === "VMA_PISTE").length).toBe(3);
    expect(rec.counters.demanding_accumulation_downgraded ?? 0).toBe(0);
  });

  it("niveau untrained MAIS source fallback-prudent → contrôle inactif (fallback jamais traité comme fiable)", () => {
    const chunk = makeThreeQualChunk();
    const rec = runReconciler([chunk], {}, 2, undefined, {
      globalTotalWeeks: 12,
      beginnerIntensitySignal: { trainingLevel: "untrained", trainingLevelSource: "fallback-prudent" },
    });

    const sessions = chunk.weeks[0].sessions as any[];
    expect(sessions.filter((s) => s.catalogId === "VMA_PISTE").length).toBe(3);
    expect(rec.counters.demanding_accumulation_downgraded ?? 0).toBe(0);
  });

  it("aucun signal transmis (null) → comportement legacy inchangé (contrôle inactif)", () => {
    const chunk = makeThreeQualChunk();
    const rec = runReconciler([chunk], {}, 2, undefined, {
      globalTotalWeeks: 12,
      beginnerIntensitySignal: null,
    });

    const sessions = chunk.weeks[0].sessions as any[];
    expect(sessions.filter((s) => s.catalogId === "VMA_PISTE").length).toBe(3);
    expect(rec.counters.demanding_accumulation_downgraded ?? 0).toBe(0);
  });

  it("aucune alternative threshold/easy disponible (catalogue restreint au vo2 seul) → non résolu, signalé, JAMAIS supprimé", () => {
    const chunk = makeThreeQualChunk();
    const injected = new Set(["VMA_PISTE"]); // seule fiche injectée au LLM pour ce chunk
    const rec = runReconciler([chunk], {}, 2, injected, {
      globalTotalWeeks: 12,
      beginnerIntensitySignal: { trainingLevel: "untrained", trainingLevelSource: "manual" },
    });

    const sessions = chunk.weeks[0].sessions as any[];
    expect(sessions.length).toBe(3); // conservées, jamais supprimées
    expect(sessions.filter((s) => s.catalogId === "VMA_PISTE").length).toBe(3); // pas de dégradation incompatible
    expect(rec.counters.demanding_accumulation_unresolved).toBe(2);
    expect(rec.counters.demanding_accumulation_downgraded ?? 0).toBe(0);
  });
});
