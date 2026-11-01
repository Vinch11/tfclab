import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import type { AdaptationProjection } from "@/hooks/useAITrainingPlan";
import { normalizeWeeksAndPhases } from "@/engines/plan/normalizeWeeksPhases";

/**
 * Régression PDF réel "test DET.pdf" : fixture QA V4 (1 sem., phase
 * {name:'base',weeks:'1'}, 1 séance 45 min, double marqueur) rendue en
 * 3 phases S1/S2/S3, titre dérivé "Plan TFCL — 70.3 — Structure…" et
 * projections fictives (0.0→0.0, +17 %…). Fixtures synthétiques uniquement.
 */
vi.mock("@/lib/openPrintableHTML", () => ({ openPrintableHTML: vi.fn() }));

type QaPlan = ParsedPlan & { _qaFixture?: boolean; _qaNonPrescriptive?: boolean };

function qaFixture(version: "V3" | "V4", durationMin: number, flags = true): QaPlan {
  return {
    title: `QA — restauration ${version} NON PRESCRIPTIVE`,
    phases: [{ name: "base", weeks: "1" }],
    totalWeeks: 1,
    weeks: [{
      weekNumber: 1, theme: "QA", phase: "base",
      sessions: [{
        weekNumber: 1, weekTheme: "QA", phase: "base", dayName: "Lundi", dayIndex: 0,
        sport: "Course", title: "QA séance fictive — NE PAS PRESCRIRE", details: "Fixture QA",
        isRest: false, durationMin,
      }],
    }],
    ...(flags ? { _qaFixture: true, _qaNonPrescriptive: true } : {}),
  } as QaPlan;
}

const projections: AdaptationProjection[] = [{
  leverId: "x", leverLabel: "Levier fictif", impactScore: 46, impactLabel: "Fort",
  metrics: [{ label: "TTE", current: 0, projected: 0, deltaPct: 17, direction: "up" }],
  performanceImpacts: [], recommendation: "Reco fictive",
}];

async function render(plan: ParsedPlan, orientation: "landscape" | "portrait", detail: "full" | "compact", proj?: AdaptationProjection[]) {
  const { exportAIPlanToPDF } = await import("@/lib/aiPlanPDFExport");
  const { openPrintableHTML } = await import("@/lib/openPrintableHTML");
  const m = openPrintableHTML as unknown as ReturnType<typeof vi.fn>;
  m.mockClear();
  exportAIPlanToPDF(plan, "Athlète QA", new Date("2026-11-02"), proj, orientation, detail);
  return m.mock.calls[0][0] as string;
}

beforeEach(() => vi.clearAllMocks());

describe("isQaNonPrescriptivePlan — double marqueur strict", () => {
  it("exige les DEUX champs à true", async () => {
    const { isQaNonPrescriptivePlan } = await import("@/lib/aiPlanPDFExport");
    expect(isQaNonPrescriptivePlan({ _qaFixture: true, _qaNonPrescriptive: true })).toBe(true);
    expect(isQaNonPrescriptivePlan({ _qaFixture: true })).toBe(false);
    expect(isQaNonPrescriptivePlan({ _qaNonPrescriptive: true })).toBe(false);
    expect(isQaNonPrescriptivePlan({ _qaFixture: "true", _qaNonPrescriptive: true })).toBe(false);
    expect(isQaNonPrescriptivePlan(null)).toBe(false);
  });
});

describe("PDF fixture QA V4/V3 — pipeline normalisation + export", () => {
  for (const [version, dur] of [["V4", 45], ["V3", 40]] as const) {
    for (const [orientation, detail] of [["landscape", "full"], ["portrait", "full"], ["portrait", "compact"]] as const) {
      it(`${version} ${orientation}/${detail} : 1 phase, titre original, durée ${dur}, bannière, aucune projection`, async () => {
        const plan = qaFixture(version, dur);
        normalizeWeeksAndPhases(plan, { weeksAvailable: 1 });
        expect(plan.phases).toHaveLength(1);
        const html = await render(plan, orientation, detail, projections);
        expect(html).toContain(`<h1>QA — restauration ${version} NON PRESCRIPTIVE</h1>`);
        expect(html).not.toContain("Structure");
        expect(html).toContain("1/1 semaines • 1 phases");
        expect(html).toContain("QA — PLAN FICTIF / NON PRESCRIPTIF");
        expect(html).toContain("NE PAS PRESCRIRE");
        expect(html).toContain(`Durée : ${dur} min`);
        expect((html.match(/class="week-block"/g) || []).length).toBe(1);
        expect(html).not.toContain("Adaptation Predictor");
        expect(html).not.toContain("+17");
        expect(html).not.toContain("Impact 46/100");
        expect(html).not.toMatch(/\(SS?[23]\b/);
      });
    }
  }

  it("plan NORMAL (sans double marqueur) conserve le bloc de projections", async () => {
    const plan = qaFixture("V4", 45, false);
    const html = await render(plan, "landscape", "full", projections);
    expect(html).toContain("Adaptation Predictor");
    expect(html).toContain("Impact 46/100");
    expect(html).not.toContain("QA — PLAN FICTIF");
  });

  it("un seul marqueur ne suffit pas : projections conservées", async () => {
    const plan = { ...qaFixture("V4", 45, false), _qaFixture: true } as QaPlan;
    const html = await render(plan, "portrait", "full", projections);
    expect(html).toContain("Adaptation Predictor");
  });
});