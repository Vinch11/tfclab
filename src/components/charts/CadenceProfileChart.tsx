/**
 * Cadence & Profil Métabolique Chart — TFCL™
 * Graphique Signature #4
 * 
 * Scatter plot: Cadence Seuil vs VLamax
 * Message pédagogique: "Cadence élevée ≠ profil aérobie"
 */

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bike, Info, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  CADENCE_PROFILE_CHART, 
  computeCadenceProfilePosition, 
  CHART_DISCLAIMERS,
  type CadenceProfileInput 
} from "@/lib/v2/signatureCharts";

interface CadenceProfileChartProps {
  cadenceSeuil: number | null;
  vlamax: number | null;
  objectif?: string;
  staffMode?: boolean;
  compact?: boolean;
  className?: string;
}

export function CadenceProfileChart({
  cadenceSeuil,
  vlamax,
  objectif = "IM",
  staffMode = false,
  compact = false,
  className
}: CadenceProfileChartProps) {
  const isDataMissing = cadenceSeuil === null || vlamax === null;
  
  const result = useMemo(() => {
    if (isDataMissing) return null;
    return computeCadenceProfilePosition({
      cadenceSeuil: cadenceSeuil!,
      vlamax: vlamax!,
      objectif
    });
  }, [cadenceSeuil, vlamax, objectif, isDataMissing]);
  
  const chartData = useMemo(() => {
    if (!result) return [];
    return [{ x: result.position.x, y: result.position.y, zone: result.zone }];
  }, [result]);

  if (compact) {
    return (
      <div className={cn("p-4 rounded-xl border bg-card", className)}>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
            <Bike className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">{CADENCE_PROFILE_CHART.title}</h3>
            <p className="text-[10px] text-muted-foreground">{CADENCE_PROFILE_CHART.keyMessage}</p>
          </div>
        </div>
        
        {isDataMissing ? (
          <div className="text-center text-muted-foreground py-4">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Cadence seuil et VLamax requis</p>
          </div>
        ) : result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge style={{ backgroundColor: result.color, color: "white" }}>
                {result.zoneLabel}
              </Badge>
              <div className="text-xs text-muted-foreground">
                {cadenceSeuil} RPM • VLamax {vlamax?.toFixed(2)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{result.message}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", isDataMissing && "opacity-60", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
            <Bike className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {CADENCE_PROFILE_CHART.title}
            </CardTitle>
            <CardDescription className="text-xs flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />
              {CADENCE_PROFILE_CHART.keyMessage}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isDataMissing ? (
          <div className="h-56 flex flex-col items-center justify-center text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm text-center">Données insuffisantes</p>
            <p className="text-xs mt-1">Cadence seuil et VLamax requis</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart */}
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    opacity={0.5} 
                  />
                  
                  {/* Zones de référence */}
                  <ReferenceArea 
                    x1={70} x2={85} y1={0.20} y2={0.40} 
                    fill="hsl(210, 80%, 55%)" 
                    fillOpacity={0.15}
                  />
                  <ReferenceArea 
                    x1={80} x2={95} y1={0.35} y2={0.55} 
                    fill="hsl(142, 76%, 36%)" 
                    fillOpacity={0.15}
                  />
                  <ReferenceArea 
                    x1={90} x2={110} y1={0.45} y2={0.70} 
                    fill="hsl(45, 93%, 47%)" 
                    fillOpacity={0.15}
                  />
                  
                  {/* Lignes de référence */}
                  <ReferenceLine 
                    x={90} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5"
                    opacity={0.5}
                  />
                  <ReferenceLine 
                    y={0.45} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5"
                    opacity={0.5}
                  />
                  
                  <XAxis 
                    type="number"
                    dataKey="x" 
                    domain={[70, 110]}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--border))"
                    label={{ 
                      value: 'Cadence Seuil (RPM)', 
                      position: 'bottom', 
                      fontSize: 10,
                      fill: 'hsl(var(--muted-foreground))'
                    }}
                  />
                  <YAxis 
                    type="number"
                    dataKey="y"
                    domain={[0.20, 0.70]}
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    stroke="hsl(var(--border))"
                    width={50}
                    label={{ 
                      value: 'VLamax', 
                      angle: -90, 
                      position: 'insideLeft',
                      fontSize: 10,
                      fill: 'hsl(var(--muted-foreground))'
                    }}
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
                      if (name === "x") return [`${value} RPM`, "Cadence"];
                      if (name === "y") return [value?.toFixed(2), "VLamax"];
                      return [value, name];
                    }}
                  />
                  
                  <Scatter data={chartData} name="Position">
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={result?.color || "hsl(var(--primary))"} 
                        stroke="#fff"
                        strokeWidth={2}
                        r={10}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            
            {/* Légende zones */}
            <div className="flex flex-wrap gap-2 justify-center">
              {CADENCE_PROFILE_CHART.zones.map((zone) => (
                <div 
                  key={zone.id}
                  className="flex items-center gap-1.5 text-[10px]"
                >
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: zone.color, opacity: 0.6 }}
                  />
                  <span className="text-muted-foreground">{zone.label}</span>
                </div>
              ))}
            </div>
            
            {/* Résultat */}
            {result && (
              <div 
                className="p-3 rounded-lg"
                style={{ backgroundColor: `${result.color}20` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge style={{ backgroundColor: result.color, color: "white" }}>
                    {result.zoneLabel}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {cadenceSeuil} RPM • {vlamax?.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm">{result.message}</p>
                
                {result.recommendations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-current/10">
                    <p className="text-xs font-medium mb-1">Recommandations:</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {result.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-primary">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            {/* Staff Mode Details */}
            {staffMode && result && (
              <div className="p-2 bg-muted/50 rounded-lg text-xs space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Zone:</span>
                    <span className="ml-1 font-mono">{result.zone}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Objectif:</span>
                    <span className="ml-1">{objectif}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Disclaimer */}
            <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
              <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[10px] text-muted-foreground">
                {CHART_DISCLAIMERS.cadence}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
