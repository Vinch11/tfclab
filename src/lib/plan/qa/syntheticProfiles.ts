/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Phase 0 — Profils synthétiques FIXES pour la QA de la génération JSON.
 * ═══════════════════════════════════════════════════════════════════════════════
 * NE PAS MODIFIER sans mise à jour explicite des attendus de checks B4/B5/B7.
 *
 * Extension "Definition of Done" (2026-10-02) — les 3 profils d'origine ne
 * couvraient que 3 des 13 objectifs exposés dans l'UI (IM/Marathon/10K/5K/
 * Olympic/StartToRun/Trail* n'avaient jamais tourné de vraie génération QA)
 * ni les paliers d'ambition `elite`/`world_class`. Chaque nouveau profil
 * ajouté ici DOIT aussi être câblé dans `checks.ts::checkB4For` (switch
 * exhaustif, échec de compilation sinon via `assertNeverProfileId`) — c'est
 * le même garde-fou que `COVERAGE_GUARD` dans
 * `objectiveCoverage.definitionOfDone.test.ts`, appliqué ici à la QA E2E.
 *
 * Les 12 profils couvrent les 13 objectifs (703/IM/Sprint/Olympic partagent
 * la même famille de check B4 "multi-sport") et les 5 paliers d'ambition :
 *   - B-70.3           : Ironman 70.3, 12 sem, age_group
 *   - B-SEMI           : semi-marathon, 8 sem, competitor
 *   - B-SPRINT         : triathlon sprint, 6 sem, finisher
 *   - B-IM             : Ironman, 16 sem, elite
 *   - B-MARATHON       : marathon, 16 sem, world_class
 *   - B-10K            : 10 km, 10 sem, competitor
 *   - B-5K             : 5 km, 6 sem, age_group
 *   - B-OLYMPIC        : triathlon olympique, 10 sem, finisher
 *   - B-STARTTORUN     : débutant marche-course, 8 sem, finisher
 *   - B-TRAIL-SHORT    : trail court, 8 sem, competitor
 *   - B-TRAIL-MOUNTAIN : trail montagne, 14 sem, elite
 *   - B-TRAIL-ULTRA    : trail ultra, 20 sem, world_class
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { PlanAthleteData, PlanConfig } from "@/hooks/useAITrainingPlan";

export type QAProfileId =
  | "B-70.3" | "B-SEMI" | "B-SPRINT"
  | "B-IM" | "B-MARATHON" | "B-10K" | "B-5K" | "B-OLYMPIC" | "B-STARTTORUN"
  | "B-TRAIL-SHORT" | "B-TRAIL-MOUNTAIN" | "B-TRAIL-ULTRA";

export interface QAProfile {
  id: QAProfileId;
  label: string;
  expectedWeeks: number;
  expectedChunks: number;
  athleteData: PlanAthleteData;
  planConfig: PlanConfig;
}

const commonAthlete: PlanAthleteData = {
  nom: "QA Synthetic",
  sex: "male",
  age: 35,
  ftp: 280,
  weightKg: 72,
  vlamax: 0.55,
  vlamaxRun: 0.50,
  vo2max: 58,
  vma: 18.0,
  css: 90,
  fcMax: 188,
  tte: 45,
  pmax5s: 950,
  p30s: 620,
  p60s: 480,
  map5min: 380,
  paceThresholdSecPerKm: 220,
  runMLSSEffectivePct: 0.86,
  runMLSSEffectiveSource: "predicted",
  runEconomyScore: 3,
};

