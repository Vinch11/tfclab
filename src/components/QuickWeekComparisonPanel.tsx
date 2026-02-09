// =============================================
// QUICK WEEK COMPARISON PANEL - Dropdown-based
// Supports Running + Triathlon templates
// Two For Coaching Lab
// =============================================

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeftRight, X, Plus, Timer, Flame, Heart, TrendingUp, Zap, 
  Target, Dumbbell, CheckCircle2, BarChart3, Calendar, Clock, Layers,
  Waves, Bike, Footprints, Search, ChevronsUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RUNNING_TEMPLATES } from "@/lib/templates/runningTemplatesStore";
import { PROGRAM_TEMPLATES } from "@/data/programTemplates";
import { useImportedPlans } from "@/components/ExcelPlanImporter";
import { 
  type UnifiedWeek, 
  runningWeekToUnified, 
  triathlonWeekToUnified 
} from "@/lib/templates/excelTemplateParser";
import type { RunningTemplate, RunningWeek } from "@/types/runningTemplate";

// =============================================
// HELPER COMPONENTS
// =============================================

function PhaseBadge({ phase }: { phase: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    BASE: { bg: "bg-blue-500/20", text: "text-blue-400" },
    BUILD: { bg: "bg-green-500/20", text: "text-green-400" },
    SPECIFIC: { bg: "bg-purple-500/20", text: "text-purple-400" },
    TAPER: { bg: "bg-amber-500/20", text: "text-amber-400" },
  };
  const c = config[phase] || config.BASE;
  return (
    <Badge variant="outline" className={cn(c.bg, c.text, "text-[10px] px-1.5 py-0.5 border-0")}>
      {phase}
    </Badge>
  );
}

function FocusBadge({ focus }: { focus: string }) {
  const config: Record<string, { icon: React.ReactNode; color: string }> = {
    TTE: { icon: <Timer className="h-2.5 w-2.5" />, color: "text-orange-500" },
    VO2: { icon: <Flame className="h-2.5 w-2.5" />, color: "text-red-500" },
    ECONOMY: { icon: <TrendingUp className="h-2.5 w-2.5" />, color: "text-blue-500" },
    ENDURANCE: { icon: <Heart className="h-2.5 w-2.5" />, color: "text-green-500" },
    SPEED: { icon: <Zap className="h-2.5 w-2.5" />, color: "text-purple-500" },
  };
  const c = config[focus] || config.ENDURANCE;
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 flex items-center gap-0.5 border-muted-foreground/30">
      <span className={c.color}>{c.icon}</span>
      {focus}
    </Badge>
  );
}

function TemplateTypeBadge({ type }: { type: "running" | "triathlon" }) {
  if (type === "triathlon") {
    return (
      <Badge className="bg-cyan-500/20 text-cyan-400 border-0 text-[9px] px-1">
        <Waves className="h-2.5 w-2.5 mr-0.5" />
        TRI
      </Badge>
    );
  }
  return (
    <Badge className="bg-orange-500/20 text-orange-400 border-0 text-[9px] px-1">
      <Footprints className="h-2.5 w-2.5 mr-0.5" />
      RUN
    </Badge>
  );
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}'`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

// =============================================
// WEEK SLOT
// =============================================

interface WeekSlot {
  weekId: string | null;
}

interface WeekSlotSelectorProps {
  slot: WeekSlot;
  slotIndex: number;
  allWeeks: UnifiedWeek[];
  onSelect: (weekId: string) => void;
  onClear: () => void;
}

