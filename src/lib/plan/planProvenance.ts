/**
 * Provenance d'un plan sauvegardé (`plan_json._provenance`), sérialisable
 * (aucun callback). Lecture stricte : toute forme inconnue ou absente donne
 * « moteur non renseigné » — on n'invente jamais un moteur pour un ancien plan.
 */

export const PLAN_PROVENANCE_SCHEMA = "tfcl.plan-provenance.v1" as const;
export const UNKNOWN_ENGINE_LABEL = "moteur non renseigné";

export interface DetPlanProvenance {
  schema: typeof PLAN_PROVENANCE_SCHEMA;
  engine: "det";
  /** Empreinte des sources DET réellement embarquées (déclaration non attestée). */
  engineVersion: string;
  releaseId: string | null;
  mode: "synthetic-lab";
  scenarioId: string;
  /** Entrées et réglages exacts du scénario (copie JSON, pas de fonction). */
  scenarioInput: Record<string, unknown>;
  syntheticFixture: true;
  /** Les approbations de la fixture ne sont jamais appliquées au profil réel. */
  fixtureApprovalsAppliedToAthlete: false;
  prescriptionAllowed: false;
  sportingAttestation: false;
  generatedAt: string;
  result: { status: "candidate"; constraintsSatisfied: boolean; nodes: number };
}

/** Plan DET généré à partir des entrées saisies/confirmées par le coach (QA). */
export interface DetCoachInputsProvenance {
  schema: typeof PLAN_PROVENANCE_SCHEMA;
  engine: "det";
  engineVersion: string;
  releaseId: string | null;
  mode: "coach-inputs";
  /** Ligne de revue (append-only) utilisée, et empreintes qui la lient. */
  reviewContextId: string;
  inputsHash: string;
  sourcesVersion: string;
  /** Copie JSON des entrées coach (ancres avec provenance mesure/estimation). */
  coachInputs: Record<string, unknown>;
  qualifiedSourceIds: string[];
  admittedSourceIds: string[];
  /** Ordre des limiteurs : automatique ou priorité confirmée par le coach, et ordre transmis au solveur. */
  limiterOrder?: { mode: "automatic" | "coach"; source?: "app_planning_pipeline" | "manual_coach_inputs"; unrecognizedByDet?: string[]; semantics?: unknown; automatic: string[]; coachConfirmed: string[] | null; applied: string[] };
  /** Entrée de planification : profil de l'app partagé avec l'IA (empreinte) ou saisie QA manuelle. */
  planningInput?: { source: "app_planning_pipeline"; fingerprint: string } | { source: "manual_coach_inputs"; fingerprint: null };
  /** Famille canonique DET réellement exécutée (absent sur les anciennes versions ⇒ marathon historique). */
  family?: "marathon" | "semi_marathon" | "triathlon_703" | "triathlon_ironman";
  brickApprovals?: Array<{ id: string; transitionSeconds: number }>;
  syntheticFixture: false;
  /** Une qualification de source n'est jamais une approbation sportive du plan. */
  sourceQualificationIsNotPlanApproval: true;
  prescriptionAllowed: false;
  sportingAttestation: false;
  generatedAt: string;
  result: { status: "candidate"; constraintsSatisfied: boolean; nodes: number };
}

export function isDetCoachInputsProvenance(v: unknown): v is DetCoachInputsProvenance {
  if (!isObj(v)) return false;
  const hex = (x: unknown) => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
  return v.schema === PLAN_PROVENANCE_SCHEMA && v.engine === "det" && v.mode === "coach-inputs"
    && hex(v.engineVersion) && hex(v.inputsHash) && hex(v.sourcesVersion)
    && typeof v.reviewContextId === "string" && v.reviewContextId.length > 0
    && isObj(v.coachInputs) && Array.isArray(v.qualifiedSourceIds) && Array.isArray(v.admittedSourceIds)
    && (v.limiterOrder === undefined || isLimiterOrder(v.limiterOrder))
    && (v.family === undefined || ["marathon", "semi_marathon", "triathlon_703", "triathlon_ironman"].includes(v.family as string))
    && (v.brickApprovals === undefined || (Array.isArray(v.brickApprovals) && (v.brickApprovals as unknown[]).every((b) => !!b && typeof (b as { id?: unknown }).id === "string" && Number.isInteger((b as { transitionSeconds?: unknown }).transitionSeconds))))
    && v.syntheticFixture === false && v.sourceQualificationIsNotPlanApproval === true
    && v.prescriptionAllowed === false && v.sportingAttestation === false
    && typeof v.generatedAt === "string" && isObj(v.result);
}

function isLimiterOrder(v: unknown): boolean {
  if (!isObj(v)) return false;
  const strs = (x: unknown) => Array.isArray(x) && x.every((y) => typeof y === "string");
  return (v.mode === "automatic" ? v.coachConfirmed === null : v.mode === "coach" && strs(v.coachConfirmed))
    && strs(v.automatic) && strs(v.applied);
}

/** Texte lisible de l'ordre des limiteurs (viewer, PDF, trace). */
export function describeLimiterOrder(o: DetCoachInputsProvenance["limiterOrder"]): string {
  if (!o) return "ordre des limiteurs non renseigné";
  return o.mode === "coach"
    ? `priorité coach : ${o.applied.join(" > ") || "aucun limiteur"} (automatique : ${o.automatic.join(" > ") || "aucun"})`
    : `ordre automatique : ${o.applied.join(" > ") || "aucun limiteur"}`;
}

export interface ProvenanceView {
  engine: "det" | "ai" | "unknown";
  label: string;
  detail: string | null;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function isDetPlanProvenance(v: unknown): v is DetPlanProvenance {
  if (!isObj(v)) return false;
  return v.schema === PLAN_PROVENANCE_SCHEMA && v.engine === "det"
    && typeof v.engineVersion === "string" && /^[a-f0-9]{64}$/.test(v.engineVersion)
    && v.mode === "synthetic-lab" && typeof v.scenarioId === "string" && v.scenarioId.length > 0
    && isObj(v.scenarioInput) && v.syntheticFixture === true
    && v.fixtureApprovalsAppliedToAthlete === false && v.prescriptionAllowed === false
    && v.sportingAttestation === false && typeof v.generatedAt === "string" && isObj(v.result);
}

/** Lecture affichable ; jamais d'inférence depuis le titre, le contenu ou la date. */
export function readPlanProvenance(planJson: unknown): ProvenanceView {
  const p = isObj(planJson) ? planJson._provenance : undefined;
  if (isDetPlanProvenance(p)) {
    return {
      engine: "det",
      label: "DET Engine (laboratoire synthétique QA)",
      detail: `version ${p.engineVersion.slice(0, 12)} · scénario ${p.scenarioId} · NON PRESCRIPTIF`,
    };
  }
  if (isDetCoachInputsProvenance(p)) {
    return {
      engine: "det",
      label: "DET Engine (entrées coach, QA)",
      detail: `version ${p.engineVersion.slice(0, 12)} · entrées ${p.inputsHash.slice(0, 12)} · ${p.qualifiedSourceIds.length} source(s) qualifiée(s) · ${describeLimiterOrder(p.limiterOrder)} · NON PRESCRIPTIF`,
    };
  }
  if (isObj(p) && p.schema === PLAN_PROVENANCE_SCHEMA && p.engine === "ai") {
    return { engine: "ai", label: "IA", detail: typeof p.engineVersion === "string" ? `version ${p.engineVersion.slice(0, 12)}` : null };
  }
  return { engine: "unknown", label: UNKNOWN_ENGINE_LABEL, detail: null };
}
