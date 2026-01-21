/**
 * Test History View
 * Display historical progression of test results with charts
 */

import { useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  TrendingUp, 
  TrendingDown,
  Minus,
  Target,
  BarChart3,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface TestRecord {
  id: string;
  athlete_id: string;
  type: string;
  name: string;
  sport?: string | null;
  date: string;
  reliability?: number | null;
  vlamax?: number | null;
  raw?: Record<string, unknown> | null;
}

interface TestHistoryViewProps {
  tests: TestRecord[];
  sportFilter: "all" | "bike" | "run";
}

export function TestHistoryView({ tests, sportFilter }: TestHistoryViewProps) {
  // Filter and sort tests
  const filteredTests = useMemo(() => {
    let filtered = [...tests];
    if (sportFilter !== "all") {
      filtered = filtered.filter(t => t.sport === sportFilter);
    }
    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [tests, sportFilter]);
  
  // VLamax evolution data
  const vlamaxData = useMemo(() => {
    return filteredTests
      .filter(t => t.vlamax !== null && t.vlamax !== undefined)
      .map(t => ({
        date: format(new Date(t.date), "dd/MM", { locale: fr }),
        fullDate: format(new Date(t.date), "d MMMM yyyy", { locale: fr }),
        vlamax: t.vlamax,
        sport: t.sport,
        name: t.name
      }));
  }, [filteredTests]);
  
  // TTE evolution data
  const tteData = useMemo(() => {
    return filteredTests
      .filter(t => t.type === "TTE" && t.raw)
      .map(t => {
        const raw = t.raw as Record<string, number>;
        return {
          date: format(new Date(t.date), "dd/MM", { locale: fr }),
          fullDate: format(new Date(t.date), "d MMMM yyyy", { locale: fr }),
          tte: raw.tte_minutes,
          sport: t.sport,
          name: t.name
        };
      })
      .filter(d => d.tte);
  }, [filteredTests]);
  
  // Calculate trends
  const vlamaxTrend = useMemo(() => {
    if (vlamaxData.length < 2) return null;
    const first = vlamaxData[0].vlamax as number;
    const last = vlamaxData[vlamaxData.length - 1].vlamax as number;
    const change = ((last - first) / first) * 100;
    return { value: change, direction: change > 0.5 ? "up" : change < -0.5 ? "down" : "stable" };
  }, [vlamaxData]);
  
  const tteTrend = useMemo(() => {
    if (tteData.length < 2) return null;
    const first = tteData[0].tte;
    const last = tteData[tteData.length - 1].tte;
    const change = ((last - first) / first) * 100;
    return { value: change, direction: change > 2 ? "up" : change < -2 ? "down" : "stable" };
  }, [tteData]);
  
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "up": return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down": return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };
  
  if (filteredTests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">Aucune donnée historique</p>
        <p className="text-sm mt-1">Réalisez des tests pour voir l'évolution</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Trend Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* VLamax Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                Évolution VLamax
              </span>
              {vlamaxTrend && (
                <div className="flex items-center gap-1">
                  {getTrendIcon(vlamaxTrend.direction)}
                  <span className={`text-xs ${
                    vlamaxTrend.direction === "up" ? "text-green-500" :
                    vlamaxTrend.direction === "down" ? "text-red-500" : "text-muted-foreground"
                  }`}>
                    {vlamaxTrend.value > 0 ? "+" : ""}{vlamaxTrend.value.toFixed(1)}%
                  </span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vlamaxData.length >= 2 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vlamaxData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }} 
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      domain={["dataMin - 0.05", "dataMax + 0.05"]}
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border rounded-lg p-2 shadow-lg text-xs">
                              <p className="font-medium">{data.fullDate}</p>
                              <p className="text-purple-500">VLamax: {data.vlamax?.toFixed(2)} mmol/L/s</p>
                              <p className="text-muted-foreground">{data.name}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="vlamax" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Minimum 2 tests VLamax requis</p>
                  <p className="text-xs">Actuellement: {vlamaxData.length} test{vlamaxData.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* TTE Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                Évolution TTE
              </span>
              {tteTrend && (
                <div className="flex items-center gap-1">
                  {getTrendIcon(tteTrend.direction)}
                  <span className={`text-xs ${
                    tteTrend.direction === "up" ? "text-green-500" :
                    tteTrend.direction === "down" ? "text-red-500" : "text-muted-foreground"
                  }`}>
                    {tteTrend.value > 0 ? "+" : ""}{tteTrend.value.toFixed(1)}%
                  </span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tteData.length >= 2 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tteData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      domain={["dataMin - 5", "dataMax + 5"]}
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border rounded-lg p-2 shadow-lg text-xs">
                              <p className="font-medium">{data.fullDate}</p>
                              <p className="text-blue-500">TTE: {data.tte} min</p>
                              <p className="text-muted-foreground">{data.name}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="tte" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Minimum 2 tests TTE requis</p>
                  <p className="text-xs">Actuellement: {tteData.length} test{tteData.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Confidence Evolution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Impact sur la confiance TFCL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Basé sur {filteredTests.length} test{filteredTests.length !== 1 ? "s" : ""} réalisé{filteredTests.length !== 1 ? "s" : ""}
            </p>
            
            {/* Confidence breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-500">VLamax</span>
                  <Badge variant="outline" className="text-purple-500 border-purple-500/30">
                    +{(filteredTests.filter(t => t.type === "VLAMAX").length * 0.15).toFixed(2)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredTests.filter(t => t.type === "VLAMAX").length} tests contribuent
                </p>
              </div>
              
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-500">TTE</span>
                  <Badge variant="outline" className="text-blue-500 border-blue-500/30">
                    +{(filteredTests.filter(t => t.type === "TTE").length * 0.20).toFixed(2)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredTests.filter(t => t.type === "TTE").length} tests contribuent
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
