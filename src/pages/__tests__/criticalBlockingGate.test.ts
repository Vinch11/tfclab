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
 *
 * Audit "plan 70.3 sans natation" (2026-10-23), garde-fou 3 : extension à
 * `final_objective_mismatch` (incompatibilité démontrée objectif principal
 * / compétition finale, cf. planValidator.ts::validateFinalObjectiveMatchesMainGoal)
 * — même famille qu'`objective_sport_conflict` : aucune correction de
 * contenu ne peut la résoudre, seule une décision du coach (dates/priorités
 * des objectifs saisis) le peut.
 *
 * GRAND SPRINT P0, Sprint 3 (2026-10-23) : extension à
 * `banned_sport_reintroduced` (cf. planValidator.ts::validateBannedSportNotReintroduced)
 * — une discipline explicitement bannie par le coach mais réintroduite par
 * une correction automatique n'admet aucun seuil dérogeable.
 */
describe("NON_DEROGABLE_RULES — distinction blocage dur / dérogeable (AITrainingPlanPage)", () => {
  it("bloque réellement objective_sport_conflict (incohérence fondamentale objectif/contenu)", () => {
    expect(NON_DEROGABLE_RULES.has("objective_sport_conflict")).toBe(true);
  });

  it("[CORRECTIF audit 70.3] bloque réellement final_objective_mismatch (incompatibilité objectif principal / compétition finale)", () => {
    expect(NON_DEROGABLE_RULES.has("final_objective_mismatch")).toBe(true);
  });

  it("[Sprint 3] bloque réellement banned_sport_reintroduced (discipline bannie réintroduite par une correction automatique)", () => {
    expect(NON_DEROGABLE_RULES.has("banned_sport_reintroduced")).toBe(true);
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

  it("périmètre volontairement restreint à exactement 3 règles — pas un blocage de toutes les erreurs critiques", () => {
    expect(NON_DEROGABLE_RULES.size).toBe(3);
  });

  /**
   * [TEST OBLIGATOIRE] "les corrections automatiques ne peuvent contourner
   * les barrières" : reproduit la formule EXACTE de `handleSaveToPlan`
   * (AITrainingPlanPage.tsx) — `criticalIssues = issues.filter(severity ===
   * "error")`, puis `blockingIssues = criticalIssues.filter(rule in
   * NON_DEROGABLE_RULES)`. Même entourée d'un grand nombre d'autres erreurs
   * critiques dérogeables (le type de signal qu'une correction automatique
   * pourrait avoir résolu ou que le coach peut neutraliser via "Sauvegarder
   * quand même"), la présence d'UNE SEULE issue non-dérogeable suffit à
   * produire un `blockingIssues` non vide — aucune quantité de "bruit"
   * dérogeable ne peut diluer ou masquer le blocage dur.
   */
  it("la présence d'une seule issue non-dérogeable bloque la sauvegarde même noyée dans de nombreuses erreurs critiques dérogeables", () => {
    const derogableRules = [
      "anti_repetition", "catalog_ratio", "daily_session_floor",
      "sport_ratio", "progression", "polarization", "race_day",
    ];
    const issues = [
      ...derogableRules.map((rule) => ({ rule, severity: "error" as const, message: `${rule} — erreur dérogeable` })),
      { rule: "objective_sport_conflict", severity: "error" as const, message: "0 séance de Natation sur l'ensemble du plan" },
    ];

    const criticalIssues = issues.filter((i) => i.severity === "error");
    const blockingIssues = criticalIssues.filter((i) => NON_DEROGABLE_RULES.has(i.rule));

    expect(criticalIssues.length).toBe(derogableRules.length + 1);
    expect(blockingIssues.length).toBe(1);
    expect(blockingIssues[0].rule).toBe("objective_sport_conflict");
  });

  it("un avertissement non critique (severity 'warning') ne rejoint jamais criticalIssues ni blockingIssues — le coach garde la décision", () => {
    const issues: Array<{ rule: string; severity: "error" | "warning"; message: string }> = [
      { rule: "rest_floor_breached", severity: "warning", message: "1 jour de repos complet sous le plancher minFullRestDays=2" },
      { rule: "sport_ratio", severity: "warning", message: "Écart de ratio mineur" },
    ];
    const criticalIssues = issues.filter((i) => i.severity === "error");
    const blockingIssues = criticalIssues.filter((i) => NON_DEROGABLE_RULES.has(i.rule));

    expect(criticalIssues).toHaveLength(0);
    expect(blockingIssues).toHaveLength(0);
  });
});
