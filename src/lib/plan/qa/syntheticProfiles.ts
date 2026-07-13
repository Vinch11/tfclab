/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Phase 0 — Profils synthétiques FIXES pour la QA de la génération JSON.
 * ═══════════════════════════════════════════════════════════════════════════════
 * NE PAS MODIFIER sans mise à jour explicite des attendus de checks B4/B5/B7.
 * Les 3 profils sont :
 *   - B-70.3  : Ironman 70.3, 12 semaines, age_group
 *   - B-SEMI  : semi-marathon, 8 semaines, competitor
 *   - B-SPRINT: triathlon sprint, 6 semaines, finisher
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { PlanAthleteData, PlanConfig } from "@/hooks/useAITrainingPlan";

export interface QAProfile {
  id: "B-70.3" | "B-SEMI" | "B-SPRINT";
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
];
