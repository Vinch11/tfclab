// =============================================
// CARBOHYDRATE BURN RATE CHART - INSCYD-style
// Shows g/h of CHO consumption at each intensity
// =============================================

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  ReferenceLine, ReferenceArea, CartesianGrid 
} from "recharts";
import { Flame, AlertTriangle, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateCarbOxidation, calculateFatOxidation } from "@/lib/v2/maderMetabolicModel";

interface CarbBurnRateChartProps {
  vo2max: number;       // ml/kg/min
  vlamax: number;       // mmol/L/s
  weight: number;       // kg
  ftp?: number;         // watts (optional, for reference)
  targetIntensity?: number; // % for race target (e.g., 70 for IM, 80 for 70.3)
  raceType?: string;    // "IM" | "703" | "Marathon" etc.
}

interface CarbDataPoint {
  intensity: number;
  carbRate: number;     // g/h
  fatRate: number;      // g/h (for reference)
  totalRate: number;    // kcal/h
  zone: string;
  sustainable: boolean;
}

/**
 * Calculate carbohydrate and fat oxidation rates using the unified Mader model
 * Replaces the previous custom crossover formula for consistency
 */
function calculateRates(
  intensityPct: number,
  vo2max: number,
  vlamax: number,
  weight: number
): { carbRate: number; fatRate: number; totalRate: number } {
  // g/min from Mader model
  const carbGmin = calculateCarbOxidation(intensityPct, vo2max, vlamax, weight);
  const fatGmin = calculateFatOxidation(intensityPct, vo2max, vlamax, weight);
  
  // Convert to g/h
  const carbRate = Math.round(carbGmin * 60);
  const fatRate = Math.round(fatGmin * 60);
  
  // Total kcal/h (CHO: 4 kcal/g, Fat: 9 kcal/g)
  const totalRate = Math.round(carbRate * 4 + fatRate * 9);
  
  return { carbRate, fatRate, totalRate };
}

function getZoneName(intensity: number): string {
  if (intensity < 55) return "Z1";
  if (intensity < 65) return "Z2";
  if (intensity < 76) return "Z3";
  if (intensity < 85) return "Z4";
  if (intensity < 95) return "Z5";
  return "Z6";
}

function isSustainable(carbRate: number, duration: number = 180): boolean {
  // Max gut absorption ~90g/h for trained athletes
  // Sustainable if carb rate < absorption rate + glycogen depletion buffer
  return carbRate <= 90;
}

