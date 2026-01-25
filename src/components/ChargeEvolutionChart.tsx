/**
 * ChargeEvolutionChart – Graphique d'évolution de la charge TSS sur 4 semaines
 * Affiche la tendance de la charge d'entraînement avec zones de référence
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { getCRRTargets, type CRRTargets } from "@/lib/chargeRecenteReference";
import type { DbSnapshot } from "@/hooks/useCloudData";

interface ChargeEvolutionChartProps {
  snapshots: DbSnapshot[];
  athleteId: string;
  objectif: string;
  currentTss7d: number | null;
  className?: string;
}

interface WeekData {
  week: string;
  weekLabel: string;
  tss: number | null;
  date: string;
}

export function ChargeEvolutionChart({
  snapshots,
  athleteId,
  objectif,
  currentTss7d,
  className,
}: ChargeEvolutionChartProps) {
  const targets = getCRRTargets(objectif);

  // Générer les données des 4 dernières semaines
  const chartData = useMemo(() => {
    const now = new Date();
    const weeks: WeekData[] = [];
    
    // Générer les 4 dernières semaines (S-3, S-2, S-1, Actuelle)
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const weekLabel = i === 0 ? "Cette semaine" : `S-${i}`;
      const dateStr = weekStart.toISOString().split("T")[0];
      
      // Trouver le snapshot le plus proche de cette semaine
      const relevantSnapshots = snapshots
        .filter(s => s.athlete_id === athleteId)
        .filter(s => {
          const snapDate = new Date(s.updated_at || s.date);
          return snapDate >= weekStart && snapDate <= weekEnd;
        })
        .sort((a, b) => 
          new Date(b.updated_at || b.date).getTime() - new Date(a.updated_at || a.date).getTime()
        );
      
      // Utiliser le TSS du snapshot ou estimer à partir de la valeur actuelle
      let tss: number | null = null;
      
      if (i === 0 && currentTss7d !== null) {
        // Semaine actuelle : utiliser la valeur courante
        tss = currentTss7d;
      } else if (relevantSnapshots.length > 0 && relevantSnapshots[0].tss_7d !== null) {
        tss = relevantSnapshots[0].tss_7d;
      }
      
      weeks.push({
        week: `S${4 - i}`,
        weekLabel,
        tss,
        date: dateStr,
      });
    }
    
    return weeks;
  }, [snapshots, athleteId, currentTss7d]);

  // Calculer la tendance
  const trend = useMemo(() => {
    const validValues = chartData.filter(d => d.tss !== null).map(d => d.tss as number);
    if (validValues.length < 2) return { direction: "neutral" as const, change: 0, label: "Stable" };
    
    const first = validValues[0];
    const last = validValues[validValues.length - 1];
    const change = Math.round(((last - first) / first) * 100);
    
    if (change > 10) return { direction: "up" as const, change, label: "En hausse" };
    if (change < -10) return { direction: "down" as const, change, label: "En baisse" };
    return { direction: "neutral" as const, change, label: "Stable" };
  }, [chartData]);

  // Stats rapides
  const stats = useMemo(() => {
    const validValues = chartData.filter(d => d.tss !== null).map(d => d.tss as number);
    if (validValues.length === 0) return { avg: null, max: null, min: null };
    
    return {
      avg: Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length),
      max: Math.max(...validValues),
      min: Math.min(...validValues),
    };
  }, [chartData]);

  const hasData = chartData.some(d => d.tss !== null);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Évolution de la charge
            </CardTitle>
            <CardDescription className="text-xs">
              TSS hebdomadaire sur 4 semaines
            </CardDescription>
          </div>
          
          {hasData && (
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1",
                trend.direction === "up" && "text-destructive border-destructive/30",
                trend.direction === "down" && "text-primary border-primary/30",
                trend.direction === "neutral" && "text-muted-foreground"
              )}
            >
              {trend.direction === "up" && <TrendingUp className="h-3 w-3" />}
              {trend.direction === "down" && <TrendingDown className="h-3 w-3" />}
              {trend.direction === "neutral" && <Minus className="h-3 w-3" />}
              {trend.label}
              {trend.change !== 0 && ` (${trend.change > 0 ? "+" : ""}${trend.change}%)`}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!hasData ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Pas de données de charge disponibles
          </div>
        ) : (
          <>
            {/* Graphique */}
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  
                  {/* Zones de référence */}
                  <ReferenceArea
                    y1={targets.chargeMinimale}
                    y2={targets.chargeOptimale}
                    fill="hsl(var(--primary))"
                    fillOpacity={0.1}
                    label={{ 
                      value: "Zone optimale", 
                      position: "insideTopLeft",
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  
                  <XAxis 
                    dataKey="weekLabel" 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 'auto']}
                  />
                  
                  {/* Lignes de référence */}
                  <ReferenceLine 
                    y={targets.chargeOptimale} 
                    stroke="hsl(var(--primary))" 
                    strokeDasharray="5 5"
                    label={{ 
                      value: `Optimal (${targets.chargeOptimale})`, 
                      position: "right",
                      fontSize: 9,
                      fill: "hsl(var(--primary))",
                    }}
                  />
                  <ReferenceLine 
                    y={targets.chargeMaximale} 
                    stroke="hsl(var(--destructive))" 
                    strokeDasharray="5 5"
                    label={{ 
                      value: `Max (${targets.chargeMaximale})`, 
                      position: "right",
                      fontSize: 9,
                      fill: "hsl(var(--destructive))",
                    }}
                  />
                  
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as WeekData;
                      return (
                        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-medium">{data.weekLabel}</p>
                          <p className="text-muted-foreground text-xs">{data.date}</p>
                          <p className="mt-1">
                            <span className="font-semibold text-primary">
                              {data.tss ?? "—"} TSS
                            </span>
                          </p>
                          {data.tss !== null && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {data.tss < targets.chargeMinimale && "Charge faible"}
                              {data.tss >= targets.chargeMinimale && data.tss <= targets.chargeOptimale && "Zone optimale ✓"}
                              {data.tss > targets.chargeOptimale && data.tss <= targets.chargeMaximale && "Charge élevée"}
                              {data.tss > targets.chargeMaximale && "⚠️ Surcharge"}
                            </p>
                          )}
                        </div>
                      );
                    }}
                  />
                  
                  <Line
                    type="monotone"
                    dataKey="tss"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Stats résumé */}
            <div className="grid grid-cols-3 gap-2 text-center border-t pt-3">
              <div>
                <p className="text-xs text-muted-foreground">Moyenne</p>
                <p className="font-semibold">{stats.avg ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Min</p>
                <p className="font-semibold text-primary">{stats.min ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max</p>
                <p className="font-semibold text-destructive">{stats.max ?? "—"}</p>
              </div>
            </div>
            
            {/* Légende */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary/20 border border-primary rounded" />
                <span>Zone optimale</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-6 h-0.5 bg-destructive" style={{ borderTop: "2px dashed" }} />
                <span>Seuil max</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
