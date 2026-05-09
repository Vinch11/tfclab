/**
 * AmbitionTargetsCard - Affiche les cibles physiologiques selon le niveau d'ambition
 * Permet de voir VLamax, TTE et FTP/kg cibles avec l'écart actuel
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Zap, Clock, TrendingUp, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getTargetsForAmbition, 
  getVLamaxRange, 
  getTTETargetByAmbition, 
  getFtpKgTargetByAmbition 
} from "@/lib/physiologicalTargets";
import { AmbitionLevel, getAmbitionDefinition, DEFAULT_AMBITION } from "@/types/ambitionLevel";

// =============================================
// TYPES
// =============================================

interface AmbitionTargetsCardProps {
  objectif: string;
  ambition?: AmbitionLevel;
  currentVlamax?: number | null;
  currentTTE?: number | null;
  currentFtpKg?: number | null;
  sport?: string | null;
  className?: string;
}

interface MetricTarget {
  id: string;
  label: string;
  icon: React.ReactNode;
  current: number | null;
  target: number;
  unit: string;
  isInverse?: boolean; // VLamax: lower is better
  range?: { min: number; max: number; optimal: number };
}

// =============================================
// HELPERS
// =============================================

function getProgressPercent(current: number | null, target: number, isInverse: boolean = false): number {
  if (current === null) return 0;
  if (isInverse) {
    // For VLamax: target is MAX (lower is better), so we invert
    // If current <= target, progress is 100%
    if (current <= target) return 100;
    // If current > target, calculate how far over
    return Math.max(0, Math.min(100, (target / current) * 100));
  }
  return Math.min(100, (current / target) * 100);
}

function getStatus(current: number | null, target: number, isInverse: boolean = false): "ok" | "close" | "far" | "unknown" {
  if (current === null) return "unknown";
  
  if (isInverse) {
    // VLamax: lower is better
    if (current <= target) return "ok";
    if (current <= target * 1.15) return "close";
    return "far";
  }
  
  const ratio = current / target;
  if (ratio >= 1) return "ok";
  if (ratio >= 0.85) return "close";
  return "far";
}

function getStatusColor(status: "ok" | "close" | "far" | "unknown"): string {
  switch (status) {
    case "ok": return "text-emerald-600 dark:text-emerald-400";
    case "close": return "text-amber-600 dark:text-amber-400";
    case "far": return "text-red-600 dark:text-red-400";
    default: return "text-muted-foreground";
  }
}

function getStatusBg(status: "ok" | "close" | "far" | "unknown"): string {
  switch (status) {
    case "ok": return "bg-emerald-500";
    case "close": return "bg-amber-500";
    case "far": return "bg-red-500";
    default: return "bg-muted";
  }
}

function getGapText(current: number | null, target: number, isInverse: boolean = false): string {
  if (current === null) return "—";
  
  if (isInverse) {
    const gap = current - target;
    if (gap <= 0) return "✓ Cible atteinte";
    return `−${gap.toFixed(2)} à réduire`;
  }
  
  const gap = target - current;
  if (gap <= 0) return "✓ Cible atteinte";
  return `+${gap.toFixed(1)} à gagner`;
}

// =============================================
// MAIN COMPONENT
// =============================================

export function AmbitionTargetsCard({
  objectif,
  ambition = DEFAULT_AMBITION,
  currentVlamax,
  currentTTE,
  currentFtpKg,
  className,
}: AmbitionTargetsCardProps) {
  const ambDef = getAmbitionDefinition(ambition);
  
  const metrics = useMemo((): MetricTarget[] => {
    const targets = getTargetsForAmbition(objectif, ambition);
    const vlamaxRange = getVLamaxRange(objectif, ambition);
    
    return [
      {
        id: "vlamax",
        label: "VLamax",
        icon: <Zap className="w-4 h-4" />,
        current: currentVlamax ?? null,
        target: vlamaxRange.optimal,
        unit: "mmol/L/s",
        isInverse: true,
        range: vlamaxRange,
      },
      {
        id: "tte",
        label: "TTE",
        icon: <Clock className="w-4 h-4" />,
        current: currentTTE ?? null,
        target: targets.tte_min,
        unit: "min",
      },
      {
        id: "ftpkg",
        label: "FTP/kg",
        icon: <TrendingUp className="w-4 h-4" />,
        current: currentFtpKg ?? null,
        target: targets.ftp_kg_min,
        unit: "W/kg",
      },
    ];
  }, [objectif, ambition, currentVlamax, currentTTE, currentFtpKg]);

  // Calculer le score global
  const globalProgress = useMemo(() => {
    const validMetrics = metrics.filter(m => m.current !== null);
    if (validMetrics.length === 0) return 0;
    
    const sum = validMetrics.reduce((acc, m) => {
      return acc + getProgressPercent(m.current, m.target, m.isInverse);
    }, 0);
    
    return Math.round(sum / validMetrics.length);
  }, [metrics]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-5 h-5 text-primary" />
            Cibles selon l'ambition
          </CardTitle>
          <Badge variant="outline" className={cn("gap-1", ambDef.color)}>
            <span>{ambDef.icon}</span>
            {ambDef.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Objectifs physiologiques pour {ambDef.description.toLowerCase()}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress global */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progression globale</span>
            <span className="text-lg font-bold text-primary">{globalProgress}%</span>
          </div>
          <Progress value={globalProgress} className="h-2" />
        </div>

        {/* Metrics grid */}
        <div className="space-y-3">
          {metrics.map((metric) => {
            const status = getStatus(metric.current, metric.target, metric.isInverse);
            const progress = getProgressPercent(metric.current, metric.target, metric.isInverse);
            const gapText = getGapText(metric.current, metric.target, metric.isInverse);
            
            return (
              <div 
                key={metric.id} 
                className="p-3 rounded-lg bg-muted/30 border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md", getStatusColor(status).replace("text-", "bg-").replace("600", "100").replace("400", "900/20"))}>
                      {metric.icon}
                    </div>
                    <span className="font-medium text-sm">{metric.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {status === "ok" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : status !== "unknown" ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    ) : null}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-baseline gap-1">
                    <span className={cn("text-lg font-bold tabular-nums", getStatusColor(status))}>
                      {metric.current !== null ? metric.current.toFixed(metric.id === "vlamax" ? 2 : 1) : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">{metric.unit}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ChevronRight className="w-3 h-3" />
                    <span className="font-mono font-medium">
                      {metric.target.toFixed(metric.id === "vlamax" ? 2 : 1)} {metric.unit}
                    </span>
                  </div>
                </div>
                
                <Progress 
                  value={progress} 
                  className={cn("h-1.5 mb-1.5", status === "ok" && "[&>div]:bg-emerald-500")}
                />
                
                <p className={cn("text-xs", getStatusColor(status))}>
                  {gapText}
                </p>
                
                {/* VLamax range indicator */}
                {metric.range && metric.id === "vlamax" && (
                  <div className="mt-2 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                    Plage : {metric.range.min.toFixed(2)} – {metric.range.max.toFixed(2)} (optimal: {metric.range.optimal.toFixed(2)})
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center italic">
          Cibles adaptées au niveau "{ambDef.label}" • Objectif: {objectif}
        </p>
      </CardContent>
    </Card>
  );
}
