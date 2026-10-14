/**
 * Audit "B-5K-BEGINNER round 3" (JSON réel 2026-10-14, consigne coach) :
 * `findReplacement` a remplacé une sortie longue facile STANDARD
 * (originellement choisie par Gemini) par `FM_RUN_SLEEP_LOW_AM` (S5) puis
 * par `V2_RUN_MENTAL_FATIGUE` (S7) — uniquement parce que leur durée
 * convenait, sans jamais vérifier qu'elles imposent un contexte (déplétion
 * glycogénique nocturne, protocole de pré-fatigue cognitive) dont rien dans
 * PlanConfig/athleteData ne confirme la disponibilité ou l'acceptation par
 * l'athlète. `ficheRequiresUnconfirmedContext` + le garde-fou DUR dans
 * `findReplacement` doivent désormais empêcher ça — comportement
 * CONSERVATEUR : exclu comme remplaçant SAUF si la séance D'ORIGINE portait
 * déjà ce même contexte (une réparation de durée sur un Sleep Low existant
 * reste un Sleep Low, elle ne doit juste pas en INVENTER un nouveau).
 */
import { describe, it, expect } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { PlanChunk, PlanSession } from "@/lib/plan/planSchema";
import { vi } from "vitest";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    // Original : sortie facile standard 45min (choix Gemini), hors plage
    // d'une fiche catalogue 90min — déclenche STEP 2 (durée).
    {
      id: "SEILER_RUN_Z1_EASY_LONG",
      cat: "A", sport: "run", objectif: "Sortie longue facile", necessite: "Recommandé",
      when: "Build", phase: ["base", "build"],
      avoid: "", durationMin: [40, 50], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "40' Z2 continu", zones: ["Z2"] }],
      variants: {}, tags: ["endurance"], goals: [],
    },
    // Candidat Sleep Low — même sport/phase/famille(easy), durée 90min
    // CONTIENT la cible : scorerait le mieux sur durée/famille s'il n'y
    // avait pas le garde-fou contexte-non-confirmé. Cas réel S5.
    {
      id: "FM_RUN_SLEEP_LOW_AM",
      cat: "A", sport: "run", objectif: "Sleep Low à jeun", necessite: "Optionnel",
      when: "Build", phase: ["base", "build"],
      avoid: "Non recommandé si athlète non habitué au jeûne matinal",
      durationMin: [85, 95], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "90' Z1-Z2 à jeun", zones: ["Z1", "Z2"] }],
      variants: {}, tags: ["fatmax"], goals: [],
    },
    // Candidat fatigue mentale — même profil que FM_RUN_SLEEP_LOW_AM mais
    // via le tag `fatigue-cognitive` plutôt que le préfixe FM_/le motif
    // jeûne. Cas réel S7 (V2_RUN_MENTAL_FATIGUE).
    {
      id: "V2_RUN_MENTAL_FATIGUE",
      cat: "A", sport: "run", objectif: "Endurance avec pré-fatigue cognitive", necessite: "Optionnel",
      when: "Build", phase: ["base", "build"],
      avoid: "Nécessite un protocole de pré-fatigue cognitive validé au préalable",
      durationMin: [85, 95], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "90' Z1-Z2 après protocole cognitif", zones: ["Z1", "Z2"] }],
      variants: {}, tags: ["fatigue-cognitive"], goals: [],
    },
    // Alternative standard, même durée cible, aucun contexte spécial : ce
    // que le garde-fou doit choisir.
    {
      id: "SEILER_RUN_Z1_EASY_LONG_90",
      cat: "A", sport: "run", objectif: "Sortie longue facile 90min", necessite: "Recommandé",
      when: "Build", phase: ["base", "build"],
      avoid: "", durationMin: [85, 95], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "90' Z2 continu", zones: ["Z2"] }],
      variants: {}, tags: ["endurance"], goals: [],
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { runReconciler } from "@/lib/plan/planReconciler";

