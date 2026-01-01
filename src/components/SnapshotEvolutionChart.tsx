// =============================================
// GRAPHIQUE ÉVOLUTION HISTORIQUE VLamax / TTE
// Basé sur les snapshots cloud
// =============================================

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, Info } from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  ReferenceLine
} from "recharts";
import { DbSnapshot } from "@/hooks/useCloudData";
import { cn } from "@/lib/utils";

interface SnapshotEvolutionChartProps {
  snapshots: DbSnapshot[];
  athleteName?: string;
}

interface ChartDataPoint {
  date: string;
  dateFormatted: string;
  vlamax: number | null;
  tte: number | null;
  vo2max: number | null;
  confidence: number | null;
}

export function SnapshotEvolutionChart({ snapshots, athleteName }: SnapshotEvolutionChartProps) {
  // Préparer les données triées par date
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!snapshots || snapshots.length === 0) return [];
    
    // Trier par date croissante
    const sorted = [...snapshots].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    return sorted.map(snap => ({
      date: snap.date,
      dateFormatted: new Date(snap.date).toLocaleDateString("fr-FR", { 
        day: "2-digit", 
        month: "short",
        year: "2-digit"
      }),
      vlamax: snap.vlamax ?? null,
      tte: snap.tte_observed_min ?? null,
      vo2max: snap.vo2max ?? null,
      confidence: snap.confidence ?? null
    }));
  }, [snapshots]);

  // Calculer les tendances
  const trends = useMemo(() => {
    if (chartData.length < 2) return null;
    
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    
    const vlamaxDelta = first.vlamax !== null && last.vlamax !== null 
      ? last.vlamax - first.vlamax 
      : null;
    const tteDelta = first.tte !== null && last.tte !== null
      ? last.tte - first.tte
      : null;
    
    return { vlamaxDelta, tteDelta };
  }, [chartData]);

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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Évolution VLamax & TTE
            </CardTitle>
            <CardDescription>
              {athleteName ? `${athleteName} — ` : ""}{chartData.length} snapshots
            </CardDescription>
          </div>
          
          {/* Tendances */}
          {trends && (
            <div className="flex gap-2">
              {trends.vlamaxDelta !== null && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "font-mono",
                    trends.vlamaxDelta < 0 ? "text-green-600 border-green-300" : 
                    trends.vlamaxDelta > 0 ? "text-amber-600 border-amber-300" : ""
                  )}
                >
                  VLamax: {trends.vlamaxDelta > 0 ? "+" : ""}{trends.vlamaxDelta.toFixed(2)}
                </Badge>
              )}
              {trends.tteDelta !== null && (
                <Badge 
                  variant="outline"
                  className={cn(
                    "font-mono",
                    trends.tteDelta > 0 ? "text-green-600 border-green-300" : 
                    trends.tteDelta < 0 ? "text-amber-600 border-amber-300" : ""
                  )}
                >
                  TTE: {trends.tteDelta > 0 ? "+" : ""}{trends.tteDelta} min
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Graphique principal */}
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                dataKey="dateFormatted" 
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                yAxisId="vlamax" 
                orientation="left"
                domain={[0.2, 0.7]}
                className="text-xs"
                tick={{ fontSize: 11 }}
                label={{ value: 'VLamax', angle: -90, position: 'insideLeft', fontSize: 11 }}
              />
              <YAxis 
                yAxisId="tte" 
                orientation="right"
                domain={[20, 80]}
                className="text-xs"
                tick={{ fontSize: 11 }}
                label={{ value: 'TTE (min)', angle: 90, position: 'insideRight', fontSize: 11 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: 12
                }}
                formatter={(value: number, name: string) => {
                  if (name === "vlamax") return [value?.toFixed(3), "VLamax"];
                  if (name === "tte") return [`${value} min`, "TTE"];
                  return [value, name];
                }}
              />
              <Legend />
              
              {/* Ligne VLamax */}
              <Line 
                yAxisId="vlamax"
                type="monotone" 
                dataKey="vlamax" 
                name="VLamax"
                stroke="hsl(var(--primary))" 
                strokeWidth={2.5}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
              
              {/* Ligne TTE */}
              <Line 
                yAxisId="tte"
                type="monotone" 
                dataKey="tte" 
                name="TTE (min)"
                stroke="hsl(var(--accent-foreground))" 
                strokeWidth={2.5}
                dot={{ fill: 'hsl(var(--accent-foreground))', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
                strokeDasharray="5 5"
              />
              
              {/* Lignes de référence pour VLamax optimal */}
              <ReferenceLine 
                yAxisId="vlamax" 
                y={0.35} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="3 3" 
                opacity={0.5}
              />
            </LineChart>
          </ResponsiveContainer>
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
