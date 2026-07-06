/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SECTION ANALYSE — Dashboard Simplifié (redesign moderne)
 *
 * Hiérarchie forte : hero + gauge, liste dense de métriques avec ring de progression.
 * Aucune donnée retirée, aucune logique modifiée.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  ChevronDown,
  GripVertical,
  ArrowUpDown,
  Sparkles,
  AlertTriangle,
  AlertOctagon,
  Wind,
  Zap,
  Flame,
  Timer,
  Target,
  Shield,
  Gauge,
  FlaskConical,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import type { AthleteDiagnostic } from "@/engines/diagnostic";
import type { LucideIcon } from "lucide-react";

interface AnalyseSectionProps {
  diagnostic: AthleteDiagnostic;
  className?: string;
}

type AnalysisGap = AthleteDiagnostic["limiter"]["gapAnalysis"][number] & {
  targetRange?: { min: number; max: number };
};

// Explications + iconographie (Lucide, pas d'emoji)
const METRIC_EXPLANATIONS: Record<string, {
  label: string;
  unit: string;
  explanation: string;
  whyItMatters: string;
  howToImprove: string;
  Icon: LucideIcon;
}> = {
  "VO2max": {
    label: "VO2max",
    unit: "ml/kg/min",
    explanation: "Capacité maximale de ton corps à utiliser l'oxygène. Le « moteur aérobie » — plus il est puissant, plus tu peux soutenir une intensité élevée longtemps.",
    whyItMatters: "Le VO2max fixe le plafond de ta performance aérobie. Tous les seuils (FTP, VMA, allures marathon) en dépendent.",
    howToImprove: "Intervalles VO2max (3-5min à 90-105% PMA/VMA), côtes longues, 30/30 ou Billat.",
    Icon: Wind,
  },
  "FTP/kg": {
    label: "FTP/kg",
    unit: "W/kg",
    explanation: "Puissance seuil rapportée au poids. Intensité maximale soutenable ~1 heure.",
    whyItMatters: "Indicateur de référence en cyclisme : vitesse en montée et effort soutenu prolongé.",
    howToImprove: "Sweet spot (88-93% FTP), 2x20min au seuil, travail de force, optimisation du poids.",
    Icon: Zap,
  },
  "VMA": {
    label: "VMA",
    unit: "km/h",
    explanation: "Vitesse Maximale Aérobie : l'allure à laquelle tu atteins ton VO2max. Référence pour calibrer toutes tes allures course à pied.",
    whyItMatters: "Pilier de la planification en course. Marathon ~75-80% VMA, semi ~82-87%, 10km ~88-93%.",
    howToImprove: "Fractionné court (200-400m à 100-110% VMA), 1000/1200m à 90-95%, côtes explosives.",
    Icon: Activity,
  },
  "VLamax": {
    label: "VLamax",
    unit: "mmol/L/s",
    explanation: "Puissance glycolytique maximale. Vitesse de production de lactate. Pour l'endurance longue, VLamax basse (< 0.4) souhaitable.",
    whyItMatters: "VLamax élevée = consommation rapide de glycogène et lactate = épuisement prématuré (« le mur »). Basse = utilisation des graisses.",
    howToImprove: "Volume Z2 élevé (3-5h), suppression des sprints, tempo prolongé, « train low ».",
    Icon: FlaskConical,
  },
  "TTE": {
    label: "TTE",
    unit: "min",
    explanation: "Time To Exhaustion : durée de maintien du FTP. Reflète l'endurance musculaire au seuil.",
    whyItMatters: "Combien de temps tu tiens ton seuil. TTE > 50min = excellent pour les longues distances.",
    howToImprove: "Blocs seuil progressifs (2x20 → 2x30 → 1x45), intervalles longs à 95-100% FTP.",
    Icon: Timer,
  },
  "Economy": {
    label: "Économie",
    unit: "/100",
    explanation: "Efficience du geste sportif. Combine cadence, élasticité, technique. Score élevé = moins d'énergie gaspillée.",
    whyItMatters: "À VO2max et FTP égaux, l'athlète économe va plus vite. Souvent le facteur qui distingue les excellents.",
    howToImprove: "Drills de foulée, cadence, renforcement spécifique, plyométrie, coordination.",
    Icon: Target,
  },
  "FatMax": {
    label: "FatMax",
    unit: "%FTP",
    explanation: "Intensité de combustion maximale des graisses. Plus le seuil est élevé, mieux tu épargnes le glycogène.",
    whyItMatters: "Sur Ironman/ultra, glycogène limité (~2h). FatMax élevé = intensité correcte en brûlant les graisses.",
    howToImprove: "Sorties longues Z2 à jeun, périodisation nutritionnelle, réduction VLamax.",
    Icon: Flame,
  },
  "Durability": {
    label: "Durabilité",
    unit: "/100",
    explanation: "Résistance à la dégradation sur la durée. Combine dérive cardiaque, TTE, stabilité de puissance/allure.",
    whyItMatters: "Athlète durable = perd <5% de puissance après 3h. Détermine ta capacité à finir fort.",
    howToImprove: "Sorties >3h, back-to-back, courses d'entraînement longues, simulations.",
    Icon: Shield,
  },
};

