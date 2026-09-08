import { describe, it, expect } from "vitest";
import { computeWellPreparedFromUnifiedPillars } from "../ExportTools";

/**
 * Bug réel corrigé (audit "estimations physiologiques", Cluster 2). Dans le
 * rapport PDF, la section "Well Prepared" (points forts) dérivait ses 4
 * piliers de `compassScores` (compassScoring.ts) — un 3ᵉ moteur de scoring
 * 4-axes totalement indépendant du moteur riche unifié (diagnostic.readiness
 * .potential.sources) déjà utilisé pour le score "Potentiel Physiologique"
 * en tête du même rapport (PR #153-155). Pour un même athlète
 * (VO2max=55, FTP/kg=3.5, VLamax=0.45, TTE=40min, 40 ans, IM/age_group),
 * mesuré en conditions réelles : Robustesse 100 (moteur unifié) vs 76
 * (compassScores), Profil Métabolique 27 (moteur unifié) vs 48
 * (compassScores) — un rapport PDF pouvait donc se contredire entre son
 * score global (moteur unifié) et ses "points forts" (compassScores).
 */

describe("computeWellPreparedFromUnifiedPillars", () => {
  it("liste 'Niveau de fraîcheur favorable' pour robustness=100 (comme le moteur unifié), pas pour compassScores=76 seul (les deux sont ≥70 ici, mais la magnitude réelle diffère)", () => {
    const unified = computeWellPreparedFromUnifiedPillars({
      aerobic: 100,
      tolerance: 100,
      metabolic: 27,
      robustness: 100,
    });
    expect(unified).toContain("Niveau de fraîcheur favorable — corps disponible.");
    // Profil Métabolique 27 < 70 → pas listé comme point fort
    expect(unified).not.toContain("Profil énergétique adapté à ton objectif.");
  });

  it("un pilier métabolique à 48 (proche du seuil mais toujours < 70) n'est pas listé comme point fort", () => {
    const result = computeWellPreparedFromUnifiedPillars({
      aerobic: 100,
      tolerance: 100,
      metabolic: 48,
      robustness: 76,
    });
    expect(result).not.toContain("Profil énergétique adapté à ton objectif.");
  });

  it("retourne le message de repli quand aucun pilier n'atteint le seuil de force (70)", () => {
    const result = computeWellPreparedFromUnifiedPillars({
      aerobic: 50,
      tolerance: 50,
      metabolic: 50,
      robustness: 50,
    });
    expect(result).toEqual(["Ta régularité d'entraînement reste ton meilleur atout — continue à construire la base."]);
  });

  it("retourne le message de repli quand les piliers sont absents (diagnostic non calculable)", () => {
    const result = computeWellPreparedFromUnifiedPillars(null);
    expect(result).toEqual(["Ta régularité d'entraînement reste ton meilleur atout — continue à construire la base."]);
  });

  it("liste les 4 points forts quand les 4 piliers dépassent le seuil", () => {
    const result = computeWellPreparedFromUnifiedPillars({
      aerobic: 90,
      tolerance: 90,
      metabolic: 90,
      robustness: 90,
    });
    expect(result).toHaveLength(4);
  });

  it("utilise un seuil strict >= 70 (69 exclu, 70 inclus)", () => {
    const below = computeWellPreparedFromUnifiedPillars({ aerobic: 69, tolerance: 50, metabolic: 50, robustness: 50 });
    expect(below).not.toContain("Capacité aérobie bien développée.");

    const atThreshold = computeWellPreparedFromUnifiedPillars({ aerobic: 70, tolerance: 50, metabolic: 50, robustness: 50 });
    expect(atThreshold).toContain("Capacité aérobie bien développée.");
  });
});
