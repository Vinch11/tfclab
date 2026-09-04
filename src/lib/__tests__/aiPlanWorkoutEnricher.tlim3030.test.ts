import { describe, it, expect } from "vitest";
import { toFiche } from "@/lib/aiPlanWorkoutEnricher";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import type { WbalAthleteRefs } from "@/lib/wbalLibraryRecalc";

/**
 * Calibrage volume 30/30 Billat par Tlim@vVO2max (cf. tlimVolumeCalibration.ts).
 * Réponse à la demande du coach : "implanter le calibrage pour les athlètes
 * qui ont les données nécessaires, sinon calibrage classique" — ces tests
 * couvrent les deux branches sur les fiches RÉELLES du catalogue.
 */

const ATHLETE_WITH_TLIM: WbalAthleteRefs = { tlimMin: 6 };

describe("toFiche — calibrage 30/30 Billat par Tlim@vVO2max", () => {
  it("BILLAT_RUN_30_30_INTRO et BILLAT_RUN_30_30_PRO existent dans le catalogue", () => {
    for (const id of ["BILLAT_RUN_30_30_INTRO", "BILLAT_RUN_30_30_PRO"]) {
      expect(WorkoutLibrary.find((w) => w.id === id), `fiche ${id} introuvable`).toBeDefined();
    }
  });

  it("athlète AVEC Tlim mesuré : tlim3030Summary personnalisé présent", () => {
    const w = WorkoutLibrary.find((e) => e.id === "BILLAT_RUN_30_30_INTRO")!;
    const fiche = toFiche(w, ATHLETE_WITH_TLIM);
    expect(fiche.tlim3030Summary).toBeDefined();
    expect(fiche.tlim3030Summary).toContain("2×8");
    expect(fiche.tlim3030Summary).toContain("Tlim@vVO2max = 6 min");
  });

  it("athlète SANS Tlim mesuré (refs null) : pas d'annotation, calibrage classique (fiche inchangée)", () => {
    const w = WorkoutLibrary.find((e) => e.id === "BILLAT_RUN_30_30_INTRO")!;
    const fiche = toFiche(w, null);
    expect(fiche.tlim3030Summary).toBeUndefined();
    // La structure statique (texte générique "Intro") reste intacte.
    expect(fiche.structure.some((s) => /8×\[30s/.test(s.text))).toBe(true);
  });

  it("athlète sans refs du tout (paramètre omis) : ne casse pas, pas d'annotation", () => {
    const w = WorkoutLibrary.find((e) => e.id === "BILLAT_RUN_30_30_PRO")!;
    const fiche = toFiche(w);
    expect(fiche.tlim3030Summary).toBeUndefined();
  });

  it("refs présentes mais tlimMin absent (autre athlète, CP/W' vélo seulement) : pas d'annotation", () => {
    const w = WorkoutLibrary.find((e) => e.id === "BILLAT_RUN_30_30_PRO")!;
    const fiche = toFiche(w, { ftp: 280, p30s: 480 });
    expect(fiche.tlim3030Summary).toBeUndefined();
  });

  it("BILLAT_RUN_30_30_PRO avec Tlim élite (8min) : 3×8 personnalisé", () => {
    const w = WorkoutLibrary.find((e) => e.id === "BILLAT_RUN_30_30_PRO")!;
    const fiche = toFiche(w, { tlimMin: 8 });
    expect(fiche.tlim3030Summary).toContain("3×8");
  });

  it("fiche HORS scope (pas 30/30 Billat course) : jamais de tlim3030Summary même avec Tlim dispo", () => {
    // BILLAT_BIKE_30_30 est piloté par %FTP (vélo), pas vVO2max — hors scope
    // physiologique de ce calibrage (cf. commentaire tlimVolumeCalibration.ts).
    const bike = WorkoutLibrary.find((e) => e.id === "BILLAT_BIKE_30_30");
    expect(bike).toBeDefined();
    const fiche = toFiche(bike!, ATHLETE_WITH_TLIM);
    expect(fiche.tlim3030Summary).toBeUndefined();

    // Une fiche run non-Billat quelconque ne doit pas non plus être affectée.
    const other = WorkoutLibrary.find((e) => e.sport === "course" && e.id !== "BILLAT_RUN_30_30_INTRO" && e.id !== "BILLAT_RUN_30_30_PRO");
    expect(other).toBeDefined();
    const ficheOther = toFiche(other!, ATHLETE_WITH_TLIM);
    expect(ficheOther.tlim3030Summary).toBeUndefined();
  });
});
