import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { evaluateRls, identifyCoach, isExpectedQaOrigin, QA_COACHES, type RlsCounts } from "../__qa/ReadOnlyRlsAuditPage";

const base: RlsCounts = { ownAthlete: 1, foreignAthleteInList: 0, foreignAthleteDirect: 0, ownVersions: 4, foreignVersionsInList: 0,
  foreignVersionsDirect: 0, ownPlan: 1, foreignPlanInList: 0, foreignPlanDirect: 0, wrongCoachRows: 0,
  baselineIntact: 4, baselineAltered: 0, baselineVisible: 4, addedVersions: 0 };
const bBase: RlsCounts = { ...base, ownVersions: 0, ownPlan: 0, baselineIntact: 0, baselineVisible: 0 };

describe("ReadOnlyRlsAudit — assertions pures", () => {
  it("origine QA : exige le ref dans le host", () => {
    expect(isExpectedQaOrigin("https://lkjesdacgpolrwfxulbo.supabase.co")).toBe(true);
    expect(isExpectedQaOrigin("https://otherref.supabase.co")).toBe(false);
    expect(isExpectedQaOrigin("https://evil.com/lkjesdacgpolrwfxulbo")).toBe(false);
    expect(isExpectedQaOrigin(undefined)).toBe(false);
  });
  it("identifie A/B, rejette les autres", () => {
    expect(identifyCoach(QA_COACHES.A.uid)).toBe("A");
    expect(identifyCoach(QA_COACHES.B.uid)).toBe("B");
    expect(identifyCoach("00000000-0000-0000-0000-000000000000")).toBeNull();
  });
  it("Coach A : 1 athlète, 4 versions, 1 plan, 0 étranger → PASS", () => {
    expect(evaluateRls("A", base).verdict).toBe("PASS");
  });
  it("Coach B : 1 athlète, 0 version, 0 plan → PASS", () => {
    expect(evaluateRls("B", bBase).verdict).toBe("PASS");
  });
  it.each<keyof RlsCounts>(["foreignAthleteInList", "foreignAthleteDirect", "foreignVersionsInList", "foreignVersionsDirect", "foreignPlanInList", "foreignPlanDirect", "wrongCoachRows"])(
    "toute visibilité étrangère (%s) → FAIL", (k) => {
      expect(evaluateRls("A", { ...base, [k]: 1 }).verdict).toBe("FAIL");
    });
  it("aucun accès propre (0 athlète) → FAIL, jamais PASS", () => {
    expect(evaluateRls("A", { ...base, ownAthlete: 0, ownVersions: 0, ownPlan: 0 }).verdict).toBe("FAIL");
  });
  it("A avec une version initiale manquante → FAIL", () => {
    expect(evaluateRls("A", { ...base, ownVersions: 3, baselineIntact: 3, baselineVisible: 3 }).verdict).toBe("FAIL");
  });
  it("A avec versions ajoutées pendant la recette → PASS (pas un échec RLS)", () => {
    expect(evaluateRls("A", { ...base, ownVersions: 6, addedVersions: 2 }).verdict).toBe("PASS");
  });
  it("B avec version ajoutée → PASS ; B voyant une version initiale de A → FAIL", () => {
    expect(evaluateRls("B", { ...bBase, ownVersions: 1, addedVersions: 1, ownPlan: 1 }).verdict).toBe("PASS");
    expect(evaluateRls("B", { ...bBase, baselineVisible: 1 }).verdict).toBe("FAIL");
  });
  it("version initiale modifiée → FAIL", () => {
    expect(evaluateRls("A", { ...base, baselineIntact: 3, baselineAltered: 1 }).verdict).toBe("FAIL");
  });
});
