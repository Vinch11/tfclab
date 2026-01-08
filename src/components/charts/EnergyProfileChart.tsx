/**
 * Energy Profile Chart – VLamax vs TTE
 * Scatter plot avec zones colorées staff-grade
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
  ReferenceArea,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnergyProfileData {
  vlamaxValue: number | null;
  vlamaxSource: string;
  vlamaxConfidence: number;
  tteValue: number | null;
  tteSource: string;
  tteConfidence: number;
  objectif: string;
}

interface EnergyProfileChartProps {
  data: EnergyProfileData;
  staffMode?: boolean;
  className?: string;
}

// Cibles par objectif
const getTargets = (objectif: string) => {
  const goal = objectif.toLowerCase();
  
  if (goal.includes("im") || goal.includes("ironman") || goal.includes("kona")) {
    return { vlamaxTarget: 0.35, tteTarget: 55 };
  }
  if (goal.includes("703") || goal.includes("70.3")) {
    return { vlamaxTarget: 0.40, tteTarget: 50 };
  }
  if (goal.includes("marathon") && !goal.includes("semi")) {
    return { vlamaxTarget: 0.38, tteTarget: 52 };
  }
  if (goal.includes("semi")) {
    return { vlamaxTarget: 0.45, tteTarget: 47 };
  }
  // Default: 70.3
  return { vlamaxTarget: 0.40, tteTarget: 50 };
};

// Déterminer la zone du profil
const getProfileZone = (
  vlamax: number,
  tte: number,
  vlamaxTarget: number,
  tteTarget: number
): { zone: string; color: string; label: string } => {
  const vlamaxOK = vlamax <= vlamaxTarget;
  const tteOK = tte >= tteTarget - 5;

  if (vlamaxOK && tteOK) {
    return { zone: "green", color: "hsl(var(--success))", label: "Endurance optimisée" };
  }
  if (vlamaxOK && !tteOK) {
    return { zone: "blue", color: "hsl(var(--primary))", label: "Endurance fragile" };
  }
  if (!vlamaxOK && tteOK) {
    return { zone: "orange", color: "hsl(var(--warning))", label: "Profil déséquilibré" };
  }
  return { zone: "red", color: "hsl(var(--destructive))", label: "Glycolytique excessif" };
};

const CustomTooltip = ({ active, payload, staffMode }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload;
  
  return (
    <div className="bg-background/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg max-w-xs">
      <p className="font-semibold text-foreground mb-2">{data.label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">VLamax:</span>
          <span className="font-mono">{data.vlamax?.toFixed(2) || "—"} mmol/L/s</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">TTE:</span>
          <span className="font-mono">{data.tte || "—"} min</span>
        </div>
        {staffMode && (
          <>
            <div className="border-t border-border my-2" />
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Source VLamax:</span>
              <span className="text-xs">{data.vlamaxSource}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Confiance VLamax:</span>
              <span className="font-mono">{Math.round(data.vlamaxConfidence * 100)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Source TTE:</span>
              <span className="text-xs">{data.tteSource}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Confiance TTE:</span>
              <span className="font-mono">{Math.round(data.tteConfidence * 100)}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export function EnergyProfileChart({ data, staffMode = false, className }: EnergyProfileChartProps) {
  const { vlamaxValue, vlamaxSource, vlamaxConfidence, tteValue, tteSource, tteConfidence, objectif } = data;
  const targets = getTargets(objectif);
  
  const isDataMissing = vlamaxValue === null || tteValue === null;
  const isLowConfidence = vlamaxConfidence < 0.4 || tteConfidence < 0.4;
  
  const chartData = useMemo(() => {
    if (isDataMissing) return [];
    return [{
      vlamax: vlamaxValue,
      tte: tteValue,
      vlamaxSource,
      vlamaxConfidence,
      tteSource,
      tteConfidence,
      label: "Athlète actuel"
    }];
  }, [vlamaxValue, tteValue, vlamaxSource, vlamaxConfidence, tteSource, tteConfidence]);

  const profileZone = vlamaxValue !== null && tteValue !== null
    ? getProfileZone(vlamaxValue, tteValue, targets.vlamaxTarget, targets.tteTarget)
    : null;

  return (
    <Card className={cn("overflow-hidden", isDataMissing && "opacity-60", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span>Energy Profile – VLamax vs TTE</span>
          {profileZone && (
            <span 
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: profileZone.color, color: 'white' }}
            >
              {profileZone.label}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isDataMissing ? (
          <div className="h-48 sm:h-64 flex flex-col items-center justify-center text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm text-center">
              {vlamaxValue === null && tteValue === null 
                ? "VLamax et TTE non disponibles"
                : vlamaxValue === null 
                  ? "VLamax non disponible"
                  : "TTE non disponible"}
            </p>
            <p className="text-xs mt-1">Créez un snapshot ou effectuez un test</p>
          </div>
        ) : (
          <>
            {isLowConfidence && (
              <div className="mb-2 p-2 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-warning">
                  Confiance données limitée – interpréter avec prudence
                </p>
              </div>
            )}
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 30, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  
                  {/* Zones de fond */}
                  {/* Zone verte (optimisée) */}
                  <ReferenceArea
                    x1={0.2}
                    x2={targets.vlamaxTarget}
                    y1={targets.tteTarget - 5}
                    y2={80}
                    fill="hsl(var(--success))"
                    fillOpacity={0.15}
                  />
                  {/* Zone bleue (endurance fragile) */}
                  <ReferenceArea
                    x1={0.2}
                    x2={targets.vlamaxTarget}
                    y1={25}
                    y2={targets.tteTarget - 5}
                    fill="hsl(var(--primary))"
                    fillOpacity={0.15}
                  />
                  {/* Zone orange (déséquilibré) */}
                  <ReferenceArea
                    x1={targets.vlamaxTarget}
                    x2={0.8}
                    y1={targets.tteTarget - 5}
                    y2={80}
                    fill="hsl(var(--warning))"
                    fillOpacity={0.15}
                  />
                  {/* Zone rouge (glycolytique) */}
                  <ReferenceArea
                    x1={targets.vlamaxTarget}
                    x2={0.8}
                    y1={25}
                    y2={targets.tteTarget - 5}
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.15}
                  />
                  
                  {/* Lignes cibles */}
                  <ReferenceLine
                    x={targets.vlamaxTarget}
                    stroke="hsl(var(--foreground))"
                    strokeDasharray="5 5"
                    strokeOpacity={0.5}
                    label={{ value: `Cible ${targets.vlamaxTarget}`, position: 'top', fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={targets.tteTarget}
                    stroke="hsl(var(--foreground))"
                    strokeDasharray="5 5"
                    strokeOpacity={0.5}
                    label={{ value: `${targets.tteTarget} min`, position: 'right', fontSize: 10 }}
                  />
                  
                  <XAxis
                    type="number"
                    dataKey="vlamax"
                    domain={[0.2, 0.8]}
                    tickCount={7}
                    tick={{ fontSize: 10 }}
                    label={{ value: 'VLamax (mmol/L/s)', position: 'bottom', fontSize: 11, offset: 0 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="tte"
                    domain={[25, 80]}
                    tickCount={6}
                    tick={{ fontSize: 10 }}
                    label={{ value: 'TTE (min)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                  />
                  
                  <Tooltip content={<CustomTooltip staffMode={staffMode} />} />
                  
                  <Scatter data={chartData} fill="hsl(var(--primary))">
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={profileZone?.color || "hsl(var(--primary))"}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                        r={8}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            
            {staffMode && (
              <div className="mt-3 p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                <p><strong>Objectif:</strong> {objectif} | <strong>VLamax cible:</strong> ≤{targets.vlamaxTarget} | <strong>TTE cible:</strong> ≥{targets.tteTarget} min</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}