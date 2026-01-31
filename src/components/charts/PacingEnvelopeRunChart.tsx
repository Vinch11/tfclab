/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PACING ENVELOPE RUN CHART — Graphique Signature TFCL™
 * 
 * Visualisation des zones de pacing (verte/orange/rouge)
 * avec trajectoires de scénarios et règles de discipline
 * 
 * X = distance (% course)
 * Y = intensité (% threshold ou allure)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Line,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type PacingEnvelopeRunResult,
  type PacingScenarioRun,
  PACING_ZONE_COLORS,
} from "@/lib/v2/pacingEnvelopeRunning";

interface PacingEnvelopeRunChartProps {
  result: PacingEnvelopeRunResult;
  highlightScenario?: "DISCIPLINED" | "OPTIMISTIC" | "AGGRESSIVE";
  showAllScenarios?: boolean;
  compact?: boolean;
  className?: string;
}

// Générer les données de zone pour le graphique
function generateZoneData(result: PacingEnvelopeRunResult) {
  const { zones } = result;
  const greenZone = zones.find((z) => z.zone === "GREEN");
  const orangeZone = zones.find((z) => z.zone === "ORANGE");
  const redZone = zones.find((z) => z.zone === "RED");

  const points = [];
  for (let pct = 0; pct <= 100; pct += 5) {
    points.push({
      distancePct: pct,
      greenLow: greenZone?.rangePctThreshold[0] ?? 88,
      greenHigh: greenZone?.rangePctThreshold[1] ?? 92,
      orangeHigh: orangeZone?.rangePctThreshold[1] ?? 97,
      redHigh: redZone?.rangePctThreshold[1] ?? 105,
    });
  }
  return points;
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-popover border rounded-lg p-2 shadow-lg text-xs">
      <p className="font-medium">Distance : {label}%</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color }}>
          {entry.name}: {entry.value?.toFixed(1)}%
        </p>
      ))}
    </div>
  );
}

export function PacingEnvelopeRunChart({
  result,
  highlightScenario = "DISCIPLINED",
  showAllScenarios = false,
  compact = false,
  className,
}: PacingEnvelopeRunChartProps) {
  const zoneData = useMemo(() => generateZoneData(result), [result]);
  
  const scenarioToShow = useMemo(() => {
    if (showAllScenarios) return result.scenarios;
    return result.scenarios.filter((s) => s.type === highlightScenario);
  }, [result.scenarios, highlightScenario, showAllScenarios]);

  const disciplinedScenario = result.scenarios.find((s) => s.type === "DISCIPLINED");

  // Merge scenario trajectory with zone data
  const chartData = useMemo(() => {
    return zoneData.map((point) => {
      const result: any = { ...point };
      
      scenarioToShow.forEach((scenario) => {
        const trajPoint = scenario.trajectory.find((t) => t.distancePct === point.distancePct);
        if (trajPoint) {
          result[`trajectory_${scenario.type}`] = trajPoint.intensityPct;
        } else {
          // Interpolate
          const before = scenario.trajectory.filter((t) => t.distancePct < point.distancePct).pop();
          const after = scenario.trajectory.find((t) => t.distancePct > point.distancePct);
          if (before && after) {
            const ratio = (point.distancePct - before.distancePct) / (after.distancePct - before.distancePct);
            result[`trajectory_${scenario.type}`] = before.intensityPct + ratio * (after.intensityPct - before.intensityPct);
          }
        }
      });
      
      return result;
    });
  }, [zoneData, scenarioToShow]);

  const heightClass = compact ? "h-48" : "h-64";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-lg">📊</span>
            Pacing Envelope™ — {result.distance}
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              result.discipline_level === "VERY_HIGH" && "border-destructive text-destructive",
              result.discipline_level === "HIGH" && "border-warning text-warning",
              result.discipline_level === "MODERATE" && "border-primary text-primary",
              result.discipline_level === "LOW" && "border-success text-success"
            )}
          >
            Discipline: {result.discipline_level}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 sm:p-4">
        <div className={cn(heightClass, "w-full")}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              
              <XAxis
                dataKey="distancePct"
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 10 }}
                label={{ value: "Distance", position: "bottom", fontSize: 10 }}
              />
              
              <YAxis
                domain={[85, 105]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 10 }}
                label={{ value: "% Seuil", angle: -90, position: "left", fontSize: 10 }}
              />
              
              {/* Zone Rouge (fond) */}
              <Area
                type="monotone"
                dataKey="redHigh"
                stroke="none"
                fill={PACING_ZONE_COLORS.RED}
                fillOpacity={0.2}
                name="Zone Rouge"
              />
              
              {/* Zone Orange */}
              <Area
                type="monotone"
                dataKey="orangeHigh"
                stroke="none"
                fill={PACING_ZONE_COLORS.ORANGE}
                fillOpacity={0.3}
                name="Zone Orange"
              />
              
              {/* Zone Verte */}
              <Area
                type="monotone"
                dataKey="greenHigh"
                stroke="none"
                fill={PACING_ZONE_COLORS.GREEN}
                fillOpacity={0.4}
                name="Zone Verte"
              />
              
              {/* Plancher zone verte */}
              <Area
                type="monotone"
                dataKey="greenLow"
                stroke="none"
                fill="hsl(var(--background))"
                fillOpacity={1}
              />
              
              {/* Ligne de séparation 33% (premier tiers) */}
              <ReferenceLine
                x={33}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                strokeWidth={1}
                label={{ value: "1/3", position: "top", fontSize: 9 }}
              />
              
              {/* Ligne de séparation 66% (dernier tiers) */}
              <ReferenceLine
                x={66}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="5 5"
                strokeWidth={1}
                label={{ value: "2/3", position: "top", fontSize: 9 }}
              />
              
              {/* Trajectoire Disciplinée */}
              {chartData[0]?.trajectory_DISCIPLINED !== undefined && (
                <Line
                  type="monotone"
                  dataKey="trajectory_DISCIPLINED"
                  stroke={PACING_ZONE_COLORS.GREEN}
                  strokeWidth={3}
                  dot={false}
                  name="Discipliné"
                />
              )}
              
              {/* Trajectoire Optimiste */}
              {showAllScenarios && chartData[0]?.trajectory_OPTIMISTIC !== undefined && (
                <Line
                  type="monotone"
                  dataKey="trajectory_OPTIMISTIC"
                  stroke={PACING_ZONE_COLORS.ORANGE}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Optimiste"
                />
              )}
              
              {/* Trajectoire Agressive */}
              {showAllScenarios && chartData[0]?.trajectory_AGGRESSIVE !== undefined && (
                <Line
                  type="monotone"
                  dataKey="trajectory_AGGRESSIVE"
                  stroke={PACING_ZONE_COLORS.RED}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={false}
                  name="Agressif"
                />
              )}
              
              <Tooltip content={<CustomTooltip />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Légende */}
        <div className="flex flex-wrap gap-3 justify-center mt-2 px-4 pb-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: PACING_ZONE_COLORS.GREEN }} />
            <span>Sustainable</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: PACING_ZONE_COLORS.ORANGE }} />
            <span>Conditionnel</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: PACING_ZONE_COLORS.RED }} />
            <span>Interdit</span>
          </div>
          {disciplinedScenario && (
            <div className="flex items-center gap-1 ml-2">
              <div className="w-4 h-0.5" style={{ backgroundColor: PACING_ZONE_COLORS.GREEN }} />
              <span>Trajectoire recommandée</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
