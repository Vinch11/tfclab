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

import { useId, useMemo, useState } from "react";
import { CompassProfileComparison } from "./CompassProfileComparison";
import { CompassCoachReading } from "./CompassCoachReading";
import { CompassMetabolicOverview } from './CompassMetabolicOverview';
import { buildProfileComparisons } from '@/lib/coachingCompass/profileComparison';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Compass, Target, AlertTriangle, 
  Eye, EyeOff, Zap, Info, Clock, Dumbbell,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeCoachingCompass, getDurabilityTargetMinutes, type CoachingCompassInput, type TFCLCoachingCompassResult, type RadarAxis } from "@/lib/coachingCompass";
import { dashboardCoverage } from '@/lib/coachingCompass/dashboardConsistency';
import { axisAssessment, metricSourceLabel } from "@/lib/coachingCompass/presentation";
import { readCommittedLimiterPolicy } from "@/lib/plan/coachLimiterPolicyStorage";
import { LimiterImpactCard } from "@/components/LimiterImpactCard";
import { RunningCompassDiagnosis } from './RunningCompassDiagnosis';
import { getTargetsForAmbition, getVLamaxRange, getVmaTargetByAmbition } from "@/lib/physiologicalTargets";
import { getVo2maxTarget, getPerformanceAgeFactor } from "@/lib/v2/unifiedLimiterDetection";
import type { AmbitionLevel } from "@/types/ambitionLevel";

// Local wording only: detailed provenance remains unchanged in reports and stored data.
const compassSourceLabel = (source: string) => source === 'snapshot'
  ? 'Repère enregistré : son interprétation dépend du test réalisé et des conditions de mesure.'
  : metricSourceLabel(source);

// ═══════════════════════════════════════════════════════════════════════════════
// EXPLICATIONS PÉDAGOGIQUES — Axes du radar
// ═══════════════════════════════════════════════════════════════════════════════

