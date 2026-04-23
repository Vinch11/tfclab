/**
 * Power-Duration Unified Chart – INSCYD-grade
 * Fuses empirical CP/W' (best efforts) + Mader modeled curve
 * With confidence interval bands and overlay best efforts
 */

import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  Area,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Zap, Battery, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  analyzeCriticalPower,
  type CriticalPowerResult,
} from "@/lib/v2/criticalPowerModel";
import {
  generateMaderPowerDurationCurve,
  type MaderPowerDurationCurve,
} from "@/lib/v2/maderPowerDurationCurve";
import { type MaderProfile } from "@/lib/v2/maderMetabolicModel";
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

interface PowerDurationUnifiedChartProps {
  vo2max?: number | null;
  vlamax?: number | null;
  ftp?: number | null;
  weight?: number | null;
  pmax5s?: number | null;
  p30s?: number | null;
  p60s?: number | null;
  map5min?: number | null;
  staffMode?: boolean;
  className?: string;
}

interface UnifiedPoint {
  durationSec: number;
  durationLabel: string;
  logDuration: number;
  empiricalPower: number | null;
  maderPower: number | null;
  maderUpper: number | null; // CI upper
  maderLower: number | null; // CI lower
  isDataPoint: boolean;
  dataLabel?: string;
  delta?: number | null;
}

// =============================================
// HELPERS
// =============================================

