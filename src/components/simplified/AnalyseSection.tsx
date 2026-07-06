/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SECTION ANALYSE — Dashboard Simplifié
 * 
 * Liste des métriques avec explications pédagogiques détaillées
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BarChart3, TrendingUp, TrendingDown, Minus, Info, ChevronDown, GripVertical, ArrowUpDown } from "lucide-react";
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

interface AnalyseSectionProps {
  diagnostic: AthleteDiagnostic;
  className?: string;
}

type AnalysisGap = AthleteDiagnostic["limiter"]["gapAnalysis"][number] & {
  targetRange?: { min: number; max: number };
};

// Explications pédagogiques enrichies par métrique
const METRIC_EXPLANATIONS: Record<string, {
  label: string;
  unit: string;
  explanation: string;
  whyItMatters: string;
  howToImprove: string;
  icon: string;
}> = {
  "VO2max": {
    label: "VO2max",
    unit: "ml/kg/min",
    explanation: "Capacité maximale de ton corps à utiliser l'oxygène. C'est le « moteur aérobie » — plus il est puissant, plus tu peux soutenir une intensité élevée longtemps.",
    whyItMatters: "Le VO2max fixe le plafond de ta performance aérobie. Tous les seuils (FTP, VMA, allures marathon) en dépendent. Un VO2max élevé signifie un potentiel de performance plus grand.",
    howToImprove: "Intervalles VO2max (3-5min à 90-105% PMA/VMA), séances de côtes longues, course en fractionné type 30/30 ou billat.",
    icon: "🫁",
  },
  "FTP/kg": {
    label: "FTP/kg",
    unit: "W/kg",
    explanation: "Puissance seuil fonctionnel rapportée au poids. Représente l'intensité maximale soutenable pendant ~1 heure.",
    whyItMatters: "C'est l'indicateur de référence en cyclisme pour comparer les athlètes. Il détermine directement ta vitesse en montée et ta capacité à maintenir un effort soutenu.",
    howToImprove: "Sweet spot (88-93% FTP), intervalles au seuil (2x20min), travail de force spécifique, et optimisation du poids corporel.",
    icon: "⚡",
  },
  "VMA": {
    label: "VMA",
    unit: "km/h",
    explanation: "Vitesse Maximale Aérobie : l'allure à laquelle tu atteins ton VO2max. Référence fondamentale pour calibrer toutes tes allures d'entraînement en course à pied.",
    whyItMatters: "La VMA est le pilier de la planification en course à pied. Tes allures marathon (~75-80% VMA), semi (~82-87% VMA) et 10km (~88-93% VMA) en découlent directement.",
    howToImprove: "Fractionné court (200-400m à 100-110% VMA), séances longues à 90-95% VMA (1000m/1200m), côtes courtes explosives.",
    icon: "🏃",
  },
  "VLamax": {
    label: "VLamax",
    unit: "mmol/L/s",
    explanation: "Puissance glycolytique maximale. Mesure la vitesse de production de lactate. Pour l'endurance longue, une VLamax basse (< 0.4) est souhaitable.",
    whyItMatters: "Une VLamax élevée signifie que tu consommes beaucoup de glycogène et produis du lactate rapidement. Sur longue distance, cela provoque un épuisement prématuré des réserves (« le mur »). Une VLamax basse favorise l'utilisation des graisses.",
    howToImprove: "Volume Z2 élevé (sorties longues 3-5h), suppression des sprints courts, travail de tempo prolongé, stratégie « train low » (entraînement à jeun).",
    icon: "🔬",
  },
  "TTE": {
    label: "TTE",
    unit: "min",
    explanation: "Time To Exhaustion : durée de maintien du FTP. Reflète l'endurance musculaire et métabolique au seuil.",
    whyItMatters: "Le TTE mesure combien de temps tu peux maintenir ton seuil fonctionnel. Un TTE > 50min est excellent pour les longues distances. C'est un indicateur de ta « résistance à la fatigue » au seuil.",
    howToImprove: "Blocs au seuil progressifs (2x20 → 2x30 → 1x45min), intervalles longs à 95-100% FTP, augmentation progressive du volume au seuil.",
    icon: "⏱️",
  },
  "Economy": {
    label: "Économie",
    unit: "/100",
    explanation: "Efficience du geste sportif. Combine cadence, élasticité musculaire et technique. Un score élevé = moins d'énergie gaspillée.",
    whyItMatters: "À VO2max et FTP égaux, un athlète plus économe ira plus vite car il consomme moins d'oxygène par km/watt. C'est souvent ce qui différencie les bons des excellents.",
    howToImprove: "Gammes techniques (drills de foulée, travail de cadence), renforcement musculaire spécifique, plyométrie, travail de coordination.",
    icon: "🎯",
  },
  "FatMax": {
    label: "FatMax",
    unit: "%FTP",
    explanation: "Intensité à laquelle tu brûles le maximum de graisses. Plus ce seuil est élevé, mieux tu épargnes tes réserves de glycogène.",
    whyItMatters: "Sur Ironman ou ultra, les réserves de glycogène sont limitées (~2h d'effort). Un FatMax élevé signifie que tu peux maintenir une intensité correcte tout en brûlant majoritairement des graisses, retardant le « mur ».",
    howToImprove: "Sorties longues Z2 à jeun, périodisation nutritionnelle (train low), réduction de la VLamax, augmentation progressive du volume aérobie.",
    icon: "🔥",
  },
  "Durability": {
    label: "Durabilité",
    unit: "/100",
    explanation: "Résistance à la dégradation de la performance sur la durée. Combine la dérive cardiaque, le TTE et la stabilité de puissance/allure.",
    whyItMatters: "Un athlète « durable » perd moins de 5% de sa puissance après 3h. La durabilité détermine ta capacité à finir fort et à maintenir ton allure cible jusqu'à la ligne d'arrivée.",
    howToImprove: "Sorties très longues (>3h), back-to-back weekends, courses d'entraînement longues, simulation de course à l'entraînement.",
    icon: "🛡️",
  },
};

