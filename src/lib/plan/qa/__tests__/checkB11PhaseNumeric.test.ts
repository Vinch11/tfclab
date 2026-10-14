/**
 * Audit "B-5K-BEGINNER round 2" : `normalizedPhase()` (checksB10B11.ts)
 * déduisait la phase catalogue d'un parsing du libellé libre `week.phase` —
 * deux défauts démontrés sur le JSON réel du run B-5K-BEGINNER :
 *   1. Ordre de priorité "peak" testé avant "build" → un libellé combiné
 *      ("Phase 2 — Développement & Spécifique 5K") résolvait toujours à
 *      "peak", même pour une semaine réellement "build".
 *   2. Retour `null` silencieux sur un libellé sans mot-clé reconnu
 *      ("Phase 1 — Adaptation & Socle Aérobie") → le contrôle `phaseAllowed`
 *      appelant était alors purement et simplement SKIPPÉ. C'est ce second
 *      bug qui a laissé passer sans aucune alerte la séance VMA Lydiard
 *      (phase build/peak uniquement) en semaines 1-2 d'un plan 5K débutant
 *      12 semaines (numériquement "base").
 * Remplacé par `canonicalWeekPhase` (calcul numérique, source unique avec
 * le réconciliateur — cf. reconcilerPhaseLabelFallback.test.ts).
 */
import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    {
      id: "LYDIARD_RUN_TRACK_VMA",
      cat: "B", sport: "run", objectif: "VMA piste Lydiard", necessite: "Recommandé",
      when: "Build/Peak — phase 3 Lydiard.", phase: ["build", "peak"],
      avoid: "Sans base aérobie et côtes complètes · Directement en phase base",
      durationMin: [45, 60], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "10x400m Z5/Z6", zones: ["Z5", "Z6"] }],
      variants: {},
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { checkB11 } from "../checksB10B11";

function makeSession(overrides: Partial<MergedSession>): MergedSession {
  return {
    weekNumber: 1, weekTheme: "T", phase: "Phase 1 — Adaptation & Socle Aérobie",
    dayName: "Mardi", dayIndex: 1, sport: "run", title: "VMA piste", details: "",
    isRest: false, isKeySession: true, catalogId: "LYDIARD_RUN_TRACK_VMA", custom: false,
    durationMin: 50, zones: ["Z5", "Z6"],
    ...overrides,
  };
}

function makePlan12WeeksReal(): MergedPlan {
  // Reproduit la structure réelle du run B-5K-BEGINNER : 12 semaines, récap
  // de phases humain "Phase 1 — Adaptation & Socle Aérobie" (S1-S3), chaque
  // `week.phase` portant ce même libellé (comportement réel confirmé sur le
  // JSON exporté, cf. normalizeWeeksAndPhases).
  const weeks = [];
  for (let n = 1; n <= 12; n++) {
    const label = n <= 3
      ? "Phase 1 — Adaptation & Socle Aérobie"
      : n <= 11
        ? "Phase 2 — Développement & Spécifique 5K"
        : "Phase 3 — Affûtage & Compétition";
    weeks.push({
      weekNumber: n, theme: "T", phase: label,
      sessions: n === 1 ? [makeSession({})] : [],
    });
  }
  return { title: "P", phases: [], totalWeeks: 12, weeks };
}

describe("checkB11 — phase catalogue numérique (canonicalWeekPhase), plus de parsing de libellé libre", () => {
  it("Lydiard (build/peak) en S1/12 (numériquement base, libellé humain) → B11 FAIL détecté", () => {
    const plan = makePlan12WeeksReal();
    const r = checkB11(plan, "5 KM");
    expect(r.pass).toBe(false);
    expect(r.details.some(d => d.includes("S1") && d.includes("LYDIARD_RUN_TRACK_VMA") && d.includes("base"))).toBe(true);
  });

  it("même fiche en S5/12 (numériquement build, libellé combiné 'Développement & Spécifique') → PASS", () => {
    const plan = makePlan12WeeksReal();
    plan.weeks[0].sessions = []; // retire la violation S1
    plan.weeks[4].sessions = [makeSession({ weekNumber: 5, phase: "Phase 2 — Développement & Spécifique 5K" })];
    const r = checkB11(plan, "5 KM");
    expect(r.pass).toBe(true);
  });
});
