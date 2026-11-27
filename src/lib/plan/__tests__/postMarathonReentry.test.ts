import { describe, expect, it } from "vitest";
import { postMarathonCrossTrainingMinimum } from "@/lib/plan/postMarathonReentry";

describe("reprise après un marathon intermédiaire", () => {
  const rec = (d: number) => ({ stage: "recovery", objective: "marathon", daysToRace: d });
  it("plan Ironman : vélo et natation faciles , plus de vélo la 2e semaine, course jamais imposée", () => {
    expect(postMarathonCrossTrainingMinimum("IM", [rec(-1), rec(-2), rec(-7)])).toEqual({ bike: 2, swim: 2, run: 0 });
    expect(postMarathonCrossTrainingMinimum("Ironman 70.3", [rec(-8), rec(-14)])).toEqual({ bike: 3, swim: 2, run: 0 });
  });
  it("au-delà de J+14, plan de course à pied ou pas de marathon : rien d'imposé", () => {
    expect(postMarathonCrossTrainingMinimum("IM", [rec(-15), rec(-21)])).toBeNull();
    expect(postMarathonCrossTrainingMinimum("Marathon", [rec(-3)])).toBeNull();
    expect(postMarathonCrossTrainingMinimum("IM", [{ stage: "recovery", objective: "ironman", daysToRace: -3 }, null])).toBeNull();
  });
});
