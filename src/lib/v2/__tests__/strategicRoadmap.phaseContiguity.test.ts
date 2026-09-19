import { describe, it, expect } from "vitest";
import { computeStrategicRoadmap } from "../strategicRoadmap";
import type { UnifiedLimiterResult, UnifiedLimiter } from "../unifiedLimiterDetection";

/**
 * Audit "estimations de temps et stratégies, tous objectifs × toutes
 * ambitions" : la roadmap stratégique (RoadmapStrategique.tsx) affiche les
 * phases comme une frise de Gantt (largeur = endWeek-startWeek+1). Deux bugs
 * réels trouvés :
 *  1. Les templates de base IM et 70.3 avaient une semaine orpheline entre
 *     Phase 3 et Phase 4 (S19 pour IM, S20 pour 70.3) — n'appartenant à
 *     aucune phase.
 *  2. `adaptPhasesToLimiter` recalculait startWeek/endWeek de chaque phase
 *     INDÉPENDAMMENT depuis le template de base + son propre delta, sans
 *     jamais vérifier que la phase suivante démarre bien juste après la fin
 *     de la précédente — un shift par limiteur pouvait donc INTRODUIRE des
 *     trous même sur un template de base parfaitement contigu (constaté sur
 *     Marathon + limiteur "aerobic_engine" : trou de 2 semaines).
 *
 * Ce test vérifie, pour TOUS les objectifs supportés × TOUS les limiteurs
 * (dont "none"), que les phases retournées sont strictement contiguës et
 * couvrent exactement [1, totalWeeks] sans trou ni chevauchement.
 */
function makeLimiterResult(primaryLimiter: UnifiedLimiter): UnifiedLimiterResult {
  return {
    primaryLimiter,
    primaryLever: "vo2max_intervals",
    gapAnalysis: [],
    limiterExplanation: "test",
  } as unknown as UnifiedLimiterResult;
}

const OBJECTIVES = ["IM", "703", "Marathon", "Semi", "UnknownObjective"];
const LIMITERS: (UnifiedLimiter | "none")[] = [
  "aerobic_engine", "glycolytic", "anaerobic_capacity",
  "specific_endurance", "metabolic_efficiency", "neuromuscular", "none",
];

function assertContiguous(phases: { startWeek: number; endWeek: number }[], totalWeeks: number, label: string) {
  expect(phases.length, label).toBeGreaterThan(0);
  expect(phases[0].startWeek, `${label} — première phase doit démarrer S1`).toBe(1);
  expect(phases[phases.length - 1].endWeek, `${label} — dernière phase doit finir à totalWeeks`).toBe(totalWeeks);
  for (let i = 1; i < phases.length; i++) {
    expect(
      phases[i].startWeek,
      `${label} — phase ${i + 1} doit démarrer juste après la fin de la phase ${i} (pas de trou ni chevauchement)`,
    ).toBe(phases[i - 1].endWeek + 1);
  }
  for (const p of phases) {
    expect(p.endWeek, `${label} — endWeek >= startWeek`).toBeGreaterThanOrEqual(p.startWeek);
  }
}

describe("computeStrategicRoadmap — phases contiguës pour tous les objectifs × tous les limiteurs", () => {
  for (const objectif of OBJECTIVES) {
    for (const limiter of LIMITERS) {
      it(`${objectif} × ${limiter} : phases contiguës [1, totalWeeks], sans trou`, () => {
        const limiterResult = limiter === "none" ? null : makeLimiterResult(limiter);
        const roadmap = computeStrategicRoadmap({ objectif, limiterResult });
        assertContiguous(roadmap.phases, roadmap.totalWeeks, `${objectif}/${limiter}`);
      });
    }
  }
});
