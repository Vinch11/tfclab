/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * B13 — Validation finale post-mutations : invariants CRITIQUES
 * ═══════════════════════════════════════════════════════════════════════════════
 * Audit scientifique P0 — F12 (AUDIT_SCIENTIFIQUE_P0.md / AUDIT_SCIENTIFIQUE_P0_PLAN.md).
 *
 * `planReconciler.ts::runReconciler()` établit deux invariants de sécurité
 * via des filets dédiés (`dedupeWithinWeek`, `dedupeFastedWithinWeek`) —
 * mais plusieurs mutations tournent ENCORE APRÈS ces filets
 * (`fixEarlyConsolidationSessions`, le trio Start-to-Run,
 * `enforceTaperWeeks`, `ensureRaceDaySession`, `alignPostBikeRunClaims`,
 * `enforceAthleteConstraints`), sans qu'aucune revalidation ne tourne après
 * elles.
 *
 * B13 revalide ces deux invariants SUR LE PLAN FINAL (après TOUTES les
 * mutations) :
 *   1. Aucun `catalogId` dupliqué dans une même semaine.
 *   2. Aucune semaine avec 2+ séances "à jeun" (Train Low/Sleep Low/Fasted).
 *
 * Niveau CRITIQUE (contrairement à B14, qui couvre la cohérence phase/fiche
 * — un problème de classement, pas de sécurité d'entraînement) : un doublon
 * de catalogId ou un cumul "à jeun" non détecté expose l'athlète à une
 * répétition non voulue ou à un risque métabolique (hypoglycémie/déplétion
 * répétée) que le coach n'a pas validé consciemment.
 *
 * Volontairement en LECTURE SEULE — ce check ne corrige rien (demande
 * explicite du coach : "ne pas modifier automatiquement les séances à cette
 * étape"). Accepte `MergedPlan` (chemin JSON complet) ET `ParsedPlan`
 * (chemin de régénération ciblée d'une semaine) par typage structurel — les
 * deux exposent les champs nécessaires (`weekNumber`, `phase`, `sessions[].
 * {title, details, isRest, catalogId}`), cf. `FinalValidationPlanLike`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { CheckResult } from "./checks";

/** Structure minimale partagée par `MergedPlan` ET `ParsedPlan` — permet de
 *  réutiliser ces checks sur les deux pipelines réels (génération complète
 *  et régénération d'une seule semaine) sans conversion ni duplication. */
export interface FinalValidationSessionLike {
  title: string;
  details: string;
  isRest: boolean;
  catalogId?: string | null;
  custom?: boolean;
  dayName?: string;
}
export interface FinalValidationWeekLike {
  weekNumber: number;
  phase: string;
  sessions: FinalValidationSessionLike[];
}
export interface FinalValidationPlanLike {
  weeks: FinalValidationWeekLike[];
}

// Mirror volontaire de FASTED_SESSION_PATTERN (planReconciler.ts) et du bloc
// (c2) serveur (jsonPlanHandler.ts) — même stratégie physiologique (glycogène
// bas) sous des noms différents. Dupliqué ici car `checks.ts` ne peut pas
// dépendre de l'intérieur du réconciliateur (couches séparées) ; cf. les
// deux autres occurrences déjà présentes dans le code pour la même raison.
const FASTED_SESSION_PATTERN = /\bjeun\b|fasted|sleep[\s_-]*low|train[\s_-]*low/i;

function sessionIsFastedPattern(s: FinalValidationSessionLike): boolean {
  return FASTED_SESSION_PATTERN.test(`${s.title ?? ""} ${s.details ?? ""}`);
}

export function checkB13(plan: FinalValidationPlanLike): CheckResult {
  const LABEL = "Dédoublonnage et plafond \"à jeun\" post-mutations";
  const details: string[] = [];
  let pass = true;

  for (const week of plan.weeks) {
    const sessions = week.sessions.filter((s) => !s.isRest);

    // 1) Doublon de catalogId dans la semaine.
    const seenIds = new Map<string, number>();
    for (const s of sessions) {
      if (s.custom || !s.catalogId) continue;
      const id = s.catalogId.toUpperCase();
      seenIds.set(id, (seenIds.get(id) ?? 0) + 1);
    }
    for (const [id, count] of seenIds) {
      if (count > 1) {
        pass = false;
        details.push(
          `S${week.weekNumber} : catalogId "${id}" utilisé ${count}× dans la même semaine (post-mutations) — dédoublonnage défait après coup.`,
        );
      }
    }

    // 2) Cumul "à jeun".
    const fastedCount = sessions.filter((s) => sessionIsFastedPattern(s)).length;
    if (fastedCount >= 2) {
      pass = false;
      details.push(
        `S${week.weekNumber} : ${fastedCount} séances "à jeun" dans la même semaine (post-mutations) — plafond 1×/semaine défait après coup.`,
      );
    }
  }

  if (pass) details.push("Aucun doublon de catalogId ni cumul \"à jeun\" post-mutations.");

  return { id: "B13", label: LABEL, level: "critical", pass, details };
}

/** Convertit les lignes d'échec de B13 en `ValidationIssue[]` (sévérité
 *  "error" — critique) pour affichage coach, même convention que
 *  `checkB12ToValidationIssues`. */
export function checkB13ToValidationIssues(result: CheckResult): Array<{
  rule: string; severity: "error"; message: string; detail?: string;
}> {
  if (result.pass) return [];
  return result.details
    .filter((d) => d.startsWith("S") && /:/.test(d))
    .map((d) => ({
      rule: "final_validation_critical",
      severity: "error" as const,
      message: d,
      detail: "Incohérence réintroduite par une mutation du réconciliateur après le dernier filet de dédoublonnage — aucune correction automatique, à vérifier manuellement.",
    }));
}
