// =============================================
// QUICK WEEK COMPARISON PANEL - Dropdown-based
// Two For Coaching Lab
// =============================================

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeftRight, X, Plus, Timer, Flame, Heart, TrendingUp, Zap, 
  Target, Dumbbell, CheckCircle2, BarChart3, Calendar, Clock, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RUNNING_TEMPLATES } from "@/lib/templates/runningTemplatesStore";
import type { RunningTemplate, RunningWeek, RunningPhase, WeekFocus } from "@/types/runningTemplate";

// =============================================
// HELPER COMPONENTS
// =============================================

function PhaseBadge({ phase }: { phase: RunningPhase }) {
  const config: Record<string, { bg: string; text: string }> = {
    BASE: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
    BUILD: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300" },
    SPECIFIC: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
    TAPER: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  };
  const c = config[phase] || config.BASE;
  return (
    <Badge variant="outline" className={`${c.bg} ${c.text} text-[10px] px-1.5 py-0.5`}>
      {phase}
    </Badge>
  );
}

function FocusBadge({ focus }: { focus: WeekFocus }) {
  const config: Record<string, { icon: React.ReactNode; color: string }> = {
    TTE: { icon: <Timer className="h-2.5 w-2.5" />, color: "text-orange-600" },
    VO2: { icon: <Flame className="h-2.5 w-2.5" />, color: "text-red-600" },
    ECONOMY: { icon: <TrendingUp className="h-2.5 w-2.5" />, color: "text-blue-600" },
    ENDURANCE: { icon: <Heart className="h-2.5 w-2.5" />, color: "text-green-600" },
    SPEED: { icon: <Zap className="h-2.5 w-2.5" />, color: "text-purple-600" },
  };
  const c = config[focus] || config.ENDURANCE;
  return (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
      <span className={c.color}>{c.icon}</span>
      {focus}
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
  templateId: string | null;
  weekId: string | null;
}

interface WeekSlotSelectorProps {
  slot: WeekSlot;
  slotIndex: number;
  allWeeks: { template: RunningTemplate; week: RunningWeek }[];
  onSelect: (templateId: string, weekId: string) => void;
  onClear: () => void;
}

function WeekSlotSelector({ slot, slotIndex, allWeeks, onSelect, onClear }: WeekSlotSelectorProps) {
  const selectedWeek = slot.templateId && slot.weekId 
    ? allWeeks.find(w => w.template.id === slot.templateId && w.week.week_id === slot.weekId)
    : null;
  
  const totalDuration = selectedWeek 
    ? selectedWeek.week.sessions.reduce((sum, s) => sum + s.duration_min, 0) 
    : 0;
  const keySessions = selectedWeek 
    ? selectedWeek.week.sessions.filter(s => s.isKey).length 
    : 0;

  return (
    <div className={cn(
      "flex-1 min-w-[200px] rounded-lg border-2 border-dashed transition-all",
      selectedWeek 
        ? "border-primary/50 bg-primary/5" 
        : "border-muted-foreground/30 hover:border-muted-foreground/50"
    )}>
      {selectedWeek ? (
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="text-xs font-semibold">
                S{selectedWeek.week.week_number} • {selectedWeek.week.title}
              </div>
              <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                {selectedWeek.template.name}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClear}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-1">
            <PhaseBadge phase={selectedWeek.week.meta.phase} />
            <FocusBadge focus={selectedWeek.week.meta.focus} />
          </div>
          
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {formatDuration(totalDuration)}
            </span>
            <span>•</span>
            <span>{selectedWeek.week.sessions.length} séances</span>
            <span className="text-amber-600">({keySessions} clés)</span>
          </div>
          
          {/* Load Bars Mini */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[9px]">
              <span className="w-12 text-muted-foreground">Charge</span>
              <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden">
                <div 
                  className="h-full bg-orange-500" 
                  style={{ width: `${selectedWeek.week.meta.load_level * 20}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1 text-[9px]">
              <span className="w-12 text-muted-foreground">Intensité</span>
              <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden">
                <div 
                  className="h-full bg-red-500" 
                  style={{ width: `${selectedWeek.week.meta.intensity_density * 20}%` }}
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
          <Select
            value=""
            onValueChange={(value) => {
              const [templateId, weekId] = value.split("::");
              onSelect(templateId, weekId);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Sélectionner une semaine..." />
            </SelectTrigger>
            <SelectContent className="bg-popover max-h-64">
              {/* Group by template */}
              {RUNNING_TEMPLATES.map(template => (
                <div key={template.id}>
                  <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/30 sticky top-0">
                    {template.name} • {template.goal === "marathon" ? "42K" : "21K"}
                  </div>
                  {template.sections.flatMap(s => s.weeks).map(week => (
                    <SelectItem 
                      key={`${template.id}::${week.week_id}`} 
                      value={`${template.id}::${week.week_id}`}
                      className="text-xs"
                    >
                      S{week.week_number} • {week.title}
                      <span className="ml-1 text-muted-foreground">
                        ({week.meta.phase})
                      </span>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// =============================================
// COMPARISON METRICS TABLE
// =============================================

interface ComparisonMetrics {
  week: RunningWeek;
  templateName: string;
  totalDuration: number;
  keySessions: number;
  sessionTypes: Record<string, number>;
  sessionCount: number;
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
                S{m.week.week_number}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
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
              <td key={i} className="px-3 py-2 text-center font-mono text-amber-600">
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
                        level <= m.week.meta.load_level ? "bg-orange-500" : "bg-muted"
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
                        level <= m.week.meta.intensity_density ? "bg-red-500" : "bg-muted"
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
                    "text-[10px]",
                    m.week.meta.injury_risk_tag === "LOW" ? "bg-green-100 text-green-700" :
                    m.week.meta.injury_risk_tag === "MED" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  )}
                >
                  {m.week.meta.injury_risk_tag}
                </Badge>
              </td>
            ))}
          </tr>
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
    { templateId: null, weekId: null },
    { templateId: null, weekId: null },
  ]);

  // Flatten all weeks from all templates
  const allWeeks = useMemo(() => {
    return RUNNING_TEMPLATES.flatMap(template => 
      template.sections.flatMap(section => 
        section.weeks.map(week => ({ template, week }))
      )
    );
  }, []);

  const handleSelect = (slotIndex: number, templateId: string, weekId: string) => {
    setSlots(prev => {
      const newSlots = [...prev];
      newSlots[slotIndex] = { templateId, weekId };
      return newSlots;
    });
  };

  const handleClear = (slotIndex: number) => {
    setSlots(prev => {
      const newSlots = [...prev];
      newSlots[slotIndex] = { templateId: null, weekId: null };
      return newSlots;
    });
  };

  const handleAddSlot = () => {
    if (slots.length < 4) {
      setSlots(prev => [...prev, { templateId: null, weekId: null }]);
    }
  };

  const handleClearAll = () => {
    setSlots([
      { templateId: null, weekId: null },
      { templateId: null, weekId: null },
    ]);
  };

  // Build comparison metrics
  const comparisonMetrics: ComparisonMetrics[] = useMemo(() => {
    return slots
      .map(slot => {
        if (!slot.templateId || !slot.weekId) return null;
        const found = allWeeks.find(
          w => w.template.id === slot.templateId && w.week.week_id === slot.weekId
        );
        if (!found) return null;
        
        const totalDuration = found.week.sessions.reduce((sum, s) => sum + s.duration_min, 0);
        const keySessions = found.week.sessions.filter(s => s.isKey).length;
        const sessionTypes = found.week.sessions.reduce((acc, s) => {
          acc[s.type] = (acc[s.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        return {
          week: found.week,
          templateName: found.template.name,
          totalDuration,
          keySessions,
          sessionTypes,
          sessionCount: found.week.sessions.length,
        };
      })
      .filter((m): m is ComparisonMetrics => m !== null);
  }, [slots, allWeeks]);

  const hasAnySelection = slots.some(s => s.templateId && s.weekId);

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
          Sélectionnez jusqu'à 4 semaines via les dropdowns pour comparer volume, charge et intensité côte à côte.
        </p>
        
        {/* Week Slots */}
        <div className="flex flex-wrap gap-3">
          {slots.map((slot, index) => (
            <WeekSlotSelector
              key={index}
              slot={slot}
              slotIndex={index}
              allWeeks={allWeeks}
              onSelect={(templateId, weekId) => handleSelect(index, templateId, weekId)}
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
