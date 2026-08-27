import { describe, it, expect } from "vitest";
import { buildStructuredDiagnosticBlock } from "../../../../supabase/functions/ai-training-plan/promptHelpers";

/**
 * Batch 2 — "incohérence % D+ en deload" : la règle générale trail
 * (systemPrompt.ts, "RÈGLES D+ — OBLIGATOIRE POUR TRAIL") dit "-40-50% D+",
 * sans périodicité. Le bloc dynamique par-plan (injecté seulement quand une
 * fiche course trail est renseignée, donc plus concret pour l'IA) figeait
 * silencieusement "-40% D+ toutes les 3 sem" — le bas de la fourchette, avec
 * une périodicité inventée qui ne correspond pas à la règle de décharge
 * volume générale ("toutes les 3-4 semaines"). Alignement : le bloc
 * dynamique reprend désormais exactement la même fourchette/périodicité.
 */

const TRAIL_PROFILE_CONFIG = {
  objective: "Trail Montagne",
  ambition: "age_group",
  trailProfile: {
    distanceKm: 42,
    elevationGainM: 2500,
    dPlusPerKm: 60,
    terrainLabel: "montagne technique",
    estimatedRaceDurationMin: 360,
    needsNightSimulation: false,
    weeklyDPlusBaseM: 1500,
    weeklyDPlusPeakM: 3000,
    descentTechnicalRequired: true,
    needsAcclimatation: false,
    gutTrainingTargetGPerH: 60,
  },
};

describe("buildStructuredDiagnosticBlock — décharge D+ trail alignée sur la règle générale", () => {
  it("annonce -40-50% D+ toutes les 3-4 sem (fourchette complète, pas un point fixe)", () => {
    const output = buildStructuredDiagnosticBlock(TRAIL_PROFILE_CONFIG, 20);

    expect(output).toContain("Décharge -40-50% D+ toutes les 3-4 sem");
    expect(output).not.toContain("Décharge -40% D+ toutes les 3 sem");
  });
});
