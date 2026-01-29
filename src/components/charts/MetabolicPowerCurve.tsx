// =============================================
// METABOLIC POWER CURVE - INSCYD-style
// Shows aerobic vs anaerobic contribution at different durations
// =============================================

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  ReferenceLine, CartesianGrid, Legend
} from "recharts";
import { Zap, Timer, Flame, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetabolicPowerCurveProps {
  vo2max: number;       // ml/kg/min
  vlamax: number;       // mmol/L/s
  weight: number;       // kg
  ftp?: number;         // watts
  pMax5s?: number;      // Peak 5s power (optional)
}

interface PowerDataPoint {
  duration: number;       // seconds
  durationLabel: string;  // "5s", "30s", "5min", etc.
  totalPower: number;     // watts
  aerobicPower: number;   // watts (aerobic contribution)
  anaerobicPower: number; // watts (glycolytic + alactic)
  aerobicPct: number;     // % aerobic
  zone: string;
}

/**
 * Calculate power output at a given duration based on metabolic profile
 * Uses simplified critical power model + VLamax influence
 */
function calculatePowerAtDuration(
  durationSec: number,
  vo2max: number,
  vlamax: number,
  weight: number,
  ftp?: number
): { totalPower: number; aerobicPower: number; anaerobicPower: number } {
  // Estimate FTP from VO2max if not provided
  const estimatedFTP = ftp || (vo2max * 0.075 - vlamax * 0.45) * weight;
  
  // Critical Power ≈ FTP (sustainable aerobic power)
  const criticalPower = estimatedFTP * 0.95;
  
  // W' (anaerobic work capacity) - higher VLamax = higher W'
  const wPrime = (15000 + vlamax * 8000) * (weight / 70); // Joules
  
  // Alactic system contribution (ATP-PCr) - very short efforts
  const alacticCapacity = 5000 * (weight / 70); // Joules, ~5-10s worth
  const alacticTimeConstant = 12; // seconds
  
  // Time constants for energy system depletion
  const glycolyticTimeConstant = 120 + (1 - vlamax) * 60; // Higher VLamax = faster glycolytic pathway
  
  // Calculate power using hyperbolic model with modifications
  let totalPower: number;
  let anaerobicPower: number;
  
  if (durationSec <= 5) {
    // Very short: mostly alactic
    totalPower = criticalPower + (wPrime + alacticCapacity) / durationSec;
    anaerobicPower = totalPower - criticalPower * 0.3; // Minimal aerobic at 5s
  } else if (durationSec <= 30) {
    // Short: mix of alactic and glycolytic
    const alacticRemaining = alacticCapacity * Math.exp(-durationSec / alacticTimeConstant);
    totalPower = criticalPower + wPrime / durationSec + alacticRemaining / durationSec;
    anaerobicPower = wPrime / durationSec + alacticRemaining / durationSec;
  } else if (durationSec <= 180) {
    // Medium: primarily glycolytic
    const glycolyticFactor = Math.exp(-durationSec / glycolyticTimeConstant);
    totalPower = criticalPower + (wPrime / durationSec) * (1 + glycolyticFactor);
    anaerobicPower = (wPrime / durationSec) * (1 + glycolyticFactor * 0.5);
  } else if (durationSec <= 1200) {
    // Long: primarily aerobic with declining anaerobic
    totalPower = criticalPower + wPrime / durationSec;
    anaerobicPower = wPrime / durationSec;
  } else {
    // Very long: almost entirely aerobic
    const fatigueFactor = 1 - ((durationSec - 1200) / 7200) * 0.15; // Slight fatigue over 2h
    totalPower = criticalPower * Math.max(0.8, fatigueFactor);
    anaerobicPower = wPrime / durationSec * 0.5;
  }
  
  // VLamax influence on anaerobic contribution
  anaerobicPower *= (0.8 + vlamax * 0.4);
  
  // Ensure aerobic is at least some minimum
  const aerobicPower = Math.max(criticalPower * 0.3, totalPower - anaerobicPower);
  anaerobicPower = totalPower - aerobicPower;
  
  return {
    totalPower: Math.round(Math.max(50, totalPower)),
    aerobicPower: Math.round(Math.max(0, aerobicPower)),
    anaerobicPower: Math.round(Math.max(0, anaerobicPower))
  };
}

function getDurationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}'`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function getZoneFromDuration(seconds: number): string {
  if (seconds <= 10) return "Alactique";
  if (seconds <= 60) return "Anaérobie";
  if (seconds <= 300) return "VO2max";
  if (seconds <= 1200) return "Seuil";
  if (seconds <= 3600) return "Tempo";
  return "Endurance";
}

