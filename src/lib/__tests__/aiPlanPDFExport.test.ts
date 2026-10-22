import { describe, it, expect, vi } from "vitest";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";

/**
 * Retour coach (2026-10-22) : "Les PDF exportés semblent tronquer les
 * dernières semaines. Un plan de 34 semaines s'arrête visuellement au début
 * de la semaine 30." Diagnostic : `buildPlanHTML` (interne, non exporté)
 * génère bien la totalité des semaines (`plan.weeks.map(...)` sans aucune
 * troncature ni limite de page) — vérifié ici en interceptant le HTML
 * réellement transmis à `openPrintableHTML`. La cause la plus probable du
 * symptôme réel est côté CSS d'impression (`.week-block` était marqué
 * `page-break-inside: avoid` alors qu'une semaine chargée dépasse souvent
 * une page A4 — retiré, cf. aiPlanPDFExport.ts), pas la génération HTML
 * elle-même. En complément (consigne coach explicite "si le plan enregistré
 * est incomplet, le signaler clairement"), `computePlanExportCompleteness`
 * est désormais une garantie déterministe indépendante de tout rendu
 * navigateur.
 */
vi.mock("@/lib/openPrintableHTML", () => ({
  openPrintableHTML: vi.fn(),
}));

function makeSession(weekNumber: number, dayIndex: number, dayName: string, sport: string, title: string): ParsedSession {
  return {
    weekNumber,
    weekTheme: "Chantier",
    phase: "Chantier",
    dayName,
    dayIndex,
    sport,
    title,
    details: `${title} — 15min échauffement, corps de séance, 10min retour au calme.`,
    isRest: sport === "rest",
  };
}

function makeWeek(weekNumber: number): ParsedWeek {
  const days: Array<[number, string]> = [[0, "Lundi"], [1, "Mardi"], [2, "Mercredi"], [3, "Jeudi"], [4, "Vendredi"], [5, "Samedi"], [6, "Dimanche"]];
  const sessions = days.map(([dayIndex, dayName], i) =>
    i === 2
      ? makeSession(weekNumber, dayIndex, dayName, "rest", "Repos complet")
      : makeSession(weekNumber, dayIndex, dayName, i % 2 === 0 ? "Vélo" : "Course", `Séance S${weekNumber}-${dayName}`),
  );
  return { weekNumber, theme: `Semaine ${weekNumber}`, phase: "Chantier", sessions };
}

function makePlan(totalWeeks: number, weekNumbers: number[] = []): ParsedPlan {
  const numbers = weekNumbers.length > 0 ? weekNumbers : Array.from({ length: totalWeeks }, (_, i) => i + 1);
  return {
    title: "Plan TFCL™ — Ironman 70.3 Test — N semaines",
    phases: [{ name: "Chantier", weeks: `1-${totalWeeks}` }],
    weeks: numbers.map(makeWeek),
    totalWeeks,
  };
}

describe("computePlanExportCompleteness — garantie déterministe (indépendante du rendu navigateur)", () => {
  it("plan complet (34/34 semaines) : complete=true, aucune semaine manquante", async () => {
    const { computePlanExportCompleteness } = await import("@/lib/aiPlanPDFExport");
    const result = computePlanExportCompleteness(makePlan(34));
    expect(result).toEqual({ complete: true, expectedWeeks: 34, actualWeeks: 34, missingWeekNumbers: [] });
  });

  it("plan incomplet (34 attendues, seulement 1..29 présentes) : signale précisément les semaines manquantes", async () => {
    const { computePlanExportCompleteness } = await import("@/lib/aiPlanPDFExport");
    const weekNumbers = Array.from({ length: 29 }, (_, i) => i + 1); // 1..29
    const result = computePlanExportCompleteness(makePlan(34, weekNumbers));
    expect(result.complete).toBe(false);
    expect(result.actualWeeks).toBe(29);
    expect(result.expectedWeeks).toBe(34);
    expect(result.missingWeekNumbers).toEqual([30, 31, 32, 33, 34]);
  });

  it("plan avec un trou au milieu (semaine 15 manquante) : la détecte, pas seulement un comptage global", async () => {
    const { computePlanExportCompleteness } = await import("@/lib/aiPlanPDFExport");
    const weekNumbers = Array.from({ length: 34 }, (_, i) => i + 1).filter((n) => n !== 15);
    const result = computePlanExportCompleteness(makePlan(34, weekNumbers));
    expect(result.complete).toBe(false);
    expect(result.missingWeekNumbers).toEqual([15]);
  });
});

