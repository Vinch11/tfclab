import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { coachDecisionReading } from "@/lib/coachingCompass/coachDecisionReading";
import { fieldCheckLink } from "@/lib/diagnostic/compactFieldAssessment";
import { getObjectifLabel, type ObjectifType } from "@/types/athlete";
import { CompassPerformanceComparison } from "./CompassPerformanceComparison";
import type { PerformanceGoal } from "@/lib/coachingCompass/performanceComparison";
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

import { Fragment, useId, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ArrowDown, Compass, Info, Target, Zap, AlertTriangle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeCoachingCompass, type CoachingCompassInput, type TFCLCoachingCompassResult, type RadarAxis } from "@/lib/coachingCompass";
import { dashboardCoverage } from '@/lib/coachingCompass/dashboardConsistency';
import { metricSourceLabel } from "@/lib/coachingCompass/presentation";
import { readCommittedLimiterPolicy } from "@/lib/plan/coachLimiterPolicyStorage";
import { getVLamaxRange } from "@/lib/physiologicalTargets";
import type { AmbitionLevel } from "@/types/ambitionLevel";
import { CompassVmaReference } from '@/components/CompassVmaReference';
import { assessVmaReference, getVmaReference, vmaReferencePosition, type VmaReference } from '@/lib/coachingCompass/vmaReference';

// Local wording only: detailed provenance remains unchanged in reports and stored data.
const compassSourceLabel = (source: string) => source === 'snapshot'
  ? 'Repère enregistré : son interprétation dépend du test réalisé et des conditions de mesure.'
  : metricSourceLabel(source);

