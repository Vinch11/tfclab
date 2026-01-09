/**
 * Nutrition Predictive Chart – Besoins glucidiques g/h
 * Courbe par intensité avec zones de risque
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
  ReferenceArea,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Utensils, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface NutritionPredictiveChartProps {
  vlamaxValue: number | null;
  objectif: string;
  sport?: "velo" | "cap" | "triathlon";
  staffMode?: boolean;
  className?: string;
}

// Calcul des besoins glucidiques par intensité
const computeNutritionCurve = (
  vlamax: number | null,
  sport: "velo" | "cap" | "triathlon"
) => {
  const baseValue = vlamax !== null ? vlamax : 0.45; // Default si inconnu
  
  // Facteur de réduction pour CAP
  const sportFactor = sport === "cap" ? 0.75 : sport === "triathlon" ? 0.85 : 1.0;
  
  // Génère les données pour différentes intensités
  const data = [];
  for (let intensity = 50; intensity <= 100; intensity += 5) {
    // Base consumption augmente avec intensité et VLamax
    let baseConsumption = 40 + (intensity - 50) * 1.5;
    
    // Ajustement VLamax (plus élevé = plus de glucides)
    const vlamaxFactor = 1 + (baseValue - 0.35) * 1.5;
    baseConsumption *= vlamaxFactor;
    
    // Ajustement sport
    baseConsumption *= sportFactor;
    
    const min = Math.round(Math.max(30, baseConsumption * 0.85));
    const max = Math.round(Math.min(120, baseConsumption * 1.15));
    const recommended = Math.round((min + max) / 2);
    
    data.push({
      intensity,
      min,
      max,
      recommended,
      label: `${intensity}% FTP`
    });
  }
  
  return data;
};

// Zones de risque digestif
const getDigestiveRiskZone = (gPerHour: number, sport: string): {
  level: string;
  color: string;
} => {
  const threshold = sport === "cap" ? 70 : sport === "triathlon" ? 85 : 100;
  
  if (gPerHour >= threshold) {
    return { level: "Risque élevé", color: "hsl(var(--destructive))" };
  }
  if (gPerHour >= threshold * 0.85) {
    return { level: "Vigilance", color: "hsl(var(--warning))" };
  }
  return { level: "Zone sûre", color: "hsl(var(--success))" };
};

const CustomTooltip = ({ active, payload, label, sport }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload;
  const riskInfo = getDigestiveRiskZone(data.recommended, sport);
  
  return (
    <div className="bg-background border border-border rounded-lg p-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{data.label}</p>
      <p className="text-muted-foreground">
        <span className="font-mono font-semibold text-foreground">{data.recommended}</span> g/h
        <span className="ml-2 text-muted-foreground">({data.min}–{data.max})</span>
      </p>
      <p style={{ color: riskInfo.color }} className="text-xs">{riskInfo.level}</p>
    </div>
  );
};

export function NutritionPredictiveChart({
  vlamaxValue,
  objectif,
  sport = "velo",
  staffMode = false,
  className
}: NutritionPredictiveChartProps) {
  const isDataMissing = vlamaxValue === null;
  
  const data = useMemo(() => {
    return computeNutritionCurve(vlamaxValue, sport);
  }, [vlamaxValue, sport]);
  
  const digestiveThreshold = sport === "cap" ? 70 : sport === "triathlon" ? 85 : 100;
  const sportLabel = sport === "cap" ? "Course à pied" : sport === "triathlon" ? "Triathlon" : "Vélo";

  return (
    <Card className={cn("overflow-hidden", isDataMissing && "opacity-60", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Utensils className="w-4 h-4" />
          <span>Besoins Glucidiques – {sportLabel}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isDataMissing && (
          <div className="mb-2 p-2 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
            <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <p className="text-xs text-warning">
              VLamax non disponible – estimation basée sur profil moyen
            </p>
          </div>
        )}
        
        <div className="h-48 sm:h-64 flex">
          {/* Y-axis label externe */}
          <div className="flex items-center justify-center w-6 shrink-0">
            <span className="text-[11px] text-muted-foreground -rotate-90 whitespace-nowrap">g/h</span>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 50, bottom: 30, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                
                {/* Zone de risque digestif */}
                <ReferenceArea
                  y1={digestiveThreshold}
                  y2={260}
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.12}
                />
                
                {/* Ligne seuil digestif */}
                <ReferenceLine
                  y={digestiveThreshold}
                  stroke="hsl(var(--destructive))"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  label={{ 
                    value: `Seuil`, 
                    position: 'insideTopRight', 
                    fontSize: 10,
                    fill: 'hsl(var(--destructive))'
                  }}
                />
                
                <XAxis
                  dataKey="intensity"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(val) => `${val}%`}
                  label={{ value: 'Intensité (%FTP)', position: 'bottom', fontSize: 11, offset: 0, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <YAxis
                  domain={[0, 260]}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(val) => `${val}`}
                  stroke="hsl(var(--border))"
                  width={30}
                />
                
                <Tooltip content={<CustomTooltip sport={sport} />} />
                
                {/* Plage acceptable (entre min et max) */}
                <Area
                  type="monotone"
                  dataKey="max"
                  stroke="none"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.25}
                />
                <Area
                  type="monotone"
                  dataKey="min"
                  stroke="none"
                  fill="hsl(var(--background))"
                  fillOpacity={0.9}
                />
                
                {/* Ligne recommandée */}
                <Area
                  type="monotone"
                  dataKey="recommended"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="none"
                  dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Légende */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-primary" />
            <span className="text-muted-foreground">Recommandé</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-primary/20 rounded" />
            <span className="text-muted-foreground">Plage acceptable</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-destructive/10 rounded" />
            <span className="text-muted-foreground">Zone de risque</span>
          </div>
        </div>
        
        {staffMode && (
          <div className="mt-3 p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
            <p><strong>VLamax:</strong> {vlamaxValue?.toFixed(2) || "—"} | <strong>Sport:</strong> {sportLabel}</p>
            <p className="mt-1">⚠️ Estimation pédagogique – Ne remplace pas un avis nutritionnel</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}