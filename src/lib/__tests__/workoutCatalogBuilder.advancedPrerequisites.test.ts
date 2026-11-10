import { describe, expect, it } from "vitest";
import { buildWorkoutCatalog, serializeCatalogForPrompt } from "@/lib/workoutCatalogBuilder";

const ID = "NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY";

function idsFor(signal: {
  trainingLevel: string;
  trainingLevelSource: string;
  weeklyHours?: number;
  approvedAdvancedSessionIds?: readonly string[];
}) {
  return buildWorkoutCatalog("10K", 1, 4, 16, {
    phaseOverride: ["build"],
    maxItems: 500,
    sportFilter: ["course"],
    beginnerIntensitySignal: signal,
  }).map(entry => entry.id);
}

describe("buildWorkoutCatalog — prérequis des protocoles avancés", () => {
  it("n'expose jamais le double seuil à un profil light confirmé", () => {
    expect(idsFor({
      trainingLevel: "light",
      trainingLevelSource: "manual",
      weeklyHours: 10,
    })).not.toContain(ID);
  });

  // Revue lactate/norvégien du 2026-11-09 : l'approbation nominative est
  // nécessaire, mais ne lève ni le niveau « très chargé » ni les 8 h/sem.
  it("une approbation du coach ne suffit pas pour un profil light", () => {
    expect(idsFor({
      trainingLevel: "light",
      trainingLevelSource: "manual",
      weeklyHours: 4,
      approvedAdvancedSessionIds: [ID],
    })).not.toContain(ID);
  });

  it("respecte une décision explicite du coach pour un profil qui remplit les prérequis", () => {
    const profile = { trainingLevel: "highly_trained", trainingLevelSource: "manual", weeklyHours: 8 };
    expect(idsFor(profile)).not.toContain(ID);
    expect(idsFor({ ...profile, approvedAdvancedSessionIds: [ID] })).toContain(ID);
  });

  it("transmet l'intention structurée et marque explicitement les fiches non vérifiées", () => {
    const markdown = serializeCatalogForPrompt([
      {
        id: "VERIFIED",
        cat: "B",
        sport: "course",
        objectif: "VO2",
        phase: ["build"],
        durationMin: [50, 60],
        structure: "Main VO2",
        physiology: { primary: "vo2max", rationale: "Intervalles VO2" },
      },
      {
        id: "UNVERIFIED",
        cat: "A",
        sport: "course",
        objectif: "Séance historique",
        phase: ["base"],
        durationMin: [40, 50],
        structure: "Main historique",
      },
    ]);
    expect(markdown).toContain("Intention physiologique");
    expect(markdown).toContain("vo2max");
    expect(markdown).toContain("not_verified");
  });
});
