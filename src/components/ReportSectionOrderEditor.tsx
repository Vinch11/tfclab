/**
 * Report Section Order Editor
 * Permet de réorganiser l'ordre et la visibilité des sections dans le rapport exporté
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  GripVertical, 
  RotateCcw, 
  Eye, 
  EyeOff,
  ChevronUp,
  ChevronDown,
  LayoutList,
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

// Clés localStorage
const ORDER_STORAGE_KEY = "vlab-export-section-order";
const VISIBILITY_STORAGE_KEY = "vlab-export-sections";

// Labels des sections avec icônes miniatures
export const SECTION_LABELS: Record<keyof ReportSections, string> = {
  synthese: "Synthèse Exécutive",
  compass: "Metabolic Compass™",
  profilMetabolique: "Profil Métabolique Complet",
  vlamaxZoneConfidence: "⚡ VLamax Zone × Confiance",
  indicateurs: "Indicateurs Clés",
  potentielPhysiologique: "Potentiel Physiologique",
  disponibiliteTFCL: "Disponibilité TFCL™",
  raceSimulation: "Simulation de Course TFCL™",
  pacingEnvelope: "📊 Pacing Envelope™",
  longDistancePacing: "🏃 Long Distance Pacing Discipline",
  doubleBoucleCAP: "🔄 Double Boucle CAP",
  potentielPhysiologiqueRunning: "🏃 Potentiel Physiologique CAP",
  pacingEnvelopeRunning: "🏃 Pacing Envelope™ CAP",
  injuryRisk: "Risque de Blessure CAP",
  nutritionV2: "Nutrition Prédictive V2",
  fatmaxTFCL: "FatMax TFCL™",
  ambitionTargets: "Cibles par Ambition",
  ambitionPredictions: "Prédictions Ambition",
  evolutionCharts: "Graphiques Évolution",
  ageAdjustment: "Ajustement Âge (AAI)",
  ambitionLegend: "Légende des Cibles",
  methodology: "Méthodologies Entraînement",
  twoForCoaching: "Analyse Two For Coaching Lab™",
  wahoo: "Suggestions Wahoo",
  planSuggestion: "Suggestion de Plan",
  templateRecommendation: "Template Recommandé",
  zones: "Zones d'entraînement",
  historique: "Historique Snapshots",
  tests: "Historique Tests",
  testsCalibration: "Tests & Calibration TFCL",
  calibrationEvidence: "🔬 Calibration Evidence Summary",
  fitImports: "📁 Tests Observés (import FIT)",
  checkins: "État de Fatigue (Snapshot)",
  comprendre: "Comprendre mes scores",
  qualite: "Qualité des données",
  roadmap: "📋 Roadmap Stratégique",
  lactateCurve: "🧪 Courbe Lactate Simulée (Mader-Heck)",
  substrateCurve: "🔥 Oxydation Lipides / Glucides",
  performancePrediction: "⏱️ Prédiction de Performance",
};

// Catégories pour regroupement visuel
const SECTION_CATEGORIES: Record<keyof ReportSections, string> = {
  synthese: "Synthèse",
  compass: "Analyse",
  profilMetabolique: "Analyse",
  vlamaxZoneConfidence: "Analyse",
  indicateurs: "Analyse",
  potentielPhysiologique: "Performance",
  disponibiliteTFCL: "Performance",
  raceSimulation: "Performance",
  pacingEnvelope: "Performance",
  longDistancePacing: "Performance",
  doubleBoucleCAP: "Running",
  potentielPhysiologiqueRunning: "Running",
  pacingEnvelopeRunning: "Running",
  injuryRisk: "Performance",
  nutritionV2: "Nutrition",
  fatmaxTFCL: "Nutrition",
  ambitionTargets: "Objectifs",
  ambitionPredictions: "Objectifs",
  evolutionCharts: "Historique",
  ageAdjustment: "Profil",
  ambitionLegend: "Objectifs",
  methodology: "Entraînement",
  twoForCoaching: "Entraînement",
  wahoo: "Entraînement",
  planSuggestion: "Entraînement",
  templateRecommendation: "Entraînement",
  zones: "Entraînement",
  historique: "Historique",
  tests: "Historique",
  testsCalibration: "Analyse",
  calibrationEvidence: "Analyse",
  fitImports: "Analyse",
  checkins: "Historique",
  comprendre: "Aide",
  qualite: "Aide",
  roadmap: "Entraînement",
  lactateCurve: "Analyse",
  substrateCurve: "Analyse",
  performancePrediction: "Performance",
};

// Couleurs par catégorie
const CATEGORY_COLORS: Record<string, string> = {
  "Synthèse": "bg-primary/20 text-primary",
  "Analyse": "bg-blue-500/20 text-blue-600",
  "Performance": "bg-green-500/20 text-green-600",
  "Running": "bg-emerald-500/20 text-emerald-600",
  "Nutrition": "bg-orange-500/20 text-orange-600",
  "Objectifs": "bg-purple-500/20 text-purple-600",
  "Historique": "bg-gray-500/20 text-gray-600",
  "Profil": "bg-cyan-500/20 text-cyan-600",
  "Entraînement": "bg-amber-500/20 text-amber-600",
  "Aide": "bg-muted text-muted-foreground",
};

// Ordre par défaut
export const DEFAULT_SECTION_ORDER: (keyof ReportSections)[] = [
  "synthese",
  "compass",
  "profilMetabolique",
  "vlamaxZoneConfidence",
  "indicateurs",
  "potentielPhysiologique",
  "disponibiliteTFCL",
  "raceSimulation",
  "pacingEnvelope",
  "longDistancePacing",
  "doubleBoucleCAP",
  "potentielPhysiologiqueRunning",
  "pacingEnvelopeRunning",
  "injuryRisk",
  "nutritionV2",
  "fatmaxTFCL",
  "ambitionTargets",
  "ambitionPredictions",
  "evolutionCharts",
  "ageAdjustment",
  "ambitionLegend",
  "methodology",
  "twoForCoaching",
  "wahoo",
  "planSuggestion",
  "templateRecommendation",
  "zones",
  "historique",
  "tests",
  "testsCalibration",
  "calibrationEvidence",
  "fitImports",
  "checkins",
  "comprendre",
  "qualite",
  "roadmap",
  "lactateCurve",
  "substrateCurve",
  "performancePrediction",
];

// Visibilité par défaut (toutes visibles) - Also exported as DEFAULT_REPORT_SECTIONS
export const DEFAULT_VISIBILITY: Record<keyof ReportSections, boolean> = {
  synthese: true,
  compass: true,
  profilMetabolique: true,
  vlamaxZoneConfidence: true,
  indicateurs: true,
  potentielPhysiologique: true,
  disponibiliteTFCL: true,
  raceSimulation: true,
  pacingEnvelope: true,
  longDistancePacing: true,
  doubleBoucleCAP: true,
  potentielPhysiologiqueRunning: true,
  pacingEnvelopeRunning: true,
  injuryRisk: true,
  nutritionV2: true,
  fatmaxTFCL: true,
  ambitionTargets: true,
  ambitionPredictions: true,
  evolutionCharts: true,
  ageAdjustment: true,
  ambitionLegend: true,
  methodology: true,
  twoForCoaching: true,
  wahoo: true,
  planSuggestion: true,
  templateRecommendation: true,
  zones: true,
  historique: true,
  tests: true,
  testsCalibration: true,
  calibrationEvidence: true,
  fitImports: true,
  checkins: true,
  comprendre: true,
  qualite: true,
  roadmap: true,
  lactateCurve: true,
  substrateCurve: true,
  performancePrediction: true,
};

// Export alias for backward compatibility
export const DEFAULT_REPORT_SECTIONS = DEFAULT_VISIBILITY;

// Récupérer l'ordre des sections depuis localStorage
export function getSectionOrder(): (keyof ReportSections)[] {
  try {
    const stored = localStorage.getItem(ORDER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as (keyof ReportSections)[];
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

// Récupérer la visibilité des sections
export function getSectionVisibility(): Record<keyof ReportSections, boolean> {
  try {
    const stored = localStorage.getItem(VISIBILITY_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_VISIBILITY, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore errors
  }
  return DEFAULT_VISIBILITY;
}

// Sauvegarder l'ordre des sections
export function saveSectionOrder(order: (keyof ReportSections)[]) {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
}

// Sauvegarder la visibilité des sections
export function saveSectionVisibility(visibility: Record<keyof ReportSections, boolean>) {
  localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(visibility));
}

interface SortableItemProps {
  id: keyof ReportSections;
  label: string;
  category: string;
  index: number;
  total: number;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SortableItem({ 
  id, 
  label, 
  category,
  index, 
  total, 
  isVisible,
  onToggleVisibility,
  onMoveUp, 
  onMoveDown 
}: SortableItemProps) {
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
        "flex items-center gap-2 p-2 rounded-lg border transition-all",
        isDragging && "opacity-50 shadow-lg scale-[1.02] z-50 bg-background",
        isVisible ? "bg-muted/30" : "bg-muted/10 opacity-60"
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
      
      <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", CATEGORY_COLORS[category])}>
        {category}
      </Badge>
      
      <span className={cn("flex-1 text-sm truncate", !isVisible && "line-through text-muted-foreground")}>
        {label}
      </span>
      
      <Switch
        checked={isVisible}
        onCheckedChange={onToggleVisibility}
        className="scale-75"
      />
      
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

/** Aperçu miniature du rapport */
function ReportPreview({ 
  order, 
  visibility 
}: { 
  order: (keyof ReportSections)[]; 
  visibility: Record<keyof ReportSections, boolean>;
}) {
  const visibleSections = order.filter(k => visibility[k]);
  const hiddenCount = order.length - visibleSections.length;

  return (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border">
      <div className="flex items-center gap-2 mb-3">
        <LayoutList className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Aperçu du rapport</span>
        <Badge variant="outline" className="text-xs ml-auto">
          {visibleSections.length} sections
        </Badge>
      </div>
      
      {/* Miniature visuelle */}
      <div className="relative bg-background rounded-lg border border-border p-3 max-h-[200px] overflow-hidden">
        {/* Header du rapport */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="h-2 w-24 rounded bg-foreground/20" />
            <div className="h-1.5 w-16 rounded bg-muted-foreground/20 mt-1" />
          </div>
        </div>
        
        {/* Sections miniatures */}
        <div className="space-y-1.5">
          {visibleSections.slice(0, 8).map((key, index) => {
            const category = SECTION_CATEGORIES[key];
            return (
              <div key={key} className="flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-4 rounded-full",
                  CATEGORY_COLORS[category]?.replace("text-", "bg-").split(" ")[0] || "bg-muted"
                )} />
                <div className="h-2 flex-1 rounded bg-muted" style={{ 
                  maxWidth: `${70 + Math.random() * 30}%` 
                }} />
              </div>
            );
          })}
          
          {visibleSections.length > 8 && (
            <div className="text-center text-xs text-muted-foreground pt-1">
              +{visibleSections.length - 8} autres sections...
            </div>
          )}
        </div>
        
        {/* Gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent" />
      </div>
      
      {/* Stats */}
      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>{visibleSections.length} visibles</span>
        {hiddenCount > 0 && (
          <span className="flex items-center gap-1">
            <EyeOff className="h-3 w-3" />
            {hiddenCount} masquées
          </span>
        )}
      </div>
    </div>
  );
}