function getGapStatus(gap: number): { label: string; color: string; bgColor: string; icon: typeof TrendingUp } {
  if (gap >= 5) return { label: "Au-dessus de la cible", color: "text-[hsl(var(--success))]", bgColor: "bg-[hsl(var(--success)/0.08)] border-[hsl(var(--success)/0.2)]", icon: TrendingUp };
  if (gap >= -5) return { label: "Dans la cible", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/5 border-blue-500/20", icon: Minus };
  if (gap >= -15) return { label: "À développer", color: "text-[hsl(var(--warning))]", bgColor: "bg-[hsl(var(--warning)/0.08)] border-[hsl(var(--warning)/0.2)]", icon: TrendingDown };
  return { label: "Prioritaire", color: "text-[hsl(var(--destructive))]", bgColor: "bg-[hsl(var(--destructive)/0.08)] border-[hsl(var(--destructive)/0.2)]", icon: TrendingDown };
}

function MetricCard({ gap, metricInfo, showDragHandle = false, dragHandleProps = {} }: {
  gap: AnalysisGap;
  metricInfo: typeof METRIC_EXPLANATIONS[string];
  showDragHandle?: boolean;
  dragHandleProps?: Record<string, any>;
}) {
  const [open, setOpen] = useState(false);
  const isUnknown = gap.status === "unknown" || gap.value == null;
  const status = isUnknown
    ? { label: "Donnée manquante", color: "text-muted-foreground", bgColor: "bg-muted/20 border-border/40", accent: "text-muted-foreground", icon: Minus }
    : (() => {
        const s = getGapStatus(gap.gap);
        return { ...s, accent: s.color };
      })();
  const StatusIcon = status.icon;

  const hasValues = gap.value != null && gap.target != null;
  const delta = hasValues ? (gap.value as number) - (gap.target as number) : null;
  const isInverse = gap.metric === "VLamax"; // VLamax: lower is better
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

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("rounded-2xl border transition-colors", status.bgColor)}>
        <CollapsibleTrigger className="w-full text-left group">
          <div className="p-5 sm:p-6">
            {/* Ligne 1 : identité (label discret) + statut */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                {showDragHandle && (
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className="cursor-grab active:cursor-grabbing touch-none -ml-1"
                    {...dragHandleProps}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground/60 hover:text-foreground transition-colors" />
                  </div>
                )}
                <span className="text-base opacity-80">{metricInfo.icon}</span>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
                  {metricInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusIcon className={cn("h-3.5 w-3.5", status.accent)} />
                <span className={cn("text-[11px] font-medium hidden sm:inline", status.accent)}>
                  {status.label}
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground/60 transition-transform ml-1",
                  open && "rotate-180"
                )} />
              </div>
            </div>

            {/* Ligne 2 : LA valeur dominante */}
            <div className="flex items-baseline gap-2 mb-1">
              {isUnknown ? (
                <span className="text-2xl font-semibold text-muted-foreground/70 tabular-nums">—</span>
              ) : (
                <>
                  <span className={cn("text-4xl sm:text-5xl font-semibold tracking-tight tabular-nums leading-none", status.accent)}>
                    {formatVal(gap.value as number)}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">{metricInfo.unit}</span>
                </>
              )}
            </div>

            {/* Ligne 3 : cible + delta, en retrait */}
            {hasValues && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-4">
                <span>
                  Cible <span className="tabular-nums text-foreground/80 font-medium">{formatVal(gap.target as number)}</span>
                  {gap.targetRange && (
                    <span className="ml-1 text-muted-foreground/60 tabular-nums">
                      ({gap.targetRange.min.toFixed(2)}–{gap.targetRange.max.toFixed(2)})
                    </span>
                  )}
                </span>
                {delta !== null && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className={cn(
                      "font-medium tabular-nums",
                      remainsToWork ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--success))]"
                    )}>
                      {remainsToWork ? "−" : "+"}
                      {Math.abs(displayDelta!).toFixed(isInverse ? 2 : 1)} {remainsToWork ? "à combler" : "d'avance"}
                    </span>
                  </>
                )}
              </div>
            )}
            {!hasValues && !isUnknown && <div className="mb-4" />}
            {isUnknown && <div className="mb-4" />}

            {/* Barre de progression, plus fine */}
            <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  isUnknown && "bg-muted-foreground/30"
                )}
                style={{
                  width: `${pct}%`,
                  ...(!isUnknown ? {
                    background: pct >= 95
                      ? "linear-gradient(90deg, hsl(0,75%,50%) 0%, hsl(15,85%,50%) 15%, hsl(30,85%,50%) 30%, hsl(45,80%,50%) 45%, hsl(60,70%,50%) 55%, hsl(90,55%,50%) 70%, hsl(120,60%,45%) 85%, hsl(142,71%,45%) 100%)"
                      : pct >= 70
                        ? "linear-gradient(90deg, hsl(0,75%,50%) 0%, hsl(20,85%,50%) 25%, hsl(40,80%,50%) 50%, hsl(60,70%,50%) 75%, hsl(80,55%,48%) 100%)"
                        : pct >= 45
                          ? "linear-gradient(90deg, hsl(0,75%,50%) 0%, hsl(15,85%,50%) 40%, hsl(35,80%,50%) 100%)"
                          : "linear-gradient(90deg, hsl(0,75%,50%) 0%, hsl(10,80%,50%) 100%)"
                  } : {}),
                }}
              />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-3 border-t border-border/40 pt-4">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Qu'est-ce que c'est</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{metricInfo.explanation}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pourquoi ça compte</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{metricInfo.whyItMatters}</p>
            </div>
            {remainsToWork && (
              <div className="pt-2 border-t border-border/30">
                <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Comment améliorer</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{metricInfo.howToImprove}</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Sortable wrapper for MetricCard
function SortableMetricCard({ id, gap, metricInfo, isReorderMode }: {
  id: string;
  gap: Parameters<typeof MetricCard>[0]["gap"];
  metricInfo: Parameters<typeof MetricCard>[0]["metricInfo"];
  isReorderMode: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isReorderMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-50 z-50")}
    >
      <MetricCard
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

  // Default sort: by gap ascending (worst first)
  const defaultOrder = useMemo(
    () => [...gapAnalysis].sort((a, b) => a.gap - b.gap).map(g => g.metric),
    [gapAnalysis]
  );

  const [metricOrder, setMetricOrder] = useState<string[]>(defaultOrder);

  // Sync if gapAnalysis changes
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

  return (
  const completenessPct = Math.round(diagnostic.meta.dataCompleteness * 100);
  const criticalCount = synthesis.alerts.filter(a => a.severity === "critical").length;
  const warningCount = synthesis.alerts.filter(a => a.severity === "warning").length;

  return (
    <Card className={cn("overflow-hidden border-border/60", className)}>
      {/* ── HERO : une valeur dominante = la headline ── */}
      <CardHeader className="pb-6 pt-6 px-6 sm:px-8 border-b border-border/40">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Analyse physiologique
              </p>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                {diagnostic.objectif} · {diagnostic.ambition}
              </p>
            </div>
          </div>
          <Button
            variant={isReorderMode ? "default" : "ghost"}
            size="sm"
            className="h-7 text-[11px] gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setIsReorderMode(v => !v)}
          >
            <ArrowUpDown className="h-3 w-3" />
            {isReorderMode ? "Terminé" : "Trier"}
          </Button>
        </div>

        {/* Headline — LA phrase dominante */}
        <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight leading-snug text-foreground">
          {synthesis.headline}
        </CardTitle>

        {/* KPIs de contexte, en retrait */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold tabular-nums text-foreground">{completenessPct}%</span>
            <span className="text-[11px] text-muted-foreground">données</span>
          </div>
          {synthesis.strengths.length > 0 && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-semibold tabular-nums text-[hsl(var(--success))]">{synthesis.strengths.length}</span>
              <span className="text-[11px] text-muted-foreground">force{synthesis.strengths.length > 1 ? "s" : ""}</span>
            </div>
          )}
          {(criticalCount + warningCount) > 0 && (
            <div className="flex items-baseline gap-1.5">
              <span className={cn(
                "text-lg font-semibold tabular-nums",
                criticalCount > 0 ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--warning))]"
              )}>
                {criticalCount + warningCount}
              </span>
              <span className="text-[11px] text-muted-foreground">alerte{criticalCount + warningCount > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* Chips forces, très discrètes */}
        {synthesis.strengths.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {synthesis.strengths.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--success)/0.08)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.2)]"
              >
                ✓ {s}
              </span>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-6 sm:p-8 space-y-6">
        {/* Alertes critiques : remontées en tête si présentes */}
        {synthesis.alerts.length > 0 && (
          <div className="space-y-1.5">
            {synthesis.alerts.map((alert, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2.5 p-3 rounded-xl text-xs leading-relaxed border",
                  alert.severity === "critical" && "bg-[hsl(var(--destructive)/0.06)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.2)]",
                  alert.severity === "warning" && "bg-[hsl(var(--warning)/0.06)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.2)]",
                  alert.severity === "info" && "bg-primary/5 text-primary border-primary/15"
                )}
              >
                <span className="text-sm shrink-0 leading-none mt-0.5">
                  {alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️"}
                </span>
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Hint réorganisation */}
        {isReorderMode && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-[11px] text-primary">
            <GripVertical className="h-3.5 w-3.5" />
            Glisse les métriques pour réorganiser l'ordre
          </div>
        )}

        {/* Section métriques : label discret séparateur */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Métriques
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={metricOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {orderedGaps.map((gap) => {
                  const metricInfo = METRIC_EXPLANATIONS[gap.metric] || {
                    label: gap.metric,
                    unit: "",
                    explanation: "Métrique physiologique contribuant à ta performance.",
                    whyItMatters: "Cette métrique influence directement ta capacité à atteindre ton objectif.",
                    howToImprove: "Consulte ton coach pour des recommandations spécifiques.",
                    icon: "📊",
                  };

                  return (
                    <SortableMetricCard
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

        {/* Pédagogie contextuelle : reléguée en footer discret */}
        <div className="flex items-start gap-2 pt-4 border-t border-border/30 text-[11px] text-muted-foreground/80 leading-relaxed">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
          <p>
            Chaque métrique est comparée à la cible idéale pour ton objectif.
            Écart <span className="text-[hsl(var(--success))]">positif</span> = au-dessus de la cible ·
            écart <span className="text-[hsl(var(--destructive))]">négatif</span> = axe de progression.
            Clique pour les détails et conseils.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
