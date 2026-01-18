/**
 * FatMaxRaceIntensityChart – Graphique Signature TFCL™
 * "FatMax vs Race Intensity – TFCL™"
 * 
 * Axes:
 * X → Intensité (% FTP)
 * Y → Contribution énergétique (% lipides → % glucides)
 * 
 * Éléments visuels:
 * - Courbe décroissante lipidique
 * - Bande FatMax TFCL (zone colorée)
 * - Ligne verticale intensité course cible
 * - Annotation "Zone de conflit métabolique" si intensité course > FatMax
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
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Flame, Target, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FatMaxTFCLResult,
  generateEnergyProfileData,
  isMetabolicConflict,
  getMetabolicConflictMessage,
  FATMAX_DEFINITIONS,
} from "@/lib/v2/fatmaxTFCL";

interface FatMaxRaceIntensityChartProps {
  fatmax: FatMaxTFCLResult | null;
  raceIntensityPct?: number | null;
  staffMode?: boolean;
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0].payload;
  
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{data.intensityPctFTP}% FTP</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>Lipides: {data.lipidPct}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span>Glucides: {data.carbPct}%</span>
        </div>
      </div>
      {data.isFatMaxZone && (
        <p className="mt-2 text-emerald-600 dark:text-emerald-400 font-medium">
          ✓ Zone FatMax TFCL™
        </p>
      )}
      {data.isRaceIntensity && (
        <p className="mt-1 text-primary font-medium">
          → Intensité course cible
        </p>
      )}
    </div>
  );
};

export function FatMaxRaceIntensityChart({
  fatmax,
  raceIntensityPct = null,
  staffMode = false,
  className,
}: FatMaxRaceIntensityChartProps) {
  const data = useMemo(() => {
    if (!fatmax) return [];
    return generateEnergyProfileData(fatmax, raceIntensityPct);
  }, [fatmax, raceIntensityPct]);

  const hasConflict = useMemo(() => {
    if (!fatmax || raceIntensityPct === null) return false;
    return isMetabolicConflict(fatmax, raceIntensityPct);
  }, [fatmax, raceIntensityPct]);

  const conflictMessage = useMemo(() => {
    if (!fatmax || raceIntensityPct === null) return null;
    return getMetabolicConflictMessage(fatmax, raceIntensityPct);
  }, [fatmax, raceIntensityPct]);

  if (!fatmax) {
    return (
      <Card className={cn("overflow-hidden opacity-60", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="w-4 h-4" />
            FatMax vs Race Intensity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">FatMax non disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              FatMax vs Race Intensity — TFCL™
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Contribution énergétique estimée selon l'intensité
            </CardDescription>
          </div>
          
          {hasConflict && (
            <Badge variant="destructive" className="text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Conflit métabolique
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Graphique principal */}
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, bottom: 30, left: 0 }}
            >
              <defs>
                <linearGradient id="lipidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="carbGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />

              <XAxis
                dataKey="intensityPctFTP"
                tick={{ fontSize: 10 }}
                tickFormatter={(val) => `${val}%`}
                label={{ 
                  value: "Intensité (% FTP)", 
                  position: "bottom", 
                  offset: 15,
                  fontSize: 11 
                }}
              />
              
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                tickFormatter={(val) => `${val}%`}
                label={{ 
                  value: "Contribution (%)", 
                  angle: -90, 
                  position: "insideLeft", 
                  fontSize: 11 
                }}
              />

              <Tooltip content={<CustomTooltip />} />

              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-xs">
                    {value === "lipidPct" ? "Lipides" : "Glucides"}
                  </span>
                )}
              />

              {/* Zone FatMax (bande colorée) */}
              <ReferenceArea
                x1={fatmax.minPctFTP}
                x2={fatmax.maxPctFTP}
                fill="hsl(var(--success))"
                fillOpacity={0.15}
                stroke="hsl(var(--success))"
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />

              {/* Ligne intensité course */}
              {raceIntensityPct !== null && (
                <ReferenceLine
                  x={raceIntensityPct}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{
                    value: `Race ${raceIntensityPct}%`,
                    position: "top",
                    fill: "hsl(var(--primary))",
                    fontSize: 10,
                  }}
                />
              )}

              {/* Courbes */}
              <Area
                type="monotone"
                dataKey="lipidPct"
                stackId="1"
                stroke="hsl(var(--success))"
                fill="url(#lipidGradient)"
                name="lipidPct"
              />
              <Area
                type="monotone"
                dataKey="carbPct"
                stackId="1"
                stroke="hsl(var(--warning))"
                fill="url(#carbGradient)"
                name="carbPct"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Légende FatMax */}
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 bg-success/30 border border-success rounded" />
            <span>Zone FatMax: {fatmax.minPctFTP}–{fatmax.maxPctFTP}%</span>
          </div>
          {raceIntensityPct !== null && (
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3 text-primary" />
              <span>Intensité course: {raceIntensityPct}%</span>
            </div>
          )}
        </div>

        {/* Alerte conflit métabolique */}
        {conflictMessage && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">
              {conflictMessage}
            </p>
          </div>
        )}

        {/* Explication pédagogique */}
        <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p>
                <strong>Lecture:</strong> Plus l'intensité augmente, plus la contribution glucidique domine. 
                La zone verte indique votre FatMax estimée ({fatmax.minPctFTP}–{fatmax.maxPctFTP}% FTP).
              </p>
              {raceIntensityPct !== null && raceIntensityPct > fatmax.maxPctFTP && (
                <p className="mt-1">
                  Votre intensité course cible ({raceIntensityPct}%) dépasse la FatMax : 
                  prévoir un apport glucidique soutenu.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Disclaimer staff */}
        {staffMode && (
          <div className="border-t pt-3 text-xs text-muted-foreground italic">
            ⚠️ {FATMAX_DEFINITIONS.scientificWarning}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
