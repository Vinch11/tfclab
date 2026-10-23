import type { ReferenceScenario } from "./types";

const base = (objective: string, weeklyHours: number, sessionsPerWeek: number) => ({
  objective,
  weeksAvailable: 12,
  weeklyHours,
  sessionsPerWeek,
  maxSessionsPerDay: 1,
  strengthSessionsPerWeek: 1,
  ambition: "age_group",
  constraints: "Données synthétiques de laboratoire QA ; aucune valeur physiologique réelle.",
});

/**
 * Cas de référence déterministes. Les profils ne simulent aucune mesure
 * physiologique : les champs VMA/FTP/CSS restent absents et ne sont jamais
 * présentés comme observés. Ils décrivent seulement les entrées et attentes
 * nécessaires à l'analyse d'un plan déjà généré.
 */
export const REFERENCE_SCENARIOS: readonly ReferenceScenario[] = [
  {
    id: "beginner-5k", label: "Débutant 5 km", fixtureNotice: "synthetic_non_clinical",
    athleteData: { nom: "QA synthétique — débutant 5 km" },
    planConfig: { ...base("5 KM", 3, 3), ambition: "finisher", strengthSessionsPerWeek: 1 },
    expectations: { objectiveFamily: "5k", requiredSports: ["run"], forbiddenSports: ["swim"], finalRaceTokens: ["5 km", "5k"], minimumStrengthSessionsPerWeek: 1, maxWeeklyVolumeIncreasePct: 15 },
  },
  {
    id: "confirmed-10k", label: "Coureur 10 km confirmé", fixtureNotice: "synthetic_non_clinical",
    athleteData: { nom: "QA synthétique — 10 km confirmé" },
    planConfig: { ...base("10 KM", 7, 6), ambition: "competitor" },
    expectations: { objectiveFamily: "10k", requiredSports: ["run"], finalRaceTokens: ["10 km", "10k"], minimumStrengthSessionsPerWeek: 1, maxWeeklyVolumeIncreasePct: 18 },
  },
  {
    id: "intermediate-half", label: "Semi-marathon intermédiaire", fixtureNotice: "synthetic_non_clinical",
    athleteData: { nom: "QA synthétique — semi intermédiaire" },
    planConfig: { ...base("SEMI-MARATHON", 7, 6), ambition: "age_group" },
    expectations: { objectiveFamily: "half", requiredSports: ["run"], finalRaceTokens: ["semi-marathon", "semi marathon", "21,1", "21.1"], minimumStrengthSessionsPerWeek: 1, maxWeeklyVolumeIncreasePct: 18 },
  },
  {
    id: "confirmed-marathon", label: "Marathon confirmé", fixtureNotice: "synthetic_non_clinical",
    athleteData: { nom: "QA synthétique — marathon confirmé" },
    planConfig: { ...base("MARATHON", 10, 7), ambition: "competitor", weeksAvailable: 16 },
    expectations: { objectiveFamily: "marathon", requiredSports: ["run"], finalRaceTokens: ["marathon", "42,2", "42.2"], minimumStrengthSessionsPerWeek: 1, maxWeeklyVolumeIncreasePct: 20 },
  },
  {
    id: "mountain-trail", label: "Trail montagne", fixtureNotice: "synthetic_non_clinical",
    athleteData: { nom: "QA synthétique — trail montagne" },
    planConfig: { ...base("TRAIL MONTAGNE", 10, 7), terrainAvailability: "montagne", weeksAvailable: 16 },
    expectations: { objectiveFamily: "trail", requiredSports: ["run"], finalRaceTokens: ["trail", "course objectif"], minimumStrengthSessionsPerWeek: 1, maxWeeklyVolumeIncreasePct: 20 },
  },
  {
    id: "tri-sprint", label: "Triathlon sprint", fixtureNotice: "synthetic_non_clinical",
    athleteData: { nom: "QA synthétique — triathlon sprint" },
    planConfig: { ...base("TRIATHLON SPRINT", 7, 7), maxSessionsPerDay: 2 },
    expectations: { objectiveFamily: "tri_sprint", requiredSports: ["swim", "bike", "run"], cardioShareRanges: { swim: [0.12, 0.35], bike: [0.30, 0.60], run: [0.20, 0.45] }, finalRaceTokens: ["triathlon sprint", "tri sprint"], minimumStrengthSessionsPerWeek: 1 },
  },
  {
    id: "tri-olympic", label: "Triathlon olympique", fixtureNotice: "synthetic_non_clinical",
    athleteData: { nom: "QA synthétique — triathlon olympique" },
    planConfig: { ...base("TRIATHLON OLYMPIQUE", 9, 8), maxSessionsPerDay: 2 },
    expectations: { objectiveFamily: "tri_olympic", requiredSports: ["swim", "bike", "run"], cardioShareRanges: { swim: [0.12, 0.35], bike: [0.32, 0.60], run: [0.20, 0.42] }, finalRaceTokens: ["triathlon olympique", "distance olympique"], minimumStrengthSessionsPerWeek: 1 },
  },
  {
    id: "confirmed-703", label: "70.3 confirmé", fixtureNotice: "synthetic_non_clinical",
    athleteData: { nom: "QA synthétique — 70.3 confirmé" },
    planConfig: { ...base("IRONMAN 70.3", 12, 9), maxSessionsPerDay: 2, weeksAvailable: 16 },
    expectations: { objectiveFamily: "70.3", requiredSports: ["swim", "bike", "run"], cardioShareRanges: { swim: [0.10, 0.28], bike: [0.38, 0.62], run: [0.20, 0.40] }, finalRaceTokens: ["70.3", "half ironman"], minimumStrengthSessionsPerWeek: 1 },
  },
  {
    id: "confirmed-ironman", label: "Ironman confirmé", fixtureNotice: "synthetic_non_clinical",
    athleteData: { nom: "QA synthétique — Ironman confirmé" },
    planConfig: { ...base("IRONMAN", 15, 11), maxSessionsPerDay: 2, weeksAvailable: 20 },
    expectations: { objectiveFamily: "ironman", requiredSports: ["swim", "bike", "run"], cardioShareRanges: { swim: [0.08, 0.25], bike: [0.42, 0.66], run: [0.20, 0.38] }, finalRaceTokens: ["ironman", "140.6"], minimumStrengthSessionsPerWeek: 1 },
  },
  {
    id: "703-with-10k", label: "70.3 avec compétition intermédiaire 10 km", fixtureNotice: "synthetic_non_clinical",
    athleteData: { nom: "QA synthétique — 70.3 et 10 km" },
    planConfig: { ...base("IRONMAN 70.3", 12, 9), maxSessionsPerDay: 2, weeksAvailable: 12, raceGoals: [{ objective: "10 KM", weeksUntilRace: 4, priority: "B" }, { objective: "IRONMAN 70.3", weeksUntilRace: 12, priority: "A" }] },
    expectations: { objectiveFamily: "70.3", requiredSports: ["swim", "bike", "run"], cardioShareRanges: { swim: [0.10, 0.28], bike: [0.36, 0.62], run: [0.20, 0.42] }, finalRaceTokens: ["70.3", "half ironman"], intermediateRaces: [{ family: "10k", tokens: ["10 km", "10k"], expectedWeek: 4 }], minimumStrengthSessionsPerWeek: 1 },
  },
  {
    id: "marathon-with-half", label: "Marathon avec semi-marathon préparatoire", fixtureNotice: "synthetic_non_clinical",
    athleteData: { nom: "QA synthétique — marathon et semi" },
    planConfig: { ...base("MARATHON", 10, 7), weeksAvailable: 12, raceGoals: [{ objective: "SEMI-MARATHON", weeksUntilRace: 6, priority: "B" }, { objective: "MARATHON", weeksUntilRace: 12, priority: "A" }] },
    expectations: { objectiveFamily: "marathon", requiredSports: ["run"], finalRaceTokens: ["marathon", "42,2", "42.2"], intermediateRaces: [{ family: "half", tokens: ["semi-marathon", "semi marathon", "21,1", "21.1"], expectedWeek: 6 }], minimumStrengthSessionsPerWeek: 1 },
  },
  {
    id: "low-availability", label: "Athlète avec faible disponibilité", fixtureNotice: "synthetic_non_clinical",
    athleteData: { nom: "QA synthétique — faible disponibilité" },
    planConfig: { ...base("10 KM", 4, 4), strengthSessionsPerWeek: 0, constraints: "Disponibilités structurées du scénario : lundi, mercredi, samedi et dimanche." },
    expectations: { objectiveFamily: "10k", requiredSports: ["run"], finalRaceTokens: ["10 km", "10k"], allowedDayIndexes: [0, 2, 5, 6], maxWeeklyVolumeIncreasePct: 15 },
  },
  {
    id: "discipline-restricted", label: "Athlète avec restrictions de discipline", fixtureNotice: "synthetic_non_clinical",
    athleteData: { nom: "QA synthétique — discipline restreinte" },
    planConfig: { ...base("10 KM", 6, 5), crossTrainingMaintenance: { velo: true, natation: false }, constraints: "Natation interdite ; course et vélo autorisés." },
    expectations: { objectiveFamily: "10k", requiredSports: ["run"], forbiddenSports: ["swim"], finalRaceTokens: ["10 km", "10k"], minimumStrengthSessionsPerWeek: 1 },
  },
  {
    id: "cautious-progression", label: "Athlète nécessitant une progression prudente", fixtureNotice: "synthetic_non_clinical",
    athleteData: { nom: "QA synthétique — progression prudente" },
    planConfig: { ...base("10 KM", 6, 5), deloadCadenceWeeks: 3, recentLoad: { tss7d: null, source: "UNKNOWN", status: "unknown", label: "Non mesuré", recommendation: "Progression prudente", target: { min: 0, opt: 0, max: 0 } } },
    expectations: { objectiveFamily: "10k", requiredSports: ["run"], finalRaceTokens: ["10 km", "10k"], minimumStrengthSessionsPerWeek: 1, maxWeeklyVolumeIncreasePct: 10 },
  },
] as const;

export function getReferenceScenario(id: string): ReferenceScenario | undefined {
  return REFERENCE_SCENARIOS.find(scenario => scenario.id === id);
}

