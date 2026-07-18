/**
 * Reco 3 — Substitution automatique des catalogId hors catalogue injecté
 * vers voisin réel du catalogue avec 5 garde-fous stricts.
 */
import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk } from "@/lib/plan/planSchema";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    // "Fantôme" — présent en librairie mais retiré du catalogue injecté par filtre phase.
    // Famille = seuil (via "seuil" dans id/text). Sport run. Phase peak seulement.
    {
      id: "GHOST_RUN_SEUIL_PEAK",
      cat: "B", sport: "run", objectif: "Seuil pyramidal", necessite: "Recommandé",
      when: "Peak", phase: ["peak"] as any,
      avoid: "", durationMin: [55, 70], metricKey: "pace", sportKey: "run",
      structure: [
        { part: "Warm-up", text: "15' Z1", zones: ["Z1"] },
        { part: "Main", text: "3x10' seuil Z4", zones: ["Z4"] },
        { part: "Cool-down", text: "5' Z1", zones: ["Z1"] },
      ],
      variants: {}, tags: ["seuil", "run"], goals: ["semi", "10k"],
    },
    // Voisin idéal — dans catalogue injecté, mêmes sport/famille/phase, durée proche.
    {
      id: "NEIGHBOR_RUN_SEUIL_BUILD",
      cat: "B", sport: "run", objectif: "Seuil continu", necessite: "Recommandé",
      when: "Build", phase: ["build", "peak"] as any,
      avoid: "", durationMin: [50, 75], metricKey: "pace", sportKey: "run",
      structure: [
        { part: "Warm-up", text: "15' Z1", zones: ["Z1"] },
        { part: "Main", text: "2x15' seuil Z4", zones: ["Z4"] },
        { part: "Cool-down", text: "5' Z1", zones: ["Z1"] },
      ],
      variants: {}, tags: ["seuil", "run"], goals: ["semi", "10k"],
    },
    // Voisin bike — même famille seuil mais sport différent → doit être rejeté.
    {
      id: "NEIGHBOR_BIKE_SEUIL_BUILD",
      cat: "B", sport: "bike", objectif: "Seuil vélo", necessite: "Recommandé",
      when: "Build", phase: ["build"] as any,
      avoid: "", durationMin: [55, 90], metricKey: "power", sportKey: "bike",
      structure: [
        { part: "Main", text: "3x12' seuil Z4", zones: ["Z4"] },
      ],
      variants: {}, tags: ["seuil", "bike"], goals: ["semi"],
    },
    // Voisin run seuil mais durée hors ±25% (fantôme médiane ~62, ce voisin ~120).
    {
      id: "NEIGHBOR_RUN_SEUIL_LONG",
      cat: "B", sport: "run", objectif: "Seuil long", necessite: "Recommandé",
      when: "Build", phase: ["build"] as any,
      avoid: "", durationMin: [110, 130], metricKey: "pace", sportKey: "run",
      structure: [
        { part: "Main", text: "2x25' seuil Z4", zones: ["Z4"] },
      ],
      variants: {}, tags: ["seuil"], goals: ["marathon"],
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

describe("runReconciler — substitution catalogId vers voisin réel (Reco 3)", () => {
  it("Cas 1 : voisin idéal (même sport/famille/phase, durée ≤25%) → substitution réussie + traçabilité", () => {
    const s: any = {
      day: "mardi", sport: "run", title: "Seuil", details: "", isKeySession: true,
      custom: false, catalogId: "GHOST_RUN_SEUIL_PEAK", durationMin: 60, zones: ["Z4"],
    };
    const injected = new Set(["NEIGHBOR_RUN_SEUIL_BUILD", "NEIGHBOR_BIKE_SEUIL_BUILD", "NEIGHBOR_RUN_SEUIL_LONG"]);
    const rec = runReconciler([makeChunk(s, "build")], {}, 1, injected);
    expect(rec.counters.id_remapped_to_neighbor).toBe(1);
    expect(s.catalogId).toBe("NEIGHBOR_RUN_SEUIL_BUILD");
    expect(s.catalogIdOrigin).toBe("GHOST_RUN_SEUIL_PEAK");
    expect(s.catalogIdSubstituted).toBe(true);
    expect(rec.logs.some(l => l.includes("[catalog_id_substituted]") && l.includes("GHOST_RUN_SEUIL_PEAK"))).toBe(true);
  });

  it("Cas 2 : seul voisin même famille est d'un autre sport → refus, catalogId inchangé (B5 remonte)", () => {
    const s: any = {
      day: "mardi", sport: "run", title: "Seuil", details: "", isKeySession: true,
      custom: false, catalogId: "GHOST_RUN_SEUIL_PEAK", durationMin: 60, zones: ["Z4"],
    };
    // Injecte SEULEMENT le voisin bike (sport différent).
    // Week phase = "peak" pour éviter que runOnePass (phase reconciler générique)
    // ne substitue depuis la librairie complète : on isole strictement le filet neighbor-remap.
    const injected = new Set(["NEIGHBOR_BIKE_SEUIL_BUILD"]);
    const rec = runReconciler([makeChunk(s, "peak")], {}, 1, injected);
    expect(rec.counters.id_remapped_to_neighbor).toBe(0);
    expect(rec.counters.id_remap_no_intent_match_fallback_custom).toBe(1);
    expect(s.catalogId).toBe("GHOST_RUN_SEUIL_PEAK"); // inchangé
    expect(s.custom).toBe(false); // pas de bascule custom
    expect(s.catalogIdSubstituted).toBeUndefined();
  });

  it("Cas 3 : seul voisin est hors ±25% de durée → refus, catalogId inchangé", () => {
    const s: any = {
      day: "mardi", sport: "run", title: "Seuil", details: "", isKeySession: true,
      custom: false, catalogId: "GHOST_RUN_SEUIL_PEAK", durationMin: 60, zones: ["Z4"],
    };
    // Injecte SEULEMENT le voisin trop long (médiane 120 vs cible 60 → Δ=60 > 15).
    // Week phase = "peak" pour la même raison qu'au cas 2.
    const injected = new Set(["NEIGHBOR_RUN_SEUIL_LONG"]);
    const rec = runReconciler([makeChunk(s, "peak")], {}, 1, injected);
    expect(rec.counters.id_remapped_to_neighbor).toBe(0);
    expect(s.catalogId).toBe("GHOST_RUN_SEUIL_PEAK");
  });


  it("Cas 4 : pur_hallucination (ID absent de la librairie) → aucune touche, laissé pour B5", () => {
    const s: any = {
      day: "mardi", sport: "run", title: "Séance IA", details: "", isKeySession: true,
      custom: false, catalogId: "TOTALLY_MADE_UP_ID_XYZ", durationMin: 60, zones: ["Z4"],
    };
    const injected = new Set(["NEIGHBOR_RUN_SEUIL_BUILD"]);
    const rec = runReconciler([makeChunk(s, "build")], {}, 1, injected);
    expect(rec.counters.id_remapped_to_neighbor).toBe(0);
    expect(rec.counters.id_remap_no_intent_match_fallback_custom).toBe(0);
    expect(s.catalogId).toBe("TOTALLY_MADE_UP_ID_XYZ"); // intact
    expect(s.custom).toBe(false);
  });
});
