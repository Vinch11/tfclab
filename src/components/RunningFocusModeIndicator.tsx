/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RUNNING FOCUS MODE INDICATOR — Indicateur Visuel
 * 
 * Badge affiché dans l'interface pour indiquer que le Running Focus Mode est actif.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useRunningFocusMode } from "@/hooks/useRunningFocusMode";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface RunningFocusModeIndicatorProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function RunningFocusModeIndicator({
  className,
  showDetails = false,
  compact = false,
}: RunningFocusModeIndicatorProps) {
  const { isRunningOnly, raceLabel, raceType, distanceKm, targets } = useRunningFocusMode();
  
  if (!isRunningOnly) return null;
  
  const badgeContent = compact ? (
    <span className="flex items-center gap-1">
      <span>🏃</span>
      <span>RFM</span>
    </span>
  ) : (
    <span className="flex items-center gap-1.5">
      <span>🏃</span>
      <span>Running Focus Mode™</span>
    </span>
  );
  
  const badge = (
    <Badge 
      variant="outline" 
      className={cn(
        "bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 text-primary font-medium",
        className
      )}
    >
      {badgeContent}
    </Badge>
  );
  
  if (!showDetails) {
    return badge;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Running Focus Mode™ Actif</p>
            <p className="text-muted-foreground">
              L'application est en mode 100% course à pied. Toutes les analyses, 
              recommandations et exports sont exclusivement CAP.
            </p>
            {raceType && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Objectif:</span>
                  <span className="font-medium">{raceLabel}</span>
                </div>
                {distanceKm && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distance:</span>
                    <span className="font-medium">{distanceKm} km</span>
                  </div>
                )}
                {targets && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VLamax cible:</span>
                    <span className="font-medium">
                      ≤ {targets.vlamax.optimal.toFixed(2)} mmol/L/s
                      <span className="text-muted-foreground/60 text-[10px] ml-1 font-normal">
                        ({targets.vlamax.min.toFixed(2)}–{targets.vlamax.max.toFixed(2)})
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
