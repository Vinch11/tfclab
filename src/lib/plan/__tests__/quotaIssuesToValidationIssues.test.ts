import { describe, it, expect } from "vitest";
import { quotaIssuesToValidationIssues, type QuotaIssue } from "../validateWeeklyQuotas";

/**
 * Finalisation PR #383 ("preserve-repair-intent") — Correction 2 : garantir
 * qu'une violation critique de plancher hebdo (`quota_floor_violation` —
 * notamment celle laissée par un `sl_upgrade_unresolved`/`insert_unresolved`/
 * `rest_floor_breached` côté réconciliateur serveur, quand aucun candidat de
 * remplacement n'a pu être trouvé) est effectivement reprise dans le contrôle
 * bloquant à la sauvegarde (`handleSaveToPlan`), au lieu de ne rester visible
 * que dans le bandeau informatif de génération. Avant ce correctif,
 * `validateWeeklyQuotas` n'était jamais branché sur ce contrôle — un plan
 * portant une incompatibilité critique persistante pouvait être sauvegardé
 * sans la moindre confirmation.
 */
describe("quotaIssuesToValidationIssues", () => {
  it("conserve les violations critiques (quota_floor_violation) et les reformate au format ValidationIssue", () => {
    const issues: QuotaIssue[] = [
      {
        severity: "critical", code: "quota_floor_violation", weekNumber: 6,
        reason: "pas de SL CAP (≥90min) en semaine load",
        expected: "1 run ≥90min", observed: "aucun",
      },
    ];
    const out = quotaIssuesToValidationIssues(issues);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      rule: "quota_floor_violation",
      severity: "error",
      week: 6,
      message: "pas de SL CAP (≥90min) en semaine load",
    });
    expect(out[0].detail).toContain("1 run ≥90min");
    expect(out[0].detail).toContain("aucun");
  });

  it("exclut les avertissements (quota_range_drift, layout_drift) — pas de double alerte avec le bandeau de génération", () => {
    const issues: QuotaIssue[] = [
      { severity: "warning", code: "quota_range_drift", weekNumber: 3, reason: "total hors fourchette" },
      { severity: "warning", code: "layout_drift", weekNumber: 3, reason: "mardi: attendu bike, observé run" },
    ];
    expect(quotaIssuesToValidationIssues(issues)).toEqual([]);
  });

  it("ne construit pas de detail quand expected/observed sont absents", () => {
    const issues: QuotaIssue[] = [
      { severity: "critical", code: "quota_floor_violation", weekNumber: 1, reason: "raison brute sans expected/observed" },
    ];
    const out = quotaIssuesToValidationIssues(issues);
    expect(out[0].detail).toBeUndefined();
  });

  it("conserve plusieurs anomalies critiques distinctes (pas de dédoublonnage artificiel) et préserve leur semaine respective", () => {
    const issues: QuotaIssue[] = [
      { severity: "critical", code: "quota_floor_violation", weekNumber: 4, reason: "jours repos complet insuffisants (0 < 1)" },
      { severity: "critical", code: "quota_floor_violation", weekNumber: 9, reason: "pas de SL vélo (≥180min) ni brick long" },
    ];
    const out = quotaIssuesToValidationIssues(issues);
    expect(out.map(i => i.week)).toEqual([4, 9]);
    expect(out.every(i => i.severity === "error")).toBe(true);
  });

  it("liste vide → liste vide (plan sans anomalie persistante, rien à bloquer)", () => {
    expect(quotaIssuesToValidationIssues([])).toEqual([]);
  });
});
