import { describe, expect, it } from "vitest";
import { summarizePlanQuotas } from "../../../../scripts/summarize-plan-quotas.mjs";

describe("ventilation offline : conserver les observations distinctes", () => {
  it("un libellé commun ne déduplique ni semaines, ni règles, ni sources ; les répétitions exactes restent comptées", () => {
    const issue = { weekNumber: 1, code: "quota_range_drift", severity: "warning", reason: "bike hors fourchette", expected: "2", observed: "3" };
    const input = { quotaSources: [{ source: "display", issues: [issue, { ...issue }, { ...issue, code: "layout_drift" }, { ...issue, weekNumber: 2 }] },
      { source: "server", issues: [issue] }] };
    const before = structuredClone(input);
    const result = summarizePlanQuotas(input);
    expect(result.total).toBe(5);
    expect(result.byWeek).toEqual({ 1: 4, 2: 1 });
    expect(result.bySource).toEqual({ display: 4, server: 1 });
    expect(result.byType).toEqual({ quota_range_drift: 4, layout_drift: 1 });
    expect(result.potentialExactDuplicates).toEqual([[{ source: "display", ordinal: 0 }, { source: "display", ordinal: 1 }]]);
    expect(input).toEqual(before);
  });
  it("ne fabrique pas une liste de 112 à partir du compteur seul", () => {
    expect(() => summarizePlanQuotas({ quotaCount: 112 })).toThrow("Liste complète absente");
  });
  it("des identifiants de diagnostics différents restent des observations distinctes même à libellé identique", () => {
    const issue = { weekNumber: 1, code: "quota_range_drift", reason: "bike hors fourchette" };
    const result = summarizePlanQuotas({ weeklyQuotaIssues: [{ ...issue, diagnosticId: "A" }, { ...issue, diagnosticId: "B" }] });
    expect(result.total).toBe(2);
    expect(result.potentialExactDuplicates).toEqual([]);
  });

  it("attribue les SL aux disciplines et compte un écart combiné comme une seule observation", () => {
    const result = summarizePlanQuotas({ weeklyQuotaIssues: [
      { reason: "pas de SL vélo (≥120min)", code: "quota_floor_violation", weekNumber: 1 },
      { reason: "pas de SL CAP (≥90min)", code: "quota_floor_violation", weekNumber: 1 },
      { reason: "mardi: attendu bike+swim", expected: "bike+swim", observed: "bike", code: "layout_drift", weekNumber: 1 },
    ] });
    expect(result.total).toBe(3);
    expect(result.byDiscipline).toEqual({ "bike (libellé)": 1, "run (libellé)": 1, "bike+swim (libellé)": 1 });
  });

});
