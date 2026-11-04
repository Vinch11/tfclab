import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { DET_LAB_SCENARIOS, runDetLabScenario, evaluateCoachDetInputs, type DetLabOutcome } from "../detLab";
import { DetLabCheckFailed } from "../strictCheck";
import { readPlanProvenance, UNKNOWN_ENGINE_LABEL } from "@/lib/plan/planProvenance";
import { restoreStructuredPlan } from "@/lib/plan/restoreStructuredPlan";
import { AppendOnlyPlanVersionSaver, type PlanVersionRow } from "@/lib/plan/appendOnlyPlanVersionSave";
import { detEngineVersionFromRelease } from "@/pages/__qa/DetLabPage";
import type { ParsedPlan } from "@/lib/aiPlanParser";

vi.mock("@/lib/openPrintableHTML", () => ({ openPrintableHTML: vi.fn() }));

const VERSION = "a".repeat(64);
const AGE16 = "marathon-16w-age_group-tte-source-preferred";
const COMP16 = "marathon-16w-competitor-tte-source-preferred";
let fetchSpy: ReturnType<typeof vi.spyOn>;
let accepted: DetLabOutcome;
let refused: DetLabOutcome;

beforeAll(() => {
  for (const m of ["log", "info", "warn"] as const) vi.spyOn(console, m).mockImplementation(() => {});
  fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("NETWORK_FORBIDDEN"); });
  // VRAI moteur DET (aucune injection de `run`).
  accepted = runDetLabScenario(AGE16, { engineVersion: VERSION, releaseId: "r1", now: () => new Date("2026-11-02T12:00:00Z") });
  refused = runDetLabScenario(COMP16, { engineVersion: VERSION });
}, 120000);
afterAll(() => vi.restoreAllMocks());

/** Transport SIMULÉ (mock en mémoire) — ne prouve aucune écriture réelle. */
function mockTransport() {
  const db = new Map<string, PlanVersionRow>();
  return {
    db,
    transport: {
      insert: async (row: PlanVersionRow) => { db.set(row.id, JSON.parse(JSON.stringify(row))); return { error: null }; },
      readById: async (id: string) => ({ data: db.get(id) ?? null, error: null }),
    },
  };
}

