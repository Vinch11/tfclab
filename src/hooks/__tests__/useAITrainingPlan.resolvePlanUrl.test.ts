import { describe, it, expect } from "vitest";
import { resolvePlanUrl } from "../useAITrainingPlan";

/**
 * JOUR 1 — SÉCURISATION DU DÉPLOIEMENT (consigne coach explicite) :
 * `resolvePlanUrl` résout l'URL de génération réellement appelée, extraite
 * en fonction pure (même logique que `accumulateChunkUsage`) pour rester
 * testable sans mock fetch/SSE — aucun précédent de ce genre dans ce
 * dépôt pour `generatePlan()` lui-même.
 */
describe("resolvePlanUrl", () => {
  it("sans pilotFunctionName (appel normal) → URL de production ai-training-plan", () => {
    expect(resolvePlanUrl("https://wtwjkmawntybyehatkjo.supabase.co")).toBe(
      "https://wtwjkmawntybyehatkjo.supabase.co/functions/v1/ai-training-plan"
    );
  });

  it("pilotFunctionName='ai-training-plan-test' → URL redirigée vers la fonction de test", () => {
    expect(resolvePlanUrl("https://wtwjkmawntybyehatkjo.supabase.co", "ai-training-plan-test")).toBe(
      "https://wtwjkmawntybyehatkjo.supabase.co/functions/v1/ai-training-plan-test"
    );
  });

  it("pilotFunctionName chaîne vide → traité comme absent (fonction de production), jamais une URL invalide", () => {
    expect(resolvePlanUrl("https://wtwjkmawntybyehatkjo.supabase.co", "")).toBe(
      "https://wtwjkmawntybyehatkjo.supabase.co/functions/v1/ai-training-plan"
    );
  });

  it("pilotFunctionName undefined explicite → identique à l'absence du paramètre", () => {
    expect(resolvePlanUrl("https://wtwjkmawntybyehatkjo.supabase.co", undefined)).toBe(
      resolvePlanUrl("https://wtwjkmawntybyehatkjo.supabase.co")
    );
  });
});