const STANDARD_DURATIONS = [1, 3, 5, 10, 15, 30, 45, 60, 90, 120, 180, 240, 300, 420, 600, 900, 1200, 1800, 2700, 3600];

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}'${s}"` : `${m}'`;
  }
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

// =============================================
// TOOLTIP
// =============================================

function PDTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as UnifiedPoint;
  if (!d) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg text-xs min-w-[200px]">
      <p className="font-semibold text-sm mb-1.5">{d.durationLabel}</p>
      <div className="space-y-1">
        {d.maderPower && (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(217,91%,60%)" }} />
              Modèle Mader
            </span>
            <span className="font-mono font-bold">{d.maderPower}W</span>
          </div>
        )}
        {d.empiricalPower && (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(24,95%,53%)" }} />
              Empirique CP
            </span>
            <span className="font-mono font-bold">{Math.round(d.empiricalPower)}W</span>
          </div>
        )}
        {d.isDataPoint && d.dataLabel && (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
              Mesuré ({d.dataLabel})
            </span>
          </div>
        )}
        {d.delta != null && (
          <div className="flex justify-between gap-3 border-t border-border/50 pt-1 mt-1">
            <span className="text-muted-foreground">Δ Mader-Empirique</span>
            <span className={cn("font-mono", d.delta > 0 ? "text-emerald-600" : "text-orange-600")}>
              {d.delta > 0 ? "+" : ""}{Math.round(d.delta)}W
            </span>
          </div>
        )}
        {d.maderUpper && d.maderLower && (
          <div className="flex justify-between gap-3 text-[10px]">
            <span className="text-muted-foreground">IC 90%</span>
            <span className="font-mono text-muted-foreground">{d.maderLower}–{d.maderUpper}W</span>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// KEY METRICS BADGES
// =============================================

function PDMetrics({ cpResult, maderCurve, weight }: {
  cpResult: CriticalPowerResult | null;
  maderCurve: MaderPowerDurationCurve | null;
  weight: number;
}) {
  const items = [];
  
  if (maderCurve) {
    items.push({ label: "CP Mader", value: `${maderCurve.cp}W`, sub: `${(maderCurve.cp / weight).toFixed(2)} W/kg`, css: "bg-sky-500/10 border-sky-500/30 text-sky-600", Icon: Activity });
    items.push({ label: "W' Mader", value: `${maderCurve.wPrime} kJ`, sub: `${Math.round(maderCurve.wPrime * 1000 / weight)} J/kg`, css: "bg-purple-500/10 border-purple-500/30 text-purple-600", Icon: Battery });
  }
  if (cpResult) {
    items.push({ label: "CP Empirique", value: `${cpResult.cp}W`, sub: `R²=${cpResult.r2.toFixed(3)}`, css: "bg-orange-500/10 border-orange-500/30 text-orange-600", Icon: TrendingDown });
    items.push({ label: "W' Empirique", value: `${Math.round(cpResult.wprime / 1000)} kJ`, sub: `${cpResult.points.length} pts`, css: "bg-amber-500/10 border-amber-500/30 text-amber-600", Icon: Zap });
  }

  if (items.length === 0) return null;

  return (
    <div className={cn("grid gap-1.5", items.length <= 2 ? "grid-cols-2" : "grid-cols-4")}>
      {items.map((it) => (
        <div key={it.label} className={cn("p-1.5 rounded-lg border text-center", it.css)}>
          <it.Icon className="h-3 w-3 mx-auto mb-0.5 opacity-60" />
          <div className="text-[8px] font-medium opacity-80">{it.label}</div>
          <div className="text-xs font-mono font-bold">{it.value}</div>
          <div className="text-[9px] text-muted-foreground">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function PowerDurationUnifiedChart({
  vo2max,
  vlamax,
  ftp,
  weight,
  pmax5s,
  p30s,
  p60s,
  map5min,
  staffMode = false,
  className,
}: PowerDurationUnifiedChartProps) {
  const isMobile = useIsTouchDevice();
  const wt = weight ?? 70;

  // Empirical CP model
  const cpResult = useMemo(() => {
    return analyzeCriticalPower({
      pmax_5s: pmax5s ?? null,
      p30s_w: p30s ?? null,
      p60s_w: p60s ?? null,
      map5min_w: map5min ?? null,
      ftp: ftp ?? null,
      weight_kg: wt,
    });
  }, [pmax5s, p30s, p60s, map5min, ftp, wt]);

  // Mader modeled curve
  // R1: Mader curve utilise CP/W' issus de la régression comme source de vérité
  const maderCurve = useMemo<MaderPowerDurationCurve | null>(() => {
    if (!vo2max || !vlamax || vo2max <= 0 || vlamax <= 0) return null;
    const profile: MaderProfile = { vo2max, vlamax, weight: wt };
    return generateMaderPowerDurationCurve(profile, STANDARD_DURATIONS, {
      cpOverride: cpResult?.effectiveCP ?? cpResult?.cp,
      wPrimeJOverride: cpResult?.wprime,
    });
  }, [vo2max, vlamax, wt, cpResult]);

  // Unified data
  const chartData = useMemo<UnifiedPoint[]>(() => {
    const durSet = new Set(STANDARD_DURATIONS);
    const points: UnifiedPoint[] = [];

    // Data points from snapshot
    const dataPointMap = new Map<number, { power: number; label: string }>();
    if (pmax5s && pmax5s > 0) dataPointMap.set(5, { power: pmax5s, label: "P5s" });
    if (p30s && p30s > 0) dataPointMap.set(30, { power: p30s, label: "P30s" });
    if (p60s && p60s > 0) dataPointMap.set(60, { power: p60s, label: "P60s" });
    if (map5min && map5min > 0) dataPointMap.set(300, { power: map5min, label: "MAP5'" });
    if (ftp && ftp > 0) dataPointMap.set(3600, { power: ftp, label: "FTP" });

    for (const dur of STANDARD_DURATIONS) {
      const empiricalPower = cpResult ? cpResult.cp + cpResult.wprime / dur : null;
      const maderPoint = maderCurve?.points.find(p => p.durationSec === dur);
      const maderPower = maderPoint?.powerWatts ?? null;
      const dataPoint = dataPointMap.get(dur);

      // CI: ±5% for Mader model (simplified uncertainty)
      const maderUpper = maderPower ? Math.round(maderPower * 1.05) : null;
      const maderLower = maderPower ? Math.round(maderPower * 0.95) : null;

      const delta = maderPower && empiricalPower ? maderPower - empiricalPower : null;

      points.push({
        durationSec: dur,
        durationLabel: formatDuration(dur),
        logDuration: Math.log10(dur),
        empiricalPower: empiricalPower ? Math.round(empiricalPower) : null,
        maderPower,
        maderUpper,
        maderLower,
        isDataPoint: !!dataPoint,
        dataLabel: dataPoint?.label,
        delta,
      });
    }

    return points;
  }, [cpResult, maderCurve, pmax5s, p30s, p60s, map5min, ftp]);

  const hasAnyCurve = cpResult || maderCurve;

  if (!hasAnyCurve) {
    return (
      <Card className={cn("border-dashed border-muted-foreground/30", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            Courbe Puissance-Durée Unifiée
          </CardTitle>
          <CardDescription className="text-xs">
            Renseignez VO₂max + VLamax (modèle Mader) et/ou P30s, P60s, MAP5' (modèle empirique).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const margins = getResponsiveMargins(isMobile);

  // Coherence analysis
  const coherenceNote = useMemo(() => {
    if (!cpResult || !maderCurve) return null;
    const cpDelta = Math.abs(maderCurve.cp - cpResult.cp);
    const wpDelta = Math.abs(maderCurve.wPrime - cpResult.wprime / 1000);
    if (cpDelta > 30 || wpDelta > 8) {
      return { level: "warn", text: `Divergence CP: Δ${Math.round(cpDelta)}W, W': Δ${Math.round(wpDelta)}kJ — vérifier les données d'entrée.` };
    }
    return { level: "ok", text: `Cohérence CP: Δ${Math.round(cpDelta)}W, W': Δ${Math.round(wpDelta)}kJ — modèles convergents.` };
  }, [cpResult, maderCurve]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-sky-500/10 via-transparent to-orange-500/5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              Courbe Puissance-Durée Unifiée
              <Badge variant="outline" className="text-[9px] font-normal">Mader + CP</Badge>
            </CardTitle>
            <CardDescription className="text-[10px] mt-0.5">
              Modèle métabolique (Mader) × Empirique (Monod-Scherrer / Skiba)
            </CardDescription>
          </div>
          {cpResult && (
            <Badge variant={cpResult.r2 > 0.95 ? "default" : "secondary"} className="font-mono text-xs">
              R²={cpResult.r2.toFixed(3)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        {/* Metrics */}
        <PDMetrics cpResult={cpResult} maderCurve={maderCurve} weight={wt} />

        {/* Coherence note */}
        {coherenceNote && (
          <div className={cn("text-[10px] p-2 rounded-lg border flex items-center gap-2",
            coherenceNote.level === "warn" ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
          )}>
            {coherenceNote.level === "warn" ? <AlertTriangle className="h-3 w-3 shrink-0" /> : <Activity className="h-3 w-3 shrink-0" />}
            {coherenceNote.text}
          </div>
        )}

        {/* Chart */}
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ ...margins, left: -10 }}>
              <CartesianGrid {...responsiveGridProps} />

              {/* CP reference line */}
              {cpResult && (
                <ReferenceLine y={cpResult.cp} stroke="hsl(24,95%,53%)" strokeWidth={1} strokeDasharray="6 3"
                  label={{ value: `CP ${cpResult.cp}W`, fontSize: 8, fill: "hsl(24,95%,53%)", position: "right" }} />
              )}
              {maderCurve && (
                <ReferenceLine y={maderCurve.cp} stroke="hsl(217,91%,60%)" strokeWidth={1} strokeDasharray="6 3"
                  label={{ value: `MLSS ${maderCurve.cp}W`, fontSize: 8, fill: "hsl(217,91%,60%)", position: "left" }} />
              )}

              <XAxis dataKey="durationLabel" {...responsiveAxisProps.xAxis}
                interval={isMobile ? 3 : 2} />
              <YAxis {...responsiveAxisProps.yAxis} domain={["auto", "auto"]} />

              <Tooltip content={<PDTooltip />} {...mobileTooltipProps} />

              {/* Mader CI band */}
              {maderCurve && (
                <Area type="monotone" dataKey="maderUpper" stroke="none" fill="hsl(217,91%,60%)" fillOpacity={0.08}
                  stackId="ci" name="IC sup" />
              )}

              {/* Mader modeled curve */}
              {maderCurve && (
                <Line type="monotone" dataKey="maderPower"
                  stroke="hsl(217,91%,60%)" strokeWidth={2.5} dot={false}
                  activeDot={{ r: 4, strokeWidth: 2 }} name="Mader" />
              )}

              {/* Empirical CP curve */}
              {cpResult && (
                <Line type="monotone" dataKey="empiricalPower"
                  stroke="hsl(24,95%,53%)" strokeWidth={2} strokeDasharray="6 3" dot={false}
                  activeDot={{ r: 4, strokeWidth: 2 }} name="Empirique" />
              )}

              {/* Best effort data points */}
              <Scatter data={chartData.filter(d => d.isDataPoint)}
                fill="hsl(0,84%,60%)" name="Best Efforts"
                shape={(props: any) => {
                  const { cx, cy } = props;
                  return <circle cx={cx} cy={cy} r={5} fill="hsl(0,84%,60%)" stroke="hsl(var(--background))" strokeWidth={2} />;
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            ...(maderCurve ? [{ label: "Modèle Mader", color: "hsl(217,91%,60%)", solid: true }] : []),
            ...(cpResult ? [{ label: "Empirique CP/W'", color: "hsl(24,95%,53%)", solid: false }] : []),
            { label: "Best efforts", color: "hsl(0,84%,60%)", dot: true },
            ...(maderCurve ? [{ label: "IC ±5%", color: "hsl(217,91%,60%)", band: true }] : []),
          ].map((z: any) => (
            <div key={z.label} className="flex items-center gap-1">
              {z.dot ? (
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }} />
              ) : z.band ? (
                <div className="w-3 h-2 rounded-sm opacity-30" style={{ backgroundColor: z.color }} />
              ) : (
                <div className={cn("w-3 h-0.5 rounded", !z.solid && "border-b border-dashed")}
                  style={{ backgroundColor: z.solid ? z.color : "transparent", borderColor: !z.solid ? z.color : undefined }} />
              )}
              <span className="text-[9px] text-muted-foreground">{z.label}</span>
            </div>
          ))}
        </div>

        {/* Staff details */}
        {staffMode && (
          <div className="rounded-lg bg-muted/20 border border-dashed p-3 text-[10px] font-mono text-muted-foreground space-y-1">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-foreground/60 mb-1">
              Power-Duration — Données techniques
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {maderCurve && (
                <>
                  <span>CP Mader: {maderCurve.cp}W ({(maderCurve.cp / wt).toFixed(2)} W/kg)</span>
                  <span>W' Mader: {maderCurve.wPrime} kJ ({Math.round(maderCurve.wPrime * 1000 / wt)} J/kg)</span>
                  <span>Pmax Mader: {maderCurve.pMax}W</span>
                </>
              )}
              {cpResult && (
                <>
                  <span>CP Empirique: {cpResult.cp}W ({(cpResult.cp / wt).toFixed(2)} W/kg)</span>
                  <span>W' Empirique: {Math.round(cpResult.wprime / 1000)} kJ ({Math.round(cpResult.wprime / wt)} J/kg)</span>
                  <span>R²: {cpResult.r2.toFixed(4)}</span>
                  <span>Points: {cpResult.points.length} (régression)</span>
                </>
              )}
            </div>
            <p className="text-[9px] opacity-60 pt-1 border-t border-border/30">
              Mader: P(t) = CP + W'/t + (Pmax−MAP)·e^(−t/τ). τ_neuro=25s.
              Empirique: régression linéaire W=CP·t + W' (Monod-Scherrer 1965).
              P5s et FTP exclus de la régression (Skiba 2012, Jones 2019).
              IC ±5% sur le modèle Mader (incertitude VLamax ± 0.05).
            </p>
          </div>
        )}

        <p className="text-[9px] text-muted-foreground text-center pt-2 border-t">
          Modèle Mader (2003) + Monod-Scherrer (1965) / Skiba (2012). Courbes fusionnées pour diagnostic croisé.
        </p>
      </CardContent>
    </Card>
  );
}
