import { describe, expect, it } from "vitest";
import { repairTracesToValidationIssues } from "../finalValidation";

describe("ne pas fusionner des conflits de quota distincts au même emplacement textuel", () => {
  it("W1 floor swim et W1 floor bike restent deux erreurs critiques, même en présence d'une répétition exacte", () => {
    const swim = "[reconciler] [reconcile_conflict] W1 floor swim: qualité non identifiée, quota déjà rempli — aucune insertion";
    const bike = "[reconciler] [reconcile_conflict] W1 floor bike: qualité non identifiée, quota déjà rempli — aucune insertion";
    const result = repairTracesToValidationIssues([swim, bike, swim]);
    expect(result).toHaveLength(2);
    expect(result.every(i => i.severity === "error")).toBe(true);
    expect(result.some(i => i.message.includes("floor swim"))).toBe(true);
    expect(result.some(i => i.message.includes("floor bike"))).toBe(true);
  });
});