export const QA_PROFILES: QAProfile[] = [
  {
    id: "B-70.3",
    label: "Ironman 70.3 · 12 sem · age_group",
    expectedWeeks: 12,
    expectedChunks: 3, // triVerbose → CHUNK_SIZE=5, 12/5 = 3
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "IRONMAN 70.3",
      raceName: "QA 70.3 Test",
      weeksAvailable: 12,
      weeklyHours: 10,
      sessionsPerWeek: 8,
      maxSessionsPerDay: 2,
      strengthSessionsPerWeek: 1,
      ambition: "age_group",
      constraints: "Profil synthétique QA — pas d'accès trail/montagne.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-SEMI",
    label: "Semi-marathon · 8 sem · competitor",
    expectedWeeks: 8,
    expectedChunks: 2, // non-verbose → CHUNK_SIZE=4, threshold 6 → 8 sem chunké
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "SEMI-MARATHON",
      raceName: "QA Semi Test",
      weeksAvailable: 8,
      weeklyHours: 6,
      sessionsPerWeek: 5,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "competitor",
      constraints: "Profil synthétique QA — course à pied uniquement.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-SPRINT",
    label: "Triathlon sprint · 6 sem · finisher",
    expectedWeeks: 6,
    expectedChunks: 1, // triVerbose threshold=6 → mono-bloc à 6 sem exact
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "TRIATHLON SPRINT",
      raceName: "QA Sprint Test",
      weeksAvailable: 6,
      weeklyHours: 7,
      sessionsPerWeek: 6,
      maxSessionsPerDay: 2,
      strengthSessionsPerWeek: 1,
      ambition: "finisher",
      constraints: "Profil synthétique QA — sprint distance.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-IM",
    label: "Ironman · 16 sem · elite",
    expectedWeeks: 16,
    expectedChunks: 4, // triVerbose → CHUNK_SIZE=5, 16>threshold(6) → ceil(16/5)=4
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "IRONMAN",
      raceName: "QA IM Test",
      weeksAvailable: 16,
      weeklyHours: 14,
      sessionsPerWeek: 10,
      maxSessionsPerDay: 2,
      strengthSessionsPerWeek: 1,
      ambition: "elite",
      constraints: "Profil synthétique QA — pas d'accès trail/montagne.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-MARATHON",
    label: "Marathon · 16 sem · world_class",
    expectedWeeks: 16,
    expectedChunks: 4, // non-verbose → CHUNK_SIZE=4, 16>threshold(6) → ceil(16/4)=4
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "MARATHON",
      raceName: "QA Marathon Test",
      weeksAvailable: 16,
      weeklyHours: 9,
      sessionsPerWeek: 7,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "world_class",
      constraints: "Profil synthétique QA — course à pied uniquement.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-10K",
    label: "10 km · 10 sem · competitor",
    expectedWeeks: 10,
    expectedChunks: 3, // non-verbose → CHUNK_SIZE=4, 10>threshold(6) → ceil(10/4)=3
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "10 KM",
      raceName: "QA 10K Test",
      weeksAvailable: 10,
      weeklyHours: 6,
      sessionsPerWeek: 5,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "competitor",
      constraints: "Profil synthétique QA — course à pied uniquement.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-5K",
    label: "5 km · 6 sem · age_group",
    expectedWeeks: 6,
    expectedChunks: 1, // non-verbose → CHUNK_SIZE=4, threshold=6 → 6 n'excède pas 6 → mono-bloc
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "5 KM",
      raceName: "QA 5K Test",
      weeksAvailable: 6,
      weeklyHours: 5,
      sessionsPerWeek: 5,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "age_group",
      constraints: "Profil synthétique QA — course à pied uniquement.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-OLYMPIC",
    label: "Triathlon olympique · 10 sem · finisher",
    expectedWeeks: 10,
    expectedChunks: 2, // triVerbose → CHUNK_SIZE=5, 10>threshold(6) → ceil(10/5)=2
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "TRIATHLON OLYMPIQUE",
      raceName: "QA Olympic Test",
      weeksAvailable: 10,
      weeklyHours: 8,
      sessionsPerWeek: 6,
      maxSessionsPerDay: 2,
      strengthSessionsPerWeek: 1,
      ambition: "finisher",
      constraints: "Profil synthétique QA — distance olympique.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-STARTTORUN",
    label: "Débutant Start to Run · 8 sem · finisher",
    expectedWeeks: 8,
    expectedChunks: 2, // non-verbose → CHUNK_SIZE=4, 8>threshold(6) → ceil(8/4)=2
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "START TO RUN",
      raceName: "QA Start to Run Test",
      weeksAvailable: 8,
      weeklyHours: 3,
      sessionsPerWeek: 3,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "finisher",
      constraints: "Profil synthétique QA — débutant absolu, marche-course.",
      terrainAvailability: "plat",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-TRAIL-SHORT",
    label: "Trail court · 8 sem · competitor",
    expectedWeeks: 8,
    // isTrailVerbose nécessite ULTRA/MOUNTAIN/MONT/UTMB/CCC/OCC/LONG dans
    // l'objectif OU totalWeeks≥12 — "TRAIL COURT" à 8 sem ne matche aucun des
    // deux → non-verbose → CHUNK_SIZE=4, 8>threshold(6) → ceil(8/4)=2
    expectedChunks: 2,
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "TRAIL COURT 30KM",
      raceName: "QA Trail Court Test",
      weeksAvailable: 8,
      weeklyHours: 7,
      sessionsPerWeek: 5,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "competitor",
      constraints: "Profil synthétique QA — trail court, D+ modéré.",
      terrainAvailability: "vallonne",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-TRAIL-MOUNTAIN",
    label: "Trail montagne · 14 sem · elite",
    // isTrailVerbose matche "MONT" → CHUNK_SIZE=6, threshold=8 → 14>8 → ceil(14/6)=3
    expectedWeeks: 14,
    expectedChunks: 3,
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "TRAIL MONTAGNE 60KM",
      raceName: "QA Trail Montagne Test",
      weeksAvailable: 14,
      weeklyHours: 10,
      sessionsPerWeek: 6,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "elite",
      constraints: "Profil synthétique QA — trail montagne, D+ élevé.",
      terrainAvailability: "montagne",
      recoveryStrategy: "passive",
    },
  },
  {
    id: "B-TRAIL-ULTRA",
    label: "Trail ultra · 20 sem · world_class",
    // isTrailVerbose matche "ULTRA" → CHUNK_SIZE=6, threshold=8 → 20>8 → ceil(20/6)=4
    expectedWeeks: 20,
    expectedChunks: 4,
    athleteData: { ...commonAthlete },
    planConfig: {
      objective: "TRAIL ULTRA UTMB",
      raceName: "QA Trail Ultra Test",
      weeksAvailable: 20,
      weeklyHours: 13,
      sessionsPerWeek: 7,
      maxSessionsPerDay: 1,
      strengthSessionsPerWeek: 1,
      ambition: "world_class",
      constraints: "Profil synthétique QA — ultra distance, D+ très élevé.",
      terrainAvailability: "montagne",
      recoveryStrategy: "passive",
    },
  },
];
