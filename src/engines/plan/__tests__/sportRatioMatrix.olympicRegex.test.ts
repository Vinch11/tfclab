import { describe, it, expect } from "vitest";
import { normalizeObjKey } from "../../../../supabase/functions/ai-training-plan/sportRatioMatrix";

/**
 * Batch 2 — exposition UI Sprint/Olympic. normalizeObjKey() (edge function,
 * pilote SPORT_RATIO_REFS) matchait "olymp" via `^(olymp|...)$` — un motif
 * ancré qui ne matche JAMAIS "olympic" (valeur UI littérale réelle), faute
 * du suffixe "ic". La branche n'était donc jamais atteinte en usage réel,
 * sans que rien ne le signale (pas de crash, juste un ratio sport/objectif
 * jamais résolu pour ces plans). Corrigé en ajoutant "olympic" à
 * l'alternative.
 */
describe("normalizeObjKey (edge, sportRatioMatrix.ts) — Sprint/Olympic", () => {
  it("reconnaît la valeur UI littérale 'Olympic' (pas seulement 'Olympique')", () => {
    expect(normalizeObjKey("Olympic")).toBe("TriOlympique");
    expect(normalizeObjKey("olympic")).toBe("TriOlympique");
    expect(normalizeObjKey("OLYMPIC")).toBe("TriOlympique");
  });

  it("reconnaît toujours les variantes déjà supportées (Olympique, Distance M, Triathlon Olympique)", () => {
    expect(normalizeObjKey("Olympique")).toBe("TriOlympique");
    expect(normalizeObjKey("Distance M")).toBe("TriOlympique");
    expect(normalizeObjKey("Triathlon Olympique")).toBe("TriOlympique");
  });

  it("reconnaît Sprint", () => {
    expect(normalizeObjKey("Sprint")).toBe("TriSprint");
  });
});
