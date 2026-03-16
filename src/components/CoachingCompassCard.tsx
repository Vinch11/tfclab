/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL COACHING COMPASS™ — Carte Stratégique Unifiée
 * 
 * Centre décisionnel du coaching : 
 * PROFIL → LIMITEUR → LEVIER → DÉCISION
 * 
 * Deux modes : Athlète (simplifié) / Coach (détaillé)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Compass, Target, ArrowDown, ChevronRight, AlertTriangle, 
  Shield, Eye, EyeOff, Activity, Zap, TrendingUp, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeCoachingCompass, type CoachingCompassInput, type TFCLCoachingCompassResult, type RadarAxis } from "@/lib/coachingCompass";

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface CoachingCompassCardProps {
  input: CoachingCompassInput;
  staffMode?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RADAR CHART — SVG
// ═══════════════════════════════════════════════════════════════════════════════

function RadarChart({ axes, size = 200 }: { axes: RadarAxis[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const levels = [25, 50, 75, 100];
  const n = axes.length;

  if (n === 0) return null;

  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const dist = (value / 100) * r;
    return {
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    };
  };

  // Polygon points
  const dataPoints = axes.map((a, i) => getPoint(i, a.score));
  const polygonStr = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[220px] mx-auto">
      {/* Grid levels */}
      {levels.map(level => {
        const points = Array.from({ length: n }, (_, i) => {
          const p = getPoint(i, level);
          return `${p.x},${p.y}`;
        }).join(" ");
        return (
          <polygon
            key={level}
            points={points}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={level === 100 ? 1 : 0.5}
            opacity={0.4}
          />
        );
      })}

      {/* Axis lines */}
      {axes.map((_, i) => {
        const p = getPoint(i, 100);
        return (
          <line
            key={`axis-${i}`}
            x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke="hsl(var(--border))"
            strokeWidth={0.5}
            opacity={0.3}
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={polygonStr}
        fill="hsl(var(--primary) / 0.15)"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={`dot-${i}`}
          cx={p.x} cy={p.y} r={3.5}
          fill="hsl(var(--primary))"
          stroke="hsl(var(--background))"
          strokeWidth={1.5}
        />
      ))}

      {/* Labels */}
      {axes.map((axis, i) => {
        const labelP = getPoint(i, 125);
        return (
          <text
            key={`label-${i}`}
            x={labelP.x}
            y={labelP.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground"
            fontSize={10}
            fontWeight={500}
          >
            {axis.shortLabel}
          </text>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION FLOW — Vertical
// ═══════════════════════════════════════════════════════════════════════════════

function DecisionFlow({ compass }: { compass: TFCLCoachingCompassResult }) {
  const { limiter, leverage, decision } = compass;

  const steps = [
    {
      label: "Limiteur",
      icon: <AlertTriangle className="w-4 h-4" />,
      value: limiter.label,
      detail: limiter.description,
      badge: limiter.confidence,
      color: "text-destructive",
    },
    {
      label: "Levier",
      icon: <Zap className="w-4 h-4" />,
      value: leverage.label,
      detail: leverage.description,
      badge: null,
      color: "text-primary",
    },
    {
      label: "Décision",
      icon: <Target className="w-4 h-4" />,
      value: decision.recommendedBlock,
      detail: `${decision.durationWeeks} semaines — ${decision.physiologicalTargets.join(", ")}`,
      badge: null,
      color: "text-accent-foreground",
    },
  ];

  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <div key={step.label}>
          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/50">
            <div className={cn("mt-0.5 p-1.5 rounded-md bg-background border border-border/50", step.color)}>
              {step.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {step.label}
                </span>
                {step.badge && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                    {step.badge}
                  </Badge>
                )}
              </div>
              <p className="text-sm font-semibold mt-0.5 truncate">{step.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{step.detail}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className="flex justify-center py-0.5">
              <ArrowDown className="w-3.5 h-3.5 text-muted-foreground/50" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// READINESS MINI
// ═══════════════════════════════════════════════════════════════════════════════

function ReadinessMini({ readiness }: { readiness: TFCLCoachingCompassResult["readiness"] }) {
  const colorMap = {
    success: "text-green-500 bg-green-500/10 border-green-500/20",
    warning: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    destructive: "text-red-500 bg-red-500/10 border-red-500/20",
  };
  const c = colorMap[readiness.readinessColor] || colorMap.destructive;

  return (
    <div className={cn("flex items-center justify-between p-3 rounded-lg border", c)}>
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4" />
        <span className="text-xs font-semibold">Race Readiness</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-lg font-bold">{readiness.readinessScore}</div>
          <div className="text-[10px] text-muted-foreground">{readiness.readinessLabel}</div>
        </div>
        <div className="text-[10px] space-y-0.5 text-muted-foreground">
          <div>Potentiel: {readiness.potential}</div>
          <div>Dispo: {readiness.availability}</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FATIGUE WARNING BANNER
// ═══════════════════════════════════════════════════════════════════════════════

function FatigueWarningBanner({ warning }: { warning: NonNullable<TFCLCoachingCompassResult["fatigueWarning"]> }) {
  const colors = {
    moderate: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    critical: "bg-red-500/10 text-red-600 border-red-500/20",
    none: "",
  };

  if (warning.level === "none") return null;

  return (
    <div className={cn("flex items-center gap-2 p-2.5 rounded-lg border text-xs", colors[warning.level])}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span className="font-medium">{warning.message}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROFIL METRICS TABLE (Staff Mode)
// ═══════════════════════════════════════════════════════════════════════════════

function ProfileMetricsTable({ profile }: { profile: TFCLCoachingCompassResult["profile"] }) {
  const metrics = [
    { key: "VO₂max", m: profile.vo2max },
    { key: "VLamax", m: profile.vlamax },
    { key: "FTP", m: profile.ftp },
    { key: "FTP/kg", m: profile.ftpKg },
    { key: "TTE", m: profile.tte },
    { key: "FatMax", m: profile.fatmax },
    { key: "LT1", m: profile.lt1 },
    { key: "LT2", m: profile.lt2 },
    { key: "W'", m: profile.wPrime },
    { key: "Économie", m: profile.runningEconomy },
    { key: "Durabilité", m: profile.durability },
  ].filter(r => r.m.value !== null);

  if (metrics.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Aucune donnée physiologique disponible.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {metrics.map(({ key, m }) => (
        <div key={key} className="flex items-center justify-between p-1.5 rounded bg-muted/30 text-xs">
          <span className="text-muted-foreground font-medium">{key}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold">
              {typeof m.value === "number" ? (m.value < 10 ? m.value.toFixed(2) : Math.round(m.value)) : "—"}
            </span>
            <span className="text-[9px] text-muted-foreground">{m.unit}</span>
            <div 
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                m.confidence >= 0.8 ? "bg-green-500" : m.confidence >= 0.5 ? "bg-amber-500" : "bg-red-500"
              )} 
              title={`Confiance: ${Math.round(m.confidence * 100)}%`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function CoachingCompassCard({ input, staffMode: initialStaffMode = false, className }: CoachingCompassCardProps) {
  const [staffMode, setStaffMode] = useState(initialStaffMode);

  const compass = useMemo(() => computeCoachingCompass(input), [input]);

  // Données insuffisantes
  if (compass.meta.dataCompleteness < 10) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">TFCL Coaching Compass™</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Compass className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Données insuffisantes</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
              Renseignez au moins FTP, poids et VLamax dans un snapshot pour activer le Compass.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/50 overflow-hidden", className)}>
      {/* Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">TFCL Coaching Compass™</CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Profil → Limiteur → Levier → Décision
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStaffMode(!staffMode)}
            className="h-7 px-2 text-[10px] gap-1"
          >
            {staffMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {staffMode ? "Athlète" : "Staff"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Fatigue Warning */}
        {compass.fatigueWarning && compass.fatigueWarning.level !== "none" && (
          <FatigueWarningBanner warning={compass.fatigueWarning} />
        )}

        <Tabs defaultValue="decision" className="w-full">
          <TabsList className="w-full h-8 grid grid-cols-3">
            <TabsTrigger value="decision" className="text-[11px] h-7">
              <Target className="w-3 h-3 mr-1" />
              Décision
            </TabsTrigger>
            <TabsTrigger value="radar" className="text-[11px] h-7">
              <Activity className="w-3 h-3 mr-1" />
              Radar
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-[11px] h-7">
              <Info className="w-3 h-3 mr-1" />
              Profil
            </TabsTrigger>
          </TabsList>

          {/* TAB 1 : Flux décisionnel */}
          <TabsContent value="decision" className="mt-3 space-y-3">
            <DecisionFlow compass={compass} />
            
            {/* Race Readiness mini */}
            {compass.readiness.readinessScore > 0 && (
              <ReadinessMini readiness={compass.readiness} />
            )}

            {/* Prohibitions */}
            {compass.decision.prohibitions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {compass.decision.prohibitions.map(p => (
                  <Badge key={p} variant="destructive" className="text-[10px]">
                    🚫 {p}
                  </Badge>
                ))}
              </div>
            )}

            {/* Message athlète (mode non-staff) */}
            {!staffMode && compass.decision.athleteMessage && (
              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-foreground">{compass.decision.athleteMessage}</p>
              </div>
            )}

            {/* Coach rationale (mode staff) */}
            {staffMode && compass.decision.coachRationale && (
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Justification Coach
                </p>
                <p className="text-xs text-foreground">{compass.decision.coachRationale}</p>
              </div>
            )}
          </TabsContent>

          {/* TAB 2 : Radar */}
          <TabsContent value="radar" className="mt-3">
            <div className="flex flex-col items-center">
              <RadarChart axes={compass.radarAxes} size={220} />
              
              {/* Légende */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 w-full">
                {compass.radarAxes.map(axis => (
                  <div key={axis.key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <span>{axis.icon}</span>
                      <span>{axis.shortLabel}</span>
                    </span>
                    <span className={cn(
                      "font-semibold",
                      axis.score >= 75 ? "text-green-500" : axis.score >= 50 ? "text-amber-500" : "text-red-500"
                    )}>
                      {axis.score}
                    </span>
                  </div>
                ))}
              </div>

              {/* Data completeness */}
              <div className="mt-3 text-center">
                <div className="text-[10px] text-muted-foreground">
                  Complétude des données : {compass.meta.dataCompleteness}%
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${compass.meta.dataCompleteness}%` }}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3 : Profil détaillé */}
          <TabsContent value="profile" className="mt-3 space-y-3">
            {staffMode ? (
              <ProfileMetricsTable profile={compass.profile} />
            ) : (
              // Mode athlète : vue simplifiée
              <div className="space-y-2">
                {[
                  { label: "Moteur Aérobie", value: compass.profile.ftpKg.value ? `${compass.profile.ftpKg.value} W/kg` : "—", icon: "🫁" },
                  { label: "Profil Métabolique", value: compass.profile.vlamax.value ? `${compass.profile.vlamax.value.toFixed(2)} mmol/L/s` : "—", icon: "⚡" },
                  { label: "Endurance", value: compass.profile.tte.value ? `TTE ${compass.profile.tte.value} min` : "—", icon: "💪" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span>{item.icon}</span>
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Limiter metrics used (staff) */}
            {staffMode && compass.limiter.metricsUsed.length > 0 && (
              <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Métriques utilisées pour le diagnostic
                </p>
                <div className="flex flex-wrap gap-1">
                  {compass.limiter.metricsUsed.map(m => (
                    <Badge key={m} variant="outline" className="text-[9px]">{m}</Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        {staffMode && (
          <p className="text-[9px] text-muted-foreground/60 text-center pt-1">
            {compass.meta.disclaimer} — v{compass.meta.version}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
