/**
 * VLamaxCalibrationBadge - Affiche le badge de calibration TFCL
 */

import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  CalibrationEnvelope, 
  CALIBRATION_FLAG_BADGES,
  CALIBRATION_FLAG_LABELS,
  formatPercentile,
  formatRange,
  REFERENCE_DISCLAIMER,
} from "@/lib/reference";
import { Info, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface VLamaxCalibrationBadgeProps {
  calibration: CalibrationEnvelope;
  compact?: boolean;
}

export function VLamaxCalibrationBadge({ 
  calibration, 
  compact = false 
}: VLamaxCalibrationBadgeProps) {
  const { percentile, calibration_flag, cluster_label, range_p25_p75, range_p10_p90 } = calibration;
  
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn("text-[10px] cursor-help", CALIBRATION_FLAG_BADGES[calibration_flag])}
            >
              {formatPercentile(percentile)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-medium">{cluster_label}</p>
              <p>Position : {formatPercentile(percentile)}</p>
              <p>Plage P25–P75 : {formatRange(range_p25_p75.low, range_p25_p75.high)}</p>
              <p className="text-muted-foreground">{REFERENCE_DISCLAIMER}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Référentiel TFCL
        </span>
        <Badge className={cn("text-[10px]", CALIBRATION_FLAG_BADGES[calibration_flag])}>
          {CALIBRATION_FLAG_LABELS[calibration_flag]}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Cluster</span>
          <p className="font-medium truncate">{cluster_label}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Position</span>
          <p className="font-medium">{formatPercentile(percentile)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">P25–P75</span>
          <p className="font-mono">{formatRange(range_p25_p75.low, range_p25_p75.high)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">P10–P90</span>
          <p className="font-mono">{formatRange(range_p10_p90.low, range_p10_p90.high)}</p>
        </div>
      </div>
      
      {calibration.warnings.length > 0 && (
        <div className="space-y-1 pt-1">
          {calibration.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1 text-[10px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-start gap-1 pt-1 text-[10px] text-muted-foreground">
        <Info className="h-3 w-3 shrink-0 mt-0.5" />
        <span>{REFERENCE_DISCLAIMER}</span>
      </div>
    </div>
  );
}
