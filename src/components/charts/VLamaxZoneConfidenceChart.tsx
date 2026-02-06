/**
 * VLamaxZoneConfidenceChart — Graphique signature TFCL
 * "VLamax = Zone physiologique × Confiance"
 *
 * Cartésien 2D:
 *   Axe X = VLamax effective (mmol/L/s), bornes dynamiques par sport
 *   Axe Y = Confidence Score (0–1)
 *   Bandes verticales = zones physiologiques (diesel → sprinter)
 *   Lignes horizontales = niveaux de décision
 *   Point athlète + barre d'erreur horizontale
 *
 * Règles:
 *   - Jamais vlamax_raw affiché
 *   - Jamais plus de 2 décimales
 *   - Si confidence < 0.4: message pédagogique
 *   - Si confidence < 0.6: badge "Décision à confirmer"
 */

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Cell,
  ErrorBar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Zap, AlertTriangle, CheckCircle2, Info, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VLamaxV2Result, SportContext, VLamaxV2Source } from "@/lib/v2/vlamaxV2Engine";
import {
  PHYSIOLOGICAL_BOUNDS,
  getV2ConfidenceLabel,
  VLAMAX_V2_ACADEMY_TEXT,
} from "@/lib/v2/vlamaxV2Engine";

// =============================================
// ZONES PHYSIOLOGIQUES VLamax
// =============================================

interface VLamaxZone {
  id: string;
  label: string;
  min: number;
  max: number;
  color: string;       // fill for ReferenceArea
  textColor: string;   // for labels
}

const VLAMAX_ZONES: VLamaxZone[] = [
  { id: "diesel",     label: "Diesel",        min: 0.20, max: 0.30, color: "hsl(210, 70%, 85%)",  textColor: "hsl(210, 70%, 35%)" },
  { id: "endurance",  label: "Endurance",     min: 0.30, max: 0.40, color: "hsl(150, 60%, 85%)",  textColor: "hsl(150, 60%, 30%)" },
  { id: "allround",   label: "All-round",     min: 0.40, max: 0.55, color: "hsl(45, 80%, 88%)",   textColor: "hsl(45, 80%, 30%)" },
  { id: "puncheur",   label: "Puncheur",      min: 0.55, max: 0.70, color: "hsl(25, 80%, 88%)",   textColor: "hsl(25, 80%, 30%)" },
  { id: "sprinter",   label: "Sprinter",      min: 0.70, max: 1.10, color: "hsl(0, 70%, 88%)",    textColor: "hsl(0, 70%, 35%)" },
];

/** Confidence decision levels */
const CONFIDENCE_LEVELS = [
  { y: 0.0, label: "Exploratoire",         color: "hsl(0, 60%, 70%)" },
  { y: 0.4, label: "Tendance",             color: "hsl(35, 70%, 60%)" },
  { y: 0.6, label: "Décision utilisable",  color: "hsl(45, 70%, 50%)" },
  { y: 0.8, label: "Décision robuste",     color: "hsl(140, 60%, 40%)" },
];

function getZoneForValue(vlamax: number): VLamaxZone {
  return VLAMAX_ZONES.find(z => vlamax >= z.min && vlamax < z.max) || VLAMAX_ZONES[2];
}

function getSourceLabel(source: VLamaxV2Source): string {
  switch (source) {
    case "test_labo": return "Test labo (mesure lactate)";
    case "test_terrain": return "Test terrain protocolaire";
    case "semaine_reference": return "Semaine de référence TFCL";
    case "estimation": return "Estimation continue";
    case "unknown": return "Non disponible";
  }
}

function getDecisionLabel(confidence: number): string {
  if (confidence >= 0.8) return "Décision robuste";
  if (confidence >= 0.6) return "Décision utilisable";
  if (confidence >= 0.4) return "Tendance identifiée";
  return "Exploratoire — données insuffisantes";
}

// =============================================
// CUSTOM TOOLTIP
// =============================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      x: number;
      y: number;
      errorMargin: number;
      source: VLamaxV2Source;
      zone: string;
    };
  }>;
}

function ChartTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm space-y-1">
      <p className="font-semibold">
        VLamax : {data.x.toFixed(2)} ± {data.errorMargin.toFixed(2)}
      </p>
      <p>Confiance : {data.y.toFixed(2)}</p>
      <p className="text-muted-foreground text-xs">
        Source : {getSourceLabel(data.source)}
      </p>
      <p className="text-xs">
        Décision : {data.zone} · {getDecisionLabel(data.y)}
      </p>
    </div>
  );
}

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

interface VLamaxZoneConfidenceChartProps {
  /** Résultat V2 complet */
  v2Result: VLamaxV2Result | null;
  /** Sport pour les bornes dynamiques */
  sport?: SportContext;
  /** Variation stable (< 5% sur 4 semaines) */
  isStable?: boolean;
  /** Compact mode (embedded) */
  compact?: boolean;
}

