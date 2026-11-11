import {isReturnThresholdTenK} from '@/lib/det/roadReturnIntensity';
import {balancedProfileEvidence} from '@/lib/det/balancedProfile';
import {DetDecisionError, incompatible, missingData, type CoachDecision} from '@/lib/det/coachDecision';
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
import { detReleaseVersion } from "@/lib/det/independentVersion";
import { withOrdinaryTimeTrial } from "@/lib/det/ordinaryTimeTrial";
import { isTimeTrial, type TimeTrialDeclaration } from "../../../experimental/det-engine/v410-time-trial-contract";
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
  return detReleaseVersion;
}

export interface DetRunInput {
  recentLongRideMinutes?:number;
  trailGuidanceReview?: import('@/lib/det/trailGuidance').TrailGuidanceReview;
  timeTrial?: TimeTrialDeclaration;
  marathonRecentLongRunMinutes?:number;
  roadReturnThresholdReps?:number;
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
  constructor(public readonly reasons: string[], public readonly decision: CoachDecision = {kind:"engine_limit", fields:[]}) { super(reasons.join("\n")); this.name = "DetRefusal"; }
}

/** Génère un plan DET (même forme `ParsedPlan` que l'IA) depuis l'entrée de la page. */
export async function generateDetPlanFromPageInput(input: DetRunInput): Promise<ParsedPlan> {
  try {
    return await generateForCoach(input);
  } catch (error) {
    if (error instanceof DetRefusal) throw error;
    const message = error instanceof Error ? error.message : String(error);
    const frequency = input.config?.sessionsPerWeek;
    if (error instanceof Error && 'minimumMinutesWithPrimary' in error &&
        Number.isFinite(error.minimumMinutesWithPrimary) && 'week' in error && error.week === 1 &&
        Number.isInteger(frequency) && frequency !== undefined && frequency > 3 && frequency <= 14 &&
        ordinarySourceFamily(input.config.objective)?.sportFocus === 'run') {
      throw new DetRefusal([message], {
        kind: 'engine_limit', fields: [], trialCardioSessionsPerWeek: frequency - 1,
      });
    }
    throw new DetRefusal(message.split("\n").filter(Boolean), error instanceof DetDecisionError ? error.decision : undefined);
  }
}

async function generateForCoach(input: DetRunInput): Promise<ParsedPlan> {
  if (/start.?to.?run/i.test(String(input.config?.objective??'')))
    throw new DetRefusal(['Dans la page de planification TFCLab, choisissez Start to Run puis « Assigner Start-to-Run standard » pour ouvrir le protocole marche-course.'],{kind:'outside_det',fields:[]});
  if(!input.athleteId)throw missingData('Sélectionnez l’athlète à préparer.', 'athleteId');
  if(!input.diagnostic?.athleteId)throw missingData('Sélectionnez le bilan de cet athlète pour l’objectif demandé.', 'diagnostic');
  if (input.diagnostic.athleteId !== input.athleteId ||
      input.config.athleteId && input.config.athleteId !== input.athleteId)
    throw incompatible('Le bilan et le formulaire doivent appartenir au même athlète. Rechargez le profil sélectionné.', 'athleteId', 'diagnostic.athleteId');
  const config = input.timeTrial ? withOrdinaryTimeTrial(input.config,input.athleteId,input.diagnostic.objectif,input.timeTrial) : input.config;
  const objective = String(config.objective ?? "");
  if(isTimeTrial(objective) && (!config.timeTrialContext || config.athleteId!==input.athleteId || config.timeTrialContext.athleteId!==input.athleteId))
    throw missingData('CLM : renseignez la position aéro et la durée d’épreuve de cet athlète.', 'timeTrial');
  if (!detSupportsObjective(objective)) {
    throw new DetRefusal([`DET ne couvre pas encore l’objectif « ${objective} ».`]);
  }
  if (!config.planStartDate) throw missingData("Renseignez la date de début du plan.", "planStartDate");
  const applied = [...((config as { identifiedLimitersRaw?: string[] }).identifiedLimitersRaw ?? [])];
  const coachOverride = explicitCoachLimiterOverride(input.pageLimiterOrder, input.coachPayload ?? null, applied);
  const frozen = await freezeAppPlanningInput({
    athleteId: input.athleteId,
    athlete: input.athlete,
    config,
    planStartDate: config.planStartDate,
    appAutomaticLimiters: rankPrescriptionGaps(appPlanningPriorityGaps(input.diagnostic)).map((g) => g.metric),
    coachOverride,
  });
  const balancedMetrics = applied.length ? undefined : balancedProfileEvidence(input.diagnostic,input.athleteId,input.athlete,config);
  const fatigue=input.diagnostic._rawInput?.fatigueState;
  const returnFatigue=isReturnThresholdTenK(config) && fatigue
    ? ['fatigued','high','injured'].includes(fatigue)?'fatigued' : ['fresh','ok'].includes(fatigue)?'ready':undefined : undefined;
  const plan = await generateAppProfileDetPlan(frozen,input.athleteId,{
    currentFatigue:returnFatigue, roadReturnThresholdReps:input.roadReturnThresholdReps, trailGuidanceReview:input.trailGuidanceReview, recentLongRideMinutes:input.recentLongRideMinutes,trailLongRunLimits:input.trailLongRunLimits, marathonRecentLongRunMinutes:input.marathonRecentLongRunMinutes, balancedMetrics,
  },detEngineVersion());
  return bindAppPlanMetadata(plan, frozen);
}
