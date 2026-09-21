import { describe, it, expect } from "vitest";
import {
  canBeIndependentPeak,
  minGapWeeksForFullPeak,
  classifyMultiObjectiveGoalsClient,
} from "../multiObjectiveClassification";
import {
  canBeIndependentPeak as canBeIndependentPeakServer,
  minGapWeeksForFullPeak as minGapWeeksForFullPeakServer,
} from "../../../../supabase/functions/ai-training-plan/sportRatioMatrix";
import { classifyMultiObjectiveGoals as classifyMultiObjectiveGoalsServer } from "../../../../supabase/functions/ai-training-plan/promptHelpers";

/**
 * Piste "système de périodisation" (roadmap visuelle multi-objectifs) :
 * `multiObjectiveClassification.ts` est un MIROIR côté client de la
 * classification serveur (edge function Deno, ne peut pas importer src/).
 * Ce test compare directement les deux copies sur des entrées
 * représentatives, pour empêcher toute divergence future du même type que
 * celle déjà trouvée cette session sur `deriveRaceTargets.ts`.
 */
describe("multiObjectiveClassification — la copie client reste un MIROIR EXACT du serveur", () => {
  it("canBeIndependentPeak : identique pour tous les objectifs représentatifs", () => {
    for (const obj of ["IM", "703", "Marathon", "TrailUltra", "TrailMountain", "Semi", "10K", "5K", "StartToRun", "Trail", "TrailShort"]) {
      expect(canBeIndependentPeak(obj)).toBe(canBeIndependentPeakServer(obj));
    }
  });

  it("minGapWeeksForFullPeak : identique pour tous les objectifs représentatifs", () => {
    for (const obj of ["IM", "703", "Marathon", "TrailUltra", "TrailMountain", "Semi", "10K"]) {
      expect(minGapWeeksForFullPeak(obj)).toBe(minGapWeeksForFullPeakServer(obj));
    }
  });

  it("classifyMultiObjectiveGoals(Client) : mêmes isFullPeak/isLast/taperWeeks que le serveur", () => {
    const scenarios: any[][] = [
      [
        { objective: "Marathon", raceDate: "2027-02-21", priority: "A" },
        { objective: "IM", raceDate: "2027-06-27", priority: "A" },
      ],
      [
        { objective: "10K", raceDate: "2027-03-01", priority: "A" },
        { objective: "Marathon", raceDate: "2027-05-31", priority: "B" },
      ],
      [
        { objective: "Marathon", raceDate: "2027-02-07", priority: "A" },
        { objective: "IM", raceDate: "2027-03-21", priority: "B" },
      ],
    ];
    for (const raceGoals of scenarios) {
      const client = classifyMultiObjectiveGoalsClient(raceGoals);
      const server = classifyMultiObjectiveGoalsServer(raceGoals);
      expect(client.map((c) => ({ isFullPeak: c.isFullPeak, isLast: c.isLast, taperWeeks: c.taperWeeks }))).toEqual(
        server.map((c) => ({ isFullPeak: c.isFullPeak, isLast: c.isLast, taperWeeks: c.taperWeeks })),
      );
    }
  });
});