type StatusTone = "excellent" | "on_target" | "developing" | "priority" | "unknown";

const TONE_STYLES: Record<StatusTone, {
  label: string;
  ring: string;   // stroke color for the ring
  text: string;   // text color for value
  chip: string;   // subtle chip bg
  accent: string; // small dot/border
  Icon: LucideIcon;
}> = {
  excellent:  { label: "Au-dessus",     ring: "hsl(var(--success))",     text: "text-[hsl(var(--success))]",     chip: "bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]",     accent: "bg-[hsl(var(--success))]",     Icon: TrendingUp },
  on_target:  { label: "Dans la cible", ring: "hsl(var(--primary))",     text: "text-foreground",                chip: "bg-primary/10 text-primary",                                     accent: "bg-primary",                    Icon: Minus },
  developing: { label: "À développer",  ring: "hsl(var(--warning))",     text: "text-[hsl(var(--warning))]",     chip: "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))]",     accent: "bg-[hsl(var(--warning))]",     Icon: TrendingDown },
  priority:   { label: "Prioritaire",   ring: "hsl(var(--destructive))", text: "text-[hsl(var(--destructive))]", chip: "bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]", accent: "bg-[hsl(var(--destructive))]", Icon: AlertOctagon },
  unknown:    { label: "Sans donnée",   ring: "hsl(var(--muted-foreground))", text: "text-muted-foreground", chip: "bg-muted text-muted-foreground", accent: "bg-muted-foreground/40", Icon: Minus },
};

function toneFromGap(gap: number): StatusTone {
  if (gap >= 5) return "excellent";
  if (gap >= -5) return "on_target";
  if (gap >= -15) return "developing";
  return "priority";
}

