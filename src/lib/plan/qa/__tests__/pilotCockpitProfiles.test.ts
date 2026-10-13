import { describe, it, expect } from "vitest";
import { PILOT_PROFILES, PILOT_PROFILE_IDS } from "../pilotCockpitProfiles";

describe("PILOT_PROFILES", () => {
  it("contient exactement les 5 profils validés, dans l'ordre d'exécution décidé", () => {
    expect(PILOT_PROFILE_IDS).toEqual(["B-STARTTORUN", "B-10K", "B-TRAIL-MOUNTAIN", "B-MARATHON", "B-IM"]);
    expect(PILOT_PROFILES.map((p) => p.id)).toEqual(PILOT_PROFILE_IDS);
  });

  it("chaque profil a un expectedChunks positif cohérent avec le calcul exact (débutant=2, 10K=3, trail montagne=3, marathon=4, ironman=4)", () => {
    const byId = Object.fromEntries(PILOT_PROFILES.map((p) => [p.id, p.expectedChunks]));
    expect(byId["B-STARTTORUN"]).toBe(2);
    expect(byId["B-10K"]).toBe(3);
    expect(byId["B-TRAIL-MOUNTAIN"]).toBe(3);
    expect(byId["B-MARATHON"]).toBe(4);
    expect(byId["B-IM"]).toBe(4);
  });

  it("le total de chunks des 5 profils est 16 (vérifié au lot précédent, repère de budget)", () => {
    const total = PILOT_PROFILES.reduce((sum, p) => sum + p.expectedChunks, 0);
    expect(total).toBe(16);
  });
});
