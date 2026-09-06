import { describe, it, expect } from "vitest";
import { checkPacingRulesParity } from "../pacingRulesParityCheck";
import type { DisciplineRulesResult, DisciplineRule } from "../pacingDisciplineRules";

/**
 * Bug réel (audit "simulation course/nutrition") : `snapshotSurface("staff_report", ...)`
 * n'inclut PAR CONCEPTION que nonNegotiables + tacticals (les prohibitions
 * en sont exclues, exclusion documentée par le message "category_dropped").
 * Mais la vérification "toute règle critique de l'UI interactive doit être
 * dans le rapport staff" ne l'excluait pas — et `generateDisciplineRules()`
 * pousse TOUJOURS une règle `drift_prohibition` en priorité critique
 * (category "prohibition"), donc ce contrôle levait une alerte "critique"
 * à CHAQUE simulation, même quand rien n'est réellement manquant.
 */

function rule(overrides: Partial<DisciplineRule> & Pick<DisciplineRule, "id" | "category" | "priority">): DisciplineRule {
  return {
    title: "Règle test",
    message: "Message test",
    icon: "⚠️",
    ...overrides,
  };
}

function makeResult(overrides: Partial<DisciplineRulesResult> = {}): DisciplineRulesResult {
  const nonNegotiables = [rule({ id: "nn1", category: "non_negotiable", priority: "critical" })];
  const tacticals = [rule({ id: "tac1", category: "tactical", priority: "normal" })];
  const prohibitions = [rule({ id: "drift_prohibition", category: "prohibition", priority: "critical" })];
  const coachPhrases: DisciplineRule[] = [];
  return {
    rules: [...nonNegotiables, ...tacticals, ...prohibitions, ...coachPhrases],
    nonNegotiables,
    coachPhrases,
    prohibitions,
    tacticals,
    showSensitiveBadge: false,
    sensitiveMessage: null,
    primaryMessage: "test",
    ruleCount: nonNegotiables.length + tacticals.length + prohibitions.length,
    ...overrides,
  };
}

describe("checkPacingRulesParity — une règle critique de catégorie 'prohibition' n'est plus un faux positif", () => {
  it("passed=true quand la seule règle critique manquante du rapport staff est une prohibition (exclusion par design)", () => {
    const result = checkPacingRulesParity(makeResult());
    const criticalStaffIssues = result.issues.filter(
      (i) => i.severity === "critical" && i.surface === "staff_report" && i.code === "rule_missing_in_export",
    );
    expect(criticalStaffIssues).toHaveLength(0);
    expect(result.passed).toBe(true);
  });

  it("une éventuelle règle 'coach_phrase' critique (catégorie aussi exclue par design de staff_report) ne déclenche pas non plus de faux positif", () => {
    const coachPhrases = [rule({ id: "cp_critical", category: "coach_phrase", priority: "critical" })];
    const result = checkPacingRulesParity(makeResult({ coachPhrases, rules: [
      ...makeResult().nonNegotiables, ...makeResult().tacticals, ...makeResult().prohibitions, ...coachPhrases,
    ] }));
    const criticalStaffIssues = result.issues.filter(
      (i) => i.severity === "critical" && i.surface === "staff_report" && i.code === "rule_missing_in_export",
    );
    expect(criticalStaffIssues).toHaveLength(0);
  });
});
