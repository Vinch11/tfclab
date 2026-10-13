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

/** Lecture seule — ne modifie jamais le plan reçu. */
export function computeFinalValidationIssues(plan: FinalValidationPlanLike): FinalValidationSummary {
  const critical = checkB13ToValidationIssues(checkB13(plan));
  const warnings = checkB14ToValidationIssues(checkB14(plan));
  const issues: FinalValidationIssue[] = [...critical, ...warnings];
  return { issues, hasCritical: critical.length > 0 };
}
