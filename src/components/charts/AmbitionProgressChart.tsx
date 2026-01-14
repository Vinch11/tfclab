/**
 * AmbitionProgressChart - Graphique d'évolution temporelle vers les cibles d'ambition
 * Affiche la progression des métriques (VLamax, TTE, FTP/kg) par rapport aux cibles sur les derniers snapshots
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, ChevronUp, ChevronDown, Minus } from "lucide-react";
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
} from "recharts";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  getVLamaxRange,
  getTTETargetByAmbition,
  getFtpKgTargetByAmbition,
} from "@/lib/physiologicalTargets";
import { AmbitionLevel, getAmbitionDefinition, DEFAULT_AMBITION } from "@/types/ambitionLevel";
import { DbSnapshot } from "@/hooks/useCloudData";

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
  vlamax: number | null;
  vlamaxTarget: number;
  vlamaxProgress: number | null;
  tte: number | null;
  tteTarget: number;
  tteProgress: number | null;
  ftpKg: number | null;
  ftpKgTarget: number;
  ftpKgProgress: number | null;
  globalProgress: number | null;
}

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

function getTrend(
  data: ChartDataPoint[],
  metric: "vlamaxProgress" | "tteProgress" | "ftpKgProgress" | "globalProgress"
): "up" | "down" | "stable" | "unknown" {
  const validPoints = data.filter((d) => d[metric] !== null);
  if (validPoints.length < 2) return "unknown";
  
  const first = validPoints[0][metric] as number;
  const last = validPoints[validPoints.length - 1][metric] as number;
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
  const ambDef = getAmbitionDefinition(ambition);
  
  // Cibles pour l'ambition courante
  const targets = useMemo(() => {
    const vlamaxRange = getVLamaxRange(objectif, ambition);
    return {
      vlamax: vlamaxRange.optimal,
      tte: getTTETargetByAmbition(objectif, ambition),
      ftpKg: getFtpKgTargetByAmbition(objectif, ambition),
    };
  }, [objectif, ambition]);

  // Préparer les données du graphique (triées par date)
  const chartData = useMemo<ChartDataPoint[]>(() => {
    // Filtrer et trier les snapshots par date
    const sorted = [...snapshots]
      .filter((s) => s.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12); // Derniers 12 snapshots max

    return sorted.map((s) => {
      const ftpKg = s.ftp && s.weight_kg ? s.ftp / s.weight_kg : 
                    s.ftp && weightKg ? s.ftp / weightKg : null;

      const vlamaxProgress = calculateProgress(s.vlamax ?? null, targets.vlamax, true);
      const tteProgress = calculateProgress(s.tte_observed_min ?? null, targets.tte, false);
      const ftpKgProgress = calculateProgress(ftpKg, targets.ftpKg, false);

      // Score global = moyenne des progressions valides
      const validProgresses = [vlamaxProgress, tteProgress, ftpKgProgress].filter(
        (p) => p !== null
      ) as number[];
      const globalProgress =
        validProgresses.length > 0
          ? Math.round(validProgresses.reduce((a, b) => a + b, 0) / validProgresses.length)
          : null;

      return {
        date: s.date,
        dateLabel: format(parseISO(s.date), "dd MMM", { locale: fr }),
        vlamax: s.vlamax ?? null,
        vlamaxTarget: targets.vlamax,
        vlamaxProgress,
        tte: s.tte_observed_min ?? null,
        tteTarget: targets.tte,
        tteProgress,
        ftpKg,
        ftpKgTarget: targets.ftpKg,
        ftpKgProgress,
        globalProgress,
      };
    });
  }, [snapshots, targets, weightKg]);

  // Calculer les tendances
  const trends = useMemo(() => ({
    global: getTrend(chartData, "globalProgress"),
    vlamax: getTrend(chartData, "vlamaxProgress"),
    tte: getTrend(chartData, "tteProgress"),
    ftpKg: getTrend(chartData, "ftpKgProgress"),
  }), [chartData]);

  // Dernière valeur pour affichage
  const latestData = chartData[chartData.length - 1] ?? null;

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

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-primary" />
            Évolution vers les cibles
          </CardTitle>
          <Badge variant="outline" className={cn("gap-1", ambDef.color)}>
            <span>{ambDef.icon}</span>
            {ambDef.shortLabel}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Progression sur les {chartData.length} derniers snapshots
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Résumé de tendance global */}
        {latestData && latestData.globalProgress !== null && (
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Progression globale</span>
                {getTrendIcon(trends.global)}
              </div>
              <span className="text-lg font-bold text-primary">
                {latestData.globalProgress}%
              </span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                VLamax {getTrendIcon(trends.vlamax)}
              </span>
              <span className="flex items-center gap-1">
                TTE {getTrendIcon(trends.tte)}
              </span>
              <span className="flex items-center gap-1">
                FTP/kg {getTrendIcon(trends.ftpKg)}
              </span>
            </div>
          </div>
        )}

        {/* Graphique principal */}
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
                height={30}
                wrapperStyle={{ fontSize: "11px" }}
              />
              <ReferenceLine
                y={100}
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                label={{
                  value: "Cible",
                  position: "right",
                  fontSize: 10,
                  fill: "hsl(var(--primary))",
                }}
              />
              <Line
                type="monotone"
                dataKey="globalProgress"
                name="Global"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="vlamaxProgress"
                name="VLamax"
                stroke="hsl(var(--chart-1))"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={{ r: 2 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="tteProgress"
                name="TTE"
                stroke="hsl(var(--chart-2))"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={{ r: 2 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="ftpKgProgress"
                name="FTP/kg"
                stroke="hsl(var(--chart-3))"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={{ r: 2 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Valeurs actuelles vs cibles */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-muted/30 text-center">
            <div className="text-muted-foreground mb-0.5">VLamax</div>
            <div className="font-bold">
              {latestData?.vlamax?.toFixed(2) ?? "—"}
              <span className="text-muted-foreground font-normal ml-1">
                / {targets.vlamax.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30 text-center">
            <div className="text-muted-foreground mb-0.5">TTE</div>
            <div className="font-bold">
              {latestData?.tte?.toFixed(0) ?? "—"}
              <span className="text-muted-foreground font-normal ml-1">
                / {targets.tte} min
              </span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-muted/30 text-center">
            <div className="text-muted-foreground mb-0.5">FTP/kg</div>
            <div className="font-bold">
              {latestData?.ftpKg?.toFixed(2) ?? "—"}
              <span className="text-muted-foreground font-normal ml-1">
                / {targets.ftpKg.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center italic">
          Progression calculée par rapport aux cibles "{ambDef.label}" • {objectif}
        </p>
      </CardContent>
    </Card>
  );
}
