/**
 * Adaptateur « contexte d'app → DET » : DET consomme EXACTEMENT l'entrée de
 * planification déjà construite par la page normale pour l'IA
 * (`athleteContext.data` + `buildConfigWithCoachOverrides(athleteContext.diagnostic)`),
 * figée une seule fois et partagée par les deux moteurs.
 *
 * Ce module ne recalcule RIEN : pas de computeDiagnostic, pas de
 * prepareTrainingPlanContext, pas de DiagnosticInput partiel. Il clone,
 * gèle, prend une empreinte et trace l'origine des limiteurs.
 */
import type { PlanAthleteData, PlanConfig } from "@/hooks/useAITrainingPlan";

/** Champs propres à un moteur (format de sortie), exclus de l'empreinte sémantique. */
export const ENGINE_SPECIFIC_CONFIG_KEYS = ["_outputFormat"] as const;

export type LimiterOrigin = "app_automatic" | "coach_override" | "explicit_coach_programme_target";

export interface AppLimiterTrace {
  /** Ordre automatique du diagnostic de l'app (gapAnalysis classé), tel qu'affiché. */
  appAutomatic: string[];
  /** Ordre explicitement choisi par le coach dans la page (null si aucun). */
  coachOverride: string[] | null;
  /** Ordre réellement présent dans la config partagée (`identifiedLimitersRaw`). */
  applied: string[];
  origin: LimiterOrigin;
}

export interface FrozenAppPlanningInput {
  readonly source: "app_planning_pipeline";
  readonly athleteId: string;
  readonly athlete: Readonly<PlanAthleteData>;
  readonly config: Readonly<PlanConfig>;
  readonly limiters: Readonly<AppLimiterTrace>;
  /** SHA-256 hex de la donnée sémantique (athlète + config hors champs moteur). */
  readonly fingerprint: string;
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === "object" && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as Record<string, unknown>)) deepFreeze(v);
  }
  return o;
}

function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) {
      const x = (v as Record<string, unknown>)[k];
      if (x !== undefined) out[k] = canonical(x);
    }
    return out;
  }
  return v;
}

export function semanticPlanningPayload(athlete: PlanAthleteData, config: PlanConfig): unknown {
  const c = { ...(config as unknown as Record<string, unknown>) };
  for (const k of ENGINE_SPECIFIC_CONFIG_KEYS) delete c[k];
  return canonical({ athlete, config: c });
}

export async function planningFingerprint(athlete: PlanAthleteData, config: PlanConfig): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(semanticPlanningPayload(athlete, config)));
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Ordre des limiteurs explicitement choisi par le coach, ou null. Seuls comptent
 * l'ordre réglé dans la page et, dans le formulaire coach, un ordre / une exclusion
 * / un primaire-secondaire explicitement marqués — pas n'importe quel payload
 * (interdictions, S2R… ne sont pas une priorité de limiteurs).
 */
export function explicitCoachLimiterOverride(
  pageOrder: readonly string[], payload: { limiterOrder?: string[]; excludedLimiterMetrics?: string[]; overriddenByCoach?: { primary?: boolean; secondary?: boolean } } | null,
  applied: readonly string[],
): string[] | null {
  // The shared config has already resolved precedence between page controls
  // and the coach form. Record that effective choice, never an older control.
  if (pageOrder.length) return [...applied];
  if (!payload) return null;
  const explicit = payload.limiterOrder !== undefined || (payload.excludedLimiterMetrics?.length ?? 0) > 0
    || payload.overriddenByCoach?.primary === true || payload.overriddenByCoach?.secondary === true;
  return explicit ? [...applied] : null;
}

export class PlanningInputError extends Error {}

export async function freezeAppPlanningInput(input: {
  athleteId: string; athlete: PlanAthleteData; config: PlanConfig;
  appAutomaticLimiters: string[]; coachOverride: string[] | null;
  /** Date de début du formulaire : intégrée AVANT l'empreinte (jamais ajoutée après). */
  planStartDate: string;
}): Promise<FrozenAppPlanningInput> {
  const athlete = structuredClone(input.athlete);
  const config = structuredClone(input.config) as PlanConfig & { planStartDate?: string };
  if (config.planStartDate && config.planStartDate !== input.planStartDate)
    throw new PlanningInputError(`date de début incohérente : config ${config.planStartDate} ≠ formulaire ${input.planStartDate}`);
  config.planStartDate = input.planStartDate;
  const applied = [...((config as { identifiedLimitersRaw?: string[] }).identifiedLimitersRaw ?? [])];
  if (input.coachOverride !== null && JSON.stringify(input.coachOverride) !== JSON.stringify(applied))
    throw new PlanningInputError("ordre des limiteurs coach différent de la config partagée");
  const limiters: AppLimiterTrace = {
    appAutomatic: [...input.appAutomaticLimiters],
    coachOverride: input.coachOverride !== null ? [...input.coachOverride] : null,
    applied,
    origin: input.coachOverride !== null ? "coach_override" : config.planningGoalContext ? "explicit_coach_programme_target" : "app_automatic",
  };
  const fingerprint = await planningFingerprint(athlete, config);
  return deepFreeze({ source: "app_planning_pipeline", athleteId: input.athleteId, athlete, config, limiters, fingerprint });
}

/** Copie mutable pour un moteur ; seuls des champs moteur peuvent être ajoutés. */
export function planningInputFor(f: FrozenAppPlanningInput, engine: "ai" | "det"):
  { athlete: PlanAthleteData; config: PlanConfig & { planStartDate: string } } {
  const athlete = structuredClone(f.athlete) as PlanAthleteData;
  const config = structuredClone(f.config) as PlanConfig & { planStartDate: string };
  if (engine === "det") (config as unknown as Record<string, unknown>)._outputFormat = "json";
  return { athlete, config };
}

/**
 * Cohérence des ancres revues (snapshot DET) avec le profil de l'app.
 * Aucune substitution : une divergence est un refus explicite.
 */
export function anchorMismatches(f: FrozenAppPlanningInput, anchors: Record<string, { value?: unknown } | undefined>): string[] {
  const a = f.athlete as PlanAthleteData & Record<string, unknown>;
  const pairs: Array<[string, unknown, unknown, string]> = [
    ["runThresholdPaceSecPerKm", anchors.runThresholdPaceSecPerKm?.value, a.paceThresholdSecPerKm, "allure seuil"],
    ["bikeFtpWatts", anchors.bikeFtpWatts?.value, a.ftp, "FTP"],
    ["cssSecPer100m", anchors.cssSecPer100m?.value, a.css, "CSS"],
  ];
  const out: string[] = [];
  for (const [, revue, app, label] of pairs) {
    if (typeof revue === "number" && typeof app === "number" && Math.abs(revue - app) > 1e-9)
      out.push(`${label} vérifiée (${revue}) différente du profil de l'app (${app}) : rien n'est remplacé, rechargez la fiche`);
  }
  const v = anchors.runVvo2SpeedMps?.value;
  if (typeof v === "number" && typeof a.vma === "number" && Math.abs(v * 3.6 - a.vma) > 1e-6)
    out.push(`VMA vérifiée (${(v * 3.6).toFixed(2)} km/h) différente du profil de l'app (${a.vma} km/h)`);
  return out;
}
