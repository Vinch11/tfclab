/**
 * Glycogen Depletion Timeline Chart
 * Visualisation segment par segment du risque glycogène
 */

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Battery, Fuel } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SegmentResult, getDepletionRiskColor, getDepletionRiskBgColor } from '@/lib/v2/raceSimulation';

interface GlycogenDepletionChartProps {
  segments: SegmentResult[];
  distanceKm: number;
  className?: string;
  compact?: boolean;
}

interface ChartDataPoint {
  km: number;
  glycogen: number;
  glycogenNoNutrition: number;
  fuelRisk: number;
  rpe: number;
  segment: SegmentResult;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  
  const data = payload[0].payload as ChartDataPoint;
  const segment = data.segment;
  
  return (
    <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
      <div className="font-medium mb-2">Km {Math.round(data.km)}</div>
      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <Battery className="w-4 h-4 text-primary" />
          <span>Avec nutrition: {Math.round(data.glycogen)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Battery className="w-4 h-4 text-muted-foreground" />
          <span>Sans nutrition: {Math.round(data.glycogenNoNutrition)}%</span>
        </div>
        <div className="text-xs font-medium text-primary">
          Gain nutrition: +{Math.round(data.glycogen - data.glycogenNoNutrition)}%
        </div>
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-amber-500" />
          <span>Risque fuel: {Math.round(data.fuelRisk)}/100</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">RPE estimé: {data.rpe.toFixed(1)}/10</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("font-medium", getDepletionRiskColor(segment.depletionRisk))}>
            {segment.depletionRisk}
          </span>
        </div>
        {segment.notes.length > 0 && (
          <div className="pt-1 border-t mt-1">
            {segment.notes.map((note, i) => (
              <div key={i} className="text-xs text-muted-foreground">{note}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function GlycogenDepletionChart({ 
  segments, 
  distanceKm, 
  className,
  compact = false 
}: GlycogenDepletionChartProps) {
  if (!segments || segments.length === 0) {
    return null;
  }
  
  // Préparer les données
  const data: ChartDataPoint[] = segments.map((segment) => ({
    km: segment.distanceKm,
    glycogen: segment.glycogenRemaining,
    glycogenNoNutrition: segment.glycogenWithoutNutrition ?? segment.glycogenRemaining,
    fuelRisk: segment.fuelRiskIndex,
    rpe: segment.rpeEstimate,
    segment,
  }));
  
  // Ajouter point initial
  data.unshift({
    km: 0,
    glycogen: 100,
    glycogenNoNutrition: 100,
    fuelRisk: 0,
    rpe: 4,
    segment: segments[0],
  });
  
  // Trouver les zones de risque
  const criticalZoneStart = segments.find(s => s.depletionRisk === 'CRITICAL' || s.depletionRisk === 'HIGH');
  const lowGlycogenZone = segments.find(s => s.glycogenRemaining < 30);
  
  return (
    <Card className={cn("", className)}>
      <CardHeader className={compact ? "pb-2" : ""}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn("flex items-center gap-2", compact && "text-base")}>
              <Fuel className="w-5 h-5 text-amber-500" />
              Déplétion Glycogène
            </CardTitle>
            {!compact && (
              <CardDescription>
                Évolution des réserves segment par segment
              </CardDescription>
            )}
          </div>
          {lowGlycogenZone && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Zone critique
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("w-full", compact ? "h-48" : "h-64")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="glycogenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              
              <XAxis 
                dataKey="km" 
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${Math.round(v)}km`}
                className="text-muted-foreground"
              />
              
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
                className="text-muted-foreground"
              />
              
              {/* Zone critique si glycogène < 30% */}
              <ReferenceArea 
                y1={0} 
                y2={30} 
                fill="hsl(var(--destructive))" 
                fillOpacity={0.1}
                label={{ value: "Zone critique", position: "insideBottomLeft", fontSize: 10 }}
              />
              
              {/* Ligne de seuil critique */}
              <ReferenceLine 
                y={30} 
                stroke="hsl(var(--destructive))" 
                strokeDasharray="3 3"
                label={{ value: "30%", position: "right", fontSize: 10 }}
              />
              
              {/* Ligne de seuil warning */}
              <ReferenceLine 
                y={50} 
                stroke="hsl(var(--warning))" 
                strokeDasharray="2 2"
                strokeOpacity={0.5}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Zone de risque fuel (inversée) */}
              <Area
                type="monotone"
                dataKey="fuelRisk"
                stroke="hsl(var(--destructive))"
                strokeWidth={1}
                strokeOpacity={0.5}
                fill="url(#riskGradient)"
                name="Risque fuel"
              />
              
              {/* Courbe SANS nutrition (pointillés) */}
              <Area
                type="monotone"
                dataKey="glycogenNoNutrition"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="6 4"
                fill="none"
                name="Sans nutrition"
              />
              
              {/* Courbe glycogène principale (avec nutrition) */}
              <Area
                type="monotone"
                dataKey="glycogen"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#glycogenGradient)"
                name="Avec nutrition"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Légende */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Avec nutrition</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0 border-t-2 border-dashed border-muted-foreground" />
            <span>Sans nutrition</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive/50" />
            <span>Risque fuel</span>
          </div>
        </div>
        
        {!compact && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <strong>Lecture :</strong> La courbe bleue montre l'évolution estimée des réserves de glycogène.
            En dessous de 30%, le risque de défaillance augmente significativement.
            La zone rouge indique le niveau de risque métabolique.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GlycogenDepletionChart;
