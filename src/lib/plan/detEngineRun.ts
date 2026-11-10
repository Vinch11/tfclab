/**
 * Moteur DET déclenché depuis la page « Plan IA » normale.
 *
 * Le coach choisit le moteur (IA ou DET). Les deux reçoivent EXACTEMENT la même
 * entrée : `athleteContext.data` + la config construite par la page
 * (`buildConfigWithCoachOverrides` / formulaire coach), figée une seule fois par
 * `freezeAppPlanningInput`. Aucune donnée n'est recalculée ici, et un refus DET
 * n'est jamais remplacé silencieusement par l'IA.
 */
import type { PlanAthleteData, PlanConfig } from "@/hooks/useAITrainingPlan";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import type { AthleteDiagnostic } from "@/engines/diagnostic";
import { rankPrescriptionGaps } from "@/lib/limiterPrescription";
import { appPlanningPriorityGaps } from "@/lib/plan/dedicatedSportGoal";
import { explicitCoachLimiterOverride, freezeAppPlanningInput } from "@/lib/det/appPlanningInput";
import { generateAppProfileDetPlan } from "@/lib/det/appProfileDetPlan";
import { bindAppPlanMetadata } from "@/lib/plan/generatedPlanMetadata";
import { CHECKED_IN_PLAN_RELEASE_INFO } from "../../../supabase/functions/_shared/planReleaseManifest";
import { ordinarySourceFamily } from "@/lib/det/ordinaryObjective";

export type PlanningEngine = "ai" | "det";
export const PLANNING_ENGINE_STORAGE_KEY = "tfcl_planning_engine";

export function readPlanningEngine(storage: Pick<Storage, "getItem"> | undefined): PlanningEngine {
  try { return storage?.getItem(PLANNING_ENGINE_STORAGE_KEY) === "det" ? "det" : "ai"; } catch { return "ai"; }
}
export function writePlanningEngine(storage: Pick<Storage, "setItem"> | undefined, engine: PlanningEngine): void {
  try { storage?.setItem(PLANNING_ENGINE_STORAGE_KEY, engine); } catch { /* préférence locale uniquement */ }
}

/** Objectifs disponibles dans le parcours de proposition DET du coach. */
export function detSupportsObjective(objective: string): boolean {
  return ordinarySourceFamily(objective) !== null;
}

export function detEngineVersion(): string {
  const v = (CHECKED_IN_PLAN_RELEASE_INFO.components as Record<string, string | undefined>)["det-engine"];
  return v ?? "unknown";
}

export interface DetRunInput {
  trailLongRunLimits?:import('@/lib/det/trailPreparation').TrailLongRunLimits;
  athleteId: string;
  athlete: PlanAthleteData;
  config: PlanConfig;
  diagnostic: AthleteDiagnostic;
  /** Ordre des limiteurs explicitement réglé dans la page (vide si aucun). */
  pageLimiterOrder: readonly string[];
  /** Payload du formulaire coach, si la génération vient de ce formulaire. */
  coachPayload?: { limiterOrder?: string[]; excludedLimiterMetrics?: string[]; overriddenByCoach?: { primary?: boolean; secondary?: boolean } } | null;
}

export class DetRefusal extends Error {
  constructor(public readonly reasons: string[]) { super(reasons.join("\n")); this.name = "DetRefusal"; }
}

/** Génère un plan DET (même forme `ParsedPlan` que l'IA) depuis l'entrée de la page. */
export async function generateDetPlanFromPageInput(input: DetRunInput): Promise<ParsedPlan> {
  const objective = String(input.config.objective ?? "");
  if (!detSupportsObjective(objective)) {
    throw new DetRefusal([`Le moteur DET ne couvre pas encore l'objectif « ${objective} ». Utilisez le moteur IA pour cet objectif.`]);
  }
  if (!input.config.planStartDate) throw new DetRefusal(["Date de début du plan manquante."]);
  const applied = [...((input.config as { identifiedLimitersRaw?: string[] }).identifiedLimitersRaw ?? [])];
  const coachOverride = explicitCoachLimiterOverride(input.pageLimiterOrder, input.coachPayload ?? null, applied);
  const frozen = await freezeAppPlanningInput({
    athleteId: input.athleteId,
    athlete: input.athlete,
    config: input.config,
    planStartDate: input.config.planStartDate,
    appAutomaticLimiters: rankPrescriptionGaps(appPlanningPriorityGaps(input.diagnostic)).map((g) => g.metric),
    coachOverride,
  });
  let plan: ParsedPlan;
  try {
    plan = await generateAppProfileDetPlan(frozen, input.athleteId, {trailLongRunLimits:input.trailLongRunLimits}, detEngineVersion());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new DetRefusal(message.split("\n").filter(Boolean));
  }
  return bindAppPlanMetadata(plan, frozen);
}
