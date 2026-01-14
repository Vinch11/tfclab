/**
 * AmbitionProgressChart - Graphique d'évolution temporelle vers les cibles d'ambition
 * Affiche la progression des métriques (VLamax, TTE, FTP/kg) par rapport aux cibles sur les derniers snapshots
 * Avec comparaison multi-ambitions et alertes automatiques
 */

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TrendingUp, Target, ChevronUp, ChevronDown, Minus, Bell, Check, Zap, AlertTriangle, Trophy } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Area,
  ComposedChart,
} from "recharts";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  getVLamaxRange,
  getTTETargetByAmbition,
  getFtpKgTargetByAmbition,
} from "@/lib/physiologicalTargets";
import { 
  AmbitionLevel, 
  getAmbitionDefinition, 
  DEFAULT_AMBITION, 
  AMBITION_LEVELS_ORDERED,
  AMBITION_DEFINITIONS
} from "@/types/ambitionLevel";
import { DbSnapshot } from "@/hooks/useCloudData";
import { useToast } from "@/hooks/use-toast";

// =============================================
// TYPES
// =============================================

interface AmbitionProgressChartProps {
  snapshots: DbSnapshot[];
  objectif: string;
  ambition?: AmbitionLevel;
  weightKg?: number | null;
  className?: string;
}

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  // Valeurs brutes
  vlamax: number | null;
  tte: number | null;
  ftpKg: number | null;
  // Progression par ambition (dynamic keys)
  finisher_progress?: number | null;
  age_group_progress?: number | null;
  competitor_progress?: number | null;
  elite_progress?: number | null;
  // Cibles par ambition
  finisher_target?: number;
  age_group_target?: number;
  competitor_target?: number;
  elite_target?: number;
}

interface AmbitionAlert {
  id: string;
  type: "approaching" | "reached" | "exceeded";
  metric: "vlamax" | "tte" | "ftpKg" | "global";
  metricLabel: string;
  ambition: AmbitionLevel;
  message: string;
  progress: number;
  icon: typeof Bell;
}

// =============================================
// AMBITION COLORS FOR CHART
// =============================================

const AMBITION_COLORS: Record<AmbitionLevel, string> = {
  finisher: "hsl(var(--muted-foreground))",
  age_group: "hsl(210, 100%, 50%)",
  competitor: "hsl(38, 100%, 50%)",
  elite: "hsl(270, 80%, 60%)",
};

// =============================================
// HELPERS
// =============================================

function calculateProgress(
  current: number | null,
  target: number,
  isInverse: boolean = false
): number | null {
  if (current === null || current === 0) return null;
  if (isInverse) {
    // VLamax: lower is better
    if (current <= target) return 100;
    return Math.max(0, Math.min(100, (target / current) * 100));
  }
  return Math.min(100, (current / target) * 100);
}

function getGlobalProgress(
  vlamax: number | null,
  tte: number | null,
  ftpKg: number | null,
  objectif: string,
  ambition: AmbitionLevel
): number | null {
  const vlamaxRange = getVLamaxRange(objectif, ambition);
  const tteTarget = getTTETargetByAmbition(objectif, ambition);
  const ftpKgTarget = getFtpKgTargetByAmbition(objectif, ambition);

  const vlamaxProgress = calculateProgress(vlamax, vlamaxRange.optimal, true);
  const tteProgress = calculateProgress(tte, tteTarget, false);
  const ftpKgProgress = calculateProgress(ftpKg, ftpKgTarget, false);

  const validProgresses = [vlamaxProgress, tteProgress, ftpKgProgress].filter(
    (p) => p !== null
  ) as number[];
  
  return validProgresses.length > 0
    ? Math.round(validProgresses.reduce((a, b) => a + b, 0) / validProgresses.length)
    : null;
}

