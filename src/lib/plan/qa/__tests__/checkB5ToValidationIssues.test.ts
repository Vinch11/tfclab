import { describe, it, expect } from "vitest";
import { checkB5, checkB5ToValidationIssues } from "../checks";
import { checkB13, checkB13ToValidationIssues } from "../checkB13";
import { checkB14, checkB14ToValidationIssues } from "../checkB14";
import type { MergedPlan, MergedSession } from "@/lib/plan/mergePlanChunks";

/**
 * TFCLab — Dernière vérification avant fusion de la PR #383.
 *
 * Constat confirmé en lisant le code (pas seulement les logs) :
 * `catalog_id_no_safe_neighbor` (réconciliateur client,
 * planReconciler.ts::neighborRemapPass) laisse en place un catalogId qui
 * échoue exactement l'invariant vérifié par `checkB5` ("catalogId ⊂
 * catalogue injecté") — mais `checkB5` ne tournait jusqu'ici que dans le
 * harnais QA (usePilotCockpit/useQARunner), jamais sur le plan réel livré
 * au coach. `week_duplicate_unresolved`, en revanche, est déjà entièrement
 * couvert par `checkB13` (qui redétecte tout catalogId dupliqué dans une
 * semaine sur le plan FINAL, indépendamment du mécanisme qui a échoué à le
 * corriger) — vérifié ci-dessous, pas supposé.
 */

function mkSess(overrides: Partial<MergedSession>): MergedSession {
  return {
    weekNumber: 1, weekTheme: "Test", phase: "build", dayName: "mardi", dayIndex: 1,
    sport: "run", title: "Séance", details: "", isRest: false, isKeySession: false,
    catalogId: null, custom: false, durationMin: 60, zones: [],
    ...overrides,
  };
}
function mkPlan(sessions: MergedSession[], weekNumber = 1, phase = "build"): MergedPlan {
  return {
    title: "T", phases: [], totalWeeks: 1,
    weeks: [{ weekNumber, theme: "Test", phase, sessions }],
  };
}

describe("checkB5ToValidationIssues — propagation de catalog_id_no_safe_neighbor jusqu'à la validation de sauvegarde", () => {
  it("1. une anomalie critique (catalogId hors catalogue injecté) est transmise au format bloquant", () => {
    const plan = mkPlan([
      mkSess({ catalogId: "STALE_ID_LEFT_BY_NEIGHBOR_REMAP", custom: false }),
    ]);
    const b5 = checkB5(plan, ["SOME_OTHER_ALLOWED_ID"], "5K");
    expect(b5.pass).toBe(false);
    expect(b5.level).toBe("critical");
    const issues = checkB5ToValidationIssues(b5);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe("error");
    expect(issues[0].message).toContain("STALE_ID_LEFT_BY_NEIGHBOR_REMAP");
    expect(issues[0].rule).toBe("catalog_id_no_safe_neighbor");
  });

  it("2. une anomalie non critique (incohérence phase/fiche, B14) reste un avertissement, jamais élevée à critique", () => {
    // Même mécanisme de détection que `phase_unresolved` côté réconciliateur
    // client : fiche RÉELLE (D_TAPER_RUN_OPENER, phase: ["taper"] dans
    // workoutLibrary.ts) placée dans une semaine "base" — phase incompatible
    // détectée, mais le contenu reste un entraînement valide (cf. docstring
    // checkB14.ts), donc sévérité "warning" attendue, jamais "error".
    const plan = mkPlan([
      mkSess({ catalogId: "D_TAPER_RUN_OPENER", custom: false }),
    ], 1, "base");
    const b14 = checkB14(plan);
    expect(b14.pass).toBe(false);
    expect(b14.level).toBe("warning");
    const issues = checkB14ToValidationIssues(b14);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((i) => i.severity === "warning")).toBe(true);
  });

  it("3. une anomalie résolue (catalogId effectivement dans le catalogue injecté) n'est plus signalée", () => {
    const plan = mkPlan([
      mkSess({ catalogId: "NOW_ALLOWED_ID", custom: false }),
    ]);
    const b5 = checkB5(plan, ["NOW_ALLOWED_ID"], "5K");
    expect(b5.pass).toBe(true);
    expect(checkB5ToValidationIssues(b5)).toEqual([]);
  });

  it("4. une anomalie déjà détectée par un autre validateur (doublon intra-semaine, B13) n'est pas affichée une 2e fois par B5", () => {
    // Doublon catalogId dans la même semaine, mais les DEUX occurrences
    // appartiennent au catalogue injecté — B13 doit le signaler (critique),
    // B5 ne doit RIEN ajouter pour ces mêmes séances (catalogId valides,
    // simplement répétés) : pas de double alerte sur le même symptôme.
    const plan = mkPlan([
      mkSess({ catalogId: "DUP_ID", custom: false, dayName: "mardi" }),
      mkSess({ catalogId: "DUP_ID", custom: false, dayName: "jeudi" }),
    ]);
    const b13 = checkB13(plan);
    const b13Issues = checkB13ToValidationIssues(b13);
    expect(b13Issues.length).toBeGreaterThan(0);
    expect(b13Issues[0].severity).toBe("error");

    const b5 = checkB5(plan, ["DUP_ID"], "5K");
    expect(checkB5ToValidationIssues(b5)).toEqual([]);
  });

  it("5. une substitution sportivement équivalente (catalogId cible dans le catalogue injecté) reste autorisée, pas de fausse alerte", () => {
    // Reproduit l'état laissé par neighborRemapPass en cas de succès : la
    // fiche a été remplacée par un voisin pris dans `injectedByBucket`
    // (donc nécessairement membre de l'union injectée) — B5 ne doit jamais
    // pénaliser une substitution réussie.
    const plan = mkPlan([
      mkSess({ catalogId: "SAFE_NEIGHBOR_ID", custom: false }),
    ]);
    const b5 = checkB5(plan, ["SAFE_NEIGHBOR_ID", "OTHER_INJECTED_ID"], "5K");
    expect(b5.pass).toBe(true);
    expect(checkB5ToValidationIssues(b5)).toEqual([]);
  });

  it("filtre QA (debug) : les lignes de diagnostic B5 (hallucination_breakdown, voisins, exclusion_reason) ne fuient jamais dans les ValidationIssue coach", () => {
    const plan = mkPlan([
      mkSess({ catalogId: "UNKNOWN_ID_1" }),
      mkSess({ catalogId: "UNKNOWN_ID_2", dayName: "jeudi" }),
    ]);
    const b5 = checkB5(plan, ["ALLOWED_ONLY"], "5K");
    const issues = checkB5ToValidationIssues(b5);
    expect(issues).toHaveLength(2);
    for (const issue of issues) {
      expect(issue.message.startsWith("S")).toBe(true);
      expect(issue.message).not.toContain("[b5_");
      expect(issue.message).not.toContain("🔎");
    }
  });
});
