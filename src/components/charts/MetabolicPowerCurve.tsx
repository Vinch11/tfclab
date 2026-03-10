// =============================================
// METABOLIC POWER CURVE - INSCYD-style + CP/W' Model (Skiba 2012)
// Shows aerobic vs anaerobic contribution at different durations
// Uses real individualized CP/W' when snapshot data available
// =============================================

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  ReferenceLine, CartesianGrid, Legend
} from "recharts";
import { Zap, Timer, Target, Info, Battery, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  fitCriticalPower, 
  buildPointsFromSnapshot, 
  generateRecoveryTable,
  type CriticalPowerResult 
} from "@/lib/v2/criticalPowerModel";

interface MetabolicPowerCurveProps {
  vo2max: number;       // ml/kg/min
  vlamax: number;       // mmol/L/s
  weight: number;       // kg
  ftp?: number;         // watts
  pMax5s?: number;      // Peak 5s power (optional)
  p30s?: number;        // P30s power (optional)
  p60s?: number;        // P60s power (optional)
  map5min?: number;     // MAP 5min power (optional)
}

interface PowerDataPoint {
  duration: number;
  durationLabel: string;
  totalPower: number;
  aerobicPower: number;
  anaerobicPower: number;
  aerobicPct: number;
  zone: string;
}

/**
 * Calculate power at duration using real CP/W' if available, fallback to generic model
 */
