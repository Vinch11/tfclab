import { describe, it, expect } from "vitest";
import { validatePlan } from "../planValidator";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Bug réel (audit "génération solide ?", passe 4) : LORANG_CATALOG_PREFIX_RX
 * ne couvrait pas tous les préfixes réellement utilisés dans le catalogue.
 * Sur les 61 préfixes distincts réels (enrichedWorkouts*.ts, workoutLibrary.ts),
 * 8 échappaient au pattern — B_LCW et 7 fiches "D" de récupération/mobilité
 * (D_ACTIVATION*, D_COLD*, D_DELOAD*, D_FOAM*, D_MOBILITY*, D_VISUALIZATION*,
 * D_YOGA*) — retombant sur un fallback mot-clé qui ne les couvre pas toutes
 * non plus, ces fiches n'étaient comptées ni dans le bon bucket A/B/C/D ni
 * dans le taux d'étiquetage "tagged" (traçabilité méthodologique affichée
 * au coach — `LORANG_CATALOG_PREFIX_RX` alimente directement `tagged`).
 * Élargi le pattern ; ce test verrouille la classification par catalogId et
 * le comptage "tagged" pour ces 8 préfixes retrouvés.
 */

function makeSession(catalogId: string, sport = "mixed"): ParsedSession {
  return {
    weekNumber: 1,
    weekTheme: "Test",
    phase: "build",
    dayName: "Mardi",
    dayIndex: 1,
    sport,
    title: `Séance texte sans mot-clé Lorang [ID: ${catalogId}]`,
    details: "Contenu neutre ne contenant aucun mot-clé de classification A/B/C/D.",
    isRest: false,
  };
}

function makePlanWithSessions(catalogIds: string[]): ParsedPlan {
  const week: ParsedWeek = {
    weekNumber: 1,
    theme: "Test",
    phase: "build",
    sessions: catalogIds.map((id) => makeSession(id)),
  };
  return { title: "Plan Test", phases: [], weeks: [week], totalWeeks: 1 } as ParsedPlan;
}

describe("classifyLorang (via validateLorangCategories) — couverture des préfixes catalogue réels", () => {
  it("marque les 8 préfixes réels précédemment non couverts comme 'tagged' (traçabilité méthodologique)", () => {
    const ids = [
      "B_LCW_BIKE_LONG_RACE_SAT",
      "D_ACTIVATION_PRERACE",
      "D_COLD_CONTRAST",
      "D_DELOAD_RUN",
      "D_FOAM_ROLLING",
      "D_MOBILITY_HIP",
      "D_VISUALIZATION_RACE",
      "D_YOGA_FLOW",
    ];
    const plan = makePlanWithSessions(ids);
    const vr = validatePlan(plan);
    expect(vr.lorangCategories.tagged).toBe(ids.length);
    expect(vr.lorangCategories.taggedPct).toBe(100);
  });

  it("classe B_LCW_* en catégorie B (seuil/race-pace), pas 'unknown'", () => {
    const plan = makePlanWithSessions(["B_LCW_BIKE_LONG_RACE_SAT"]);
    const vr = validatePlan(plan);
    expect(vr.lorangCategories.BPct).toBe(100);
  });

  it("classe D_FOAM_ROLLING en catégorie D (récupération), pas 'unknown'", () => {
    const plan = makePlanWithSessions(["D_FOAM_ROLLING"]);
    const vr = validatePlan(plan);
    expect(vr.lorangCategories.DPct).toBe(100);
  });
});
