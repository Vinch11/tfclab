/**
 * VLamaxV2DisplayCard — Carte d'affichage VLamax calibrée TFCL V2
 * Affiche la valeur, le percentile, la plage TFCL et la confiance
 */

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
  AlertTriangle, 
  Info, 
  Target,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  calibrateVLamaxV2,
  ObjectifPrincipal,
  getConfidenceBadgeClass,
} from "@/lib/reference";

interface VLamaxV2DisplayCardProps {
  objectif: ObjectifPrincipal;
  vlamax: number;
  vlamaxSource?: "estimation" | "test_terrain" | "test_labo";
  vo2max?: number;
  sex?: "H" | "F";
  age?: number;
  compact?: boolean;
}

export function VLamaxV2DisplayCard({
  objectif,
  vlamax,
  vlamaxSource = "estimation",
  vo2max,
  sex,
  age,
  compact = false,
}: VLamaxV2DisplayCardProps) {
  // Valeur manquante ou invalide
  if (!Number.isFinite(vlamax) || vlamax <= 0) {
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
    vlamax,
    vlamaxSource,
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
            <p className="text-xs">Objectif non reconnu</p>
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

  // Position du percentile sur la barre (0-100)
  const percentilePosition = Math.min(100, Math.max(0, display.percentile));

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
              <Badge className={cn("text-[10px]", getConfidenceBadgeClass(display.confidence.level))}>
                {display.confidence.level === "HIGH" ? "🟢" : display.confidence.level === "MEDIUM" ? "🟡" : "🔴"}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-medium">{display.interpretation}</p>
              <p>Plage TFCL : {display.range.p25.toFixed(2)} – {display.range.p75.toFixed(2)}</p>
              <p>{display.confidence.badge}</p>
            </div>
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
          </CardTitle>
          <Badge className={cn("text-[10px]", getConfidenceBadgeClass(display.confidence.level))}>
            {display.confidence.badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valeur principale */}
        <div className="text-center">
          <div className="text-3xl font-bold tracking-tight font-mono">
            {display.value.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">{display.unit}</div>
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
            {/* Zone optimale P25-P75 */}
            <div 
              className="absolute h-full bg-green-200 dark:bg-green-900/50"
              style={{ left: "25%", width: "50%" }}
            />
            {/* Indicateur de position */}
            <div 
              className={cn("absolute w-3 h-3 rounded-full -top-0.5 transform -translate-x-1/2 border-2 border-background", zoneBgColors[display.zone])}
              style={{ left: `${percentilePosition}%` }}
            />
          </div>
        </div>

        {/* Plage TFCL */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-muted/30 rounded">
            <span className="text-muted-foreground">Plage optimale</span>
            <p className="font-mono font-medium">
              {display.range.p25.toFixed(2)} – {display.range.p75.toFixed(2)}
            </p>
          </div>
          <div className="p-2 bg-muted/30 rounded">
            <span className="text-muted-foreground">Plage large</span>
            <p className="font-mono font-medium">
              {display.range.p10.toFixed(2)} – {display.range.p90.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Interprétation */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs">{display.interpretation}</p>
          </div>
        </div>

        {/* Cluster utilisé */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Référentiel</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-[10px] cursor-help">
                  {display.cluster.clusterLabel.split(" ").slice(0, 3).join(" ")}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-1">
                  <p className="font-medium">{display.cluster.clusterLabel}</p>
                  <p>Confiance cluster : {(display.cluster.confidence * 100).toFixed(0)}%</p>
                  {display.cluster.warnings.length > 0 && (
                    <p className="text-amber-500">⚠️ {display.cluster.warnings[0]}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Source et confiance */}
        <div className="flex items-center justify-between text-xs border-t pt-2">
          <span className="text-muted-foreground">{display.confidence.sourceLabel}</span>
          <span className="text-muted-foreground">{display.confidence.margin}</span>
        </div>

        {/* Warnings */}
        {display.calibration.warnings.length > 0 && (
          <div className="space-y-1">
            {display.calibration.warnings.slice(0, 2).map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px] text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 pt-2 border-t text-[10px] text-muted-foreground">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <span>Estimation calibrée TFCL V2 — Interprétation coach requise</span>
        </div>
      </CardContent>
    </Card>
  );
}
