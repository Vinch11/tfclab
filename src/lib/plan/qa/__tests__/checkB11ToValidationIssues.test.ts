import { describe, it, expect } from "vitest";
import { checkB11ToValidationIssues } from "../checksB10B11";
import type { CheckResult } from "../checks";

// Audit "cohérence placement des séances" — constat n°2 : B11 (règles de
// placement Quand/Éviter/phase/cap-zone déclarées par chaque fiche) ne
// tournait jusqu'ici que dans l'outil QA admin, jamais sur un plan
// sauvegardé par un vrai coach. Ce test couvre la conversion vers
// `ValidationIssue[]` qui branche B11 dans `validatePlan`/
// `pendingCriticalIssues` (AITrainingPlanPage.tsx handleSaveToPlan).
function makeB11Result(details: string[], pass = false): CheckResult {
  return { id: "B11", label: "Contraintes fiches (Quand/Éviter) et note hebdo", level: "critical", pass, details };
}

describe("checkB11ToValidationIssues", () => {
  it("filtre les lignes récapitulatives/info (pas de préfixe 'S{n}'), ne garde que les violations par séance", () => {
    const result = makeB11Result([
      "Contraintes fiches/plan : 2 FAIL.",
      "S3 Vendredi · HARD_INTERVAL_TAPER_BAN — placée en race-week alors que Éviter=\"J-7 avant course\"",
      "📊 phase mismatch — granularité_intra_chunk=1 · fuite_mapping=1 · custom_ou_fallback=0",
      "S5 Lundi · SOME_ID — [fuite_mapping] phase build ∉ [peak, taper]",
      "ℹ variantes format non appliquées : 2 séances (détail en base — application auto Phase 2C)",
    ]);
    const issues = checkB11ToValidationIssues(result);
    expect(issues).toHaveLength(2);
    expect(issues.every(i => i.rule === "catalog_placement_rules")).toBe(true);
  });

  it("extrait le numéro de semaine depuis le préfixe 'S{n}'", () => {
    const result = makeB11Result([
      "S12 Samedi · X_ID — exige gros vélo la veille (Quand=\"Base/Build\") — absent",
    ]);
    const issues = checkB11ToValidationIssues(result);
    expect(issues[0].week).toBe(12);
  });

  it("violation Éviter/cap-zone/prevDayLongBike/fuite_mapping → severity error (bloque via confirmation explicite)", () => {
    const result = makeB11Result([
      "S3 Vendredi · X — placée en race-week alors que Éviter=\"J-7 avant course\"",
      "S2 Mardi · Y — zone Z5 > cap hebdo Z3 (\"consigne coach\")",
      "S4 Samedi · Z — exige gros vélo la veille — absent",
      "S5 Lundi · W — [fuite_mapping] phase build ∉ [peak, taper]",
    ]);
    const issues = checkB11ToValidationIssues(result);
    expect(issues.every(i => i.severity === "error")).toBe(true);
  });

  it("violation catégorisée [granularité_intra_chunk] → severity warning (bruit de découpage en chunks, pas une vraie fuite)", () => {
    const result = makeB11Result([
      "S6 Mardi · V — [granularité_intra_chunk] phase build ∉ [peak, taper]",
    ]);
    const issues = checkB11ToValidationIssues(result);
    expect(issues[0].severity).toBe("warning");
  });

  it("aucune violation (plan propre) → liste vide", () => {
    const result = makeB11Result(["Contraintes fiches/plan respectées."], true);
    expect(checkB11ToValidationIssues(result)).toEqual([]);
  });
});