interface CoachingCompassCardProps {
  onSavePerformanceGoal?: (goal: PerformanceGoal) => Promise<boolean>;
  input: CoachingCompassInput;
  athleteName?: string;
  staffMode?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RADAR CHART — SVG avec zone optimale
// ═══════════════════════════════════════════════════════════════════════════════

function SignatureRadar({ axes, size = 320, vmaReference = null }: { axes: RadarAxis[]; size?: number; vmaReference?: VmaReference | null }) {
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
  const dataPoints = axes.map((a, i) => getPoint(i, a.key === 'vma' && vmaReference ? vmaReferencePosition(a.value, vmaReference) ?? 0 : a.score));
  const polygonStr = dataPoints.map(p => `${p.x},${p.y}`).join(" ");
  const hasProfile = axes.every(axis => axis.value != null && Number.isFinite(axis.value) && axis.value > 0 &&
    (axis.key === 'vma' && vmaReference ? vmaReferencePosition(axis.value, vmaReference) != null : axis.target != null && Number.isFinite(axis.score)));

  const scoreColor = (s: number) =>
    s >= 75 ? "hsl(var(--success))" : s >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <svg viewBox={`-28 -20 ${size + 56} ${size + 48}`} className="w-full max-w-[380px] mx-auto select-none" role="img" aria-label={vmaReference ? 'Compass course : profil athlète et écart VMA au repère ambition' : 'Compass physiologique'}>
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
              strokeWidth={level === 100 ? 1.5 : 0.7}
              opacity={level === 100 ? 0.8 : 0.45}
              strokeDasharray={level === 100 ? "4,3" : "none"}
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
        fill="hsl(var(--muted) / 0.15)"
        fillRule="evenodd"
        stroke="hsl(var(--border))"
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
      {hasProfile && <polygon
        data-testid={vmaReference ? 'running-athlete-profile' : 'athlete-radar-profile'}
        points={polygonStr}
        fill="hsl(var(--primary) / 0.28)"
        stroke="hsl(var(--primary))"
        strokeWidth={3}
        strokeLinejoin="round"
      />}

      {/* Data points with colored halos */}
      {dataPoints.map((p, i) => axes[i].value != null && (axes[i].key === 'vma' && vmaReference ? vmaReferencePosition(axes[i].value, vmaReference) != null : axes[i].target != null) ? (
        <g key={`dot-${i}`}>
          {axes[i].key === 'vma' && vmaReference ? <g data-testid="radar-vma-gap">
            <title>{assessVmaReference(axes[i].value, vmaReference).label} · écart {assessVmaReference(axes[i].value, vmaReference).gapKmh ?? '—'} km/h au repère extrapolé</title>
            <line x1={p.x} y1={p.y} x2={getPoint(i, 100).x} y2={getPoint(i, 100).y} className="stroke-warning" strokeWidth="3" strokeDasharray="3 2" />
            <circle cx={getPoint(i, 100).x} cy={getPoint(i, 100).y} r="5" className="fill-background stroke-primary" strokeWidth="2" />
            <circle cx={p.x} cy={p.y} r="4.5" className={assessVmaReference(axes[i].value, vmaReference).status === 'below' ? 'fill-warning stroke-background' : 'fill-success stroke-background'} strokeWidth="2" />
          </g> : <>
            <circle cx={p.x} cy={p.y} r={8} fill={`${scoreColor(axes[i].score)}`.replace(")", " / 0.12)")} />
            <circle cx={p.x} cy={p.y} r={4.5} fill={scoreColor(axes[i].score)} stroke="hsl(var(--background))" strokeWidth={2} />
          </>}
        </g>
      ) : null)}

      {/* Labels with emoji, name, score and value */}
      {axes.map((axis, i) => {
        const labelP = getPoint(i, 135);
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
              fontSize={12}
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
              fontSize={axis.key === 'vma' && vmaReference ? 10 : 12}
              fontWeight={800}
            >
              {axis.key === 'vma' && vmaReference && vmaReferencePosition(axis.value, vmaReference) != null ? `Écart ${assessVmaReference(axis.value, vmaReference).gapKmh?.toFixed(1)} km/h` : axis.value != null && axis.value > 0 && axis.target != null ? `${axis.score}/100` : axis.value != null && axis.value > 0 ? `${axis.value.toFixed(1)} ${axis.unit}` : "—"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function FatigueWarning({ warning }: { warning: NonNullable<TFCLCoachingCompassResult["fatigueWarning"]> }) {
  if (!warning.level || warning.level === "none" || !warning.message) return null;

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

function StaffMetricsGrid({ compass, sportFocus, input, defaultOpen }: { defaultOpen: boolean; compass: TFCLCoachingCompassResult; sportFocus?: string | null; input: CoachingCompassInput }) {
  const profile = compass.profile;
  const isRunning = compass.presentation?.sport === 'run' || sportFocus === "run";

  const ambition = (input.ambition || "age_group") as AmbitionLevel;
  const objectif = input.objectif || "IM";
  const vlamaxRange = getVLamaxRange(objectif, ambition, isRunning ? "cap" : "bike");
  const displayAxes = compass.presentation?.axes ?? compass.radarAxes;
  const targetFor = (key: string) => displayAxes.find(a => a.key === key)?.target ?? null;
  const metricTargets: Record<string, { target: number | null; inverse?: boolean }> = {
    "VO₂max": { target: targetFor("vo2max") }, "VLamax": { target: targetFor("vlamax"), inverse: true },
    "FTP": { target: input.poids && targetFor("ftpkg") ? Math.round((targetFor("ftpkg") ?? 0) * input.poids) : null },
    "FTP/kg": { target: targetFor("ftpkg") }, "VMA": { target: targetFor("vma") },
    "TTE": { target: targetFor("tte") }, "FatMax": { target: targetFor("fatmax") },
    "W'": { target: targetFor("wprime") }, "Éco.": { target: compass.economyModifier.target },
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

  const [isOpen, setIsOpen] = useState(defaultOpen);
  if (metrics.length === 0) return null;

  const confidenceLabel = (c: number) =>
    c >= 0.8 ? "Fiable" : c >= 0.5 ? "Modérée" : "Faible";
  const sourceLabel = compassSourceLabel;

  const formatVal = (v: number, isSmall: boolean) => isSmall ? v.toFixed(2) : String(Math.round(v));



  return (
    <div className="mt-3 rounded-lg bg-muted/20 border border-border/30 overflow-hidden">
      <Button
        variant="ghost"
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
      </Button>
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
            if (key !== "VLamax" && typeof m.value === "number" && target != null) {
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

function DecisionFlow({ input, compass, hasData }: { input: CoachingCompassInput; compass: TFCLCoachingCompassResult; hasData: boolean }) {
  const { lead, factors, tied, shared, overlap, check } = coachDecisionReading(input, compass.presentation);
  const uncertain = tied || shared || lead?.hypothesis || lead?.status === "Écart à confirmer";
  const sport = lead?.sport === "run" ? compass.presentation?.runningDiagnostic : compass.presentation?.cyclingDiagnostic;
  const sportPriority = lead?.sport ? sport?.priorities.find(row => row.key === lead.metric) : undefined;
  const matchesPlan = !!lead && !uncertain && !lead.sport && compass.limiter.type !== "unknown" &&
    compass.limiter.metricsUsed.includes(lead.metric);
  const title = tied && factors.length > 1 ? factors.slice(0, 2).map(row => row.title).join(" ou ") :
    shared && lead ? lead.title + " ou profil glycolytique (VLamax)" : lead?.title;
  const note = overlap && !shared ? "Profil glycolytique (VLamax) à préciser." : undefined;
  const comparison = lead?.comparison;
  const native = (n: number) => n.toLocaleString("fr-BE", { maximumFractionDigits: 2 });
  const evidence = comparison && !comparison.range
    ? native(comparison.value) + " " + comparison.unit + " pour un repère de " + native(comparison.target) + " " + comparison.unit + "."
    : lead?.facts;
  if (!hasData && !lead && !overlap && !input.limiterResult?.gapAnalysis.some(metric => metric.value != null)) {
    return <p className="rounded-lg bg-muted/30 p-3 text-sm">Données insuffisantes. Renseigne un bilan pour cet athlète et cet objectif.</p>;
  }
  const steps = [
    { label: "Limiteur", Icon: AlertTriangle, title: title ?? (overlap ? "Profil glycolytique à préciser" : "Aucun limiteur établi"),
      detail: [lead && uncertain ? lead.status : null, evidence, title && note].filter(Boolean).join(" · ") },
    { label: "Levier", Icon: Zap, title: uncertain || !lead ? "Préciser le profil avant de choisir le bloc" :
        sportPriority?.lever ?? (matchesPlan ? compass.leverage.label : "Vérifier l’écart sur le terrain") },
    { label: "Décision", Icon: Target, title: matchesPlan ? compass.decision.recommendedBlock : check.text,
      detail: matchesPlan ? [...compass.decision.physiologicalTargets, ...compass.decision.prohibitions].join(" · ") : undefined,
      href: matchesPlan ? undefined : fieldCheckLink(check) },
  ];

  return <div className="space-y-1">
    {steps.map(({ label, Icon, title, detail, href }, index) => <Fragment key={label}>
      {index > 0 && <ArrowDown aria-hidden="true" className="mx-auto size-4 text-muted-foreground/60" />}
      <section aria-label={label} className="flex gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <h4 className="text-xs font-semibold text-muted-foreground">{label}</h4>
          <p className="mt-1 text-sm font-semibold">{title}</p>
          {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
          {href && <a className="mt-2 inline-block text-sm text-primary underline" href={href}>Voir le protocole</a>}
        </div>
      </section>
    </Fragment>)}
  </div>;
}

export function CoachingCompassCard(props: CoachingCompassCardProps) {
  const { athleteId, objectif, ambition } = props.input;
  return <CompassView key={JSON.stringify([athleteId, objectif, ambition, props.staffMode])} {...props} />;
}

function CompassView({ input, onSavePerformanceGoal, staffMode = false, className }: CoachingCompassCardProps) {
  const [detailedProfile, setDetailedProfile] = useState(staffMode);
  const compass = useMemo(() => computeCoachingCompass(input), [input]);
  const coverage = dashboardCoverage(input);
  const coachPolicy = input.athleteId ? readCommittedLimiterPolicy(localStorage, input.athleteId, input.objectif) : null;
  const presentation = compass.presentation;
  const disciplines = presentation?.disciplineAxes;
  const profiles = disciplines
    ? [{ sport: "bike", axes: disciplines.bike }, { sport: "run", axes: disciplines.run }]
    : [{ sport: presentation?.sport ?? input.sportFocus, axes: presentation?.axes ?? compass.radarAxes }];

  return <Card className={cn("min-w-0 border-border/50 print:shadow-none", className)}>
    <CardHeader className="flex-row items-center gap-2 space-y-0 px-4 pb-3 sm:px-6">
      <Compass aria-hidden="true" className="size-5 text-primary" />
      <div><CardTitle className="text-base">TFCL Coaching Compass™</CardTitle>
        <p className="text-xs text-muted-foreground">{getObjectifLabel(input.objectif as ObjectifType) ?? input.objectif}</p></div>
    </CardHeader>
    <CardContent className="px-3 sm:px-6">
      {compass.fatigueWarning && <FatigueWarning warning={compass.fatigueWarning} />}
      <Tabs defaultValue="decision" className="space-y-3">
        <TabsList aria-label="Coaching Compass" className="grid w-full grid-cols-3">
          <TabsTrigger value="decision"><Target className="mr-1 size-4" />Décision</TabsTrigger>
          <TabsTrigger value="radar"><Activity className="mr-1 size-4" />Radar</TabsTrigger>
          <TabsTrigger value="profile"><Info className="mr-1 size-4" />Profil</TabsTrigger>
        </TabsList>
        <TabsContent value="decision"><DecisionFlow input={input} compass={compass} hasData={coverage.filled > 0} /></TabsContent>
        <TabsContent value="radar">
          <div className={disciplines ? "grid gap-4 sm:grid-cols-2" : ""}>
            {profiles.map(({ sport, axes }) => <section key={sport} className="min-w-0">
              {disciplines && <h4 className="text-center font-semibold">{sport === "run" ? "Course à pied" : "Vélo"}</h4>}
              <SignatureRadar axes={axes} vmaReference={sport === "run" ? getVmaReference(input.objectif, input.ambition) : null} />
            </section>)}
          </div>
          <p className="text-center text-xs text-muted-foreground">{coverage.filled} repères sur {coverage.total} renseignés.</p>
        </TabsContent>
        <TabsContent value="profile" className="space-y-4">
          <Button variant="outline" size="sm" aria-pressed={detailedProfile} onClick={() => setDetailedProfile(!detailedProfile)}>
            {detailedProfile ? "Vue simplifiée" : "Vue détaillée du coach"}
          </Button>
          {profiles.map(({ sport, axes }) => {
            const range = getVLamaxRange(input.objectif, input.ambition as AmbitionLevel, sport ?? undefined);
            const displayed = detailedProfile ? axes : axes.filter(axis => ["ftpkg", "vma", "vlamax", "tte"].includes(axis.key));
            return <section key={sport}>
              {disciplines && <h4 className="font-semibold">{sport === "run" ? "Course à pied" : "Vélo"}</h4>}
                <dl className="divide-y text-sm">{displayed.map(axis => <div key={axis.key} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
                  <dt>{axis.label}</dt>
                  <dd className="font-medium tabular-nums">{axis.value == null ? "Non renseigné" : axis.value.toLocaleString("fr-BE", { maximumFractionDigits: 2 }) + " " + axis.unit}</dd>
                  {detailedProfile && axis.value != null && <dd className="w-full text-xs text-muted-foreground">{compassSourceLabel(axis.source ?? "unknown")}
                    {axis.key === "vlamax" && " · plage de coaching " + range.min.toLocaleString("fr-BE") + "–" + range.max.toLocaleString("fr-BE") + " mmol/L/s"}
                  </dd>}
                </div>)}</dl>
              {detailedProfile && sport === "run" && getVmaReference(input.objectif, input.ambition) && <CompassVmaReference objective={input.objectif} ambition={input.ambition} value={input.vma} paceThresholdSecPerKm={input.paceThresholdSecPerKm} />}
            </section>;
          })}
          {detailedProfile && <StaffMetricsGrid compass={compass} sportFocus={input.sportFocus} input={input} defaultOpen />}
          {detailedProfile && coachPolicy && <p className="text-sm">Ordre enregistré par le coach pour le plan · {coachPolicy.limiterOrder.join(" → ")}</p>}
          <details className="rounded-lg border px-3">
            <summary className="cursor-pointer py-3 text-sm font-medium">Bilan détaillé et objectif personnel</summary>
            <CompassPerformanceComparison input={input} presentation={presentation} onSave={onSavePerformanceGoal} />
          </details>
        </TabsContent>
      </Tabs>
    </CardContent>
  </Card>;
}
