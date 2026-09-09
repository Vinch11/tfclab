import { describe, it, expect } from "vitest";
import { isLcwWeekendExemptWeek } from "../AITrainingPlanPage";

/**
 * Fix D3 (audit "génération de plan IA") : l'exemption du rappel de prompt
 * "week-end signature LCW" (régénération d'une semaine seule) reposait
 * uniquement sur le mot-clé libre "fondation" dans le thème généré par
 * l'IA. Si ce thème ne contient pas ce mot exact, une semaine Base pouvait
 * se voir imposer à tort le week-end signature LCW alors que
 * `week.phase === "base"` (valeur canonique) était déjà disponible.
 */
describe("isLcwWeekendExemptWeek (fix D3)", () => {
  it("exempte une semaine Base même si le thème IA ne contient PAS le mot 'fondation'", () => {
    expect(isLcwWeekendExemptWeek({ theme: "Semaine 1 — Reprise en douceur", phase: "base", sessions: [] })).toBe(true);
  });

  it("continue d'exempter via le mot-clé libre 'fondation' (comportement pré-existant préservé)", () => {
    expect(isLcwWeekendExemptWeek({ theme: "Bloc 1 · Fondation", phase: "Bloc 1", sessions: [] })).toBe(true);
  });

  it("continue d'exempter taper/décharge/repos/semaine de course via le texte libre", () => {
    expect(isLcwWeekendExemptWeek({ theme: "Affûtage -2", phase: "taper", sessions: [] })).toBe(true);
    expect(isLcwWeekendExemptWeek({ theme: "Décharge", phase: "build", sessions: [] })).toBe(true);
    expect(isLcwWeekendExemptWeek({ theme: "Semaine de course", phase: "race", sessions: [] })).toBe(true);
  });

  it("N'exempte PAS une semaine Build/Peak/Chantier (doit recevoir le rappel LCW)", () => {
    expect(isLcwWeekendExemptWeek({ theme: "Chantier LCW", phase: "build", sessions: [] })).toBe(false);
    expect(isLcwWeekendExemptWeek({ theme: "Spécifique LCW & Race Power", phase: "peak", sessions: [] })).toBe(false);
  });

  it("détecte 'course objectif' ou 🏁 dans une session comme une semaine de course, même sans thème/phase explicite", () => {
    expect(isLcwWeekendExemptWeek({
      theme: "Semaine 12",
      phase: "peak",
      sessions: [{ title: "🏁 Jour J", details: "" } as never],
    })).toBe(true);
  });

  it("gère un thème/phase vide sans planter", () => {
    expect(isLcwWeekendExemptWeek({ theme: "", phase: "", sessions: [] })).toBe(false);
  });
});
