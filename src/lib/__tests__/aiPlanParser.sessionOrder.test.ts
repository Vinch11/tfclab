import { describe, it, expect } from "vitest";
import { parseAIPlan } from "../aiPlanParser";

/**
 * Bug réel signalé par le coach (capture d'écran) : les jours d'une semaine
 * s'affichaient dans un ordre incohérent (Lundi, Dimanche, Mardi, Samedi,
 * Mercredi...). Sur le chemin Markdown legacy, les lignes du tableau généré
 * par l'IA ne sont pas garanties dans l'ordre chronologique des jours —
 * `flushWeek` recopiait `pendingSessions` tel quel, dans l'ordre des lignes
 * reçues, sans jamais trier par `dayIndex`.
 */
function buildWeekBlockOutOfOrder(weekNumber: number): string {
  return `### Semaine ${weekNumber} — Test
| Jour | Sport | Séance | Détails |
|------|-------|--------|---------|
| Lundi | Repos | Repos complet | Récupération. |
| Dimanche | CAP | Long run jambes fatiguées (LCW) | Détails. |
| Mardi | Natation | Natation CSS | Détails. |
| Samedi | Vélo | Long ride race-pace (LCW) | Détails. |
| Mercredi | CAP | CAP Allure 70.3 | Détails. |
`;
}

describe("parseAIPlan — ordre chronologique des séances (bug réel coach)", () => {
  it("réordonne des lignes de tableau reçues dans le désordre en ordre chronologique (dayIndex croissant)", () => {
    const markdown = `# Plan TFCL™ — 70.3 LCW Test — 1 semaine

${buildWeekBlockOutOfOrder(1)}
`;
    const plan = parseAIPlan(markdown);
    const week1 = plan.weeks.find(w => w.weekNumber === 1)!;
    expect(week1.sessions.map(s => s.dayIndex)).toEqual([0, 1, 2, 5, 6]);
    expect(week1.sessions.map(s => s.dayName)).toEqual([
      "Lundi", "Mardi", "Mercredi", "Samedi", "Dimanche",
    ]);
  });
});
