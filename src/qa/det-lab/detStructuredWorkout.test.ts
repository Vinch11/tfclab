import { describe, it, expect, vi, beforeAll } from "vitest";
import { DET_LAB_SCENARIOS, runDetLabScenario } from "./detLab";
import { buildDetStructuredWorkout, type DetStructuredNode, type DetStructuredWorkout } from "../../../experimental/det-engine/v400-structured-workout";
import type { V3Workout } from "../../../scripts/library-v3/catalogueRuntime";

/** Structure DET sérialisable issue des blocs V3 configurés — moteur réel, aucun réseau. */
type S = Record<string, unknown> & { isRest?: boolean; catalogId?: string; durationMin?: number; title: string; detStructuredWorkout?: DetStructuredWorkout; detStructureRefusal?: { reason: string } };
const results = new Map<string, { sessions: S[] }>();
const accepted = DET_LAB_SCENARIOS.filter((s) => s.expectation === "accepted");

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("NETWORK_FORBIDDEN"); });
  for (const sc of accepted) {
    const o = runDetLabScenario(sc.id, { engineVersion: "a".repeat(64) });
    if (o.kind !== "accepted") throw new Error(`${sc.id}:${o.kind}`);
    results.set(sc.id, { sessions: o.plan.weeks.flatMap((w) => w.sessions as unknown as S[]).filter((s) => !s.isRest) });
  }
}, 600000);

const leaves = (ns: DetStructuredNode[]): DetStructuredNode[] => ns.flatMap((n) => (n.kind === "repeat" ? leaves(n.steps) : [n]));
const secs = (ns: DetStructuredNode[]): number => ns.reduce((t, n) => t + (n.kind === "repeat" ? n.count * secs(n.steps) + (n.count - 1) * n.betweenSec : "seconds" in n.dose ? n.dose.seconds : NaN), 0);

describe("4 marathons acceptés : structure portée par chaque séance sélectionnée", () => {
  it("4 scénarios", () => expect(accepted).toHaveLength(4));
  for (const sc of accepted) {
    it(sc.id, () => {
      const ss = results.get(sc.id)!.sessions;
      for (const s of ss) {
        if (!s.catalogId) {
          // Seule la course elle-même n'a pas de source V3 : refus explicite.
          expect(s.title.startsWith("COURSE : ")).toBe(true);
          expect(s.detStructureRefusal?.reason).toBe("session_without_source_id");
          continue;
        }
        const w = s.detStructuredWorkout!;
        expect(w, `${s.catalogId}:${s.detStructureRefusal?.reason}`).toBeDefined();
        expect(w.sourceId).toBe(s.catalogId);
        expect(w.chosenDurationMin).toBe(s.durationMin);
        expect(JSON.parse(JSON.stringify(w))).toEqual(w); // sérialisable, aucun callback
        if (w.exactSeconds !== null) {
          expect(secs(w.nodes)).toBe(w.exactSeconds);
          expect(w.exactSeconds).toBe((s.durationMin as number) * 60);
        }
        for (const l of leaves(w.nodes)) if (l.kind === "step" && l.domain !== null) expect(l.target).not.toBeNull();
        const reps = w.nodes.filter((n) => n.kind === "repeat");
        for (const r of reps) if (r.kind === "repeat") expect(r.restAfterLast).toBe(false);
      }
    });
  }

  it("la répétition V3P_RUN_136 (4×6 min MLSS, 180 s entre) garde la dose approuvée, 3 pauses seulement", () => {
    const s = results.get(accepted[0].id)!.sessions.find((x) => x.catalogId === "V3P_RUN_136");
    expect(s).toBeDefined();
    const rep = s!.detStructuredWorkout!.nodes.find((n) => n.kind === "repeat");
    expect(rep).toMatchObject({ kind: "repeat", count: 4, betweenSec: 180, restAfterLast: false });
    expect(s!.detStructuredWorkout!.exactSeconds).toBe(51 * 60);
  });
});

describe("refus explicites et sabotages (aucune dose inventée)", () => {
  const card = {
    id: "V3P_RUN_X", sport: "run",
    blocks: [
      { kind: "time", label: "Éch", role: "warmup", domain: "recovery", seconds: { min: 300, base: 600, max: 900 } },
      { kind: "repeat", label: "R", count: { min: 2, base: 4, max: 6 }, betweenSec: 180, steps: [
        { kind: "time", label: "MLSS", role: "main", domain: "mlss", seconds: { min: 240, base: 360, max: 480 } }] },
      { kind: "time", label: "RAC", role: "cooldown", domain: "recovery", seconds: { min: 300, base: 480, max: 600 } },
    ],
  } as unknown as V3Workout;
  const t = (domain: string) => ({ domain, metric: "sec_per_km", min: 233, max: 247.4, source: "athlete_measurement_with_doctrine_model", confidence: "model", note: "" }) as never;
  const ok = { sourceId: "V3P_RUN_X", configured: card, targets: [t("recovery"), t("mlss")], admitted: true, isBrick: false, chosenDurationMin: 51, exactDurationMin: 51 };
  it("cas nominal", () => expect(buildDetStructuredWorkout(ok).status).toBe("structured"));
  const cases: Array<[string, Partial<typeof ok>, RegExp]> = [
    ["source non admise", { admitted: false }, /source_not_admitted/],
    ["brick", { isBrick: true }, /brick_transition_structure_not_supported/],
    ["id source différent", { sourceId: "V3P_RUN_Y" }, /configured_source_missing/],
    ["durée choisie ≠ blocs", { chosenDurationMin: 52, exactDurationMin: 51 }, /chosen_duration_differs/],
    ["plage non résolue", { exactDurationMin: null }, /chosen_duration_differs/],
    ["cible manquante", { targets: [t("recovery")] }, /missing_target_for_domain:mlss/],
    ["cible ambiguë", { targets: [t("recovery"), t("mlss"), t("mlss")] }, /ambiguous_target_for_domain:mlss/],
    ["somme des blocs ≠ durée (dose sabotée)", { configured: { ...card, blocks: [{ ...(card.blocks[0] as object), seconds: { min: 1, base: 601, max: 900 } }, card.blocks[1], card.blocks[2]] } as unknown as V3Workout }, /block_seconds_3061_differ/],
  ];
  for (const [name, patch, re] of cases) it(name, () => {
    const r = buildDetStructuredWorkout({ ...ok, ...patch });
    expect(r.status).toBe("refused");
    if (r.status === "refused") expect(r.reason).toMatch(re);
  });
});
