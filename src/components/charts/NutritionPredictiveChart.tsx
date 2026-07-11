/**
 * Nutrition Predictive Chart – Besoins glucidiques g/h
 * Courbe par intensité via modèle Mader (calculateCarbOxidation)
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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Utensils, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateCarbOxidation } from "@/lib/v2/maderMetabolicModel";

export type GutTrainingLevel = "untrained" | "developing" | "trained" | "elite";

interface NutritionPredictiveChartProps {
  vlamaxValue: number | null;
  objectif: string;
  sport?: "velo" | "cap" | "triathlon";
  vo2max?: number | null;
  weightKg?: number | null;
  durationMin?: number | null;
  gutTrainingLevel?: GutTrainingLevel;
  staffMode?: boolean;
  className?: string;
}

// ============================================================================
// F1 — Plafonds dynamiques selon gut training (King 2022, Viribay 2020, Costa 2023)
// ============================================================================
// untrained  : 60 g/h (1 transporteur SGLT1 saturé)
// developing : 90 g/h (introduction fructose 1:0.5)
// trained    : 120 g/h (ratio 1:0.8 standard élite)
// elite      : 150 g/h (ultra-endurants, ratio 1:0.8, gut training >6 sem.)
// CAP : -25% (Pfeiffer 2012) ; Triathlon : -10%
const GUT_CAP_BIKE: Record<GutTrainingLevel, number> = {
  untrained: 60,
  developing: 90,
  trained: 120,
  elite: 150,
};

function getCarbCap(sport: "velo" | "cap" | "triathlon", level: GutTrainingLevel): number {
  const base = GUT_CAP_BIKE[level];
  if (sport === "cap") return Math.round(base * 0.75);     // 45 / 68 / 90 / 113
  if (sport === "triathlon") return Math.round(base * 0.90); // 54 / 81 / 108 / 135
  return base;
}

// ============================================================================
// F1 — Fraction exogène durée-dépendante (Stellingwerff 2014, Burke 2019)
// <90 min: 0.35 ; 90-180: 0.55 ; 180-360: 0.75 ; >360: 0.90
// ============================================================================
function getExogenousFraction(durationMin: number): number {
  if (durationMin < 90) return 0.35;
  if (durationMin < 180) return 0.55;
  if (durationMin < 360) return 0.75;
  return 0.90;
}

// ============================================================================
// F1 — Ratio glucose:fructose recommandé (Jentjens 2004, O'Brien 2013, King 2022)
// ============================================================================
function getGlucoseFructoseRatio(gPerHour: number): { ratio: string; note: string } {
  if (gPerHour <= 60) return { ratio: "Glucose seul OK", note: "1 transporteur SGLT1" };
  if (gPerHour <= 90) return { ratio: "1 : 0.5", note: "Glucose + fructose nécessaire" };
  if (gPerHour <= 120) return { ratio: "1 : 0.8", note: "Mix élite standard" };
  return { ratio: "1 : 0.8 strict", note: "Gut training >6 sem. obligatoire" };
}

const computeNutritionCurve = (
  vlamax: number | null,
  sport: "velo" | "cap" | "triathlon",
  vo2max: number | null | undefined,
  weightKg: number | null | undefined,
  durationMin: number,
  gutLevel: GutTrainingLevel
) => {
  // Visualisation-only fallback : la carte affiche déjà un bandeau "VLamax non
  // disponible – estimation basée sur profil moyen" (voir isDataMissing plus bas).
  // Cette médiane 0.45 n'est PAS persistée et ne remonte pas dans le diagnostic.
  const POPULATION_MEDIAN_VLAMAX = 0.45;
  const vlx = vlamax ?? POPULATION_MEDIAN_VLAMAX;
  const vo2 = vo2max ?? (sport === "cap" ? 48 : 50);
  const weight = weightKg ?? 70;


  const capMax = getCarbCap(sport, gutLevel);
  const exogenousFraction = getExogenousFraction(durationMin);

  const data = [];
  for (let intensity = 50; intensity <= 100; intensity += 5) {
    const carbOxGmin = calculateCarbOxidation(intensity, vo2, vlx, weight);
    const totalOxGh = carbOxGmin * 60;

    const exogenousGh = totalOxGh * exogenousFraction;

    const recommended = Math.round(Math.max(20, Math.min(capMax, exogenousGh)));
    const min = Math.round(Math.max(15, recommended * 0.85));
    const max = Math.round(Math.min(capMax, recommended * 1.15));

    data.push({
      intensity,
      min,
      max,
      recommended,
      totalOx: Math.round(totalOxGh),
      label: `${intensity}% FTP`,
    });
  }

  return data;
};

// Zones de risque digestif
const getDigestiveRiskZone = (gPerHour: number, cap: number): {
  level: string;
  color: string;
} => {
  if (gPerHour >= cap) {
    return { level: "Au plafond toléré", color: "hsl(var(--destructive))" };
  }
  if (gPerHour >= cap * 0.85) {
    return { level: "Vigilance", color: "hsl(var(--warning))" };
  }
  return { level: "Zone sûre", color: "hsl(var(--success))" };
};

const CustomTooltip = ({ active, payload, cap }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const riskInfo = getDigestiveRiskZone(data.recommended, cap);
  const gf = getGlucoseFructoseRatio(data.recommended);

  return (
    <div className="bg-background border border-border rounded-lg p-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{data.label}</p>
      <p className="text-muted-foreground">
        Exogène : <span className="font-mono font-semibold text-foreground">{data.recommended}</span> g/h
        <span className="ml-2 text-muted-foreground">({data.min}–{data.max})</span>
      </p>
      <p className="text-muted-foreground">
        Oxydation totale : <span className="font-mono">{data.totalOx}</span> g/h
      </p>
      <p className="text-muted-foreground">
        Ratio G:F : <span className="font-mono">{gf.ratio}</span>
      </p>
      <p style={{ color: riskInfo.color }} className="text-xs">{riskInfo.level}</p>
    </div>
  );
};

// Estimation durée en minutes depuis l'objectif (fallback si non fourni)
function inferDurationMin(objectif: string, sport: "velo" | "cap" | "triathlon"): number {
  const o = (objectif || "").toUpperCase();
  if (o.includes("ULTRA")) return 600;
  if (o.includes("IM") || o.includes("IRONMAN")) return sport === "cap" ? 210 : 540;
  if (o.includes("70.3") || o.includes("703") || o.includes("HALF")) return sport === "cap" ? 105 : 270;
  if (o.includes("MARATHON") && !o.includes("SEMI")) return 210;
  if (o.includes("TRAIL")) return 240;
  if (o.includes("SEMI")) return 100;
  return 120;
}

export function NutritionPredictiveChart({
  vlamaxValue,
  objectif,
  sport = "velo",
  vo2max,
  weightKg,
  durationMin,
  gutTrainingLevel = "trained",
  staffMode = false,
  className,
}: NutritionPredictiveChartProps) {
  const isDataMissing = vlamaxValue === null;

  const effectiveDuration = durationMin ?? inferDurationMin(objectif, sport);
  const cap = getCarbCap(sport, gutTrainingLevel);
  const exoFraction = getExogenousFraction(effectiveDuration);

  const data = useMemo(() => {
    return computeNutritionCurve(vlamaxValue, sport, vo2max, weightKg, effectiveDuration, gutTrainingLevel);
  }, [vlamaxValue, sport, vo2max, weightKg, effectiveDuration, gutTrainingLevel]);
  
  const digestiveThreshold = cap;
  const sportLabel = sport === "cap" ? "Course à pied" : sport === "triathlon" ? "Triathlon" : "Vélo";
  const yMax = Math.max(150, Math.ceil(cap / 30) * 30 + 30);
  const gutLabel: Record<GutTrainingLevel, string> = {
    untrained: "Non entraîné",
    developing: "En développement",
    trained: "Entraîné",
    elite: "Élite (gut-trained)",
  };
  const durationLabel =
    effectiveDuration < 90 ? "<90 min" :
    effectiveDuration < 180 ? "90–180 min" :
    effectiveDuration < 360 ? "3–6 h" : ">6 h";

  return (
    <Card className={cn("overflow-hidden", isDataMissing && "opacity-60", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Utensils className="w-4 h-4" />
          <span>Besoins Glucidiques – {sportLabel}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isDataMissing && (
          <div className="mb-2 p-2 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
            <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <p className="text-xs text-warning">
              VLamax non disponible – estimation basée sur profil moyen
            </p>
          </div>
        )}

        {/* Bandeau contexte F1 : gut training + durée */}
        <div className="mb-2 flex flex-wrap gap-2 text-[11px]">
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary">
            Gut training : {gutLabel[gutTrainingLevel]} → plafond {cap} g/h
          </span>
          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
            Durée : {durationLabel} → fraction exo {Math.round(exoFraction * 100)} %
          </span>
        </div>
        
        <div className="h-48 sm:h-64 flex">
          {/* Y-axis label externe */}
          <div className="flex items-center justify-center w-6 shrink-0">
            <span className="text-[11px] text-muted-foreground -rotate-90 whitespace-nowrap">g/h</span>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 50, bottom: 30, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                
                {/* Zone au-dessus du plafond toléré */}
                <ReferenceArea
                  y1={cap}
                  y2={yMax}
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.12}
                />

                {/* Ligne plafond gut-trained */}
                <ReferenceLine
                  y={cap}
                  stroke="hsl(var(--destructive))"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  label={{
                    value: `Plafond ${cap} g/h`,
                    position: 'insideTopRight',
                    fontSize: 10,
                    fill: 'hsl(var(--destructive))',
                  }}
                />

                <XAxis
                  dataKey="intensity"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(val) => `${val}%`}
                  label={{ value: 'Intensité (%FTP)', position: 'bottom', fontSize: 11, offset: 0, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <YAxis
                  domain={[0, yMax]}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(val) => `${val}`}
                  stroke="hsl(var(--border))"
                  width={30}
                />

                <Tooltip content={<CustomTooltip cap={cap} />} />

                {/* Plage acceptable (entre min et max) */}
                <Area
                  type="monotone"
                  dataKey="max"
                  stroke="none"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.25}
                />
                <Area
                  type="monotone"
                  dataKey="min"
                  stroke="none"
                  fill="hsl(var(--background))"
                  fillOpacity={0.9}
                />
                
                {/* Ligne recommandée */}
                <Area
                  type="monotone"
                  dataKey="recommended"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="none"
                  dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Légende */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-primary" />
            <span className="text-muted-foreground">Exogène recommandé</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-primary/20 rounded" />
            <span className="text-muted-foreground">Plage acceptable</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-destructive/10 rounded" />
            <span className="text-muted-foreground">Zone de risque</span>
          </div>
        </div>
        
        {staffMode && (
          <div className="mt-3 p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Modèle:</strong> Mader-Heck |
              <strong> VLamax:</strong> {vlamaxValue?.toFixed(2) || "—"} |
              <strong> VO₂max:</strong> {vo2max ?? "est."} |
              <strong> Poids:</strong> {weightKg ?? 70}kg |
              <strong> Sport:</strong> {sportLabel}
            </p>
            <p>
              <strong>F1 — Gut cap:</strong> {cap} g/h ({gutLabel[gutTrainingLevel]}) |
              <strong> Fraction exo:</strong> {Math.round(exoFraction * 100)}% (durée {effectiveDuration} min) |
              <strong> G:F:</strong> {getGlucoseFructoseRatio(cap).ratio}
            </p>
            <p className="text-[10px]">
              Réf : Jeukendrup 2014, King 2022, Viribay 2020, Costa 2023, Stellingwerff 2014, Burke 2019.
            </p>
            <p className="mt-1">⚠️ Estimation pédagogique – Ne remplace pas un avis nutritionnel</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
