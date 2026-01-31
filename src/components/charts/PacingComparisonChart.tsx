/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GRAPHIQUE COMPARATIF PACING — PRÉVU VS RÉEL (TFCL™)
 * 
 * X = % de course
 * Y = Intensité (% seuil)
 * 
 * Affiche:
 * - Enveloppe théorique (zones verte/orange/rouge)
 * - Courbe simulée (scénario choisi)
 * - Courbe réelle (post-race)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PacingCurvePoint } from "@/lib/v2/raceSimulationTFCL";

interface PacingComparisonChartProps {
  plannedCurve: PacingCurvePoint[];
  actualCurve?: PacingCurvePoint[];
  greenZoneRange: [number, number];
  orangeZoneRange: [number, number];
  redZoneStart: number;
  thresholdPace?: number | null;
  showActual?: boolean;
  decisionRobustness?: "ROBUST" | "FRAGILE" | "VERY_FRAGILE";
  className?: string;
  compact?: boolean;
}

export function PacingComparisonChart({
  plannedCurve,
  actualCurve,
  greenZoneRange,
  orangeZoneRange,
  redZoneStart,
  thresholdPace,
  showActual = false,
  decisionRobustness = "ROBUST",
  className,
  compact = false,
}: PacingComparisonChartProps) {
  // Fusionner les données pour le graphique
  const chartData = useMemo(() => {
    return plannedCurve.map((point, idx) => {
      const actualPoint = actualCurve?.[idx];
      return {
        distance: point.distance_pct,
        planned: point.intensity_pct,
        plannedZone: point.zone,
        actual: actualPoint?.intensity_pct ?? null,
        actualZone: actualPoint?.zone ?? null,
        greenMin: greenZoneRange[0],
        greenMax: greenZoneRange[1],
        orangeMax: orangeZoneRange[1],
        redStart: redZoneStart,
      };
    });
  }, [plannedCurve, actualCurve, greenZoneRange, orangeZoneRange, redZoneStart]);

  const robustnessConfig = {
    ROBUST: { label: "Décision robuste", color: "text-emerald-600", bg: "bg-emerald-500/10", emoji: "✅" },
    FRAGILE: { label: "Décision fragile", color: "text-amber-600", bg: "bg-amber-500/10", emoji: "⚠️" },
    VERY_FRAGILE: { label: "Décision très fragile", color: "text-red-600", bg: "bg-red-500/10", emoji: "🚨" },
  };

  const config = robustnessConfig[decisionRobustness];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Badge de robustesse */}
      <div className="flex items-center justify-between">
        <Badge className={cn("text-xs", config.bg, config.color, "border-0")}>
          {config.emoji} {config.label}
        </Badge>
        {thresholdPace && (
          <span className="text-xs text-muted-foreground">
            Seuil : {Math.floor(thresholdPace / 60)}'
            {Math.round(thresholdPace % 60).toString().padStart(2, "0")}"/km
          </span>
        )}
      </div>

      {/* Graphique */}
      <ResponsiveContainer width="100%" height={compact ? 200 : 280}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="greenZone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="orangeZone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="redZone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          
          <XAxis 
            dataKey="distance" 
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${v}%`}
            label={compact ? undefined : { value: "% Course", position: "insideBottom", offset: -5, fontSize: 10 }}
          />
          
          <YAxis 
            domain={[greenZoneRange[0] - 5, redZoneStart + 10]}
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${v}%`}
            label={compact ? undefined : { value: "Intensité", angle: -90, position: "insideLeft", fontSize: 10 }}
          />
          
          {/* Zones de pacing */}
          <ReferenceArea
            y1={greenZoneRange[0]}
            y2={greenZoneRange[1]}
            fill="hsl(var(--success))"
            fillOpacity={0.15}
            stroke="hsl(var(--success))"
            strokeOpacity={0.5}
            strokeDasharray="3 3"
          />
          <ReferenceArea
            y1={greenZoneRange[1]}
            y2={orangeZoneRange[1]}
            fill="hsl(var(--warning))"
            fillOpacity={0.15}
            stroke="hsl(var(--warning))"
            strokeOpacity={0.5}
            strokeDasharray="3 3"
          />
          <ReferenceArea
            y1={orangeZoneRange[1]}
            y2={redZoneStart + 10}
            fill="hsl(var(--destructive))"
            fillOpacity={0.1}
            stroke="hsl(var(--destructive))"
            strokeOpacity={0.3}
            strokeDasharray="3 3"
          />
          
          {/* Ligne seuil (100%) */}
          <ReferenceLine 
            y={100} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="5 5" 
            strokeOpacity={0.5}
          />
          
          {/* Courbe simulée */}
          <Line
            type="monotone"
            dataKey="planned"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))" }}
            name="Pacing simulé"
          />
          
          {/* Courbe réelle (si disponible) */}
          {showActual && actualCurve && actualCurve.length > 0 && (
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: "hsl(var(--foreground))" }}
              name="Pacing réel"
            />
          )}
          
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-popover border rounded-lg p-2 shadow-lg text-xs">
                  <p className="font-medium mb-1">{data.distance}% de la course</p>
                  {payload.map((entry: any) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: entry.stroke }}
                      />
                      <span>{entry.name}: {entry.value?.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          
          {!compact && <Legend wrapperStyle={{ fontSize: "10px" }} />}
        </AreaChart>
      </ResponsiveContainer>

      {/* Légende des zones */}
      <div className="flex items-center justify-center gap-4 text-[10px]">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
          <span>Verte ({greenZoneRange[0]}-{greenZoneRange[1]}%)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50" />
          <span>Orange ({greenZoneRange[1]}-{orangeZoneRange[1]}%)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50" />
          <span>Rouge (&gt;{orangeZoneRange[1]}%)</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPHIQUE GLYCOGÈNE — Simulation de déplétion
// ═══════════════════════════════════════════════════════════════════════════════

interface GlycogenCurvePoint {
  distance_pct: number;
  glycogen_remaining_pct: number;
  depletion_rate: number;
  zone_at_point: "GREEN" | "ORANGE" | "RED";
}

interface GlycogenDepletionChartProps {
  glycogenCurve: GlycogenCurvePoint[];
  depletionPointPct: number | null;
  className?: string;
  compact?: boolean;
}

export function GlycogenDepletionChart({
  glycogenCurve,
  depletionPointPct,
  className,
  compact = false,
}: GlycogenDepletionChartProps) {
  const chartData = glycogenCurve.map(point => ({
    distance: point.distance_pct,
    glycogen: point.glycogen_remaining_pct,
    rate: point.depletion_rate,
    zone: point.zone_at_point,
    critical: 15,
  }));

  return (
    <div className={cn("space-y-2", className)}>
      <ResponsiveContainer width="100%" height={compact ? 150 : 200}>
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="glycogenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          
          <XAxis 
            dataKey="distance" 
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${v}%`}
          />
          
          <YAxis 
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            tickFormatter={(v) => `${v}%`}
          />
          
          {/* Zone critique */}
          <ReferenceArea
            y1={0}
            y2={15}
            fill="hsl(var(--destructive))"
            fillOpacity={0.2}
          />
          
          {/* Ligne critique */}
          <ReferenceLine 
            y={15} 
            stroke="hsl(var(--destructive))" 
            strokeDasharray="5 5"
            label={compact ? undefined : { value: "Zone critique", position: "right", fontSize: 9 }}
          />
          
          {/* Point de déplétion si présent */}
          {depletionPointPct !== null && (
            <ReferenceLine 
              x={depletionPointPct} 
              stroke="hsl(var(--destructive))" 
              strokeWidth={2}
              label={{ value: "💀", position: "top", fontSize: 14 }}
            />
          )}
          
          {/* Courbe glycogène */}
          <Area
            type="monotone"
            dataKey="glycogen"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#glycogenGradient)"
            name="Glycogène restant"
          />
          
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-popover border rounded-lg p-2 shadow-lg text-xs">
                  <p className="font-medium mb-1">{data.distance}% de la course</p>
                  <p>Glycogène: {data.glycogen}%</p>
                  <p className="text-muted-foreground">Déplétion: {data.rate}/10%</p>
                  {data.glycogen <= 15 && (
                    <p className="text-destructive font-medium mt-1">⚠️ Zone critique</p>
                  )}
                </div>
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {depletionPointPct !== null && (
        <p className="text-xs text-destructive text-center">
          ⚠️ Déplétion critique estimée à {depletionPointPct}% de la course
        </p>
      )}
    </div>
  );
}
