/**
 * Fat/Carb Oxidation Chart – INSCYD-style
 * Taux de combustion lipides & glucides (g/min) vs intensité
 * Avec croisement FatMax et zone de transition métabolique
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
import { AlertTriangle, Flame, Droplets, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateSubstrateCurve,
  predictFatMax,
  type SubstratePoint,
} from "@/lib/v2/metabolicSimulator";
import {
  mobileTooltipProps,
  responsiveAxisProps,
  responsiveGridProps,
  getResponsiveMargins,
  useIsTouchDevice,
} from "./ResponsiveChartTooltip";

// =============================================
// TYPES
// =============================================

interface FatCarbOxidationChartProps {
  vo2max: number | null;
  vlamax: number | null;
  ftp: number | null;
  weight?: number;
  staffMode?: boolean;
  className?: string;
}

// =============================================
// TOOLTIP
// =============================================

function OxidationTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as SubstratePoint & { crossoverZone?: boolean };
  if (!d) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-[10px] min-w-[170px]">
      <p className="font-semibold text-xs mb-1.5">{d.intensity}% VO₂max</p>
      <div className="space-y-0.5">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(142,71%,45%)" }} />
            Lipides
          </span>
          <span className="font-mono font-bold" style={{ color: "hsl(142,71%,45%)" }}>
            {d.fatGmin.toFixed(2)} g/min
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(24,95%,53%)" }} />
            Glucides
          </span>
          <span className="font-mono font-bold" style={{ color: "hsl(24,95%,53%)" }}>
            {d.carbGmin.toFixed(2)} g/min
          </span>
        </div>
        <div className="border-t border-border/50 my-1 pt-1">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">% Lipides</span>
            <span className="font-mono">{Math.round(d.fatPct)}%</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Puissance</span>
            <span className="font-mono">{Math.round(d.watts)}W</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Dépense totale</span>
            <span className="font-mono">{(d.totalKcalMin * 60).toFixed(0)} kcal/h</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// KEY METRICS
// =============================================

function OxidationMetrics({
  data,
  fatMaxPct,
  ftp,
}: {
  data: SubstratePoint[];
  fatMaxPct: number;
  ftp: number;
}) {
  const pMax = ftp * 1.18;

  // Find peak fat oxidation
  const peakFat = data.reduce((best, p) => (p.fatGmin > best.fatGmin ? p : best), data[0]);

  // Find crossover point (where carb > fat in kcal)
  const crossover = data.find((p) => p.fatPct < 50);
  const crossoverPct = crossover?.intensity ?? fatMaxPct + 10;

  // Carb rate at FTP (~85% VO2max)
  const atFtp = data.find((p) => p.intensity >= 85) ?? data[data.length - 1];

  const items = [
    {
      label: "FatMax",
      value: `${peakFat.fatGmin.toFixed(2)} g/min`,
      sub: `${fatMaxPct}% VO₂max · ${Math.round((fatMaxPct / 100) * pMax)}W`,
      css: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600",
      Icon: Droplets,
    },
    {
      label: "Crossover",
      value: `${crossoverPct}% VO₂max`,
      sub: `${Math.round((crossoverPct / 100) * pMax)}W · 50/50 lip/glu`,
      css: "bg-sky-500/10 border-sky-500/30 text-sky-600",
      Icon: ArrowRightLeft,
    },
    {
      label: "CHO @ FTP",
      value: `${(atFtp.carbGmin * 60).toFixed(0)} g/h`,
      sub: `${atFtp.carbGmin.toFixed(2)} g/min · ${Math.round(atFtp.watts)}W`,
      css: "bg-orange-500/10 border-orange-500/30 text-orange-600",
      Icon: Flame,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((it) => (
        <div key={it.label} className={cn("p-2 rounded-lg border text-center", it.css)}>
          <it.Icon className="h-3 w-3 mx-auto mb-0.5 opacity-60" />
          <div className="text-[9px] font-medium opacity-80">{it.label}</div>
          <div className="text-sm font-mono font-bold">{it.value}</div>
          <div className="text-[9px] text-muted-foreground leading-tight">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}

// =============================================
// MAIN
// =============================================

export function FatCarbOxidationChart({
  vo2max,
  vlamax,
  ftp,
  weight = 70,
  staffMode = false,
  className,
}: FatCarbOxidationChartProps) {
  const isMobile = useIsTouchDevice();
  const valid = vo2max && vlamax && ftp && vo2max > 0 && vlamax > 0 && ftp > 0;

  const data = useMemo(
    () => (valid ? generateSubstrateCurve(vo2max!, vlamax!, weight, ftp!) : []),
    [vo2max, vlamax, weight, ftp, valid]
  );

  const fatMaxPct = useMemo(
    () => (valid ? predictFatMax(vlamax!) : 60),
    [vlamax, valid]
  );

  // Find crossover intensity
  const crossoverPct = useMemo(() => {
    const pt = data.find((p) => p.fatPct < 50);
    return pt?.intensity ?? fatMaxPct + 10;
  }, [data, fatMaxPct]);

  if (!valid) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            VO₂max, VLamax et FTP requis pour le graphique d'oxydation
          </p>
        </CardContent>
      </Card>
    );
  }

  const margins = getResponsiveMargins(isMobile);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-emerald-500/10 via-transparent to-orange-500/5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Oxydation Lipides / Glucides
            <Badge variant="outline" className="text-[9px] font-normal">
              Crossover Model
            </Badge>
          </CardTitle>
          <Badge variant="secondary" className="text-[9px] font-mono">
            VLa {vlamax!.toFixed(2)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        {/* Key metrics */}
        <OxidationMetrics data={data} fatMaxPct={fatMaxPct} ftp={ftp!} />

        {/* Chart */}
        <div className="w-full h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ ...margins, left: -10 }}>
              <defs>
                <linearGradient id="fatOxGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142,71%,45%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(142,71%,45%)" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="carbOxGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(24,95%,53%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(24,95%,53%)" stopOpacity={0.03} />
                </linearGradient>
              </defs>

              <CartesianGrid {...responsiveGridProps} />

              {/* Crossover zone highlight */}
              <ReferenceArea
                x1={fatMaxPct}
                x2={crossoverPct}
                fill="hsl(217,91%,60%)"
                fillOpacity={0.06}
                label={{
                  value: "Transition",
                  fontSize: 8,
                  fill: "hsl(217,91%,60%)",
                  position: "insideTop",
                }}
              />

              <XAxis
                dataKey="intensity"
                {...responsiveAxisProps.xAxis}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                {...responsiveAxisProps.yAxis}
                domain={[0, "auto"]}
                tickFormatter={(v: number) => v.toFixed(1)}
              />

              <Tooltip content={<OxidationTooltip />} {...mobileTooltipProps} />

              {/* FatMax vertical */}
              <ReferenceLine
                x={fatMaxPct}
                stroke="hsl(142,71%,45%)"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                label={{
                  value: "FatMax",
                  fontSize: 9,
                  fill: "hsl(142,71%,45%)",
                  position: "top",
                }}
              />

              {/* Crossover vertical */}
              <ReferenceLine
                x={crossoverPct}
                stroke="hsl(217,91%,60%)"
                strokeWidth={1}
                strokeDasharray="4 4"
                label={{
                  value: "Crossover",
                  fontSize: 8,
                  fill: "hsl(217,91%,60%)",
                  position: "top",
                }}
              />

              {/* Fat oxidation area */}
              <Area
                type="monotone"
                dataKey="fatGmin"
                stroke="hsl(142,71%,45%)"
                strokeWidth={2}
                fill="url(#fatOxGrad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
                name="Lipides"
              />

              {/* Carb oxidation area */}
              <Area
                type="monotone"
                dataKey="carbGmin"
                stroke="hsl(24,95%,53%)"
                strokeWidth={2}
                fill="url(#carbOxGrad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
                name="Glucides"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            { label: "Lipides (g/min)", color: "hsl(142,71%,45%)" },
            { label: "Glucides (g/min)", color: "hsl(24,95%,53%)" },
            { label: "Zone de transition", color: "hsl(217,91%,60%)" },
          ].map((z) => (
            <div key={z.label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
              <span className="text-[9px] text-muted-foreground">{z.label}</span>
            </div>
          ))}
        </div>

        {/* Insight */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border">
          <ArrowRightLeft className="h-4 w-4 mt-0.5 shrink-0 text-sky-600" />
          <div>
            <div className="text-xs font-semibold text-sky-600">Zone de transition métabolique</div>
            <div className="text-[11px] text-muted-foreground">
              Entre FatMax ({fatMaxPct}%) et Crossover ({crossoverPct}%), l'athlète bascule
              d'une dominance lipidique vers glucidique. Entraîner en Z2 sous le crossover
              améliore l'efficacité lipidique et préserve le glycogène en course.
            </div>
          </div>
        </div>

        {/* Staff details */}
        {staffMode && (
          <div className="rounded-lg bg-muted/20 border border-dashed p-3 text-[10px] font-mono text-muted-foreground space-y-1">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-foreground/60 mb-1">
              Modèle d'oxydation — Données techniques
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span>FatMax: {fatMaxPct}% VO₂max</span>
              <span>Crossover: {crossoverPct}% VO₂max</span>
              <span>Peak fat ox: {data.reduce((b, p) => Math.max(b, p.fatGmin), 0).toFixed(3)} g/min</span>
              <span>CHO @ 85%: {(data.find(p => p.intensity >= 85)?.carbGmin ?? 0).toFixed(2)} g/min</span>
            </div>
            <p className="text-[9px] opacity-60 pt-1 border-t border-border/30">
              Modèle crossover : oxydation lipidique bell-curve centrée FatMax, 
              pic ∝ VO₂max·(1−VLamax·0.5). Énergie totale = VO₂·5 kcal/L. 
              CHO = résidu (bilan énergétique).
            </p>
          </div>
        )}

        <p className="text-[9px] text-muted-foreground text-center pt-2 border-t">
          Estimations basées sur le modèle crossover (Brooks 1994). Valider par calorimétrie indirecte.
        </p>
      </CardContent>
    </Card>
  );
}