function WeekSlotSelector({ slot, slotIndex, allWeeks, onSelect, onClear }: WeekSlotSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedWeek = slot.weekId 
    ? allWeeks.find(w => w.id === slot.weekId)
    : null;
  
  const totalDuration = selectedWeek 
    ? selectedWeek.sessions.reduce((sum, s) => sum + s.durationMin, 0) 
    : 0;
  const keySessions = selectedWeek 
    ? selectedWeek.sessions.filter(s => s.isKey).length 
    : 0;

  // Group weeks by template for better organization
  const groupedByTemplate = useMemo(() => {
    const groups: Record<string, { name: string; type: "running" | "triathlon"; goal: string; weeks: UnifiedWeek[] }> = {};
    
    allWeeks.forEach(week => {
      if (!groups[week.templateId]) {
        groups[week.templateId] = {
          name: week.templateName,
          type: week.templateType,
          goal: week.goal,
          weeks: [],
        };
      }
      groups[week.templateId].weeks.push(week);
    });
    
    return groups;
  }, [allWeeks]);

  return (
    <div className={cn(
      "flex-1 min-w-[220px] rounded-lg border-2 border-dashed transition-all",
      selectedWeek 
        ? "border-primary/50 bg-primary/5" 
        : "border-muted-foreground/30 hover:border-muted-foreground/50"
    )}>
      {selectedWeek ? (
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <TemplateTypeBadge type={selectedWeek.templateType} />
                <span className="text-xs font-semibold">
                  S{selectedWeek.weekNumber} • {selectedWeek.title}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                {selectedWeek.templateName}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClear}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-1">
            <PhaseBadge phase={selectedWeek.meta.phase} />
            <FocusBadge focus={selectedWeek.meta.focus} />
          </div>
          
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {formatDuration(totalDuration)}
            </span>
            <span>•</span>
            <span>{selectedWeek.sessions.length} séances</span>
            {keySessions > 0 && (
              <span className="text-amber-500">({keySessions} clés)</span>
            )}
          </div>
          
          {/* Load Bars Mini */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[9px]">
              <span className="w-12 text-muted-foreground">Charge</span>
              <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden">
                <div 
                  className="h-full bg-orange-500" 
                  style={{ width: `${selectedWeek.meta.loadLevel * 20}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1 text-[9px]">
              <span className="w-12 text-muted-foreground">Intensité</span>
              <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden">
                <div 
                  className="h-full bg-red-500" 
                  style={{ width: `${selectedWeek.meta.intensityDensity * 20}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 space-y-2">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Plus className="h-3 w-3" />
            Slot {slotIndex + 1}
          </div>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full h-9 justify-between text-xs bg-background border-muted-foreground/30"
              >
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Search className="h-3 w-3" />
                  Rechercher une semaine...
                </span>
                <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 z-[100]" align="start">
              <Command>
                <CommandInput placeholder="Rechercher par nom, phase, semaine..." className="text-xs h-9" />
                <CommandList className="max-h-[300px]">
                  <CommandEmpty className="py-4 text-xs text-center text-muted-foreground">
                    Aucune semaine trouvée.
                  </CommandEmpty>
                  {Object.entries(groupedByTemplate).map(([templateId, group]) => (
                    <CommandGroup 
                      key={templateId} 
                      heading={
                        <div className="flex items-center gap-2">
                          <TemplateTypeBadge type={group.type} />
                          <span className="truncate">{group.name}</span>
                          <Badge variant="outline" className="text-[9px] px-1 ml-auto">
                            {group.goal.toUpperCase()}
                          </Badge>
                        </div>
                      }
                    >
                      {group.weeks.map(week => {
                        const dur = week.sessions.reduce((s, sess) => s + sess.durationMin, 0);
                        return (
                          <CommandItem
                            key={week.id}
                            value={`${group.name} S${week.weekNumber} ${week.title} ${week.meta.phase} ${week.meta.focus}`}
                            onSelect={() => {
                              onSelect(week.id);
                              setOpen(false);
                            }}
                            className="text-xs py-2 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 w-full">
                              <span className="font-mono text-muted-foreground w-6 shrink-0">
                                S{week.weekNumber}
                              </span>
                              <span className="truncate flex-1">{week.title}</span>
                              <PhaseBadge phase={week.meta.phase} />
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatDuration(dur)}
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

// =============================================
// COMPARISON METRICS TABLE
// =============================================

interface ComparisonMetrics {
  week: UnifiedWeek;
  totalDuration: number;
  keySessions: number;
  sessionCount: number;
  sportBreakdown: Record<string, number>;
}

function ComparisonTable({ metrics }: { metrics: ComparisonMetrics[] }) {
  if (metrics.length < 2) return null;

  const maxDuration = Math.max(...metrics.map(m => m.totalDuration));
  
  return (
    <div className="mt-4 rounded-lg border overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Métrique</th>
            {metrics.map((m, i) => (
              <th key={i} className="px-3 py-2 text-center font-medium">
                <div className="flex flex-col items-center gap-0.5">
                  <TemplateTypeBadge type={m.week.templateType} />
                  <span>S{m.week.weekNumber}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr>
            <td className="px-3 py-2 text-muted-foreground">Volume total</td>
            {metrics.map((m, i) => (
              <td key={i} className="px-3 py-2 text-center">
                <div className="space-y-1">
                  <span className="font-mono font-medium">{formatDuration(m.totalDuration)}</span>
                  <div className="w-full h-1.5 bg-muted rounded overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${(m.totalDuration / maxDuration) * 100}%` }}
                    />
                  </div>
                </div>
              </td>
            ))}
          </tr>
          <tr>
            <td className="px-3 py-2 text-muted-foreground">Séances</td>
            {metrics.map((m, i) => (
              <td key={i} className="px-3 py-2 text-center font-mono">
                {m.sessionCount}
              </td>
            ))}
          </tr>
          <tr>
            <td className="px-3 py-2 text-muted-foreground">Séances clés</td>
            {metrics.map((m, i) => (
              <td key={i} className="px-3 py-2 text-center font-mono text-amber-500">
                {m.keySessions}
              </td>
            ))}
          </tr>
          <tr>
            <td className="px-3 py-2 text-muted-foreground">Phase</td>
            {metrics.map((m, i) => (
              <td key={i} className="px-3 py-2 text-center">
                <PhaseBadge phase={m.week.meta.phase} />
              </td>
            ))}
          </tr>
          <tr>
            <td className="px-3 py-2 text-muted-foreground">Focus</td>
            {metrics.map((m, i) => (
              <td key={i} className="px-3 py-2 text-center">
                <FocusBadge focus={m.week.meta.focus} />
              </td>
            ))}
          </tr>
          <tr>
            <td className="px-3 py-2 text-muted-foreground">Charge</td>
            {metrics.map((m, i) => (
              <td key={i} className="px-3 py-2 text-center">
                <div className="flex justify-center">
                  {[1,2,3,4,5].map(level => (
                    <div 
                      key={level}
                      className={cn(
                        "w-2 h-2 rounded-full mx-0.5",
                        level <= m.week.meta.loadLevel ? "bg-orange-500" : "bg-muted"
                      )}
                    />
                  ))}
                </div>
              </td>
            ))}
          </tr>
          <tr>
            <td className="px-3 py-2 text-muted-foreground">Intensité</td>
            {metrics.map((m, i) => (
              <td key={i} className="px-3 py-2 text-center">
                <div className="flex justify-center">
                  {[1,2,3,4,5].map(level => (
                    <div 
                      key={level}
                      className={cn(
                        "w-2 h-2 rounded-full mx-0.5",
                        level <= m.week.meta.intensityDensity ? "bg-red-500" : "bg-muted"
                      )}
                    />
                  ))}
                </div>
              </td>
            ))}
          </tr>
          <tr>
            <td className="px-3 py-2 text-muted-foreground">Risque blessure</td>
            {metrics.map((m, i) => (
              <td key={i} className="px-3 py-2 text-center">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] border-0",
                    m.week.meta.injuryRisk === "LOW" ? "bg-green-500/20 text-green-400" :
                    m.week.meta.injuryRisk === "MED" ? "bg-amber-500/20 text-amber-400" :
                    "bg-red-500/20 text-red-400"
                  )}
                >
                  {m.week.meta.injuryRisk}
                </Badge>
              </td>
            ))}
          </tr>
          
          {/* Sport Breakdown for Triathlon */}
          {metrics.some(m => m.week.templateType === "triathlon") && (
            <>
              <tr>
                <td className="px-3 py-2 text-muted-foreground flex items-center gap-1">
                  <Waves className="h-3 w-3" /> Natation
                </td>
                {metrics.map((m, i) => (
                  <td key={i} className="px-3 py-2 text-center font-mono text-cyan-400">
                    {formatDuration(m.sportBreakdown["Natation"] || 0)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-muted-foreground flex items-center gap-1">
                  <Bike className="h-3 w-3" /> Vélo
                </td>
                {metrics.map((m, i) => (
                  <td key={i} className="px-3 py-2 text-center font-mono text-green-400">
                    {formatDuration(m.sportBreakdown["Vélo"] || 0)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-3 py-2 text-muted-foreground flex items-center gap-1">
                  <Footprints className="h-3 w-3" /> CAP
                </td>
                {metrics.map((m, i) => (
                  <td key={i} className="px-3 py-2 text-center font-mono text-orange-400">
                    {formatDuration(m.sportBreakdown["CAP"] || 0)}
                  </td>
                ))}
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function QuickWeekComparisonPanel() {
  const [slots, setSlots] = useState<WeekSlot[]>([
    { weekId: null },
    { weekId: null },
  ]);
  
  const { plans: importedPlans, refresh: refreshImported } = useImportedPlans();

  // Refresh imported plans on mount
  useEffect(() => {
    refreshImported();
  }, []);

  // Build unified week list from all sources
  const allWeeks = useMemo(() => {
    const weeks: UnifiedWeek[] = [];
    
    // 1. Running templates
    RUNNING_TEMPLATES.forEach(template => {
      template.sections.forEach(section => {
        section.weeks.forEach(week => {
          weeks.push(runningWeekToUnified(week, template.name, template.goal));
        });
      });
    });
    
    // 2. Triathlon templates (static)
    PROGRAM_TEMPLATES.forEach(template => {
      if (template.weeks) {
        template.weeks.forEach(week => {
          weeks.push(triathlonWeekToUnified(
            week, 
            template.id, 
            template.name, 
            template.target.toLowerCase()
          ));
        });
      }
    });
    
    // 3. Imported plans
    importedPlans.forEach(plan => {
      plan.weeks.forEach(week => {
        weeks.push(triathlonWeekToUnified(
          week,
          plan.id,
          `📥 ${plan.name}`,
          plan.goal
        ));
      });
    });
    
    return weeks;
  }, [importedPlans]);

  const handleSelect = (slotIndex: number, weekId: string) => {
    setSlots(prev => {
      const newSlots = [...prev];
      newSlots[slotIndex] = { weekId };
      return newSlots;
    });
  };

  const handleClear = (slotIndex: number) => {
    setSlots(prev => {
      const newSlots = [...prev];
      newSlots[slotIndex] = { weekId: null };
      return newSlots;
    });
  };

  const handleAddSlot = () => {
    if (slots.length < 4) {
      setSlots(prev => [...prev, { weekId: null }]);
    }
  };

  const handleClearAll = () => {
    setSlots([
      { weekId: null },
      { weekId: null },
    ]);
  };

  // Build comparison metrics
  const comparisonMetrics: ComparisonMetrics[] = useMemo(() => {
    return slots
      .map(slot => {
        if (!slot.weekId) return null;
        const week = allWeeks.find(w => w.id === slot.weekId);
        if (!week) return null;
        
        const totalDuration = week.sessions.reduce((sum, s) => sum + s.durationMin, 0);
        const keySessions = week.sessions.filter(s => s.isKey).length;
        const sportBreakdown: Record<string, number> = {};
        
        week.sessions.forEach(s => {
          sportBreakdown[s.sport] = (sportBreakdown[s.sport] || 0) + s.durationMin;
        });
        
        return {
          week,
          totalDuration,
          keySessions,
          sessionCount: week.sessions.length,
          sportBreakdown,
        };
      })
      .filter((m): m is ComparisonMetrics => m !== null);
  }, [slots, allWeeks]);

  const hasAnySelection = slots.some(s => s.weekId);

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Comparateur de Semaines Rapide
            <Badge variant="secondary" className="text-xs">
              {comparisonMetrics.length}/{slots.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {slots.length < 4 && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAddSlot}>
                <Plus className="h-3 w-3 mr-1" />
                Ajouter slot
              </Button>
            )}
            {hasAnySelection && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleClearAll}>
                <X className="h-3 w-3 mr-1" />
                Effacer tout
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Sélectionnez jusqu'à 4 semaines (Running ou Triathlon) pour comparer volume, charge et intensité côte à côte.
        </p>
        
        {/* Week Slots */}
        <div className="flex flex-wrap gap-3">
          {slots.map((slot, index) => (
            <WeekSlotSelector
              key={index}
              slot={slot}
              slotIndex={index}
              allWeeks={allWeeks}
              onSelect={(weekId) => handleSelect(index, weekId)}
              onClear={() => handleClear(index)}
            />
          ))}
        </div>

        {/* Comparison Table */}
        {comparisonMetrics.length >= 2 && (
          <ComparisonTable metrics={comparisonMetrics} />
        )}

        {comparisonMetrics.length === 1 && (
          <div className="text-center py-4 text-xs text-muted-foreground border rounded-lg bg-muted/30">
            <BarChart3 className="h-6 w-6 mx-auto mb-2 opacity-50" />
            Sélectionnez au moins 2 semaines pour voir la comparaison.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
