import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";
import type { DiagnosticInput } from "@/engines/diagnostic";
import { prepareTrainingPlanContext, type PreparedTrainingPlanContext, type PlanFormConfig } from "@/engines/plan";
import { normalizeAmbitionLevel } from "@/types/ambitionLevel";
import type { PlanConfig } from "@/hooks/useAITrainingPlan";
import type { QAProfile } from "./syntheticProfiles";

function sportFocusForObjective(objective: string): "bike" | "run" | "tri" {
  if (["703", "IM", "Sprint", "Olympic"].includes(normalizeObjectiveKey(objective))) return "tri";
  const normalized = objective.toLowerCase();
  if (/ironman|70\.3|triathlon|olympic|sprint/.test(normalized)) return "tri";
  if (/cycl|granfondo|bike|vélo/.test(normalized)) return "bike";
  return "run";
}

function sexForDiagnostic(sex: string | null | undefined): "M" | "F" | null {
  if (!sex) return null;
  const normalized = sex.toLowerCase();
  if (normalized === "f" || normalized === "female" || normalized === "femme") return "F";
  if (normalized === "m" || normalized === "male" || normalized === "homme") return "M";
  return null;
}

export function buildPilotDiagnosticInput(profile: QAProfile): DiagnosticInput {
  const athlete = profile.athleteData;
  const config = profile.planConfig;
  const ftpKg = athlete.ftp && athlete.weightKg ? athlete.ftp / athlete.weightKg : null;
  const isRun = sportFocusForObjective(config.objective) === "run";
  return {
    athleteId: `pilot:${profile.id}`,
    athleteName: athlete.nom,
    age: athlete.age ?? null,
    sex: sexForDiagnostic(athlete.sex),
    weightKg: athlete.weightKg ?? null,
    objectif: config.objective,
    ambition: normalizeAmbitionLevel(config.ambition),
    sportFocus: sportFocusForObjective(config.objective),
    vo2max: athlete.vo2max ?? null,
    ftp: athlete.ftp ?? null,
    ftpKg,
    pmax5s: athlete.pmax5s ?? null,
    p30sW: athlete.p30s ?? null,
    p60sW: athlete.p60s ?? null,
    map5minW: athlete.map5min ?? null,
    vma: athlete.vma ?? null,
    css: athlete.css ?? null,
    vlamax: athlete.vlamax ?? null,
    vlamaxRun: athlete.vlamaxRun ?? null,
    vlamaxSource: athlete.vlamaxRun != null || athlete.vlamax != null ? "synthetic_estimate" : null,
    vlamaxProtocol: null,
    vlamaxIsReference: false,
    tteObservedMin: isRun ? null : athlete.tte ?? null,
    tteObservedMinRun: isRun ? athlete.tte ?? null : null,
    tteMode: athlete.tte != null ? "synthetic_estimate" : null,
    tss7d: config.recentLoad?.tss7d ?? null,
    fatigueState: null,
    runEconomyScore: athlete.runEconomyScore ?? null,
    runHrDriftPct: null,
    paceThresholdSecPerKm: athlete.paceThresholdSecPerKm ?? null,
    runningPower1s: null,
    runningPower5s: null,
    runningPower30s: null,
    runningPower60s: null,
    runningPower5min: null,
    runningPowerThreshold: null,
    sprint15sDistance: null,
    bikeCadenceRpm: null,
    bikeHrDriftFlag: false,
    protocolQuality: null,
    wprimeKj: null,
    cpDataQuality: null,
    fatmax: null,
    forceDevMode: false,
    giIssuesFlag: false,
    targetRaceDurationMin: null,
  };
}

export function buildPilotFormConfig(config: PlanConfig): PlanFormConfig {
  return {
    objective: config.objective,
    raceName: config.raceName,
    raceDate: config.raceDate,
    raceGoals: config.raceGoals,
    planStartDate: config.planStartDate,
    weeksAvailable: config.weeksAvailable,
    weeklyHours: config.weeklyHours,
    sessionsPerWeek: config.sessionsPerWeek,
    maxSessionsPerDay: config.maxSessionsPerDay,
    strengthSessionsPerWeek: config.strengthSessionsPerWeek,
    deloadCadenceWeeks: config.deloadCadenceWeeks,
    ambition: config.ambition,
    constraints: config.constraints,
    trainingLevel: config.ambitionMeta?.trainingLevel,
    terrainAvailability: config.terrainAvailability,
    crossTrainingMaintenance: config.crossTrainingMaintenance,
    // Bug trouvé lors de la préparation du test 10K→70.3 Tours (audit coach,
    // oct. 2026) : ces deux champs (Correction #E) n'étaient JAMAIS transmis
    // ici. Conséquence concrète — pas seulement théorique : `preparePilotTrainingPlanContext`
    // ci-dessous fait `{...profile.planConfig, ...prepared.planConfig, ...}` ;
    // `prepared.planConfig` (construit à partir de CE `PlanFormConfig`) porte
    // TOUJOURS les clés `loadHistory`/`maxDoubleDaysPerWeek` (même si `undefined`),
    // et un spread écrase une clé présente-mais-undefined — donc la vraie
    // valeur posée sur `profile.planConfig.loadHistory`/`maxDoubleDaysPerWeek`
    // était silencieusement effacée avant d'atteindre `generatePlan`.
    loadHistory: config.loadHistory,
    maxDoubleDaysPerWeek: config.maxDoubleDaysPerWeek,
  };
}

export function preparePilotTrainingPlanContext(profile: QAProfile): PreparedTrainingPlanContext {
  const prepared = prepareTrainingPlanContext({
    diagnosticInput: buildPilotDiagnosticInput(profile),
    athleteData: profile.athleteData,
    formConfig: buildPilotFormConfig(profile.planConfig),
    fcMax: profile.athleteData.fcMax,
  });
  return {
    ...prepared,
    planConfig: {
      ...profile.planConfig,
      ...prepared.planConfig,
      physiologicalTrace: prepared.trace,
    },
  };
}
