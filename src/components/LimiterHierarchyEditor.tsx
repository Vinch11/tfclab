/**
 * LimiterHierarchyEditor — Permet au coach de réordonner la hiérarchie des limiteurs
 * avant la génération du plan IA.
 * Utilise @dnd-kit pour le drag-and-drop.
 */

import { useState, useEffect } from "react";
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, RotateCcw, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UnifiedGapAnalysis } from "@/lib/v2/unifiedLimiterDetection";

export interface LimiterItem {
  metric: string;
  value: number | null;
  target: number;
  weightedImpact: number;
  status: "optimal" | "acceptable" | "limiting" | "unknown";
}

interface SortableLimiterProps {
  item: LimiterItem;
  index: number;
  maxImpact: number;
  isOverridden: boolean;
}

function SortableLimiter({ item, index, maxImpact, isOverridden }: SortableLimiterProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.metric });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isPrimary = index === 0;
  const relativeImpact = (item.weightedImpact / maxImpact) * 100;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "space-y-1 rounded-md p-2 transition-colors",
        isDragging && "opacity-50 z-50 bg-muted",
        isOverridden && "bg-accent/10 border border-accent/30"
      )}
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted"
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <span className="text-xs font-mono text-muted-foreground w-4 text-right">
          {index + 1}.
        </span>
        <Badge
          variant={isPrimary ? "destructive" : item.status === "limiting" ? "destructive" : item.status === "unknown" ? "outline" : "secondary"}
          className={`text-[10px] ${isPrimary ? "" : "opacity-80"}`}
        >
          {isPrimary ? "🎯" : item.status === "limiting" ? "🔴" : item.status === "unknown" ? "⚪" : "🟡"} {item.metric}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {item.value?.toFixed(item.metric === "VLamax" ? 2 : 1) ?? "?"} vs {item.target.toFixed(item.metric === "VLamax" ? 2 : 1)}
        </span>
      </div>
      <div className="ml-10 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isPrimary ? "bg-destructive" : item.status === "limiting" ? "bg-destructive/70" : item.status === "unknown" ? "bg-muted-foreground/30" : "bg-amber-500/60"
            }`}
            style={{ width: `${relativeImpact}%` }}
          />
        </div>
        <span className="text-[9px] text-muted-foreground w-8 text-right">
          {item.weightedImpact.toFixed(0)}
        </span>
      </div>
    </div>
  );
}

interface LimiterHierarchyEditorProps {
  gaps: UnifiedGapAnalysis[];
  confidence: number;
  limiterLabel: string;
  limiterExplanation: string;
  leverEmoji: string;
  leverLabel: string;
  primaryLimiter: string;
  onOrderChange: (orderedMetrics: string[]) => void;
}

export function LimiterHierarchyEditor({
  gaps,
  confidence,
  limiterLabel,
  limiterExplanation,
  leverEmoji,
  leverLabel,
  primaryLimiter,
  onOrderChange,
}: LimiterHierarchyEditorProps) {
  // Build initial sorted list from diagnostic
  const defaultOrder = [...gaps]
    .filter(g => g.weightedImpact > 0 && g.metric !== "Disponibilité")
    .sort((a, b) => b.weightedImpact - a.weightedImpact);

  const [items, setItems] = useState<LimiterItem[]>(() =>
    defaultOrder.map(g => ({
      metric: g.metric,
      value: g.value,
      target: g.target,
      weightedImpact: g.weightedImpact,
      status: g.status,
    }))
  );

  const [isOverridden, setIsOverridden] = useState(false);

  // Signature stable des gaps (métrique + impact arrondi) — évite reset au moindre re-render
  const gapsSignature = [...gaps]
    .filter(g => g.weightedImpact > 0 && g.metric !== "Disponibilité")
    .map(g => `${g.metric}:${Math.round(g.weightedImpact)}`)
    .sort()
    .join("|");

  // Reset uniquement quand la signature change réellement (nouvel athlète/objectif)
  useEffect(() => {
    const newDefault = [...gaps]
      .filter(g => g.weightedImpact > 0 && g.metric !== "Disponibilité")
      .sort((a, b) => b.weightedImpact - a.weightedImpact);
    setItems(newDefault.map(g => ({
      metric: g.metric,
      value: g.value,
      target: g.target,
      weightedImpact: g.weightedImpact,
      status: g.status,
    })));
    setIsOverridden(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gapsSignature]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems(prev => {
      const oldIndex = prev.findIndex(i => i.metric === active.id);
      const newIndex = prev.findIndex(i => i.metric === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      setIsOverridden(true);
      onOrderChange(reordered.map(i => i.metric));
      return reordered;
    });
  };

  const handleReset = () => {
    const newDefault = [...gaps]
      .filter(g => g.weightedImpact > 0 && g.metric !== "Disponibilité")
      .sort((a, b) => b.weightedImpact - a.weightedImpact);
    const resetItems = newDefault.map(g => ({
      metric: g.metric,
      value: g.value,
      target: g.target,
      weightedImpact: g.weightedImpact,
      status: g.status,
    }));
    setItems(resetItems);
    setIsOverridden(false);
    onOrderChange([]);  // empty = use default
  };

  if (items.length === 0) return null;

  const maxImpact = Math.max(...items.map(i => i.weightedImpact), 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOverridden && (
            <Badge variant="outline" className="text-[9px] gap-1 border-accent bg-accent text-accent-foreground">
              <ShieldAlert className="h-3 w-3" />
              Ordre modifié par le coach
            </Badge>
          )}
        </div>
        {isOverridden && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] gap-1 text-muted-foreground"
            onClick={handleReset}
          >
            <RotateCcw className="h-3 w-3" />
            Réinitialiser
          </Button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">
        ↕️ Glissez pour réordonner les limiteurs. L'ordre influence directement la structure du plan IA.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(i => i.metric)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item, idx) => (
            <SortableLimiter
              key={item.metric}
              item={item}
              index={idx}
              maxImpact={maxImpact}
              isOverridden={isOverridden}
            />
          ))}
        </SortableContext>
      </DndContext>

      {primaryLimiter !== "none" && (
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-1.5">{limiterExplanation}</p>
          <Badge variant="secondary" className="text-[10px]">
            {leverEmoji} Levier : {leverLabel}
          </Badge>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-right">
        Confiance: {(confidence * 100).toFixed(0)}%
      </p>
    </div>
  );
}
