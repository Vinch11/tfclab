import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RunMLSSCoherenceCard } from "../RunMLSSCoherenceCard";
import { computeRunMLSSFromInput } from "@/engines/diagnostic/computeDiagnostic";
import { buildRunMLSSCoherenceHTML } from "../ExportTools";

afterEach(cleanup);
describe("V2 — rendered scientific provenance and explicit unknown cost", () => {
  it("renders the threshold/VMA proxy without an invented model prediction", () => {
    const runMLSS = computeRunMLSSFromInput({ sportFocus: "run", vlamaxRun: 0.5, vma: 18, paceThresholdSecPerKm: 240 });
    render(<RunMLSSCoherenceCard runMLSS={runMLSS} />);
    expect(screen.getByText("83.3%")).toBeTruthy();
    expect(screen.getByText("Proxy seuil / VMA")).toBeTruthy();
    expect(screen.queryByText("Cohérence validée")).toBeNull();
  });
  it("renders model confidence as heuristic, not an experimentally certified probability", () => {
    const runMLSS = computeRunMLSSFromInput({ sportFocus: "run", vlamaxRun: 0.5, vma: 18, paceThresholdSecPerKm: 240, runningEconomyCostMlKgKm: 200 });
    render(<RunMLSSCoherenceCard runMLSS={runMLSS} />);
    expect(screen.getByText(/confiance heuristique 85 \/ 100/)).toBeTruthy();
  });
  it("the actual staff HTML builder keeps missing cost explicit even when a score exists", () => {
    const runMLSS = computeRunMLSSFromInput({ sportFocus: "run", vlamaxRun: 0.5, vma: 18, paceThresholdSecPerKm: 240 });
    const html = buildRunMLSSCoherenceHTML({ athlete: { goal: "Marathon" }, effectiveSnapshot: { run_economy_score: 65 }, runMLSS } as any);
    expect(html).toContain("inconnu — aucune conversion du score économie");
    expect(html).toContain("VLamax run ou CE manquant");
    expect(html).not.toContain("93.7");
  });
});
