/**
 * Scientific Dashboard – Vue consolidée des graphiques staff-grade
 */

import { useState } from "react";
import {
  EnergyProfileChart,
  RaceReadinessGauge,
  TTETargetChart,
  PerformanceRiskMatrixChart,
  NutritionPredictiveChart,
  EnergyContributionChart,
  StaffModeToggle,
  SimulatedLactateCurveChart,
} from "./index";

interface ScientificChartsDashboardProps {
  vlamaxValue: number | null;
  vlamaxSource: string;
  vlamaxConfidence: number;
  tteValue: number | null;
  tteSource: string;
  tteConfidence: number;
  readinessScore: number | null;
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
}

export function ScientificChartsDashboard({
  vlamaxValue,
  vlamaxSource,
  vlamaxConfidence,
  tteValue,
  tteSource,
  tteConfidence,
  readinessScore,
  readinessDetails,
  objectif,
  tss7d,
  sport = "velo",
  initialStaffMode = false,
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

        {/* Race Readiness Gauge */}
        <RaceReadinessGauge
          score={readinessScore}
          details={readinessDetails}
          confidence={avgConfidence}
          objectif={objectif}
          staffMode={staffMode}
        />

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
          staffMode={staffMode}
        />

        {/* Energy Contribution */}
        <EnergyContributionChart
          vlamaxValue={vlamaxValue}
          staffMode={staffMode}
        />
      </div>
    </div>
  );
}
