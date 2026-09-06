/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 1) :
 * recalcWorkoutRest ne vérifiait jamais cpResult.dataQuality avant de
 * recalculer les temps de repos — un CP/W' "implausible" était utilisé sans
 * aucun avertissement. CP/W' restent bornés (effectiveCP, clamp W'
 * [10;35]kJ) donc la prescription reste sûre — mais dataQualityWarning est
 * désormais exposé pour que l'UI puisse afficher un avertissement.
 */
import { describe, it, expect } from "vitest";
import { recalcWorkoutRest, type WbalAthleteRefs } from "../wbalLibraryRecalc";
import type { LibraryWorkout, WbalIntervalBlock } from "@/types/workoutLibrary";

function makeBlock(overrides: Partial<WbalIntervalBlock> = {}): WbalIntervalBlock {
  return {
    reps: 5,
    durationSec: 240,
    intensity: 110,
    intensityRef: "FTP",
    defaultRestSec: 180,
    ...overrides,
  };
}

function makeWorkout(blocks: WbalIntervalBlock[]): LibraryWorkout {
  return {
    id: "test-workout",
    cat: "intervalles",
    sport: "bike",
    objectif: "seuil",
    necessite: "recommande",
    when: "semaine",
    avoid: "",
    durationMin: [45, 60],
    metricKey: "ftp",
    sportKey: "bike",
    structure: [],
    variants: {},
    wbalProfile: {
      sport: "bike",
      blocks,
      autoRecalcRest: true,
    },
  } as unknown as LibraryWorkout;
}

// Reproduit la trace de l'audit : régression CP tombant à ~166W très en
// dessous du FTP réel (280W) — données de puissance courte non-maximales.
// effectiveCP reste borné à ftp+10=290W (garde-fou symétrique).
const ATHLETE_IMPLAUSIBLE: WbalAthleteRefs = {
  ftp: 280,
  p30s: 1500,
  p60s: 1200,
  map5min: 330,
  weightKg: 70,
};

describe("recalcWorkoutRest — expose dataQualityWarning sans bloquer le recalcul (CP effectif reste borné/sûr)", () => {
  it("recalcule toujours le repos (CP borné) mais expose dataQualityWarning quand les données source sont suspectes", () => {
    const workout = makeWorkout([makeBlock()]);
    const result = recalcWorkoutRest(workout, ATHLETE_IMPLAUSIBLE);

    expect(result.recalculatedAny).toBe(true);
    expect(result.dataQualityWarning).toBeDefined();
    expect(result.dataQualityWarning).toContain("peu fiables");
  });

  it("ne définit pas dataQualityWarning pour des données cohérentes", () => {
    const workout = makeWorkout([makeBlock()]);
    const result = recalcWorkoutRest(workout, {
      ftp: 280,
      p30s: 500,
      p60s: 400,
      map5min: 310,
      weightKg: 70,
    });

    expect(result.dataQualityWarning).toBeUndefined();
  });
});
