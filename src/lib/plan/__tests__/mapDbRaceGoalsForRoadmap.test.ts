import { describe, it, expect } from "vitest";
import { mapDbRaceGoalsForRoadmap } from "../multiObjectiveClassification";

/**
 * Fix "amélioration des plans" (suite #219) : ExportTools.tsx/mapPayloadToReport.ts
 * (dossier PDF) réutilisent désormais la MÊME conversion RaceGoal(DB) →
 * ClassifiableRaceGoal[] que Index.tsx/RoadmapStrategique.tsx (dashboard),
 * au lieu de chacun écrire sa propre version inline — la classe de bug
 * (deux implémentations qui divergent silencieusement) déjà rencontrée
 * plusieurs fois cette session.
 */
describe("mapDbRaceGoalsForRoadmap", () => {
  it("liste vide/undefined/null → raceGoals=[] et planStartDate=undefined", () => {
    expect(mapDbRaceGoalsForRoadmap([])).toEqual({ raceGoals: [], planStartDate: undefined });
    expect(mapDbRaceGoalsForRoadmap(undefined)).toEqual({ raceGoals: [], planStartDate: undefined });
    expect(mapDbRaceGoalsForRoadmap(null)).toEqual({ raceGoals: [], planStartDate: undefined });
  });

  it("convertit race_type/race_date/race_name vers objective/raceDate/raceName, priority='A' par défaut", () => {
    const result = mapDbRaceGoalsForRoadmap([
      { race_type: "Marathon", race_date: "2027-02-21", race_name: "Marathon de Paris", plan_start_date: "2026-08-01" },
    ]);
    expect(result.raceGoals).toEqual([
      { objective: "Marathon", raceDate: "2027-02-21", raceName: "Marathon de Paris", priority: "A" },
    ]);
  });

  it("race_name null → raceName undefined (pas null, pour matcher ClassifiableRaceGoal)", () => {
    const result = mapDbRaceGoalsForRoadmap([
      { race_type: "IM", race_date: "2027-06-27", race_name: null, plan_start_date: null },
    ]);
    expect(result.raceGoals[0].raceName).toBeUndefined();
  });

  it("planStartDate = la plus ancienne parmi les plan_start_date renseignées (ignore les null)", () => {
    const result = mapDbRaceGoalsForRoadmap([
      { race_type: "Marathon", race_date: "2027-02-21", plan_start_date: "2026-08-01" },
      { race_type: "IM", race_date: "2027-06-27", plan_start_date: "2026-05-15" },
      { race_type: "10K", race_date: "2026-12-01", plan_start_date: null },
    ]);
    expect(result.planStartDate).toBe("2026-05-15");
  });

  it("aucun plan_start_date renseigné → planStartDate=undefined", () => {
    const result = mapDbRaceGoalsForRoadmap([
      { race_type: "Marathon", race_date: "2027-02-21", plan_start_date: null },
    ]);
    expect(result.planStartDate).toBeUndefined();
  });
});
