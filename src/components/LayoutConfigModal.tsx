/**
 * Modal de configuration de l'ordre et visibilité des sections
 * Avec groupement par catégories visuelles
 */

import { useState, useEffect, useMemo } from "react";
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { GripVertical, RotateCcw, Check, X, Eye, EyeOff, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  type TabId, 
  type SectionDefinition,
  type SectionConfig,
  ALL_SECTIONS,
  SECTION_CATEGORIES,
  useLayoutPreferences 
} from "@/hooks/useLayoutPreferences";
import { toast } from "sonner";

interface LayoutConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tabId: TabId;
  tabLabel: string;
}

// Composant pour une section dans la liste
function SortableItem({ 
  section, 
  index, 
  visible, 
  onToggleVisibility,
  showIndex = true,
}: { 
  section: SectionDefinition; 
  index: number;
  visible: boolean;
  onToggleVisibility: () => void;
  showIndex?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2.5 bg-card border border-border rounded-lg",
        "hover:border-primary/30 transition-colors",
        isDragging && "opacity-50 shadow-lg z-50",
        !visible && "opacity-60 bg-muted/50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      
      {showIndex && (
        <Badge 
          variant={visible ? "outline" : "secondary"} 
          className="w-5 h-5 flex items-center justify-center p-0 text-[10px]"
        >
          {index + 1}
        </Badge>
      )}
      
      <span className={cn(
        "font-medium text-xs flex-1 truncate",
        !visible && "text-muted-foreground line-through"
      )}>
        {section.label}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleVisibility}
        className={cn(
          "h-7 w-7 p-0",
          visible ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"
        )}
        title={visible ? "Masquer cette section" : "Afficher cette section"}
      >
        {visible ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

// Composant pour un groupe de catégorie
function CategoryGroup({
  categoryKey,
  sections,
  localConfigs,
  onToggleVisibility,
  globalIndex,
}: {
  categoryKey: string;
  sections: (SectionDefinition & { visible: boolean })[];
  localConfigs: SectionConfig[];
  onToggleVisibility: (sectionId: string) => void;
  globalIndex: number;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const category = SECTION_CATEGORIES[categoryKey as keyof typeof SECTION_CATEGORIES];
  
  if (!category) return null;
  
  const visibleInCategory = sections.filter(s => s.visible).length;
  const totalInCategory = sections.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-1">
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between p-2 rounded-lg border transition-colors",
            category.color,
            "hover:opacity-90"
          )}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{category.label}</span>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {visibleInCategory}/{totalInCategory}
            </Badge>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-180"
          )} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1.5 pl-2">
        <SortableContext
          items={sections.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section, idx) => (
            <SortableItem
              key={section.id}
              section={section}
              index={globalIndex + idx}
              visible={section.visible}
              onToggleVisibility={() => onToggleVisibility(section.id)}
              showIndex={false}
            />
          ))}
        </SortableContext>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function LayoutConfigModal({
  open,
  onOpenChange,
  tabId,
  tabLabel,
}: LayoutConfigModalProps) {
  const { getSectionConfigs, setSectionConfigs, resetToDefault } = useLayoutPreferences();
  const [localConfigs, setLocalConfigs] = useState<SectionConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialiser les configs locales quand la modal s'ouvre
  useEffect(() => {
    if (open) {
      setLocalConfigs(getSectionConfigs(tabId));
      setHasChanges(false);
    }
  }, [open, tabId, getSectionConfigs]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalConfigs((configs) => {
        const oldIndex = configs.findIndex(c => c.id === active.id);
        const newIndex = configs.findIndex(c => c.id === over.id);
        return arrayMove(configs, oldIndex, newIndex);
      });
      setHasChanges(true);
    }
  };

  const handleToggleVisibility = (sectionId: string) => {
    setLocalConfigs(configs => 
      configs.map(c => 
        c.id === sectionId ? { ...c, visible: !c.visible } : c
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    await setSectionConfigs(tabId, localConfigs);
    toast.success("Disposition sauvegardée");
    onOpenChange(false);
  };

  const handleReset = async () => {
    await resetToDefault(tabId);
    const defaultConfigs = ALL_SECTIONS[tabId].map(s => ({ 
      id: s.id, 
      visible: s.defaultVisible 
    }));
    setLocalConfigs(defaultConfigs);
    setHasChanges(true);
    toast.info("Disposition réinitialisée");
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Compter les sections visibles
  const visibleCount = localConfigs.filter(c => c.visible).length;
  const totalCount = localConfigs.length;

  // Mapper les IDs aux définitions de sections
  const orderedSections = useMemo(() => {
    return localConfigs
      .map(config => {
        const def = ALL_SECTIONS[tabId].find(s => s.id === config.id);
        return def ? { ...def, visible: config.visible } : null;
      })
      .filter((s): s is SectionDefinition & { visible: boolean } => s !== null);
  }, [localConfigs, tabId]);

  // Grouper les sections par catégorie
  const sectionsByCategory = useMemo(() => {
    const groups: Record<string, (SectionDefinition & { visible: boolean })[]> = {};
    const categoryOrder = Object.keys(SECTION_CATEGORIES);
    
    // Initialiser les groupes vides dans l'ordre
    categoryOrder.forEach(cat => {
      groups[cat] = [];
    });
    groups["other"] = [];
    
    // Distribuer les sections dans leurs catégories
    orderedSections.forEach(section => {
      const cat = section.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(section);
    });
    
    return groups;
  }, [orderedSections]);

  // Vérifier si les sections ont des catégories
  const hasCategories = orderedSections.some(s => s.category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-primary" />
            Organiser les sections
          </DialogTitle>
          <DialogDescription>
            Réorganisez et masquez les sections de l'onglet <strong>{tabLabel}</strong>.
            <span className="block mt-1 text-xs">
              {visibleCount}/{totalCount} sections visibles
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 pr-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {hasCategories ? (
              // Affichage par catégories
              <div className="space-y-3">
                {Object.entries(sectionsByCategory).map(([categoryKey, sections], catIndex) => {
                  if (sections.length === 0) return null;
                  
                  // Calculer l'index global pour la numérotation
                  const previousSectionsCount = Object.entries(sectionsByCategory)
                    .slice(0, catIndex)
                    .reduce((sum, [, secs]) => sum + secs.length, 0);
                  
                  if (categoryKey === "other") {
                    // Sections sans catégorie
                    return (
                      <div key="other" className="space-y-1.5">
                        <div className="text-xs text-muted-foreground px-2 py-1">
                          Autres sections
                        </div>
                        <SortableContext
                          items={sections.map(s => s.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {sections.map((section, idx) => (
                            <SortableItem
                              key={section.id}
                              section={section}
                              index={previousSectionsCount + idx}
                              visible={section.visible}
                              onToggleVisibility={() => handleToggleVisibility(section.id)}
                            />
                          ))}
                        </SortableContext>
                      </div>
                    );
                  }
                  
                  return (
                    <CategoryGroup
                      key={categoryKey}
                      categoryKey={categoryKey}
                      sections={sections}
                      localConfigs={localConfigs}
                      onToggleVisibility={handleToggleVisibility}
                      globalIndex={previousSectionsCount}
                    />
                  );
                })}
              </div>
            ) : (
              // Affichage liste simple (sans catégories)
              <SortableContext
                items={localConfigs.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {orderedSections.map((section, index) => (
                    <SortableItem 
                      key={section.id} 
                      section={section} 
                      index={index}
                      visible={section.visible}
                      onToggleVisibility={() => handleToggleVisibility(section.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </DndContext>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
          
          <div className="flex gap-2 ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges}
              className="gap-1"
            >
              <Check className="h-3.5 w-3.5" />
              Enregistrer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
