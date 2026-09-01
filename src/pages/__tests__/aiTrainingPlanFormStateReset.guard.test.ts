import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Garde-fou de régression pour le bug corrigé en PR #66 (fuite de champs de
// formulaire entre athlètes — cause racine du plan catastrophique régénéré
// pour Cath : `constraints`/`raceGoals` d'un athlète précédemment consulté
// se retrouvaient appliqués au suivant, parce que le champ n'était restauré
// depuis `savedState` QUE "si présent", sans réinitialisation par défaut
// sinon).
//
// Ce test ne peut pas monter le composant (page React massive, non testée
// jusqu'ici — cf. notes des PR #65/#66). Il vérifie à la place, en lisant le
// SOURCE de l'effet de restauration au changement d'athlète, l'invariant
// structurel que le fix a établi : tout champ restauré conditionnellement
// depuis `savedState.<champ>` DOIT aussi être remis à sa valeur par défaut
// dans le bloc inconditionnel qui précède — sinon un futur champ ajouté par
// un dev réintroduit exactement la même fuite silencieusement.
describe("AITrainingPlanPage — garde-fou anti-régression : reset des champs formulaire au changement d'athlète", () => {
  const source = readFileSync(
    join(__dirname, "../AITrainingPlanPage.tsx"),
    "utf-8",
  );

  const startMarker = "// Réinitialise TOUJOURS chaque champ du formulaire";
  const midMarker = "if (savedState) {";
  const endMarker = "// Ancrage calendaire";

  const startIdx = source.indexOf(startMarker);
  const midIdx = source.indexOf(midMarker, startIdx);
  const endIdx = source.indexOf(endMarker, midIdx);

  it("les trois marqueurs d'ancrage sont bien présents dans le fichier (sinon ce test ne garde plus rien)", () => {
    expect(startIdx, "marqueur de début (bloc reset inconditionnel) introuvable — le fix PR #66 a-t-il été déplacé/renommé ?").toBeGreaterThan(-1);
    expect(midIdx, "marqueur 'if (savedState) {' introuvable après le bloc reset").toBeGreaterThan(startIdx);
    expect(endIdx, "marqueur de fin ('// Ancrage calendaire') introuvable après le bloc savedState").toBeGreaterThan(midIdx);
  });

  const unconditionalBlock = startIdx > -1 ? source.slice(startIdx, midIdx) : "";
  const conditionalBlock = midIdx > -1 ? source.slice(midIdx, endIdx) : "";

  // Champs de PAGE (pas de formulaire coach) volontairement exclus de cette
  // règle : leur restauration/reset suit une logique dédiée, distincte,
  // documentée juste après ce bloc (hasLocalPlan / hasDraft / reset()).
  const EXEMPT_SETTERS = new Set(["setResponse"]);

  function extractSetterCalls(block: string): Set<string> {
    const found = new Set<string>();
    const re = /\bset[A-Z]\w*\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(block))) {
      found.add(m[0].replace(/\s*\($/, ""));
    }
    return found;
  }

  it("tout champ restauré depuis `savedState` a un reset par défaut inconditionnel correspondant", () => {
    expect(conditionalBlock.length, "bloc conditionnel vide — les marqueurs n'ont pas isolé le bon extrait").toBeGreaterThan(0);
    expect(unconditionalBlock.length, "bloc inconditionnel vide — les marqueurs n'ont pas isolé le bon extrait").toBeGreaterThan(0);

    const settersRestoredFromSavedState = extractSetterCalls(conditionalBlock);
    const settersResetUnconditionally = extractSetterCalls(unconditionalBlock);

    const missing = [...settersRestoredFromSavedState].filter(
      (setter) => !EXEMPT_SETTERS.has(setter) && !settersResetUnconditionally.has(setter),
    );

    expect(
      missing,
      `Champ(s) restauré(s) depuis savedState sans reset par défaut correspondant : ${missing.join(", ")}. ` +
      `Sans ce reset, la valeur laissée par l'athlète précédemment consulté fuite silencieusement vers ` +
      `le suivant (bug PR #66 — plan catastrophique de Cath).`,
    ).toEqual([]);

    // Sanity check positif : on doit bien trouver plusieurs champs des deux
    // côtés (sinon les regex/marqueurs se sont juste mis d'accord sur du
    // vide et le test ci-dessus passerait à tort).
    expect(settersRestoredFromSavedState.size).toBeGreaterThan(10);
    expect(settersResetUnconditionally.size).toBeGreaterThan(10);
  });
});
