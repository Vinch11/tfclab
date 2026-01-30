/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INTENSITY DISPLAY COMPONENT — Affichage d'intensité référencée TFCL
 * 
 * RÈGLE: Toute intensité doit être exprimée comme "X% de [RÉFÉRENCE]"
 * Jamais de pourcentage abstrait.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { Info, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  type ResolvedIntensity,
  type IntensityReferenceType,
  INTENSITY_REFERENCES,
  ENERGY_SYSTEM_CONFIG,
} from "@/lib/v2/intensityReferenceEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface IntensityDisplayProps {
  intensity: ResolvedIntensity;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  showBadge?: boolean;
  showPhrase?: boolean;
  className?: string;
}

export function IntensityDisplay({
  intensity,
  size = "md",
  showTooltip = true,
  showBadge = true,
  showPhrase = false,
  className,
}: IntensityDisplayProps) {
  const energyConfig = ENERGY_SYSTEM_CONFIG[intensity.energySystem];

  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const content = (
    <div className={cn("inline-flex items-center gap-2", className)}>
      {/* Main intensity value */}
      <span className={cn(
        "font-mono font-bold",
        sizeClasses[size],
        energyConfig.color
      )}>
        {intensity.percentValue}%
      </span>
      
      {/* Reference label */}
      <span className={cn(
        "text-muted-foreground",
        size === "sm" ? "text-xs" : "text-sm"
      )}>
        de {intensity.referenceShortLabel}
      </span>

      {/* Quality badge */}
      {showBadge && (
        <IntensityQualityBadge 
          isFallback={intensity.isFallback}
          isEstimation={intensity.isEstimation}
          size={size}
        />
      )}

      {/* Info icon with tooltip */}
      {showTooltip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className={cn(
                "text-muted-foreground hover:text-foreground cursor-help",
                size === "sm" ? "h-3 w-3" : "h-4 w-4"
              )} />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">{intensity.tooltipText}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  if (showPhrase) {
    return (
      <div className="space-y-1">
        {content}
        <p className={cn(
          "italic",
          size === "sm" ? "text-[10px]" : "text-xs",
          energyConfig.color
        )}>
          {intensity.physiologicalPhrase}
        </p>
      </div>
    );
  }

  return content;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUALITY BADGE
// ═══════════════════════════════════════════════════════════════════════════════

interface IntensityQualityBadgeProps {
  isFallback: boolean;
  isEstimation: boolean;
  size?: "sm" | "md" | "lg";
}

export function IntensityQualityBadge({
  isFallback,
  isEstimation,
  size = "md",
}: IntensityQualityBadgeProps) {
  if (!isFallback && !isEstimation) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300",
          size === "sm" && "text-[8px] px-1 py-0"
        )}
      >
        <CheckCircle2 className={cn("mr-0.5", size === "sm" ? "h-2 w-2" : "h-3 w-3")} />
        Physiology-based
      </Badge>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300",
        size === "sm" && "text-[8px] px-1 py-0"
      )}
    >
      <AlertTriangle className={cn("mr-0.5", size === "sm" ? "h-2 w-2" : "h-3 w-3")} />
      {isFallback ? "Fallback" : "Estimation"}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPACT DISPLAY (for tables, cards)
// ═══════════════════════════════════════════════════════════════════════════════

interface IntensityCompactProps {
  percentValue: number;
  referenceType: IntensityReferenceType;
  energySystem?: "aerobic" | "mixed" | "glycolytic";
  className?: string;
}

export function IntensityCompact({
  percentValue,
  referenceType,
  energySystem,
  className,
}: IntensityCompactProps) {
  const ref = INTENSITY_REFERENCES[referenceType];
  const energyConfig = energySystem ? ENERGY_SYSTEM_CONFIG[energySystem] : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "font-mono text-sm cursor-help",
            energyConfig?.color ?? "text-foreground",
            className
          )}>
            {percentValue}% {ref.shortLabel}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {percentValue}% de {ref.label}
            {energyConfig && (
              <span className="block text-muted-foreground mt-1">
                {energyConfig.label}
              </span>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENERGY SYSTEM INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

interface EnergySystemIndicatorProps {
  energySystem: "aerobic" | "mixed" | "glycolytic";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function EnergySystemIndicator({
  energySystem,
  showLabel = true,
  size = "md",
}: EnergySystemIndicatorProps) {
  const config = ENERGY_SYSTEM_CONFIG[energySystem];
  
  const dotSize = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn(
        "rounded-full",
        dotSize[size],
        energySystem === "aerobic" && "bg-green-500",
        energySystem === "mixed" && "bg-orange-500",
        energySystem === "glycolytic" && "bg-red-500"
      )} />
      {showLabel && (
        <span className={cn(
          config.color,
          size === "sm" ? "text-xs" : "text-sm"
        )}>
          {config.label}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENSITY CARD (for snapshots, dashboards)
// ═══════════════════════════════════════════════════════════════════════════════

interface IntensityCardProps {
  title: string;
  intensity: ResolvedIntensity;
  absoluteLabel?: string; // e.g., "W", "km/h"
  className?: string;
}

export function IntensityCard({
  title,
  intensity,
  absoluteLabel,
  className,
}: IntensityCardProps) {
  const energyConfig = ENERGY_SYSTEM_CONFIG[intensity.energySystem];

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      energyConfig.bgColor,
      energyConfig.borderColor,
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        <IntensityQualityBadge 
          isFallback={intensity.isFallback}
          isEstimation={intensity.isEstimation}
          size="sm"
        />
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className={cn("text-2xl font-bold font-mono", energyConfig.color)}>
          {intensity.percentValue}%
        </span>
        <span className="text-sm text-muted-foreground">
          de {intensity.referenceShortLabel}
        </span>
      </div>

      {intensity.absoluteValue != null && absoluteLabel && (
        <p className="text-sm text-muted-foreground mt-1">
          → {intensity.absoluteValue} {absoluteLabel}
        </p>
      )}

      <div className="mt-3 pt-3 border-t border-current/10">
        <EnergySystemIndicator energySystem={intensity.energySystem} size="sm" />
        <p className="text-[11px] text-muted-foreground mt-1 italic">
          {intensity.physiologicalPhrase}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVALID INTENSITY WARNING
// ═══════════════════════════════════════════════════════════════════════════════

interface IntensityWarningProps {
  message?: string;
  className?: string;
}

export function IntensityWarning({
  message = "Intensité sans référence physiologique – non utilisable pour le pacing.",
  className,
}: IntensityWarningProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive",
      className
    )}>
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="text-xs">{message}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENSITY REFERENCE LEGEND
// ═══════════════════════════════════════════════════════════════════════════════

interface IntensityReferenceLegendProps {
  references: IntensityReferenceType[];
  className?: string;
}

export function IntensityReferenceLegend({
  references,
  className,
}: IntensityReferenceLegendProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <HelpCircle className="h-3 w-3" />
        Références d'intensité
      </h4>
      <div className="flex flex-wrap gap-2">
        {references.map(type => {
          const ref = INTENSITY_REFERENCES[type];
          return (
            <TooltipProvider key={type}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline"
                    className={cn(
                      "text-xs cursor-help",
                      ref.isFallback && "border-dashed"
                    )}
                  >
                    {ref.shortLabel}
                    {ref.isFallback && " *"}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{ref.label}</p>
                  <p className="text-xs text-muted-foreground">{ref.description}</p>
                  {ref.isFallback && (
                    <p className="text-xs text-orange-500 mt-1">* Référence de fallback</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}
