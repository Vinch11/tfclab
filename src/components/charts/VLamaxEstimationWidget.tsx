/**
 * ═══════════════════════════════════════════════════════════════
 * VLamax Estimation Dashboard Widget
 * 
 * Real-time VLamax estimation with:
 * - Timeline chart (evolution from snapshots with confidence bands)
 * - Current zone indicator with animated gauge
 * - Trend detection (↑ ↓ stable)
 * - Target overlay for objective
 * ═══════════════════════════════════════════════════════════════
 */

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import type { DbSnapshot } from "@/hooks/useCloudData";
import type { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { PHYSIOLOGICAL_BOUNDS, type SportContext } from "@/lib/v2/vlamaxV2Engine";
import { getVLamaxRange, normalizeObjective } from "@/lib/physiologicalTargets";
import { AmbitionLevel, DEFAULT_AMBITION, getAmbitionDefinition } from "@/types/ambitionLevel";
import { getAgeAdjustedVLamaxProfil, type VLamaxProfil } from "@/lib/ageAdjustment";

// ── Types ──────────────────────────────────────────────────────

interface ChartPoint {
  date: string;
  dateLabel: string;
  vlamax: number | null;
  vlamaxLow: number | null;
  vlamaxHigh: number | null;
  confidence: number;
}

interface VLamaxTrend {
  direction: "up" | "down" | "stable";
  delta: number;
  label: string;
}

// ── Zone config ────────────────────────────────────────────────

const ZONE_CONFIG: Record<VLamaxProfil, {
  color: string;
  bgClass: string;
  textClass: string;
  label: string;
}> = {
  diesel:    { color: "hsl(210, 70%, 50%)", bgClass: "bg-blue-500/10",    textClass: "text-blue-600 dark:text-blue-400",    label: "Diesel" },
  endurant:  { color: "hsl(170, 60%, 45%)", bgClass: "bg-cyan-500/10",    textClass: "text-cyan-600 dark:text-cyan-400",    label: "Endurant" },
  equilibre: { color: "hsl(140, 60%, 40%)", bgClass: "bg-green-500/10",   textClass: "text-green-600 dark:text-green-400",  label: "Équilibré" },
  explosif:  { color: "hsl(25, 80%, 50%)",  bgClass: "bg-orange-500/10",  textClass: "text-orange-600 dark:text-orange-400", label: "Explosif" },
  sprinter:  { color: "hsl(0, 70%, 50%)",   bgClass: "bg-red-500/10",     textClass: "text-red-600 dark:text-red-400",      label: "Sprinter" },
};

// ── Props ──────────────────────────────────────────────────────

export interface VLamaxEstimationWidgetProps {
  /** Current VLamax effectif */
  vlamaxEffectif: VLamaxEffectif;
  /** Athlete snapshots (for timeline) */
  snapshots: DbSnapshot[];
  /** Athlete ID to filter snapshots */
  athleteId: string;
  /** Objective for target overlay */
  objectif: string;
  /** Ambition level for targets */
  ambition?: AmbitionLevel;
  /** Athlete age for zone profiling */
  age?: number | null;
  /** Sport context */
  sport?: SportContext;
  /** Compact mode */
  compact?: boolean;
  className?: string;
}

// ── Main Component ─────────────────────────────────────────────

export function VLamaxEstimationWidget({
  vlamaxEffectif,
  snapshots,
  athleteId,
  objectif,
  ambition = DEFAULT_AMBITION,
  age,
  sport = "velo",
  compact = false,
  className,
}: VLamaxEstimationWidgetProps) {
  // Build timeline data from snapshots
  const { chartData, trend } = useMemo(() => {
    const athleteSnaps = snapshots
      .filter((s) => s.athlete_id === athleteId && s.vlamax != null)
      .sort((a, b) => a.date.localeCompare(b.date));

    const points: ChartPoint[] = athleteSnaps.map((s) => {
      const v = s.vlamax!;
      const conf = s.confidence ?? 0.5;
      const margin = conf >= 0.8 ? 0.02 : conf >= 0.6 ? 0.04 : 0.06;
      return {
        date: s.date,
        dateLabel: format(new Date(s.date), "d MMM", { locale: fr }),
        vlamax: Number(v.toFixed(3)),
        vlamaxLow: Number(Math.max(0.20, v - margin).toFixed(3)),
        vlamaxHigh: Number(Math.min(1.05, v + margin).toFixed(3)),
        confidence: conf,
      };
    });

    // Trend from last 2 points
    let trend: VLamaxTrend = { direction: "stable", delta: 0, label: "Stable" };
    if (points.length >= 2) {
      const last = points[points.length - 1].vlamax!;
      const prev = points[points.length - 2].vlamax!;
      const d = last - prev;
      if (Math.abs(d) < 0.02) {
        trend = { direction: "stable", delta: d, label: "Stable" };
      } else if (d > 0) {
        trend = { direction: "up", delta: d, label: `+${d.toFixed(2)}` };
      } else {
        trend = { direction: "down", delta: d, label: d.toFixed(2) };
      }
    }

    return { chartData: points, trend };
  }, [snapshots, athleteId]);

  // Current profile
  const vlamax = vlamaxEffectif.value;
  const { profil } = useMemo(
    () => getAgeAdjustedVLamaxProfil(vlamax, age),
    [vlamax, age]
  );
  const zoneConfig = ZONE_CONFIG[profil];

  // Targets
  const normalizedObj = normalizeObjective(objectif as any);
  const targets = getVLamaxRange(normalizedObj, ambition);
  const ambitionDef = getAmbitionDefinition(ambition);
  const bounds = PHYSIOLOGICAL_BOUNDS[sport];

  // Gauge position (0-100)
  const gaugePosition = vlamax !== null
    ? Math.min(100, Math.max(0, ((vlamax - bounds.min) / (bounds.max - bounds.min)) * 100))
    : 50;

  if (vlamax === null) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Zap className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">VLamax non disponible</p>
          <p className="text-xs mt-1">Ajoutez un snapshot avec FTP/Pmax pour estimer</p>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;
  const trendColor = trend.direction === "up"
    ? "text-amber-600 dark:text-amber-400"
    : trend.direction === "down"
      ? "text-blue-600 dark:text-blue-400"
      : "text-muted-foreground";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Estimation VLamax
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className={cn("text-xs gap-1", zoneConfig.textClass)}>
              {zoneConfig.label}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className={cn("text-xs gap-1", trendColor)}>
                    <TrendIcon className="h-3 w-3" />
                    {trend.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Tendance sur les 2 derniers snapshots</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* ── Current Value + Gauge ── */}
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="text-center"
          >
            <span className="text-3xl font-bold font-mono tracking-tight">
              {vlamaxEffectif.v2
                ? `≈ ${vlamax.toFixed(2)}`
                : vlamax.toFixed(2)}
            </span>
            <p className="text-[10px] text-muted-foreground">mmol/L/s</p>
          </motion.div>

          {/* Mini zone gauge */}
          <div className="flex-1">
            <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-blue-200 via-green-200 via-yellow-200 to-red-200 dark:from-blue-900/40 dark:via-green-900/40 dark:via-yellow-900/40 dark:to-red-900/40">
              {/* Target zone overlay */}
              {targets && (
                <div
                  className="absolute h-full bg-green-500/25 dark:bg-green-500/15 border-x border-green-500/50"
                  style={{
                    left: `${((targets.min - bounds.min) / (bounds.max - bounds.min)) * 100}%`,
                    width: `${((targets.max - targets.min) / (bounds.max - bounds.min)) * 100}%`,
                  }}
                />
              )}
              {/* Athlete position */}
              <motion.div
                className="absolute top-0 bottom-0 w-3 h-3 rounded-full border-2 border-background shadow-sm"
                style={{ backgroundColor: zoneConfig.color }}
                initial={{ left: "50%" }}
                animate={{ left: `${gaugePosition}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5 px-0.5">
              <span>{bounds.min.toFixed(2)}</span>
              {targets && (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Cible: {targets.min.toFixed(2)}–{targets.max.toFixed(2)}
                </span>
              )}
              <span>{bounds.max.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ── Confidence bar ── */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">Fiabilité</span>
          <Progress
            value={vlamaxEffectif.confidence * 100}
            className="h-1.5 flex-1"
          />
          <span className="text-[11px] font-mono text-muted-foreground">
            {Math.round(vlamaxEffectif.confidence * 100)}%
          </span>
        </div>

        {/* ── Evolution Chart ── */}
        {chartData.length >= 2 && (
          <div className={compact ? "h-[160px]" : "h-[200px]"}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                <defs>
                  <linearGradient id="vlamaxGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={zoneConfig.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={zoneConfig.color} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={zoneConfig.color} stopOpacity={0.08} />
                    <stop offset="100%" stopColor={zoneConfig.color} stopOpacity={0.08} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.12} />

                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[
                    (dataMin: number) => Math.max(bounds.min, Math.floor((dataMin - 0.05) * 20) / 20),
                    (dataMax: number) => Math.min(bounds.max, Math.ceil((dataMax + 0.05) * 20) / 20),
                  ]}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v: number) => v.toFixed(2)}
                  tickLine={false}
                  axisLine={false}
                />

                {/* Target zone band */}
                {targets && (
                  <ReferenceArea
                    y1={targets.min}
                    y2={targets.max}
                    fill="hsl(140, 60%, 50%)"
                    fillOpacity={0.08}
                    ifOverflow="extendDomain"
                  />
                )}

                {/* Target optimal line */}
                {targets && (
                  <ReferenceLine
                    y={targets.optimal}
                    stroke="hsl(140, 60%, 40%)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                  />
                )}

                {/* Confidence band */}
                <Area
                  type="monotone"
                  dataKey="vlamaxHigh"
                  stroke="none"
                  fill="url(#confidenceBand)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="vlamaxLow"
                  stroke="none"
                  fill="hsl(var(--background))"
                  isAnimationActive={false}
                />

                {/* Main VLamax line */}
                <Area
                  type="monotone"
                  dataKey="vlamax"
                  stroke={zoneConfig.color}
                  strokeWidth={2}
                  fill="url(#vlamaxGradient)"
                  dot={{ r: 3, fill: zoneConfig.color, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                  activeDot={{ r: 5, stroke: zoneConfig.color, strokeWidth: 2 }}
                  animationDuration={800}
                />

                <RechartsTooltip content={<ChartTooltipContent />} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {chartData.length < 2 && (
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Ajoutez au moins 2 snapshots avec VLamax pour voir l'évolution.
            </p>
          </div>
        )}

        {/* ── Error margin + warnings ── */}
        {vlamaxEffectif.variationWarning && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              {vlamaxEffectif.variationMessage}
            </p>
          </div>
        )}

        {/* ── Ambition target summary ── */}
        {targets && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-1.5">
              {vlamax >= targets.min && vlamax <= targets.max ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              )}
              <span>
                {vlamax >= targets.min && vlamax <= targets.max
                  ? "Dans la cible"
                  : vlamax > targets.max
                    ? `+${(vlamax - targets.max).toFixed(2)} au-dessus`
                    : `${(targets.min - vlamax).toFixed(2)} en-dessous`}
              </span>
            </div>
            <Badge variant="outline" className="text-[9px]">
              {ambitionDef.icon} {ambitionDef.label}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Chart Tooltip ──────────────────────────────────────────────

function ChartTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload as ChartPoint;
  if (!data) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-2.5 shadow-lg text-xs space-y-1">
      <p className="font-medium">{data.dateLabel}</p>
      <p className="font-mono">
        VLamax: <strong>{data.vlamax?.toFixed(2)}</strong>
      </p>
      {data.vlamaxLow != null && data.vlamaxHigh != null && (
        <p className="text-muted-foreground">
          Plage: {data.vlamaxLow.toFixed(2)} – {data.vlamaxHigh.toFixed(2)}
        </p>
      )}
      <p className="text-muted-foreground">
        Fiabilité: {Math.round(data.confidence * 100)}%
      </p>
    </div>
  );
}

export default VLamaxEstimationWidget;
