/**
 * CalibrationImpactBadge — Affiche l'impact de la calibration
 */

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalibrationImpact } from "@/lib/calibration";

interface CalibrationImpactBadgeProps {
  impact: CalibrationImpact;
  delta: number | null;
  metric: string;
  className?: string;
}

export function CalibrationImpactBadge({
  impact,
  delta,
  metric,
  className,
}: CalibrationImpactBadgeProps) {
  const formatDelta = () => {
    if (delta === null) return "—";
    const sign = delta >= 0 ? "+" : "";
    
    if (metric === "VLamax") {
      return `${sign}${delta.toFixed(2)}`;
    }
    if (metric === "TTE") {
      return `${sign}${delta.toFixed(0)} min`;
    }
    return `${sign}${delta.toFixed(2)}`;
  };

  const DeltaIcon = delta === null 
    ? Minus 
    : delta > 0 
      ? TrendingUp 
      : delta < 0 
        ? TrendingDown 
        : Minus;

  const qualityColors = {
    high: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            {delta !== null && (
              <Badge variant="outline" className="font-mono text-xs gap-1">
                <DeltaIcon className="h-3 w-3" />
                {formatDelta()}
              </Badge>
            )}
            <Badge className={cn("text-xs gap-1", qualityColors[impact.quality])}>
              +{(impact.confidenceBoost * 100).toFixed(0)}% conf.
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-sm">{impact.message}</p>
            <p className="text-xs text-muted-foreground">
              Précision : +{(impact.precisionBoost * 100).toFixed(0)}%
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * CalibrationSummaryLine — Ligne résumé de l'impact calibration
 */
interface CalibrationSummaryLineProps {
  confidenceBoost: number;
  precisionBoost: number;
  delta: number | null;
  metric: string;
  className?: string;
}

export function CalibrationSummaryLine({
  confidenceBoost,
  precisionBoost,
  delta,
  metric,
  className,
}: CalibrationSummaryLineProps) {
  const formatDelta = () => {
    if (delta === null) return "";
    const sign = delta >= 0 ? "+" : "";
    if (metric === "VLamax") return `delta ${metric} = ${sign}${delta.toFixed(2)}`;
    if (metric === "TTE") return `delta ${metric} = ${sign}${delta.toFixed(0)} min`;
    return `delta ${metric} = ${sign}${delta.toFixed(2)}`;
  };

  return (
    <div className={cn(
      "flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md",
      className
    )}>
      <Info className="h-3.5 w-3.5 shrink-0" />
      <span>
        Impact test : +{(confidenceBoost * 100).toFixed(0)}% confiance 
        {precisionBoost > 0 && ` / +${(precisionBoost * 100).toFixed(0)}% précision`}
        {delta !== null && ` / ${formatDelta()}`}
      </span>
    </div>
  );
}
