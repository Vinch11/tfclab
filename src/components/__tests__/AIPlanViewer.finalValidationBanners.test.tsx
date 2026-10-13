import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ParsedPlan } from "@/lib/aiPlanParser";

/**
 * Audit scientifique P0 — F12 / Priorité 1 (coach). Tests d'intégration du
 * RENDU : vérifie que les bandeaux de validation finale (B13 critique/B14
 * avertissement) et les anomalies sportObjectiveIssues/weeklyQuotaIssues
 * apparaissent réellement dans le DOM de la page vue par le coach — pas
 * seulement calculés puis oubliés (cf. constat fait sur sportObjectiveIssues/
 * weeklyQuotaIssues, jamais rendus avant ce lot).
 *
 * Ces bandeaux sont INFORMATIFS : aucune action du coach n'est bloquée par
 * leur seule présence (le blocage réel, pour les incohérences critiques,
 * a lieu séparément au moment de la sauvegarde — cf. handleSaveToPlan /
 * criticalIssuesDialog, qui reste hors de portée de ce composant).
 */
vi.mock("@/contexts/CloudDataContext", () => ({
  useCloudDataContext: () => ({ athletes: [], snapshots: [] }),
}));

import { AIPlanViewer } from "../AIPlanViewer";

function makePlan(overrides: Partial<ParsedPlan> = {}): ParsedPlan {
  return {
    title: "Plan TFCL™ — 10K Test Athlete — 1 semaine",
    phases: [],
    totalWeeks: 1,
    weeks: [
      {
        weekNumber: 1,
        theme: "Base",
        phase: "base",
        sessions: [
          {
            weekNumber: 1, weekTheme: "Base", phase: "base", dayName: "Lundi", dayIndex: 0,
            sport: "Course", title: "EF Z2 45min", details: "Endurance fondamentale", isRest: false,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("AIPlanViewer — bandeaux de validation (rendu réel)", () => {
  it("affiche un bandeau BLOQUANT-LANGAGE pour une incohérence B13 critique, sans jamais prétendre bloquer une action du composant", () => {
    const plan = makePlan({
      finalValidationIssues: [
        { rule: "final_validation_critical", severity: "error", message: "S1 : catalogId \"X\" utilisé 2× dans la même semaine (post-mutations) — dédoublonnage défait après coup." },
      ],
    });
    render(<AIPlanViewer plan={plan} />);
    expect(screen.getByText(/Incohérence critique détectée/i)).toBeInTheDocument();
    expect(screen.getByText(/utilisé 2×/)).toBeInTheDocument();
  });

  it("affiche un bandeau NEUTRE (non bloquant) pour un avertissement B14 seul", () => {
    const plan = makePlan({
      finalValidationIssues: [
        { rule: "final_validation_phase_mismatch", severity: "warning", message: "S1 (phase actuelle: taper) : \"BUILD_ONLY_RUN\" n'est valide que pour [build]." },
      ],
    });
    render(<AIPlanViewer plan={plan} />);
    expect(screen.getByText(/avertissement/i)).toBeInTheDocument();
    expect(screen.queryByText(/Incohérence critique détectée/i)).not.toBeInTheDocument();
  });

  it("n'affiche aucun bandeau de validation finale quand finalValidationIssues est vide/absent", () => {
    const plan = makePlan();
    render(<AIPlanViewer plan={plan} />);
    expect(screen.queryByText(/Incohérence critique détectée/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/validation finale/i)).not.toBeInTheDocument();
  });

  it("Priorité 1 — rend visible sportObjectiveIssues (jusqu'ici calculé mais jamais affiché)", () => {
    const plan = makePlan({
      sportObjectiveIssues: [
        { severity: "critical", weekNumber: 2, dayName: "Mardi", reason: "Natation détectée dans un plan running sans objectif triathlon secondaire.", title: "Séance natation", offendingId: null },
      ],
    });
    render(<AIPlanViewer plan={plan} />);
    expect(screen.getByText(/Natation détectée dans un plan running/)).toBeInTheDocument();
  });

  it("Priorité 1 — rend visible weeklyQuotaIssues (jusqu'ici calculé mais jamais affiché)", () => {
    const plan = makePlan({
      weeklyQuotaIssues: [
        { severity: "warning", code: "quota_range_drift", weekNumber: 3, reason: "Volume hebdomadaire S3 hors fourchette attendue.", expected: "6-8h", observed: "4h" },
      ],
    });
    render(<AIPlanViewer plan={plan} />);
    expect(screen.getByText(/Volume hebdomadaire S3 hors fourchette/)).toBeInTheDocument();
  });
});
