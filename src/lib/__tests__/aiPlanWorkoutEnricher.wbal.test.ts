import { describe, it, expect } from "vitest";
import { toFiche } from "@/lib/aiPlanWorkoutEnricher";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
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
// "Vince" évoqué en discussion : FTP ~280W, CP ≈ FTP (régression à la main :
// t=30/y=14400, t=60/y=22800, t=300/y=90000 → CP≈280W, W'≈6000J). Choisi
// pour une marge confortable au-dessus de CP sur les 2 séances testées
// (104% et 110% FTP), afin que le test ne dépende pas d'un seuil à ±quelques
// watts près.
const ATHLETE_WITH_CP_DATA: WbalAthleteRefs = {
  pmax5s: 1000,
  p30s: 480,
  p60s: 380,
  map5min: 300,
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

describe("toFiche — premier lot de fiches réelles du catalogue avec wbalProfile", () => {
  const REAL_WBAL_IDS = [
    "V3_BIKE_VO2_CLASSIC_5x5",
    "V3_BIKE_VO2_NORWEGIAN_4x8",
    "V3_BIKE_THRESHOLD_2x20",
  ];

  it("les 3 fiches existent dans le catalogue et ont un wbalProfile", () => {
    for (const id of REAL_WBAL_IDS) {
      const w = WorkoutLibrary.find((e) => e.id === id);
      expect(w, `fiche ${id} introuvable`).toBeDefined();
      expect(w!.wbalProfile?.blocks?.length, `${id} sans wbalProfile`).toBeGreaterThan(0);
    }
  });

  it("VO2max 5x5 (105-115% FTP) : repos personnalisé pour un athlète avec CP/W' connu", () => {
    const w = WorkoutLibrary.find((e) => e.id === "V3_BIKE_VO2_CLASSIC_5x5")!;
    const fiche = toFiche(w, ATHLETE_WITH_CP_DATA);
    expect(fiche.wbalSummary).toContain("perso W'bal");
  });

  it("Norwegian 4x8 (100-108% FTP) : repos personnalisé pour un athlète avec CP/W' connu", () => {
    const w = WorkoutLibrary.find((e) => e.id === "V3_BIKE_VO2_NORWEGIAN_4x8")!;
    const fiche = toFiche(w, ATHLETE_WITH_CP_DATA);
    expect(fiche.wbalSummary).toContain("perso W'bal");
  });

  it("sans données athlète, les 3 fiches gardent leur repos par défaut (pas de régression)", () => {
    for (const id of REAL_WBAL_IDS) {
      const w = WorkoutLibrary.find((e) => e.id === id)!;
      const fiche = toFiche(w, null);
      expect(fiche.wbalSummary).toBeDefined();
      expect(fiche.wbalSummary).not.toContain("perso W'bal");
    }
  });
});
