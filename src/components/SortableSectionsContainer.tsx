/**
 * Container pour gérer les sections réorganisables d'un onglet
 * Combine le drag & drop direct ET le bouton d'accès à la modal
 * Supporte la visibilité des sections
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
import { Settings2, GripVertical, Check, X, Eye, EyeOff } from "lucide-react";
import { SortableSectionWrapper } from "./SortableSectionWrapper";
import { LayoutConfigModal } from "./LayoutConfigModal";
import { 
  type TabId, 
  type SectionConfig,
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
  const { 
    getSectionConfigs, 
    setSectionConfigs, 
    getVisibleSections 
  } = useLayoutPreferences();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempConfigs, setTempConfigs] = useState<SectionConfig[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Configs actuelles des sections
  const currentConfigs = useMemo(() => {
    return getSectionConfigs(tabId);
  }, [getSectionConfigs, tabId]);

  // Configs à utiliser (temp en mode édition, sinon current)
  const displayConfigs = isEditMode ? tempConfigs : currentConfigs;

  // Ordre d'affichage (tous en mode edit, seulement visibles sinon)
  const displayOrder = useMemo(() => {
    if (isEditMode) {
      return displayConfigs.map(c => c.id);
    }
    return displayConfigs.filter(c => c.visible).map(c => c.id);
  }, [displayConfigs, isEditMode]);

  // Sections ordonnées avec leur rendu
  const orderedSections = useMemo(() => {
    return displayOrder
      .map(id => sections.find(s => s.id === id))
      .filter((s): s is SectionRenderer => s !== undefined);
  }, [displayOrder, sections]);

  // Vérifier si une section est visible
  const isSectionVisible = (id: string): boolean => {
    const config = displayConfigs.find(c => c.id === id);
    return config?.visible ?? true;
  };

  // Entrer en mode édition
  const enterEditMode = () => {
    setTempConfigs([...currentConfigs]);
    setIsEditMode(true);
  };

  // Annuler l'édition
  const cancelEditMode = () => {
    setIsEditMode(false);
    setTempConfigs([]);
  };

  // Sauvegarder les changements
  const saveChanges = async () => {
    await setSectionConfigs(tabId, tempConfigs);
    setIsEditMode(false);
    setTempConfigs([]);
    toast.success("Disposition sauvegardée");
  };

  // Toggle visibilité d'une section en mode édition
  const toggleVisibility = (sectionId: string) => {
    setTempConfigs(configs => 
      configs.map(c => 
        c.id === sectionId ? { ...c, visible: !c.visible } : c
      )
    );
  };

  // Gérer le drag & drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTempConfigs((configs) => {
        const oldIndex = configs.findIndex(c => c.id === active.id);
        const newIndex = configs.findIndex(c => c.id === over.id);
        return arrayMove(configs, oldIndex, newIndex);
      });
    }
  };

  // Récupérer le label d'une section
  const getSectionLabel = (id: string): string => {
    const def = ALL_SECTIONS[tabId].find(s => s.id === id);
    return def?.label || id;
  };

  // Compter les sections visibles
  const visibleCount = displayConfigs.filter(c => c.visible).length;
  const totalCount = displayConfigs.length;

  return (
    <div className={cn("relative", className)}>
      {/* Bouton flottant pour organiser */}
      <div className="flex justify-end mb-4 gap-2 items-center">
        {isEditMode ? (
          <>
            <span className="text-xs text-muted-foreground mr-2">
              {visibleCount}/{totalCount} visibles
            </span>
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
          <span className="font-medium text-primary">Mode réorganisation</span> — 
          Glissez les sections pour modifier leur ordre. 
          Cliquez sur <Eye className="inline h-3.5 w-3.5 mx-1" /> pour masquer/afficher.
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
                isVisible={isSectionVisible(section.id)}
                onToggleVisibility={() => toggleVisibility(section.id)}
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
