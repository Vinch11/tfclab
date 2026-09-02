import { describe, it, expect } from "vitest";
import { buildMarkdownFromPlan } from "../AITrainingPlanPage";
import type { ParsedPlan } from "@/lib/aiPlanParser";

/**
 * Bug réel signalé par le coach : "quand je sauvegarde une nouvelle semaine
 * régénérée elle n'est pas sauvegardée, c'est l'ancien programme qui est
 * sauvegardé". Cause : `persistPlanVersion` écrivait `_markdown: response` —
 * la réponse IA BRUTE de la DERNIÈRE génération COMPLÈTE, jamais mise à jour
 * par une régénération semaine-par-semaine ou de fenêtre (qui ne touchent
 * que `planOverride`/`parsedPlan`, jamais `response`). Au rechargement d'une
 * version sauvegardée, `_markdown` est prioritaire sur `plan_json.weeks` —
 * donc la semaine régénérée "disparaissait" au rechargement même si le
 * tableau `weeks` en base était correct. `buildMarkdownFromPlan` reconstruit
 * `_markdown` depuis `parsedPlan` (toujours à jour) au lieu de faire
 * confiance à `response` (périmé après une régénération partielle).
 */
function makePlan(overrides: Partial<ParsedPlan> = {}): ParsedPlan {
  return {
    title: "Plan TFCL™ — 70.3 LCW Cath — 7 semaines",
    phases: [],
    totalWeeks: 1,
    weeks: [
      {
        weekNumber: 1,
        theme: "Fondation",
        phase: "Bloc 1",
        sessions: [
          { weekNumber: 1, weekTheme: "Fondation", phase: "Bloc 1", dayName: "Lundi", dayIndex: 0, sport: "Repos", title: "Repos", details: "", isRest: true },
          { weekNumber: 1, weekTheme: "Fondation", phase: "Bloc 1", dayName: "Mardi", dayIndex: 1, sport: "Vélo", title: "SFR", details: "70min Z3", isRest: false },
        ],
      },
    ],
    ...overrides,
  };
}

describe("buildMarkdownFromPlan — régénère le markdown depuis le plan réel, pas une réponse IA périmée", () => {
  it("reflète le contenu ACTUEL du plan (ex: une séance régénérée), pas un texte figé", () => {
    const regeneratedPlan = makePlan();
    regeneratedPlan.weeks[0].sessions[1] = {
      ...regeneratedPlan.weeks[0].sessions[1],
      title: "🔑 LCW Long Bike SAT",
      details: "180min Z2-Z3 race pace",
    };
    const md = buildMarkdownFromPlan(regeneratedPlan);
    expect(md).toMatch(/LCW Long Bike SAT/);
    expect(md).not.toMatch(/SFR/);
  });

  it("inclut le titre H1 et le thème de chaque semaine", () => {
    const md = buildMarkdownFromPlan(makePlan());
    expect(md).toMatch(/^# Plan TFCL™ — 70\.3 LCW Cath — 7 semaines/);
    expect(md).toMatch(/### Semaine 1 — Fondation/);
  });

  it("produit un tableau exploitable (une ligne par séance active + repos)", () => {
    const md = buildMarkdownFromPlan(makePlan());
    expect(md).toMatch(/\| Jour \| Sport \| Séance \| Détails \|/);
    expect(md).toMatch(/\| Lundi \| Repos \| Repos \|/);
    expect(md).toMatch(/\| Mardi \| Vélo \| SFR \| 70min Z3 \|/);
  });
});
