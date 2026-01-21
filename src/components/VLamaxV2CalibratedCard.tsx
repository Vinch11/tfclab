/**
 * VLamaxV2CalibratedCard — Carte VLamax avec toggle AVANT/APRÈS
 * Affiche les valeurs modélisées et calibrées avec mécanisme de comparaison
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Zap, 
  Target,
  TrendingUp,
  Lock,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CalibrationToggle, useCalibrationToggle } from "./CalibrationToggle";
import { CalibrationSummaryLine } from "./CalibrationImpactBadge";
import type { CalibrationMetric, BeforeAfterSummary } from "@/lib/calibration";
import {
  calibrateVLamaxV2,
  ObjectifPrincipal,
} from "@/lib/reference";

interface VLamaxV2CalibratedCardProps {
  objectif: ObjectifPrincipal;
  calibration: CalibrationMetric;
  summary: BeforeAfterSummary;
  vo2max?: number;
  sex?: "H" | "F";
  age?: number;
  compact?: boolean;
}

export function VLamaxV2CalibratedCard({
  objectif,
  calibration,
  summary,
  vo2max,
  sex,
  age,
  compact = false,
}: VLamaxV2CalibratedCardProps) {
  const hasCalibration = calibration.tested !== null;
  const { mode, setMode, isCalibrated } = useCalibrationToggle(hasCalibration);

  // Déterminer quelle valeur afficher
  const displayValue = isCalibrated 
    ? calibration.effective.value 
    : calibration.modelled.value;
  
  const displayConfidence = isCalibrated
    ? calibration.effective.confidence
    : calibration.modelled.confidence;

  const displaySource = isCalibrated
    ? calibration.effective.source
    : calibration.modelled.source;

  // Valeur manquante ou invalide
  if (!displayValue || !Number.isFinite(displayValue) || displayValue <= 0) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Calibration TFCL indisponible</p>
            <p className="text-xs">Renseigner une VLamax (test ou estimation)</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calibrer VLamax avec le système TFCL V2
  const display = calibrateVLamaxV2({
    objectif,
    vlamax: displayValue,
    vlamaxSource: displaySource === "LAB" ? "test_labo" 
      : displaySource === "TEST_TFCL" ? "test_terrain" 
      : "estimation",
    vo2max,
    sex,
    age,
  });

  if (!display) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">VLamax non calibrée</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const zoneColors: Record<string, string> = {
    OPTIMAL: "text-green-600 dark:text-green-400",
    LOW: "text-blue-600 dark:text-blue-400",
    HIGH: "text-amber-600 dark:text-amber-400",
    VERY_LOW: "text-cyan-600 dark:text-cyan-400",
    VERY_HIGH: "text-red-600 dark:text-red-400",
  };

  const zoneBgColors: Record<string, string> = {
    OPTIMAL: "bg-green-500",
    LOW: "bg-blue-500",
    HIGH: "bg-amber-500",
    VERY_LOW: "bg-cyan-500",
    VERY_HIGH: "bg-red-500",
  };

  const percentilePosition = Math.min(100, Math.max(0, display.percentile));

  const sourceLabel = displaySource === "LAB" 
    ? "🔬 Labo" 
    : displaySource === "TEST_TFCL" 
      ? "📏 Test TFCL" 
      : "🧮 Modèle";

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 cursor-help">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="font-mono font-bold">{display.value.toFixed(2)}</span>
              <Badge variant="outline" className="text-[10px]">
                P{display.percentile}
              </Badge>
              {hasCalibration && (
                <FlaskConical className="h-3.5 w-3.5 text-primary" />
              )}
              <span className={cn("text-sm", zoneColors[display.zone])}>
                {display.zoneLabel}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{display.interpretation}</p>
            {hasCalibration && (
              <p className="text-xs mt-1 text-primary">
                Calibré par test TFCL (+{(calibration.calibrationImpact.confidenceBoost * 100).toFixed(0)}% conf.)
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            VLamax TFCL V2
            {calibration.modelled.source === "LAB" && (
              <Lock className="h-3.5 w-3.5 text-blue-500" />
            )}
          </CardTitle>
          <CalibrationToggle
            mode={mode}
            onChange={setMode}
            hasCalibration={hasCalibration}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valeur principale */}
        <div className="text-center">
          <div className="text-3xl font-bold tracking-tight font-mono">
            {display.value.toFixed(2)}
          </div>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{display.unit}</span>
            <Badge variant="outline" className="text-[10px]">
              {sourceLabel}
            </Badge>
          </div>
        </div>

        {/* Plage et confiance */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-muted/30 rounded-lg text-center">
            <div className="text-muted-foreground mb-0.5">Plage</div>
            <div className="font-mono font-medium">
              {display.range.p25.toFixed(2)} – {display.range.p75.toFixed(2)}
            </div>
          </div>
          <div className="p-2 bg-muted/30 rounded-lg text-center">
            <div className="text-muted-foreground mb-0.5">Confiance</div>
            <div className="font-mono font-medium">
              {(displayConfidence * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Zone et Percentile */}
        <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className={cn("text-sm font-medium", zoneColors[display.zone])}>
              {display.zoneLabel}
            </span>
          </div>
          <Badge variant="outline" className="font-mono">
            P{display.percentile}
          </Badge>
        </div>

        {/* Barre de percentile visuelle */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>P10</span>
            <span>P25</span>
            <span>P50</span>
            <span>P75</span>
            <span>P90</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute h-full bg-green-200 dark:bg-green-900/50"
              style={{ left: "25%", width: "50%" }}
            />
            <div 
              className={cn(
                "absolute w-3 h-3 rounded-full -top-0.5 transform -translate-x-1/2 border-2 border-background",
                zoneBgColors[display.zone]
              )}
              style={{ left: `${percentilePosition}%` }}
            />
          </div>
        </div>

        {/* Interprétation */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs">{display.interpretation}</p>
          </div>
        </div>

        {/* Impact calibration (si mode APRÈS) */}
        {isCalibrated && (
          <CalibrationSummaryLine
            confidenceBoost={calibration.calibrationImpact.confidenceBoost}
            precisionBoost={calibration.calibrationImpact.precisionBoost}
            delta={calibration.delta}
            metric="VLamax"
          />
        )}
      </CardContent>
    </Card>
  );
}
