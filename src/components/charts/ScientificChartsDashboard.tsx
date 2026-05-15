/**
 * Scientific Dashboard – Vue consolidée des graphiques staff-grade
 */

import { useState } from "react";
import {
  EnergyProfileChart,
  TTETargetChart,
  PerformanceRiskMatrixChart,
  NutritionPredictiveChart,
  EnergyContributionChart,
  StaffModeToggle,
  SimulatedLactateCurveChart,
  FatCarbOxidationChart,
  PerformancePredictionChart,
} from "./index";
import { PowerDurationUnifiedChart } from "./PowerDurationUnifiedChart";
import { MetabolicZonesINSCYDChart } from "./MetabolicZonesINSCYDChart";

interface ScientificChartsDashboardProps {
  vlamaxValue: number | null;
  vlamaxSource: string;
  vlamaxConfidence: number;
  tteValue: number | null;
  tteSource: string;
  tteConfidence: number;
  potentielScore: number | null;
  readinessDetails?: {
    vlamax: number;
    endurance: number;
    puissance: number;
    fraicheur: number;
  };
  objectif: string;
  tss7d?: number | null;
  sport?: "velo" | "cap" | "triathlon";
  initialStaffMode?: boolean;
  vo2max?: number | null;
  ftp?: number | null;
  weight?: number;
  vma?: number | null;
  css?: number | null;
  // Power data for PD chart
  pmax5s?: number | null;
  p30s?: number | null;
  p60s?: number | null;
  map5min?: number | null;
}

export function ScientificChartsDashboard({
  vlamaxValue,
  vlamaxSource,
  vlamaxConfidence,
  tteValue,
  tteSource,
  tteConfidence,
  potentielScore,
  readinessDetails,
  objectif,
  tss7d,
  sport = "velo",
  initialStaffMode = false,
  vo2max,
  ftp,
  weight,
  vma,
  css,
  pmax5s,
  p30s,
  p60s,
  map5min,
}: ScientificChartsDashboardProps) {
  const [staffMode, setStaffMode] = useState(initialStaffMode);

  const avgConfidence = (vlamaxConfidence + tteConfidence) / 2;

  return (
    <div className="space-y-4">
      {/* Toggle Mode */}
      <div className="flex justify-end">
        <StaffModeToggle staffMode={staffMode} onToggle={setStaffMode} />
      </div>

      {/* Grille principale */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {/* Energy Profile */}
        <EnergyProfileChart
          data={{
            vlamaxValue,
            vlamaxSource,
            vlamaxConfidence,
            tteValue,
            tteSource,
            tteConfidence,
            objectif,
          }}
          staffMode={staffMode}
          className="md:col-span-2 xl:col-span-1"
        />

        {/* Potentiel Physiologique removed */}

        {/* TTE vs Target */}
        <TTETargetChart
          tteValue={tteValue}
          tteSource={tteSource}
          tteConfidence={tteConfidence}
          objectif={objectif}
          staffMode={staffMode}
        />

        {/* Performance Risk Matrix (Staff only) */}
        {staffMode && (
          <PerformanceRiskMatrixChart
            vlamaxValue={vlamaxValue}
            tteValue={tteValue}
            objectif={objectif}
            tss7d={tss7d}
            staffMode={staffMode}
          />
        )}

        {/* Nutrition Predictive */}
        <NutritionPredictiveChart
          vlamaxValue={vlamaxValue}
          objectif={objectif}
          sport={sport}
          vo2max={vo2max}
          weightKg={weight}
          staffMode={staffMode}
        />

        {/* Energy Contribution */}
        <EnergyContributionChart
          vlamaxValue={vlamaxValue}
          staffMode={staffMode}
        />

        {/* Simulated Lactate Curve (Mader-Heck) */}
        <SimulatedLactateCurveChart
          vo2max={vo2max ?? null}
          vlamax={vlamaxValue}
          ftp={ftp ?? null}
          weight={weight}
          staffMode={staffMode}
          className="md:col-span-2 xl:col-span-2"
        />

        {/* Fat/Carb Oxidation */}
        <FatCarbOxidationChart
          vo2max={vo2max ?? null}
          vlamax={vlamaxValue}
          ftp={ftp ?? null}
          weight={weight}
          staffMode={staffMode}
          className="md:col-span-2 xl:col-span-2"
        />

        {/* Power-Duration Unified (Mader + Empirique) */}
        <PowerDurationUnifiedChart
          vo2max={vo2max}
          vlamax={vlamaxValue}
          ftp={ftp}
          weight={weight}
          pmax5s={pmax5s}
          p30s={p30s}
          p60s={p60s}
          map5min={map5min}
          staffMode={staffMode}
          className="md:col-span-2 xl:col-span-2"
        />

        {/* Metabolic Zones INSCYD-derived */}
        <MetabolicZonesINSCYDChart
          vo2max={vo2max ?? null}
          vlamax={vlamaxValue}
          ftp={ftp ?? null}
          weight={weight}
          staffMode={staffMode}
          sport={sport}
          className="md:col-span-2 xl:col-span-3"
        />

        {/* Performance Prediction */}
        <PerformancePredictionChart
          vo2max={vo2max ?? null}
          vlamax={vlamaxValue}
          ftp={ftp ?? null}
          weight={weight}
          vma={vma}
          css={css}
          confidence={(vlamaxConfidence + tteConfidence) / 200}
          staffMode={staffMode}
          className="md:col-span-2 xl:col-span-3"
        />
      </div>
    </div>
  );
}
