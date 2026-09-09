/**
 * Fix C5 (audit "génération de plan IA", volet taper) : deux règles de
 * annotationEngineV2.ts détectaient chacune leur propre fenêtre de taper
 * IM — IM-TAPER-1 (niveau semaine) utilisait 4 semaines, la règle
 * SESSION-LEVEL (isTaperWeek) en utilisait 2 — aucune ne correspondant au
 * taper canonique IM (3 semaines, TAPER_WEEKS_BY_OBJECTIVE.IM,
 * sessionSizingMatrix.ts). Ce test prouve la règle IM-TAPER-1 (niveau
 * semaine) sur un plan de 10 semaines, où S7 et S8 divergent entre
 * l'ancien seuil (4 semaines) et le nouveau (3, canonique).
 */
import { describe, it, expect } from "vitest";
import { generateTemplateAnnotationsV2, type AthleteSignalsV2 } from "@/lib/annotationEngineV2";
import type { TemplateWeek } from "@/lib/templates/docxTemplateLoader";

function longSession(day: string): TemplateWeek["sessions"][number] {
  return { day, sport: "bike", title: "Sortie longue Z2", details: "3h continue en Z2", durationMin: 180 };
}

function makeWeeks(totalWeeks: number, targetWeek: number): TemplateWeek[] {
  return Array.from({ length: totalWeeks }, (_, i) => {
    const weekNumber = i + 1;
    return {
      weekNumber,
      sessions: weekNumber === targetWeek ? [longSession("Lundi"), longSession("Mercredi")] : [],
    };
  });
}

const BASE_SIGNALS: AthleteSignalsV2 = {
  objectif: "Ironman",
  vlamax: null,
  tte: null,
  ftpKg: null,
  tss7d: null,
};

describe("annotationEngineV2 — taper IM unifié sur 3 semaines canoniques (fix C5)", () => {
  it("plan de 10 semaines, S7 (hors taper canonique IM=3 sem, S8-S10) : volume élevé NON signalé comme problème d'affûtage", () => {
    const result = generateTemplateAnnotationsV2({
      templateId: "kona-age-group",
      athleteSignals: BASE_SIGNALS,
      weeks: makeWeeks(10, 7),
    });
    // Avant le fix : IM-TAPER-1 utilisait totalWeeks-4=6, donc S7 (>6) était
    // déjà classée taper à tort — 2 sorties longues y déclenchaient l'alerte.
    expect(result.some(a => a.title === "Affûtage IM: volume trop haut")).toBe(false);
  });

  it("plan de 10 semaines, S8 (dans le taper canonique IM=3 sem, S8-S10) : volume élevé signalé comme problème d'affûtage", () => {
    const result = generateTemplateAnnotationsV2({
      templateId: "kona-age-group",
      athleteSignals: BASE_SIGNALS,
      weeks: makeWeeks(10, 8),
    });
    expect(result.some(a => a.title === "Affûtage IM: volume trop haut")).toBe(true);
  });
});
