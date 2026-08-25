import { describe, it, expect } from "vitest";
import { toFiche } from "@/lib/aiPlanWorkoutEnricher";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { WbalAthleteRefs } from "@/lib/wbalLibraryRecalc";

// Fiche synthétique avec wbalProfile — aucune fiche réelle du catalogue n'en
// possède aujourd'hui (0/450, cf. investigation), donc on ne peut pas
// exercer ce chemin via une fiche existante : on en construit une minimale
// représentative d'un 3x8min au-dessus de CP, comme "V3_BIKE_VO2MAX_SHORT".
const SYNTHETIC_INTERVAL_WORKOUT: LibraryWorkout = {
  id: "TEST_BIKE_VO2MAX",
  cat: "A",
  sport: "cyclisme",
  objectif: "VO2max — 3x8min",
  necessite: "Obligatoire",
  when: "Build",
  avoid: "",
  durationMin: [60, 75],
  metricKey: "puissance",
  sportKey: "cycling",
  structure: [
    { part: "Warm-up", text: "15' Z1→Z2", zones: ["Z1", "Z2"] },
    { part: "Main", text: "3x8min @ 118% FTP r=4min", zones: ["Z5"] },
    { part: "Cool-down", text: "10' Z1", zones: ["Z1"] },
  ],
  variants: {},
  wbalProfile: {
    sport: "bike",
    blocks: [
      {
        reps: 3,
        durationSec: 480,
        intensity: 118,
        intensityRef: "FTP",
        defaultRestSec: 240,
        recoveryStrategy: "active-light",
        label: "VO2max",
      },
    ],
  },
};

// Athlète avec de vraies données CP/W' (P30s/P60s/MAP5min) — profil du type
// "Vince" évoqué en discussion : FTP ~280W, CP légèrement au-dessus.
const ATHLETE_WITH_CP_DATA: WbalAthleteRefs = {
  pmax5s: 1100,
  p30s: 520,
  p60s: 400,
  map5min: 310,
  ftp: 280,
  weightKg: 70,
};

describe("toFiche — recalcul W'bal du repos", () => {
  it("sans données CP/W' athlète : repos par défaut de la fiche, pas de marqueur perso", () => {
    const fiche = toFiche(SYNTHETIC_INTERVAL_WORKOUT, null);
    expect(fiche.wbalSummary).toBeDefined();
    expect(fiche.wbalSummary).toContain("3×8min");
    expect(fiche.wbalSummary).toContain("récup 4min"); // defaultRestSec = 240s
    expect(fiche.wbalSummary).not.toContain("perso W'bal");
  });

  it("avec CP/W' athlète disponible (intensité > CP) : repos recalculé et marqué perso", () => {
    const fiche = toFiche(SYNTHETIC_INTERVAL_WORKOUT, ATHLETE_WITH_CP_DATA);
    expect(fiche.wbalSummary).toBeDefined();
    expect(fiche.wbalSummary).toContain("perso W'bal");
    // Le repos recalculé doit différer du défaut générique (240s / 4min) —
    // sinon le recalcul n'apporte rien de plus que la fiche statique.
    expect(fiche.wbalSummary).not.toMatch(/récup 4min(?!\d)/);
  });

  it("séance sans wbalProfile : aucun wbalSummary, comportement inchangé", () => {
    const noProfile: LibraryWorkout = { ...SYNTHETIC_INTERVAL_WORKOUT, wbalProfile: undefined };
    const fiche = toFiche(noProfile, ATHLETE_WITH_CP_DATA);
    expect(fiche.wbalSummary).toBeUndefined();
  });

  it("aucune donnée CP/W' fournie (refs omis) : ne casse pas, repli sur le défaut", () => {
    const fiche = toFiche(SYNTHETIC_INTERVAL_WORKOUT);
    expect(fiche.wbalSummary).toContain("récup 4min");
    expect(fiche.wbalSummary).not.toContain("perso W'bal");
  });
});