// Duration points to plot (logarithmic scale)
const DURATION_POINTS = [
  5, 10, 15, 30, 45, 60, 90, 120, 180, 240, 300, 420, 600, 
  900, 1200, 1800, 2700, 3600, 5400, 7200
];

export function MetabolicPowerCurve({
  vo2max,
  vlamax,
  weight,
  ftp,
  pMax5s
}: MetabolicPowerCurveProps) {
  const data = useMemo(() => {
    const points: PowerDataPoint[] = [];
    
    // Calculate all points first
    for (const duration of DURATION_POINTS) {
      const power = calculatePowerAtDuration(duration, vo2max, vlamax, weight, ftp);
      
      points.push({
        duration,
        durationLabel: getDurationLabel(duration),
        totalPower: power.totalPower,
        aerobicPower: power.aerobicPower,
        anaerobicPower: power.anaerobicPower,
        aerobicPct: Math.round((power.aerobicPower / power.totalPower) * 100),
        zone: getZoneFromDuration(duration)
      });
    }
    
    // If pMax5s is provided, use it as the ceiling for all durations
    // Power cannot increase with longer duration, so cap all values
    if (pMax5s) {
      // Override 5s with actual value
      const p5sIndex = points.findIndex(p => p.duration === 5);
      if (p5sIndex >= 0) {
        points[p5sIndex].totalPower = pMax5s;
        points[p5sIndex].anaerobicPower = Math.max(0, pMax5s - points[p5sIndex].aerobicPower);
        points[p5sIndex].aerobicPct = Math.round((points[p5sIndex].aerobicPower / pMax5s) * 100);
      }
      
      // Cap all shorter durations to pMax5s (they can't exceed peak power)
      for (let i = 0; i < points.length; i++) {
        if (points[i].totalPower > pMax5s) {
          const ratio = pMax5s / points[i].totalPower;
          points[i].totalPower = pMax5s;
          points[i].aerobicPower = Math.round(points[i].aerobicPower * ratio);
          points[i].anaerobicPower = pMax5s - points[i].aerobicPower;
          points[i].aerobicPct = Math.round((points[i].aerobicPower / pMax5s) * 100);
        }
      }
      
      // Ensure power decreases monotonically with duration (can't go up)
      for (let i = 1; i < points.length; i++) {
        if (points[i].totalPower > points[i - 1].totalPower) {
          // Cap to previous value
          const prevTotal = points[i - 1].totalPower;
          const ratio = prevTotal / points[i].totalPower;
          points[i].totalPower = prevTotal;
          points[i].aerobicPower = Math.min(points[i].aerobicPower, prevTotal);
          points[i].anaerobicPower = prevTotal - points[i].aerobicPower;
          points[i].aerobicPct = Math.round((points[i].aerobicPower / prevTotal) * 100);
        }
      }
    }
    
    return points;
  }, [vo2max, vlamax, weight, ftp, pMax5s]);

  // Key metrics
  const p5s = data.find(d => d.duration === 5)!;
  const p1min = data.find(d => d.duration === 60)!;
  const p5min = data.find(d => d.duration === 300)!;
  const p20min = data.find(d => d.duration === 1200)!;
  const p60min = data.find(d => d.duration === 3600)!;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    
    const point = payload[0]?.payload as PowerDataPoint;
    
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
        <div className="font-semibold mb-2 flex items-center gap-2">
          <Timer className="h-3 w-3" />
          <span className="text-foreground">{point.durationLabel}</span>
          <Badge variant="outline" className="text-xs">{point.zone}</Badge>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-muted-foreground">Puissance totale:</span>
            <span className="font-mono font-bold">{point.totalPower}W</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span className="text-muted-foreground">Aérobie:</span>
            <span className="font-mono text-blue-500">{point.aerobicPower}W</span>
            <span className="text-muted-foreground text-xs">({point.aerobicPct}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span className="text-muted-foreground">Anaérobie:</span>
            <span className="font-mono text-red-500">{point.anaerobicPower}W</span>
            <span className="text-muted-foreground text-xs">({100 - point.aerobicPct}%)</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Courbe de Puissance Métabolique
            </CardTitle>
            <CardDescription className="text-xs">
              Contribution aérobie vs anaérobie selon la durée d'effort
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs">
              VLamax: {vlamax.toFixed(2)}
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              VO2: {vo2max}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Power Values */}
        <div className="grid grid-cols-5 gap-2">
          <div className="bg-red-500/10 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-red-500 font-mono">{p5s.totalPower}</div>
            <div className="text-[9px] text-muted-foreground">P5s</div>
            <div className="text-[9px] text-red-400">{100 - p5s.aerobicPct}% Ana</div>
          </div>
          <div className="bg-orange-500/10 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-orange-500 font-mono">{p1min.totalPower}</div>
            <div className="text-[9px] text-muted-foreground">P1'</div>
            <div className="text-[9px] text-orange-400">{100 - p1min.aerobicPct}% Ana</div>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-amber-500 font-mono">{p5min.totalPower}</div>
            <div className="text-[9px] text-muted-foreground">P5' (MAP)</div>
            <div className="text-[9px] text-blue-400">{p5min.aerobicPct}% Aér</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-green-500 font-mono">{ftp || p20min.totalPower}</div>
            <div className="text-[9px] text-muted-foreground">{ftp ? 'FTP mesuré' : 'P20\' (est.)'}</div>
            <div className="text-[9px] text-blue-400">{p20min.aerobicPct}% Aér</div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-blue-500 font-mono">{p60min.totalPower}</div>
            <div className="text-[9px] text-muted-foreground">P60'</div>
            <div className="text-[9px] text-blue-400">{p60min.aerobicPct}% Aér</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--muted-foreground))" 
                opacity={0.2} 
              />
              
              {/* FTP reference line */}
              {ftp && (
                <ReferenceLine 
                  y={ftp} 
                  stroke="hsl(var(--primary))" 
                  strokeDasharray="5 5"
                  label={{ 
                    value: `FTP ${ftp}W`, 
                    position: "right",
                    fontSize: 9,
                    fill: "hsl(var(--primary))"
                  }}
                />
              )}
              
              <XAxis 
                dataKey="durationLabel" 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `${v}W`}
                domain={['dataMin - 50', 'dataMax + 50']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top"
                height={30}
                formatter={(value) => (
                  <span className="text-xs">
                    {value === 'aerobicPower' ? '🔵 Aérobie' : '🔴 Anaérobie'}
                  </span>
                )}
              />
              
              {/* Stacked areas - aerobic (bottom) + anaerobic (top) */}
              <Area 
                type="monotone" 
                dataKey="aerobicPower" 
                stackId="1"
                fill="hsl(217, 91%, 60%)"
                fillOpacity={0.6}
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                name="aerobicPower"
              />
              <Area 
                type="monotone" 
                dataKey="anaerobicPower" 
                stackId="1"
                fill="hsl(0, 84%, 60%)"
                fillOpacity={0.5}
                stroke="hsl(0, 84%, 60%)"
                strokeWidth={2}
                name="anaerobicPower"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Interpretation */}
        <div className="p-3 rounded-lg border bg-muted/30 text-xs">
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Interprétation</div>
              <p className="text-muted-foreground">
                {vlamax > 0.5 
                  ? `Votre VLamax élevée (${vlamax.toFixed(2)}) indique une forte contribution anaérobie aux efforts courts. Bon pour le sprint, mais limitant sur les efforts longs.`
                  : `Votre VLamax basse (${vlamax.toFixed(2)}) favorise l'endurance avec une contribution aérobie dominante. Optimal pour les épreuves longues.`}
                {" "}À 5 minutes, vous êtes à <strong>{p5min.aerobicPct}% aérobie</strong>.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
