import { describe, it, expect } from "vitest";
import { buildUserPrompt } from "../../../../supabase/functions/ai-training-plan/promptHelpers";

/**
 * Audit nutrition/multi-objectifs (suite de l'audit "cohérence placement des
 * séances") : dans le bloc multi-objectifs, la ligne "La DERNIÈRE semaine du
 * plan DOIT être la SEMAINE DE COURSE" était émise pour CHAQUE objectif daté
 * (A, B, C), sans distinction — contredisant directement les règles
 * multi-objectifs plus bas dans le même prompt ("Objectif B = mini-taper
 * 7-10j, ne pas sacrifier A"). Une course B en milieu de plan pouvait donc se
 * voir prescrire un taper/pic complet de fin de plan à la place de la
 * course A réelle.
 */
function makeConfig(raceGoals: any[]) {
  return {
    objective: raceGoals[0]?.objective,
    planStartDate: "2026-01-05", // lundi
    raceGoals,
  };
}

describe("buildUserPrompt — multi-objectifs : une seule course est la 'dernière semaine du plan'", () => {
  it("une course B en milieu de plan N'EST PAS annoncée comme la dernière semaine du plan", () => {
    const config = makeConfig([
      { objective: "Marathon", raceName: "Marathon A", raceDate: "2026-06-01", priority: "A" },
      { objective: "10K", raceName: "10K B", raceDate: "2026-03-02", priority: "B" },
    ]);
    const prompt = buildUserPrompt({}, config);

    // La course A (dernière chronologiquement) reste bien annoncée comme la
    // dernière semaine du plan, avec un taper complet.
    expect(prompt).toMatch(/DERNIÈRE semaine du plan.*taper complet/is);

    // La course B (milieu de plan) ne doit JAMAIS être annoncée comme la
    // dernière semaine du plan. `sortedGoals` trie chronologiquement (B, la
    // course la plus proche, passe en premier) — on retrouve sa section par
    // son objectif ("10K"), pas par un index supposé.
    const bSectionMatch = prompt.match(/\*\*Objectif \d+[\s\S]*?10K[\s\S]*?(?=\*\*Objectif|\n\n###|$)/);
    expect(bSectionMatch, "section Objectif B (10K) introuvable dans le prompt").not.toBeNull();
    const bSection = bSectionMatch![0];
    // Signature unique de la forme positive ("... DOIT être la SEMAINE DE
    // COURSE avec : taper complet") — exactement le bug corrigé, distincte
    // de la négation qu'on attend maintenant ("CE N'EST PAS la dernière
    // semaine du plan"), qui contient elle aussi la sous-chaîne "dernière
    // semaine du plan" et ne peut donc pas servir de test négatif direct.
    expect(bSection).not.toMatch(/DOIT être la SEMAINE DE COURSE avec\s*:\s*taper complet/i);
    expect(bSection).toMatch(/CE N'EST PAS la dernière semaine du plan/i);
    expect(bSection).toMatch(/mini-taper/i);
  });

  it("avec un seul objectif (pas de multi-objectifs), la course reste bien 'la dernière semaine du plan' avec taper complet", () => {
    const config = makeConfig([
      { objective: "Marathon", raceName: "Marathon A", raceDate: "2026-06-01", priority: "A" },
    ]);
    const prompt = buildUserPrompt({}, config);
    expect(prompt).toMatch(/DERNIÈRE semaine du plan.*taper complet/is);
    expect(prompt).not.toMatch(/CE N'EST PAS la dernière semaine du plan/i);
  });
});
