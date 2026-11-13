/**
 * Fat/Carb Oxidation Chart – exploratory metabolic model
 * Full refonte: efficience variable, crossover zone band, dual-axis kcal/h
 * Uses maderMetabolicModel.ts for physiological accuracy
 */

import { useMemo, useState } from "react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlertTriangle, Flame, Droplets, ArrowRightLeft, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calculateFatOxidation,
  calculateCarbOxidation,
  findFatMax,
  findCarbMax,
  intensityToPowerWatts,
  type MaderProfile,
} from "@/lib/v2/maderMetabolicModel";
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
  ftp?: number | null;
  /** VMA en km/h — requis si paceMode=true (mode coureur sans FTP) */
  vma?: number | null;
  /** Si true, affiche en allure (min/km) au lieu de watts. Nécessite vma. */
  paceMode?: boolean;
  weight?: number;
  staffMode?: boolean;
  className?: string;
}

// Fraction de VMA correspondant à la vitesse au seuil (vSeuil ≈ 88% VMA)
const V_SEUIL_FRACTION = 0.88;

function kmhToPaceStr(kmh: number): string {
  if (!kmh || kmh <= 0) return "—";
  const min = 60 / kmh;
  const m = Math.floor(min);
  const s = Math.round((min - m) * 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

interface OxPoint {
  intensity: number;
  watts: number;
  paceKmh: number;
  paceStr: string;
  fatGmin: number;
  carbGmin: number;
  fatKcalH: number;
  carbKcalH: number;
  totalKcalH: number;
  fatPct: number;
  vo2LMin: number;
  efficiency: number;
}

// =============================================
// UNIT TOGGLE
// =============================================

export function UnitToggle({ paceMode, onChange }: { paceMode: boolean; onChange: (v: boolean) => void }) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      value={paceMode ? "pace" : "watts"}
      onValueChange={(v) => { if (v) onChange(v === "pace"); }}
      className="h-7"
    >
      <ToggleGroupItem value="watts" className="h-7 px-2 text-[10px]" aria-label="Watts">
        Watts
      </ToggleGroupItem>
      <ToggleGroupItem value="pace" className="h-7 px-2 text-[10px]" aria-label="Allure">
        Allure
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

// =============================================
// VARIABLE EFFICIENCY (21-26%)
// Scales with intensity and trained status
// =============================================

// =============================================
// TOOLTIP
// =============================================

function makeOxidationTooltip(paceMode: boolean) {
  return function OxidationTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload as OxPoint;
    if (!d) return null;
    const refLabel = paceMode ? d.paceStr : `${Math.round(d.watts)}W`;

    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg text-[10px] min-w-[190px]">
        <p className="font-semibold text-xs mb-1.5">{d.intensity}% VO₂max · {refLabel}</p>
        <div className="space-y-0.5">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--success))" }} />
              Lipides
            </span>
            <span className="font-mono font-bold" style={{ color: "hsl(var(--success))" }}>
              {d.fatGmin.toFixed(2)} g/min
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(var(--warning))" }} />
              Glucides
            </span>
            <span className="font-mono font-bold" style={{ color: "hsl(var(--warning))" }}>
              {d.carbGmin.toFixed(2)} g/min
            </span>
          </div>
          <div className="border-t border-border/50 my-1 pt-1 space-y-0.5">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">% Lipides</span>
              <span className="font-mono">{Math.round(d.fatPct)}%</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Fat kcal/h</span>
              <span className="font-mono">{Math.round(d.fatKcalH)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">CHO kcal/h</span>
              <span className="font-mono">{Math.round(d.carbKcalH)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Total</span>
              <span className="font-mono font-bold">{Math.round(d.totalKcalH)} kcal/h</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Efficience</span>
              <span className="font-mono">{(d.efficiency * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };
}

// =============================================
// KEY METRICS
// =============================================

function OxidationMetrics({ data, fatMax, refValue, paceMode, carbMax }: {
  data: OxPoint[];
  fatMax: { fatMaxIntensity: number; fatMaxPower: number; fatMaxGrams: number; carbAtFatMax: number };
  refValue: number; // FTP (W) ou vSeuil (km/h)
  paceMode: boolean;
  carbMax: { intensityPct: number | null; power: number | null; targetCarbGH: number } | null;
}) {
  const crossover = data.find((p) => p.fatPct < 50);
  const crossoverPct = crossover?.intensity ?? fatMax.fatMaxIntensity + 10;

  const atRef = paceMode
    ? data.find((p) => p.paceKmh >= refValue) ?? data[data.length - 1]
    : data.find((p) => Math.round(p.watts) >= refValue) ?? data[data.length - 1];

  const fatMaxRefStr = paceMode
    ? kmhToPaceStr((refValue / V_SEUIL_FRACTION) * (fatMax.fatMaxIntensity / 100))
    : `${fatMax.fatMaxPower}W`;
  const crossoverRefStr = paceMode
    ? kmhToPaceStr((refValue / V_SEUIL_FRACTION) * (crossoverPct / 100))
    : `${crossover ? Math.round(crossover.watts) : 0}W`;
  const atRefStr = paceMode ? atRef.paceStr : `${Math.round(atRef.watts)}W`;
  const refLabel = paceMode ? "Repère théorique 88% VMA" : "FTP";

  const items = [
    {
      label: "FatMax",
      value: `${fatMax.fatMaxGrams} g/min`,
      sub: `${Math.round(fatMax.fatMaxGrams * 9 * 60)} kcal/h · ${fatMaxRefStr}`,
      css: "bg-success/10 border-success/20 text-success",
      Icon: Droplets,
    },
    {
      label: "Crossover",
      value: `${crossoverPct}% VO₂max`,
      sub: `${crossoverRefStr} · 50/50 lip/glu`,
      css: "bg-primary/10 border-primary/20 text-primary",
      Icon: ArrowRightLeft,
    },
    {
      label: `CHO @ ${refLabel}`,
      value: `${Math.round(atRef.carbGmin * 60)} g/h`,
      sub: `${atRef.carbGmin.toFixed(2)} g/min · ${atRefStr}`,
      css: "bg-warning/10 border-warning/20 text-warning",
      Icon: Flame,
    },
    {
      label: `CarbMax ${carbMax?.targetCarbGH ?? 90} g/h`,
      value: carbMax?.intensityPct != null ? `${carbMax.intensityPct}% VO₂max` : "Non atteint",
      sub: carbMax?.intensityPct != null
        ? `${paceMode
            ? kmhToPaceStr((refValue / V_SEUIL_FRACTION) * (carbMax.intensityPct / 100))
            : `${carbMax.power}W`} · repère d’oxydation`
        : "Seuil non franchi dans le modèle",
      css: "bg-warning/10 border-warning/20 text-warning",
      Icon: Zap,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
  vma,
  paceMode: paceModeDefault = false,
  weight,
  staffMode = false,
  className,
}: FatCarbOxidationChartProps) {
  const isMobile = useIsTouchDevice();
  const ftpAvailable = !!(ftp && ftp > 0);
  const vmaAvailable = !!(vma && vma > 0);
  const canToggle = ftpAvailable && vmaAvailable;
  // État interne: l'utilisateur peut basculer Watts ↔ Allure si les 2 références existent
  const initialPace = paceModeDefault ? vmaAvailable : (!ftpAvailable && vmaAvailable);
  const [paceMode, setPaceMode] = useState<boolean>(initialPace);

  const valid = !!(
    vo2max && vlamax && weight && Number.isFinite(weight) && weight > 0 && vo2max > 0 && vlamax > 0 &&
    (paceMode ? vmaAvailable : ftpAvailable)
  );
  // Référence affichée: FTP (W) ou vSeuil (km/h ≈ 88% VMA)
  const refValue = paceMode ? ((vma ?? 0) * V_SEUIL_FRACTION) : (ftp ?? 0);

  const profile = useMemo<MaderProfile | null>(() => {
    if (!valid || vo2max == null || vlamax == null || weight == null) return null;
    return { vo2max, vlamax, weight };
  }, [vo2max, vlamax, weight, valid]);

  const fatMax = useMemo(() => {
    if (!profile) return null;
    return findFatMax(profile);
  }, [profile]);

  const data = useMemo<OxPoint[]>(() => {
    if (!profile || !valid) return [];
    const points: OxPoint[] = [];

    for (let intensity = 20; intensity <= 100; intensity += 1) {
      const efficiency = profile.efficiency ?? 0.23;
      const vo2LMin = (profile.vo2max * profile.weight / 1000) * (intensity / 100);
      const watts = intensityToPowerWatts(intensity, profile.vo2max, profile.weight, efficiency);

      // Allure (km/h) ≈ VMA × intensity/100 (approximation %vVO2max ≈ %VO2max)
      const paceKmh = paceMode && vma ? vma * (intensity / 100) : 0;
      const paceStr = paceMode ? kmhToPaceStr(paceKmh) : "";

      const fatGmin = calculateFatOxidation(intensity, profile.vo2max, profile.vlamax, profile.weight);
      const carbGmin = calculateCarbOxidation(intensity, profile.vo2max, profile.vlamax, profile.weight);

      const fatKcalH = fatGmin * 9 * 60;
      const carbKcalH = carbGmin * 4 * 60;
      const totalKcalH = fatKcalH + carbKcalH;
      const fatPct = totalKcalH > 0 ? (fatKcalH / totalKcalH) * 100 : 0;

      points.push({ intensity, watts, paceKmh, paceStr, fatGmin, carbGmin, fatKcalH, carbKcalH, totalKcalH, fatPct, vo2LMin, efficiency });
    }
    return points;
  }, [vo2max, vlamax, weight, valid, profile, paceMode, vma]);

  const crossoverPct = useMemo(() => {
    const pt = data.find((p) => p.fatPct < 50);
    return pt?.intensity ?? (fatMax?.fatMaxIntensity ?? 60) + 10;
  }, [data, fatMax]);

  // CarbMax — intensité où l'oxydation CHO atteint 90 g/h (plafond d'ingestion usuel).
  const carbMax = useMemo(
    () => (profile ? findCarbMax(profile, 90) : null),
    [profile, valid],
  );

  const TooltipComp = useMemo(() => makeOxidationTooltip(paceMode), [paceMode]);

  if (!valid || !fatMax) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            VO₂max, VLamax, poids et {paceMode ? "VMA" : "FTP"} requis pour le graphique d'oxydation
          </p>
        </CardContent>
      </Card>
    );
  }

  const margins = getResponsiveMargins(isMobile);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 border-b border-border">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Flame className="h-4 w-4 text-warning" />
            Oxydation Lipides / Glucides
            <Badge variant="outline" className="text-[9px] font-normal">Mader Model</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {canToggle && (
              <UnitToggle paceMode={paceMode} onChange={setPaceMode} />
            )}
            <Badge variant="secondary" className="text-[9px] font-mono">VLa {vlamax?.toFixed(2)}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        {/* Key metrics */}
        <OxidationMetrics data={data} fatMax={fatMax} refValue={refValue} paceMode={paceMode} carbMax={carbMax} />

        {/* Chart */}
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ ...margins, left: -10 }}>
              <defs>
                <linearGradient id="fatOxGradM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.03} />
                </linearGradient>
                <linearGradient id="carbOxGradM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0.03} />
                </linearGradient>
              </defs>

              <CartesianGrid {...responsiveGridProps} />

              {/* Crossover zone highlight band (FatMax → Crossover) */}
              <ReferenceArea x1={fatMax.fatMaxIntensity} x2={crossoverPct}
                fill="hsl(var(--primary))" fillOpacity={0.08}
                label={{ value: "Transition", fontSize: 8, fill: "hsl(var(--primary))", position: "insideTop" }} />

              <XAxis dataKey="intensity" {...responsiveAxisProps.xAxis} tickFormatter={(v: number) => `${v}%`} />

              {/* Left axis: g/min */}
              <YAxis yAxisId="gmin" {...responsiveAxisProps.yAxis} domain={[0, "auto"]}
                tickFormatter={(v: number) => v.toFixed(1)} />

              {/* Right axis: kcal/h */}
              <YAxis yAxisId="kcal" orientation="right" {...responsiveAxisProps.yAxis} domain={[0, "auto"]}
                tickFormatter={(v: number) => `${Math.round(v)}`} />

              <Tooltip content={<TooltipComp />} {...mobileTooltipProps} />

              {/* FatMax vertical */}
              <ReferenceLine yAxisId="gmin" x={fatMax.fatMaxIntensity}
                stroke="hsl(var(--success))" strokeWidth={1.5} strokeDasharray="6 3"
                label={{ value: `FatMax ${fatMax.fatMaxIntensity}%`, fontSize: 9, fill: "hsl(var(--success))", position: "top" }} />

              {/* Crossover vertical */}
              <ReferenceLine yAxisId="gmin" x={crossoverPct}
                stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="4 4"
                label={{ value: `Crossover ${crossoverPct}%`, fontSize: 8, fill: "hsl(var(--primary))", position: "top" }} />

              {/* CarbMax vertical — au-delà, dette glucidique (ox. CHO > apport max ~90 g/h) */}
              {carbMax?.intensityPct != null && (
                <ReferenceLine yAxisId="gmin" x={Math.round(carbMax.intensityPct)}
                  stroke="hsl(var(--warning))" strokeWidth={1.5} strokeDasharray="2 3"
                  label={{ value: `CarbMax ${Math.round(carbMax.intensityPct)}%`, fontSize: 8, fill: "hsl(var(--warning))", position: "insideTopRight" }} />
              )}

              {/* Fat oxidation area (g/min) */}
              <Area yAxisId="gmin" type="monotone" dataKey="fatGmin"
                stroke="hsl(var(--success))" strokeWidth={2} fill="url(#fatOxGradM)"
                dot={false} activeDot={{ r: 4, strokeWidth: 2 }} name="Lipides (g/min)" />

              {/* Carb oxidation area (g/min) */}
              <Area yAxisId="gmin" type="monotone" dataKey="carbGmin"
                stroke="hsl(var(--warning))" strokeWidth={2} fill="url(#carbOxGradM)"
                dot={false} activeDot={{ r: 4, strokeWidth: 2 }} name="Glucides (g/min)" />

              {/* kcal/h lines (secondary) */}
              <Line yAxisId="kcal" type="monotone" dataKey="fatKcalH"
                stroke="hsl(var(--success))" strokeWidth={1} strokeDasharray="4 2" dot={false} name="Fat kcal/h" />
              <Line yAxisId="kcal" type="monotone" dataKey="carbKcalH"
                stroke="hsl(var(--warning))" strokeWidth={1} strokeDasharray="4 2" dot={false} name="CHO kcal/h" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            { label: "Lipides (g/min)", color: "hsl(var(--success))", solid: true },
            { label: "Glucides (g/min)", color: "hsl(var(--warning))", solid: true },
            { label: "kcal/h (axe droit)", color: "hsl(var(--muted-foreground))", solid: false },
            { label: "Zone transition", color: "hsl(var(--primary))", solid: false },
          ].map((z) => (
            <div key={z.label} className="flex items-center gap-1">
              <div className={cn("w-3 h-0.5 rounded", !z.solid && "border-b border-dashed")}
                style={{ backgroundColor: z.solid ? z.color : "transparent", borderColor: !z.solid ? z.color : undefined }} />
              <span className="text-[9px] text-muted-foreground">{z.label}</span>
            </div>
          ))}
        </div>

        {/* Insight */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border">
          <ArrowRightLeft className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <div>
            <div className="text-xs font-semibold text-primary">Zone de transition métabolique</div>
            <div className="text-[11px] text-muted-foreground">
              Entre FatMax ({fatMax.fatMaxIntensity}%) et Crossover ({crossoverPct}%), l'athlète bascule
              d'une dominance lipidique vers glucidique. Pic d'oxydation lipidique : {fatMax.fatMaxGrams} g/min.
              Oxydation CHO modélisée @ {paceMode ? "repère théorique 88% VMA" : "FTP"} : ~{Math.round((paceMode
                ? (data.find(p => p.paceKmh >= refValue) ?? data[data.length - 1])
                : (data.find(p => Math.round(p.watts) >= refValue) ?? data[data.length - 1])
              ).carbGmin * 60)} g/h — ce n’est pas une quantité à ingérer.
            </div>
            {carbMax && (
              <div className="text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/40">
                <span className="font-semibold text-warning">CarbMax : </span>
                {carbMax.intensityPct != null ? (
                  <>
                    au-delà de <strong>{carbMax.intensityPct}% VO₂max</strong>
                    {!paceMode && carbMax.power ? ` (~${carbMax.power} W)` : ""}, l'oxydation glucidique
                    dépasse le repère hypothétique de {carbMax.targetCarbGH} g/h ; la tolérance digestive réelle et la réserve disponible restent à documenter. Ce point seul ne valide pas une allure sur épreuve longue.
                  </>
                ) : (
                  <>l'oxydation glucidique reste sous {carbMax.targetCarbGH} g/h sur toute la plage —
                  résultat du modèle, sans preuve de tolérance digestive ni de préparation complète.</>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Staff details */}
        {staffMode && (
          <div className="rounded-lg bg-muted/20 border border-dashed p-3 text-[10px] font-mono text-muted-foreground space-y-1">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-foreground/60 mb-1">
              Modèle d'oxydation Mader — Données techniques
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span>FatMax: {fatMax.fatMaxIntensity}% VO₂max → {paceMode ? kmhToPaceStr((vma ?? 0) * fatMax.fatMaxIntensity / 100) : `${fatMax.fatMaxPower}W`}</span>
              <span>Crossover: {crossoverPct}% VO₂max</span>
              <span>Peak fat ox: {fatMax.fatMaxGrams} g/min</span>
              <span>CHO @ FatMax: {fatMax.carbAtFatMax} g/h</span>
              <span>Rendement vélo hypothétique : 23% · cohérent avec le résumé FatMax</span>
              <span>Modèle: Mader (2003) + Randle cycle + crossover (Brooks 1994)</span>
            </div>
            <p className="text-[9px] opacity-60 pt-1 border-t border-border/30">
              Fat oxidation: bell-curve Mader (peak ∝ VO₂max, inhibition ∝ VLamax via malonyl-CoA).
              Carb = résidu énergétique (VO₂ × 20.9 kJ/L - Fat × 38.9 kJ/g). Efficience mécanique
              fixé à 23%, non mesuré chez cet athlète.
            </p>
          </div>
        )}

        <p className="text-[9px] text-muted-foreground text-center pt-2 border-t">
          Modèle Mader (2003) + crossover concept (Brooks 1994). Rendement vélo hypothétique 23%. Allures course approximatives. Validation par calorimétrie indirecte nécessaire.
        </p>
      </CardContent>
    </Card>
  );
}
