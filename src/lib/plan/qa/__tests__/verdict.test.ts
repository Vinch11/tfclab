import { describe, it, expect } from "vitest";
import { computeVerdict, type QARunRecord } from "../verdict";

/**
 * Priorité 3 (Performance Validation Lab) : vérifie que les critiques de
 * `validatePlan()` (planValidator.ts, branché dans useQARunner.ts) pèsent
 * sur le verdict agrégé — pas seulement les checks B1-B14. Sans ce test,
 * rien ne garantirait que `validatorResult.criticalIssueCount` est
 * réellement lu par `computeVerdict`.
 */
function makeRun(overrides: Partial<QARunRecord> = {}): QARunRecord {
  return {
    ts: Date.now(),
    profileId: "B-10K",
    runIndex: 1,
    totalRuns: 1,
    checks: [],
    durationMs: 1000,
    ...overrides,
  };
}

describe("computeVerdict — intégration planValidator.ts (Priorité 3)", () => {
  it("aucun validatorResult, aucun check critique → verdict vert", () => {
    const { verdict } = computeVerdict([makeRun()], []);
    expect(verdict).toBe("🟢");
  });

  it("validatorResult.criticalIssueCount > 0 → verdict rouge, même sans check B critique", () => {
    const run = makeRun({
      validatorResult: {
        score: 40, grade: "D", criticalIssueCount: 2,
        criticalIssues: [{ rule: "polarization", message: "S3 : non polarisée" }],
      },
    });
    const { verdict, summary } = computeVerdict([run], []);
    expect(verdict).toBe("🔴");
    expect(summary).toMatch(/2 critical/);
  });

  it("validatorResult présent mais criticalIssueCount=0 → n'affecte pas le verdict", () => {
    const run = makeRun({
      validatorResult: { score: 95, grade: "A", criticalIssueCount: 0, criticalIssues: [] },
    });
    const { verdict } = computeVerdict([run], []);
    expect(verdict).toBe("🟢");
  });

  it("critiques B-check ET validatorResult cumulés dans le même compteur (pas de double logique séparée)", () => {
    const run = makeRun({
      checks: [{ id: "B5", label: "Catalogue", level: "critical", pass: false, details: ["id invalide"] }],
      validatorResult: { score: 50, grade: "C", criticalIssueCount: 1, criticalIssues: [{ rule: "race_day", message: "Jour J absent" }] },
    });
    const { summary } = computeVerdict([run], []);
    expect(summary).toMatch(/2 critical/); // 1 (B5) + 1 (validatePlan)
  });
});