function calculatePowerAtDuration(
  durationSec: number,
  vo2max: number,
  vlamax: number,
  weight: number,
  cpResult: CriticalPowerResult | null,
  ftp?: number
): { totalPower: number; aerobicPower: number; anaerobicPower: number } {
  const estimatedFTP = ftp || (vo2max * 0.075 - vlamax * 0.45) * weight;
  
  // Use real CP/W' if available
  const cp = cpResult ? cpResult.cp : estimatedFTP * 0.95;
  const wPrime = cpResult ? cpResult.wprime : (15000 + vlamax * 8000) * (weight / 70);
  
  const alacticCapacity = 5000 * (weight / 70);
  const alacticTimeConstant = 12;
  const glycolyticTimeConstant = 120 + (1 - vlamax) * 60;
  
  let totalPower: number;
  let anaerobicPower: number;
  
  if (durationSec <= 5) {
    totalPower = cp + (wPrime + alacticCapacity) / durationSec;
    anaerobicPower = totalPower - cp * 0.3;
  } else if (durationSec <= 30) {
    const alacticRemaining = alacticCapacity * Math.exp(-durationSec / alacticTimeConstant);
    totalPower = cp + wPrime / durationSec + alacticRemaining / durationSec;
    anaerobicPower = wPrime / durationSec + alacticRemaining / durationSec;
  } else if (durationSec <= 180) {
    const glycolyticFactor = Math.exp(-durationSec / glycolyticTimeConstant);
    totalPower = cp + (wPrime / durationSec) * (1 + glycolyticFactor);
    anaerobicPower = (wPrime / durationSec) * (1 + glycolyticFactor * 0.5);
  } else if (durationSec <= 1200) {
    totalPower = cp + wPrime / durationSec;
    anaerobicPower = wPrime / durationSec;
  } else {
    const fatigueFactor = 1 - ((durationSec - 1200) / 7200) * 0.15;
    totalPower = cp * Math.max(0.8, fatigueFactor);
    anaerobicPower = wPrime / durationSec * 0.5;
  }
  
  anaerobicPower *= (0.8 + vlamax * 0.4);
  
  const aerobicPower = Math.max(cp * 0.3, totalPower - anaerobicPower);
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

const DURATION_POINTS = [
  5, 10, 15, 30, 45, 60, 90, 120, 180, 240, 300, 420, 600, 
  900, 1200, 1800, 2700, 3600, 5400, 7200
];

export function MetabolicPowerCurve({
  vo2max,
  vlamax,
  weight,
  ftp,
  pMax5s,
  p30s,
  p60s,
  map5min
}: MetabolicPowerCurveProps) {
  // Compute real CP/W' from snapshot data
  const cpResult = useMemo(() => {
    const points = buildPointsFromSnapshot({
      pmax_5s: pMax5s,
      p30s_w: p30s,
      p60s_w: p60s,
      map5min_w: map5min,
      ftp
    });
    return fitCriticalPower(points);
  }, [pMax5s, p30s, p60s, map5min, ftp]);

  // Recovery table from real model
  const recoveryTable = useMemo(() => {
    if (!cpResult) return null;
    return generateRecoveryTable(cpResult.cp, cpResult.wprime, weight);
  }, [cpResult, weight]);

  const data = useMemo(() => {
    const points: PowerDataPoint[] = [];
    
    for (const duration of DURATION_POINTS) {
      const power = calculatePowerAtDuration(duration, vo2max, vlamax, weight, cpResult, ftp);
      
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
    
    // Cap with pMax5s if provided
    if (pMax5s) {
      const p5sIndex = points.findIndex(p => p.duration === 5);
      if (p5sIndex >= 0) {
        points[p5sIndex].totalPower = pMax5s;
        points[p5sIndex].anaerobicPower = Math.max(0, pMax5s - points[p5sIndex].aerobicPower);
        points[p5sIndex].aerobicPct = Math.round((points[p5sIndex].aerobicPower / pMax5s) * 100);
      }
      
      for (let i = 0; i < points.length; i++) {
        if (points[i].totalPower > pMax5s) {
          const ratio = pMax5s / points[i].totalPower;
          points[i].totalPower = pMax5s;
          points[i].aerobicPower = Math.round(points[i].aerobicPower * ratio);
          points[i].anaerobicPower = pMax5s - points[i].aerobicPower;
          points[i].aerobicPct = Math.round((points[i].aerobicPower / pMax5s) * 100);
        }
      }
      
      // Monotonicity
      for (let i = 1; i < points.length; i++) {
        if (points[i].totalPower > points[i - 1].totalPower) {
          const prevTotal = points[i - 1].totalPower;
          points[i].totalPower = prevTotal;
          points[i].aerobicPower = Math.min(points[i].aerobicPower, prevTotal);
          points[i].anaerobicPower = prevTotal - points[i].aerobicPower;
          points[i].aerobicPct = Math.round((points[i].aerobicPower / prevTotal) * 100);
        }
      }
    }
    
    return points;
  }, [vo2max, vlamax, weight, ftp, pMax5s, cpResult]);

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
              {cpResult 
                ? "Modèle CP/W' individualisé (Skiba 2012)" 
                : "Modèle générique — ajoutez P30s, P60s, MAP5' pour individualiser"}
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
        {/* CP/W' Model Summary - only when real model available */}
        {cpResult && (
          <div className="grid grid-cols-4 gap-2 p-2 rounded-lg border border-primary/20 bg-primary/5">
            <div className="text-center">
              <div className="text-xs text-muted-foreground">CP</div>
              <div className="text-sm font-bold font-mono text-primary">{cpResult.cp}W</div>
              {cpResult.cpWkg && (
                <div className="text-[9px] text-muted-foreground">{cpResult.cpWkg} W/kg</div>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">W'</div>
              <div className="text-sm font-bold font-mono text-destructive">{cpResult.wprimeKJ} kJ</div>
              {cpResult.wprimeJkg && (
                <div className="text-[9px] text-muted-foreground">{cpResult.wprimeJkg} J/kg</div>
              )}
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">R²</div>
              <div className="text-sm font-bold font-mono">
                <span className={cpResult.r2 > 0.95 ? "text-green-500" : cpResult.r2 > 0.9 ? "text-amber-500" : "text-red-500"}>
                  {cpResult.r2.toFixed(3)}
                </span>
              </div>
              <div className="text-[9px] text-muted-foreground">{cpResult.points.length} pts</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground">FTP/CP</div>
              <div className="text-sm font-bold font-mono">
                {cpResult.ftpCpRatio ? cpResult.ftpCpRatio.toFixed(2) : "—"}
              </div>
              {ftp && cpResult.cp && (
                <div className="text-[9px] text-muted-foreground">
                  {ftp > cpResult.cp ? `+${ftp - cpResult.cp}W` : `${ftp - cpResult.cp}W`}
                </div>
              )}
            </div>
          </div>
        )}

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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-green-500/10 rounded-lg p-2 text-center cursor-help relative">
                  <Info className="h-3 w-3 absolute top-1 right-1 text-muted-foreground" />
                  <div className="text-lg font-bold text-green-500 font-mono">{ftp || p20min.totalPower}</div>
                  <div className="text-[9px] text-muted-foreground">{ftp ? 'FTP mesuré' : 'P20\' (est.)'}</div>
                  <div className="text-[9px] text-blue-400">{p20min.aerobicPct}% Aér</div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                <p className="font-semibold mb-1">FTP mesuré vs P20' estimé</p>
                <p className="text-muted-foreground">
                  <strong>FTP mesuré</strong> : puissance réelle maintenue 20-60min.
                </p>
                {cpResult && (
                  <p className="text-muted-foreground mt-1">
                    <strong>CP = {cpResult.cp}W</strong> : seuil de steady-state réel (Skiba). 
                    FTP ≠ CP — FTP est tenable ~40-70min, CP est le vrai plafond de durabilité.
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
              
              {/* CP reference line (real model) */}
              {cpResult && (
                <ReferenceLine 
                  y={cpResult.cp} 
                  stroke="hsl(var(--destructive))" 
                  strokeDasharray="8 4"
                  label={{ 
                    value: `CP ${cpResult.cp}W`, 
                    position: "right",
                    fontSize: 9,
                    fill: "hsl(var(--destructive))"
                  }}
                />
              )}
              
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
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top"
                height={30}
                formatter={(value) => (
                  <span className="text-xs">
                    {value === 'aerobicPower' ? '🔵 Aérobie' : '🔴 Anaérobie'}
                  </span>
                )}
              />
              
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

        {/* W'bal Recovery Table - only when real model */}
        {recoveryTable && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <RotateCcw className="h-4 w-4 text-primary" />
              Repos Optimaux W'bal (Skiba 2012)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 px-2 text-muted-foreground font-medium">Format</th>
                    <th className="text-left py-1 px-2 text-muted-foreground font-medium">Puissance</th>
                    <th className="text-left py-1 px-2 text-muted-foreground font-medium">Repos</th>
                    <th className="text-right py-1 px-2 text-muted-foreground font-medium">Reps</th>
                  </tr>
                </thead>
                <tbody>
                  {recoveryTable.map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1.5 px-2 font-medium">{row.format}</td>
                      <td className="py-1.5 px-2 font-mono text-primary">{row.intervalPower}</td>
                      <td className="py-1.5 px-2 font-mono">{row.optimalRest}</td>
                      <td className="py-1.5 px-2 font-mono text-right">{row.maxReps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Interpretation */}
        <div className="p-3 rounded-lg border bg-muted/30 text-xs">
          <div className="flex items-start gap-2">
            <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">Interprétation</div>
              <p className="text-muted-foreground">
                {cpResult ? (
                  <>
                    Modèle individualisé (R²={cpResult.r2.toFixed(2)}) : CP={cpResult.cp}W
                    {cpResult.cpWkg ? ` (${cpResult.cpWkg} W/kg)` : ""}, W'={cpResult.wprimeKJ}kJ.
                    {ftp && cpResult.cp < ftp && (
                      <> CP &lt; FTP de {ftp - cpResult.cp}W → FTP tenable ~40-70min max, pas indéfiniment.</>
                    )}
                    {" "}Les durées de repos ci-dessus sont calibrées sur le W' individuel de l'athlète.
                  </>
                ) : (
                  <>
                    {vlamax > 0.5 
                      ? `VLamax élevée (${vlamax.toFixed(2)}) : forte contribution anaérobie. Bon sprint, limitant sur le long.`
                      : `VLamax basse (${vlamax.toFixed(2)}) : dominance aérobie. Optimal pour l'endurance.`}
                    {" "}À 5 minutes, <strong>{p5min.aerobicPct}% aérobie</strong>. 
                    Ajoutez P30s, P60s et MAP5' au snapshot pour activer le modèle CP/W' individualisé.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