function getTrend(
  data: ChartDataPoint[],
  progressKey: string
): "up" | "down" | "stable" | "unknown" {
  const validPoints = data.filter((d) => (d as any)[progressKey] !== null);
  if (validPoints.length < 2) return "unknown";
  
  const first = (validPoints[0] as any)[progressKey] as number;
  const last = (validPoints[validPoints.length - 1] as any)[progressKey] as number;
  const diff = last - first;
  
  if (Math.abs(diff) < 2) return "stable";
  return diff > 0 ? "up" : "down";
}

function getTrendIcon(trend: "up" | "down" | "stable" | "unknown") {
  switch (trend) {
    case "up":
      return <ChevronUp className="w-4 h-4 text-emerald-500" />;
    case "down":
      return <ChevronDown className="w-4 h-4 text-red-500" />;
    case "stable":
      return <Minus className="w-4 h-4 text-amber-500" />;
    default:
      return null;
  }
}

function generateAlerts(
  latestData: ChartDataPoint | null,
  objectif: string,
  currentAmbition: AmbitionLevel
): AmbitionAlert[] {
  if (!latestData) return [];

  const alerts: AmbitionAlert[] = [];
  const APPROACHING_THRESHOLD = 85;
  const REACHED_THRESHOLD = 95;

  // Check each ambition level
  AMBITION_LEVELS_ORDERED.forEach((ambition) => {
    const progressKey = `${ambition}_progress` as const;
    const progress = (latestData as any)[progressKey] as number | null;
    
    if (progress === null) return;

    const ambDef = getAmbitionDefinition(ambition);

    if (progress >= 100) {
      alerts.push({
        id: `${ambition}-global-exceeded`,
        type: "exceeded",
        metric: "global",
        metricLabel: "Progression globale",
        ambition,
        message: `🎉 Cible "${ambDef.label}" dépassée !`,
        progress,
        icon: Trophy,
      });
    } else if (progress >= REACHED_THRESHOLD) {
      alerts.push({
        id: `${ambition}-global-reached`,
        type: "reached",
        metric: "global",
        metricLabel: "Progression globale",
        ambition,
        message: `✓ Objectif "${ambDef.label}" atteint (${progress}%)`,
        progress,
        icon: Check,
      });
    } else if (progress >= APPROACHING_THRESHOLD && ambition === currentAmbition) {
      alerts.push({
        id: `${ambition}-global-approaching`,
        type: "approaching",
        metric: "global",
        metricLabel: "Progression globale",
        ambition,
        message: `Proche de l'objectif "${ambDef.label}" (${progress}%)`,
        progress,
        icon: Zap,
      });
    }
  });

  // Check individual metrics for current ambition
  const vlamaxRange = getVLamaxRange(objectif, currentAmbition);
  const tteTarget = getTTETargetByAmbition(objectif, currentAmbition);
  const ftpKgTarget = getFtpKgTargetByAmbition(objectif, currentAmbition);

  const vlamaxProgress = calculateProgress(latestData.vlamax, vlamaxRange.optimal, true);
  const tteProgress = calculateProgress(latestData.tte, tteTarget, false);
  const ftpKgProgress = calculateProgress(latestData.ftpKg, ftpKgTarget, false);

  const metricChecks = [
    { metric: "vlamax", label: "VLamax", progress: vlamaxProgress },
    { metric: "tte", label: "TTE", progress: tteProgress },
    { metric: "ftpKg", label: "FTP/kg", progress: ftpKgProgress },
  ] as const;

  metricChecks.forEach(({ metric, label, progress }) => {
    if (progress === null) return;

    if (progress >= 100) {
      alerts.push({
        id: `${currentAmbition}-${metric}-reached`,
        type: "reached",
        metric,
        metricLabel: label,
        ambition: currentAmbition,
        message: `${label} cible atteinte ✓`,
        progress,
        icon: Check,
      });
    } else if (progress >= APPROACHING_THRESHOLD) {
      alerts.push({
        id: `${currentAmbition}-${metric}-approaching`,
        type: "approaching",
        metric,
        metricLabel: label,
        ambition: currentAmbition,
        message: `${label} à ${progress.toFixed(0)}% de la cible`,
        progress,
        icon: Zap,
      });
    }
  });

  return alerts;
}

