import { describe, it, expect } from "vitest";
import { computeRaceSimulation } from "../raceSimulationTFCL";
import { computePacingEnvelopeRun } from "../pacingEnvelopeRunning";

/**
 * Bug réel corrigé (audit "simulation course/nutrition", suivi calibrage
 * scientifique). Avec les coefficients d'origine de FATIGUE_PARAMS
 * (0.8/0.6/0.5), `central_threshold` (70) était structurellement
 * inatteignable dans tous les scénarios : `central_fatigue_risk` valait 0
 * en permanence, sans exception, quel que soit l'athlète simulé.
 *
 * Première hypothèse écartée pendant la correction : calibrer sur un pire
 * cas théorique "zone RED sur 100% de la distance" surestimait le plafond
 * réellement atteignable. Un balayage exhaustif de `computeRaceSimulation`
 * (durabilité, VLamax, score de disponibilité, readiness RED, 3 distances,
 * 3 scénarios) montre que la zone RED n'est JAMAIS produite par les 3
 * scénarios générés — le scénario "AGGRESSIVE" plafonne volontairement sa
 * dernière ancre à `toleratedPct` (l'outil ne recommande jamais un pacing
 * qu'il qualifie lui-même d'insoutenable). Le pire cas RÉEL (coefficients
 * d'origine) est ~18 (10K) / ~14 (HM) / ~11 (MARATHON) sur 100, pas ~38/29/24.
 *
 * Aucune littérature ne fixe la valeur absolue de ces coefficients internes
 * — mis à l'échelle ×(95/18) en préservant le ratio relatif entre distances,
 * pour que le pire cas RÉELLEMENT atteignable du 10K (l'effort le plus
 * intense) approche la borne haute de l'échelle.
 */

const WORST_CASE = {
  vlamax_run_v2: 0.90,
  vo2max_run: 40,
  threshold_pace: 300,
  durability_index: 1,
  race_readiness_state: "RED" as const,
  race_readiness_score: 0,
  athlete_experience: "LOW" as const,
};

function simulate(distance: "10K" | "HM" | "MARATHON") {
  const envelope = computePacingEnvelopeRun({ distance, ...WORST_CASE });
  return computeRaceSimulation({
    distance,
    pacing_envelope: envelope,
    vlamax_run_v2: WORST_CASE.vlamax_run_v2,
    vo2max_run: WORST_CASE.vo2max_run,
    durability_index: WORST_CASE.durability_index,
    fatmax_intensity: null,
    race_readiness_state: WORST_CASE.race_readiness_state,
    race_readiness_score: WORST_CASE.race_readiness_score,
    threshold_pace_sec_km: WORST_CASE.threshold_pace,
    athlete_weight_kg: 70,
  });
}

describe("computeRaceSimulation (raceSimulationTFCL) — central_threshold (70) redevient atteignable", () => {
  it("10K, pire cas physiologique (durabilité min., VLamax élevée, disponibilité nulle) : franchit largement le seuil central (70)", () => {
    const result = simulate("10K");
    const maxFatigue = Math.max(...result.scenarios.flatMap((s) => s.fatigue_curve.map((p) => p.fatigue_index)));
    expect(maxFatigue).toBeGreaterThanOrEqual(90);
    expect(result.scenarios.some((s) => s.fatigue_curve.some((p) => p.central_fatigue_risk > 0))).toBe(true);
  });

  it("HM, même pire cas : franchit aussi le seuil central (70), de justesse", () => {
    const result = simulate("HM");
    const maxFatigue = Math.max(...result.scenarios.flatMap((s) => s.fatigue_curve.map((p) => p.fatigue_index)));
    expect(maxFatigue).toBeGreaterThanOrEqual(70);
  });

  it("MARATHON, même pire cas : reste sous le seuil central — cohérent avec la fatigue centrale/nerveuse documentée comme davantage associée aux efforts courts et intenses (la fatigue marathon reste modélisée séparément par glycogenCurve)", () => {
    const result = simulate("MARATHON");
    const maxFatigue = Math.max(...result.scenarios.flatMap((s) => s.fatigue_curve.map((p) => p.fatigue_index)));
    expect(maxFatigue).toBeLessThan(70);
    expect(maxFatigue).toBeGreaterThan(40); // la mise à l'échelle s'applique bien, juste insuffisante pour franchir 70
  });

  it("le pire cas ne dépasse jamais 100 (plafond de l'échelle respecté malgré la mise à l'échelle) pour les 3 distances", () => {
    for (const distance of ["10K", "HM", "MARATHON"] as const) {
      const result = simulate(distance);
      for (const scenario of result.scenarios) {
        for (const point of scenario.fatigue_curve) {
          expect(point.fatigue_index).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("un scénario bien géré (readiness GREEN, durabilité normale, VLamax basse) reste à fatigue faible malgré la mise à l'échelle — pas de sur-réaction généralisée", () => {
    const envelope = computePacingEnvelopeRun({
      distance: "MARATHON",
      vlamax_run_v2: 0.40,
      vo2max_run: 55,
      threshold_pace: 240,
      durability_index: 60,
      race_readiness_state: "GREEN",
      race_readiness_score: 85,
      athlete_experience: "HIGH",
    });
    const result = computeRaceSimulation({
      distance: "MARATHON",
      pacing_envelope: envelope,
      vlamax_run_v2: 0.40,
      vo2max_run: 55,
      durability_index: 60,
      fatmax_intensity: null,
      race_readiness_state: "GREEN",
      race_readiness_score: 85,
      threshold_pace_sec_km: 240,
      athlete_weight_kg: 70,
    });
    for (const scenario of result.scenarios) {
      const maxFatigue = Math.max(...scenario.fatigue_curve.map((p) => p.fatigue_index));
      expect(maxFatigue).toBeLessThan(70);
    }
  });
});
