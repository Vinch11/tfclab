/**
 * Modal de configuration de l'ordre et visibilité des sections
 */

import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { GripVertical, RotateCcw, Check, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  type TabId, 
  type SectionDefinition,
  type SectionConfig,
  ALL_SECTIONS,
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
  onToggleVisibility 
}: { 
  section: SectionDefinition; 
  index: number;
  visible: boolean;
  onToggleVisibility: () => void;
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
        "flex items-center gap-3 p-3 bg-card border border-border rounded-lg",
        "hover:border-primary/30 transition-colors",
        isDragging && "opacity-50 shadow-lg",
        !visible && "opacity-60 bg-muted/50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <Badge 
        variant={visible ? "outline" : "secondary"} 
        className="w-6 h-6 flex items-center justify-center p-0 text-xs"
      >
        {index + 1}
      </Badge>
      
      <span className={cn(
        "font-medium text-sm flex-1",
        !visible && "text-muted-foreground line-through"
      )}>
        {section.label}
      </span>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleVisibility}
        className={cn(
          "h-8 w-8 p-0",
          visible ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"
        )}
        title={visible ? "Masquer cette section" : "Afficher cette section"}
      >
        {visible ? (
          <Eye className="h-4 w-4" />
        ) : (
          <EyeOff className="h-4 w-4" />
        )}
      </Button>
    </div>
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
  const orderedSections = localConfigs
    .map(config => {
      const def = ALL_SECTIONS[tabId].find(s => s.id === config.id);
      return def ? { ...def, visible: config.visible } : null;
    })
    .filter((s): s is SectionDefinition & { visible: boolean } => s !== null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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

        <div className="py-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localConfigs.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
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
          </DndContext>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
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
