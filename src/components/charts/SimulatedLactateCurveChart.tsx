/**
 * Simulated Lactate Curve – Mader-Heck Model
 * INSCYD-style lactate prediction from VO2max × VLamax interaction
 * Two For Coaching Lab
 */

import { useMemo } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Activity, Zap, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateLactateCurve,
  findLactateThresholds,
  predictFatMax,
  generateSubstrateCurve,
  type LactatePoint,
  type SubstratePoint,
} from "@/lib/v2/metabolicSimulator";
import {
  ResponsiveChartTooltip,
  mobileTooltipProps,
  responsiveAxisProps,
  responsiveGridProps,
  getResponsiveMargins,
} from "./ResponsiveChartTooltip";

// =============================================
// TYPES
// =============================================

interface SimulatedLactateCurveChartProps {
  vo2max: number | null;
  vlamax: number | null;
  ftp: number | null;
  weight?: number;
  staffMode?: boolean;
  className?: string;
}

// =============================================
// CUSTOM TOOLTIP
// =============================================

function LactateTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-xs min-w-[180px]">
      <div
        className="w-full h-1 rounded-full mb-2"
        style={{ backgroundColor: d.color }}
      />
      <p className="font-semibold text-[11px] mb-1.5">{d.zone}</p>
      <div className="space-y-0.5 text-[10px]">
        <Row label="Intensité" value={`${d.intensity}% VO₂max`} />
        <Row label="Puissance" value={`${Math.round(d.watts)}W`} />
        <Row
          label="[La] ss"
          value={`${d.lactate.toFixed(1)} mmol/L`}
          bold
          color={d.color}
        />
        {d.fatGmin != null && (
          <>
            <div className="border-t border-border/50 my-1" />
            <Row label="Lipides" value={`${d.fatGmin.toFixed(2)} g/min`} />
            <Row label="Glucides" value={`${d.carbGmin.toFixed(2)} g/min`} />
            <Row label="% Lipides" value={`${Math.round(d.fatPct)}%`} />
          </>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn("font-mono", bold && "font-bold")}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

// =============================================
// THRESHOLD BADGES
// =============================================

function ThresholdBadges({
  lt1Pct,
  lt2Pct,
  fatMaxPct,
  ftp,
}: {
  lt1Pct: number;
  lt2Pct: number;
  fatMaxPct: number;
  ftp: number;
}) {
  const pMax = ftp * 1.18;
  const items = [
    {
      label: "FatMax",
      pct: fatMaxPct,
      watts: Math.round((fatMaxPct / 100) * pMax),
      css: "bg-sky-500/10 border-sky-500/30 text-sky-600",
      icon: Droplets,
    },
    {
      label: "LT1 (2 mmol)",
      pct: lt1Pct,
      watts: Math.round((lt1Pct / 100) * pMax),
      css: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600",
      icon: Activity,
    },
    {
      label: "LT2 (4 mmol)",
      pct: lt2Pct,
      watts: Math.round((lt2Pct / 100) * pMax),
      css: "bg-orange-500/10 border-orange-500/30 text-orange-600",
      icon: Zap,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it) => (
        <div
          key={it.label}
          className={cn("p-2 rounded-lg border text-center", it.css)}
        >
          <it.icon className="h-3 w-3 mx-auto mb-0.5 opacity-60" />
          <div className="text-[9px] font-medium opacity-80">{it.label}</div>
          <div className="text-sm font-mono font-bold">{it.pct}%</div>
          <div className="text-[10px] text-muted-foreground">{it.watts}W</div>
        </div>
      ))}
    </div>
  );
}

// =============================================
// METABOLIC INSIGHT
// =============================================

function MetabolicInsight({
  vlamax,
  lt1Pct,
  lt2Pct,
}: {
  vlamax: number;
  lt1Pct: number;
  lt2Pct: number;
}) {
  const gap = lt2Pct - lt1Pct;

  const insight =
    vlamax < 0.35
      ? {
          title: "Profil Endurance",
          desc: `VLamax basse → seuils élevés (LT1 ${lt1Pct}%, LT2 ${lt2Pct}%). Excellente efficacité lipidique.`,
          Icon: Activity,
          color: "text-emerald-600",
        }
      : vlamax > 0.55
        ? {
            title: "Profil Glycolytique",
            desc: `VLamax élevée → seuils bas (écart ${gap}%). Priorité : volume Z2 pour abaisser VLamax.`,
            Icon: Zap,
            color: "text-orange-600",
          }
        : {
            title: "Profil Équilibré",
            desc: `Écart LT1-LT2 de ${gap}% — marge de progression au tempo et sweet-spot.`,
            Icon: TrendingUp,
            color: "text-sky-600",
          };

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border">
      <insight.Icon
        className={cn("h-4 w-4 mt-0.5 shrink-0", insight.color)}
      />
      <div>
        <div className={cn("text-xs font-semibold", insight.color)}>
          {insight.title}
        </div>
        <div className="text-[11px] text-muted-foreground">{insight.desc}</div>
      </div>
    </div>
  );
}

