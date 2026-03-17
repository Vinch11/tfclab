/**
 * Éditeur avancé de layout des sections
 * Permet de :
 * - Réorganiser les sections par drag & drop OU boutons ↑↓
 * - Masquer/afficher les sections
 * - Minimiser par défaut les sections
 * - Déplacer les sections entre onglets
 * - Groupement visuel par catégorie
 */

import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  GripVertical, 
  Layout, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Check,
  User,
  BarChart3,
  FlaskConical,
  Dumbbell,
  BookOpen,
  GraduationCap,
  Trophy,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  ArrowRightLeft,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  useLayoutPreferences, 
  TabId, 
  ALL_SECTIONS, 
  SectionConfig,
  SectionDefinition,
  SECTION_CATEGORIES,
  SectionCategory,
} from "@/hooks/useLayoutPreferences";

interface SortableItemProps {
  id: string;
  label: string;
  visible: boolean;
  collapsedByDefault: boolean;
  category?: string;
  currentTab: TabId;
  isFirst: boolean;
  isLast: boolean;
  onToggleVisibility: () => void;
  onToggleCollapsed: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToTab: (targetTab: TabId) => void;
  availableTabs: { id: TabId; label: string }[];
}

const TAB_LABELS: Record<TabId, string> = {
  dashboard: "Dashboard",
  profil: "Profil",
  evolution: "Évolution",
  tests: "Tests",
  seances: "Bibliothèque",
  templates: "Templates",
  academy: "Academy",
  "race-readiness": "Potentiel Physiologique",
  "running-profile": "Profil Running",
  strategie: "Stratégie",
};

