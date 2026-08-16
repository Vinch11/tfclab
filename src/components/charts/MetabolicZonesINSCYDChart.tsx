/**
 * Metabolic Zones INSCYD-derived Chart
 * Auto-derived zones from Mader model (LT1/LT2/FatMax)
 * With per-zone metabolic data: g/min fat, g/min CHO, [La] ss
 * Stacked bar visualization
 */

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, BarChart3, Flame, Droplets, Activity, Zap, TableIcon } from "lucide-react";
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
import { deriveTrainingZones } from "@/lib/zones/deriveTrainingZones";
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

interface MetabolicZonesINSCYDChartProps {
  vo2max: number | null;
  vlamax: number | null;
  ftp: number | null;
  weight?: number;
  staffMode?: boolean;
  className?: string;
  /**
   * Audit 2B F10 — sport-aware gating.
   * findMLSSPower / Mader α=1.98 ont été calibrés exclusivement sur cyclistes labo
   * (mem://logic/mader-alpha-calibration-n44). Pour sport=cap, ce chart affiche
   * un placeholder au lieu de plaquer une MLSS bike sur un coureur.
   */
  sport?: "velo" | "cap" | "triathlon";
}

interface MaderZone {
  id: string;
  label: string;
  intensityMin: number;
  intensityMax: number;
  wattsMin: number;
  wattsMax: number;
  midLactate: number;
  midFatGmin: number;
  midCarbGmin: number;
  fatKcalH: number;
  carbKcalH: number;
  totalKcalH: number;
  fatPct: number;
  color: string;
  bgColor: string;
  description: string;
  metabolicEffect: string;
}

// =============================================
// ZONE COLORS (HSL for consistency)
// =============================================

const ZONE_COLORS = [
  { color: "hsl(217, 91%, 60%)", bg: "hsl(217, 91%, 60%)" },  // Z1
  { color: "hsl(142, 71%, 45%)", bg: "hsl(142, 71%, 45%)" },  // Z2
  { color: "hsl(45, 93%, 47%)", bg: "hsl(45, 93%, 47%)" },    // Z3
  { color: "hsl(30, 95%, 50%)", bg: "hsl(30, 95%, 50%)" },    // Z4
  { color: "hsl(0, 84%, 60%)", bg: "hsl(0, 84%, 60%)" },      // Z5
  { color: "hsl(280, 87%, 60%)", bg: "hsl(280, 87%, 60%)" },  // Z6
];

// =============================================
// TOOLTIP
// =============================================

function ZoneTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as MaderZone;
  if (!d) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg text-[10px] min-w-[200px]">
      <div className="w-full h-1 rounded-full mb-2" style={{ backgroundColor: d.color }} />
      <p className="font-semibold text-xs mb-1">{d.label}</p>
      <p className="text-[9px] text-muted-foreground mb-2">{d.description}</p>
      <div className="space-y-0.5 font-mono">
        <div className="flex justify-between"><span className="text-muted-foreground">Intensité</span><span>{d.intensityMin}–{d.intensityMax}% VO₂max</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Puissance</span><span>{d.wattsMin}–{d.wattsMax}W</span></div>
        <div className="border-t border-border/50 my-1" />
        <div className="flex justify-between"><span className="text-muted-foreground">[La] ss</span><span className="font-bold" style={{ color: d.color }}>{d.midLactate.toFixed(1)} mmol/L</span></div>
        <div className="flex justify-between"><span className="text-emerald-600">Lipides</span><span>{d.midFatGmin.toFixed(2)} g/min</span></div>
        <div className="flex justify-between"><span className="text-orange-600">Glucides</span><span>{d.midCarbGmin.toFixed(2)} g/min</span></div>
        <div className="border-t border-border/50 my-1" />
        <div className="flex justify-between"><span className="text-muted-foreground">Fat kcal/h</span><span>{Math.round(d.fatKcalH)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">CHO kcal/h</span><span>{Math.round(d.carbKcalH)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">% Lipides</span><span>{Math.round(d.fatPct)}%</span></div>
      </div>
    </div>
  );
}

// =============================================
// TABLE VIEW
// =============================================

