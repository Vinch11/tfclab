import { describe, expect, it } from "vitest";
import { planStatsSince, type PlanGenerationStat } from "@/lib/plan/planGenerationStats";
import { checkB1, checkB9 } from "../checks";

const summary = (unresolved = 0, residual = 0) =>
  `[info] value_check_summary: tokens=10 conforme=8 relativized=2 unresolved=${unresolved} residualAbs=${residual}`;
const stat = (ts: number): PlanGenerationStat => ({
  ts, format: "json", objective: "5 KM", totalWeeks: 12, totalChunks: 3,
  durationMs: 100, ok: true, semanticRepairs: [summary(), summary(), summary()],
});

describe("Pilot Cockpit : B1/B9 et journal circulaire", () => {
  it.each([0, 12, 49, 50])("retrouve le run avec %i entrées précédentes", size => {
    const before = Array.from({ length: size }, (_, i) => stat(i));
    const current = stat(101);
    const after = [...before, current].slice(-50);
    const fresh = planStatsSince(before, after, 100);
    expect(fresh).toEqual([current]);
    expect(checkB1({ stat: fresh[0], parsedPresent: true }).pass).toBe(true);
    expect(checkB9(fresh[0].semanticRepairs).pass).toBe(true);
  });

  it("ne réutilise aucune vieille réussite quand le run n'émet pas de statistique", () => {
    const before = [stat(100)];
    expect(planStatsSince(before, before, 100)).toEqual([]);
    expect(planStatsSince(before, [], 100)).toEqual([]);
    expect(checkB1({ parsedPresent: true }).pass).toBe(false);
    expect(checkB9(undefined).pass).toBe(false);
  });

  it("B1 conserve les échecs JSON, Markdown et plan absent", () => {
    expect(checkB1({ stat: { ...stat(1), ok: false }, parsedPresent: true }).pass).toBe(false);
    expect(checkB1({ stat: { ...stat(1), format: "markdown-fallback-from-json" }, parsedPresent: true }).pass).toBe(false);
    expect(checkB1({ stat: stat(1), parsedPresent: false }).pass).toBe(false);
  });

  it("B9 contrôle tous les chunks, même si le premier est conforme", () => {
    expect(checkB9([summary(), summary(1), summary()]).pass).toBe(false);
    expect(checkB9([summary(), summary(), summary(0, 1)]).pass).toBe(false);
    expect(checkB9([summary(), "value_check_summary: invalide"]).pass).toBe(false);
    expect(checkB9([summary(), "value_unresolved: prescription ambiguë"]).pass).toBe(false);
    expect(checkB9([summary(), summary(), summary()]).details[0]).toContain("Total tokens : 30");
  });
});
