import { describe, expect, it } from "vitest";
import planQAPage from "../PlanQAPage.tsx?raw";

/**
 * Bug coach (oct. 2026) : le bandeau "Runner opérationnel" s'affichait deux
 * fois. Cause : le JSX affiche déjà `"✅ Runner opérationnel"` en gras, puis
 * concatène `selfTest.message`, qui contenait LUI-MÊME le texte
 * "Runner opérationnel — ..." — d'où "✅ Runner opérationnel — Runner
 * opérationnel — session utilisateur ...". Ce test fige que le message
 * posé en state ne répète plus le libellé déjà affiché par le JSX, en
 * inspectant le source (PlanQAPage.tsx monte un vrai client Supabase et
 * plusieurs sous-systèmes QA, trop coûteux à mocker pour un test de rendu).
 */
describe("PlanQAPage — bandeau self-test runner (pas de doublon)", () => {
  it("le JSX affiche le libellé 'Runner opérationnel' exactement une fois", () => {
    const occurrences = planQAPage.match(/Runner opérationnel/g) ?? [];
    expect(occurrences.length).toBe(1);
  });

  it("le message de succès du self-test ne répète pas le libellé déjà affiché par le JSX", () => {
    const setSelfTestOkMatch = planQAPage.match(/setSelfTest\(\{\s*ok:\s*true,\s*message:\s*`([^`]*)`/);
    expect(setSelfTestOkMatch).not.toBeNull();
    const [, template] = setSelfTestOkMatch!;
    expect(template).not.toContain("Runner opérationnel");
    // L'info utile (session utilisateur) doit rester présente.
    expect(template).toMatch(/session utilisateur/i);
  });

  it("le libellé affiché reste bien 'Runner opérationnel' pour le cas OK (régression visuelle)", () => {
    expect(planQAPage).toMatch(/\{selfTest\.ok \? "✅ Runner opérationnel" : "🔴 Runner indisponible"\}/);
  });
});