export function VLamaxZoneConfidenceChart({
  v2Result,
  sport = "velo",
  isStable = false,
  compact = false,
}: VLamaxZoneConfidenceChartProps) {
  const bounds = PHYSIOLOGICAL_BOUNDS[sport];

  // Data point
  const dataPoint = useMemo(() => {
    if (!v2Result || v2Result.effective === null) return null;
    return {
      x: v2Result.effective,
      y: v2Result.confidence,
      errorMargin: v2Result.errorMargin,
      source: v2Result.source,
      zone: getZoneForValue(v2Result.effective).label,
    };
  }, [v2Result]);

  const athleteZone = dataPoint ? getZoneForValue(dataPoint.x) : null;
  const confidence = v2Result?.confidence ?? 0;
  const showWarningBadge = confidence > 0 && confidence < 0.6;
  const isLowConfidence = confidence < 0.4;

  // Filter zones to sport bounds
  const visibleZones = VLAMAX_ZONES.filter(z => z.min < bounds.max && z.max > bounds.min).map(z => ({
    ...z,
    min: Math.max(z.min, bounds.min),
    max: Math.min(z.max, bounds.max),
  }));

  // Error bar data for horizontal error margin
  const errorBarData = useMemo(() => {
    if (!dataPoint) return [];
    return [{
      ...dataPoint,
      errorX: dataPoint.errorMargin,
    }];
  }, [dataPoint]);

  if (!v2Result || v2Result.effective === null) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">VLamax = Zone × Confiance</p>
            <p className="text-xs mt-1">Données insuffisantes pour positionner l'athlète</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            VLamax = Zone × Confiance
          </CardTitle>
          <div className="flex items-center gap-2">
            {isStable && (
              <Badge variant="outline" className="text-[10px] gap-1 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700">
                <CheckCircle2 className="h-3 w-3" />
                VLamax stable
              </Badge>
            )}
            {showWarningBadge && (
              <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                <AlertTriangle className="h-3 w-3" />
                Décision à confirmer
              </Badge>
            )}
            {v2Result.variationWarning && (
              <Badge variant="outline" className="text-[10px] gap-1 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700">
                <AlertTriangle className="h-3 w-3" />
                Variation détectée
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Chart */}
        <div className={compact ? "h-[220px]" : "h-[320px]"}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 25, left: 10 }}>
              {/* Vertical zone bands */}
              {visibleZones.map((zone) => (
                <ReferenceArea
                  key={zone.id}
                  x1={zone.min}
                  x2={zone.max}
                  y1={0}
                  y2={1}
                  fill={zone.color}
                  fillOpacity={0.35}
                  ifOverflow="hidden"
                />
              ))}

              {/* Horizontal confidence lines */}
              {[0.4, 0.6, 0.8].map((y) => (
                <ReferenceLine
                  key={`conf-${y}`}
                  y={y}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                />
              ))}

              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />

              <XAxis
                type="number"
                dataKey="x"
                domain={[bounds.min, bounds.max]}
                tickCount={8}
                tickFormatter={(v: number) => v.toFixed(2)}
                label={{
                  value: "VLamax (mmol/L/s)",
                  position: "bottom",
                  offset: 10,
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                }}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[0, 1]}
                tickCount={6}
                tickFormatter={(v: number) => v.toFixed(1)}
                label={{
                  value: "Confiance",
                  angle: -90,
                  position: "insideLeft",
                  offset: 0,
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                }}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />

              <RechartsTooltip content={<ChartTooltip />} />

              {/* Error bar scatter (invisible points, visible error bars) */}
              <Scatter data={errorBarData} fill="transparent" isAnimationActive={false}>
                <ErrorBar
                  dataKey="errorX"
                  direction="x"
                  width={0}
                  strokeWidth={2}
                  stroke={athleteZone?.textColor ?? "hsl(var(--foreground))"}
                  opacity={0.5}
                />
              </Scatter>

              {/* Athlete point */}
              {dataPoint && (
                <Scatter
                  data={[dataPoint]}
                  isAnimationActive
                  animationDuration={800}
                >
                  <Cell
                    fill={athleteZone?.textColor ?? "hsl(var(--primary))"}
                    fillOpacity={Math.max(0.4, confidence)}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                    r={8}
                  />
                </Scatter>
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Zone labels under chart */}
        <div className="flex items-center justify-center gap-1 flex-wrap">
          {visibleZones.map((zone) => (
            <div
              key={zone.id}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-medium",
                athleteZone?.id === zone.id
                  ? "ring-1 ring-offset-1 ring-foreground/30"
                  : "opacity-60"
              )}
              style={{
                backgroundColor: zone.color,
                color: zone.textColor,
              }}
            >
              {zone.label}
            </div>
          ))}
        </div>

        {/* Confidence level labels */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
          {CONFIDENCE_LEVELS.map((level) => (
            <div key={level.y} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: level.color }}
              />
              <span>{level.label}</span>
            </div>
          ))}
        </div>

        {/* Résumé athlète */}
        <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full border border-background"
              style={{
                backgroundColor: athleteZone?.textColor,
                opacity: Math.max(0.5, confidence),
              }}
            />
            <div>
              <span className="text-sm font-mono font-bold">
                ≈ {v2Result.effective!.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                ± {v2Result.errorMargin.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <Badge
              variant="outline"
              className="text-[10px] gap-1"
            >
              <ShieldCheck className="h-3 w-3" />
              {getV2ConfidenceLabel(confidence)} ({(confidence * 100).toFixed(0)}%)
            </Badge>
          </div>
        </div>

        {/* Low confidence pedagogical message */}
        {isLowConfidence && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 cursor-help">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                      Confiance insuffisante pour une recommandation automatique
                    </p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                      La VLamax est positionnée à titre indicatif. Réalisez un test terrain ou importez des données supplémentaires pour fiabiliser la décision.
                    </p>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-xs font-medium mb-1">{VLAMAX_V2_ACADEMY_TEXT.title}</p>
                <p className="text-xs text-muted-foreground whitespace-pre-line">
                  {VLAMAX_V2_ACADEMY_TEXT.body}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