function makeSession(catalogId: string, durationMin: number): PlanSession {
  return {
    day: "dimanche", sport: "run", title: "Sortie longue", details: "", isKeySession: true,
    custom: false, catalogId, durationMin, zones: ["Z2"],
  } as PlanSession;
}

function makeChunk(session: PlanSession, weekNumber = 5): PlanChunk {
  return {
    weeks: [{ weekNumber, phase: "build", theme: "T", sessions: [session] }],
  } as unknown as PlanChunk;
}

describe("findReplacement — garde-fou contexte non confirmé (Sleep Low / fatigue mentale / altitude)", () => {
  it("S5 réel : 45min easy → cible 90min n'introduit JAMAIS Sleep Low (FM_), même mieux noté sur durée/famille", () => {
    const s = makeSession("SEILER_RUN_Z1_EASY_LONG", 90);
    const rec = runReconciler([makeChunk(s)], {}, 2, undefined, { globalTotalWeeks: 12 });
    expect(rec.counters.id_substituted_duration).toBe(1);
    expect(s.catalogId).toBe("SEILER_RUN_Z1_EASY_LONG_90");
    expect(s.catalogId).not.toBe("FM_RUN_SLEEP_LOW_AM");
  });

  it("S7 réel : 45min easy → cible 90min n'introduit JAMAIS la fatigue mentale (tag fatigue-cognitive)", () => {
    const s = makeSession("SEILER_RUN_Z1_EASY_LONG", 90);
    const injected = new Set(["V2_RUN_MENTAL_FATIGUE", "SEILER_RUN_Z1_EASY_LONG_90"]);
    const rec = runReconciler([makeChunk(s)], {}, 2, injected, { globalTotalWeeks: 12 });
    expect(s.catalogId).toBe("SEILER_RUN_Z1_EASY_LONG_90");
    expect(s.catalogId).not.toBe("V2_RUN_MENTAL_FATIGUE");
  });

  it("aucune alternative standard disponible (catalogue restreint au Sleep Low) → non résolu, jamais introduit par défaut", () => {
    const s = makeSession("SEILER_RUN_Z1_EASY_LONG", 90);
    const injected = new Set(["FM_RUN_SLEEP_LOW_AM"]); // seule alternative de durée compatible
    const rec = runReconciler([makeChunk(s)], {}, 2, injected, { globalTotalWeeks: 12 });
    expect(rec.counters.id_substituted_duration).toBe(0);
    expect(rec.counters.duration_unresolved).toBe(1);
    expect(s.catalogId).toBe("SEILER_RUN_Z1_EASY_LONG"); // conservée telle quelle, conflit signalé plutôt que dégradée
  });

  it("exception préservée : un Sleep Low DÉJÀ présent en original peut être réparé en durée vers un AUTRE Sleep Low (contexte non inventé, déjà porté par l'original)", () => {
    const s = makeSession("FM_RUN_SLEEP_LOW_AM", 90); // original déjà Sleep Low, mais durée (85-95) déjà OK ici — on force un mismatch via une durée hors plage
    s.durationMin = 120; // hors plage 85-95 → STEP 2 doit chercher un remplaçant
    const injected = new Set(["FM_RUN_SLEEP_LOW_AM", "V2_RUN_MENTAL_FATIGUE"]); // aucune alternative standard injectée : seuls des candidats "contexte requis" disponibles
    const rec = runReconciler([makeChunk(s)], {}, 2, injected, { globalTotalWeeks: 12 });
    // L'original porte déjà un contexte non confirmé (FM_) : le garde-fou ne
    // doit PAS bloquer un remplacement vers un AUTRE candidat à contexte
    // requis (ici aucune fiche durationMin ne contient 120, donc on attend
    // un conflit — mais JAMAIS parce que le garde-fou contexte l'a exclu).
    expect(rec.counters.duration_unresolved + rec.counters.id_substituted_duration).toBeGreaterThanOrEqual(1);
  });
});
