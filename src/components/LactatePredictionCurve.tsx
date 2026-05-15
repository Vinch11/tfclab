// =============================================
// LACTATE PREDICTION CURVE - INSCYD-inspired
// Two For Coaching Lab
// =============================================

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle, Activity, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
// Audit 2C F18 — migré de `metabolicSimulator` (engine non calibré) vers
// `maderMetabolicModel` (Mader α=1.98 calibré N=44). Cohérent avec
// `MetabolicZonesINSCYDChart`, `StaffReport`, `ExportTools`.
import {
  type MaderProfile,
  generateMaderLactateCurve,
  findLactateThresholds,
  findFatMax,
} from "@/lib/v2/maderMetabolicModel";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea
} from "recharts";

// =============================================
// PROPS
// =============================================

interface LactatePredictionCurveProps {
  vo2max: number;
  vlamax: number;
  ftp: number;
  weight?: number;
  className?: string;
  compact?: boolean;
}

// =============================================
// CUSTOM TOOLTIP
// =============================================

function CurveTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0]?.payload;
  
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg text-sm">
      <div 
        className="w-full h-1 rounded-full mb-2" 
        style={{ backgroundColor: data?.color }}
      />
      <p className="font-semibold text-xs mb-1">{data?.zone}</p>
      <div className="space-y-0.5 text-[11px]">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Intensité:</span>
          <span className="font-mono">{data?.intensity}% VO2max</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Puissance:</span>
          <span className="font-mono">{Math.round(data?.watts)}W</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Lactate:</span>
          <span className="font-mono font-bold" style={{ color: data?.color }}>
            {data?.lactate?.toFixed(2)} mmol/L
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================
// ZONE LEGEND
// =============================================

function ZoneLegend() {
  const zones = [
    { label: "Z1 Récup", color: "hsl(217, 91%, 60%)", lactate: "<2.0" },
    { label: "Z2 Endurance", color: "hsl(142, 71%, 45%)", lactate: "2.0-2.5" },
    { label: "Z3 Tempo", color: "hsl(45, 93%, 47%)", lactate: "2.5-4.0" },
    { label: "Z4 Seuil", color: "hsl(24, 95%, 53%)", lactate: "4.0-6.0" },
    { label: "Z5 VO2", color: "hsl(0, 84%, 60%)", lactate: "6.0-10.0" },
  ];
  
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {zones.map(zone => (
        <div key={zone.label} className="flex items-center gap-1">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: zone.color }}
          />
          <span className="text-[9px] text-muted-foreground">{zone.label}</span>
        </div>
      ))}
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
  ftp 
}: { 
  lt1Pct: number; 
  lt2Pct: number; 
  fatMaxPct: number;
  ftp: number;
}) {
  const pMax = ftp * 1.18;
  const lt1W = Math.round((lt1Pct / 100) * pMax);
  const lt2W = Math.round((lt2Pct / 100) * pMax);
  const fatMaxW = Math.round((fatMaxPct / 100) * pMax);
  
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
        <div className="text-[10px] text-green-700 dark:text-green-300 font-medium">LT1 (2 mmol/L)</div>
        <div className="text-sm font-mono font-bold text-green-600">{lt1Pct}%</div>
        <div className="text-[10px] text-muted-foreground">{lt1W}W</div>
      </div>
      <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-center">
        <div className="text-[10px] text-orange-700 dark:text-orange-300 font-medium">LT2 (4 mmol/L)</div>
        <div className="text-sm font-mono font-bold text-orange-600">{lt2Pct}%</div>
        <div className="text-[10px] text-muted-foreground">{lt2W}W</div>
      </div>
      <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
        <div className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">FatMax</div>
        <div className="text-sm font-mono font-bold text-blue-600">{fatMaxPct}%</div>
        <div className="text-[10px] text-muted-foreground">{fatMaxW}W</div>
      </div>
    </div>
  );
}

// =============================================
// METABOLIC INSIGHT
// =============================================

