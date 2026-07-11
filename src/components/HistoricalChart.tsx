// =============================================
// HISTORIQUE GRAPHIQUE - Évolution Multi-Sport
// =============================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bike, Footprints, Waves, TrendingUp, Calendar } from "lucide-react";
import { SnapshotNolio, SportType, estimerTTESport } from "@/types/snapshotNolio";
import { calculVLamaxAvecConfiance, comparerEvolutionSport } from "@/lib/athleteStore";
import { getVlamaxForGoal } from "@/lib/vlamaxResolver";
import { ObjectifType, Athlete } from "@/types/athlete";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface HistoricalChartProps {
  athlete: Athlete;
}

interface HistoryEntry {
  date: string;
  vlamax: number;
  precision: number;
  tte: number;
  vo2max: number;
  confiance: number;
}

const sportIcons: Record<SportType, React.ReactNode> = {
  vélo: <Bike className="h-4 w-4" />,
  course: <Footprints className="h-4 w-4" />,
  natation: <Waves className="h-4 w-4" />,
};

const sportLabels: Record<SportType, string> = {
  vélo: "Vélo",
  course: "Course",
  natation: "Natation",
};

export function HistoricalChart({ athlete }: HistoricalChartProps) {
  // Get history per sport
  const getHistoryBySport = (sport: SportType): HistoryEntry[] => {
    const snapshots = athlete.historique.filter((s) => s.sport === sport);
    
    return snapshots.map((snapshot, idx) => {
      const calc = calculVLamaxAvecConfiance(snapshot, athlete.objectif);
      const tte = estimerTTESport(snapshot);
      
      return {
        date: snapshot.date,
        vlamax: calc.vlamax,
        precision: calc.precision,
        tte,
        vo2max: snapshot.vo2max || 0,
        confiance: calc.confiance,
      };
    });
  };

  const sports: SportType[] = ["vélo", "course", "natation"];
  const availableSports = sports.filter(
    (sport) => athlete.historique.filter((h) => h.sport === sport).length > 0
  );

  if (availableSports.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center text-muted-foreground">
          Aucun historique disponible.
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Historique Graphique – {athlete.nom}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={availableSports[0]} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableSports.length}, 1fr)` }}>
            {availableSports.map((sport) => (
              <TabsTrigger
                key={sport}
                value={sport}
                className="flex items-center gap-2"
              >
                {sportIcons[sport]}
                {sportLabels[sport]}
              </TabsTrigger>
            ))}
          </TabsList>

          {availableSports.map((sport) => {
            const history = getHistoryBySport(sport);
            
            return (
              <TabsContent key={sport} value={sport} className="space-y-6 mt-6">
                {/* Chart */}
                {history.length > 1 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          className="text-xs"
                        />
                        <YAxis yAxisId="left" className="text-xs" />
                        <YAxis yAxisId="right" orientation="right" className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          labelFormatter={formatDate}
                        />
                        <Legend />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="vlamax" 
                          name="VLamax"
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="tte" 
                          name="TTE (min)"
                          stroke="hsl(var(--accent))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--accent))' }}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="vo2max" 
                          name="VO2max"
                          stroke="hsl(var(--destructive))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--destructive))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Ajoutez plus de profils pour voir l&apos;évolution
                  </div>
                )}

                {/* History Table */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Détail par date
                  </h4>
                  <div className="space-y-2">
                    {history.map((entry, idx) => (
                      <HistoryRow 
                        key={idx}
                        index={idx + 1}
                        entry={entry}
                      />
                    ))}
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// History Row Component with visual bars
function HistoryRow({ index, entry }: { index: number; entry: HistoryEntry }) {
  const vlamaxBar = Math.min(Math.round(entry.vlamax * 100), 100);
  const tteBar = Math.min(Math.round((entry.tte / 90) * 100), 100);
  const vo2Bar = Math.min(Math.round((entry.vo2max / 80) * 100), 100);

  return (
    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="font-mono text-xs">
          J{index}
        </Badge>
        <span className="text-xs text-muted-foreground">{entry.date}</span>
      </div>
      
      <MetricBar 
        label="VLamax" 
        value={entry.vlamax.toFixed(2)} 
        unit={`±${entry.precision}%`}
        progress={vlamaxBar} 
        color="bg-primary" 
      />
      <MetricBar 
        label="TTE" 
        value={`${entry.tte}`} 
        unit="min"
        progress={tteBar} 
        color="bg-accent" 
      />
      <MetricBar 
        label="VO2max" 
        value={entry.vo2max > 0 ? `${entry.vo2max}` : "N/A"} 
        unit="ml/kg/min"
        progress={vo2Bar} 
        color="bg-destructive" 
      />
    </div>
  );
}

// Metric Bar Component
function MetricBar({
  label,
  value,
  unit,
  progress,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  progress: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">
          {value} <span className="text-muted-foreground">{unit}</span>
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500 rounded-full`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
