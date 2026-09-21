import { describe, it, expect } from "vitest";
import { computeStrategicRoadmap } from "../strategicRoadmap";
import type { UnifiedLimiterResult } from "../unifiedLimiterDetection";

function makeAerobicLimiterResult(aerobicWeaknessDetail: "vo2max_low" | "ftp_kg_low" | "both_low"): UnifiedLimiterResult {
  return {
    primaryLimiter: "aerobic_engine",
    primaryLever: "increase_vo2max",
    gapAnalysis: [],
    limiterExplanation: "test",
    aerobicWeaknessDetail,
  } as unknown as UnifiedLimiterResult;
}

/**
 * Bug scientifique réel corrigé (audit "système de périodisation") :
 * `systemPrompt.ts` (génération réelle du plan) pose une exception
 * explicite — "EXCEPTION si Limiteur #1 = VO2max bas : NE PAS placer de
 * VO2max en Fondation. Le stimulus VO2max est réservé au Bloc Chantier
 * dédié". La roadmap visuelle faisait l'INVERSE : elle renommait la Phase 1
 * (Fondation) en "Chantier VO2max" et y plaçait le travail VO2max.
 */
describe("computeStrategicRoadmap — exception VO2max (Fondation vs Chantier)", () => {
  it("VO2max spécifiquement limitant (vo2max_low) : Phase 1 n'est PAS renommée 'Chantier VO2max', Phase 2 l'est", () => {
    const roadmap = computeStrategicRoadmap({ objectif: "IM", limiterResult: makeAerobicLimiterResult("vo2max_low") });
    expect(roadmap.phases[0].name).not.toBe("Chantier VO2max");
    expect(roadmap.phases[0].levers.join(" ")).not.toMatch(/VO2max/i);
    expect(roadmap.phases[1].name).toBe("Chantier VO2max");
    expect(roadmap.phases[1].levers.join(" ")).toMatch(/VO2max|Billat/i);
  });

  it("both_low (VO2max ET FTP/kg limitants) : traité comme vo2max_low (même exception, cas le plus prudent)", () => {
    const roadmap = computeStrategicRoadmap({ objectif: "IM", limiterResult: makeAerobicLimiterResult("both_low") });
    expect(roadmap.phases[0].name).not.toBe("Chantier VO2max");
    expect(roadmap.phases[1].name).toBe("Chantier VO2max");
  });

  it("FTP/kg spécifiquement limitant (VO2max non limitant) : le priming VO2max reste légitime en Fondation (comportement d'origine)", () => {
    const roadmap = computeStrategicRoadmap({ objectif: "IM", limiterResult: makeAerobicLimiterResult("ftp_kg_low") });
    expect(roadmap.phases[0].levers.join(" ")).toMatch(/VO2max/i);
    expect(roadmap.phases[1].name).not.toBe("Chantier VO2max");
  });
});

/**
 * Bug réel corrigé (audit "système de périodisation", point roadmap
 * visuelle) : `RoadmapInput` ne prenait qu'un seul objectif — pour un plan
 * Marathon+IM, la frise affichait un unique cycle vers l'IM sans jamais
 * mentionner le Marathon. Segmente désormais en un cycle par pic de forme
 * complet (même principe que promptHelpers.ts, PR #215/#216).
 */
describe("computeStrategicRoadmap — segmentation multi-objectifs (plusieurs pics de forme complets)", () => {
  const marathonPlusIM = {
    objectif: "IM",
    limiterResult: null,
    planStartDate: "2026-09-21",
    raceGoals: [
      { objective: "Marathon", raceDate: "2027-02-21", priority: "A" as const },
      { objective: "IM", raceDate: "2027-06-27", priority: "A" as const },
    ],
  };

  it("2 pics complets (Marathon S22 + IM S40) : la frise couvre S1-S40 sans trou ni chevauchement", () => {
    const roadmap = computeStrategicRoadmap(marathonPlusIM);
    expect(roadmap.totalWeeks).toBe(40);
    expect(roadmap.phases[0].startWeek).toBe(1);
    expect(roadmap.phases[roadmap.phases.length - 1].endWeek).toBe(40);
    for (let i = 1; i < roadmap.phases.length; i++) {
      expect(
        roadmap.phases[i].startWeek,
        `phase ${i} doit démarrer juste après la fin de la phase ${i - 1}`,
      ).toBe(roadmap.phases[i - 1].endWeek + 1);
    }
  });

  it("2 pics complets : la dernière phase du cycle 1 (Affûtage Marathon) se termine à S22, PAS en plein bloc de charge", () => {
    const roadmap = computeStrategicRoadmap(marathonPlusIM);
    // Le cycle 1 (Marathon) doit se terminer exactement à S22 (sa semaine de
    // course) — trouvé en cherchant la phase couvrant S22.
    const phaseAtRaceWeek = roadmap.phases.find((p) => 22 >= p.startWeek && 22 <= p.endWeek);
    expect(phaseAtRaceWeek, "une phase doit couvrir S22").toBeDefined();
    expect(phaseAtRaceWeek!.endWeek, "cette phase doit se terminer exactement à S22 (fin du cycle 1)").toBe(22);
  });

  it("1 seul pic complet (jalon insuffisamment espacé) : comportement mono-objectif inchangé (pas de segmentation)", () => {
    const roadmap = computeStrategicRoadmap({
      objectif: "Marathon",
      limiterResult: null,
      planStartDate: "2027-01-04",
      raceGoals: [
        { objective: "Marathon", raceDate: "2027-02-07", priority: "A" as const },
        { objective: "IM", raceDate: "2027-03-21", priority: "B" as const },
      ],
    });
    expect(roadmap.title).not.toMatch(/multi-objectifs/i);
  });

  it("raceGoals absent : comportement mono-objectif inchangé (non-régression)", () => {
    const roadmap = computeStrategicRoadmap({ objectif: "IM", limiterResult: null });
    expect(roadmap.title).not.toMatch(/multi-objectifs/i);
    expect(roadmap.totalWeeks).toBe(24);
  });
});