// Mini progress ring — SVG stroke, respire, tabular
function ProgressRing({ pct, color, size = 44, stroke = 3.5, children }: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const dash = (clamped / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
          opacity={0.4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 700ms ease" }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

function MetricRow({ gap, metricInfo, showDragHandle = false, dragHandleProps = {} }: {
  gap: AnalysisGap;
  metricInfo: typeof METRIC_EXPLANATIONS[string];
  showDragHandle?: boolean;
  dragHandleProps?: Record<string, any>;
}) {
  const [open, setOpen] = useState(false);
  const isUnknown = gap.status === "unknown" || gap.value == null;
  const tone: StatusTone = isUnknown ? "unknown" : toneFromGap(gap.gap);
  const style = TONE_STYLES[tone];

  const hasValues = gap.value != null && gap.target != null;
  const delta = hasValues ? (gap.value as number) - (gap.target as number) : null;
  const isInverse = gap.metric === "VLamax";
  const displayDelta = isInverse && delta !== null ? -delta : delta;
  const remainsToWork = delta !== null && ((isInverse && delta > 0) || (!isInverse && delta < 0));

  const formatVal = (v: number) => v < 10 ? v.toFixed(2) : v.toFixed(1);

  const pct = (() => {
    if (isUnknown) return 0;
    if (!hasValues || gap.target === 0) return Math.min(100, Math.max(5, 50 + gap.gap));
    const val = gap.value as number;
    const tgt = gap.target as number;
    if (isInverse) {
      if (val <= tgt) return 100;
      return Math.max(5, Math.min(100, ((2 * tgt - val) / tgt) * 100));
    }
    return Math.max(5, Math.min(100, (val / tgt) * 100));
  })();

  const MetricIcon = metricInfo.Icon;
  const StatusIcon = style.Icon;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="group rounded-lg border border-border/50 bg-card hover:border-border transition-colors">
        <CollapsibleTrigger className="w-full text-left">
          <div className="flex items-center gap-2.5 px-3 py-2">
            {showDragHandle && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="cursor-grab active:cursor-grabbing touch-none -ml-0.5"
                {...dragHandleProps}
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-foreground" />
              </div>
            )}

            <ProgressRing pct={pct} color={style.ring} size={32} stroke={2.5}>
              <MetricIcon className={cn("h-3 w-3", isUnknown ? "text-muted-foreground/50" : "text-foreground/70")} />
            </ProgressRing>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80 truncate">
                  {metricInfo.label}
                </span>
                <span className={cn("h-1 w-1 rounded-full shrink-0", style.accent)} />
                <span className="text-[10px] text-muted-foreground truncate">
                  {style.label}
                </span>
              </div>
              {hasValues ? (
                <div className="flex items-baseline gap-1 text-[10px] text-muted-foreground leading-tight">
                  <span className="tabular-nums text-foreground/60">{formatVal(gap.target as number)}</span>
                  <span className="text-muted-foreground/60">{metricInfo.unit}</span>
                  {delta !== null && (
                    <>
                      <span className="text-muted-foreground/30">·</span>
                      <span className={cn(
                        "tabular-nums font-medium",
                        remainsToWork ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--success))]"
                      )}>
                        {remainsToWork ? "−" : "+"}{Math.abs(displayDelta!).toFixed(isInverse ? 2 : 1)}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-muted-foreground/70 leading-tight">Données insuffisantes</div>
              )}
            </div>

            <div className="flex items-baseline gap-0.5 shrink-0">
              {isUnknown ? (
                <span className="text-lg font-semibold text-muted-foreground/50 tabular-nums">—</span>
              ) : (
                <>
                  <span className={cn("text-xl sm:text-2xl font-semibold tracking-tight tabular-nums leading-none", style.text)}>
                    {formatVal(gap.value as number)}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-medium ml-0.5">{metricInfo.unit}</span>
                </>
              )}
              <ChevronDown className={cn(
                "h-3.5 w-3.5 text-muted-foreground/40 ml-1.5 transition-transform",
                open && "rotate-180"
              )} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mx-3 mb-3 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 pt-2.5 border-t border-border/40">
            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Définition</p>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{metricInfo.explanation}</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">Impact</p>
              <p className="text-[11px] text-foreground/80 leading-relaxed">{metricInfo.whyItMatters}</p>
            </div>
            {remainsToWork && (
              <div className="md:col-span-2 rounded-md bg-primary/5 border border-primary/15 p-2">
                <p className="text-[9px] font-semibold text-primary uppercase tracking-widest mb-0.5 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> Levier d'amélioration
                </p>
                <p className="text-[11px] text-foreground/85 leading-relaxed">{metricInfo.howToImprove}</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function SortableMetricRow({ id, gap, metricInfo, isReorderMode }: {
  id: string;
  gap: Parameters<typeof MetricRow>[0]["gap"];
  metricInfo: Parameters<typeof MetricRow>[0]["metricInfo"];
  isReorderMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !isReorderMode });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50 z-50")}>
      <MetricRow
        gap={gap}
        metricInfo={metricInfo}
        showDragHandle={isReorderMode}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function AnalyseSection({ diagnostic, className }: AnalyseSectionProps) {
  const { limiter, synthesis } = diagnostic;
  const gapAnalysis = useMemo<AnalysisGap[]>(
    () => limiter.gapAnalysis.map((gap) => gap.metric === "VLamax"
      ? {
          ...gap,
          target: diagnostic.targets.vlamaxRange.optimal,
          targetRange: {
            min: diagnostic.targets.vlamaxRange.min,
            max: diagnostic.targets.vlamaxRange.max,
          },
        }
      : gap),
    [limiter.gapAnalysis, diagnostic.targets.vlamaxRange]
  );

  const [isReorderMode, setIsReorderMode] = useState(false);

  const defaultOrder = useMemo(
    () => [...gapAnalysis].sort((a, b) => a.gap - b.gap).map(g => g.metric),
    [gapAnalysis]
  );

  const [metricOrder, setMetricOrder] = useState<string[]>(defaultOrder);

  useMemo(() => {
    const currentMetrics = new Set(metricOrder);
    const newMetrics = gapAnalysis.map(g => g.metric);
    const hasNew = newMetrics.some(m => !currentMetrics.has(m));
    if (hasNew) setMetricOrder(defaultOrder);
  }, [gapAnalysis, defaultOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMetricOrder(prev => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const gapMap = useMemo(() => {
    const map = new Map<string, typeof gapAnalysis[number]>();
    for (const g of gapAnalysis) map.set(g.metric, g);
    return map;
  }, [gapAnalysis]);

  const orderedGaps = metricOrder
    .map(m => gapMap.get(m))
    .filter(Boolean) as typeof gapAnalysis;

  // Agrégats pour le hero
  const completenessPct = Math.round(diagnostic.meta.dataCompleteness * 100);
  const criticalCount = synthesis.alerts.filter(a => a.severity === "critical").length;
  const warningCount = synthesis.alerts.filter(a => a.severity === "warning").length;
  const alertsCount = criticalCount + warningCount;
  const known = orderedGaps.filter(g => g.status !== "unknown" && g.value != null);
  const priorityCount = known.filter(g => g.gap < -15).length;
  const onTargetCount = known.filter(g => g.gap >= -5).length;

  // Score global : moyenne pondérée douce des gaps → 0-100
  const scoreValue = (() => {
    if (known.length === 0) return null;
    const scores = known.map(g => {
      // Clamp gap dans [-30, +15] et remappe 0..100
      const clamped = Math.max(-30, Math.min(15, g.gap));
      return ((clamped + 30) / 45) * 100;
    });
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  })();
  const scoreTone: StatusTone = scoreValue == null
    ? "unknown"
    : scoreValue >= 75 ? "excellent"
    : scoreValue >= 55 ? "on_target"
    : scoreValue >= 35 ? "developing"
    : "priority";
  const scoreStyle = TONE_STYLES[scoreTone];

  return (
    <Card
      className={cn(
        "overflow-hidden border-border/50 bg-gradient-to-b from-card to-card/60",
        className
      )}
    >
      {/* ═══ HERO ═══ */}
      <div className="relative">
        {/* Fond subtil radial */}
        <div
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            background: `radial-gradient(600px 200px at 85% 0%, ${scoreStyle.ring}, transparent 60%)`,
          }}
        />
        <div className="relative px-4 py-3 sm:px-5 sm:py-4 border-b border-border/40">
          {/* Ligne 1 : eyebrow + KPIs inline + actions */}
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
              <Gauge className="h-3 w-3 shrink-0" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] truncate">
                Analyse · {diagnostic.objectif} · {diagnostic.ambition}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 px-2 text-[10px] gap-1",
                isReorderMode ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setIsReorderMode(v => !v)}
            >
              <ArrowUpDown className="h-3 w-3" />
              {isReorderMode ? "OK" : "Trier"}
            </Button>
          </div>

          {/* Ligne 2 : gauge + headline + KPIs inline */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Gauge compacte */}
            <ProgressRing pct={scoreValue ?? 0} color={scoreStyle.ring} size={56} stroke={4}>
              <div className="flex flex-col items-center leading-none">
                <span className={cn("text-base font-semibold tabular-nums", scoreStyle.text)}>
                  {scoreValue ?? "—"}
                </span>
                <span className="text-[8px] uppercase tracking-widest text-muted-foreground mt-0.5">
                  Score
                </span>
              </div>
            </ProgressRing>

            {/* Headline + KPIs inline */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-semibold tracking-tight leading-snug text-foreground line-clamp-2">
                {synthesis.headline}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px] text-muted-foreground">
                <InlineKpi label="données" value={`${completenessPct}%`} tone={completenessPct >= 70 ? "on_target" : "developing"} />
                <InlineKpi label="cible" value={onTargetCount} tone={onTargetCount > 0 ? "excellent" : "unknown"} />
                <InlineKpi label="prio" value={priorityCount} tone={priorityCount > 0 ? "priority" : "on_target"} />
                <InlineKpi label="alertes" value={alertsCount} tone={criticalCount > 0 ? "priority" : alertsCount > 0 ? "developing" : "on_target"} />
              </div>
            </div>
          </div>

          {/* Forces chips, très compact */}
          {synthesis.strengths.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {synthesis.strengths.slice(0, 5).map((s, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--success)/0.08)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.15)] font-medium"
                >
                  <Sparkles className="h-2 w-2" />
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-3 sm:p-4 space-y-3">
        {/* Alertes remontées */}
        {synthesis.alerts.length > 0 && (
          <div className="space-y-2">
            {synthesis.alerts.map((alert, i) => {
              const AlertIcon = alert.severity === "critical" ? AlertOctagon : alert.severity === "warning" ? AlertTriangle : Info;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border text-xs leading-relaxed",
                    alert.severity === "critical" && "bg-[hsl(var(--destructive)/0.06)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.2)]",
                    alert.severity === "warning" && "bg-[hsl(var(--warning)/0.06)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)]",
                    alert.severity === "info" && "bg-primary/5 text-primary border-primary/15"
                  )}
                >
                  <AlertIcon className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{alert.message}</span>
                </div>
              );
            })}
          </div>
        )}

        {isReorderMode && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-primary">
            <GripVertical className="h-3.5 w-3.5" />
            Glisse les métriques pour réorganiser
          </div>
        )}

        {/* Liste des métriques */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
              Métriques
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              {orderedGaps.length} indicateurs
            </p>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={metricOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orderedGaps.map((gap) => {
                  const metricInfo = METRIC_EXPLANATIONS[gap.metric] || {
                    label: gap.metric,
                    unit: "",
                    explanation: "Métrique physiologique contribuant à ta performance.",
                    whyItMatters: "Cette métrique influence directement ta capacité à atteindre ton objectif.",
                    howToImprove: "Consulte ton coach pour des recommandations spécifiques.",
                    Icon: Activity,
                  };
                  return (
                    <SortableMetricRow
                      key={gap.metric}
                      id={gap.metric}
                      gap={gap}
                      metricInfo={metricInfo}
                      isReorderMode={isReorderMode}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Footer pédagogie discret */}
        <div className="flex items-start gap-2 pt-4 border-t border-border/30 text-[11px] text-muted-foreground/80 leading-relaxed">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
          <p>
            Comparaison à la cible idéale pour ton objectif.
            Écart <span className="text-[hsl(var(--success))] font-medium">positif</span> = au-dessus ·
            <span className="text-[hsl(var(--destructive))] font-medium"> négatif</span> = axe de progression.
            Clique une métrique pour les détails.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Sous-composant KPI ─────────────────────────────────────
function KpiCell({ label, value, tone }: { label: string; value: string | number; tone: StatusTone }) {
  const style = TONE_STYLES[tone];
  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-background/50 border border-border/40">
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", style.accent)} />
      <div className="min-w-0">
        <div className={cn("text-base font-semibold tabular-nums leading-none", style.text)}>
          {value}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
          {label}
        </div>
      </div>
    </div>
  );
}