export function ReportSectionOrderEditor() {
  const [order, setOrder] = useState<(keyof ReportSections)[]>(getSectionOrder);
  const [visibility, setVisibility] = useState<Record<keyof ReportSections, boolean>>(getSectionVisibility);
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
      saveSectionVisibility(visibility);
    }
  }, [order, visibility, hasChanges]);

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

  const toggleVisibility = (key: keyof ReportSections) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
  };

  const resetAll = () => {
    setOrder(DEFAULT_SECTION_ORDER);
    setVisibility(DEFAULT_VISIBILITY);
    saveSectionOrder(DEFAULT_SECTION_ORDER);
    saveSectionVisibility(DEFAULT_VISIBILITY);
    setHasChanges(false);
  };

  const showAll = () => {
    const allVisible = Object.fromEntries(
      DEFAULT_SECTION_ORDER.map(k => [k, true])
    ) as Record<keyof ReportSections, boolean>;
    setVisibility(allVisible);
    setHasChanges(true);
  };

  const hideOptional = () => {
    // Masquer les sections moins essentielles
    const optionalSections: (keyof ReportSections)[] = [
      "wahoo", "planSuggestion", "templateRecommendation", 
      "checkins", "comprendre", "qualite", "historique", "tests"
    ];
    setVisibility(prev => {
      const newVis = { ...prev };
      optionalSections.forEach(k => { newVis[k] = false; });
      return newVis;
    });
    setHasChanges(true);
  };

  const visibleCount = Object.values(visibility).filter(Boolean).length;
  const isDefaultOrder = JSON.stringify(order) === JSON.stringify(DEFAULT_SECTION_ORDER);
  const isDefaultVisibility = JSON.stringify(visibility) === JSON.stringify(DEFAULT_VISIBILITY);
  const isDefault = isDefaultOrder && isDefaultVisibility;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Personnalisation du rapport</CardTitle>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            disabled={isDefault}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
          </Button>
        </div>
        <CardDescription>
          Réorganisez et masquez les sections du rapport PDF exporté
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Éditeur de sections */}
          <div className="lg:col-span-2">
            {/* Actions rapides */}
            <div className="flex items-center gap-2 mb-3">
              <Button variant="outline" size="sm" onClick={showAll} className="text-xs gap-1">
                <Eye className="h-3 w-3" />
                Tout afficher
              </Button>
              <Button variant="outline" size="sm" onClick={hideOptional} className="text-xs gap-1">
                <EyeOff className="h-3 w-3" />
                Mode minimal
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                {visibleCount}/{order.length} visibles
              </span>
            </div>
            
            <ScrollArea className="h-[350px] pr-4">
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
                        category={SECTION_CATEGORIES[sectionKey]}
                        index={index}
                        total={order.length}
                        isVisible={visibility[sectionKey]}
                        onToggleVisibility={() => toggleVisibility(sectionKey)}
                        onMoveUp={() => moveItem(index, "up")}
                        onMoveDown={() => moveItem(index, "down")}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>
          </div>
          
          {/* Aperçu */}
          <div className="lg:col-span-1">
            <ReportPreview order={order} visibility={visibility} />
            
            {/* Légende des catégories */}
            <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Catégories</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(CATEGORY_COLORS).slice(0, 6).map(([cat, colorClass]) => (
                  <Badge 
                    key={cat} 
                    variant="secondary" 
                    className={cn("text-[10px] px-1.5 py-0", colorClass)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Les modifications sont sauvegardées automatiquement</span>
          {hasChanges && (
            <Badge variant="outline" className="text-xs gap-1">
              ✓ Sauvegardé
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
