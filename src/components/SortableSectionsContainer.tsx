/**
 * Container pour gérer les sections réorganisables d'un onglet
 * Combine le drag & drop direct ET le bouton d'accès à la modal
 */

import { useState, useMemo, ReactNode } from "react";
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
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Settings2, GripVertical, Check, X } from "lucide-react";
import { SortableSectionWrapper } from "./SortableSectionWrapper";
import { LayoutConfigModal } from "./LayoutConfigModal";
import { 
  type TabId, 
  ALL_SECTIONS,
  useLayoutPreferences 
} from "@/hooks/useLayoutPreferences";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SectionRenderer {
  id: string;
  render: () => ReactNode;
}

interface SortableSectionsContainerProps {
  tabId: TabId;
  tabLabel: string;
  sections: SectionRenderer[];
  className?: string;
}

export function SortableSectionsContainer({
  tabId,
  tabLabel,
  sections,
  className,
}: SortableSectionsContainerProps) {
  const { getSectionOrder, setSectionOrder } = useLayoutPreferences();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempOrder, setTempOrder] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Ordre actuel des sections
  const currentOrder = useMemo(() => {
    return getSectionOrder(tabId);
  }, [getSectionOrder, tabId]);

  // Ordre à utiliser (temp en mode édition, sinon current)
  const displayOrder = isEditMode ? tempOrder : currentOrder;

  // Sections ordonnées avec leur rendu
  const orderedSections = useMemo(() => {
    return displayOrder
      .map(id => sections.find(s => s.id === id))
      .filter((s): s is SectionRenderer => s !== undefined);
  }, [displayOrder, sections]);

  // Entrer en mode édition
  const enterEditMode = () => {
    setTempOrder([...currentOrder]);
    setIsEditMode(true);
  };

  // Annuler l'édition
  const cancelEditMode = () => {
    setIsEditMode(false);
    setTempOrder([]);
  };

  // Sauvegarder les changements
  const saveChanges = async () => {
    await setSectionOrder(tabId, tempOrder);
    setIsEditMode(false);
    setTempOrder([]);
    toast.success("Disposition sauvegardée");
  };

  // Gérer le drag & drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTempOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Récupérer le label d'une section
  const getSectionLabel = (id: string): string => {
    const def = ALL_SECTIONS[tabId].find(s => s.id === id);
    return def?.label || id;
  };

  return (
    <div className={cn("relative", className)}>
      {/* Bouton flottant pour organiser */}
      <div className="flex justify-end mb-4 gap-2">
        {isEditMode ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelEditMode}
              className="gap-1.5"
            >
              <X className="h-4 w-4" />
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={saveChanges}
              className="gap-1.5"
            >
              <Check className="h-4 w-4" />
              Enregistrer
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={enterEditMode}
              className="gap-1.5"
            >
              <GripVertical className="h-4 w-4" />
              Réorganiser
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="gap-1.5"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Indication mode édition */}
      {isEditMode && (
        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-muted-foreground">
          <span className="font-medium text-primary">Mode réorganisation</span> — Glissez les sections pour modifier leur ordre.
        </div>
      )}

      {/* Conteneur avec drag & drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={displayOrder}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-6">
            {orderedSections.map(section => (
              <SortableSectionWrapper
                key={section.id}
                id={section.id}
                isEditMode={isEditMode}
                label={getSectionLabel(section.id)}
              >
                {section.render()}
              </SortableSectionWrapper>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Modal de configuration */}
      <LayoutConfigModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        tabId={tabId}
        tabLabel={tabLabel}
      />
    </div>
  );
}
