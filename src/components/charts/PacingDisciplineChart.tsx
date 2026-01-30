/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL Pacing Discipline Graph™ — Graphique Signature
 * Two For Coaching Lab Method™
 * 
 * Visualisation du couloir physiologique de pacing avec:
 * - Bande centrale colorée = Pacing Envelope™
 * - Zone verte : optimale
 * - Zone orange : tolérée
 * - Zone rouge : interdite
 * - Courbe de pacing réel ou simulé
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  ReferenceArea,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Target, TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PacingEnvelopeResult, EnvelopeZone } from "@/lib/v2/pacingEnvelopeEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ChartDataPoint {
  time: number;         // minutes ou km
  timeLabel: string;
  intensity: number;    // % FTP/VMA
  zone: EnvelopeZone;
  isError: boolean;
  errorMessage?: string;
}

interface PacingDisciplineChartProps {
  envelope: PacingEnvelopeResult;
  
  // Données optionnelles de pacing réel ou simulé
  actualPacing?: ChartDataPoint[];
  simulatedPacing?: ChartDataPoint[];
  
  // Axe X
  xAxisMode?: "time" | "distance";
  totalDuration?: number;     // minutes
  totalDistance?: number;     // km
  
  // Mode d'affichage
  staffMode?: boolean;
  showErrors?: boolean;
  showZoneLabels?: boolean;
  
