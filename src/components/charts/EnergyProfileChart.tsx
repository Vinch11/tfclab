/**
 * Energy Profile Chart – VLamax vs TTE
 * Scatter plot avec zones colorées staff-grade
 * Optimisé pour mobile et touch
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
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  ResponsiveChartTooltip,
  mobileTooltipProps,
  getResponsiveMargins 
} from "./ResponsiveChartTooltip";

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
  
  const mainRows = [
    { label: "VLamax", value: data.vlamax?.toFixed(2), unit: "mmol/L/s" },
    { label: "TTE", value: data.tte, unit: "min" },
  ];
  
  const staffRows = staffMode ? [
    { label: "Source VLamax", value: data.vlamaxSource },
    { label: "Confiance VLamax", value: `${Math.round(data.vlamaxConfidence * 100)}%` },
    { label: "Source TTE", value: data.tteSource },
    { label: "Confiance TTE", value: `${Math.round(data.tteConfidence * 100)}%` },
  ] : undefined;
  
  return (
    <ResponsiveChartTooltip
      active={active}
      title={data.label}
      rows={mainRows}
      staffRows={staffRows}
      staffMode={staffMode}
    />
  );
};

export function EnergyProfileChart({ data, staffMode = false, className }: EnergyProfileChartProps) {
  const { vlamaxValue, vlamaxSource, vlamaxConfidence, tteValue, tteSource, tteConfidence, objectif } = data;
  const targets = getTargets(objectif);
  const isMobile = useIsMobile();
  const margins = getResponsiveMargins(isMobile);
  
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
      <CardHeader className="pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm sm:text-base flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="truncate">Energy Profile</span>
          {profileZone && (
            <span 
              className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap"
              style={{ backgroundColor: profileZone.color, color: 'white' }}
            >
              {profileZone.label}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {isDataMissing ? (
          <div className="h-40 sm:h-48 md:h-64 flex flex-col items-center justify-center text-muted-foreground">
            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 mb-2 opacity-50" />
            <p className="text-xs sm:text-sm text-center px-4">
              {vlamaxValue === null && tteValue === null 
                ? "VLamax et TTE non disponibles"
                : vlamaxValue === null 
                  ? "VLamax non disponible"
                  : "TTE non disponible"}
            </p>
            <p className="text-[10px] sm:text-xs mt-1">Créez un profil ou effectuez un test</p>
          </div>
        ) : (
          <>
            {isLowConfidence && (
              <div className="mb-2 p-1.5 sm:p-2 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-1.5 sm:gap-2">
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-warning mt-0.5 shrink-0" />
                <p className="text-[10px] sm:text-xs text-warning">
                  Confiance limitée – interpréter avec prudence
                </p>
              </div>
            )}
            <div className="h-40 sm:h-48 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={margins}>
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
                  
                  {/* Lignes cibles - labels cachés sur mobile */}
                  <ReferenceLine
                    x={targets.vlamaxTarget}
                    stroke="hsl(var(--foreground))"
                    strokeDasharray="5 5"
                    strokeOpacity={0.5}
                    label={isMobile ? undefined : { 
                      value: `Cible ${targets.vlamaxTarget}`, 
                      position: 'top', 
                      fontSize: 10 
                    }}
                  />
                  <ReferenceLine
                    y={targets.tteTarget}
                    stroke="hsl(var(--foreground))"
                    strokeDasharray="5 5"
                    strokeOpacity={0.5}
                    label={isMobile ? undefined : { 
                      value: `${targets.tteTarget} min`, 
                      position: 'right', 
                      fontSize: 10 
                    }}
                  />
                  
                  <XAxis
                    type="number"
                    dataKey="vlamax"
                    domain={[0.2, 0.8]}
                    tickCount={isMobile ? 4 : 7}
                    tick={{ fontSize: isMobile ? 9 : 10 }}
                    label={isMobile ? undefined : { 
                      value: 'VLamax (mmol/L/s)', 
                      position: 'bottom', 
                      fontSize: 11, 
                      offset: 0 
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="tte"
                    domain={[25, 80]}
                    tickCount={isMobile ? 4 : 6}
                    tick={{ fontSize: isMobile ? 9 : 10 }}
                    width={isMobile ? 25 : 35}
                    label={isMobile ? undefined : { 
                      value: 'TTE (min)', 
                      angle: -90, 
                      position: 'insideLeft', 
                      fontSize: 11 
                    }}
                  />
                  
                  <Tooltip 
                    content={<CustomTooltip staffMode={staffMode} />}
                    {...mobileTooltipProps}
                  />
                  
                  <Scatter data={chartData} fill="hsl(var(--primary))">
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={profileZone?.color || "hsl(var(--primary))"}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                        r={isMobile ? 10 : 8}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            
            {/* Labels mobiles sous le graphique */}
            {isMobile && (
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-2">
                <span>VLamax →</span>
                <span>TTE ↑</span>
              </div>
            )}
            
            {staffMode && (
              <div className="mt-2 sm:mt-3 p-1.5 sm:p-2 bg-muted/50 rounded-lg text-[10px] sm:text-xs text-muted-foreground">
                <p>
                  <strong>Objectif:</strong> {objectif} | 
                  <strong> VLamax cible:</strong> ≤{targets.vlamaxTarget} | 
                  <strong> TTE cible:</strong> ≥{targets.tteTarget} min
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}