/**
 * Report Section Order Editor
 * Permet de réorganiser l'ordre des sections dans le rapport exporté
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  GripVertical, 
  RotateCcw, 
  Eye, 
  EyeOff,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReportSections } from "./ExportTools";

// Clé localStorage pour l'ordre des sections
const STORAGE_KEY = "vlab-export-section-order";

// Labels des sections
export const SECTION_LABELS: Record<keyof ReportSections, string> = {
  synthese: "Synthèse Exécutive",
  compass: "Metabolic Compass™",
  profilMetabolique: "Profil Métabolique Complet",
  indicateurs: "Indicateurs Clés",
  raceReadiness: "Race Readiness",
  injuryRisk: "Risque de Blessure CAP",
  nutritionV2: "Nutrition Prédictive V2",
  fatmaxTFCL: "FatMax TFCL™",
  ambitionTargets: "Cibles par Ambition",
  ambitionPredictions: "Prédictions Ambition",
  evolutionCharts: "Graphiques Évolution",
  ageAdjustment: "Ajustement Âge (AAI)",
  methodology: "Méthodologies Entraînement",
  twoForCoaching: "Analyse Two For Coaching Lab™",
  wahoo: "Suggestions Wahoo",
  planSuggestion: "Suggestion de Plan",
  templateRecommendation: "Template Recommandé",
  zones: "Zones d'entraînement",
  historique: "Historique Snapshots",
  tests: "Historique Tests",
  checkins: "Check-ins",
  comprendre: "Comprendre mes scores",
  qualite: "Qualité des données",
};

// Ordre par défaut
export const DEFAULT_SECTION_ORDER: (keyof ReportSections)[] = [
  "synthese",
  "compass",
  "profilMetabolique",
  "indicateurs",
  "raceReadiness",
  "injuryRisk",
  "nutritionV2",
  "fatmaxTFCL",
  "ambitionTargets",
  "ambitionPredictions",
  "evolutionCharts",
  "ageAdjustment",
  "methodology",
  "twoForCoaching",
  "wahoo",
  "planSuggestion",
  "templateRecommendation",
  "zones",
  "historique",
  "tests",
  "checkins",
  "comprendre",
  "qualite",
];

// Récupérer l'ordre des sections depuis localStorage
export function getSectionOrder(): (keyof ReportSections)[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as (keyof ReportSections)[];
      // Valider et compléter avec les sections manquantes
      const validKeys = new Set(DEFAULT_SECTION_ORDER);
      const filteredParsed = parsed.filter(k => validKeys.has(k));
      const missing = DEFAULT_SECTION_ORDER.filter(k => !filteredParsed.includes(k));
      return [...filteredParsed, ...missing];
    }
  } catch {
    // Ignore errors
  }
  return DEFAULT_SECTION_ORDER;
}

// Sauvegarder l'ordre des sections
export function saveSectionOrder(order: (keyof ReportSections)[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

interface SortableItemProps {
  id: keyof ReportSections;
  label: string;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SortableItem({ id, label, index, total, onMoveUp, onMoveDown }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg bg-muted/30 border transition-all",
        isDragging && "opacity-50 shadow-lg scale-[1.02] z-50 bg-background"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <span className="text-xs font-medium text-muted-foreground w-5">{index + 1}</span>
      
      <span className="flex-1 text-sm truncate">{label}</span>
      
      <div className="flex gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ReportSectionOrderEditor() {
  const [order, setOrder] = useState<(keyof ReportSections)[]>(getSectionOrder);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sauvegarder automatiquement
  useEffect(() => {
    if (hasChanges) {
      saveSectionOrder(order);
    }
  }, [order, hasChanges]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = order.indexOf(active.id as keyof ReportSections);
      const newIndex = order.indexOf(over.id as keyof ReportSections);
      
      setOrder(arrayMove(order, oldIndex, newIndex));
      setHasChanges(true);
    }
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= order.length) return;
    
    setOrder(arrayMove(order, index, newIndex));
    setHasChanges(true);
  };

  const resetOrder = () => {
    setOrder(DEFAULT_SECTION_ORDER);
    saveSectionOrder(DEFAULT_SECTION_ORDER);
    setHasChanges(false);
  };

  const isDefaultOrder = JSON.stringify(order) === JSON.stringify(DEFAULT_SECTION_ORDER);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Ordre des sections du rapport</CardTitle>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={resetOrder}
            disabled={isDefaultOrder}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
          </Button>
        </div>
        <CardDescription>
          Glissez-déposez pour réorganiser les sections dans le rapport PDF exporté
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {order.map((sectionKey, index) => (
                  <SortableItem
                    key={sectionKey}
                    id={sectionKey}
                    label={SECTION_LABELS[sectionKey]}
                    index={index}
                    total={order.length}
                    onMoveUp={() => moveItem(index, "up")}
                    onMoveDown={() => moveItem(index, "down")}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </ScrollArea>
        
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
          <span>{order.length} sections</span>
          {hasChanges && (
            <Badge variant="outline" className="text-xs">
              Modifications sauvegardées
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