// =============================================
// STAFF DATA BLOCK
// =============================================

function StaffDataBlock({
  vo2max,
  vlamax,
  lt1Pct,
  lt2Pct,
  fatMaxPct,
}: {
  vo2max: number;
  vlamax: number;
  lt1Pct: number;
  lt2Pct: number;
  fatMaxPct: number;
}) {
  return (
    <div className="rounded-lg bg-muted/20 border border-dashed p-3 space-y-1.5 text-[10px] font-mono text-muted-foreground">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-foreground/60 mb-1">
        Modèle Mader-Heck — Données techniques
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span>VO₂max: {vo2max} ml/kg/min</span>
        <span>VLamax: {vlamax.toFixed(2)} mmol/L/s</span>
        <span>LT1: {lt1Pct}% VO₂max (≈2 mmol/L)</span>
        <span>LT2: {lt2Pct}% VO₂max (≈4 mmol/L)</span>
        <span>FatMax: {fatMaxPct}% VO₂max</span>
        <span>Écart LT1→LT2: {lt2Pct - lt1Pct}%</span>
      </div>
      <p className="text-[9px] opacity-60 pt-1 border-t border-border/30">
        Courbe reconstruite par interaction VO₂max × VLamax (modèle Mader simplifié).
        Production glycolytique ∝ VLamax·f²·⁸ | Clairance ∝ VO₂max·f·(1−0.3f⁴).
        Valider par test lactate terrain (protocole step 4 min).
      </p>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function SimulatedLactateCurveChart({
  vo2max,
  vlamax,
  ftp,
  weight = 70,
  staffMode = false,
  className,
}: SimulatedLactateCurveChartProps) {
  // Validate inputs
  const valid = vo2max && vlamax && ftp && vo2max > 0 && vlamax > 0 && ftp > 0;

  // Generate curves
  const lactateCurve = useMemo(
    () => (valid ? generateLactateCurve(vo2max!, vlamax!, ftp!) : []),
    [vo2max, vlamax, ftp, valid]
  );

  const substrateCurve = useMemo(
    () =>
      valid ? generateSubstrateCurve(vo2max!, vlamax!, weight, ftp!) : [],
    [vo2max, vlamax, weight, ftp, valid]
  );

  const { lt1Pct, lt2Pct } = useMemo(
    () => (valid ? findLactateThresholds(vo2max!, vlamax!) : { lt1Pct: 60, lt2Pct: 80 }),
    [vo2max, vlamax, valid]
  );

  const fatMaxPct = useMemo(
    () => (valid ? predictFatMax(vlamax!) : 60),
    [vlamax, valid]
  );

  // Merge lactate + substrate data
  const chartData = useMemo(() => {
    if (!valid) return [];
    const substrateMap = new Map(substrateCurve.map((s) => [s.intensity, s]));
    return lactateCurve.map((lp) => {
      const sub = substrateMap.get(lp.intensity);
      return {
        ...lp,
        fatGmin: sub?.fatGmin ?? null,
        carbGmin: sub?.carbGmin ?? null,
        fatPct: sub?.fatPct ?? null,
      };
    });
  }, [lactateCurve, substrateCurve, valid]);

  if (!valid) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Données métaboliques insuffisantes (VO₂max, VLamax, FTP requis)
          </p>
        </CardContent>
      </Card>
    );
  }

  const margins = getResponsiveMargins();

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-orange-500/10 via-transparent to-emerald-500/5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            Courbe de Lactate Simulée
            <Badge variant="outline" className="text-[9px] font-normal">
              Mader-Heck
            </Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Badge variant="secondary" className="text-[9px] font-mono">
              VLa {vlamax!.toFixed(2)}
            </Badge>
            <Badge variant="secondary" className="text-[9px] font-mono">
              VO₂ {vo2max}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        {/* Threshold badges */}
        <ThresholdBadges
          lt1Pct={lt1Pct}
          lt2Pct={lt2Pct}
          fatMaxPct={fatMaxPct}
          ftp={ftp!}
        />

        {/* Main chart */}
        <div className="w-full h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ ...margins, left: -10 }}
            >
              <defs>
                <linearGradient id="lacGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(24,95%,53%)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(24,95%,53%)" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142,71%,45%)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(142,71%,45%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid {...responsiveGridProps()} />

              {/* Zone backgrounds */}
              <ReferenceArea y1={0} y2={2} fill="hsl(142,71%,45%)" fillOpacity={0.06} />
              <ReferenceArea y1={2} y2={4} fill="hsl(45,93%,47%)" fillOpacity={0.06} />
              <ReferenceArea y1={4} y2={8} fill="hsl(24,95%,53%)" fillOpacity={0.06} />
              <ReferenceArea y1={8} y2={20} fill="hsl(0,84%,60%)" fillOpacity={0.06} />

              <XAxis
                dataKey="intensity"
                {...responsiveAxisProps()}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                yAxisId="lactate"
                {...responsiveAxisProps()}
                domain={[0, 14]}
                tickFormatter={(v: number) => `${v}`}
                label={{
                  value: "mmol/L",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 9,
                  fill: "hsl(var(--muted-foreground))",
                  offset: 15,
                }}
              />

              {staffMode && (
                <YAxis
                  yAxisId="substrate"
                  orientation="right"
                  {...responsiveAxisProps()}
                  domain={[0, 4]}
                  tickFormatter={(v: number) => `${v}`}
                  label={{
                    value: "g/min",
                    angle: 90,
                    position: "insideRight",
                    fontSize: 9,
                    fill: "hsl(var(--muted-foreground))",
                    offset: 10,
                  }}
                />
              )}

              <Tooltip content={<LactateTooltip />} {...mobileTooltipProps()} />

              {/* LT1 / LT2 reference lines */}
              <ReferenceLine
                yAxisId="lactate"
                y={2}
                stroke="hsl(142,71%,45%)"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                label={{
                  value: "LT1",
                  fontSize: 9,
                  fill: "hsl(142,71%,45%)",
                  position: "right",
                }}
              />
              <ReferenceLine
                yAxisId="lactate"
                y={4}
                stroke="hsl(24,95%,53%)"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                label={{
                  value: "LT2",
                  fontSize: 9,
                  fill: "hsl(24,95%,53%)",
                  position: "right",
                }}
              />

              {/* FatMax vertical */}
              <ReferenceLine
                yAxisId="lactate"
                x={fatMaxPct}
                stroke="hsl(217,91%,60%)"
                strokeWidth={1}
                strokeDasharray="4 4"
                label={{
                  value: "FatMax",
                  fontSize: 8,
                  fill: "hsl(217,91%,60%)",
                  position: "top",
                }}
              />

              {/* Substrate curves (staff mode) */}
              {staffMode && (
                <>
                  <Area
                    yAxisId="substrate"
                    type="monotone"
                    dataKey="fatGmin"
                    stroke="hsl(142,71%,45%)"
                    strokeWidth={1.5}
                    fill="url(#fatGrad)"
                    dot={false}
                    name="Lipides"
                  />
                  <Line
                    yAxisId="substrate"
                    type="monotone"
                    dataKey="carbGmin"
                    stroke="hsl(45,93%,47%)"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                    name="Glucides"
                  />
                </>
              )}

              {/* Main lactate curve */}
              <Area
                yAxisId="lactate"
                type="monotone"
                dataKey="lactate"
                stroke="hsl(24,95%,53%)"
                strokeWidth={2.5}
                fill="url(#lacGrad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
                name="Lactate"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Zone legend */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { label: "< LT1 (Z1-Z2)", color: "hsl(142,71%,45%)" },
            { label: "LT1→LT2 (Z3)", color: "hsl(45,93%,47%)" },
            { label: "> LT2 (Z4)", color: "hsl(24,95%,53%)" },
            { label: "VO₂max (Z5+)", color: "hsl(0,84%,60%)" },
          ].map((z) => (
            <div key={z.label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
              <span className="text-[9px] text-muted-foreground">{z.label}</span>
            </div>
          ))}
          {staffMode && (
            <>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 rounded bg-emerald-500" />
                <span className="text-[9px] text-muted-foreground">Lipides (g/min)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 rounded bg-yellow-500 border-dashed" />
                <span className="text-[9px] text-muted-foreground">Glucides (g/min)</span>
              </div>
            </>
          )}
        </div>

        {/* Metabolic insight */}
        <MetabolicInsight vlamax={vlamax!} lt1Pct={lt1Pct} lt2Pct={lt2Pct} />

        {/* Staff block */}
        {staffMode && (
          <StaffDataBlock
            vo2max={vo2max!}
            vlamax={vlamax!}
            lt1Pct={lt1Pct}
            lt2Pct={lt2Pct}
            fatMaxPct={fatMaxPct}
          />
        )}

        {/* Disclaimer */}
        <p className="text-[9px] text-muted-foreground text-center pt-2 border-t">
          Courbe reconstruite par modèle Mader-Heck (VO₂max × VLamax). Non-invasif. Valider par test lactate step.
        </p>
      </CardContent>
    </Card>
  );
}
