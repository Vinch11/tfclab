import { describe, it, expect, beforeEach } from "vitest";
import { aiPlanCacheKeys, clearLocalAIPlanCache } from "../aiPlanLocalCache";

/**
 * Bug réel (retour coach : "j'ai effacé tous les plans de Mamou mais quand
 * je vais sur Plan il y a toujours un plan ouvert") : "Tout supprimer" dans
 * SavedPlanCalendar ne vidait que la table Supabase `training_plan` — le
 * cache navigateur du dernier plan IA généré (localStorage, lu au
 * chargement de AITrainingPlanPage) n'était jamais informé et continuait
 * d'afficher un plan "fantôme" déjà supprimé côté coach.
 */
describe("aiPlanLocalCache", () => {
  const athleteId = "athlete-123";

  beforeEach(() => {
    localStorage.clear();
  });

  it("aiPlanCacheKeys produit les 3 clés attendues (mêmes formats que AITrainingPlanPage.tsx)", () => {
    const keys = aiPlanCacheKeys(athleteId);
    expect(keys.persistKey).toBe("tfcl_ai_plan_athlete-123");
    expect(keys.activePlanKey).toBe("plan_active_athlete-123");
    expect(keys.draftKey).toBe("tfcl_ai_plan_draft_athlete-123");
  });

  it("clearLocalAIPlanCache supprime les 3 clés de cet athlète sans toucher aux autres athlètes", () => {
    const keys = aiPlanCacheKeys(athleteId);
    const otherKeys = aiPlanCacheKeys("autre-athlete");
    localStorage.setItem(keys.persistKey, "x");
    localStorage.setItem(keys.activePlanKey, "y");
    localStorage.setItem(keys.draftKey, "z");
    localStorage.setItem(otherKeys.activePlanKey, "garder");

    clearLocalAIPlanCache(athleteId);

    expect(localStorage.getItem(keys.persistKey)).toBeNull();
    expect(localStorage.getItem(keys.activePlanKey)).toBeNull();
    expect(localStorage.getItem(keys.draftKey)).toBeNull();
    expect(localStorage.getItem(otherKeys.activePlanKey)).toBe("garder");
  });
});