function ZonesTable({ zones }: { zones: MaderZone[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-1.5 px-1 font-medium text-muted-foreground">Zone</th>
            <th className="text-right py-1.5 px-1 font-medium text-muted-foreground">% VO₂max</th>
            <th className="text-right py-1.5 px-1 font-medium text-muted-foreground">Watts</th>
            <th className="text-right py-1.5 px-1 font-medium text-muted-foreground">[La] mmol</th>
            <th className="text-right py-1.5 px-1 font-medium text-muted-foreground">Fat g/min</th>
            <th className="text-right py-1.5 px-1 font-medium text-muted-foreground">CHO g/min</th>
            <th className="text-right py-1.5 px-1 font-medium text-muted-foreground">% Fat</th>
            <th className="text-left py-1.5 px-1 font-medium text-muted-foreground">Effet</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((z) => (
            <tr key={z.id} className="border-b border-border/20 font-mono">
              <td className="py-1.5 px-1">
                <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: z.color }} />
                <span className="font-semibold text-[9px]">{z.id}</span>
              </td>
              <td className="text-right py-1.5 px-1">{z.intensityMin}–{z.intensityMax}%</td>
              <td className="text-right py-1.5 px-1 font-semibold">{z.wattsMin}–{z.wattsMax}W</td>
              <td className="text-right py-1.5 px-1 font-bold" style={{ color: z.color }}>{z.midLactate.toFixed(1)}</td>
              <td className="text-right py-1.5 px-1 text-emerald-600">{z.midFatGmin.toFixed(2)}</td>
              <td className="text-right py-1.5 px-1 text-orange-600">{z.midCarbGmin.toFixed(2)}</td>
              <td className="text-right py-1.5 px-1">{Math.round(z.fatPct)}%</td>
              <td className="py-1.5 px-1 text-[9px] text-muted-foreground max-w-[100px] truncate">{z.metabolicEffect}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function MetabolicZonesINSCYDChart({
  vo2max,
  vlamax,
  ftp,
  weight = 70,
  staffMode = false,
  className,
  sport,
}: MetabolicZonesINSCYDChartProps) {
  const isMobile = useIsTouchDevice();
  const [activeTab, setActiveTab] = useState("bars");
  // Audit 2B F10 — bike-only chart (zones dérivées de la MLSS Mader bike)
  const isCap = sport === "cap";
  const valid = !isCap && vo2max && vlamax && ftp && vo2max > 0 && vlamax > 0 && ftp > 0;

  if (isCap) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Zones métaboliques INSCYD
          </CardTitle>
        </CardHeader>
        <CardContent className="text-[11px] text-muted-foreground flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
          <span>
            Chart bike-only (Mader α=1.98 calibré cyclistes labo). Pour la course à pied,
            consulter le profil running et le Modèle C run dédié.
          </span>
        </CardContent>
      </Card>
    );
  }

  const profile = useMemo<MaderProfile | null>(() => {
    if (!valid) return null;
    return { vo2max: vo2max!, vlamax: vlamax!, weight };
  }, [vo2max, vlamax, weight, valid]);

  // Compute Mader thresholds
  const thresholds = useMemo(() => {
    if (!profile) return null;
    const lt = findLactateThresholds(profile);
    const fm = findFatMax(profile);
    const mlss = findMLSSPower(profile);
    return { lt, fm, mlss };
  }, [profile]);

  // Generate Mader-derived zones
  const zones = useMemo<MaderZone[]>(() => {
    if (!profile || !thresholds || !ftp) return [];
    const ftpRef = ftp;
    const { vo2max, vlamax, weight } = profile;
    const efficiency = profile.efficiency ?? 0.23;
    const { lt, fm } = thresholds;

    const intensityToPower = (intensity: number): number => {
      const vo2LMin = (vo2max * weight / 1000) * (intensity / 100);
      return Math.round((vo2LMin * 20.9 * 1000 / 60) * efficiency);
    };

    const getZoneData = (midPct: number) => {
      const lactate = findSteadyStateLactate(midPct, vo2max, vlamax);
      const fatGmin = calculateFatOxidation(midPct, vo2max, vlamax, weight);
      const carbGmin = calculateCarbOxidation(midPct, vo2max, vlamax, weight);
      const fatKcalH = fatGmin * 9 * 60;
      const carbKcalH = carbGmin * 4 * 60;
      const totalKcalH = fatKcalH + carbKcalH;
      const fatPct = totalKcalH > 0 ? (fatKcalH / totalKcalH) * 100 : 0;
      return { lactate, fatGmin, carbGmin, fatKcalH, carbKcalH, totalKcalH, fatPct };
    };

    // Zone boundaries derived from Mader thresholds
    const lt1 = lt.lt1Intensity;
    const lt2 = lt.lt2Intensity;
    const fatMaxPct = fm.fatMaxIntensity;

    // Modèle canonique TFCL 6 zones (aligné sur src/lib/zones/deriveTrainingZones.ts) :
    // Z1 Récup < LT1 − marge · Z2 Endurance/FatMax · Z3 Tempo → MLSS −5 %
    // Z4 Seuil MLSS ±3 % · Z5 VO₂max · Z6 Neuromusculaire
    const zoneDefs = [
      { id: "Z1", label: "Récupération", min: 30, max: Math.round(lt1 * 0.75), desc: "Récupération active, lactate de base", effect: "↓ stress, récupération", colorIdx: 0 },
      { id: "Z2", label: "Endurance / FatMax", min: Math.round(lt1 * 0.75), max: lt1, desc: `Lipolyse maximale (FatMax ≈ ${fatMaxPct}% VO₂max), volume mitochondrial`, effect: "↓ VLamax, ↑ TTE", colorIdx: 1 },
      { id: "Z3", label: "Tempo", min: lt1, max: Math.round(lt2 * 0.95), desc: "Endurance active jusqu'à MLSS −5 %, économie", effect: "Stabilise VLamax, ↑ durabilité", colorIdx: 2 },
      { id: "Z4", label: "Seuil (MLSS)", min: Math.round(lt2 * 0.97), max: Math.round(lt2 * 1.03), desc: "MLSS ±3 % — puissance critique / seuil anaérobie", effect: "↑ TTE direct, ↓ VLamax si dosé", colorIdx: 3 },
      { id: "Z5", label: "VO₂max", min: Math.round(lt2 * 1.03), max: 100, desc: "> MLSS jusqu'à la puissance associée à VO₂max", effect: "↑↑ VO₂max, ↑ VLamax", colorIdx: 4 },
      { id: "Z6", label: "Neuromusculaire", min: 100, max: 130, desc: "Supra-VO₂max : force, vitesse, capacité anaérobie", effect: "↑ Pmax, ↑ VLamax", colorIdx: 5 },
    ];

    // Les watts affichés proviennent des zones d'entraînement personnalisées
    // (mêmes bornes % FTP), pour éviter toute divergence entre les deux cartes.
    // Le %VO₂max Mader reste utilisé pour lactate / substrats.
    const derivedBike = deriveTrainingZones({
      sport: "bike",
      ftp: ftpRef,
      vlamax,
      vo2max,
      weightKg: weight,
    });
    const pctByZone = new Map(derivedBike.zones.map((z) => [z.id, z.pctRef]));

    return zoneDefs.map(z => {
      // Point médian borné à 105 % : au-delà, l'extrapolation Mader n'est plus valide.
      const midPct = Math.min(105, Math.round((z.min + z.max) / 2));
      const data = getZoneData(midPct);
      const pct = pctByZone.get(z.id as any);
      return {
        id: z.id,
        label: z.label,
        intensityMin: z.min,
        intensityMax: z.max,
        wattsMin: pct ? Math.round((pct.min / 100) * ftpRef) : intensityToPower(z.min),
        wattsMax: pct ? Math.round((pct.max / 100) * ftpRef) : intensityToPower(z.max),
        midLactate: Math.min(20, data.lactate),
        midFatGmin: data.fatGmin,
        midCarbGmin: data.carbGmin,
        fatKcalH: data.fatKcalH,
        carbKcalH: data.carbKcalH,
        totalKcalH: data.totalKcalH,
        fatPct: data.fatPct,
        color: ZONE_COLORS[z.colorIdx].color,
        bgColor: ZONE_COLORS[z.colorIdx].bg,
        description: z.desc,
        metabolicEffect: z.effect,
      };
    });
  }, [profile, thresholds]);

  if (!valid || zones.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">VO₂max, VLamax et FTP requis pour les zones métaboliques</p>
        </CardContent>
      </Card>
    );
  }

  const margins = getResponsiveMargins(isMobile);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-purple-500/10 via-transparent to-emerald-500/5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-purple-500" />
            Zones Métaboliques
            <Badge variant="outline" className="text-[9px] font-normal">Mader-derived</Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Badge variant="secondary" className="text-[9px] font-mono">LT1 {thresholds!.lt.lt1Intensity}%</Badge>
            <Badge variant="secondary" className="text-[9px] font-mono">LT2 {thresholds!.lt.lt2Intensity}%</Badge>
            <Badge variant="outline" className="text-[9px] font-mono">
              Sweet Spot {Math.round(thresholds!.lt.lt2Intensity * 0.88)}–{Math.round(thresholds!.lt.lt2Intensity * 0.94)}%
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 h-7">
            <TabsTrigger value="bars" className="text-[10px] h-6"><BarChart3 className="h-3 w-3 mr-1" />Graphique</TabsTrigger>
            <TabsTrigger value="table" className="text-[10px] h-6"><TableIcon className="h-3 w-3 mr-1" />Détails</TabsTrigger>
          </TabsList>

          <TabsContent value="bars" className="mt-2">
            {/* Stacked bar chart: fat vs carb oxidation per zone */}
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zones} margin={{ ...margins, left: -10 }}>
                  <CartesianGrid {...responsiveGridProps} />
                  <XAxis dataKey="id" {...responsiveAxisProps.xAxis} />
                  <YAxis {...responsiveAxisProps.yAxis} domain={[0, "auto"]}
                    tickFormatter={(v: number) => v.toFixed(1)} label={{ value: "g/min", angle: -90, position: "insideLeft", fontSize: 9 }} />
                  <Tooltip content={<ZoneTooltip />} {...mobileTooltipProps} />

                  {/* Stacked: fat + carb */}
                  <Bar dataKey="midFatGmin" stackId="substrate" name="Lipides" radius={[0, 0, 0, 0]}>
                    {zones.map((z, i) => (
                      <Cell key={z.id} fill="hsl(142,71%,45%)" fillOpacity={0.5 + i * 0.08} />
                    ))}
                  </Bar>
                  <Bar dataKey="midCarbGmin" stackId="substrate" name="Glucides" radius={[2, 2, 0, 0]}>
                    {zones.map((z, i) => (
                      <Cell key={z.id} fill="hsl(24,95%,53%)" fillOpacity={0.5 + i * 0.08} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Zone strips with key info */}
            <div className="grid grid-cols-6 gap-0.5 mt-2">
              {zones.map((z) => (
                <div key={z.id} className="text-center p-1.5 rounded" style={{ backgroundColor: z.color + "15", borderLeft: `3px solid ${z.color}` }}>
                  <div className="text-[9px] font-bold" style={{ color: z.color }}>{z.id}</div>
                  <div className="text-[8px] text-muted-foreground truncate">{z.label}</div>
                  <div className="text-[10px] font-mono font-bold">{z.wattsMin}–{z.wattsMax}W</div>
                  <div className="text-[8px] font-mono" style={{ color: z.color }}>{z.midLactate.toFixed(1)} mmol</div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="table" className="mt-2">
            <ZonesTable zones={zones} />
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: "hsl(142,71%,45%)", opacity: 0.7 }} />
            <span className="text-[9px] text-muted-foreground">Lipides (g/min)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: "hsl(24,95%,53%)", opacity: 0.7 }} />
            <span className="text-[9px] text-muted-foreground">Glucides (g/min)</span>
          </div>
        </div>

        {/* Staff block */}
        {staffMode && (
          <div className="rounded-lg bg-muted/20 border border-dashed p-3 text-[10px] font-mono text-muted-foreground space-y-1">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-foreground/60 mb-1">
              Zones métaboliques Mader — Données techniques
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span>LT1 (2mmol): {thresholds!.lt.lt1Intensity}% → {thresholds!.lt.lt1Power}W</span>
              <span>LT2 (4mmol): {thresholds!.lt.lt2Intensity}% → {thresholds!.lt.lt2Power}W</span>
              <span>FatMax: {thresholds!.fm.fatMaxIntensity}% → {thresholds!.fm.fatMaxPower}W</span>
              <span>MLSS: {thresholds!.mlss}W</span>
              <span>Écart LT1→LT2: {thresholds!.lt.lt2Intensity - thresholds!.lt.lt1Intensity}%</span>
              <span>Fat @ FatMax: {thresholds!.fm.fatMaxGrams} g/min</span>
            </div>
            <p className="text-[9px] opacity-60 pt-1 border-t border-border/30">
              Zones auto-dérivées du modèle Mader (LT1/LT2 comme limites primaires).
              Impact métabolique par zone : oxydation lipidique et glucidique au point médian de chaque zone.
              Steady-state lactate calculé itérativement (Mader 2003). Valider par test terrain step.
            </p>
          </div>
        )}

        <p className="text-[9px] text-muted-foreground text-center pt-2 border-t">
          Zones dérivées du modèle Mader (2003), alignées sur le modèle canonique TFCL Z1–Z6.
          Le Sweet Spot (88–94 % du seuil) chevauche haut Z3 / bas Z4 : ce n'est pas une zone métabolique distincte.
        </p>
      </CardContent>
    </Card>
  );
}
