import { describe, it, expect } from "vitest";
import { accumulateChunkUsage, emptyUsageTotals } from "../useAITrainingPlan";

/**
 * Préparation pilote Mode B (consigne coach, "consulter la consommation") —
 * `accumulateChunkUsage` est la fonction pure qui agrège l'usage réel
 * (tokens) renvoyé par le gateway sur les events SSE `chunk-progress`.
 * Testée directement (sans mock fetch/SSE, aucun précédent de ce genre
 * dans ce dépôt) puisqu'elle a été extraite précisément pour être
 * testable isolément.
 */
describe("accumulateChunkUsage", () => {
  it("accumule l'usage de plusieurs chunks 'done' avec usage renseigné", () => {
    let acc = emptyUsageTotals();
    acc = accumulateChunkUsage(acc, { status: "done", usage: { promptTokens: 1000, completionTokens: 500, totalTokens: 1500 } });
    acc = accumulateChunkUsage(acc, { status: "done", usage: { promptTokens: 1200, completionTokens: 600, totalTokens: 1800 } });
    expect(acc).toEqual({
      promptTokens: 2200, completionTokens: 1100, totalTokens: 3300,
      chunksWithUsage: 2, totalChunksSeen: 2,
    });
  });

  it("compte le chunk dans totalChunksSeen même sans usage (gateway qui ne le renvoie pas) — jamais une valeur inventée", () => {
    let acc = emptyUsageTotals();
    acc = accumulateChunkUsage(acc, { status: "done" });
    expect(acc).toEqual({
      promptTokens: 0, completionTokens: 0, totalTokens: 0,
      chunksWithUsage: 0, totalChunksSeen: 1,
    });
  });

  it("ignore les events 'retry-succeeded'/'generating' — ne compte jamais un chunk deux fois", () => {
    let acc = emptyUsageTotals();
    acc = accumulateChunkUsage(acc, { status: "retry-succeeded" });
    acc = accumulateChunkUsage(acc, { status: "generating" });
    acc = accumulateChunkUsage(acc, { status: "done", usage: { totalTokens: 1000 } });
    expect(acc.totalChunksSeen).toBe(1);
    expect(acc.totalTokens).toBe(1000);
  });

  it("mélange de chunks avec et sans usage : chunksWithUsage < totalChunksSeen reste cohérent", () => {
    let acc = emptyUsageTotals();
    acc = accumulateChunkUsage(acc, { status: "done", usage: { totalTokens: 500 } });
    acc = accumulateChunkUsage(acc, { status: "done" });
    acc = accumulateChunkUsage(acc, { status: "done", usage: { totalTokens: 700 } });
    expect(acc.totalChunksSeen).toBe(3);
    expect(acc.chunksWithUsage).toBe(2);
    expect(acc.totalTokens).toBe(1200);
  });

  it("emptyUsageTotals() sans aucun event reste à zéro partout", () => {
    expect(emptyUsageTotals()).toEqual({
      promptTokens: 0, completionTokens: 0, totalTokens: 0,
      chunksWithUsage: 0, totalChunksSeen: 0,
    });
  });
});
