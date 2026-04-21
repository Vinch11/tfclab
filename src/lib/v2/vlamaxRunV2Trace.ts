/**
 * vlamaxRunV2Trace — Construit la trace pédagogique étape par étape
 * du calcul VLamax CAP V2 Enhanced à partir d'un snapshot brut.
 *
 * Utilisé par CalculationTraceDisplay pour rendre transparente la chaîne
 * de transformations VMA → ratio → VLamax_pace, P5s/P30s → Score G → VLamax,
 * et la fusion finale.
 */

import {
  computeVLamaxRunV2Enhanced,
  type VLamaxRunV2EnhancedInput,
  type VLamaxRunV2EnhancedResult,
} from "./vlamaxRunV2Enhanced";
import type { CalculationStep } from "@/components/CalculationTraceDisplay";

export interface VLamaxRunTraceBundle {
  result: VLamaxRunV2EnhancedResult;
  steps: CalculationStep[];
}

export function buildVLamaxRunV2Trace(input: VLamaxRunV2EnhancedInput): VLamaxRunTraceBundle {
  const result = computeVLamaxRunV2Enhanced(input);
  const c = result.components;
  const steps: CalculationStep[] = [];

  // ── ÉTAPE 1: Données entrantes
  if (input.vma) {
    steps.push({
      step: "VMA renseignée",
      value: input.vma,
      unit: "km/h",
    });
  }
  if (input.paceThresholdSecPerKm) {
    const min = Math.floor(input.paceThresholdSecPerKm / 60);
    const sec = Math.round(input.paceThresholdSecPerKm % 60);
    steps.push({
      step: "Allure seuil",
      value: `${min}:${sec.toString().padStart(2, "0")}`,
      unit: "/km",
      formula: `${input.paceThresholdSecPerKm}s/km`,
    });
  }

  // ── ÉTAPE 2: Cross-validation VMA / Seuil
  if (c?.vma_seuil_ratio !== null && c?.vma_seuil_ratio !== undefined) {
    const paceKmh = input.paceThresholdSecPerKm ? 3600 / input.paceThresholdSecPerKm : 0;
    steps.push({
      step: "Allure seuil convertie",
      value: paceKmh,
      unit: "km/h",
      formula: "3600 / pace_sec_per_km",
    });
    steps.push({
      step: "Ratio Seuil/VMA",
      value: c.vma_seuil_ratio,
      formula: "vitesse_seuil / VMA",
    });
    if (c.vlamax_from_pace !== null) {
      steps.push({
        step: "VLamax estimée (allure)",
        value: c.vlamax_from_pace,
        unit: "mmol/L/s",
        formula: "0.20 + 0.70 × clamp((0.92 − ratio) / 0.20)",
      });
    }
  }

  // ── ÉTAPE 3: Score G puissance running
  if (c?.scoreG !== null && c?.scoreG !== undefined) {
    if (c.r5 !== null) {
      steps.push({ step: "Ratio P5s / RPT", value: c.r5, formula: "P5s_W / runPowerThreshold" });
    }
    if (c.r30 !== null) {
      steps.push({ step: "Ratio P30s / RPT", value: c.r30, formula: "P30s_W / runPowerThreshold" });
    }
    if (c.r60 !== null) {
      steps.push({ step: "Ratio P60s / RPT", value: c.r60, formula: "P60s_W / runPowerThreshold" });
    }
    if (c.rfm !== null) {
      steps.push({ step: "Ratio RPT / P5min", value: c.rfm, formula: "runPowerThreshold / P5min_W" });
    }
    steps.push({
      step: "Score G global (puissance)",
      value: c.scoreG,
      formula: "Σ wᵢ × Sᵢ (P5s, P30s, P60s, P5min, TTE)",
    });
    if (c.vlamax_from_scoreG !== null) {
      steps.push({
        step: "VLamax estimée (puissance)",
        value: c.vlamax_from_scoreG,
        unit: "mmol/L/s",
        formula: "0.20 + 0.70 × Score G",
      });
    }
  }

  // ── ÉTAPE 4: Fusion
  if (c) {
    const fusionLabel: Record<string, string> = {
      dual_validation: "Fusion : VMA/Seuil (40%) + Score G (60%)",
      scoreG_only: "Score G seul (VMA absente)",
      pace_only: "Allure seule (puissance absente)",
      insufficient: "Données insuffisantes",
    };
    steps.push({
      step: fusionLabel[c.fusion_method] ?? "Fusion",
      value: c.vlamax_final,
      unit: "mmol/L/s",
      formula: c.fusion_method === "dual_validation"
        ? "0.40 × VLamax_pace + 0.60 × VLamax_scoreG"
        : c.fusion_method === "pace_only"
          ? "= VLamax_pace"
          : "= VLamax_scoreG",
    });
    if (c.divergence !== null) {
      steps.push({
        step: "Divergence pace ↔ puissance",
        value: c.divergence,
        unit: "mmol/L/s",
        formula: "|VLamax_pace − VLamax_scoreG|",
      });
    }
  }

  // ── ÉTAPE 5: Plage d'incertitude
  steps.push({
    step: "Plage réaliste (incertitude)",
    value: `${result.rangeMin.toFixed(2)} – ${result.rangeMax.toFixed(2)}`,
    unit: "mmol/L/s",
  });

  return { result, steps };
}
