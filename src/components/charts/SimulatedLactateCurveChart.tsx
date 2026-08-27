/**
 * Simulated Lactate Curve – INSCYD-grade Mader-Heck Model
 * Full refonte: paliers discrets, overlay VO₂, zones colorées, efficience variable
 * Uses maderMetabolicModel.ts for physiological accuracy
 */

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  Scatter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, TrendingUp, Activity, Zap, Droplets, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  findSteadyStateLactate,
  findLactateThresholds,
  findFatMax,
  findMLSSPower,
  calculateFatOxidation,
  calculateCarbOxidation,
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

interface SimulatedLactateCurveChartProps {
  vo2max: number | null;
  vlamax: number | null;
  ftp: number | null;
  weight?: number;
  staffMode?: boolean;
  className?: string;
}

interface CurvePoint {
  intensity: number;
  watts: number;
  lactate: number;
  vo2LMin: number;
  fatGmin: number;
  carbGmin: number;
  fatPct: number;
  zone: string;
  zoneColor: string;
  isPalier: boolean;
}

// =============================================
// ZONE DEFINITIONS (Mader-derived)
// =============================================

function getZoneInfo(lactate: number, intensity: number, lt1Pct: number, lt2Pct: number): { zone: string; color: string } {
  if (intensity < lt1Pct * 0.85) return { zone: "Z1 Récupération", color: "hsl(217, 91%, 60%)" };
  if (intensity < lt1Pct) return { zone: "Z2 Endurance", color: "hsl(142, 71%, 45%)" };
  if (intensity < (lt1Pct + lt2Pct) / 2) return { zone: "Z3 Tempo", color: "hsl(45, 93%, 47%)" };
  if (intensity < lt2Pct) return { zone: "Z4 Sweet Spot", color: "hsl(30, 95%, 50%)" };
  if (intensity < lt2Pct * 1.05) return { zone: "Z5 Seuil", color: "hsl(0, 84%, 60%)" };
  if (intensity < 100) return { zone: "Z6 VO₂max", color: "hsl(280, 87%, 60%)" };
  return { zone: "Z7 Anaérobie", color: "hsl(320, 80%, 55%)" };
}

// =============================================
// TOOLTIP
// =============================================

function LactateTooltip({ active, payload, staffMode }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as CurvePoint;
  if (!d) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg text-xs min-w-[200px]">
      <div className="w-full h-1 rounded-full mb-2" style={{ backgroundColor: d.zoneColor }} />
      <div className="flex justify-between items-center mb-1.5">
        <span className="font-semibold text-[11px]">{d.zone}</span>
        {d.isPalier && (
          <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">PALIER</span>
        )}
      </div>
      <div className="space-y-0.5 text-[10px]">
        <Row label="Intensité" value={`${d.intensity}% VO₂max`} />
        <Row label="Puissance" value={`${Math.round(d.watts)}W`} />
        <Row label="[La] ss" value={`${d.lactate.toFixed(1)} mmol/L`} bold color={d.zoneColor} />
        <div className="border-t border-border/50 my-1" />
        <Row label="VO₂" value={`${d.vo2LMin.toFixed(2)} L/min`} />
        <Row label="Lipides" value={`${d.fatGmin.toFixed(2)} g/min`} />
        <Row label="Glucides" value={`${d.carbGmin.toFixed(2)} g/min`} />
        <Row label="% Lipides" value={`${Math.round(d.fatPct)}%`} />
      </div>
    </div>
  );
}