function MetabolicInsight({ vlamax, lt1Pct, lt2Pct }: { vlamax: number; lt1Pct: number; lt2Pct: number }) {
  const gap = lt2Pct - lt1Pct;
  
  let insight: { title: string; description: string; icon: any; color: string };
  
  if (vlamax < 0.35) {
    insight = {
      title: "Profil Endurance",
      description: "VLamax basse = excellente efficacité aérobie. Seuils lactiques élevés, idéal pour les efforts longs.",
      icon: Activity,
      color: "text-green-600"
    };
  } else if (vlamax > 0.55) {
    insight = {
      title: "Profil Glycolytique",
      description: "VLamax élevée = forte capacité anaérobie mais seuils plus bas. Travail Z2 recommandé pour l'endurance.",
      icon: Zap,
      color: "text-orange-600"
    };
  } else {
    insight = {
      title: "Profil Équilibré",
      description: `Écart LT1-LT2 de ${gap}% indique une bonne marge de progression au tempo.`,
      icon: TrendingUp,
      color: "text-blue-600"
    };
  }
  
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border">
      <insight.icon className={cn("h-4 w-4 mt-0.5 shrink-0", insight.color)} />
      <div>
        <div className={cn("text-xs font-semibold", insight.color)}>{insight.title}</div>
        <div className="text-[11px] text-muted-foreground">{insight.description}</div>
      </div>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function LactatePredictionCurve({ 
  vo2max, 
  vlamax, 
  ftp,
  weight = 70,
  className,
  compact = false
}: LactatePredictionCurveProps) {
  
  // Audit 2C F18 — courbe Mader (calibré N=44) au lieu du simulator linéaire.
  const profile = useMemo<MaderProfile | null>(() => {
    if (!vo2max || !vlamax || !ftp) return null;
    return { vo2max, vlamax, weight };
  }, [vo2max, vlamax, weight, ftp]);

  // Mappe la couleur de zone à partir du label Mader (cohérent avec ZoneLegend)
  const zoneColor = (zone: string): string => {
    if (zone.startsWith("Z1")) return "hsl(217, 91%, 60%)";
    if (zone.startsWith("Z2")) return "hsl(142, 71%, 45%)";
    if (zone.startsWith("Z3")) return "hsl(45, 93%, 47%)";
    if (zone.startsWith("Z4")) return "hsl(24, 95%, 53%)";
    if (zone.startsWith("Z5")) return "hsl(0, 84%, 60%)";
    return "hsl(280, 87%, 60%)";
  };

  const lactateCurve = useMemo(() => {
    if (!profile) return [];
    return generateMaderLactateCurve(profile).map((p) => ({
      intensity: p.intensity,
      watts: p.power,
      lactate: p.lactate,
      zone: p.zone,
      color: zoneColor(p.zone),
    }));
  }, [profile]);

  // Find thresholds (Mader → intensities en % VO2max)
  const { lt1Pct, lt2Pct } = useMemo(() => {
    if (!profile) return { lt1Pct: 60, lt2Pct: 80 };
    const lt = findLactateThresholds(profile);
    return { lt1Pct: lt.lt1Intensity, lt2Pct: lt.lt2Intensity };
  }, [profile]);

  const fatMaxPct = useMemo(() => {
    if (!profile) return 60;
    return findFatMax(profile).fatMaxIntensity;
  }, [profile]);
  
  // Data validation
  if (!vo2max || !vlamax || !ftp) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Données métaboliques insuffisantes (VO2max, VLamax, FTP requis)
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-orange-500/10 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            Courbe de Lactate Prédictive
            <Badge variant="outline" className="text-[10px]">INSCYD-style</Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Badge variant="secondary" className="text-[10px] font-mono">
              VLa: {vlamax.toFixed(2)}
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-mono">
              VO2: {vo2max}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        {/* Threshold Badges */}
        {!compact && (
          <ThresholdBadges 
            lt1Pct={lt1Pct} 
            lt2Pct={lt2Pct} 
            fatMaxPct={fatMaxPct}
            ftp={ftp}
          />
        )}
        
        {/* Main Chart */}
        <div className={cn("w-full", compact ? "h-40" : "h-56")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={lactateCurve} 
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <defs>
                <linearGradient id="lactateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              
              {/* Zone reference areas */}
              <ReferenceArea y1={0} y2={2} fill="hsl(142, 71%, 45%)" fillOpacity={0.1} />
              <ReferenceArea y1={2} y2={4} fill="hsl(45, 93%, 47%)" fillOpacity={0.1} />
              <ReferenceArea y1={4} y2={6} fill="hsl(24, 95%, 53%)" fillOpacity={0.1} />
              <ReferenceArea y1={6} y2={12} fill="hsl(0, 84%, 60%)" fillOpacity={0.1} />
              
              <XAxis 
                dataKey="intensity" 
                tick={{ fontSize: 10 }} 
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                domain={[0, 12]}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip content={<CurveTooltip />} />
              
              {/* Threshold reference lines */}
              <ReferenceLine 
                y={2} 
                stroke="hsl(142, 71%, 45%)" 
                strokeWidth={2}
                strokeDasharray="5 5" 
                label={{ 
                  value: "LT1", 
                  fontSize: 9, 
                  fill: "hsl(142, 71%, 45%)",
                  position: "right"
                }} 
              />
              <ReferenceLine 
                y={4} 
                stroke="hsl(24, 95%, 53%)" 
                strokeWidth={2}
                strokeDasharray="5 5" 
                label={{ 
                  value: "LT2", 
                  fontSize: 9, 
                  fill: "hsl(24, 95%, 53%)",
                  position: "right"
                }} 
              />
              
              {/* FatMax vertical line */}
              <ReferenceLine 
                x={fatMaxPct} 
                stroke="hsl(217, 91%, 60%)" 
                strokeWidth={1}
                strokeDasharray="3 3" 
              />
              
              {/* Main curve */}
              <Area 
                type="monotone" 
                dataKey="lactate" 
                stroke="hsl(24, 95%, 53%)" 
                strokeWidth={2.5}
                fill="url(#lactateGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Zone Legend */}
        {!compact && <ZoneLegend />}
        
        {/* Metabolic Insight */}
        {!compact && (
          <MetabolicInsight 
            vlamax={vlamax} 
            lt1Pct={lt1Pct} 
            lt2Pct={lt2Pct} 
          />
        )}
        
        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center pt-2 border-t">
          Courbe basée sur le modèle Mader simplifié. Valider avec des tests lactate réels.
        </p>
      </CardContent>
    </Card>
  );
}