  // Style
  className?: string;
  height?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Génère les points du graphique Pacing Envelope
 * 
 * LOGIQUE CORRIGÉE:
 * Le Pacing Envelope affiche des ZONES D'INTENSITÉ CONSTANTES sur toute la durée.
 * L'intensité cible (% FTP/VMA) ne change PAS avec le temps — c'est l'intensité MOYENNE
 * que l'athlète doit maintenir pour toute la course.
 * 
 * Le graphique montre donc:
 * - Une ligne constante au CENTRE de l'enveloppe
 * - Les zones colorées (optimale, tolérée, interdite) comme bandes horizontales
 */
function generateIdealPacing(
  envelope: PacingEnvelopeResult,
  totalDuration: number,
  xAxisMode: "time" | "distance",
  totalDistance?: number
): ChartDataPoint[] {
  const points: ChartDataPoint[] = [];
  const { boundary } = envelope;
  const steps = 20;
  
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    let timeValue: number;
    let timeLabel: string;
    
    if (xAxisMode === "distance" && totalDistance) {
      timeValue = Math.round(progress * totalDistance);
      timeLabel = `${timeValue} km`;
    } else {
      timeValue = Math.round(progress * totalDuration);
      const h = Math.floor(timeValue / 60);
      const m = timeValue % 60;
      timeLabel = h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}min`;
    }
    
    // INTENSITÉ CONSTANTE = Centre de l'enveloppe
    // Le % d'intensité cible est le MÊME tout au long de la course
    const intensity = boundary.centerPct;
    
    points.push({
      time: timeValue,
      timeLabel,
      intensity: Math.round(intensity * 10) / 10,
      zone: "OPTIMAL",
      isError: false,
    });
  }
  
  return points;
}

function getZoneForIntensity(intensity: number, envelope: PacingEnvelopeResult): EnvelopeZone {
  const { boundary } = envelope;
  if (intensity < boundary.lowPct - 5) return "UNDEREXPLOITATION";
  if (intensity <= boundary.highPct) return "OPTIMAL";
  if (intensity <= boundary.toleratedPct) return "TOLERATED";
  return "FORBIDDEN";
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOLTIP CUSTOM
// ═══════════════════════════════════════════════════════════════════════════════

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
  envelope: PacingEnvelopeResult;
}

function CustomTooltip({ active, payload, envelope }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  
  const point = payload[0].payload;
  const zone = getZoneForIntensity(point.intensity, envelope);
  
  const zoneColors: Record<EnvelopeZone, string> = {
    UNDEREXPLOITATION: "text-blue-600",
    OPTIMAL: "text-green-600",
    TOLERATED: "text-orange-600",
    FORBIDDEN: "text-red-600",
  };
  
  const zoneLabels: Record<EnvelopeZone, string> = {
    UNDEREXPLOITATION: "Sous-exploitation",
    OPTIMAL: "Zone optimale",
    TOLERATED: "Zone tolérée",
    FORBIDDEN: "Zone interdite",
  };
  
  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-xs max-w-[200px]">
      <div className="font-semibold mb-1">{point.timeLabel}</div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground">Intensité:</span>
        <span className={cn("font-mono font-bold", zoneColors[zone])}>
          {point.intensity}%
        </span>
      </div>
      <div className={cn("font-medium", zoneColors[zone])}>
        {zoneLabels[zone]}
      </div>
      {point.isError && point.errorMessage && (
        <div className="mt-2 text-red-600 text-[10px] border-t pt-1">
          ⚠️ {point.errorMessage}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function PacingDisciplineChart({
  envelope,
  actualPacing,
  simulatedPacing,
  xAxisMode = "time",
  totalDuration = 180,
  totalDistance,
  staffMode = false,
  showErrors = true,
  showZoneLabels = true,
  className,
  height = 280,
}: PacingDisciplineChartProps) {
  // Générer les données
  const chartData = useMemo(() => {
    if (actualPacing && actualPacing.length > 0) {
      return actualPacing.map(p => ({
        ...p,
        zone: getZoneForIntensity(p.intensity, envelope),
      }));
    }
    if (simulatedPacing && simulatedPacing.length > 0) {
      return simulatedPacing.map(p => ({
        ...p,
        zone: getZoneForIntensity(p.intensity, envelope),
      }));
    }
    return generateIdealPacing(envelope, totalDuration, xAxisMode, totalDistance);
  }, [actualPacing, simulatedPacing, envelope, totalDuration, xAxisMode, totalDistance]);

  const { boundary, pacingProfile } = envelope;
  
  // Calculer les domaines
  const xMax = xAxisMode === "distance" && totalDistance ? totalDistance : totalDuration;
  const yMin = Math.max(45, boundary.lowPct - 10);
  const yMax = Math.min(100, boundary.forbiddenPct + 5);

  // Identifier les erreurs
  const errorPoints = chartData.filter(p => p.zone === "FORBIDDEN" || p.zone === "TOLERATED");
  const hasCriticalErrors = errorPoints.some(p => p.zone === "FORBIDDEN");

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">
              TFCL Pacing Discipline Graph™
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {pacingProfile.badge && (
              <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px]">
                {pacingProfile.badge}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">
              {envelope.raceObjective}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs">
          Couloir: {boundary.lowPct}–{boundary.highPct}% (centre: {boundary.centerPct}%)
        </CardDescription>
      </CardHeader>

      <CardContent className="p-2 sm:p-4">
        {/* Alertes */}
        {hasCriticalErrors && showErrors && (
          <div className="mb-3 p-2 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>Dépassements critiques détectés — zone interdite atteinte</span>
          </div>
        )}

        {/* Graphique */}
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="pacingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />

              {/* Zones de référence */}
              {/* Zone sous-exploitation (bleu) */}
              <ReferenceArea
                y1={yMin}
                y2={boundary.lowPct - 5}
                fill="#3b82f6"
                fillOpacity={0.1}
              />
              
              {/* Zone optimale (vert) */}
              <ReferenceArea
                y1={boundary.lowPct}
                y2={boundary.highPct}
                fill="#22c55e"
                fillOpacity={0.15}
              />
              
              {/* Zone tolérée (orange) */}
              <ReferenceArea
                y1={boundary.highPct}
                y2={boundary.toleratedPct}
                fill="#f97316"
                fillOpacity={0.15}
              />
              
              {/* Zone interdite (rouge) */}
              <ReferenceArea
                y1={boundary.toleratedPct}
                y2={yMax}
                fill="#ef4444"
                fillOpacity={0.2}
              />

              <XAxis
                dataKey="time"
                type="number"
                domain={[0, xMax]}
                tickFormatter={(v) => {
                  if (xAxisMode === "distance") return `${v}km`;
                  const h = Math.floor(v / 60);
                  const m = v % 60;
                  return h > 0 ? `${h}h${m > 0 ? m : ""}` : `${m}'`;
                }}
                tick={{ fontSize: 10 }}
                tickCount={6}
              />

              <YAxis
                domain={[yMin, yMax]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 10 }}
                width={40}
              />

              <Tooltip content={<CustomTooltip envelope={envelope} />} />

              {/* Lignes de référence */}
              <ReferenceLine
                y={boundary.centerPct}
                stroke="#22c55e"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={showZoneLabels && staffMode ? { value: "Centre", position: "right", fontSize: 9 } : undefined}
              />
              <ReferenceLine
                y={boundary.highPct}
                stroke="#f97316"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <ReferenceLine
                y={boundary.toleratedPct}
                stroke="#ef4444"
                strokeDasharray="3 3"
                strokeWidth={1}
              />

              {/* Courbe de pacing */}
              <Area
                type="monotone"
                dataKey="intensity"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#pacingGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#22c55e" }}
              />

              <Legend
                verticalAlign="top"
                height={25}
                formatter={(value) => (
                  <span className="text-[10px] text-muted-foreground">
                    {value === "intensity" ? "Pacing" : value}
                  </span>
                )}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Légende des zones */}
        {showZoneLabels && (
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            <div className="flex items-center gap-1 text-[10px]">
              <div className="w-3 h-3 rounded-sm bg-blue-500/30" />
              <span className="text-muted-foreground">Sous-exploit.</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <div className="w-3 h-3 rounded-sm bg-green-500/30" />
              <span className="text-muted-foreground">Optimale</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <div className="w-3 h-3 rounded-sm bg-orange-500/30" />
              <span className="text-muted-foreground">Tolérée</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <div className="w-3 h-3 rounded-sm bg-red-500/30" />
              <span className="text-muted-foreground">Interdite</span>
            </div>
          </div>
        )}

        {/* Info profil sensible */}
        {pacingProfile.type === "sensitive" && (
          <div className="mt-3 p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-xs text-purple-700 dark:text-purple-300">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">{pacingProfile.label}</span>
            </div>
            {staffMode && pacingProfile.description && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {pacingProfile.description}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT PAR DÉFAUT
// ═══════════════════════════════════════════════════════════════════════════════

export default PacingDisciplineChart;
