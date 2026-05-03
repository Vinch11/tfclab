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
 * Génère les points du graphique Pacing Envelope — Stratégie NEGATIVE SPLIT
 * 
 * PHILOSOPHIE DAN LORANG:
 * "Les 30 premières minutes sont NON NÉGOCIABLES."
 * L'erreur précoce coûte plus qu'elle ne rapporte. Favoriser les negative splits.
 * 
 * STRATÉGIE EN 3 PHASES:
 * 1. PHASE CONSERVATRICE (0-20% de la course, minimum 30 min)
 *    → Départ au BAS de l'enveloppe (lowPct + 20% de la largeur)
 *    → But: éviter accumulation de lactate, stabiliser métabolisme
 * 
 * 2. PHASE D'INSTALLATION (20%-70% de la course)
 *    → Montée progressive vers le CENTRE de l'enveloppe
 *    → But: trouver son rythme de croisière
 * 
 * 3. PHASE FINALE (>70% de la course)
 *    → Possibilité d'aller vers le HAUT de l'enveloppe si disponibilité
 *    → But: utiliser les réserves restantes
 * 
 * Le graphique montre donc une courbe ASCENDANTE (negative split visuel)
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
  
  // Largeur de l'enveloppe optimale
  const envelopeWidth = boundary.highPct - boundary.lowPct;
  
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
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STRATÉGIE NEGATIVE SPLIT (Philosophie Dan Lorang)
    // ═══════════════════════════════════════════════════════════════════════════
    let intensity: number;
    
    // Phase 1: CONSERVATRICE (0-20% ou premiers 30 min minimum)
    // Départ au bas de l'enveloppe + 20% de la largeur
    const conservativePhaseEnd = 0.20;
    
    // Phase 2: INSTALLATION (20%-70%)
    // Montée progressive vers le centre
    const installationPhaseEnd = 0.70;
    
    if (progress <= conservativePhaseEnd) {
      // Phase 1: Départ conservateur — bas de l'enveloppe + marge de sécurité
      // "Les 30 premières minutes sont NON NÉGOCIABLES"
      intensity = boundary.lowPct + envelopeWidth * 0.2;
      
    } else if (progress <= installationPhaseEnd) {
      // Phase 2: Installation progressive vers le centre
      // Interpolation linéaire du bas vers le centre
      const phaseProgress = (progress - conservativePhaseEnd) / (installationPhaseEnd - conservativePhaseEnd);
      const startIntensity = boundary.lowPct + envelopeWidth * 0.2;
      intensity = startIntensity + (boundary.centerPct - startIntensity) * phaseProgress;
      
    } else {
      // Phase 3: Finale — possibilité d'aller vers le haut si disponibilité
      // Interpolation du centre vers le haut (mais pas au-delà de highPct - 1)
      const phaseProgress = (progress - installationPhaseEnd) / (1 - installationPhaseEnd);
      const targetHigh = boundary.highPct - 1; // Marge de sécurité
      intensity = boundary.centerPct + (targetHigh - boundary.centerPct) * phaseProgress * 0.8;
    }
    
    // Clamp dans les limites de l'enveloppe optimale
    intensity = Math.min(boundary.highPct, Math.max(boundary.lowPct, intensity));
    
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
    <Card className={cn("overflow-hidden border-border/60 shadow-sm", className)}>
      <CardHeader className="pb-3 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold leading-tight">
                Couloir de pacing
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Stratégie negative split — {boundary.referenceShortLabel}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {pacingProfile.badge && (
              <Badge variant="outline" className="text-[9px] font-medium border-purple-400/40 bg-purple-500/10 text-purple-700 dark:text-purple-300">
                {pacingProfile.badge}
              </Badge>
            )}
            <Badge variant="outline" className="text-[9px] font-medium">
              {envelope.raceObjective}
            </Badge>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="rounded-md border bg-card/50 p-2 text-center">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Plancher</div>
            <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">{boundary.lowPct}%</div>
          </div>
          <div className="rounded-md border-2 border-emerald-500/40 bg-emerald-500/10 p-2 text-center">
            <div className="text-[9px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Cible</div>
            <div className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400">{boundary.centerPct}%</div>
          </div>
          <div className="rounded-md border bg-card/50 p-2 text-center">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">Plafond</div>
            <div className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">{boundary.highPct}%</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 pt-2">
        {/* Alertes */}
        {hasCriticalErrors && showErrors && (
          <div className="mb-3 p-2.5 rounded-lg border border-red-500/30 bg-red-500/10 flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">Dépassements critiques détectés — zone interdite atteinte</span>
          </div>
        )}

        {/* Graphique */}
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="pacingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142 76% 45%)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="hsl(142 76% 45%)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="optimalBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142 76% 45%)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="hsl(142 76% 45%)" stopOpacity={0.08} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="2 4" opacity={0.18} vertical={false} />

              {/* Zones de référence */}
              <ReferenceArea
                y1={yMin}
                y2={boundary.lowPct - 5}
                fill="hsl(217 91% 60%)"
                fillOpacity={0.06}
              />
              <ReferenceArea
                y1={boundary.lowPct}
                y2={boundary.highPct}
                fill="url(#optimalBand)"
              />
              <ReferenceArea
                y1={boundary.highPct}
                y2={boundary.toleratedPct}
                fill="hsl(38 92% 50%)"
                fillOpacity={0.12}
              />
              <ReferenceArea
                y1={boundary.toleratedPct}
                y2={yMax}
                fill="hsl(0 84% 60%)"
                fillOpacity={0.16}
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
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickCount={6}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />

              <YAxis
                domain={[yMin, yMax]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                width={36}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip content={<CustomTooltip envelope={envelope} />} cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "3 3" }} />

              {/* Lignes de référence */}
              <ReferenceLine
                y={boundary.centerPct}
                stroke="hsl(142 76% 45%)"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                strokeOpacity={0.7}
                label={showZoneLabels && staffMode ? { value: "Cible", position: "right", fontSize: 9, fill: "hsl(142 76% 36%)" } : undefined}
              />
              <ReferenceLine
                y={boundary.highPct}
                stroke="hsl(38 92% 50%)"
                strokeDasharray="3 3"
                strokeWidth={1}
                strokeOpacity={0.6}
              />
              <ReferenceLine
                y={boundary.toleratedPct}
                stroke="hsl(0 84% 60%)"
                strokeDasharray="3 3"
                strokeWidth={1}
                strokeOpacity={0.6}
              />

              {/* Courbe de pacing */}
              <Area
                type="monotone"
                dataKey="intensity"
                stroke="hsl(142 76% 36%)"
                strokeWidth={2.5}
                fill="url(#pacingGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "hsl(142 76% 36%)", stroke: "hsl(var(--background))", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Légende moderne */}
        {showZoneLabels && (
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 justify-center">
            {[
              { c: "bg-blue-500/40", l: "Sous-exploit." },
              { c: "bg-emerald-500/50", l: "Optimale" },
              { c: "bg-amber-500/50", l: "Tolérée" },
              { c: "bg-red-500/50", l: "Interdite" },
            ].map((z) => (
              <div key={z.l} className="flex items-center gap-1.5 text-[10px]">
                <div className={cn("w-2.5 h-2.5 rounded-full", z.c)} />
                <span className="text-muted-foreground font-medium">{z.l}</span>
              </div>
            ))}
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
