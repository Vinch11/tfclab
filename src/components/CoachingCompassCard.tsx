/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL COACHING COMPASS™ — Graphique Signature
 * 
 * Visualisation unifiée du processus décisionnel :
 * PROFIL → LIMITEUR → LEVIER → DÉCISION
 * 
 * Lisible en < 10 secondes par un coach.
 * Deux modes : Athlète (simplifié) / Coach (détaillé)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Compass, Target, AlertTriangle, 
  Shield, Eye, EyeOff, Zap, Info, Clock, Dumbbell,
  ChevronDown
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
// RADAR CHART — SVG avec zone optimale
// ═══════════════════════════════════════════════════════════════════════════════

function SignatureRadar({ axes, size = 240 }: { axes: RadarAxis[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.36;
  const levels = [25, 50, 75, 100];
  const n = axes.length;

  if (n === 0) return null;

  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const dist = (value / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  // Optimal zone (75-100)
  const optimalOuter = Array.from({ length: n }, (_, i) => getPoint(i, 100));
  const optimalInner = Array.from({ length: n }, (_, i) => getPoint(i, 75));
  const optimalPath = `M ${optimalOuter.map(p => `${p.x},${p.y}`).join(" L ")} Z M ${optimalInner.map(p => `${p.x},${p.y}`).join(" L ")} Z`;

  // Data polygon
  const dataPoints = axes.map((a, i) => getPoint(i, a.score));
  const polygonStr = dataPoints.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[200px] sm:max-w-[240px] mx-auto select-none">
      <defs>
        <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.08" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background glow */}
      <circle cx={cx} cy={cy} r={r * 1.1} fill="url(#radar-glow)" />

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
            strokeWidth={level === 100 ? 0.8 : 0.4}
            opacity={0.35}
          />
        );
      })}

      {/* Optimal zone (green) */}
      <path
        d={optimalPath}
        fill="hsl(var(--success) / 0.06)"
        fillRule="evenodd"
        stroke="hsl(var(--success) / 0.15)"
        strokeWidth={0.5}
      />

      {/* Axis lines */}
      {axes.map((_, i) => {
        const p = getPoint(i, 100);
        return (
          <line
            key={`axis-${i}`}
            x1={cx} y1={cy} x2={p.x} y2={p.y}
            stroke="hsl(var(--border))"
            strokeWidth={0.4}
            opacity={0.25}
          />
        );
      })}

      {/* Data polygon — filled */}
      <polygon
        points={polygonStr}
        fill="hsl(var(--primary) / 0.12)"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <g key={`dot-${i}`}>
          <circle cx={p.x} cy={p.y} r={5} fill="hsl(var(--primary) / 0.2)" />
          <circle cx={p.x} cy={p.y} r={3} fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth={1.5} />
        </g>
      ))}

      {/* Labels with scores */}
      {axes.map((axis, i) => {
        const labelP = getPoint(i, 130);
        return (
          <g key={`label-${i}`}>
            <text
              x={labelP.x}
              y={labelP.y - 6}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground"
              fontSize={10}
              fontWeight={600}
            >
              {axis.shortLabel}
            </text>
            <text
              x={labelP.x}
              y={labelP.y + 7}
              textAnchor="middle"
              dominantBaseline="middle"
              className={cn(
                axis.score >= 75 ? "fill-[hsl(var(--success))]" : 
                axis.score >= 50 ? "fill-[hsl(var(--warning))]" : 
                "fill-[hsl(var(--destructive))]"
              )}
              fontSize={10}
              fontWeight={700}
            >
              {axis.score}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW CONNECTOR — Flèche verticale animée
// ═══════════════════════════════════════════════════════════════════════════════

function FlowConnector() {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="w-0.5 h-3 bg-gradient-to-b from-primary/40 to-primary/15 rounded-full" />
      <ChevronDown className="w-3.5 h-3.5 text-primary/40 -mt-0.5" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW STEP — Bloc du flux décisionnel
// ═══════════════════════════════════════════════════════════════════════════════

interface FlowStepProps {
  level: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accentClass: string;
  badge?: string | null;
  children?: React.ReactNode;
}

function FlowStep({ level, icon, title, subtitle, accentClass, badge, children }: FlowStepProps) {
  return (
    <div className="relative print:break-inside-avoid">
      {/* Level indicator */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
          {level}
        </span>
        {badge && (
          <Badge variant="outline" className="text-[8px] h-3.5 px-1.5 border-border/50">
            {badge}
          </Badge>
        )}
      </div>
      
      {/* Content */}
      <div className={cn(
        "relative p-3 rounded-xl border",
        "bg-gradient-to-r from-muted/40 to-muted/20",
        "border-border/40"
      )}>
        {/* Left accent bar */}
        <div className={cn("absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full", accentClass)} />
        
        <div className="pl-3 flex items-start gap-3">
          <div className={cn(
            "shrink-0 p-2 rounded-lg border",
            "bg-background/80 border-border/50",
            accentClass.replace("bg-", "text-").replace("/80", "")
          )}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold tracking-tight">{title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{subtitle}</p>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RACE READINESS PANEL — Sidebar
// ═══════════════════════════════════════════════════════════════════════════════

function ReadinessPanel({ readiness }: { readiness: TFCLCoachingCompassResult["readiness"] }) {
  if (readiness.potentielScore <= 0) return null;

  const colorClass = {
    success: "text-[hsl(var(--success))]",
    warning: "text-[hsl(var(--warning))]",
    destructive: "text-[hsl(var(--destructive))]",
  }[readiness.potentielColor] || "text-[hsl(var(--warning))]";

  const bgClass = {
    success: "bg-[hsl(var(--success)/0.08)] border-[hsl(var(--success)/0.15)]",
    warning: "bg-[hsl(var(--warning)/0.08)] border-[hsl(var(--warning)/0.15)]",
    destructive: "bg-[hsl(var(--destructive)/0.08)] border-[hsl(var(--destructive)/0.15)]",
  }[readiness.potentielColor] || "bg-[hsl(var(--warning)/0.08)] border-[hsl(var(--warning)/0.15)]";

  const governing = readiness.governingFactor === "availability" ? "Disponibilité" : "Potentiel";

  return (
    <div className={cn("rounded-xl border p-3 space-y-3", bgClass)}>
      <div className="flex items-center gap-2">
        <Shield className={cn("w-4 h-4", colorClass)} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Potentiel Physiologique
        </span>
      </div>

      {/* Score circle */}
      <div className="flex flex-col items-center">
        <div className={cn("text-3xl font-black tabular-nums", colorClass)}>
          {readiness.potentielScore}
        </div>
        <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
          {readiness.potentielLabel}
        </span>
      </div>

      {/* Bars */}
      <div className="space-y-2">
        <ReadinessBar 
          label="Potentiel" 
          value={readiness.potential} 
          isGoverning={readiness.governingFactor === "potential"} 
        />
        <ReadinessBar 
          label="Disponibilité" 
          value={readiness.availability} 
          isGoverning={readiness.governingFactor === "availability"} 
        />
      </div>

      {/* Governing factor */}
      <div className="text-center">
        <span className="text-[9px] text-muted-foreground/70">
          Facteur limitant : <span className="font-semibold text-muted-foreground">{governing}</span>
        </span>
      </div>
    </div>
  );
}

function ReadinessBar({ label, value, isGoverning }: { label: string; value: number; isGoverning: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className={cn("text-[10px]", isGoverning ? "font-semibold text-foreground" : "text-muted-foreground")}>
          {label}
          {isGoverning && <span className="ml-1 text-[8px] text-[hsl(var(--warning))]">●</span>}
        </span>
        <span className="text-[10px] font-bold tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isGoverning ? "bg-[hsl(var(--warning))]" : "bg-primary/60"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FATIGUE WARNING
// ═══════════════════════════════════════════════════════════════════════════════

function FatigueWarning({ warning }: { warning: NonNullable<TFCLCoachingCompassResult["fatigueWarning"]> }) {
  if (warning.level === "none") return null;
  
  const colors = {
    moderate: "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)]",
    high: "bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] border-[hsl(var(--accent)/0.2)]",
    critical: "bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.2)]",
    none: "",
  };

  return (
    <div className={cn("flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium", colors[warning.level])}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      {warning.message}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS GRID — Staff mode
// ═══════════════════════════════════════════════════════════════════════════════

function StaffMetricsGrid({ compass }: { compass: TFCLCoachingCompassResult }) {
  const profile = compass.profile;
  const isRunning = compass.meta?.sportFocus === "run";
  const metrics = [
    { key: "VO₂max", m: profile.vo2max },
    { key: "VLamax", m: profile.vlamax },
    ...(!isRunning ? [
      { key: "FTP", m: profile.ftp },
      { key: "FTP/kg", m: profile.ftpKg },
    ] : []),
    { key: "VMA", m: profile.vma ?? { value: null, confidence: 0 } },
    { key: "TTE", m: profile.tte },
    { key: "FatMax", m: profile.fatmax },
    { key: "LT1", m: profile.lt1 },
    { key: "LT2", m: profile.lt2 },
    ...(!isRunning ? [{ key: "W'", m: profile.wPrime }] : []),
    { key: "Éco.", m: profile.runningEconomy },
    { key: "Durabilité", m: profile.durability },
  ].filter(r => r.m?.value !== null);

  if (metrics.length === 0) return null;

  return (
    <div className="mt-3 p-2.5 rounded-lg bg-muted/20 border border-border/30">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 mb-2">
        Profil physiologique complet
      </p>
      <div className="grid grid-cols-3 gap-1">
        {metrics.map(({ key, m }) => (
          <div key={key} className="flex items-center justify-between p-1.5 rounded-md bg-background/40 text-[10px]">
            <span className="text-muted-foreground">{key}</span>
            <div className="flex items-center gap-1">
              <span className="font-semibold">
                {typeof m.value === "number" ? (m.value < 10 ? m.value.toFixed(2) : Math.round(m.value)) : "—"}
              </span>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                m.confidence >= 0.8 ? "bg-[hsl(var(--success))]" : 
                m.confidence >= 0.5 ? "bg-[hsl(var(--warning))]" : 
                "bg-[hsl(var(--destructive))]"
              )} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL — GRAPHIQUE SIGNATURE TFCL
// ═══════════════════════════════════════════════════════════════════════════════

export function CoachingCompassCard({ input, staffMode: initialStaffMode = false, className }: CoachingCompassCardProps) {
  const [staffMode, setStaffMode] = useState(initialStaffMode);

  const compass = useMemo(() => computeCoachingCompass(input), [input]);

  // ─── Données insuffisantes ───
  if (compass.meta.dataCompleteness < 10) {
    return (
      <Card className={cn("border-border/50 print:break-inside-avoid print:shadow-none", className)}>
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
              Renseignez au moins VMA (ou FTP), poids et VLamax dans un snapshot pour activer le Compass.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { limiter, leverage, decision, readiness } = compass;

  return (
    <Card className={cn("border-border/50 overflow-hidden print:break-inside-avoid print:shadow-none print:border-0", className)}>
      {/* ─── Header ─── */}
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
              <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-black tracking-tight">
                TFCL Coaching Compass™
              </CardTitle>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium tracking-wide hidden sm:block">
                PROFIL → LIMITEUR → LEVIER → DÉCISION
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStaffMode(!staffMode)}
            className="h-7 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground print:hidden"
          >
            {staffMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {staffMode ? "Athlète" : "Staff"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-3 sm:px-6">
        {/* ─── Fatigue Warning ─── */}
        {compass.fatigueWarning && compass.fatigueWarning.level !== "none" && (
          <div className="mb-3">
            <FatigueWarning warning={compass.fatigueWarning} />
          </div>
        )}

        {/* ═══ LAYOUT PRINCIPAL : Flux + Readiness ═══ */}
        <div className="flex gap-4">
          {/* ─── COLONNE GAUCHE : Flux décisionnel complet ─── */}
          <div className="flex-1 min-w-0">
            
            {/* NIVEAU 1 — PROFIL PHYSIOLOGIQUE (Radar) */}
            <div className="mb-1 print:break-inside-avoid">
              <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
                Niveau 1 — Profil physiologique
              </span>
              <div className="mt-1">
                <SignatureRadar axes={compass.radarAxes} size={240} />
              </div>
              
              {/* Completeness bar */}
              <div className="flex items-center gap-2 mt-1 px-2">
                <span className="text-[9px] text-muted-foreground/50 shrink-0">
                  Données : {compass.meta.dataCompleteness}%
                </span>
                <div className="flex-1 h-1 bg-muted/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary/40 rounded-full transition-all duration-500"
                    style={{ width: `${compass.meta.dataCompleteness}%` }}
                  />
                </div>
              </div>
            </div>

            <FlowConnector />

            {/* NIVEAU 2 — LIMITEUR PRINCIPAL */}
            <FlowStep
              level="Niveau 2 — Limiteur principal"
              icon={<AlertTriangle className="w-4 h-4" />}
              title={`${limiter.icon} ${limiter.label}`}
              subtitle={limiter.description}
              accentClass="bg-[hsl(var(--destructive)/0.8)]"
              badge={staffMode ? limiter.confidence : null}
            >
              {staffMode && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground">Impact :</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-bold border-[hsl(var(--destructive)/0.3)]">
                    {Math.round(limiter.impactScore * 100)}%
                  </Badge>
                  {limiter.metricsUsed.slice(0, 4).map(m => (
                    <Badge key={m} variant="outline" className="text-[8px] h-3.5 px-1 border-border/40 text-muted-foreground">
                      {m}
                    </Badge>
                  ))}
                </div>
              )}
            </FlowStep>

            <FlowConnector />

            {/* NIVEAU 3 — LEVIER PRIORITAIRE */}
            <FlowStep
              level="Niveau 3 — Levier prioritaire"
              icon={<Zap className="w-4 h-4" />}
              title={`${leverage.icon} ${leverage.label}`}
              subtitle={leverage.description}
              accentClass="bg-primary/80"
            >
              {/* Adaptations attendues */}
              <div className="mt-2 flex flex-wrap gap-1">
                {leverage.expectedAdaptations.map(a => (
                  <span key={a} className="inline-flex items-center text-[9px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">
                    {a}
                  </span>
                ))}
              </div>
            </FlowStep>

            <FlowConnector />

            {/* NIVEAU 4 — DÉCISION COACHING */}
            <FlowStep
              level="Niveau 4 — Décision coaching"
              icon={<Target className="w-4 h-4" />}
              title={decision.recommendedBlock}
              subtitle={staffMode ? decision.coachRationale : decision.athleteMessage}
              accentClass="bg-[hsl(var(--success)/0.8)]"
            >
              <div className="mt-2 space-y-1.5">
                {/* Duration & workouts */}
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {decision.durationWeeks} semaines
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Dumbbell className="w-3 h-3" />
                    {decision.primaryWorkouts.length} séances clés
                  </span>
                </div>

                {/* Workout examples */}
                {staffMode && decision.primaryWorkouts.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {decision.primaryWorkouts.map(w => (
                      <span key={w} className="text-[9px] px-1.5 py-0.5 rounded bg-[hsl(var(--success)/0.08)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.12)]">
                        {w}
                      </span>
                    ))}
                  </div>
                )}

                {/* Targets */}
                <div className="flex flex-wrap gap-1">
                  {decision.physiologicalTargets.map(t => (
                    <Badge key={t} variant="secondary" className="text-[9px] h-4 px-1.5">
                      🎯 {t}
                    </Badge>
                  ))}
                </div>

                {/* Prohibitions */}
                {decision.prohibitions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {decision.prohibitions.map(p => (
                      <Badge key={p} variant="destructive" className="text-[9px] h-4 px-1.5">
                        🚫 {p}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </FlowStep>

            {/* ─── Staff: Profil complet ─── */}
            {staffMode && <StaffMetricsGrid compass={compass} />}
          </div>

          {/* ─── COLONNE DROITE : Potentiel Physiologique (desktop) ─── */}
          <div className="hidden md:block w-[160px] shrink-0 pt-6">
            <ReadinessPanel readiness={readiness} />
          </div>
        </div>

        {/* ─── Potentiel Physiologique mobile ─── */}
        <div className="md:hidden mt-3">
          <ReadinessPanel readiness={readiness} />
        </div>

        {/* ─── Disclaimer ─── */}
        {staffMode && (
          <p className="text-[8px] text-muted-foreground/40 text-center mt-3">
            {compass.meta.disclaimer} — v{compass.meta.version}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