function SortableSectionItem({ 
  id, 
  label, 
  visible, 
  collapsedByDefault,
  category,
  currentTab,
  isFirst,
  isLast,
  onToggleVisibility, 
  onToggleCollapsed,
  onMoveUp,
  onMoveDown,
  onMoveToTab,
  availableTabs
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  
  const [showMoveOptions, setShowMoveOptions] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get category config
  const categoryConfig = category && category in SECTION_CATEGORIES 
    ? SECTION_CATEGORIES[category as SectionCategory] 
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-1.5 p-2.5 sm:p-3 rounded-lg border bg-card transition-all",
        isDragging && "shadow-lg ring-2 ring-primary/50 z-50",
        !visible && "opacity-50 bg-muted/30"
      )}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Drag handle — 44px touch target */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-muted rounded min-h-[44px] min-w-[36px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Up/Down quick-move buttons */}
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className={cn(
              "p-0.5 rounded transition-colors",
              isFirst 
                ? "text-muted-foreground/30 cursor-not-allowed" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title="Monter"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className={cn(
              "p-0.5 rounded transition-colors",
              isLast 
                ? "text-muted-foreground/30 cursor-not-allowed" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title="Descendre"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Label + category badge */}
        <div className="flex-1 min-w-0">
          <span className={cn(
            "text-sm font-medium block truncate",
            !visible && "line-through text-muted-foreground"
          )}>
            {label}
          </span>
          {categoryConfig && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full border inline-block mt-0.5",
              categoryConfig.color
            )}>
              {categoryConfig.label}
            </span>
          )}
        </div>

        {/* Action buttons — icon-only with tooltips */}
        <div className="flex items-center gap-1">
          {/* Visibilité */}
          <button
            onClick={onToggleVisibility}
            className={cn(
              "p-2 sm:p-1.5 rounded-md transition-colors min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 flex items-center justify-center",
              visible 
                ? "bg-primary/10 text-primary hover:bg-primary/20" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            title={visible ? "Masquer" : "Afficher"}
          >
            {visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Minimiser par défaut */}
          <button
            onClick={onToggleCollapsed}
            className={cn(
              "p-2 sm:p-1.5 rounded-md transition-colors min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 flex items-center justify-center",
              collapsedByDefault 
                ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            title={collapsedByDefault ? "Afficher dépliée" : "Minimiser par défaut"}
          >
            {collapsedByDefault ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Déplacer */}
          <button
            onClick={() => setShowMoveOptions(!showMoveOptions)}
            className={cn(
              "p-2 sm:p-1.5 rounded-md transition-colors min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 flex items-center justify-center",
              showMoveOptions 
                ? "bg-blue-500/10 text-blue-600" 
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
            title="Déplacer vers un autre onglet"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Options de déplacement */}
      {showMoveOptions && (
        <div className="flex items-center gap-2 pl-8 sm:pl-10 pt-1.5 border-t border-dashed">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Déplacer vers :</span>
          <Select onValueChange={(value) => {
            onMoveToTab(value as TabId);
            setShowMoveOptions(false);
          }}>
            <SelectTrigger className="h-8 text-xs flex-1 max-w-[180px]">
              <SelectValue placeholder="Choisir un onglet" />
            </SelectTrigger>
            <SelectContent>
              {availableTabs
                .filter(tab => tab.id !== currentTab)
                .map(tab => (
                  <SelectItem key={tab.id} value={tab.id} className="text-xs">
                    {tab.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

interface TabEditorProps {
  tabId: TabId;
  sections: SectionDefinition[];
  configs: SectionConfig[];
  onSave: (configs: SectionConfig[]) => Promise<void>;
  onReset: () => Promise<void>;
  onMoveSection: (sectionId: string, fromTab: TabId, toTab: TabId) => Promise<void>;
  availableTabs: { id: TabId; label: string }[];
}

function TabEditor({ 
  tabId, 
  sections, 
  configs, 
  onSave, 
  onReset, 
  onMoveSection,
  availableTabs 
}: TabEditorProps) {
  const [localConfigs, setLocalConfigs] = useState<SectionConfig[]>(configs);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalConfigs(configs);
    setHasChanges(false);
  }, [configs]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
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

  const toggleCollapsed = (sectionId: string) => {
    setLocalConfigs(configs =>
      configs.map(c =>
        c.id === sectionId ? { ...c, collapsedByDefault: !c.collapsedByDefault } : c
      )
    );
    setHasChanges(true);
  };

  const moveUp = (sectionId: string) => {
    setLocalConfigs(configs => {
      const idx = configs.findIndex(c => c.id === sectionId);
      if (idx <= 0) return configs;
      return arrayMove(configs, idx, idx - 1);
    });
    setHasChanges(true);
  };

  const moveDown = (sectionId: string) => {
    setLocalConfigs(configs => {
      const idx = configs.findIndex(c => c.id === sectionId);
      if (idx < 0 || idx >= configs.length - 1) return configs;
      return arrayMove(configs, idx, idx + 1);
    });
    setHasChanges(true);
  };

  const handleMoveToTab = async (sectionId: string, targetTab: TabId) => {
    await onMoveSection(sectionId, tabId, targetTab);
    toast.success(`Section déplacée vers ${TAB_LABELS[targetTab]}`);
  };

  const handleSave = async () => {
    await onSave(localConfigs);
    setHasChanges(false);
    toast.success("Disposition sauvegardée");
  };

  const handleReset = async () => {
    await onReset();
    const defaultConfigs = sections.map(s => ({ 
      id: s.id, 
      visible: s.defaultVisible,
      collapsedByDefault: false 
    }));
    setLocalConfigs(defaultConfigs);
    setHasChanges(false);
    toast.success("Disposition réinitialisée");
  };

  const getSectionDef = (id: string): SectionDefinition | undefined => {
    return sections.find(s => s.id === id);
  };

  const visibleCount = localConfigs.filter(c => c.visible).length;
  const collapsedCount = localConfigs.filter(c => c.collapsedByDefault).length;

  return (
    <div className="space-y-3">
      {/* Stats + Actions */}
      <div className="flex flex-wrap items-center justify-between text-sm gap-2">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {visibleCount}/{localConfigs.length} visibles
          </span>
          {collapsedCount > 0 && (
            <span className="text-amber-600 flex items-center gap-1">
              <Minimize2 className="w-3.5 h-3.5" />
              {collapsedCount} minimisées
            </span>
          )}
        </div>
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
            <Button size="sm" onClick={handleSave} className="animate-in fade-in-0 duration-200">
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Enregistrer
            </Button>
          )}
        </div>
      </div>

      {/* Légende compacte */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
        <span className="flex items-center gap-1"><GripVertical className="w-3 h-3" /> Glisser</span>
        <span className="flex items-center gap-1"><ChevronUp className="w-3 h-3" /><ChevronDown className="w-3 h-3" /> Monter/Descendre</span>
        <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-primary" /> Visible</span>
        <span className="flex items-center gap-1"><Minimize2 className="w-3 h-3 text-amber-600" /> Minimisée</span>
        <span className="flex items-center gap-1"><ArrowRightLeft className="w-3 h-3 text-blue-600" /> Déplacer</span>
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
          <div className="space-y-1.5">
            {localConfigs.map((config, index) => {
              const def = getSectionDef(config.id);
              return (
                <SortableSectionItem
                  key={config.id}
                  id={config.id}
                  label={def?.label || config.id}
                  visible={config.visible}
                  collapsedByDefault={config.collapsedByDefault ?? false}
                  category={def?.category}
                  currentTab={tabId}
                  isFirst={index === 0}
                  isLast={index === localConfigs.length - 1}
                  onToggleVisibility={() => toggleVisibility(config.id)}
                  onToggleCollapsed={() => toggleCollapsed(config.id)}
                  onMoveUp={() => moveUp(config.id)}
                  onMoveDown={() => moveDown(config.id)}
                  onMoveToTab={(targetTab) => handleMoveToTab(config.id, targetTab)}
                  availableTabs={availableTabs}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Hint */}
      <p className="text-xs text-muted-foreground text-center pt-1">
        Glissez ou utilisez les flèches ↑↓ pour réorganiser
      </p>
    </div>
  );
}

export function AdvancedLayoutEditor() {
  const { 
    getSectionConfigs, 
    setSectionConfigs, 
    resetToDefault,
    resetAllToDefault,
    moveSection
  } = useLayoutPreferences();

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "profil", label: "Profil", icon: <User className="w-4 h-4" /> },
    { id: "strategie", label: "Stratégie", icon: <Trophy className="w-4 h-4" /> },
    { id: "running-profile", label: "Running Profile", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "evolution", label: "Évolution", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "tests", label: "Tests", icon: <FlaskConical className="w-4 h-4" /> },
    { id: "seances", label: "Bibliothèque", icon: <Dumbbell className="w-4 h-4" /> },
    { id: "templates", label: "Templates", icon: <BookOpen className="w-4 h-4" /> },
    { id: "academy", label: "Academy", icon: <GraduationCap className="w-4 h-4" /> },
    { id: "race-readiness", label: "Race Readiness", icon: <Trophy className="w-4 h-4" /> },
  ];

  const availableTabs = tabs.map(t => ({ id: t.id, label: t.label }));

  const handleResetAll = async () => {
    await resetAllToDefault();
    toast.success("Toutes les dispositions ont été réinitialisées");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Disposition des sections</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAll}
            className="text-muted-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Tout réinitialiser
          </Button>
        </div>
        <CardDescription>
          Réorganisez par glisser-déposer ou flèches ↑↓, masquez ou minimisez les sections
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dashboard" className="w-full">
          <div className="overflow-x-auto -mx-1 px-1 pb-2">
            <TabsList className="inline-flex w-auto min-w-full gap-1 mb-4">
              {tabs.map(tab => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id} 
                  className="gap-1.5 px-3 py-2 whitespace-nowrap flex-shrink-0"
                >
                  {tab.icon}
                  <span className="text-xs sm:text-sm">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id}>
              <TabEditor
                tabId={tab.id}
                sections={ALL_SECTIONS[tab.id]}
                configs={getSectionConfigs(tab.id)}
                onSave={(configs) => setSectionConfigs(tab.id, configs)}
                onReset={() => resetToDefault(tab.id)}
                onMoveSection={moveSection}
                availableTabs={availableTabs}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
