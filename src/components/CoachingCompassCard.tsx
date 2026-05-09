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
  Eye, EyeOff, Zap, Info, Clock, Dumbbell,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { computeCoachingCompass, type CoachingCompassInput, type TFCLCoachingCompassResult, type RadarAxis } from "@/lib/coachingCompass";
import { LimiterImpactCard } from "@/components/LimiterImpactCard";
import { getTargetsForAmbition, getVLamaxRange, getVmaTargetByAmbition } from "@/lib/physiologicalTargets";
import type { AmbitionLevel } from "@/types/ambitionLevel";

// ═══════════════════════════════════════════════════════════════════════════════
// EXPLICATIONS PÉDAGOGIQUES — Axes du radar
// ═══════════════════════════════════════════════════════════════════════════════

const AXIS_PEDAGOGY: Record<string, { short: string; detail: string }> = {
  aerobic: {
    short: "Capacité Aérobie (FTP/kg ou VMA)",
    detail: "Mesure la puissance de ton « moteur » aérobie. Plus le score est élevé, plus tu peux soutenir une intensité forte sur longue durée.",
  },
  vlamax: {
    short: "VLamax (Glycolyse)",
    detail: "Vitesse de production de lactate. Un score élevé signifie une VLamax basse et bien maîtrisée — tu brûles plus de graisses et moins de glycogène.",
  },
  fatmax: {
    short: "FatMax (Oxydation des graisses)",
    detail: "Intensité à laquelle tu brûles le plus de graisses. Plus ce score est haut, mieux tu épargnes tes réserves de glycogène en course.",
  },
  durability: {
    short: "Robustesse (Durabilité)",
    detail: "Résistance à la dégradation de la performance dans le temps. Combine TTE, dérive cardiaque et stabilité de la puissance/allure.",
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
  limiter: "Le limiteur est le maillon faible qui freine le plus ta progression. C'est le premier facteur à corriger pour progresser efficacement.",
  leverage: "Le levier est la stratégie d'entraînement la plus efficace pour corriger ton limiteur. Il cible le mécanisme physiologique en cause.",
  decision: "La décision coaching traduit l'analyse en plan d'action concret : type de bloc, durée, séances clés et interdictions.",
};

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

function SignatureRadar({ axes, size = 320 }: { axes: RadarAxis[]; size?: number }) {
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
        <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.08" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background glow */}
      <circle cx={cx} cy={cy} r={r * 1.15} fill="url(#radar-glow)" />

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
      <polygon
        points={polygonStr}
        fill="hsl(var(--primary) / 0.15)"
        stroke="hsl(var(--primary))"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />

      {/* Data points with colored halos */}
      {dataPoints.map((p, i) => (
        <g key={`dot-${i}`}>
          <circle cx={p.x} cy={p.y} r={8} fill={`${scoreColor(axes[i].score)}`.replace(")", " / 0.12)")} />
          <circle cx={p.x} cy={p.y} r={4.5} fill={scoreColor(axes[i].score)} stroke="hsl(var(--background))" strokeWidth={2} />
        </g>
      ))}

      {/* Labels with emoji, name, score and value */}
      {axes.map((axis, i) => {
        const labelP = getPoint(i, 135);
        const pedagogy = AXIS_PEDAGOGY[axis.key];
        const emoji = axis.key === "aerobic" ? "⚡" : axis.key === "vlamax" ? "🔬" : axis.key === "fatmax" ? "🔥" : axis.key === "durability" ? "🛡️" : "🎯";
        
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
              fill={scoreColor(axis.score)}
              fontSize={12}
              fontWeight={800}
            >
              {axis.score}/100
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
    desc: "Réserve anaérobie — énergie au-dessus du seuil",
    why: "Quantité d'énergie disponible pour les efforts supra-seuil (attaques, bosses). Se reconstitue partiellement au repos.",
  },
  "Éco.": {
    desc: "Économie de course — coût énergétique du mouvement",
    why: "À VO₂max et VLamax égaux, l'athlète le plus économique ira plus vite. Améliorable par la technique et le renforcement.",
  },
  "Durabilité": {
    desc: "Robustesse aérobie — dérivée directement du TTE (Time to Exhaustion)",
    why: "Mesure combien de temps vous pouvez tenir au seuil. Un TTE élevé = meilleure résistance en course longue. Purement physiologique, sans influence de la fatigue.",
  },
};

function StaffMetricsGrid({ compass, sportFocus, input }: { compass: TFCLCoachingCompassResult; sportFocus?: string | null; input: CoachingCompassInput }) {
  const profile = compass.profile;
  const isRunning = sportFocus === "run";

  // Compute targets from ambition/objectif
  const ambition = (input.ambition || "age_group") as AmbitionLevel;
  const objectif = input.objectif || "IM";
  const targets = getTargetsForAmbition(objectif, ambition);
  const sportForTargets =
    input.sportFocus === "run" ? "cap" :
    input.sportFocus === "bike" ? "bike" :
    input.sportFocus === "triathlon" ? "tri" :
    undefined;
  const vlamaxRange = getVLamaxRange(objectif, ambition, sportForTargets);
  const vmaTarget = getVmaTargetByAmbition(objectif, ambition);
  const isLong = ["IM", "Ironman", "Marathon", "Ultra", "TrailLong"].includes(objectif);
  const vo2Targets: Record<string, number> = { finisher: 45, age_group: 52, competitor: 58, elite: 65 };
  const vo2Target = (vo2Targets[ambition] || 52) + (isLong ? 3 : 0);
  const durabilityTargets: Record<string, number> = { finisher: 60, age_group: 70, competitor: 80, elite: 90 };
  const economyTargets: Record<string, number> = { finisher: 55, age_group: 65, competitor: 75, elite: 85 };
  const tteTargets: Record<string, number> = { finisher: 35, age_group: 45, competitor: 55, elite: 65 };
  const fatmaxTargets: Record<string, number> = { finisher: 120, age_group: 160, competitor: 200, elite: 240 };
  const wprimeTargets: Record<string, number> = { finisher: 15, age_group: 20, competitor: 25, elite: 30 };

  const metricTargets: Record<string, { target: number | null; inverse?: boolean }> = {
    "VO₂max": { target: vo2Target },
    "VLamax": { target: vlamaxRange.optimal, inverse: true },
    "FTP": { target: input.poids && targets.ftp_kg_min ? Math.round(targets.ftp_kg_min * input.poids) : null },
    "FTP/kg": { target: targets.ftp_kg_min },
    "VMA": { target: vmaTarget },
    "TTE": { target: tteTargets[ambition] || 45 },
    "FatMax": { target: fatmaxTargets[ambition] || 160 },
    "LT1": { target: null },
    "LT2": { target: null },
    "W'": { target: wprimeTargets[ambition] || 20 },
    "Éco.": { target: economyTargets[ambition] || 65 },
    "Durabilité": { target: durabilityTargets[ambition] || 70 },
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
  const lt1Running = isRunning && lt1PctVma ? {
    ...profile.lt1,
    value: lt1PctVma,
    unit: "% VMA",
  } : profile.lt1;

  const lt2Running = isRunning && lt2PctVma ? {
    ...profile.lt2,
    value: lt2PctVma,
    unit: "% VMA",
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
    { key: "FatMax", m: isRunning ? { ...profile.fatmax, unit: profile.fatmax.value ? "W (estimé)" : "W" } : profile.fatmax, secondaryInfo: null as string | null },
    { key: "LT1", m: lt1Running, secondaryInfo: isRunning && profile.lt1.value ? `(${Math.round(profile.lt1.value)} W)` : null },
    { key: "LT2", m: lt2Running, secondaryInfo: isRunning && profile.lt2.value ? `(${Math.round(profile.lt2.value)} W)` : null },
    ...(!isRunning ? [{ key: "W'", m: profile.wPrime, secondaryInfo: null as string | null }] : []),
    { key: "Éco.", m: profile.runningEconomy, secondaryInfo: null as string | null },
    { key: "Durabilité", m: profile.durability, secondaryInfo: null as string | null },
  ].filter(r => r.m?.value !== null);

  if (metrics.length === 0) return null;

  const confidenceLabel = (c: number) =>
    c >= 0.8 ? "Fiable" : c >= 0.5 ? "Modérée" : "Faible";
  const sourceLabel = (s: string) =>
    s === "snapshot" ? "📋 Mesuré" : s === "estimation" ? "📐 Estimé" : "❓ Inconnu";

  const formatVal = (v: number, isSmall: boolean) => isSmall ? v.toFixed(2) : String(Math.round(v));

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-3 rounded-lg bg-muted/20 border border-border/30 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors"
      >
        <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
          Profil physiologique complet
        </p>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 text-muted-foreground/60 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>
      {isOpen && (
        <div className="px-3 pb-3 space-y-1.5">
          {metrics.map(({ key, m, secondaryInfo }) => {
            const expl = METRIC_EXPLANATIONS[key];
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
              <div key={key} className="rounded-md bg-background/40 border border-border/20 overflow-hidden">
                {/* Main row */}
                <div className="flex items-center justify-between px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-foreground">{key}</span>
                    <span className="text-[9px] text-muted-foreground/70">{m.unit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {secondaryInfo && (
                      <span className="text-[8px] text-muted-foreground/60">{secondaryInfo}</span>
                    )}
                    <span className="text-[11px] font-bold font-mono text-foreground">
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
                {/* Explanation row */}
                {expl && (
                  <div className="px-2.5 pb-2 space-y-0.5">
                    <p className="text-[9px] text-muted-foreground leading-tight">{expl.desc}</p>
                    <p className="text-[9px] text-primary/80 leading-tight">💡 {expl.why}</p>
                    <p className="text-[8px] text-muted-foreground/60">{sourceLabel(m.source)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
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

  const { limiter, leverage, decision } = compass;
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
              <p className="text-[10px] text-muted-foreground mt-0.5 mb-2 italic">
                Le radar visualise tes 5 capacités clés. La zone verte = zone optimale (75-100). Plus ta surface est grande, plus tu es prêt.
              </p>
              <div className="mt-1">
                <SignatureRadar axes={compass.radarAxes} size={320} />
              </div>
              
              {/* Completeness bar */}
              <div className="flex items-center gap-2 mt-2 px-2">
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

              {/* Légende couleurs */}
              <div className="flex items-center gap-4 mt-2 px-2">
                <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" /> &ge; 75 Optimal
                </span>
                <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-[hsl(var(--warning))]" /> 50-74 Correct
                </span>
                <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-[hsl(var(--destructive))]" /> &lt; 50 À travailler
                </span>
              </div>

              {/* Légende pédagogique des axes avec comparatif Actuel vs Cible */}
              <div className="mt-3 space-y-1.5 px-1">
                {compass.radarAxes.map((axis) => {
                  const explanation = AXIS_PEDAGOGY[axis.key] || { short: axis.shortLabel, detail: "" };
                  const emoji = axis.key === "aerobic" || axis.key === "ftpkg" ? "⚡" : axis.key === "vma" ? "🏃" : axis.key === "vo2max" ? "🫁" : axis.key === "vlamax" ? "🔬" : axis.key === "fatmax" ? "🔥" : axis.key === "durability" ? "🛡️" : "🎯";
                  const statusLabel = axis.score >= 75 ? "Optimal" : axis.score >= 50 ? "Correct" : "Prioritaire";

                  const hasValues = axis.value != null && axis.target != null;
                  const isInverse = axis.key === "vlamax"; // lower is better
                  const delta = hasValues ? (axis.value as number) - (axis.target as number) : null;
                  const remainsToWork = delta !== null && ((isInverse && delta > 0) || (!isInverse && delta < 0));
                  const displayDelta = isInverse && delta !== null ? -delta : delta;
                  const formatVal = (v: number) => v < 10 ? v.toFixed(2) : v.toFixed(1);

                  return (
                    <div key={axis.key} className={cn(
                      "flex items-start gap-2.5 p-2.5 rounded-lg border",
                      axis.score >= 75 ? "bg-[hsl(var(--success)/0.05)] border-[hsl(var(--success)/0.2)]" :
                      axis.score >= 50 ? "bg-[hsl(var(--warning)/0.05)] border-[hsl(var(--warning)/0.2)]" :
                      "bg-[hsl(var(--destructive)/0.05)] border-[hsl(var(--destructive)/0.2)]"
                    )}>
                      <span className="text-base mt-0.5">{emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold">{explanation.short}</p>
                          <Badge variant="outline" className={cn(
                            "text-[9px] h-4 px-1.5",
                            axis.score >= 75 ? "border-[hsl(var(--success)/0.4)] text-[hsl(var(--success))]" :
                            axis.score >= 50 ? "border-[hsl(var(--warning)/0.4)] text-[hsl(var(--warning))]" :
                            "border-[hsl(var(--destructive)/0.4)] text-[hsl(var(--destructive))]"
                          )}>
                            {axis.score}/100 — {statusLabel}
                          </Badge>
                        </div>

                        {/* Comparatif Actuel → Cible */}
                        {hasValues && (
                          <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-background/60 border border-border/30 text-[10px]">
                              <span className="text-muted-foreground">Actuel</span>
                              <span className="font-bold text-foreground">{formatVal(axis.value as number)}</span>
                              <span className="text-muted-foreground/60">{axis.unit}</span>
                            </div>
                            <span className="text-muted-foreground/40 text-[10px]">→</span>
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-background/60 border border-border/30 text-[10px]">
                              <span className="text-muted-foreground">Cible</span>
                              <span className="font-bold text-foreground">{formatVal(axis.target as number)}</span>
                              <span className="text-muted-foreground/60">{axis.unit}</span>
                              {axis.key === "vlamax" && vlamaxRange && (
                                <span className="ml-1 text-[9px] text-muted-foreground/60 font-normal">
                                  ({vlamaxRange.min.toFixed(2)}–{vlamaxRange.max.toFixed(2)})
                                </span>
                              )}
                            </div>
                            {delta !== null && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] px-1.5 h-4",
                                  remainsToWork
                                    ? "border-[hsl(var(--destructive)/0.4)] text-[hsl(var(--destructive))]"
                                    : "border-[hsl(var(--success)/0.4)] text-[hsl(var(--success))]"
                                )}
                              >
                                {remainsToWork ? `Δ ${Math.abs(displayDelta!).toFixed(axis.value! < 10 ? 2 : 1)} à combler` : `✓ +${Math.abs(displayDelta!).toFixed(axis.value! < 10 ? 2 : 1)} d'avance`}
                              </Badge>
                            )}
                          </div>
                        )}

                        <p className="text-[10px] text-muted-foreground leading-relaxed mt-1">{explanation.detail}</p>
                      </div>
                    </div>
                  );
                })}
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
              <p className="text-[10px] text-muted-foreground mt-1.5 italic leading-relaxed">
                💡 {FLOW_PEDAGOGY.limiter}
              </p>

              {/* Pourquoi c'est important ? — impact concret (terrain + mécanisme) */}
              <div className="mt-2">
                <LimiterImpactCard limiter={limiter.type} />
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
              subtitle={leverage.description}
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
              subtitle={staffMode ? decision.coachRationale : decision.athleteMessage}
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
            {staffMode && <StaffMetricsGrid compass={compass} sportFocus={input.sportFocus} input={input} />}
          </div>
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