// =============================================
// MAIN COMPONENT
// =============================================

export function AmbitionProgressChart({
  snapshots,
  objectif,
  ambition = DEFAULT_AMBITION,
  weightKg,
  className,
}: AmbitionProgressChartProps) {
  const { toast } = useToast();
  const [showComparison, setShowComparison] = useState(false);
  const [visibleAmbitions, setVisibleAmbitions] = useState<Set<AmbitionLevel>>(
    new Set([ambition])
  );
  const [alertsShown, setAlertsShown] = useState<Set<string>>(new Set());

  const ambDef = getAmbitionDefinition(ambition);

  // Update visible ambitions when current ambition changes
  useEffect(() => {
    if (!showComparison) {
      setVisibleAmbitions(new Set([ambition]));
    }
  }, [ambition, showComparison]);

  // Préparer les données du graphique avec toutes les ambitions
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const sorted = [...snapshots]
      .filter((s) => s.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12);

    return sorted.map((s) => {
      const ftpKg = s.ftp && s.weight_kg ? s.ftp / s.weight_kg : 
                    s.ftp && weightKg ? s.ftp / weightKg : null;

      const dataPoint: ChartDataPoint = {
        date: s.date,
        dateLabel: format(parseISO(s.date), "dd MMM", { locale: fr }),
        vlamax: s.vlamax ?? null,
        tte: s.tte_observed_min ?? null,
        ftpKg,
      } as ChartDataPoint;

      // Calculate progress for each ambition level
      AMBITION_LEVELS_ORDERED.forEach((amb) => {
        const progress = getGlobalProgress(
          s.vlamax ?? null,
          s.tte_observed_min ?? null,
          ftpKg,
          objectif,
          amb
        );
        (dataPoint as any)[`${amb}_progress`] = progress;
        
        // Store targets for tooltip
        const vlamaxRange = getVLamaxRange(objectif, amb);
        (dataPoint as any)[`${amb}_target`] = vlamaxRange.optimal;
      });

      return dataPoint;
    });
  }, [snapshots, objectif, weightKg]);

  // Generate and show alerts
  const latestData = chartData[chartData.length - 1] ?? null;
  const alerts = useMemo(() => generateAlerts(latestData, objectif, ambition), [latestData, objectif, ambition]);

  // Show toast notifications for new alerts
  useEffect(() => {
    alerts.forEach((alert) => {
      if (!alertsShown.has(alert.id) && (alert.type === "reached" || alert.type === "exceeded")) {
        toast({
          title: alert.type === "exceeded" ? "🏆 Objectif dépassé !" : "✓ Objectif atteint",
          description: alert.message,
        });
        setAlertsShown((prev) => new Set([...prev, alert.id]));
      }
    });
  }, [alerts, alertsShown, toast]);

  // Toggle ambition visibility for comparison
  const toggleAmbitionVisibility = (amb: AmbitionLevel) => {
    setVisibleAmbitions((prev) => {
      const next = new Set(prev);
      if (next.has(amb)) {
        // Keep at least one visible
        if (next.size > 1) {
          next.delete(amb);
        }
      } else {
        next.add(amb);
      }
      return next;
    });
  };

  // Current targets for display
  const currentTargets = useMemo(() => {
    const vlamaxRange = getVLamaxRange(objectif, ambition);
    return {
      vlamax: vlamaxRange.optimal,
      tte: getTTETargetByAmbition(objectif, ambition),
      ftpKg: getFtpKgTargetByAmbition(objectif, ambition),
    };
  }, [objectif, ambition]);

  if (chartData.length < 2) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-primary" />
            Évolution vers les cibles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Target className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm text-center">
              Au moins 2 snapshots requis pour afficher l'évolution
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentProgress = latestData ? (latestData as any)[`${ambition}_progress`] as number | null : null;
  const trend = getTrend(chartData, `${ambition}_progress`);

  // Filter alerts to show
  const significantAlerts = alerts.filter(
    (a) => a.type === "reached" || a.type === "exceeded" || a.ambition === ambition
  ).slice(0, 4);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-primary" />
            Évolution vers les cibles
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="compare-mode" className="text-xs text-muted-foreground cursor-pointer">
              Comparer
            </Label>
            <Switch
              id="compare-mode"
              checked={showComparison}
              onCheckedChange={(checked) => {
                setShowComparison(checked);
                if (checked) {
                  setVisibleAmbitions(new Set(AMBITION_LEVELS_ORDERED));
                } else {
                  setVisibleAmbitions(new Set([ambition]));
                }
              }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {chartData.length} snapshots • Objectif {ambDef.icon} {ambDef.label}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Alerts Section */}
        {significantAlerts.length > 0 && (
          <div className="space-y-1.5">
            {significantAlerts.map((alert) => {
              const Icon = alert.icon;
              const isHighlight = alert.type === "exceeded" || alert.type === "reached";
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
                    alert.type === "exceeded" && "bg-gradient-to-r from-amber-500/20 to-amber-500/5 border border-amber-500/30",
                    alert.type === "reached" && "bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30",
                    alert.type === "approaching" && "bg-muted/50 border border-border/50"
                  )}
                >
                  <Icon className={cn(
                    "w-4 h-4 flex-shrink-0",
                    alert.type === "exceeded" && "text-amber-500",
                    alert.type === "reached" && "text-emerald-500",
                    alert.type === "approaching" && "text-blue-500"
                  )} />
                  <span className={cn(isHighlight && "font-medium")}>
                    {alert.message}
                  </span>
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    {AMBITION_DEFINITIONS[alert.ambition].icon}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* Ambition Toggles (when comparing) */}
        {showComparison && (
          <div className="flex flex-wrap gap-1.5">
            {AMBITION_LEVELS_ORDERED.map((amb) => {
              const def = getAmbitionDefinition(amb);
              const isVisible = visibleAmbitions.has(amb);
              return (
                <Button
                  key={amb}
                  variant={isVisible ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "text-xs h-7 gap-1",
                    isVisible && amb === "finisher" && "bg-muted-foreground hover:bg-muted-foreground/80",
                    isVisible && amb === "age_group" && "bg-blue-500 hover:bg-blue-600",
                    isVisible && amb === "competitor" && "bg-amber-500 hover:bg-amber-600",
                    isVisible && amb === "elite" && "bg-purple-500 hover:bg-purple-600"
                  )}
                  onClick={() => toggleAmbitionVisibility(amb)}
                >
                  {def.icon} {def.shortLabel}
                </Button>
              );
            })}
          </div>
        )}

        {/* Résumé de tendance global */}
        {currentProgress !== null && (
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Progression globale</span>
                {getTrendIcon(trend)}
              </div>
              <span className="text-lg font-bold text-primary">
                {currentProgress}%
              </span>
            </div>
            {showComparison && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-2">
                {AMBITION_LEVELS_ORDERED.map((amb) => {
                  const progress = latestData ? (latestData as any)[`${amb}_progress`] : null;
                  if (progress === null) return null;
                  const def = getAmbitionDefinition(amb);
                  return (
                    <span key={amb} className="flex items-center gap-1">
                      {def.icon} {progress}%
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Graphique principal */}
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                opacity={0.4} 
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 120]}
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number | null, name: string) => {
                  if (value === null) return ["—", name];
                  return [`${value.toFixed(0)}%`, name];
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                wrapperStyle={{ fontSize: "10px" }}
              />
              
              {/* Reference lines for targets */}
              <ReferenceLine
                y={100}
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
                strokeOpacity={0.6}
              />
              
              {/* Lines for each visible ambition */}
              {AMBITION_LEVELS_ORDERED.map((amb) => {
                if (!visibleAmbitions.has(amb)) return null;
                const def = getAmbitionDefinition(amb);
                const isCurrentAmbition = amb === ambition;
                
                return (
                  <Line
                    key={amb}
                    type="monotone"
                    dataKey={`${amb}_progress`}
                    name={`${def.icon} ${def.shortLabel}`}
                    stroke={AMBITION_COLORS[amb]}
                    strokeWidth={isCurrentAmbition ? 2.5 : 1.5}
                    strokeDasharray={isCurrentAmbition ? undefined : "4 2"}
                    dot={{ 
                      fill: AMBITION_COLORS[amb], 
                      strokeWidth: 0, 
                      r: isCurrentAmbition ? 4 : 2 
                    }}
                    activeDot={{ 
                      r: isCurrentAmbition ? 6 : 4, 
                      strokeWidth: 2, 
                      stroke: "hsl(var(--background))" 
                    }}
                    connectNulls
                  />
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison Table (when comparing) */}
        {showComparison && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 font-medium text-muted-foreground">Ambition</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">VLamax</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">TTE</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">FTP/kg</th>
                </tr>
              </thead>
              <tbody>
                {AMBITION_LEVELS_ORDERED.map((amb) => {
                  const def = getAmbitionDefinition(amb);
                  const vlamaxRange = getVLamaxRange(objectif, amb);
                  const tteTarget = getTTETargetByAmbition(objectif, amb);
                  const ftpKgTarget = getFtpKgTargetByAmbition(objectif, amb);
                  const isCurrentAmbition = amb === ambition;
                  
                  return (
                    <tr 
                      key={amb} 
                      className={cn(
                        "border-b border-border/30",
                        isCurrentAmbition && "bg-primary/5"
                      )}
                    >
                      <td className="py-2 font-medium">
                        {def.icon} {def.shortLabel}
                        {isCurrentAmbition && <span className="ml-1 text-primary">•</span>}
                      </td>
                      <td className="text-center py-2">≤ {vlamaxRange.optimal.toFixed(2)}</td>
                      <td className="text-center py-2">≥ {tteTarget} min</td>
                      <td className="text-center py-2">≥ {ftpKgTarget.toFixed(1)}</td>
                    </tr>
                  );
                })}
                {latestData && (
                  <tr className="font-bold bg-muted/30">
                    <td className="py-2">Actuel</td>
                    <td className="text-center py-2">{latestData.vlamax?.toFixed(2) ?? "—"}</td>
                    <td className="text-center py-2">{latestData.tte?.toFixed(0) ?? "—"}</td>
                    <td className="text-center py-2">{latestData.ftpKg?.toFixed(2) ?? "—"}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Valeurs actuelles vs cibles (simple mode) */}
        {!showComparison && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-muted/30 text-center">
              <div className="text-muted-foreground mb-0.5">VLamax</div>
              <div className="font-bold">
                {latestData?.vlamax?.toFixed(2) ?? "—"}
                <span className="text-muted-foreground font-normal ml-1">
                  / {currentTargets.vlamax.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-muted/30 text-center">
              <div className="text-muted-foreground mb-0.5">TTE</div>
              <div className="font-bold">
                {latestData?.tte?.toFixed(0) ?? "—"}
                <span className="text-muted-foreground font-normal ml-1">
                  / {currentTargets.tte} min
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-muted/30 text-center">
              <div className="text-muted-foreground mb-0.5">FTP/kg</div>
              <div className="font-bold">
                {latestData?.ftpKg?.toFixed(2) ?? "—"}
                <span className="text-muted-foreground font-normal ml-1">
                  / {currentTargets.ftpKg.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center italic">
          {showComparison 
            ? `Comparaison des ${visibleAmbitions.size} niveaux d'ambition • ${objectif}`
            : `Progression calculée par rapport aux cibles "${ambDef.label}" • ${objectif}`
          }
        </p>
      </CardContent>
    </Card>
  );
}
