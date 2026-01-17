/**
 * TTEV2Card — Carte affichant TTE/Durabilité V2 avec plages et confiance
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { V2ConfidenceBadge } from "./V2ConfidenceBadge";
import { V2RangeBadge } from "./V2RangeBadge";
import { TTERangeV2, getTTEStatusColor, getTTEStatusBadgeClass } from "@/lib/v2";
import { Timer, AlertTriangle, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TTEV2CardProps {
  data: TTERangeV2;
}

export function TTEV2Card({ data }: TTEV2CardProps) {
  const progressValue = Math.min(100, (data.central / data.target) * 100);
  
  const getTrendIcon = () => {
    if (!data.source) return null;
    // Would use actual trend data if available
    return null;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Timer className="h-4 w-4 text-blue-500" />
            Durabilité au seuil (TTE)
          </CardTitle>
          <V2ConfidenceBadge confidence={data.confidence} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Valeur centrale */}
        <div className="text-center">
          <div className="text-3xl font-bold tracking-tight">
            {data.central}
          </div>
          <div className="text-xs text-muted-foreground">minutes</div>
        </div>

        {/* Plage réaliste */}
        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-muted/50 rounded-md">
          <span className="text-xs text-muted-foreground">Plage :</span>
          <V2RangeBadge min={data.min} max={data.max} decimals={0} unit="min" />
        </div>

        {/* Progress vers cible */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">vs Cible ({data.target} min)</span>
            <span className={cn("font-medium", getTTEStatusColor(data.status))}>
              {Math.round(progressValue)}%
            </span>
          </div>
          <Progress 
            value={progressValue} 
            className="h-2"
          />
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Status</span>
          <Badge 
            variant="outline" 
            className={cn("text-xs", getTTEStatusBadgeClass(data.status))}
          >
            {data.statusLabel}
          </Badge>
        </div>

        {/* Durabilité Index */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Indice durabilité</span>
          <span className="text-sm font-medium">
            {data.durabilityLabel}
          </span>
        </div>

        {/* Message status */}
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2">
          {data.statusMessage}
        </div>

        {/* Fragile warning */}
        {data.isFragile && data.fragileReason && (
          <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-md border border-amber-500/30">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-amber-700 dark:text-amber-300">TTE fragile</div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400">{data.fragileReason}</div>
            </div>
          </div>
        )}

        {/* Factors */}
        {data.factors.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Facteurs contributeurs :</span>
            <div className="flex flex-wrap gap-1">
              {data.factors.slice(0, 3).map((factor) => (
                <Badge 
                  key={factor.id} 
                  variant="outline" 
                  className={cn(
                    "text-[10px]",
                    factor.contribution > 0 ? "border-green-500/50" : "border-red-500/50"
                  )}
                >
                  {factor.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {data.warnings.length > 0 && (
          <div className="space-y-1">
            {data.warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 pt-2 border-t text-[10px] text-muted-foreground">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>Estimation Two For Coaching Lab V2™</span>
        </div>
      </CardContent>
    </Card>
  );
}
