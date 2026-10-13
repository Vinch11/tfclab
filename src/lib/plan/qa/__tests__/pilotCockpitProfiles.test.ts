import { describe, it, expect } from "vitest";
import { PILOT_PROFILES, PILOT_PROFILE_IDS } from "../pilotCockpitProfiles";
import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";
import { normalizeGoal } from "@/lib/workoutCatalogBuilder";

describe("PILOT_PROFILES", () => {
  it("contient exactement les 5 profils validés, dans l'ordre d'exécution décidé", () => {
    expect(PILOT_PROFILE_IDS).toEqual(["B-5K-BEGINNER", "B-10K", "B-TRAIL-MOUNTAIN", "B-MARATHON", "B-IM"]);
    expect(PILOT_PROFILES.map((p) => p.id)).toEqual(PILOT_PROFILE_IDS);
  });

  it("ne contient JAMAIS B-STARTTORUN (correctif coach 2026-10-13 — le vrai Start to Run est un template statique sans IA, jamais ce que ce pilote doit tester)", () => {
    expect(PILOT_PROFILE_IDS).not.toContain("B-STARTTORUN");
  });

  it("le profil débutant sollicite réellement le moteur IA individualisé (objectif '5 KM', pas 'START TO RUN')", () => {
    const beginner = PILOT_PROFILES.find((p) => p.id === "B-5K-BEGINNER")!;
    expect(beginner.planConfig.objective).toBe("5 KM");
    expect(beginner.planConfig.objective).not.toMatch(/START TO RUN/i);
    // Reconnu comme un vrai objectif course à pied (catalogue "5k"/"10k")
    // par le routage utilisé en génération réelle (workoutCatalogBuilder) —
    // jamais "StartToRun" (normalizeObjectiveKey), qui serait le signe que
    // ce profil retombe sur le même objectif que le template statique.
    expect(normalizeGoal(beginner.planConfig.objective!)).toContain("5k");
    expect(normalizeObjectiveKey(beginner.planConfig.objective!)).not.toBe("StartToRun");
    expect(beginner.expectedWeeks).toBe(12);
    expect(beginner.planConfig.ambition).toBe("finisher");
    // Physiologie distincte du `commonAthlete` entraîné (VO2max 58) réutilisé
    // par les autres profils Phase 0 — valeurs plausibles d'un débutant réel.
    expect(beginner.athleteData.vo2max).toBeLessThan(45);
  });

  it("chaque profil a un expectedChunks positif cohérent avec le calcul exact (débutant 5K=3, 10K=3, trail montagne=3, marathon=4, ironman=4)", () => {
    const byId = Object.fromEntries(PILOT_PROFILES.map((p) => [p.id, p.expectedChunks]));
    expect(byId["B-5K-BEGINNER"]).toBe(3);
    expect(byId["B-10K"]).toBe(3);
    expect(byId["B-TRAIL-MOUNTAIN"]).toBe(3);
    expect(byId["B-MARATHON"]).toBe(4);
    expect(byId["B-IM"]).toBe(4);
  });

  it("le total de chunks des 5 profils est 17 (mis à jour après le correctif B-5K-BEGINNER, repère de budget)", () => {
    const total = PILOT_PROFILES.reduce((sum, p) => sum + p.expectedChunks, 0);
    expect(total).toBe(17);
  });
});
