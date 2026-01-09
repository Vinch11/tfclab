/**
 * Modal de configuration de l'ordre des sections
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
import { GripVertical, RotateCcw, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  type TabId, 
  type SectionDefinition, 
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
function SortableItem({ section, index }: { section: SectionDefinition; index: number }) {
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
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0 text-xs">
        {index + 1}
      </Badge>
      
      <span className="font-medium text-sm flex-1">{section.label}</span>
    </div>
  );
}

export function LayoutConfigModal({
  open,
  onOpenChange,
  tabId,
  tabLabel,
}: LayoutConfigModalProps) {
  const { getSectionOrder, setSectionOrder, resetToDefault } = useLayoutPreferences();
  const [localOrder, setLocalOrder] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialiser l'ordre local quand la modal s'ouvre
  useEffect(() => {
    if (open) {
      setLocalOrder(getSectionOrder(tabId));
      setHasChanges(false);
    }
  }, [open, tabId, getSectionOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    await setSectionOrder(tabId, localOrder);
    toast.success("Disposition sauvegardée");
    onOpenChange(false);
  };

  const handleReset = async () => {
    await resetToDefault(tabId);
    const defaultOrder = ALL_SECTIONS[tabId].map(s => s.id);
    setLocalOrder(defaultOrder);
    setHasChanges(true);
    toast.info("Disposition réinitialisée");
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Mapper les IDs aux définitions de sections
  const orderedSections = localOrder
    .map(id => ALL_SECTIONS[tabId].find(s => s.id === id))
    .filter((s): s is SectionDefinition => s !== undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-primary" />
            Organiser les sections
          </DialogTitle>
          <DialogDescription>
            Réorganisez les sections de l'onglet <strong>{tabLabel}</strong> par glisser-déposer.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={localOrder}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {orderedSections.map((section, index) => (
                  <SortableItem 
                    key={section.id} 
                    section={section} 
                    index={index} 
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
