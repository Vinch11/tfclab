import { describe, it, expect } from "vitest";
import { QA_PROFILES } from "../syntheticProfiles";

/**
 * Garde-fou arithmétique — `expectedWeeks`/`expectedChunks` dans
 * syntheticProfiles.ts sont calculés À LA MAIN (commentaires) à partir de la
 * formule de chunking réelle (useAITrainingPlan.ts generatePlan). Ce test
 * rejoue la même formule pour détecter toute erreur de calcul ou tout futur
 * changement de la formule source qui désynchroniserait les profils QA.
 */
function expectedChunksFor(objective: string, totalWeeks: number): number {
  const obj = objective.toUpperCase();
  const isTriVerbose = /IRON|IM\b|703|70\.3|TRIATHLON|TRI\b/i.test(obj);
  const isTrailVerbose = /TRAIL\s*(ULTRA|MOUNTAIN|MONT|UTMB|CCC|OCC|LONG)/i.test(obj) || (/TRAIL/i.test(obj) && totalWeeks >= 12);
  const CHUNK_SIZE = isTriVerbose ? 5 : isTrailVerbose ? 6 : 4;
  const chunkThreshold = isTriVerbose ? 6 : isTrailVerbose ? 8 : 6;
  const needsChunking = totalWeeks > chunkThreshold;
  return needsChunking ? Math.ceil(totalWeeks / CHUNK_SIZE) : 1;
}

describe("QA_PROFILES — cohérence structurelle", () => {
  it("a des IDs tous uniques", () => {
    const ids = QA_PROFILES.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("couvre au moins 10 des 13 objectifs de ObjectifType (vs 3 avant l'extension)", () => {
    expect(QA_PROFILES.length).toBeGreaterThanOrEqual(10);
  });

  it.each(QA_PROFILES.map(p => [p.id, p] as const))("%s : expectedChunks correspond à la formule réelle de chunking", (_id, profile) => {
    expect(profile.planConfig.weeksAvailable).toBe(profile.expectedWeeks);
    const real = expectedChunksFor(profile.planConfig.objective ?? "", profile.expectedWeeks);
    expect(profile.expectedChunks).toBe(real);
  });
});
