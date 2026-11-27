import { describe, expect, it } from "vitest";
import { missingRegisteredRaces } from "@/lib/plan/registeredRaces";

describe("courses de la fiche absentes du plan", () => {
  const registered = [
    { race_type: "Marathon", race_name: "Séville", race_date: "2027-02-28" },
    { race_type: "IM", race_name: "Sables", race_date: "2027-06-27" },
    { race_type: "10K", race_name: null, race_date: "2026-10-01" },
  ];
  it("signale le marathon de Séville pendant un plan Ironman, ni la course finale ni une course passée", () => {
    expect(missingRegisteredRaces(registered, [], { planStart: "2026-11-16", mainRaceDate: "2027-06-27" }))
      .toEqual([{ objective: "Marathon", raceName: "Séville", raceDate: "2027-02-28", priority: "B" }]);
  });
  it("rien quand la course est déjà dans le plan", () => {
    expect(missingRegisteredRaces(registered, [{ raceDate: "2027-02-28" }], { planStart: "2026-11-16", mainRaceDate: "2027-06-27" })).toEqual([]);
  });
});