const AXIS_PEDAGOGY: Record<string, { short: string; detail: string }> = {
  aerobic: {
    short: "Capacité Aérobie (FTP/kg ou VMA)",
    detail: "Mesure la puissance de ton « moteur » aérobie. Plus le score est élevé, plus tu peux soutenir une intensité forte sur longue durée.",
  },
  vo2max: {
    short: "Moteur aérobie — VO₂max",
    detail: "La VO₂max représente la quantité maximale d’oxygène que ton corps peut utiliser. Un écart à la cible peut limiter ton potentiel aérobie, mais la performance dépend aussi du seuil, de l’économie et de l’endurance spécifique.",
  },
  vma: {
    short: "Vitesse maximale aérobie — VMA",
    detail: "La VMA représente ta vitesse à forte sollicitation aérobie. Si elle reste sous la cible de ton objectif, elle peut limiter ta réserve de vitesse ; elle ne correspond pas à une allure soutenable pendant toute la course.",
  },
  ftpkg: {
    short: "Puissance au seuil relative au poids",
    detail: "La puissance au seuil rapportée à ton poids situe ta capacité à soutenir un effort vélo exigeant. Un écart à la cible peut freiner ta performance, particulièrement en montée ; il ne décrit pas ta capacité en course à pied.",
  },
  vlamax: {
    short: "VLamax (Glycolyse)",
    detail: "Profil glycolytique, à interpréter selon sa provenance et les exigences de l’épreuve.",
  },
  fatmax: {
    short: "FatMax (Oxydation des graisses)",
    detail: "Intensité estimée ou mesurée d’oxydation lipidique maximale. Ce repère seul ne mesure ni l’endurance longue ni la quantité de graisses oxydées.",
  },
  tte: {
    short: "Endurance au seuil — TTE",
    detail: "Temps tenu au seuil : une estimation ou une durée minimale ne constitue pas un test jusqu’à épuisement. Ce repère ne mesure pas la robustesse après plusieurs heures.",
  },
  wprime: {
    short: "W′ (Capacité Anaérobie)",
    detail: "Travail disponible au-dessus de la puissance critique dans les limites du modèle. Information pour les efforts intenses ; ce n’est pas une mesure de force ou de robustesse Ironman.",
  },
  economy: {
    short: "Économie de mouvement",
    detail: "Efficience du geste sportif : moins d'énergie gaspillée pour une même vitesse ou puissance. Inclut la cadence, la technique et le rendement musculaire.",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPLICATIONS PÉDAGOGIQUES — Niveaux du flux
// ═══════════════════════════════════════════════════════════════════════════════

const FLOW_PEDAGOGY = {
  limiter: "Une priorité du modèle n’est pas une cause démontrée : un TTE estimé, W′ ou une économie faible ne prouvent pas une faiblesse de robustesse ou de force.",
  leverage: "Le levier est une orientation à confronter aux observations propres au sport, pas la preuve d’un mécanisme causal.",
  decision: "La décision coaching traduit l'analyse en plan d'action concret : type de bloc, durée, séances clés et interdictions.",
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface CoachingCompassCardProps {
  input: CoachingCompassInput;
  athleteName?: string;
  staffMode?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RADAR CHART — SVG avec zone optimale
// ═══════════════════════════════════════════════════════════════════════════════

function SignatureRadar({ axes, size = 320 }: { axes: RadarAxis[]; size?: number }) {
  const glowId = useId();
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.32;
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

  const scoreColor = (s: number) =>
    s >= 75 ? "hsl(var(--success))" : s >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px] sm:max-w-[320px] mx-auto select-none">
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.08" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background glow */}
      <circle cx={cx} cy={cy} r={r * 1.15} fill={`url(#${glowId})`} />

      {/* Grid levels with labels */}
      {levels.map(level => {
        const points = Array.from({ length: n }, (_, i) => {
          const p = getPoint(i, level);
          return `${p.x},${p.y}`;
        }).join(" ");
        return (
          <g key={level}>
            <polygon
              points={points}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={level === 100 ? 1 : level === 75 ? 0.7 : 0.3}
              opacity={level === 75 ? 0.5 : 0.3}
              strokeDasharray={level === 75 ? "3,2" : "none"}
            />
            {/* Level label on first axis */}
            <text
              x={getPoint(0, level).x + 3}
              y={getPoint(0, level).y - 3}
              fontSize={7}
              className="fill-muted-foreground"
              opacity={0.4}
            >
              {level}
            </text>
          </g>
        );
      })}

      {/* Optimal zone (green) */}
      <path
        d={optimalPath}
        fill="hsl(var(--success) / 0.08)"
        fillRule="evenodd"
        stroke="hsl(var(--success) / 0.2)"
        strokeWidth={0.7}
      />

      {/* Axis lines */}
      {axes.map((_, i) => {
        const p = getPoint(i, 105);
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

      {/* Data polygon — filled with gradient effect */}
      {axes.every(axis => axis.value != null && axis.value > 0 && axis.target != null) && <polygon
        points={polygonStr}
        fill="hsl(var(--primary) / 0.15)"
        stroke="hsl(var(--primary))"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />}

      {/* Data points with colored halos */}
      {dataPoints.map((p, i) => axes[i].value != null && axes[i].target != null ? (
        <g key={`dot-${i}`}>
          <circle cx={p.x} cy={p.y} r={8} fill={`${scoreColor(axes[i].score)}`.replace(")", " / 0.12)")} />
          <circle cx={p.x} cy={p.y} r={4.5} fill={scoreColor(axes[i].score)} stroke="hsl(var(--background))" strokeWidth={2} />
        </g>
      ) : null)}

      {/* Labels with emoji, name, score and value */}
      {axes.map((axis, i) => {
        const labelP = getPoint(i, 135);
        const pedagogy = AXIS_PEDAGOGY[axis.key];
        const emoji = axis.key === "aerobic" ? "⚡" : axis.key === "vlamax" ? "🔬" : axis.key === "fatmax" ? "🔥" : axis.key === "durability" ? "🛡️" : axis.key === "wprime" ? "💥" : "🎯";
        
        return (
          <g key={`label-${i}`}>
            {/* Emoji */}
            <text
              x={labelP.x}
              y={labelP.y - 14}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
            >
              {emoji}
            </text>
            {/* Axis name */}
            <text
              x={labelP.x}
              y={labelP.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground"
              fontSize={10}
              fontWeight={700}
            >
              {axis.shortLabel}
            </text>
            {/* Score */}
            <text
              x={labelP.x}
              y={labelP.y + 13}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={axis.value != null && axis.target != null ? scoreColor(axis.score) : "hsl(var(--muted-foreground))"}
              fontSize={12}
              fontWeight={800}
            >
              {axis.value != null && axis.value > 0 && axis.target != null ? `${axis.score}/100` : axis.value != null && axis.value > 0 ? `${axis.value.toFixed(1)} ${axis.unit}` : "—"}
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

// ReadinessPanel supprimé — la "Disponibilité" ne peut pas être établie précisément.
// Seul le Fatigue Warning (issu du snapshot) est conservé.

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPS DE COURSE CIBLE
// ═══════════════════════════════════════════════════════════════════════════════

function formatTargetRaceDuration(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = Math.round(totalMin % 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m} min`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FATIGUE WARNING
// ═══════════════════════════════════════════════════════════════════════════════

function FatigueWarning({ warning }: { warning: NonNullable<TFCLCoachingCompassResult["fatigueWarning"]> }) {
  if (warning.level === "none" || !warning.message) return null;
  
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

const METRIC_EXPLANATIONS: Record<string, { desc: string; why: string }> = {
  "VO₂max": {
    desc: "Consommation maximale d'oxygène — capacité du moteur aérobie",
    why: "Plus il est élevé, plus vous pouvez soutenir une intensité élevée longtemps. Déterminant principal en endurance.",
  },
  "VLamax": {
    desc: "Vitesse maximale de production de lactate — puissance glycolytique",
    why: "Une VLamax basse favorise l'endurance (marathon, IM). Une VLamax haute favorise le sprint. La cible dépend de votre objectif.",
  },
  "FTP": {
    desc: "Puissance au seuil fonctionnel — intensité tenable ~1h",
    why: "Repère clé pour calibrer toutes les zones d'entraînement vélo. Reflète l'équilibre VO₂max × VLamax.",
  },
  "FTP/kg": {
    desc: "Puissance au seuil rapportée au poids",
    why: "Indicateur de performance en montée et sur parcours vallonnés. Permet la comparaison entre athlètes.",
  },
  "VMA": {
    desc: "Vitesse maximale aérobie — vitesse à VO₂max",
    why: "Base de calcul des allures d'entraînement en course à pied. Corrélée directement au VO₂max.",
  },
  "TTE": {
    desc: "Time to Exhaustion — durée tenable au seuil",
    why: "Mesure la résistance à la fatigue au seuil. Un TTE élevé signifie une meilleure capacité à tenir l'effort en compétition.",
  },
  "FatMax": {
    desc: "Puissance d'oxydation maximale des graisses",
    why: "Intensité où vous brûlez le plus de graisses. Cruciale en ultra-endurance pour préserver les réserves de glycogène.",
  },
  "LT1": {
    desc: "Seuil lactique 1 — seuil aérobie",
    why: "Limite supérieure de la zone d'endurance fondamentale. En dessous, le lactate reste stable.",
  },
  "LT2": {
    desc: "Seuil lactique 2 — seuil anaérobie",
    why: "Intensité maximale soutenable en état d'équilibre. Au-dessus, le lactate s'accumule rapidement.",
  },
  "W'": {
    desc: "Travail disponible au-dessus de la puissance critique",
    why: "Paramètre d'un modèle CP/W′, spécifique au sport et aux efforts retenus ; ni VLamax, ni mesure globale de capacité anaérobie.",
  },
  "Éco.": {
    desc: "Économie de course — coût énergétique du mouvement",
    why: "À VO₂max et VLamax égaux, l'athlète le plus économique ira plus vite. Améliorable par la technique et le renforcement.",
  },
  "Durabilité": {
    desc: "Résistance à la dégradation des capacités après effort prolongé",
    why: "Le TTE au seuil et la dérive cardiaque ne suffisent pas à mesurer la durabilité. Un protocole prolongé documenté est nécessaire.",
  },
};

function StaffMetricsGrid({ compass, sportFocus, input }: { compass: TFCLCoachingCompassResult; sportFocus?: string | null; input: CoachingCompassInput }) {
  const profile = compass.profile;
  const isRunning = compass.presentation?.sport === 'run' || sportFocus === "run";

  const ambition = (input.ambition || "age_group") as AmbitionLevel;
  const objectif = input.objectif || "IM";
  const vlamaxRange = getVLamaxRange(objectif, ambition, isRunning ? "cap" : "bike");
  const displayAxes = compass.presentation?.axes ?? compass.radarAxes;
  const targetFor = (_key: string): number | null => null; // Targets are shown once in the audited profile view.
  const metricTargets: Record<string, { target: number | null; inverse?: boolean }> = {
    "VO₂max": { target: targetFor("vo2max") }, "VLamax": { target: targetFor("vlamax"), inverse: true },
    "FTP": { target: input.poids && targetFor("ftpkg") ? Math.round((targetFor("ftpkg") ?? 0) * input.poids) : null },
    "FTP/kg": { target: targetFor("ftpkg") }, "VMA": { target: targetFor("vma") },
    "TTE": { target: targetFor("tte") }, "FatMax": { target: targetFor("fatmax") },
    "W'": { target: targetFor("wprime") }, "Éco.": { target: null },
  };

  // Running mode: convert LT1/LT2 from watts to % VMA
  const vma = input.vma;
  const ftp = input.ftp;
  const lt1PctFtp = input.lactateThresholds?.lt1?.pct_of_ftp;
  const lt2PctFtp = input.lactateThresholds?.lt2?.pct_of_ftp;

  // Estimate % VMA from % FTP (FTP ≈ 83% VMA in running)
  // pct_of_ftp is already 0-1 decimal OR 0-100 percentage — normalize
  const normPct = (v: number | undefined) => {
    if (v == null) return null;
    return v > 1 ? v / 100 : v; // handle both 0.77 and 77 formats
  };
  const lt1Ratio = normPct(lt1PctFtp);
  const lt2Ratio = normPct(lt2PctFtp);
  const ftpPctVma = 0.83; // standard: FTP ≈ 83% VMA
  const lt1PctVma = lt1Ratio ? Math.round(lt1Ratio * ftpPctVma * 100) : null;
  const lt2PctVma = lt2Ratio ? Math.round(lt2Ratio * ftpPctVma * 100) : null;

  // Build running-aware LT metrics
  const lt1Running = isRunning ? {
    ...profile.lt1,
    value: null,
    unit: "% VMA",
  } : profile.lt1;

  const lt2Running = isRunning ? {
    ...profile.lt2,
    value: input.paceThresholdSecPerKm && input.paceThresholdSecPerKm > 0 ? 3600 / input.paceThresholdSecPerKm : null,
    unit: "km/h",
    source: input.paceThresholdSecPerKm ? 'snapshot' : 'unknown',
  } : profile.lt2;

  const metrics = [
    { key: "VO₂max", m: profile.vo2max, secondaryInfo: null as string | null },
    { key: "VLamax", m: profile.vlamax, secondaryInfo: null as string | null },
    ...(!isRunning ? [
      { key: "FTP", m: profile.ftp, secondaryInfo: null as string | null },
      { key: "FTP/kg", m: profile.ftpKg, secondaryInfo: null as string | null },
    ] : []),
    { key: "VMA", m: profile.vma ?? { value: null, confidence: 0, source: "unknown", lastUpdated: null, unit: "km/h" }, secondaryInfo: null as string | null },
    { key: "TTE", m: profile.tte, secondaryInfo: null as string | null },
    ...(!isRunning ? [{ key: "FatMax", m: profile.fatmax, secondaryInfo: null as string | null }] : []),
    { key: "LT1", m: lt1Running, secondaryInfo: null as string | null },
    { key: "LT2", m: lt2Running, secondaryInfo: null as string | null },
    { key: "Éco.", m: profile.runningEconomy, secondaryInfo: null as string | null },

  ].filter(r => r.m?.value !== null);

  if (metrics.length === 0) return null;

  const confidenceLabel = (c: number) =>
    c >= 0.8 ? "Fiable" : c >= 0.5 ? "Modérée" : "Faible";
  const sourceLabel = compassSourceLabel;

  const formatVal = (v: number, isSmall: boolean) => isSmall ? v.toFixed(2) : String(Math.round(v));

  return (
    <section aria-label="Profil physiologique complet" className="mt-5">
      <h3 className="py-2 text-base font-semibold">Profil physiologique complet</h3>
        <div className="pb-3 divide-y divide-border">
          {metrics.map(({ key, m, secondaryInfo }) => {
            const expl = METRIC_EXPLANATIONS[key];
            const comparisonKey = ({ 'VO₂max': 'vo2max', 'VLamax': 'vlamax', 'FTP/kg': 'ftpkg', 'VMA': 'vma', 'TTE': 'tte', 'FatMax': 'fatmax' } as Record<string, string>)[key];
            const comparison = buildProfileComparisons(input, compass).find(g => g.sport === (isRunning ? 'run' : 'bike'))?.metrics.find(metric => metric.key === comparisonKey);
            const tgt = metricTargets[key];
            const target = tgt?.target;
            const inverse = tgt?.inverse ?? false;
            const isSmall = typeof m.value === "number" && m.value < 10;

            // Delta calculation
            let delta: number | null = null;
            let deltaLabel = "";
            let deltaPositive = false;
            if (typeof m.value === "number" && target != null) {
              if (inverse) {
                delta = target - m.value;
                deltaPositive = delta >= 0;
              } else {
                delta = m.value - target;
                deltaPositive = delta >= 0;
              }
              const absDelta = Math.abs(delta);
              const formatted = absDelta < 10 ? absDelta.toFixed(1) : String(Math.round(absDelta));
              deltaLabel = deltaPositive
                ? `✓ +${formatted} d'avance`
                : `Δ ${formatted} à combler`;
            }

            return (
              <div key={key} className="py-4">
                {/* Main row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground">{key}</span>
                    <span className="text-xs text-muted-foreground">{m.unit}</span>
                    {expl && <Popover><PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-11 w-11 text-muted-foreground" aria-label={`Explication ${key}`}><Info className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="max-w-[calc(100vw-2rem)] space-y-2"><p className="text-sm">{expl.desc}</p><p className="text-sm text-muted-foreground">{expl.why}</p><p className="text-xs text-muted-foreground">{sourceLabel(m.source)}</p></PopoverContent></Popover>}
                  </div>
                  <div className="flex items-center gap-2">
                    {secondaryInfo && (
                      <span className="text-[8px] text-muted-foreground/60">{secondaryInfo}</span>
                    )}
                    <span className="text-xl font-semibold tabular-nums text-foreground">
                      {typeof m.value === "number" ? formatVal(m.value, isSmall) : "—"}
                    </span>
                    <div className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-medium",
                      m.confidence >= 0.8 ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]" : 
                      m.confidence >= 0.5 ? "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]" : 
                      "bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]"
                    )}>
                      {confidenceLabel(m.confidence)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="relative h-3 rounded-sm bg-muted" aria-label={`${key} : ${m.value ?? 'Données insuffisantes'} ; ${comparison?.reference ? 'comparaison à la cible TFCL' : 'cible non définie'}`}>
                    {comparison?.reference && <span className="absolute inset-y-0 rounded-sm bg-success/25 border border-success/40" style={{left: `${comparison.lowPosition ?? 0}%`, width: `${Math.max((comparison.highPosition ?? 0) - (comparison.lowPosition ?? 0), 1)}%`}} />}
                    {comparison?.position != null && <span className="absolute -top-1 h-5 w-1 rounded-sm bg-foreground ring-2 ring-background" style={{left: `${comparison.position}%`}} />}
                  </div>
                  <p className="text-xs text-muted-foreground">{comparison?.reference ? `Cible TFCL : ${comparison.reference.low.toLocaleString('fr-BE')}${comparison.reference.high !== comparison.reference.low ? `–${comparison.reference.high.toLocaleString('fr-BE')}` : ''} ${m.unit}` : 'Repère sans cible comparative définie'}</p>
                </div>
                {/* Target comparison row */}
                {target != null && typeof m.value === "number" && (
                  <div className="flex items-center gap-2 px-2.5 py-1 bg-muted/30 flex-wrap">
                    <span className="text-[9px] text-muted-foreground">
                      Actuel <span className="font-semibold text-foreground">{formatVal(m.value, isSmall)}</span> {m.unit}
                    </span>
                    <span className="text-[9px] text-muted-foreground">→</span>
                    <span className="text-[9px] text-muted-foreground">
                      Cible <span className="font-semibold text-foreground">{formatVal(target, target < 10)}</span> {m.unit}
                      {key === "VLamax" && vlamaxRange && (
                        <span className="ml-1 text-[9px] text-muted-foreground/60 font-normal">
                          ({vlamaxRange.min.toFixed(2)}–{vlamaxRange.max.toFixed(2)})
                        </span>
                      )}
                    </span>
                    {delta !== null && (
                      <span className={cn(
                        "text-[8px] font-medium px-1.5 py-0.5 rounded-full",
                        deltaPositive
                          ? "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]"
                          : "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]"
                      )}>
                        {deltaLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL — GRAPHIQUE SIGNATURE TFCL
// ═══════════════════════════════════════════════════════════════════════════════

export function CoachingCompassCard({ input, athleteName, staffMode: initialStaffMode = false, className }: CoachingCompassCardProps) {
  const [staffMode, setStaffMode] = useState(initialStaffMode);

  const compass = useMemo(() => computeCoachingCompass(input), [input]);
  const coverage = useMemo(() => dashboardCoverage(input), [input]);
  const coachPolicy = useMemo(() => input.athleteId
    ? readCommittedLimiterPolicy(localStorage, input.athleteId, input.objectif) : null,
    [input.athleteId, input.objectif]);

  const { limiter, leverage, decision } = compass;
  const presentation = compass.presentation;
  const displayAxes = presentation?.axes ?? compass.radarAxes;
  const disciplineAxes = presentation?.disciplineAxes;
  const explanationAxes = disciplineAxes ? [...disciplineAxes.bike, ...disciplineAxes.run] : displayAxes;
  const _ambition = (input.ambition || "age_group") as AmbitionLevel;
  const _objectif = input.objectif || "IM";
  const _sportForTargets =
    input.sportFocus === "run" ? "cap" :
    input.sportFocus === "bike" ? "bike" :
    input.sportFocus === "triathlon" ? "tri" :
    undefined;
  const vlamaxRange = getVLamaxRange(_objectif, _ambition, _sportForTargets);

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
                OBJECTIF · AMBITION · REPÈRES
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

        {decision.prohibitions.length > 0 && <div className="mb-4 flex flex-wrap gap-2" aria-label="Précautions importantes">{decision.prohibitions.map(p => <Badge key={p} variant="outline" className="whitespace-normal text-warning">{p}</Badge>)}</div>}
        <CompassProfileComparison input={input} compass={compass} athleteName={athleteName} />
        <StaffMetricsGrid compass={compass} sportFocus={input.sportFocus} input={input} />
        <CompassMetabolicOverview input={input} />
        <section aria-label="Synthèse du coach" className="space-y-2 border-t border-border py-4"><h3 className="text-sm font-semibold">Priorités de travail</h3><p className="text-sm">{presentation?.priorityMetrics.join(' → ') || limiter.label}</p>{coachPolicy && <p className="text-xs text-muted-foreground">Ordre coach : {coachPolicy.limiterOrder.join(' → ')}</p>}<p className="text-xs text-muted-foreground">Cibles TFCL : repères de coaching, pas des normes scientifiques validées. Une donnée manquante n’est pas une faiblesse.</p></section>
        <Accordion type="multiple" className="mt-4 text-muted-foreground">
        <AccordionItem value="explanations" className="border-0"><AccordionTrigger className="min-h-11 justify-start gap-2 py-2 text-xs font-normal">Détails, tests et sources</AccordionTrigger><AccordionContent className="text-foreground">
        <CompassProfileComparison input={input} compass={compass} detailsOnly />
        <CompassCoachReading input={input} compass={compass} coachOrder={coachPolicy?.limiterOrder} />
        <section className="mt-5 space-y-4" aria-label="Explications du profil">
          <p className="text-xs text-muted-foreground">Couverture des repères du sport : {coverage.filled}/{coverage.total}</p>
          <h3 className="text-sm font-semibold">Profil physiologique — Actuel et cible</h3>
          {explanationAxes.map((axis,index) => <div key={`${axis.key}-${index}`} className="border-b border-border pb-4">
            {disciplineAxes && <p className="mb-1 text-xs text-muted-foreground">{index < disciplineAxes.bike.length ? 'Vélo' : 'Course à pied'}</p>}
            <div className="flex flex-wrap justify-between gap-2"><h4 className="text-sm font-semibold">{AXIS_PEDAGOGY[axis.key]?.short ?? axis.label}</h4><span className="text-xs text-muted-foreground">{axisAssessment(axis)}</span></div>
            <p className="mt-2 text-sm tabular-nums">Actuel : {axis.value != null && axis.value > 0 ? `${axis.value.toLocaleString('fr-BE',{maximumFractionDigits:2})} ${axis.unit}` : 'Données insuffisantes'}{axis.target != null && axis.target > 0 ? ` → Cible interne : ${axis.target.toLocaleString('fr-BE',{maximumFractionDigits:2})} ${axis.unit}` : ' · Cible non définie, aucun déficit conclu.'}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{AXIS_PEDAGOGY[axis.key]?.detail}</p>
            <p className="mt-1 text-xs text-muted-foreground">{compassSourceLabel(axis.source ?? 'unknown')}</p>
          </div>)}
          {compass.economyModifier && <div className="border-b border-border pb-4"><h4 className="text-sm font-semibold">Modulateur — Efficience</h4><p className="mt-1 text-sm">{compass.economyModifier.label}</p><p className="mt-2 text-sm text-muted-foreground">Coût énergétique du mouvement. Multiplicateur des 4 piliers : améliore le rendement sans changer le plafond physiologique.</p></div>}
          <p className="text-xs text-muted-foreground">VO₂max : même repère du bilan, pas deux tests propres à chaque sport. TTE vélo et course sont comparés séparément ; ils ne mesurent pas la robustesse après plusieurs heures.</p>
          <div><h3 className="text-sm font-semibold">Informations complémentaires</h3><p className="mt-2 text-sm">Robustesse à l’effort prolongé : durabilité non évaluée</p>{presentation?.tteBike && <p className="mt-1 text-sm">TTE vélo : {presentation.tteBike.tte_min > 0 ? `${presentation.tteBike.tte_min} min` : 'Données insuffisantes'} · {compassSourceLabel(presentation.tteBike.source)}</p>}{presentation?.tteRun && <p className="mt-1 text-sm">TTE course : {presentation.tteRun.tte_min > 0 ? `${presentation.tteRun.tte_min} min` : 'Données insuffisantes'} · {compassSourceLabel(presentation.tteRun.source)}</p>}</div>
        </section>
          <section className="mt-5"><h3 className="mb-3 text-sm font-semibold">Tests et données</h3>
            <p className="mb-3 text-sm text-muted-foreground">Repères disponibles : {coverage.filled}/{coverage.total}. Les dates de tests et les protocoles absents ne sont pas déduits de la date du bilan.</p>
            {input.targetRacePrediction && <p className="mb-3 text-sm">Temps de course cible estimé : {formatTargetRaceDuration(input.targetRacePrediction.targetRaceDurationMin)} · estimation, pas une garantie de résultat.</p>}
            {presentation && <div className="space-y-3">{presentation.sportReferences.map(r => <p key={`${r.sport}-${r.label}`} className="text-sm">{r.sport === 'running' ? 'Course' : 'Vélo'} · {r.label} : {r.value != null ? `${r.value.toFixed(r.unit === 'kJ' || r.unit === 'km/h' ? 1 : 0)} ${r.unit}` : 'Données insuffisantes'}<span className="block text-muted-foreground">{compassSourceLabel(r.source)}{r.conditions && ` · ${r.conditions}`}</span></p>)}
              <p className="text-sm text-muted-foreground">W′/D′ : réserves spécifiques aux efforts et au capteur, pas une note générale de capacité anaérobie.</p>
              {presentation.decouplingRun != null && <p className="text-sm">Découplage course : {presentation.decouplingRun} % · à interpréter avec durée, intensité et conditions.</p>}
              <p className="text-sm text-muted-foreground">Le TTE ne mesure pas la robustesse après effort prolongé.</p>
            </div>}
          </section>
          <section className="mt-5"><h3 className="mb-3 text-sm font-semibold">Diagnostic et choix du coach</h3>
            {presentation?.runningDiagnostic && <RunningCompassDiagnosis diagnostic={presentation.runningDiagnostic} />}
            {presentation?.cyclingDiagnostic && <RunningCompassDiagnosis diagnostic={presentation.cyclingDiagnostic} sport="bike" />}
            {coachPolicy && <p className="mt-4 text-sm">Ordre coach enregistré : {coachPolicy.limiterOrder.join(' → ')}</p>}
            <p className="mt-4 text-sm text-muted-foreground">Priorités du plan conservées : {presentation?.priorityMetrics.join(' → ') || limiter.label}.</p>
        {/* ═══ LAYOUT PRINCIPAL : Flux + Readiness ═══ */}
        <div className="flex gap-4">
          {/* ─── COLONNE GAUCHE : Flux décisionnel complet ─── */}
          <div className="flex-1 min-w-0">
            
            {/* NIVEAU 2 — LIMITEUR PRINCIPAL */}
            <FlowStep
              level="Niveau 2 — Priorité historique du plan"
              icon={<AlertTriangle className="w-4 h-4" />}
              title={`${limiter.icon} ${limiter.label}`}
              subtitle="Classement conservé ; les diagnostics par sport ci-dessus précisent les écarts, les sources et les limites."
              accentClass="bg-[hsl(var(--destructive)/0.8)]"
              badge={staffMode ? limiter.confidence : null}
            >
              <p className="text-[10px] text-muted-foreground mt-1.5 italic leading-relaxed">
                💡 {FLOW_PEDAGOGY.limiter}
              </p>

              {/* Pourquoi c'est important ? — impact concret (terrain + mécanisme) */}
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">W′ reste un repère de travail au-dessus de CP ; l’économie module l’efficience. La durabilité nécessite des efforts frais/après charge documentés.</p>
              </div>

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
              subtitle="Piste du moteur historique, à valider avec le coach selon le sport, les tests et la charge réelle."
              accentClass="bg-primary/80"
            >
              <p className="text-[10px] text-muted-foreground mt-1.5 italic leading-relaxed">
                💡 {FLOW_PEDAGOGY.leverage}
              </p>
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
              subtitle="Orientation indicative, pas un bloc ni des séances déjà individualisés et validés."
              accentClass="bg-[hsl(var(--success)/0.8)]"
            >
              <p className="text-[10px] text-muted-foreground mt-1.5 italic leading-relaxed">
                💡 {FLOW_PEDAGOGY.decision}
              </p>
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

                <p className="text-xs text-muted-foreground">Séances à préciser dans le plan avec les repères du sport : domaine modéré (LT1), sous-seuil, MLSS ou VO₂max ; aucune conversion des watts vélo en allures course.</p>

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

          </div>
        </div>

          </section>
          </AccordionContent></AccordionItem>
        </Accordion>
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
