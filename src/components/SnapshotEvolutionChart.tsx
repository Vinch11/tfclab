// =============================================
// GRAPHIQUE ÉVOLUTION HISTORIQUE VLamax / TTE — TFCL™
// Graphique Signature #3
// Basé sur les snapshots cloud + tests VLamax
// Avec bandes de confiance et tendances
// =============================================

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Calendar, Info, FlaskConical, AlertTriangle } from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  ReferenceLine,
  Area,
  ComposedChart
} from "recharts";
import { DbSnapshot, DbTest } from "@/hooks/useCloudData";
import { cn } from "@/lib/utils";
import { EVOLUTION_CHART, computeEvolutionTrend, CHART_DISCLAIMERS } from "@/lib/v2/signatureCharts";

interface SnapshotEvolutionChartProps {
  snapshots: DbSnapshot[];
  tests?: DbTest[];
  athleteName?: string;
  compact?: boolean;
}

interface ChartDataPoint {
  date: string;
  dateFormatted: string;
  vlamax: number | null;
  tte: number | null;
  vo2max: number | null;
  confidence: number | null;
  source: "snapshot" | "test";
}

export function SnapshotEvolutionChart({ snapshots, tests = [], athleteName, compact = false }: SnapshotEvolutionChartProps) {
  // Préparer les données triées par date (fusion snapshots + tests)
  const chartData = useMemo<ChartDataPoint[]>(() => {
    const dataPoints: ChartDataPoint[] = [];
    
    // Ajouter les snapshots
    if (snapshots && snapshots.length > 0) {
      snapshots.forEach(snap => {
        dataPoints.push({
          date: snap.date,
          dateFormatted: new Date(snap.date).toLocaleDateString("fr-FR", { 
            day: "2-digit", 
            month: "short",
            year: "2-digit"
          }),
          vlamax: snap.vlamax ?? null,
          tte: snap.tte_observed_min ?? null,
          vo2max: snap.vo2max ?? null,
          confidence: snap.confidence ?? null,
          source: "snapshot"
        });
      });
    }
    
    // Ajouter les tests VLamax (s'ils ont une valeur vlamax)
    if (tests && tests.length > 0) {
      tests.forEach(test => {
        if (test.vlamax !== null && test.vlamax !== undefined) {
          const testDate = new Date(test.date);
          dataPoints.push({
            date: testDate.toISOString().split('T')[0],
            dateFormatted: testDate.toLocaleDateString("fr-FR", { 
              day: "2-digit", 
              month: "short",
              year: "2-digit"
            }),
            vlamax: test.vlamax,
            tte: null, // Les tests ne contiennent pas de TTE
            vo2max: null,
            confidence: test.reliability ?? null,
            source: "test"
          });
        }
      });
    }
    
    if (dataPoints.length === 0) return [];
    
    // Trier par date croissante
    return dataPoints.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [snapshots, tests]);

  // Calculer les tendances avec la nouvelle fonction TFCL
  const trends = useMemo(() => {
    if (chartData.length < 2) return null;
    
    // Utiliser computeEvolutionTrend pour les tendances avancées
    const evolutionResult = computeEvolutionTrend(chartData.map(d => ({
      date: d.date,
      vlamax: d.vlamax,
      vlamaxConfidence: d.confidence ?? undefined,
      tte: d.tte,
      tteConfidence: d.confidence ?? undefined,
      source: d.source as "snapshot" | "test" | "estimate"
    })));
    
    // Calcul des deltas simples pour l'affichage
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    
    const vlamaxDelta = first.vlamax !== null && last.vlamax !== null 
      ? last.vlamax - first.vlamax 
      : null;
    const tteDelta = first.tte !== null && last.tte !== null
      ? last.tte - first.tte
      : null;
    
    return { 
      vlamaxDelta, 
      tteDelta, 
      vlamaxTrend: evolutionResult.vlamax,
      tteTrend: evolutionResult.tte,
      interpretation: evolutionResult.interpretation
    };
  }, [chartData]);

  // Données avec bandes de confiance
  const chartDataWithBands = useMemo(() => {
    return chartData.map(d => ({
      ...d,
      vlamaxUpper: d.vlamax !== null ? Math.min(0.70, d.vlamax + (d.confidence ? 0.05 * (1 - d.confidence) : 0.03)) : null,
      vlamaxLower: d.vlamax !== null ? Math.max(0.20, d.vlamax - (d.confidence ? 0.05 * (1 - d.confidence) : 0.03)) : null,
      tteUpper: d.tte !== null ? Math.min(80, d.tte + (d.confidence ? 5 * (1 - d.confidence) : 3)) : null,
      tteLower: d.tte !== null ? Math.max(20, d.tte - (d.confidence ? 5 * (1 - d.confidence) : 3)) : null,
    }));
  }, [chartData]);

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="w-3 h-3" />;
    if (trend === "down") return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  if (chartData.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun snapshot pour afficher l'évolution.</p>
            <p className="text-sm mt-2">Ajoutez des snapshots pour voir le graphique.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 1) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Évolution VLamax & TTE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Un seul snapshot disponible.</p>
            <p className="text-sm mt-1">Ajoutez plus de snapshots pour voir l'évolution.</p>
          </div>
          <SingleSnapshotDisplay data={chartData[0]} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(compact && "border-0 shadow-none")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {EVOLUTION_CHART.title}
            </CardTitle>
            <CardDescription>
              {athleteName ? `${athleteName} — ` : ""}{chartData.length} snapshots
            </CardDescription>
          </div>
          
          {/* Tendances avec icônes */}
          {trends && (
            <div className="flex gap-2 flex-wrap">
              {trends.vlamaxDelta !== null && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "font-mono flex items-center gap-1",
                    trends.vlamaxTrend === "down" ? "text-green-600 border-green-300" : 
                    trends.vlamaxTrend === "up" ? "text-amber-600 border-amber-300" : ""
                  )}
                >
                  {getTrendIcon(trends.vlamaxTrend)}
                  VLamax: {trends.vlamaxDelta > 0 ? "+" : ""}{trends.vlamaxDelta.toFixed(2)}
                </Badge>
              )}
              {trends.tteDelta !== null && (
                <Badge 
                  variant="outline"
                  className={cn(
                    "font-mono flex items-center gap-1",
                    trends.tteTrend === "up" ? "text-green-600 border-green-300" : 
                    trends.tteTrend === "down" ? "text-amber-600 border-amber-300" : ""
                  )}
                >
                  {getTrendIcon(trends.tteTrend)}
                  TTE: {trends.tteDelta > 0 ? "+" : ""}{trends.tteDelta} min
                </Badge>
              )}
            </div>
          )}
        </div>
        
        {/* Interprétation de tendance */}
        {trends?.interpretation && (
          <div className={cn(
            "mt-2 p-2 rounded-lg text-xs flex items-start gap-2",
            trends.vlamaxTrend === "up" && trends.tteTrend === "down" 
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "bg-muted/50"
          )}>
            {trends.vlamaxTrend === "up" && trends.tteTrend === "down" && (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            )}
            <span>{trends.interpretation}</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {/* Graphique principal avec bandes de confiance */}
        <div className={cn("mt-4", compact ? "h-48" : "h-64")}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartDataWithBands} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="dateFormatted" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
              />
              <YAxis 
                yAxisId="vlamax" 
                orientation="left"
                domain={[0.2, 0.7]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
                width={45}
              />
              <YAxis 
                yAxisId="tte" 
                orientation="right"
                domain={[20, 80]}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
                width={50}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: 12,
                  color: 'hsl(var(--foreground))'
                }}
                formatter={(value: number, name: string) => {
                  if (name === "VLamax") return [value?.toFixed(3), "VLamax"];
                  if (name === "TTE (min)") return [`${value} min`, "TTE"];
                  return [value, name];
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
              />
              
              {/* Bande de confiance VLamax */}
              <Area
                yAxisId="vlamax"
                type="monotone"
                dataKey="vlamaxUpper"
                stroke="none"
                fill="#06b6d4"
                fillOpacity={0.1}
                connectNulls
              />
              <Area
                yAxisId="vlamax"
                type="monotone"
                dataKey="vlamaxLower"
                stroke="none"
                fill="#ffffff"
                fillOpacity={1}
                connectNulls
              />
              
              {/* Ligne VLamax - Cyan vif */}
              <Line 
                yAxisId="vlamax"
                type="monotone" 
                dataKey="vlamax" 
                name="VLamax"
                stroke="#06b6d4"
                strokeWidth={3}
                dot={{ fill: '#06b6d4', strokeWidth: 2, r: 5, stroke: '#fff' }}
                activeDot={{ r: 7, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }}
                connectNulls
              />
              
              {/* Ligne TTE - Orange vif */}
              <Line 
                yAxisId="tte"
                type="monotone" 
                dataKey="tte" 
                name="TTE (min)"
                stroke="#f97316"
                strokeWidth={3}
                dot={{ fill: '#f97316', strokeWidth: 2, r: 5, stroke: '#fff' }}
                activeDot={{ r: 7, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
                connectNulls
              />
              
              {/* Ligne de référence pour VLamax optimal */}
              <ReferenceLine 
                yAxisId="vlamax" 
                y={0.35} 
                stroke="#06b6d4"
                strokeDasharray="5 5" 
                opacity={0.4}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Disclaimer */}
        <div className="mt-3 flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground">
            {CHART_DISCLAIMERS.evolution}
          </p>
        </div>

        {/* Tableau détaillé */}
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Détail par snapshot
          </h4>
          <div className="grid gap-2 max-h-48 overflow-y-auto pr-2">
            {chartData.slice().reverse().map((entry, idx) => (
              <SnapshotRow key={idx} data={entry} isLatest={idx === 0} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Affichage d'un seul snapshot
function SingleSnapshotDisplay({ data }: { data: ChartDataPoint }) {
  return (
    <div className="mt-4 p-4 bg-muted/30 rounded-lg grid grid-cols-3 gap-4 text-center">
      <div>
        <div className="text-xs text-muted-foreground mb-1">VLamax</div>
        <div className="text-xl font-bold text-primary">
          {data.vlamax?.toFixed(3) ?? "—"}
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">TTE</div>
        <div className="text-xl font-bold">
          {data.tte !== null ? `${data.tte} min` : "—"}
        </div>
      </div>
      <div>
        <div className="text-xs text-muted-foreground mb-1">VO2max</div>
        <div className="text-xl font-bold text-blue-500">
          {data.vo2max ?? "—"}
        </div>
      </div>
    </div>
  );
}

// Ligne de détail snapshot
function SnapshotRow({ data, isLatest }: { data: ChartDataPoint; isLatest?: boolean }) {
  return (
    <div className={cn(
      "p-3 rounded-lg flex items-center justify-between",
      isLatest ? "bg-primary/10 border border-primary/30" : "bg-muted/30"
    )}>
      <div className="flex items-center gap-3">
        <Badge variant={isLatest ? "default" : "outline"} className="font-mono text-xs">
          {data.dateFormatted}
        </Badge>
        {data.source === "test" && (
          <Badge variant="secondary" className="text-xs gap-1">
            <FlaskConical className="h-3 w-3" />
            Test
          </Badge>
        )}
        {isLatest && (
          <span className="text-xs text-primary font-medium">Dernier</span>
        )}
      </div>
      
      <div className="flex items-center gap-4 text-sm">
        <div className="text-center">
          <span className="text-muted-foreground text-xs">VLamax</span>
          <div className="font-mono font-medium text-primary">
            {data.vlamax?.toFixed(3) ?? "—"}
          </div>
        </div>
        <div className="text-center">
          <span className="text-muted-foreground text-xs">TTE</span>
          <div className="font-mono font-medium">
            {data.tte !== null ? `${data.tte}min` : "—"}
          </div>
        </div>
        {data.confidence !== null && (
          <div className="text-center">
            <span className="text-muted-foreground text-xs">Conf</span>
            <div className="font-mono text-xs text-muted-foreground">
              {Math.round(data.confidence * 100)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