describe("laboratoire DET — raccord du vrai moteur", () => {
  it("8 scénarios : 4 acceptés attendus, 4 refus historiques, entrées identiques aux tests", () => {
    expect(DET_LAB_SCENARIOS.filter((s) => s.expectation === "accepted")).toHaveLength(4);
    expect(DET_LAB_SCENARIOS.filter((s) => s.expectation === "historical_refusal")).toHaveLength(4);
    expect(new Set(DET_LAB_SCENARIOS.map((s) => s.id)).size).toBe(8);
  });

  it("génération réelle acceptée : 16 semaines, drapeaux QA, provenance DET sérialisable", () => {
    expect(accepted.kind).toBe("accepted");
    if (accepted.kind !== "accepted") return;
    expect(accepted.plan.weeks).toHaveLength(16);
    expect(accepted.plan._qaFixture).toBe(true);
    expect(accepted.plan._qaNonPrescriptive).toBe(true);
    expect(accepted.plan.title).toMatch(/NON PRESCRIPTIF/);
    const p = accepted.provenance;
    expect(p).toMatchObject({ engine: "det", engineVersion: VERSION, scenarioId: AGE16, syntheticFixture: true,
      fixtureApprovalsAppliedToAthlete: false, prescriptionAllowed: false, sportingAttestation: false });
    expect(p.scenarioInput.id).toBe(AGE16);
    expect(JSON.parse(JSON.stringify(accepted.plan))).toEqual(accepted.plan); // aucune fonction / undefined perdu
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refus historique réel : affiché avec sa cause, aucun plan, aucune bascule", () => {
    expect(refused.kind).toBe("refused");
    if (refused.kind !== "refused") return;
    expect(refused.expectedRefusal).toBe(true);
    expect(refused.reason).toBe("empty_catalogue_domain_week_1");
    expect(refused.blockingCodes).toContain("det_v3_recovery_safe_slot_unfillable");
    expect(refused).not.toHaveProperty("plan");
  });

  it("sauvegarde append-only (transport simulé), réouverture et restauration : provenance intacte", async () => {
    if (accepted.kind !== "accepted") throw new Error("precondition");
    const m = mockTransport();
    const r = await new AppendOnlyPlanVersionSaver({ transport: m.transport }).save({
      athlete_id: "c155204f-0000-4000-8000-0000000000a1", coach_id: "573e045a-0000-4000-8000-00000000000a",
      plan_json: accepted.plan, objective: "Marathon", weeks_count: 16, sessions_count: accepted.sessions,
      validator_score: null, validator_grade: null, validator_summary: null,
    });
    expect(r.status).toBe("CONFIRMED");
    const stored = m.db.get(r.attemptId!)!.plan_json;
    const restored = restoreStructuredPlan(stored) as ParsedPlan & Record<string, unknown>;
    expect(restored).not.toBeNull();
    expect(restored._provenance).toEqual(accepted.provenance);
    expect(readPlanProvenance(restored).engine).toBe("det");
    // Ré-enregistrement du plan restauré (même chemin que la page) : même identité, pas de doublon.
    const again = await new AppendOnlyPlanVersionSaver({ transport: m.transport }).save({
      athlete_id: "c155204f-0000-4000-8000-0000000000a1", coach_id: "573e045a-0000-4000-8000-00000000000a",
      plan_json: restored, objective: "Marathon", weeks_count: 16, sessions_count: accepted.sessions,
      validator_score: null, validator_grade: null, validator_summary: null,
    });
    expect(again.attemptId).toBe(r.attemptId);
    expect(m.db.size).toBe(1);
  });

  it("PDF réel (HTML) : bannière QA et moteur DET affichés après restauration", async () => {
    if (accepted.kind !== "accepted") throw new Error("precondition");
    const { exportAIPlanToPDF } = await import("@/lib/aiPlanPDFExport");
    const { openPrintableHTML } = await import("@/lib/openPrintableHTML");
    const mock = openPrintableHTML as unknown as ReturnType<typeof vi.fn>;
    mock.mockClear();
    const restored = restoreStructuredPlan(JSON.parse(JSON.stringify(accepted.plan)))!;
    exportAIPlanToPDF(restored, "Athlète QA fictif", new Date("2026-10-26"), undefined, "portrait", "full");
    const html = mock.mock.calls[0][0] as string;
    expect(html).toContain("QA — PLAN FICTIF / NON PRESCRIPTIF");
    expect(html).toContain('data-engine="det"');
    expect(html).toContain("DET Engine (laboratoire synthétique QA)");
  });

  it("ancien plan sans provenance : « moteur non renseigné », jamais deviné", async () => {
    expect(readPlanProvenance({ title: "Plan Marathon IA", weeks: [] }).label).toBe(UNKNOWN_ENGINE_LABEL);
    expect(readPlanProvenance({ _provenance: { engine: "det" } }).engine).toBe("unknown");
    expect(readPlanProvenance(null).engine).toBe("unknown");
    const { exportAIPlanToPDF } = await import("@/lib/aiPlanPDFExport");
    const { openPrintableHTML } = await import("@/lib/openPrintableHTML");
    const mock = openPrintableHTML as unknown as ReturnType<typeof vi.fn>;
    mock.mockClear();
    exportAIPlanToPDF({ title: "Ancien", totalWeeks: 1, phases: [{ name: "base", weeks: "1" }],
      weeks: [{ weekNumber: 1, sessions: [] }] } as unknown as ParsedPlan);
    expect(mock.mock.calls[0][0] as string).toContain(`Moteur : ${UNKNOWN_ENGINE_LABEL}`);
  });

  it("version moteur absente ⇒ BLOCKED, moteur non lancé", () => {
    const run = vi.fn();
    expect(runDetLabScenario(AGE16, { engineVersion: null, run })).toEqual({ kind: "blocked", reason: "version_moteur_det_indisponible" });
    expect(run).not.toHaveBeenCalled();
    expect(detEngineVersionFromRelease({ components: { frontend: VERSION } }).engineVersion).toBeNull();
    expect(detEngineVersionFromRelease({ components: { "det-engine": VERSION }, releaseId: "x" }).engineVersion).toBe(VERSION);
  });

  it("contrôle strict de préparation en échec ⇒ BLOCKED (jamais un plan)", () => {
    const out = runDetLabScenario(AGE16, { engineVersion: VERSION, run: () => { throw new DetLabCheckFailed("toBe", "x"); } });
    expect(out.kind).toBe("blocked");
  });

  it("refus historique qui produirait soudain un candidat ⇒ BLOCKED, pas accepté", () => {
    if (accepted.kind !== "accepted") throw new Error("precondition");
    const fake = { constraintsSatisfied: true, technicallyConstructed: true, candidate: accepted.plan, issues: [], nodes: 1 };
    const out = runDetLabScenario(COMP16, { engineVersion: VERSION, run: () => fake as never });
    expect(out).toEqual({ kind: "blocked", reason: "refus_historique_attendu_mais_candidat_produit" });
  });

  it("entrées coach : refus précis, jamais complétées par la fixture", () => {
    const r = evaluateCoachDetInputs({ objective: "Marathon", weeklyHours: 8, anchors: { vma: 17, thresholdPaceSecPerKm: 250 },
      individualSourceQualifications: [], confirmedSessionClock: null, reviewedSlotPlacement: null });
    expect(r.kind).toBe("refused");
    expect(r.missing).toEqual([
      "qualifications individuelles des sources V3 (revue coach par séance, pour cet athlète)",
      "horaires de séance confirmés par le coach",
      "placement hebdomadaire revu par le coach",
    ]);
    const empty = evaluateCoachDetInputs({ objective: null, weeklyHours: null, anchors: {},
      individualSourceQualifications: [], confirmedSessionClock: null, reviewedSlotPlacement: null });
    expect(empty.missing).toContain("ancre VMA");
    expect(empty.missing).toContain("objectif");
  });
});
