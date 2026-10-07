import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalyseSection } from "../AnalyseSection";
import type { AthleteDiagnostic } from "@/engines/diagnostic";

/**
 * Bug réel (retour coach, captures d'écran de l'app en prod) : la carte
 * "Analyse" affichait un titre "Profil équilibré — Prêt" (dérivé du score de
 * readiness canonique) juste à côté d'un badge de score "54/100 — À
 * développer" — un deuxième score recalculé localement à partir d'une
 * moyenne des gaps, avec ses propres seuils, totalement indépendant du
 * premier. Les deux décrivent le même diagnostic mais peuvent se
 * contredire. Le badge doit utiliser le même score (synthesis.globalScore)
 * et la même catégorie (synthesis.globalCategory) que le headline.
 */

type GapOverrides = {
  value?: number | null;
  target?: number;
  gap?: number;
  gapPercent?: number;
  status?: "optimal" | "acceptable" | "limiting" | "unknown";
  weight?: number;
  weightedImpact?: number;
};

function buildGap(metric: string, overrides: GapOverrides = {}) {
  return {
    metric,
    value: 50,
    target: 50,
    gap: 0,
    gapPercent: 0,
    status: "optimal" as const,
    weight: 0.2,
    weightedImpact: 0,
    ...overrides,
  };
}

function buildDiagnostic(overrides: {
  headline: string;
  globalScore: number;
  globalCategory: "critical" | "developing" | "solid" | "ready";
  gapAnalysis?: ReturnType<typeof buildGap>[];
}): AthleteDiagnostic {
  const gapAnalysis = overrides.gapAnalysis ?? [
    buildGap("VO2max"),
    buildGap("VMA"),
    buildGap("VLamax"),
    buildGap("TTE"),
  ];

  return {
    athleteId: "test-athlete",
    objectif: "10K",
    ambition: "competitor",
    sportFocus: "run",
    effectifs: {},
    limiter: {
      gapAnalysis,
      primaryLimiter: "none",
      limiterLabel: "Profil équilibré",
    },
    readiness: {},
    targets: {
      current: {},
      vlamaxRange: { min: 0.2, optimal: 0.3, max: 0.4 },
      adjustedForAge: false,
    },
    injuryRisk: { run: null, bike: null },
    runMLSS: null,
    raceChronoEstimate: null,
    synthesis: {
      headline: overrides.headline,
      priorities: { L1: { limiter: "none", lever: "maintain", label: "" }, L2: null },
      globalScore: overrides.globalScore,
      globalCategory: overrides.globalCategory,
      alerts: [],
      strengths: [],
    },
    _rawInput: {},
    meta: {
      timestamp: "2026-01-01T00:00:00.000Z",
      version: "test",
      confidenceGlobal: 1,
      dataCompleteness: 0.8,
      disclaimer: "",
    },
  } as unknown as AthleteDiagnostic;
}

describe("AnalyseSection — cohérence headline / score (pas de double scoring contradictoire)", () => {
  it('"Profil équilibré — Prêt" (readiness ready) affiche le MÊME score que globalScore, pas un score recalculé localement', () => {
    const diagnostic = buildDiagnostic({
      headline: "Profil équilibré — Prêt",
      globalScore: 82,
      globalCategory: "ready",
    });

    render(<AnalyseSection diagnostic={diagnostic} />);

    expect(screen.getByText("Profil équilibré — Prêt")).toBeInTheDocument();
    expect(screen.getByText("82")).toBeInTheDocument();
    // Catégorie "ready" → ne doit jamais afficher le libellé "À développer"
    // (le bug exact rapporté : titre "Prêt" + badge "À développer").
    expect(screen.queryByText("À développer")).not.toBeInTheDocument();
  });

  it('un readiness "developing" affiche bien "À développer", pas une tonalité positive contradictoire', () => {
    const diagnostic = buildDiagnostic({
      headline: "Profil équilibré — En progression",
      globalScore: 54,
      globalCategory: "developing",
    });

    render(<AnalyseSection diagnostic={diagnostic} />);

    expect(screen.getByText("Profil équilibré — En progression")).toBeInTheDocument();
    expect(screen.getByText("54")).toBeInTheDocument();
    expect(screen.getByText("À développer")).toBeInTheDocument();
    expect(screen.queryByText("Au-dessus")).not.toBeInTheDocument();
  });

  it("aucune métrique mesurée → affiche « — » plutôt qu'un score inventé", () => {
    const diagnostic = buildDiagnostic({
      headline: "Profil équilibré — En progression",
      globalScore: 50,
      globalCategory: "developing",
      gapAnalysis: [
        buildGap("VO2max", { value: null, status: "unknown" }),
        buildGap("VMA", { value: null, status: "unknown" }),
      ],
    });

    render(<AnalyseSection diagnostic={diagnostic} />);

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.queryByText("50")).not.toBeInTheDocument();
  });
});
