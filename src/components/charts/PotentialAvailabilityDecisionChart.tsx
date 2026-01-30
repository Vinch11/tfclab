/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * POTENTIAL × AVAILABILITY → DECISION CHART
 * TFCL Core Signature Graphic
 * 
 * "Performance on race day = Potential × Availability × Discipline"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { 
  UsablePacingCeiling, 
  ConsequenceSimulationResult,
  DecisionChartDataPoint 
} from "@/lib/v2/usablePacingCeiling";
import { 
  generateDecisionChartData,
  PACING_DECISION_COLORS 
} from "@/lib/v2/usablePacingCeiling";

interface PotentialAvailabilityDecisionChartProps {
  usableCeiling: UsablePacingCeiling;
  scenarios: ConsequenceSimulationResult[];
  targetRaceDurationMin: number;
  selectedScenario?: 'disciplined' | 'envelope_edge' | 'envelope_violation';
  athleteName?: string;
  className?: string;
}

export function PotentialAvailabilityDecisionChart({
  usableCeiling,
  scenarios,
  targetRaceDurationMin,
  selectedScenario = 'disciplined',
  athleteName = "Athlète",
  className,
}: PotentialAvailabilityDecisionChartProps) {
  // Generate chart data for selected scenario
  const chartData = useMemo(() => {
    const scenario = scenarios.find(s => s.scenario === selectedScenario);
    if (!scenario) return [];
    return generateDecisionChartData(usableCeiling, targetRaceDurationMin, scenario);
  }, [usableCeiling, targetRaceDurationMin, scenarios, selectedScenario]);
  
  const currentScenario = scenarios.find(s => s.scenario === selectedScenario);
  
  // Colors
  const statusColors = PACING_DECISION_COLORS[usableCeiling.status];
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    
    const data = payload[0].payload as DecisionChartDataPoint;
    const zoneColors = {
      safe: 'text-success',
      risk: 'text-warning',
      forbidden: 'text-destructive',
    };
    
    return (
      <div className="bg-background/95 backdrop-blur border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-sm mb-2">
          {data.time} min ({data.timePct}%)
          {data.label && <span className="ml-2 text-muted-foreground">— {data.label}</span>}
        </p>
        <div className="space-y-1 text-xs">
          <p className={cn("font-medium", zoneColors[data.zone])}>
            Intensité: {data.intensity}% • Zone: {data.zone === 'safe' ? 'Sûre' : data.zone === 'risk' ? 'Risque' : 'Interdite'}
          </p>
          <p>Risque: {data.riskIndex}/100</p>
          <p>Glycogène: {data.glycogenRemaining}%</p>
          {data.driftActive && (
            <p className="text-amber-600 font-medium">⚠️ Dérive métabolique active</p>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              Potentiel × Disponibilité → Décision
            </CardTitle>
            <CardDescription className="text-xs">
              {athleteName} • {formatDuration(targetRaceDurationMin)}
            </CardDescription>
          </div>
          <Badge 
            variant="outline" 
            className={cn("text-xs", statusColors.bg, statusColors.text, statusColors.border)}
          >
            {usableCeiling.statusEmoji} {usableCeiling.statusLabel}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Scenario indicator */}
        <div className="flex items-center gap-2 mb-3 text-xs">
          <span className="text-muted-foreground">Scénario:</span>
          <Badge 
            variant={selectedScenario === 'disciplined' ? 'default' : 
                    selectedScenario === 'envelope_edge' ? 'secondary' : 'destructive'}
            className="text-xs"
          >
            {currentScenario?.scenarioLabel}
          </Badge>
          {currentScenario && (
            <span className="text-muted-foreground">
              Risque: {currentScenario.riskLabel}
            </span>
          )}
        </div>
        
        {/* Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              
              {/* Zones de référence */}
              <ReferenceArea 
                y1={0} 
                y2={usableCeiling.targetRangePct[1]} 
                fill="hsl(var(--success))" 
                fillOpacity={0.1} 
              />
              <ReferenceArea 
                y1={usableCeiling.targetRangePct[1]} 
                y2={usableCeiling.usableCeilingPct + 5} 
                fill="hsl(var(--warning))" 
                fillOpacity={0.1} 
              />
              <ReferenceArea 
                y1={usableCeiling.usableCeilingPct + 5} 
                y2={100} 
                fill="hsl(var(--destructive))" 
                fillOpacity={0.1} 
              />
              
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${v}m`}
                label={{ value: 'Temps (min)', position: 'bottom', fontSize: 10, offset: -5 }}
              />
              
              <YAxis 
                domain={[50, 100]}
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${v}%`}
                label={{ value: 'Intensité', angle: -90, position: 'insideLeft', fontSize: 10 }}
              />
              
              {/* Lignes de référence */}
              <ReferenceLine 
                y={usableCeiling.usableCeilingPct} 
                stroke="hsl(var(--primary))"
                strokeDasharray="5 5"
                label={{ value: 'Plafond utilisable', fontSize: 9, position: 'right' }}
              />
              <ReferenceLine 
                y={usableCeiling.absoluteCeilingPct} 
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                label={{ value: 'Potentiel', fontSize: 9, position: 'right' }}
              />
              <ReferenceLine 
                y={usableCeiling.targetIntensityPct} 
                stroke="hsl(var(--success))"
                strokeDasharray="2 2"
                label={{ value: 'Cible', fontSize: 9, position: 'right' }}
              />
              
              {/* Area for risk */}
              <Area
                type="monotone"
                dataKey="riskIndex"
                fill="hsl(var(--destructive))"
                fillOpacity={0.2}
                stroke="none"
                yAxisId={0}
                hide
              />
              
              {/* Main intensity line */}
              <Line
                type="monotone"
                dataKey="intensity"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 5, stroke: "hsl(var(--primary))" }}
              />
              
              {/* Glycogen line */}
              <Line
                type="monotone"
                dataKey="glycogenRemaining"
                stroke="hsl(var(--chart-4))"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend 
                verticalAlign="bottom"
                height={20}
                iconSize={8}
                formatter={(value) => (
                  <span className="text-xs">
                    {value === 'intensity' ? 'Intensité' : 
                     value === 'glycogenRemaining' ? 'Glycogène' : value}
                  </span>
                )}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Consequence summary */}
        {currentScenario && (
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded bg-muted/50 text-center">
                <p className="text-muted-foreground">Intensité</p>
                <p className="font-bold">{currentScenario.intensityPct}%</p>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <p className="text-muted-foreground">Risque</p>
                <p className="font-bold">{currentScenario.riskLevel}/100</p>
              </div>
              <div className="p-2 rounded bg-muted/50 text-center">
                <p className="text-muted-foreground">Récupération</p>
                <p className="font-bold">{currentScenario.recoveryPossible ? '✅' : '❌'}</p>
              </div>
            </div>
            
            {/* Sentence */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs italic text-muted-foreground">
                "{currentScenario.sentences[0]}"
              </p>
            </div>
          </div>
        )}
        
        {/* Zone annotations */}
        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded bg-success/10 text-success">
            Sûr — Patient mais stable
          </span>
          <span className="px-2 py-0.5 rounded bg-warning/10 text-warning">
            Risque — Fort maintenant, coûteux après
          </span>
          <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive">
            Interdit — Zone d'effondrement
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export default PotentialAvailabilityDecisionChart;