describe("exportAIPlanToPDF — le HTML généré contient réellement toutes les semaines (plan long, 34 semaines)", () => {
  it("génère un document contenant les 34 blocs de semaine, de S1 à S34, sans troncature", async () => {
    const { exportAIPlanToPDF } = await import("@/lib/aiPlanPDFExport");
    const { openPrintableHTML } = await import("@/lib/openPrintableHTML");
    const plan = makePlan(34);

    exportAIPlanToPDF(plan, "Athlète Test", new Date("2026-01-05"), [], "landscape", "full");

    const mockFn = openPrintableHTML as unknown as ReturnType<typeof vi.fn>;
    expect(mockFn).toHaveBeenCalledTimes(1);
    const html = mockFn.mock.calls[0][0] as string;

    expect((html.match(/class="week-block"/g) || []).length).toBe(34);
    for (let n = 1; n <= 34; n++) {
      expect(html, `Semaine ${n} absente du document généré`).toContain(`Semaine ${n} —`);
    }
    // Pas de bannière "plan incomplet" quand le plan est effectivement complet.
    expect(html).not.toContain("PLAN INCOMPLET");
  });

  it("affiche une bannière d'avertissement visible (jamais masquée en impression) quand le plan passé à l'export est incomplet", async () => {
    const { exportAIPlanToPDF } = await import("@/lib/aiPlanPDFExport");
    const { openPrintableHTML } = await import("@/lib/openPrintableHTML");
    const weekNumbers = Array.from({ length: 29 }, (_, i) => i + 1);
    const plan = makePlan(34, weekNumbers);

    exportAIPlanToPDF(plan, "Athlète Test", new Date("2026-01-05"), [], "landscape", "full");

    const mockFn = openPrintableHTML as unknown as ReturnType<typeof vi.fn>;
    const html = mockFn.mock.calls[mockFn.mock.calls.length - 1][0] as string;
    expect(html).toContain("PLAN INCOMPLET");
    expect(html).toContain("29/34");
    // La bannière ne doit pas porter la classe "no-print" (qui la
    // masquerait précisément dans le document imprimé/PDF).
    const bannerIdx = html.indexOf("PLAN INCOMPLET");
    const beforeBanner = html.slice(Math.max(0, bannerIdx - 400), bannerIdx);
    const lastDivOpen = beforeBanner.lastIndexOf("<div");
    expect(beforeBanner.slice(lastDivOpen)).not.toContain("no-print");
  });

  it("ne marque plus .week-block comme page-break-inside:avoid (risque identifié de pagination dégradée sur un plan long)", async () => {
    const { exportAIPlanToPDF } = await import("@/lib/aiPlanPDFExport");
    const { openPrintableHTML } = await import("@/lib/openPrintableHTML");
    exportAIPlanToPDF(makePlan(5), "Athlète Test", new Date("2026-01-05"), [], "landscape", "full");

    const mockFn = openPrintableHTML as unknown as ReturnType<typeof vi.fn>;
    const html = mockFn.mock.calls[mockFn.mock.calls.length - 1][0] as string;
    const weekBlockRuleStart = html.indexOf(".week-block {");
    const weekBlockRuleEnd = html.indexOf("}", weekBlockRuleStart);
    const rule = html.slice(weekBlockRuleStart, weekBlockRuleEnd);
    expect(rule).not.toContain("page-break-inside");
    expect(rule).not.toContain("break-inside");
  });
});
