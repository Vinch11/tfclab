import { describe, expect, it } from "vitest";
import {
  buildPilotFormConfig,
  preparePilotTrainingPlanContext,
} from "@/lib/plan/qa/preparePilotTrainingPlanContext";
import { QA_PROFILES, type QAProfile } from "@/lib/plan/qa/syntheticProfiles";
import { checkB4For } from "@/lib/plan/qa/checks";
import type { MergedPlan } from "@/lib/plan/mergePlanChunks";

/**
 * Sprint qualité Marathon/Ironman (oct. 2026) — PRÉPARATION DU PREMIER TEST
 * CONTRÔLÉ (consigne coach explicite) : profil réel coach "B-10K-TO-70.3"
 * (10 km intermédiaire priorité B → Ironman 70.3 Tours priorité A).
 *
 * Verrouille deux choses :
 *   1. Le bug trouvé en préparant ce profil : `buildPilotFormConfig`
 *      n'avait JAMAIS transmis `loadHistory`/`maxDoubleDaysPerWeek`, et le
 *      spread `{...profile.planConfig, ...prepared.planConfig}` dans
 *      `preparePilotTrainingPlanContext` écrasait silencieusement ces
 *      champs avec `undefined` (clé présente-mais-undefined). Corrigé dans
 *      `buildPilotFormConfig` — ce test empêche toute régression.
 *   2. La cohérence des données confirmées par le coach qui transitent
 *      RÉELLEMENT jusqu'au planConfig préparé (pas seulement déclarées sur
 *      le profil QA) : raceGoals, planStartDate, ambition effective,
 *      maxDoubleDaysPerWeek, loadHistory.
 */

function newProfile(): QAProfile {
  const profile = QA_PROFILES.find((candidate) => candidate.id === "B-10K-TO-70.3");
  if (!profile) throw new Error("Profil B-10K-TO-70.3 introuvable");
  return profile;
}

function emptyMergedPlan(totalWeeks: number): MergedPlan {
  return { title: "Plan TFCL™ — Test", phases: [], totalWeeks, weeks: [] };
}

describe("preparePilotTrainingPlanContext — B-10K-TO-70.3 (profil réel coach, premier test contrôlé)", () => {
  it("buildPilotFormConfig transmet loadHistory et maxDoubleDaysPerWeek (régression du bug trouvé — ex-undefined silencieux)", () => {
    const profile = newProfile();
    const formConfig = buildPilotFormConfig(profile.planConfig);
    expect(formConfig.loadHistory).toEqual({ chronicWeeklyHours: 8, recentWeeklyHours: 17, recentWeeksCount: 4 });
    expect(formConfig.maxDoubleDaysPerWeek).toBe(4);
  });

  it("preparePilotTrainingPlanContext n'écrase PAS loadHistory/maxDoubleDaysPerWeek avec undefined (ordre de spread)", () => {
    const profile = newProfile();
    const prepared = preparePilotTrainingPlanContext(profile);
    expect(prepared.planConfig.loadHistory).toEqual({ chronicWeeklyHours: 8, recentWeeklyHours: 17, recentWeeksCount: 4 });
    expect(prepared.planConfig.maxDoubleDaysPerWeek).toBe(4);
  });

  it("transmet réellement raceGoals (10K priorité B + 70.3 Tours priorité A) et planStartDate jusqu'au planConfig préparé", () => {
    const profile = newProfile();
    const prepared = preparePilotTrainingPlanContext(profile);
    expect(prepared.planConfig.planStartDate).toBe("2026-10-26");
    expect(prepared.planConfig.raceGoals).toHaveLength(2);
    const primary = prepared.planConfig.raceGoals!.find((g) => g.priority === "A");
    const milestone = prepared.planConfig.raceGoals!.find((g) => g.priority === "B");
    expect(primary?.objective).toBe("IRONMAN 70.3");
    expect(primary?.raceDate).toBe("2027-06-06");
    expect(milestone?.objective).toBe("10 KM");
    expect(milestone?.raceDate).toBe("2026-12-19");
  });

  it("ambition effective = elite (Qualifiable) — trainingLevel 'trained' ne déclasse pas une ambition déjà plafonnée à 'elite'", () => {
    const profile = newProfile();
    expect(profile.planConfig.ambitionMeta?.downgraded).toBe(false);
    expect(profile.planConfig.ambitionMeta?.effective).toBe("elite");
    expect(profile.planConfig.ambitionMeta?.trainingLevel).toBe("trained");
  });

  it("FTP/poids confirmés (300W/90kg) sont cohérents (3.33 W/kg, calcul simple division)", () => {
    const profile = newProfile();
    expect(profile.athleteData.ftp).toBe(300);
    expect(profile.athleteData.weightKg).toBe(90);
    expect(profile.athleteData.ftp! / profile.athleteData.weightKg!).toBeCloseTo(3.33, 2);
  });

  it("checkB4For ne lève jamais pour ce profil (câblage famille multisport confirmé)", () => {
    const plan = emptyMergedPlan(32);
    expect(() => checkB4For("B-10K-TO-70.3", plan)).not.toThrow();
    const res = checkB4For("B-10K-TO-70.3", plan);
    expect(res.label).toContain("swim/bike/run");
  });

  it("expectedWeeks/expectedChunks cohérents avec la formule réelle de chunking (IRONMAN 70.3, 32 sem → isTriVerbose, CHUNK_SIZE=5, ceil(32/5)=7)", () => {
    const profile = newProfile();
    expect(profile.expectedWeeks).toBe(32);
    expect(profile.expectedChunks).toBe(7);
    expect(profile.planConfig.weeksAvailable).toBe(32);
  });
});
