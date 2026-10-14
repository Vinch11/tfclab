import { describe, it, expect } from "vitest";
import { NON_DEROGABLE_RULES } from "../AITrainingPlanPage";

/**
 * Consigne coach (suite vérification PR #376) : "Sauvegarder quand même"
 * doit rester disponible pour les erreurs critiques DÉROGEABLES, mais pas
 * pour une incohérence FONDAMENTALE objectif/contenu
 * (`objective_sport_conflict` — ex. objectif "5 KM" avec 0 séance de
 * course, y compris quand la cause est une interdiction réelle du sport
 * exigé via les contraintes). Verrouille le périmètre EXACT de
 * `NON_DEROGABLE_RULES` (handleSaveToPlan, AITrainingPlanPage.tsx) : ne
 * doit JAMAIS s'élargir silencieusement à "toutes les erreurs critiques
 * indistinctement" (ce que le coach a explicitement refusé), ni se
 * rétrécir au point de laisser `objective_sport_conflict` devenir
 * contournable.
 */
describe("NON_DEROGABLE_RULES — distinction blocage dur / dérogeable (AITrainingPlanPage)", () => {
  it("bloque réellement objective_sport_conflict (incohérence fondamentale objectif/contenu)", () => {
    expect(NON_DEROGABLE_RULES.has("objective_sport_conflict")).toBe(true);
  });

  it("ne bloque PAS les autres règles critiques existantes — restent dérogeables via confirmation explicite", () => {
    const otherCriticalRules = [
      "anti_repetition", "catalog_ratio", "daily_session_floor",
      "demanding_session_accumulation", "injury_risk_compliance",
      "key_session_self_declaration_mismatch", "key_sessions",
      "key_sessions_per_sport", "lcw_signature_missing", "limiter_coherence",
      "load_pattern", "lorang_categories", "overall_catalog_ratio",
      "phase_coherence", "polarization", "progression",
      "prohibition_compliance", "race_day", "race_day_only_fiche_misplaced",
      "rest_day_coherence", "session_density", "sport_objective_coherence",
      "sport_ratio", "start_to_run_strength", "strategic_recap",
      "title_format", "trail_back_to_back", "trail_dplus_presence",
      "wbal_feasibility",
    ];
    for (const rule of otherCriticalRules) {
      expect(NON_DEROGABLE_RULES.has(rule)).toBe(false);
    }
  });

  it("périmètre volontairement restreint à exactement 1 règle — pas un blocage de toutes les erreurs critiques", () => {
    expect(NON_DEROGABLE_RULES.size).toBe(1);
  });
});
