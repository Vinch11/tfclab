import { describe, it, expect } from "vitest";
import { computePilotMergedTotalWeeks } from "../useAITrainingPlan";
import { mergePlanChunks, MergePlanError } from "@/lib/plan/mergePlanChunks";
import { zPlanChunk, type PlanChunk } from "@/lib/plan/planSchema";

/**
 * Incident réel #2 (coach, 2e test B-10K-TO-70.3, consigne coach explicite) :
 * `mergePlanChunks(collected, totalWeeks)` (useAITrainingPlan.ts) exigeait
 * TOUJOURS une couverture 1..32 (le `totalWeeks` complet du plan), même
 * quand `_pilotMaxChunks=1` ne produit QUE les 5 premières semaines par
 * construction — `[GAP] semaines manquantes [6…32]`. Site CLIENT, distinct
 * et indépendant du site SERVEUR déjà corrigé la veille
 * (jsonPlanHandler.ts) : deux miroirs de `mergePlanChunks`
 * (`src/lib/plan/mergePlanChunks.ts` / `supabase/functions/.../mergePlanChunks.ts`),
 * chacun avec son propre appelant à corriger séparément.
 */

function makeSession(over: any = {}) {
  return {
    day: "lundi", title: "Session", details: "", isKeySession: false,
    durationMin: 60, zones: [], sport: "bike", custom: false,
    catalogId: "B_BIKE_TEMPO_01",
    ...over,
  };
}
function makeChunk(weeks: number[], over: any = {}): PlanChunk {
  return zPlanChunk.parse({
    weeks: weeks.map((n) => ({ weekNumber: n, phase: "build", theme: `S${n}`, sessions: [makeSession()] })),
    ...over,
  });
}

describe("computePilotMergedTotalWeeks — fonction pure", () => {
  it("_pilotMaxChunks absent → totalWeeks inchangé (comportement legacy, jamais d'acceptation silencieuse)", () => {
    expect(computePilotMergedTotalWeeks(32, undefined, [1, 2, 3, 4, 5])).toBe(32);
  });

  it("_pilotMaxChunks=1, semaines 1..5 reçues → fenêtre ramenée à 5 (max reçu)", () => {
    expect(computePilotMergedTotalWeeks(32, 1, [1, 2, 3, 4, 5])).toBe(5);
  });

  it("_pilotMaxChunks posé mais aucune semaine reçue (échec avant le 1er chunk) → repli sur totalWeeks (jamais 0/-Infinity)", () => {
    expect(computePilotMergedTotalWeeks(32, 1, [])).toBe(32);
  });

  it("_pilotMaxChunks=0 ou négatif → traité comme absent (0 n'est jamais une limite valide)", () => {
    expect(computePilotMergedTotalWeeks(32, 0, [1, 2, 3, 4, 5])).toBe(32);
    expect(computePilotMergedTotalWeeks(32, -1, [1, 2, 3, 4, 5])).toBe(32);
  });

  it("jamais au-delà de totalWeeks (max reçu supérieur au plan — garde-fou de sécurité)", () => {
    expect(computePilotMergedTotalWeeks(5, 1, [1, 2, 3, 4, 5, 6, 7])).toBe(5);
  });
});

describe("Incident réel reproduit : plan 32 semaines, run pilote 1 chunk/5 semaines", () => {
  it("assemblage RÉUSSIT sur 1..5 quand _pilotMaxChunks=1 (reproduction exacte de l'incident, désormais corrigée)", () => {
    const collected = [makeChunk([1, 2, 3, 4, 5], { title: "Plan 10K→70.3", phases: [{ name: "Base", weeks: "S1-S5" }] })];
    const mergedTotal = computePilotMergedTotalWeeks(
      32,
      1,
      collected.flatMap((c) => c.weeks.map((w) => w.weekNumber)),
    );
    expect(mergedTotal).toBe(5);
    const merged = mergePlanChunks(collected, mergedTotal);
    expect(merged.weeks.map((w) => w.weekNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(merged.totalWeeks).toBe(5);
  });

  it("une génération NORMALE (pas de _pilotMaxChunks) sur un plan de 32 semaines continue d'EXIGER les 32 semaines — une interruption réelle reste détectée", () => {
    // Même symptôme qu'un run pilote (seulement 5 semaines reçues), mais
    // SANS _pilotMaxChunks : jamais le même traitement — point 5 de la
    // consigne coach, pas de régression du garde-fou normal.
    const collected = [makeChunk([1, 2, 3, 4, 5])];
    const mergedTotal = computePilotMergedTotalWeeks(
      32,
      undefined,
      collected.flatMap((c) => c.weeks.map((w) => w.weekNumber)),
    );
    expect(mergedTotal).toBe(32);
    expect(() => mergePlanChunks(collected, mergedTotal)).toThrow(MergePlanError);
    try {
      mergePlanChunks(collected, mergedTotal);
    } catch (e) {
      expect(e).toBeInstanceOf(MergePlanError);
      expect((e as MergePlanError).message).toMatch(/semaines manquantes/);
    }
  });
});
