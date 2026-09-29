import { describe, it, expect } from "vitest";
import { shouldAutoEnableNatationMaintenance } from "../crossTrainingNatationDefault";

describe("shouldAutoEnableNatationMaintenance", () => {
  it("true : objectif final Ironman + objectif intermédiaire Marathon (cas Séville → Sables d'Olonne)", () => {
    expect(
      shouldAutoEnableNatationMaintenance("IM", [{ objective: "Marathon" }]),
    ).toBe(true);
  });

  it("true : objectif final 70.3 + objectif intermédiaire Semi", () => {
    expect(
      shouldAutoEnableNatationMaintenance("703", [{ objective: "Semi" }]),
    ).toBe(true);
  });

  it("false : plan mono-objectif Marathon (pas de triathlon final) — défaut historique inchangé", () => {
    expect(shouldAutoEnableNatationMaintenance("Marathon", [])).toBe(false);
  });

  it("false : objectif final Ironman SANS objectif intermédiaire course (plan tri mono-objectif)", () => {
    expect(shouldAutoEnableNatationMaintenance("IM", [])).toBe(false);
  });

  it("false : objectif final Ironman avec objectif intermédiaire qui est aussi un triathlon (pas de cycle 100% course)", () => {
    expect(
      shouldAutoEnableNatationMaintenance("IM", [{ objective: "703" }]),
    ).toBe(false);
  });

  it("false : objectif final Trail (jamais concerné, même avec un objectif intermédiaire course)", () => {
    expect(
      shouldAutoEnableNatationMaintenance("TrailUltra", [{ objective: "Marathon" }]),
    ).toBe(false);
  });

  it("true : au moins un objectif intermédiaire course parmi plusieurs objectifs", () => {
    expect(
      shouldAutoEnableNatationMaintenance("IM", [
        { objective: "703" },
        { objective: "10K" },
      ]),
    ).toBe(true);
  });
});
