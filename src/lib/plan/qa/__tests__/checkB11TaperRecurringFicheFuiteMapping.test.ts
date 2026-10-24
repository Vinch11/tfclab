import { describe, it, expect, vi } from "vitest";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";

/**
 * Correction ciblée "plan multiobjectifs réel" (2026-10-24), constat n°5 :
 * incident réel confirmé — `C_STR_NORDIC_HAMSTRING_PETERSEN` (phase=["base",
 * "build","peak"], Éviter="Lésion ischio <4 sem · Tapering course A (J-7)")
 * placée en S32 (taper) d'un plan 70.3 de 33 semaines, alors que sa propre
 * fiche catalogue exclut explicitement le taper. `checkB11` calcule bien le
 * mismatch de phase, mais le dégradait en simple bruit "granularité_intra_
 * chunk" (non bloquant) dès que la MÊME fiche apparaît ailleurs dans une
 * phase compatible — ce qui est systématiquement vrai pour une fiche
 * "Toute l'année (1-2x/sem)" comme ce protocole, légitimement répétée dans
 * la quasi-totalité des semaines base/build/peak du plan. Le risque de
 * sécurité (charge tendineuse avant course) ne dépend pourtant pas de la
 * fréquence d'usage ailleurs dans le plan. Cette suite verrouille la
 * correction : un mismatch de phase en semaine TAPER reste TOUJOURS
 * "fuite_mapping" (sévérité error), même si la fiche est par ailleurs
 * utilisée correctement.
 */

vi.mock("@/lib/workoutLibrary", () => {
  const fiches: LibraryWorkout[] = [
    {
      id: "RECURRING_PREHAB_ALL_YEAR",
      cat: "C", sport: "strength", objectif: "Prehab récurrent",
      necessite: "Recommandé",
      when: "Toute l'année (1-2x/sem) — protocole 10 semaines minimum",
      avoid: "Lésion <4 sem · Tapering course A (J-7)",
      phase: ["base", "build", "peak"],
      durationMin: [25, 35], metricKey: "cardiaque", sportKey: "tout sport",
      structure: [{ part: "Main", text: "protocole prehab", zones: [] }],
      variants: {},
    },
  ];
  return { WorkoutLibrary: fiches };
});

import { checkB11, checkB11ToValidationIssues } from "../checksB10B11";

function makeSession(overrides: Partial<MergedSession>): MergedSession {
  return {
    weekNumber: 1, weekTheme: "Build", phase: "build", dayName: "Mardi", dayIndex: 1,
    sport: "strength", title: "S", details: "", isRest: false, isKeySession: false,
    catalogId: null, custom: false, durationMin: 30, zones: [],
    ...overrides,
  };
}

/** Plan 12 semaines, 70.3 générique — S12 = course, S11 = taper (fenêtre par
 *  défaut Math.max(1, taperWeeksForObjective(...))). La fiche récurrente
 *  apparaît CORRECTEMENT en S1 (base) ET à nouveau, à tort, en S11 (taper). */
function makePlan(): MergedPlan {
  const weeks: MergedPlan["weeks"] = [];
  for (let w = 1; w <= 12; w++) {
    const sessions: MergedSession[] =
      w === 1 || w === 11
        ? [makeSession({ weekNumber: w, catalogId: "RECURRING_PREHAB_ALL_YEAR" })]
        : [];
    weeks.push({ weekNumber: w, theme: w === 12 ? "Race" : w === 11 ? "Taper" : "Build", phase: w === 12 ? "race" : w === 11 ? "taper" : "build", sessions });
  }
  return { title: "P", phases: [], totalWeeks: 12, weeks };
}

describe("B11 — mismatch de phase en semaine TAPER toujours 'fuite_mapping', même si la fiche est utilisée correctement ailleurs", () => {
  it("[TEST OBLIGATOIRE] fiche récurrente correcte en S1 (base) mais placée en S11 (taper, hors phase[]) → catégorisée fuite_mapping, pas granularité_intra_chunk", () => {
    const plan = makePlan();
    const r = checkB11(plan, "IRONMAN 70.3");
    const taperLine = r.details.find((d) => d.startsWith("S11 ") && d.includes("RECURRING_PREHAB_ALL_YEAR"));
    expect(taperLine).toBeDefined();
    expect(taperLine).toContain("[fuite_mapping]");
    expect(taperLine).not.toContain("[granularité_intra_chunk]");
  });

  it("le mismatch en semaine taper est converti en ValidationIssue de sévérité 'error' (bloquant), jamais 'warning'", () => {
    const plan = makePlan();
    const r = checkB11(plan, "IRONMAN 70.3");
    const issues = checkB11ToValidationIssues(r).filter((i) => i.week === 11 && i.message.includes("RECURRING_PREHAB_ALL_YEAR"));
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("error");
  });

  it("la même fiche placée UNIQUEMENT en base (S1), jamais en taper → aucune violation (pas de régression)", () => {
    const plan = makePlan();
    plan.weeks[10].sessions = []; // retire l'occurrence S11
    const r = checkB11(plan, "IRONMAN 70.3");
    const anyFail = r.details.some((d) => d.includes("RECURRING_PREHAB_ALL_YEAR"));
    expect(anyFail).toBe(false);
  });
});
