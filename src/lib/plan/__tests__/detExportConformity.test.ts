import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import {
  checkDetExportConformity,
  extractPrescriptionTokens,
  type DetEngineResultLike,
} from "../detExportConformity";

/**
 * Contrôle hors ligne DET → PDF / Nolio sur une VRAIE sortie du moteur DET
 * (cas synthétique 10K du laboratoire, non prescriptif). Aucune requête.
 */
vi.mock("@/lib/openPrintableHTML", () => ({ openPrintableHTML: vi.fn() }));

const START = "2026-10-26";
let fetchSpy: ReturnType<typeof vi.spyOn>;
let det: DetEngineResultLike;

async function pdfHtml(plan: ParsedPlan, detail: "full" | "compact" = "full"): Promise<string> {
  const { exportAIPlanToPDF } = await import("@/lib/aiPlanPDFExport");
  const { openPrintableHTML } = await import("@/lib/openPrintableHTML");
  const m = openPrintableHTML as unknown as ReturnType<typeof vi.fn>;
  m.mockClear();
  exportAIPlanToPDF(plan, "QA_DET_A", new Date(START), undefined, "portrait", detail);
  return m.mock.calls[0][0] as string;
}

beforeAll(async () => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("NETWORK_FORBIDDEN"); });
  const { constructDeterministicPlan } = await import("../../../../experimental/det-engine/engine");
  const { planningCases, preparePlanningCaseContext } = await import("@/qa/sports-plan-lab/planningMatrix");
  const spec = planningCases().find((c) => c.objective === "10K" && c.level === "light" && c.ambition === "finisher" && c.load === "unknown")!;
  const { prepared } = preparePlanningCaseContext({ ...spec, constraints: "unrestricted", intermediate: false });
  det = constructDeterministicPlan(prepared.athleteData, prepared.planConfig) as unknown as DetEngineResultLike;
}, 120000);

afterAll(() => vi.restoreAllMocks());

describe("DET → PDF / Nolio hors ligne", () => {
  it("le moteur DET réel produit un candidat non attesté, revue humaine requise, sans réseau", () => {
    expect(det.status).toBe("candidate");
    expect(det.sportingRelevance).toBe("not_attested");
    expect(det.humanReviewRequired).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("PDF complet réel : dates, durées, titres et éléments chiffrés comparés séance par séance", async () => {
    const html = await pdfHtml(det.candidate as unknown as ParsedPlan, "full");
    const r = checkDetExportConformity({ engineResult: det, planStartDate: START, pdfHtml: html });
    expect(r.pdf.checked).toBe(true);
    expect(r.sessions.length).toBeGreaterThan(0);
    const pdfIssues = r.incompatibilities.filter((i) => i.channel === "pdf");
    // Seule tolérance : une durée absente côté DET (le PDF n'en invente pas).
    expect(pdfIssues.filter((i) => i.code !== "det_duration_absent")).toEqual([]);
    const absent = r.sessions.filter((s) => s.durationMin == null).length;
    expect(pdfIssues.filter((i) => i.code === "det_duration_absent")).toHaveLength(absent);
    expect(r.pdf.verdict).toBe(absent === 0 ? "CONFORME_HTML" : "INCOMPATIBLE");
  });

  it("toute altération du HTML (durée, cible) est signalée, jamais masquée", async () => {
    const html = await pdfHtml(det.candidate as unknown as ParsedPlan, "full");
    const withDur = det.candidate!.weeks.flatMap((w) => w.sessions).find((s) => !s.isRest && s.durationMin)!;
    const broken = html.split(`Durée : ${withDur.durationMin} min`).join("Durée : ? min");
    const r = checkDetExportConformity({ engineResult: det, planStartDate: START, pdfHtml: broken });
    expect(r.pdf.verdict).toBe("INCOMPATIBLE");
    expect(r.incompatibilities.some((i) => i.code === "pdf_duration_divergent")).toBe(true);
  });

  it("Nolio : BLOCKED, zéro requête, chemin manquant explicite, diagnostics V1 obsolètes retirés", () => {
    const r = checkDetExportConformity({ engineResult: det, planStartDate: START, pdfHtml: null });
    expect(r.nolio.verdict).toBe("BLOCKED");
    expect(r.nolio.requestsSent).toBe(0);
    expect(r.nolio.missingPath.length).toBeGreaterThan(0);
    expect(r.incompatibilities.some((i) => i.code === "nolio_v2_connection_not_configured")).toBe(true);
    // Diagnostics V1 obsolètes jamais présentés comme préparation actuelle :
    expect(r.incompatibilities.some((i) => i.code === "nolio_mapper_not_offline_importable" || i.code === "nolio_no_structure_duration_and_steps_dropped")).toBe(false);
    expect(r.overall).not.toBe("PASS");
    expect(r.prescriptionReleased).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("dates Nolio calculées comme l'expéditeur : début + (S-1)×7 + jour", () => {
    const r = checkDetExportConformity({ engineResult: det, planStartDate: START, pdfHtml: null });
    const s = r.sessions[0];
    const d = new Date(Date.UTC(2026, 9, 26 + (s.weekNumber - 1) * 7 + s.dayIndex)).toISOString().slice(0, 10);
    expect(s.date).toBe(d);
  });

  it("refus DET : affiché tel quel, aucun export ni bascule", () => {
    const r = checkDetExportConformity({
      engineResult: { status: "refused", reason: "search_budget_exhausted", constraintsSatisfied: false, sportingRelevance: "not_attested", humanReviewRequired: true, issues: [] },
      planStartDate: START,
      pdfHtml: "<html></html>",
    });
    expect(r.overall).toBe("REFUSED");
    expect(r.pdf.verdict).toBe("REFUSED");
    expect(r.nolio.verdict).toBe("REFUSED");
    expect(r.incompatibilities[0].code).toBe("det_refused_search_budget_exhausted");
  });

  it("extraction littérale des répétitions, récupérations et cibles", () => {
    const t = extractPrescriptionTokens("Main: 6x3 min Z4 récup 2 min | 4 x 400 m à 95-100% VMA, récup 90s | RPE 6-7");
    expect(t.repetitions).toEqual(expect.arrayContaining(["6x3 min", "4 x 400 m"]));
    expect(t.recoveries).toEqual(expect.arrayContaining(["récup 2 min", "récup 90s"]));
    expect(t.targets).toEqual(expect.arrayContaining(["Z4", "95-100% VMA", "RPE 6-7"]));
  });
});
