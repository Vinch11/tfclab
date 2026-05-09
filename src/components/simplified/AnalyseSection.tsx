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
    ? { label: "Donnée manquante", color: "text-muted-foreground", bgColor: "bg-muted/30 border-border/40", icon: Minus }
    : getGapStatus(gap.gap);
  const StatusIcon = status.icon;

  const hasValues = gap.value != null && gap.target != null;
  const delta = hasValues ? (gap.value as number) - (gap.target as number) : null;
  const isInverse = gap.metric === "VLamax"; // VLamax: lower is better
  const displayDelta = isInverse && delta !== null ? -delta : delta;
  const remainsToWork = delta !== null && ((isInverse && delta > 0) || (!isInverse && delta < 0));

  const formatVal = (v: number) => v < 10 ? v.toFixed(2) : v.toFixed(1);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("rounded-xl border transition-colors", status.bgColor)}>
        <CollapsibleTrigger className="w-full text-left">
          <div className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                {showDragHandle && (
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className="cursor-grab active:cursor-grabbing touch-none"
                    {...dragHandleProps}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </div>
                )}
                <span className="text-lg">{metricInfo.icon}</span>
                <span className="text-sm font-bold">{metricInfo.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon className={cn("h-4 w-4", status.color)} />
                <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5", status.color)}>
                  {status.label}
                </Badge>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  open && "rotate-180"
                )} />
              </div>
            </div>

            {/* Comparatif Actuel → Cible — TOUJOURS VISIBLE */}
            {hasValues && (
              <div className="flex items-center gap-2 mb-2 text-xs">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/60 border border-border/30">
                  <span className="text-muted-foreground">Actuel</span>
                  <span className="font-bold text-foreground">{formatVal(gap.value as number)}</span>
                  <span className="text-muted-foreground/60">{metricInfo.unit}</span>
                </div>
                <span className="text-muted-foreground/40">→</span>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/60 border border-border/30">
                  <span className="text-muted-foreground">Cible</span>
                  <span className="font-bold text-foreground">{formatVal(gap.target as number)}</span>
                  <span className="text-muted-foreground/60">{metricInfo.unit}</span>
                  {gap.targetRange && (
                    <span className="ml-0.5 text-[10px] text-muted-foreground/60 font-normal">
                      ({gap.targetRange.min.toFixed(2)}–{gap.targetRange.max.toFixed(2)})
                    </span>
                  )}
                </div>
                {delta !== null && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5",
                      remainsToWork
                        ? "border-[hsl(var(--destructive)/0.4)] text-[hsl(var(--destructive))]"
                        : "border-[hsl(var(--success)/0.4)] text-[hsl(var(--success))]"
                    )}
                  >
                    {remainsToWork ? "Δ " : "✓ +"}
                    {Math.abs(displayDelta!).toFixed(isInverse ? 2 : 1)} {metricInfo.unit} {remainsToWork ? "à combler" : "d'avance"}
                  </Badge>
                )}
              </div>
            )}

            {/* Barre de progression */}
            {(() => {
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
                <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
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
              );
            })()}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2.5">
            <div className="p-2.5 rounded-lg bg-background/60">
              <p className="text-[10px] font-bold text-foreground mb-0.5">💡 Qu'est-ce que c'est ?</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{metricInfo.explanation}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-background/60">
              <p className="text-[10px] font-bold text-foreground mb-0.5">🎯 Pourquoi c'est important</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{metricInfo.whyItMatters}</p>
            </div>
            {remainsToWork && (
              <div className="p-2.5 rounded-lg bg-primary/5">
                <p className="text-[10px] font-bold text-foreground mb-0.5">🔧 Comment améliorer</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{metricInfo.howToImprove}</p>
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
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Analyse Physiologique</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Évaluation détaillée de tes capacités — clique sur une métrique pour en savoir plus
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isReorderMode ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => {
                if (isReorderMode) setIsReorderMode(false);
                else setIsReorderMode(true);
              }}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {isReorderMode ? "Terminé" : "Trier"}
            </Button>
            <Badge variant="outline" className="text-xs">
              {Math.round(diagnostic.meta.dataCompleteness * 100)}% données
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Synthèse rapide */}
        <div className="p-3 rounded-xl bg-muted/50 border">
          <p className="text-sm font-medium">{synthesis.headline}</p>
          {synthesis.strengths.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {synthesis.strengths.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  ✅ {s}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Explication contextuelle */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <p>
              Chaque métrique est comparée à la <strong>cible idéale</strong> pour ton objectif (<strong>{diagnostic.objectif}</strong>) 
              et ton niveau d'ambition (<strong>{diagnostic.ambition}</strong>).
            </p>
            <p className="mt-1">
              📊 Un écart <strong className="text-[hsl(var(--success))]">positif</strong> = au-dessus de la cible. 
              Un écart <strong className="text-[hsl(var(--destructive))]">négatif</strong> = axe de progression. 
              Clique sur chaque métrique pour voir les détails et conseils.
            </p>
          </div>
        </div>

        {/* Hint réorganisation */}
        {isReorderMode && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary">
            <GripVertical className="h-4 w-4" />
            Glisse les métriques pour réorganiser l'ordre d'affichage
          </div>
        )}

        {/* Liste des métriques — avec drag & drop */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={metricOrder} strategy={verticalListSortingStrategy}>
            <div className="space-y-2.5">
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

        {/* Alertes */}
        {synthesis.alerts.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">⚡ Alertes</p>
            {synthesis.alerts.map((alert, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 p-2.5 rounded-xl text-xs",
                  alert.severity === "critical" && "bg-destructive/10 text-destructive border border-destructive/20",
                  alert.severity === "warning" && "bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning))] border border-[hsl(var(--warning)/0.2)]",
                  alert.severity === "info" && "bg-primary/10 text-primary border border-primary/20"
                )}
              >
                <span className="text-sm">{alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️"}</span>
                <span className="leading-relaxed">{alert.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
