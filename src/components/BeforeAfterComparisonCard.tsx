/**
 * BeforeAfterComparisonCard — Comparaison visuelle AVANT/APRÈS
 * Vue côte à côte des valeurs modélisées vs calibrées
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowRight,
  Zap,
  Clock,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BeforeAfterSummary, CalibrationResult } from "@/lib/calibration";

interface BeforeAfterComparisonCardProps {
  calibration: CalibrationResult;
  className?: string;
}

export function BeforeAfterComparisonCard({
  calibration,
  className,
}: BeforeAfterComparisonCardProps) {
  const hasAnyCalibration = 
    calibration.vlamax.tested !== null || 
    calibration.tte.tested !== null;

  if (!hasAnyCalibration) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun test TFCL disponible</p>
            <p className="text-xs mt-1">
              Réalisez des tests pour activer la calibration AVANT/APRÈS
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          Calibration AVANT / APRÈS
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {calibration.summary.map((item) => (
          <BeforeAfterRow key={item.metric} summary={item} />
        ))}
        
        <Separator />
        
        {/* Confiance globale */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">Confiance globale</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {(calibration.globalConfidence * 100).toFixed(0)}%
            </Badge>
            {calibration.globalConfidence >= 0.75 && (
              <span className="text-xs text-green-600 dark:text-green-400">Élevée</span>
            )}
            {calibration.globalConfidence >= 0.55 && calibration.globalConfidence < 0.75 && (
              <span className="text-xs text-amber-600 dark:text-amber-400">Moyenne</span>
            )}
            {calibration.globalConfidence < 0.55 && (
              <span className="text-xs text-muted-foreground">Faible</span>
            )}
          </div>
        </div>

        {/* Notes de calibration */}
        {calibration.calibrationNotes.length > 0 && (
          <div className="space-y-1">
            {calibration.calibrationNotes.map((note, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                • {note}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface BeforeAfterRowProps {
  summary: BeforeAfterSummary;
}

function BeforeAfterRow({ summary }: BeforeAfterRowProps) {
  const MetricIcon = summary.metric === "VLamax" 
    ? Zap 
    : summary.metric === "TTE" 
      ? Clock 
      : Flame;

  const formatValue = (value: number | null, metric: string): string => {
    if (value === null) return "—";
    if (metric === "VLamax") return value.toFixed(2);
    if (metric === "TTE") return `${value.toFixed(0)} min`;
    if (metric === "FatMax") return `${value.toFixed(0)} W`;
    return value.toFixed(2);
  };

  const DeltaIcon = summary.delta === null 
    ? Minus 
    : summary.delta > 0 
      ? TrendingUp 
      : summary.delta < 0 
        ? TrendingDown 
        : Minus;

  const hasChange = summary.after.source !== summary.before.source;

  return (
    <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
      {/* AVANT */}
      <div className="p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <MetricIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">AVANT</span>
        </div>
        <div className="font-mono text-lg font-bold">
          {formatValue(summary.before.value, summary.metric)}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-[10px]">
            {summary.before.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {(summary.before.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Flèche */}
      <div className="flex flex-col items-center gap-1">
        <ArrowRight className={cn(
          "h-5 w-5",
          hasChange ? "text-primary" : "text-muted-foreground"
        )} />
        {summary.delta !== null && (
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] font-mono",
              summary.delta > 0 && "text-green-600 dark:text-green-400",
              summary.delta < 0 && "text-red-600 dark:text-red-400"
            )}
          >
            <DeltaIcon className="h-3 w-3 mr-0.5" />
            {summary.delta > 0 ? "+" : ""}{summary.metric === "VLamax" 
              ? summary.delta.toFixed(2) 
              : summary.delta.toFixed(0)}
          </Badge>
        )}
      </div>

      {/* APRÈS */}
      <div className={cn(
        "p-3 rounded-lg",
        hasChange 
          ? "bg-primary/10 border border-primary/20" 
          : "bg-muted/30"
      )}>
        <div className="flex items-center gap-2 mb-2">
          <MetricIcon className={cn(
            "h-4 w-4",
            hasChange ? "text-primary" : "text-muted-foreground"
          )} />
          <span className={cn(
            "text-xs font-medium",
            hasChange ? "text-primary" : "text-muted-foreground"
          )}>APRÈS</span>
        </div>
        <div className={cn(
          "font-mono text-lg font-bold",
          hasChange && "text-primary"
        )}>
          {formatValue(summary.after.value, summary.metric)}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge 
            variant={hasChange ? "default" : "outline"} 
            className="text-[10px]"
          >
            {summary.after.label}
          </Badge>
          <span className={cn(
            "text-[10px]",
            hasChange ? "text-primary" : "text-muted-foreground"
          )}>
            {(summary.after.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