function Row({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-mono", bold && "font-bold")} style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

// =============================================
// THRESHOLD BADGES
// =============================================

function ThresholdBadges({ lt1: { lt1Intensity, lt1Power }, lt2: { lt2Intensity, lt2Power }, fatMax, mlss }: {
  lt1: { lt1Intensity: number; lt1Power: number };
  lt2: { lt2Intensity: number; lt2Power: number };
  fatMax: { fatMaxIntensity: number; fatMaxPower: number; fatMaxGrams: number };
  mlss: number;
}) {
  const items = [
    { label: "FatMax", pct: fatMax.fatMaxIntensity, watts: fatMax.fatMaxPower, sub: `${fatMax.fatMaxGrams} g/min`, css: "bg-sky-500/10 border-sky-500/30 text-sky-600", Icon: Droplets },
    { label: "LT1 (2 mmol)", pct: lt1Intensity, watts: lt1Power, sub: "Seuil aérobie", css: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600", Icon: Activity },
    { label: "LT2 (4 mmol)", pct: lt2Intensity, watts: lt2Power, sub: "Seuil lactique", css: "bg-orange-500/10 border-orange-500/30 text-orange-600", Icon: Zap },
    { label: "MLSS", pct: null, watts: mlss, sub: "Steady-state max", css: "bg-red-500/10 border-red-500/30 text-red-600", Icon: TrendingUp },
  ];

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {items.map((it) => (
        <div key={it.label} className={cn("p-1.5 rounded-lg border text-center", it.css)}>
          <it.Icon className="h-3 w-3 mx-auto mb-0.5 opacity-60" />
          <div className="text-[8px] font-medium opacity-80">{it.label}</div>
          <div className="text-xs font-mono font-bold">{it.watts}W</div>
          {it.pct && <div className="text-[9px] text-muted-foreground">{it.pct}%</div>}
          <div className="text-[8px] text-muted-foreground">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}

// =============================================
// METABOLIC INSIGHT
// =============================================

function MetabolicInsight({ vlamax, lt1Pct, lt2Pct, fatMaxPct }: { vlamax: number; lt1Pct: number; lt2Pct: number; fatMaxPct: number }) {
  const gap = lt2Pct - lt1Pct;
  const insight = vlamax < 0.35
    ? { title: "Profil Endurance", desc: `VLamax basse → seuils élevés (LT1 ${lt1Pct}%, LT2 ${lt2Pct}%). FatMax à ${fatMaxPct}%. Excellente efficacité lipidique — profil Ironman/Ultra.`, Icon: Activity, color: "text-emerald-600" }
    : vlamax > 0.55
      ? { title: "Profil Glycolytique", desc: `VLamax élevée → seuils compressés (écart ${gap}%). FatMax bas (${fatMaxPct}%). Priorité : volume Z2 pour abaisser VLamax et repousser les seuils.`, Icon: Zap, color: "text-orange-600" }
      : { title: "Profil Équilibré", desc: `Écart LT1-LT2 de ${gap}% — FatMax à ${fatMaxPct}%. Marge de progression au tempo et sweet-spot pour compresser l'écart.`, Icon: TrendingUp, color: "text-sky-600" };

  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border">
      <insight.Icon className={cn("h-4 w-4 mt-0.5 shrink-0", insight.color)} />
      <div>
        <div className={cn("text-xs font-semibold", insight.color)}>{insight.title}</div>
        <div className="text-[11px] text-muted-foreground">{insight.desc}</div>
      </div>
    </div>
  );
}

// =============================================
// STAFF DATA BLOCK
// =============================================

function StaffDataBlock({ profile, lt1, lt2, fatMax, mlss }: {
  profile: MaderProfile;
  lt1: { lt1Intensity: number; lt1Power: number };
  lt2: { lt2Intensity: number; lt2Power: number };
  fatMax: { fatMaxIntensity: number; fatMaxPower: number; fatMaxGrams: number; carbAtFatMax: number };
  mlss: number;
}) {
  const efficiency = profile.efficiency ?? 0.23;
  return (
    <div className="rounded-lg bg-muted/20 border border-dashed p-3 space-y-1.5 text-[10px] font-mono text-muted-foreground">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-foreground/60 mb-1">
        Modèle Mader-Heck — Données techniques
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span>VO₂max: {profile.vo2max} ml/kg/min</span>
        <span>VLamax: {profile.vlamax.toFixed(3)} mmol/L/s</span>
        <span>Poids: {profile.weight} kg</span>
        <span>Efficience: {(efficiency * 100).toFixed(0)}%</span>
        <span>LT1: {lt1.lt1Intensity}% → {lt1.lt1Power}W (≈2 mmol/L)</span>
        <span>LT2: {lt2.lt2Intensity}% → {lt2.lt2Power}W (≈4 mmol/L)</span>
        <span>FatMax: {fatMax.fatMaxIntensity}% → {fatMax.fatMaxPower}W ({fatMax.fatMaxGrams} g/min)</span>
        <span>CHO @ FatMax: {fatMax.carbAtFatMax} g/h</span>
        <span>MLSS: {mlss}W</span>
        <span>Écart LT1→LT2: {lt2.lt2Intensity - lt1.lt1Intensity}%</span>
      </div>
      <p className="text-[9px] opacity-60 pt-1 border-t border-border/30">
        Modèle Mader (2003) / Heck & Schulz (2002). Production glycolytique : Michaelis-Menten (Km=55%, Hill n=2.5).
        Clairance : MCT kinetics (Km=3mmol) + VO₂max-dépendante. MLSS analytique : α=3.0 calibré INSCYD.
        Efficience mécanique variable {(efficiency * 100).toFixed(0)}%. Valider par test lactate step (4 min/palier).
      </p>
    </div>
  );
}

// =============================================
// PALIER TABLE (Lab-style step test view)
// =============================================

function PalierTable({ data, lt1Pct, lt2Pct }: { data: CurvePoint[]; lt1Pct: number; lt2Pct: number }) {
  // Show every 5% as a "palier" (step)
  const paliers = data.filter(d => d.isPalier);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-1 px-1.5 font-medium text-muted-foreground">%VO₂max</th>
            <th className="text-right py-1 px-1.5 font-medium text-muted-foreground">Watts</th>
            <th className="text-right py-1 px-1.5 font-medium text-muted-foreground">[La] mmol/L</th>
            <th className="text-right py-1 px-1.5 font-medium text-muted-foreground">Fat g/min</th>
            <th className="text-right py-1 px-1.5 font-medium text-muted-foreground">CHO g/min</th>
            <th className="text-left py-1 px-1.5 font-medium text-muted-foreground">Zone</th>
          </tr>
        </thead>
        <tbody>
          {paliers.map((p) => {
            const isLT1 = Math.abs(p.intensity - lt1Pct) <= 3;
            const isLT2 = Math.abs(p.intensity - lt2Pct) <= 3;
            return (
              <tr key={p.intensity}
                className={cn(
                  "border-b border-border/20 font-mono",
                  isLT1 && "bg-emerald-500/10",
                  isLT2 && "bg-orange-500/10"
                )}
              >
                <td className="py-1 px-1.5 font-semibold">{p.intensity}%</td>
                <td className="text-right py-1 px-1.5">{Math.round(p.watts)}W</td>
                <td className="text-right py-1 px-1.5 font-bold" style={{ color: p.zoneColor }}>
                  {p.lactate.toFixed(1)}
                  {isLT1 && <span className="ml-1 text-emerald-600 text-[8px]">LT1</span>}
                  {isLT2 && <span className="ml-1 text-orange-600 text-[8px]">LT2</span>}
                </td>
                <td className="text-right py-1 px-1.5 text-emerald-600">{p.fatGmin.toFixed(2)}</td>
                <td className="text-right py-1 px-1.5 text-orange-600">{p.carbGmin.toFixed(2)}</td>
                <td className="py-1 px-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: p.zoneColor }} />
                  <span className="text-[9px]">{p.zone}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
  const isMobile = useIsTouchDevice();
  const [activeTab, setActiveTab] = useState("curve");

  const valid = vo2max && vlamax && ftp && vo2max > 0 && vlamax > 0 && ftp > 0;

  const profile = useMemo<MaderProfile | null>(() => {
    if (!valid) return null;
    return { vo2max: vo2max!, vlamax: vlamax!, weight };
  }, [vo2max, vlamax, weight, valid]);

  // Compute thresholds using Mader model
  const thresholds = useMemo(() => {
    if (!profile) return null;
    const lt = findLactateThresholds(profile);
    const fm = findFatMax(profile);
    const mlss = findMLSSPower(profile);
    return { lt, fm, mlss };
  }, [profile]);

  // Generate curve data with 2% resolution + palier markers every 5%
  const chartData = useMemo<CurvePoint[]>(() => {
    if (!profile || !thresholds) return [];
    const { vo2max, vlamax, weight } = profile;
    const efficiency = profile.efficiency ?? 0.23;
    const points: CurvePoint[] = [];

    for (let intensity = 25; intensity <= 110; intensity += 2) {
      const lactate = findSteadyStateLactate(intensity, vo2max, vlamax, weight);
      const vo2LMin = (vo2max * weight / 1000) * (intensity / 100);
      const energyKJPerMin = vo2LMin * 20.9;
      const watts = (energyKJPerMin * 1000 / 60) * efficiency;
      const fatGmin = calculateFatOxidation(intensity, vo2max, vlamax, weight);
      const carbGmin = calculateCarbOxidation(intensity, vo2max, vlamax, weight);
      const fatKcal = fatGmin * 38.9;
      const totalKcal = energyKJPerMin;
      const fatPct = totalKcal > 0 ? (fatKcal / totalKcal) * 100 : 0;

      const { zone, color } = getZoneInfo(lactate, intensity, thresholds.lt.lt1Intensity, thresholds.lt.lt2Intensity);

      points.push({
        intensity,
        watts,
        lactate: Math.min(20, lactate),
        vo2LMin,
        fatGmin,
        carbGmin,
        fatPct: Math.min(100, Math.max(0, fatPct)),
        zone,
        zoneColor: color,
        isPalier: intensity % 5 === 0,
      });
    }
    return points;
  }, [profile, thresholds]);

  if (!valid || !thresholds || !profile) {
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

  const { lt, fm, mlss } = thresholds;
  const margins = getResponsiveMargins(isMobile);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-orange-500/10 via-transparent to-emerald-500/5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            Courbe de Lactate Simulée
            <Badge variant="outline" className="text-[9px] font-normal">Mader-Heck</Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Badge variant="secondary" className="text-[9px] font-mono">VLa {vlamax!.toFixed(2)}</Badge>
            <Badge variant="secondary" className="text-[9px] font-mono">VO₂ {vo2max}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        {/* Threshold badges */}
        <ThresholdBadges
          lt1={{ lt1Intensity: lt.lt1Intensity, lt1Power: lt.lt1Power }}
          lt2={{ lt2Intensity: lt.lt2Intensity, lt2Power: lt.lt2Power }}
          fatMax={fm}
          mlss={mlss}
        />

        {/* Tabs: Curve vs Paliers */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 h-7">
            <TabsTrigger value="curve" className="text-[10px] h-6"><TrendingUp className="h-3 w-3 mr-1" />Courbe</TabsTrigger>
            <TabsTrigger value="paliers" className="text-[10px] h-6"><BarChart3 className="h-3 w-3 mr-1" />Paliers</TabsTrigger>
          </TabsList>

          <TabsContent value="curve" className="mt-2">
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ ...margins, left: -10 }}>
                  <defs>
                    <linearGradient id="lacGradINSCYD" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(24,95%,53%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(24,95%,53%)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="vo2Grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217,91%,60%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(217,91%,60%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid {...responsiveGridProps} />

                  {/* Zone backgrounds */}
                  <ReferenceArea x1={25} x2={lt.lt1Intensity} fill="hsl(142,71%,45%)" fillOpacity={0.05} />
                  <ReferenceArea x1={lt.lt1Intensity} x2={lt.lt2Intensity} fill="hsl(45,93%,47%)" fillOpacity={0.06} />
                  <ReferenceArea x1={lt.lt2Intensity} x2={100} fill="hsl(0,84%,60%)" fillOpacity={0.06} />
                  {chartData.some(d => d.intensity > 100) && (
                    <ReferenceArea x1={100} x2={110} fill="hsl(280,87%,60%)" fillOpacity={0.05} />
                  )}

                  <XAxis dataKey="intensity" {...responsiveAxisProps.xAxis} tickFormatter={(v: number) => `${v}%`} />
                  <YAxis yAxisId="lactate" {...responsiveAxisProps.yAxis} domain={[0, 16]} tickFormatter={(v: number) => `${v}`} />

                  {/* VO₂ overlay axis */}
                  <YAxis yAxisId="vo2" orientation="right" {...responsiveAxisProps.yAxis} domain={[0, "auto"]} tickFormatter={(v: number) => `${v.toFixed(1)}`} />

                  <Tooltip content={<LactateTooltip staffMode={staffMode} />} {...mobileTooltipProps} />

                  {/* LT1 / LT2 / FatMax / MLSS reference lines */}
                  <ReferenceLine yAxisId="lactate" y={2} stroke="hsl(142,71%,45%)" strokeWidth={1.5} strokeDasharray="6 3"
                    label={{ value: "LT1 2mmol", fontSize: 8, fill: "hsl(142,71%,45%)", position: "right" }} />
                  <ReferenceLine yAxisId="lactate" y={4} stroke="hsl(24,95%,53%)" strokeWidth={1.5} strokeDasharray="6 3"
                    label={{ value: "LT2 4mmol", fontSize: 8, fill: "hsl(24,95%,53%)", position: "right" }} />
                  <ReferenceLine yAxisId="lactate" x={fm.fatMaxIntensity} stroke="hsl(217,91%,60%)" strokeWidth={1} strokeDasharray="4 4"
                    label={{ value: "FatMax", fontSize: 8, fill: "hsl(217,91%,60%)", position: "top" }} />

                  {/* VO₂ consumption curve (overlay) */}
                  <Area yAxisId="vo2" type="monotone" dataKey="vo2LMin" stroke="hsl(217,91%,60%)" strokeWidth={1.5}
                    fill="url(#vo2Grad)" dot={false} strokeDasharray="4 2" name="VO₂" />

                  {/* Main lactate curve */}
                  <Area yAxisId="lactate" type="monotone" dataKey="lactate" stroke="hsl(24,95%,53%)" strokeWidth={2.5}
                    fill="url(#lacGradINSCYD)" dot={false} activeDot={{ r: 4, strokeWidth: 2 }} name="Lactate" />

                  {/* Palier dots (discrete step points) */}
                  <Scatter yAxisId="lactate" dataKey="lactate" data={chartData.filter(d => d.isPalier)}
                    fill="hsl(24,95%,53%)" stroke="hsl(var(--background))" strokeWidth={2} r={4} name="Paliers"
                    shape={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!payload?.isPalier) return null;
                      return <circle cx={cx} cy={cy} r={3.5} fill="hsl(24,95%,53%)" stroke="hsl(var(--background))" strokeWidth={2} />;
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="paliers" className="mt-2">
            <PalierTable data={chartData} lt1Pct={lt.lt1Intensity} lt2Pct={lt.lt2Intensity} />
          </TabsContent>
        </Tabs>

        {/* Zone legend */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            { label: "< LT1 (Z1-Z2)", color: "hsl(142,71%,45%)" },
            { label: "LT1→LT2 (Z3-Z4)", color: "hsl(45,93%,47%)" },
            { label: "> LT2 (Z5+)", color: "hsl(0,84%,60%)" },
            { label: "VO₂ (L/min)", color: "hsl(217,91%,60%)", dashed: true },
          ].map((z) => (
            <div key={z.label} className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", z.dashed && "border border-current")}
                style={{ backgroundColor: z.dashed ? "transparent" : z.color, borderColor: z.dashed ? z.color : undefined }} />
              <span className="text-[9px] text-muted-foreground">{z.label}</span>
            </div>
          ))}
        </div>

        {/* Metabolic insight */}
        <MetabolicInsight vlamax={vlamax!} lt1Pct={lt.lt1Intensity} lt2Pct={lt.lt2Intensity} fatMaxPct={fm.fatMaxIntensity} />

        {/* Staff block */}
        {staffMode && <StaffDataBlock profile={profile} lt1={lt} lt2={lt} fatMax={fm} mlss={mlss} />}

        <p className="text-[9px] text-muted-foreground text-center pt-2 border-t">
          Courbe reconstruite — Modèle Mader (2003) / Heck & Schulz (2002). Michaelis-Menten + MCT kinetics. Non-invasif.
        </p>
      </CardContent>
    </Card>
  );
}
