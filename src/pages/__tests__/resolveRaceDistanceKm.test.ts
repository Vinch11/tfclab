import { describe, it, expect } from "vitest";
import { resolveRaceDistanceKm } from "../RaceSimulationPage";

/**
 * Bug réel (audit simulation de course) : la distance de course passée à
 * simulatePacingScenarios était figée à 90 (distance vélo 70.3) pour toute
 * combinaison objectif × discipline. `resolveRaceDistanceKm` centralise les
 * distances canoniques déjà utilisées ailleurs dans RaceSimulationPage.tsx
 * (segmentDurationMin, bikeSplitInfo, targetKm) : 180.2/90.1 km vélo,
 * 42.195/21.0975 km course.
 */
describe("resolveRaceDistanceKm", () => {
  it("IM : vélo 180.2 km, course 42.195 km (marathon)", () => {
    expect(resolveRaceDistanceKm("IM", "bike")).toBe(180.2);
    expect(resolveRaceDistanceKm("IM", "run")).toBe(42.195);
  });

  it("70.3 : vélo 90.1 km, course 21.0975 km (semi)", () => {
    expect(resolveRaceDistanceKm("70.3", "bike")).toBe(90.1);
    expect(resolveRaceDistanceKm("70.3", "run")).toBe(21.0975);
  });

  it("courses à pied pures : discipline n'a pas d'effet (toujours 'run' en pratique)", () => {
    expect(resolveRaceDistanceKm("Marathon", "run")).toBe(42.195);
    expect(resolveRaceDistanceKm("Semi", "run")).toBe(21.0975);
    expect(resolveRaceDistanceKm("10km", "run")).toBe(10);
  });

  // Bug réel corrigé (audit "estimations physiologiques", chantier simulation
  // de course) : "Sprint" et "Olympic" sont des objectifs réellement
  // sélectionnables dans l'UI (ObjectifType, AthleteEditPage/
  // AthleteObjectiveManager), mais cette fonction ne les reconnaissait pas —
  // tout objectif non reconnu retombait sur le défaut 'IM' (180.2km vélo /
  // 42.195km course). Un sprinteur recevait donc un couloir de pacing calculé
  // pour un Ironman complet.
  it("Sprint : vélo 20 km, course 5 km (distances standard World Triathlon)", () => {
    expect(resolveRaceDistanceKm("Sprint", "bike")).toBe(20);
    expect(resolveRaceDistanceKm("Sprint", "run")).toBe(5);
  });

  it("Olympic : vélo 40 km, course 10 km (distances standard World Triathlon)", () => {
    expect(resolveRaceDistanceKm("Olympic", "bike")).toBe(40);
    expect(resolveRaceDistanceKm("Olympic", "run")).toBe(10);
  });

  it("ne retombe plus sur les distances IM (180.2/42.195) pour Sprint/Olympic", () => {
    for (const format of ["Sprint", "Olympic"] as const) {
      for (const discipline of ["bike", "run"] as const) {
        const km = resolveRaceDistanceKm(format, discipline);
        expect(km).not.toBe(180.2);
        expect(km).not.toBe(42.195);
      }
    }
  });
});
