import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { MergedPlan, MergedWeek, MergedSession } from "@/lib/plan/mergePlanChunks";

/**
 * Tâche 2 (audit "fiabilité du validateur", demande coach) — "Recherche les
 * plans réels déjà disponibles dans le dépôt ou dans les fixtures de test...
 * fais tourner Mode A sur ce corpus".
 *
 * Recherche exhaustive (voir rapport transmis au coach) : AUCUN export réel
 * de plan généré par l'IA n'existe dans ce dépôt — ni en fixture de test, ni
 * en JSON committé, ni en snapshot. Les seules fixtures de plan complet
 * (multi-semaines, multi-phases) sont `GOOD_PLAN`/`BAD_PLAN` de
 * `modeA.deterministicFixtures.test.ts` (4 semaines, course à pied
 * uniquement, 10K) — reproduites ICI à l'identique (même contenu, mémo de
 * source en commentaire) pour en extraire la LISTE COMPLÈTE des issues
 * `validatePlan` (le fichier source ne vérifie que B13/B14, pas le détail
 * `validatePlan`). Ce test ne remplace pas le fichier source — il ne fait
 * qu'exposer, pour le rapport Tâche 2, ce que `validatePlan` produit sur le
 * seul corpus "déjà disponible" au sens strict de la demande.
 */
vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    {
      id: "A_RUN_EF_45", cat: "A", sport: "run", objectif: "Endurance fondamentale", necessite: "Obligatoire",
      when: "", phase: ["base", "build"], avoid: "", durationMin: [40, 50], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "45min Z2 continu", zones: ["Z2"] }], variants: {}, tags: [], goals: ["10k"],
    },
    {
      id: "B_RUN_SEUIL_2X15", cat: "B", sport: "run", objectif: "Seuil", necessite: "Recommandé",
      when: "", phase: ["base", "build"], avoid: "", durationMin: [45, 55], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "2x15min seuil", zones: ["Z4"] }], variants: {}, tags: [], goals: ["10k"],
    },
    {
      id: "A_RUN_SL_75", cat: "A", sport: "run", objectif: "Sortie longue", necessite: "Obligatoire",
      when: "", phase: ["base", "build"], avoid: "", durationMin: [70, 90], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "75min Z2 progressif", zones: ["Z2"] }], variants: {}, tags: [], goals: ["10k"],
    },
    {
      id: "C_RUN_EF_STRIDES", cat: "C", sport: "run", objectif: "Endurance + ouvreurs", necessite: "Recommandé",
      when: "", phase: ["base", "build"], avoid: "", durationMin: [35, 45], metricKey: "pace", sportKey: "run",
      structure: [{ part: "Main", text: "40min Z2 + 4x20s accélérations", zones: ["Z2"] }], variants: {}, tags: [], goals: ["10k"],
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { validatePlan } from "@/engines/plan/planValidator";
import { jsonPlanToParsedPlan } from "@/lib/plan/jsonPlanToParsedPlan";

function makeSession(overrides: Partial<MergedSession>): MergedSession {
  return {
    weekNumber: 1, weekTheme: "Base", phase: "base", dayName: "Lundi", dayIndex: 0,
    sport: "run", title: "EF", details: "45min Z2", isRest: false, isKeySession: false,
    catalogId: "A_RUN_EF_45", custom: false, durationMin: 45, zones: ["Z2"],
    ...overrides,
  };
}
function makeWeek(weekNumber: number, phase: string, sessions: MergedSession[]): MergedWeek {
  return { weekNumber, theme: "Chantier", phase, sessions: sessions.map((s) => ({ ...s, weekNumber })) };
}

// Transcription exacte de GOOD_PLAN (modeA.deterministicFixtures.test.ts) — source unique à synchroniser si celui-ci change.
const GOOD_PLAN: MergedPlan = {
  title: "Plan TFCL™ — 10K Test Athlete — 4 semaines",
  phases: [{ name: "Bloc unique", weeks: "S1-S4", objective: "Développement" }],
  totalWeeks: 4,
  weeks: [
    makeWeek(1, "base", [
      makeSession({ dayName: "Lundi", dayIndex: 0, catalogId: "A_RUN_EF_45" }),
      makeSession({ dayName: "Mercredi", dayIndex: 2, catalogId: "B_RUN_SEUIL_2X15", title: "Seuil", details: "2x15min Z4", zones: ["Z4"], isKeySession: true, durationMin: 50 }),
      makeSession({ dayName: "Vendredi", dayIndex: 4, catalogId: "C_RUN_EF_STRIDES", title: "EF + ouvreurs", details: "40min Z2 + 4x20s", durationMin: 40 }),
      makeSession({ dayName: "Dimanche", dayIndex: 6, catalogId: "A_RUN_SL_75", title: "SL", details: "75min Z2", durationMin: 75 }),
    ]),
    makeWeek(2, "base", [
      makeSession({ dayName: "Lundi", dayIndex: 0, catalogId: "A_RUN_EF_45" }),
      makeSession({ dayName: "Mercredi", dayIndex: 2, catalogId: "B_RUN_SEUIL_2X15", title: "Seuil", details: "2x15min Z4", zones: ["Z4"], isKeySession: true, durationMin: 50 }),
      makeSession({ dayName: "Vendredi", dayIndex: 4, catalogId: "C_RUN_EF_STRIDES", title: "EF + ouvreurs", details: "40min Z2 + 4x20s", durationMin: 40 }),
      makeSession({ dayName: "Dimanche", dayIndex: 6, catalogId: "A_RUN_SL_75", title: "SL", details: "80min Z2", durationMin: 80 }),
    ]),
    makeWeek(3, "build", [
      makeSession({ dayName: "Lundi", dayIndex: 0, catalogId: "A_RUN_EF_45" }),
      makeSession({ dayName: "Mercredi", dayIndex: 2, catalogId: "B_RUN_SEUIL_2X15", title: "Seuil", details: "2x18min Z4", zones: ["Z4"], isKeySession: true, durationMin: 55 }),
      makeSession({ dayName: "Vendredi", dayIndex: 4, catalogId: "C_RUN_EF_STRIDES", title: "EF + ouvreurs", details: "40min Z2 + 4x20s", durationMin: 40 }),
      makeSession({ dayName: "Dimanche", dayIndex: 6, catalogId: "A_RUN_SL_75", title: "SL", details: "85min Z2", durationMin: 85 }),
    ]),
    makeWeek(4, "taper", [
      makeSession({ dayName: "Lundi", dayIndex: 0, custom: true, catalogId: null, title: "EF allégée", details: "35min Z2 facile", durationMin: 35 }),
      makeSession({ dayName: "Mercredi", dayIndex: 2, custom: true, catalogId: null, title: "EF courte + ouvreurs", details: "30min Z2 + 4x20s", durationMin: 30 }),
      makeSession({ dayName: "Vendredi", dayIndex: 4, custom: true, catalogId: null, title: "Repos actif", details: "20min Z1", durationMin: 20 }),
      makeSession({ dayName: "Dimanche", dayIndex: 6, title: "🏁 COURSE OBJECTIF", details: "Jour J — 10K", custom: true, catalogId: null, durationMin: 50, isKeySession: true }),
    ]),
  ],
};

const BAD_PLAN: MergedPlan = {
  ...GOOD_PLAN,
  weeks: GOOD_PLAN.weeks.map((w, i) => {
    if (i !== 2) return w;
    return {
      ...w,
      phase: "taper",
      sessions: [
        makeSession({ weekNumber: 3, dayName: "Mardi", dayIndex: 1, catalogId: "B_RUN_SEUIL_2X15", title: "Seuil", details: "2x18min Z4", zones: ["Z4"], isKeySession: true }),
        makeSession({ weekNumber: 3, dayName: "Mercredi", dayIndex: 2, catalogId: "B_RUN_SEUIL_2X15", title: "Seuil (doublon)", details: "2x18min Z4", zones: ["Z4"], isKeySession: true }),
        makeSession({ weekNumber: 3, dayName: "Dimanche", dayIndex: 6, catalogId: "A_RUN_SL_75", title: "SL", details: "85min Z2", durationMin: 85 }),
      ],
    };
  }),
};

describe("Tâche 2 — rapport exhaustif validatePlan sur le seul corpus déjà disponible (GOOD_PLAN/BAD_PLAN)", () => {
  it("GOOD_PLAN : liste complète des issues validatePlan (pour rapport)", () => {
    const parsed = jsonPlanToParsedPlan(GOOD_PLAN);
    const vr = validatePlan(parsed, "10K");
    console.log("=== GOOD_PLAN issues ===", JSON.stringify(vr.issues.map(i => ({ rule: i.rule, severity: i.severity, week: i.week, message: i.message })), null, 2));
    console.log("=== GOOD_PLAN score/grade ===", vr.score, vr.grade);
    expect(vr.issues).toBeDefined();
  });

  it("BAD_PLAN : liste complète des issues validatePlan (pour rapport)", () => {
    const parsed = jsonPlanToParsedPlan(BAD_PLAN);
    const vr = validatePlan(parsed, "10K");
    console.log("=== BAD_PLAN issues ===", JSON.stringify(vr.issues.map(i => ({ rule: i.rule, severity: i.severity, week: i.week, message: i.message })), null, 2));
    console.log("=== BAD_PLAN score/grade ===", vr.score, vr.grade);
    expect(vr.issues).toBeDefined();
  });
});
