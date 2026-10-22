/**
 * Audit scientifique P0 — F12. Point d'entrée UNIQUE pour brancher B13/B14
 * (validation finale post-mutations) sur un pipeline de génération RÉEL
 * (pas seulement le harnais QA synthétique) — utilisé à la fois par la
 * génération complète/fenêtrée (`useAITrainingPlan.ts`) et la régénération
 * d'une seule semaine (`AITrainingPlanPage.tsx::handleRegenerateWeek`).
 *
 * `FinalValidationPlanLike` (défini dans checkB13.ts) est satisfait aussi
 * bien par `MergedPlan` (chemin JSON complet) que par `ParsedPlan` (après
 * remplacement d'une semaine régénérée) — aucune conversion nécessaire.
 */
import { checkB13, checkB13ToValidationIssues, type FinalValidationPlanLike } from "./checkB13";
import { checkB14, checkB14ToValidationIssues } from "./checkB14";
import { checkB15, checkB15ToValidationIssues, type AmbitionPhysiologyInput } from "./checkB15";

export interface FinalValidationIssue {
  rule: string;
  severity: "error" | "warning";
  message: string;
  detail?: string;
}

export interface FinalValidationSummary {
  issues: FinalValidationIssue[];
  hasCritical: boolean;
}

const STRUCTURALLY_REVALIDATED_REPAIR_CODES = new Set([
  "phase_unresolved",
  "duplicate_catalog_id_unresolved",
  "week_duplicate_unresolved",
  "fasted_session_cap_unresolved",
  "week_fasted_cap_unresolved",
]);

const CRITICAL_REPAIR_CODES = new Set([
  "sl_upgrade_unresolved",
  "lcw_signature_unresolved",
  "daily_floor_unresolved",
  "offsport_unresolved",
  "demanding_accumulation_unresolved",
  "constraint_day_unresolved",
  "catalog_id_no_safe_neighbor",
]);

const REPAIR_CODE_PATTERN = new RegExp(
  `\\b(${[
    "phase_unresolved",
    "duration_unresolved",
    "sl_upgrade_unresolved",
    "duplicate_catalog_id_unresolved",
    "week_duplicate_unresolved",
    "fasted_session_cap_unresolved",
    "week_fasted_cap_unresolved",
    "lcw_signature_unresolved",
    "reconcile_conflict",
    "catalog_id_no_safe_neighbor",
    "daily_floor_unresolved",
    "offsport_unresolved",
    "demanding_accumulation_unresolved",
    "constraint_day_unresolved",
  ].join("|")})\\b`,
);

function repairLocation(trace: string): string {
  const match = /\b[WS](\d+)(?:\/|\s+)([\p{L}-]+)?/iu.exec(trace);
  return match ? `${match[1]}:${(match[2] ?? "").toLowerCase()}` : "";
}

function resolvedLater(code: string, trace: string, laterTraces: readonly string[]): boolean {
  const successByCode: Record<string, RegExp> = {
    duration_unresolved: /\bid_substituted_duration\b/,
    reconcile_conflict: /\b(?:id_substituted_duration|discipline_substituted|quota_floor_inserted_from_catalog)\b/,
    sl_upgrade_unresolved: /\bsl_upgraded\b/,
    lcw_signature_unresolved: /\blcw_signature_enforced\b/,
    catalog_id_no_safe_neighbor: /\bcatalog_id_substituted\b/,
    daily_floor_unresolved: /\bdaily_floor_enforced\b/,
    offsport_unresolved: /\bsubstituted_offsport\b/,
    demanding_accumulation_unresolved: /\bdemanding_accumulation_downgraded\b/,
    constraint_day_unresolved: /\bconstraint_day_moved\b/,
  };
  const success = successByCode[code];
  if (!success) return false;
  const location = repairLocation(trace);
  return laterTraces.some(candidate => success.test(candidate) && (!location || repairLocation(candidate) === location));
}

/** Convertit les anomalies des deux réparateurs en issues du validateur final. */
export function repairTracesToValidationIssues(traces: readonly string[] | undefined): FinalValidationIssue[] {
  const issues: FinalValidationIssue[] = [];
  const seen = new Set<string>();
  const source = traces ?? [];
  for (let index = 0; index < source.length; index++) {
    const trace = source[index];
    const code = REPAIR_CODE_PATTERN.exec(trace)?.[1];
    if (!code || STRUCTURALLY_REVALIDATED_REPAIR_CODES.has(code)) continue;
    if (resolvedLater(code, trace, source.slice(index + 1))) continue;

    const explicitCritical = /^\[critical\]/i.test(trace);
    const reconcileCritical = code === "reconcile_conflict" && /discipline|floor|plancher|constraint|contrainte/i.test(trace);
    const severity: FinalValidationIssue["severity"] = explicitCritical || CRITICAL_REPAIR_CODES.has(code) || reconcileCritical
      ? "error"
      : "warning";
    const message = trace.replace(/^\[(?:reconciler|critical|warning|error|info)\]\s*/i, "").trim();
    const location = repairLocation(trace);
    const key = `${code}|${location || message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push({
      rule: code,
      severity,
      message,
      detail: "Réparation déterministe laissée non résolue : la séance ou la contrainte doit être vérifiée avant de considérer le plan comme conforme.",
    });
  }
  return issues;
}

/** Lecture seule — ne modifie jamais le plan reçu.
 *
 * `ambitionPhysiology` (Correction sprint qualité M/IM, oct. 2026, #4) est
 * optionnel : omis, B15 est simplement sauté (comportement inchangé pour
 * tout appelant qui ne le fournit pas encore) — fourni, il rebranche le
 * contrôle ambition↔physiologie (déjà calculé en pré-génération dans
 * GapAmbitionPanel) sur ce point d'entrée unique post-mutations, pour qu'il
 * atteigne le coach à chaque génération réelle, pas seulement s'il a
 * consulté le panneau. */
export function computeFinalValidationIssues(
  plan: FinalValidationPlanLike,
  repairTraces?: readonly string[],
  ambitionPhysiology?: AmbitionPhysiologyInput | null,
): FinalValidationSummary {
  const critical = checkB13ToValidationIssues(checkB13(plan));
  const warnings = checkB14ToValidationIssues(checkB14(plan));
  const repairIssues = repairTracesToValidationIssues(repairTraces);
  const ambitionGapIssues = ambitionPhysiology
    ? checkB15ToValidationIssues(checkB15(ambitionPhysiology))
    : [];
  const issues: FinalValidationIssue[] = [...critical, ...warnings, ...repairIssues, ...ambitionGapIssues];
  return { issues, hasCritical: issues.some(issue => issue.severity === "error") };
}