export function CarbBurnRateChart({
  vo2max,
  vlamax,
  weight,
  ftp,
  targetIntensity = 70,
  raceType = "IM"
}: CarbBurnRateChartProps) {
  const data = useMemo(() => {
    const points: CarbDataPoint[] = [];
    
    for (let intensity = 40; intensity <= 100; intensity += 2) {
      const rates = calculateCarbBurnRate(intensity, vo2max, vlamax, weight);
      points.push({
        intensity,
        carbRate: rates.carbRate,
        fatRate: rates.fatRate,
        totalRate: rates.totalRate,
        zone: getZoneName(intensity),
        sustainable: isSustainable(rates.carbRate)
      });
    }
    
    return points;
  }, [vo2max, vlamax, weight]);

  // Key metrics
  const targetPoint = data.find(d => d.intensity === targetIntensity) || data[15];
  const gutAbsorptionLimit = 90; // g/h max absorption
  const criticalIntensity = data.find(d => d.carbRate > gutAbsorptionLimit)?.intensity || 95;
  
  // Find FatMax point (peak fat oxidation)
  const fatMaxPoint = data.reduce((max, point) => 
    point.fatRate > max.fatRate ? point : max, data[0]
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    
    const point = payload[0]?.payload as CarbDataPoint;
    
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
        <div className="font-semibold mb-2 flex items-center gap-2">
          <span className="text-foreground">{point.intensity}% VO2max</span>
          <Badge variant="outline" className="text-xs">{point.zone}</Badge>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-orange-500" />
            <span className="text-muted-foreground">Glucides:</span>
            <span className={cn(
              "font-mono font-bold",
              point.carbRate > gutAbsorptionLimit ? "text-red-500" : "text-orange-500"
            )}>
              {point.carbRate} g/h
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span className="text-muted-foreground">Lipides:</span>
            <span className="font-mono text-green-500">{point.fatRate} g/h</span>
          </div>
          <div className="border-t border-border pt-1.5 mt-1.5 flex items-center gap-2">
            <Flame className="h-3 w-3 text-amber-500" />
            <span className="text-muted-foreground">Total:</span>
            <span className="font-mono">{point.totalRate} kcal/h</span>
          </div>
          {!point.sustainable && (
            <div className="flex items-center gap-1 text-red-500 text-xs mt-1">
              <AlertTriangle className="h-3 w-3" />
              Dépasse l'absorption intestinale max
            </div>
          )}
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
              <Flame className="h-4 w-4 text-orange-500" />
              Taux de Combustion des Glucides
            </CardTitle>
            <CardDescription className="text-xs">
              Consommation CHO (g/h) selon l'intensité — Modèle INSCYD
            </CardDescription>
          </div>
          <Badge variant="secondary" className="font-mono">
            VLamax: {vlamax.toFixed(2)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-orange-500/10 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-orange-500 font-mono">
              {targetPoint.carbRate}
            </div>
            <div className="text-[10px] text-muted-foreground">g/h @ {targetIntensity}%</div>
            <div className="text-[10px] text-muted-foreground">({raceType} cible)</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-green-500 font-mono">
              {fatMaxPoint.intensity}%
            </div>
            <div className="text-[10px] text-muted-foreground">FatMax</div>
            <div className="text-[10px] text-muted-foreground">{fatMaxPoint.fatRate} g/h lipides</div>
          </div>
          <div className={cn(
            "rounded-lg p-3 text-center",
            criticalIntensity <= targetIntensity ? "bg-red-500/10" : "bg-amber-500/10"
          )}>
            <div className={cn(
              "text-xl font-bold font-mono",
              criticalIntensity <= targetIntensity ? "text-red-500" : "text-amber-500"
            )}>
              {criticalIntensity}%
            </div>
            <div className="text-[10px] text-muted-foreground">Seuil critique</div>
            <div className="text-[10px] text-muted-foreground">&gt;90g/h CHO</div>
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
              
              {/* Sustainable zone (under 90g/h) */}
              <ReferenceArea
                y1={0}
                y2={gutAbsorptionLimit}
                fill="hsl(142, 71%, 45%)"
                fillOpacity={0.1}
              />
              
              {/* Target intensity line */}
              <ReferenceLine 
                x={targetIntensity} 
                stroke="hsl(var(--primary))" 
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ 
                  value: `Cible ${raceType}`, 
                  position: "top",
                  fontSize: 10,
                  fill: "hsl(var(--primary))"
                }}
              />
              
              {/* Gut absorption limit */}
              <ReferenceLine 
                y={gutAbsorptionLimit} 
                stroke="hsl(0, 84%, 60%)" 
                strokeDasharray="3 3"
                label={{ 
                  value: "90g/h max absorption", 
                  position: "right",
                  fontSize: 9,
                  fill: "hsl(0, 84%, 60%)"
                }}
              />
              
              <XAxis 
                dataKey="intensity" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `${v}%`}
                domain={[40, 100]}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(v) => `${v}g`}
                domain={[0, 180]}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Fat rate (green, behind) */}
              <Area 
                type="monotone" 
                dataKey="fatRate" 
                fill="hsl(142, 71%, 45%)"
                fillOpacity={0.3}
                stroke="hsl(142, 71%, 45%)"
                strokeWidth={2}
                name="Lipides"
              />
              
              {/* Carb rate (orange, front) */}
              <Area 
                type="monotone" 
                dataKey="carbRate" 
                fill="hsl(24, 95%, 53%)"
                fillOpacity={0.5}
                stroke="hsl(24, 95%, 53%)"
                strokeWidth={2}
                name="Glucides"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Nutrition Recommendation */}
        <div className={cn(
          "p-3 rounded-lg border text-xs",
          targetPoint.carbRate > gutAbsorptionLimit 
            ? "bg-red-500/10 border-red-500/30" 
            : "bg-green-500/10 border-green-500/30"
        )}>
          <div className="flex items-start gap-2">
            {targetPoint.carbRate > gutAbsorptionLimit ? (
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            ) : (
              <Target className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold mb-1">
                {targetPoint.carbRate > gutAbsorptionLimit 
                  ? "⚠️ Risque de déficit énergétique" 
                  : "✅ Nutrition gérable"}
              </div>
              <p className="text-muted-foreground">
                À {targetIntensity}% ({raceType}), vous consommerez <strong>{targetPoint.carbRate} g/h</strong> de glucides.
                {targetPoint.carbRate > gutAbsorptionLimit 
                  ? ` C'est ${targetPoint.carbRate - gutAbsorptionLimit}g/h au-dessus de l'absorption max. Réduisez l'intensité ou entraînez votre tolérance intestinale.`
                  : ` Visez ${Math.min(90, targetPoint.carbRate + 10)}g/h d'apport pour maintenir vos réserves.`}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
