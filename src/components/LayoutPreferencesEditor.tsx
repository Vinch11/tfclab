/**
 * Éditeur de préférences de layout par onglet
 * Permet de réorganiser et masquer/afficher les sections
 */

import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  GripVertical, 
  Layout, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Check,
  User,
  BarChart3,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  useLayoutPreferences, 
  TabId, 
  ALL_SECTIONS, 
  SectionConfig,
  SectionDefinition
} from "@/hooks/useLayoutPreferences";

interface SortableItemProps {
  id: string;
  label: string;
  visible: boolean;
  onToggleVisibility: () => void;
}

function SortableSectionItem({ id, label, visible, onToggleVisibility }: SortableItemProps) {
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
        "flex items-center gap-3 p-3 rounded-lg border bg-card transition-all",
        isDragging && "shadow-lg ring-2 ring-primary/50 z-50",
        !visible && "opacity-50 bg-muted/30"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      <span className={cn("flex-1 text-sm font-medium", !visible && "line-through")}>
        {label}
      </span>

      <button
        onClick={onToggleVisibility}
        className={cn(
          "p-1.5 rounded-md transition-colors",
          visible 
            ? "bg-primary/10 text-primary hover:bg-primary/20" 
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        {visible ? (
          <Eye className="w-4 h-4" />
        ) : (
          <EyeOff className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

interface TabEditorProps {
  tabId: TabId;
  sections: SectionDefinition[];
  configs: SectionConfig[];
  onSave: (configs: SectionConfig[]) => Promise<void>;
  onReset: () => Promise<void>;
}

function TabEditor({ tabId, sections, configs, onSave, onReset }: TabEditorProps) {
  const [localConfigs, setLocalConfigs] = useState<SectionConfig[]>(configs);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const toggleVisibility = (sectionId: string) => {
    setLocalConfigs(configs =>
      configs.map(c =>
        c.id === sectionId ? { ...c, visible: !c.visible } : c
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    await onSave(localConfigs);
    setHasChanges(false);
    toast.success("Disposition sauvegardée");
  };

  const handleReset = async () => {
    await onReset();
    const defaultConfigs = sections.map(s => ({ id: s.id, visible: s.defaultVisible }));
    setLocalConfigs(defaultConfigs);
    setHasChanges(false);
    toast.success("Disposition réinitialisée");
  };

  const getSectionLabel = (id: string): string => {
    return sections.find(s => s.id === id)?.label || id;
  };

  const visibleCount = localConfigs.filter(c => c.visible).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {visibleCount} / {localConfigs.length} sections visibles
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Réinitialiser
          </Button>
          {hasChanges && (
            <Button size="sm" onClick={handleSave}>
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Enregistrer
            </Button>
          )}
        </div>
      </div>

      {/* Drag & Drop List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localConfigs.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {localConfigs.map(config => (
              <SortableSectionItem
                key={config.id}
                id={config.id}
                label={getSectionLabel(config.id)}
                visible={config.visible}
                onToggleVisibility={() => toggleVisibility(config.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Hint */}
      <p className="text-xs text-muted-foreground text-center pt-2">
        Glissez les sections pour les réorganiser • Cliquez sur l'œil pour masquer
      </p>
    </div>
  );
}

export function LayoutPreferencesEditor() {
  const { 
    getSectionConfigs, 
    setSectionConfigs, 
    resetToDefault 
  } = useLayoutPreferences();

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "profil", label: "Profil", icon: <User className="w-4 h-4" /> },
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "evolution", label: "Évolution", icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layout className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Disposition des sections</CardTitle>
        </div>
        <CardDescription>
          Choisissez les sections à afficher et leur ordre pour chaque onglet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="profil" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            {tabs.map(tab => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id}>
              <TabEditor
                tabId={tab.id}
                sections={ALL_SECTIONS[tab.id]}
                configs={getSectionConfigs(tab.id)}
                onSave={(configs) => setSectionConfigs(tab.id, configs)}
                onReset={() => resetToDefault(tab.id)}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
