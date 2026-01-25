// =============================================
// TRIATHLON TEMPLATE GRID - Interactive Plan Viewer
// Two For Coaching Lab
// =============================================

import { useState, useMemo } from "react";
import { format, differenceInWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChevronRight, Calendar as CalendarIcon, Flame, Heart, Timer, TrendingUp, Zap, 
  Target, Dumbbell, Clock, Eye, CheckCircle2, Lightbulb, Waves, Bike, PersonStanding
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PROGRAM_TEMPLATES } from "@/data/programTemplates";
import type { TemplateWeek, TemplateSession } from "@/lib/templates/docxTemplateLoader";

// =============================================
// TYPES
// =============================================

type TriathlonGoal = "IM" | "703";
type TriathlonPhase = "VO2MAX" | "SEUIL" | "ENDURANCE" | "SPECIFIQUE" | "TAPER";

interface TriathlonTemplate {
  id: string;
  name: string;
  target: TriathlonGoal;
  weeks: TemplateWeek[];
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function getTriathlonTemplates(): TriathlonTemplate[] {
  return PROGRAM_TEMPLATES
    .filter(t => t.target === "IM" || t.target === "703")
    .map(t => ({
      id: t.id,
      name: t.name,
      target: t.target as TriathlonGoal,
      weeks: t.weeks,
    }));
}

function parsePhaseFromWeek(week: TemplateWeek): TriathlonPhase {
  const phase = (week.phase || "").toLowerCase();
  if (phase.includes("vo2") || phase.includes("vitesse") || phase.includes("phase 1")) return "VO2MAX";
  if (phase.includes("seuil") || phase.includes("threshold") || phase.includes("phase 2")) return "SEUIL";
  if (phase.includes("endurance") || phase.includes("foncier") || phase.includes("phase 3")) return "ENDURANCE";
  if (phase.includes("spécifique") || phase.includes("specific") || phase.includes("phase 4")) return "SPECIFIQUE";
  if (phase.includes("taper") || phase.includes("affût") || phase.includes("récup")) return "TAPER";
  return "ENDURANCE";
}

function getPhaseColor(phase: TriathlonPhase): string {
  const colors: Record<TriathlonPhase, string> = {
    VO2MAX: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    SEUIL: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    ENDURANCE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    SPECIFIQUE: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    TAPER: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  };
  return colors[phase] || "bg-muted text-muted-foreground";
}

function getPhaseLabel(phase: TriathlonPhase): string {
  const labels: Record<TriathlonPhase, string> = {
    VO2MAX: "VO2max/Vitesse",
    SEUIL: "Seuil",
    ENDURANCE: "Endurance",
    SPECIFIQUE: "Spécifique",
    TAPER: "Affûtage",
  };
  return labels[phase] || phase;
}

function getWeekNumberFromDate(raceDate: Date, templateWeeksCount: number): number {
  const today = new Date();
  const weeksToRace = differenceInWeeks(raceDate, today);
  
  if (weeksToRace < 0) return templateWeeksCount;
  if (weeksToRace >= templateWeeksCount) return 1;
  
  return templateWeeksCount - weeksToRace;
}

function getSportIcon(sport: string) {
  const lower = (sport || "").toLowerCase();
  if (lower.includes("natation") || lower.includes("swim")) return <Waves className="h-3 w-3 text-blue-500" />;
  if (lower.includes("vélo") || lower.includes("bike")) return <Bike className="h-3 w-3 text-green-500" />;
  if (lower.includes("cap") || lower.includes("course") || lower.includes("run")) return <PersonStanding className="h-3 w-3 text-orange-500" />;
  if (lower.includes("brick")) return <Zap className="h-3 w-3 text-purple-500" />;
  return <Clock className="h-3 w-3 text-muted-foreground" />;
}

// =============================================
// PHASE BADGE
// =============================================

function PhaseBadge({ phase, size = "sm" }: { phase: TriathlonPhase; size?: "sm" | "md" }) {
  const icons: Record<TriathlonPhase, React.ReactNode> = {
    VO2MAX: <Flame className="h-3 w-3" />,
    SEUIL: <Timer className="h-3 w-3" />,
    ENDURANCE: <Heart className="h-3 w-3" />,
    SPECIFIQUE: <Target className="h-3 w-3" />,
    TAPER: <CheckCircle2 className="h-3 w-3" />,
  };
  const sizeClass = size === "md" ? "text-xs px-2 py-1" : "text-[10px] px-1.5 py-0.5";
  return (
    <Badge variant="outline" className={`${getPhaseColor(phase)} ${sizeClass} flex items-center gap-1`}>
      {icons[phase]}
      {getPhaseLabel(phase)}
    </Badge>
  );
}

// =============================================
// WEEK DETAIL DIALOG
// =============================================

function WeekDetailDialog({ week, templateName }: { week: TemplateWeek; templateName: string }) {
  const phase = parsePhaseFromWeek(week);
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
          <Eye className="h-3 w-3" />
          Détails
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Semaine {week.weekNumber}</span>
            <PhaseBadge phase={phase} size="md" />
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{templateName}</p>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {week.theme && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">{week.theme}</p>
              </div>
            )}
            
            <div className="space-y-3">
              {week.sessions.map((session, idx) => (
                <div key={idx} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    {getSportIcon(session.discipline || session.sport || "")}
                    <span className="font-medium text-sm">{session.day}</span>
                    <Badge variant="secondary" className="text-xs">
                      {session.discipline || session.sport}
                    </Badge>
                    {session.title && (
                      <span className="text-xs text-muted-foreground">• {session.title}</span>
                    )}
                  </div>
                  <p className="text-sm">{session.details || session.description}</p>
                  {session.notes && (
                    <p className="text-xs text-muted-foreground italic">💡 {session.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// GOAL DATE SUGGESTER
// =============================================

interface GoalDateSuggesterProps {
  goal: TriathlonGoal;
  onWeekSelect?: (week: TemplateWeek, templateName: string) => void;
}

function GoalDateSuggester({ goal, onWeekSelect }: GoalDateSuggesterProps) {
  const [raceDate, setRaceDate] = useState<Date | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const templates = useMemo(() => getTriathlonTemplates().filter(t => t.target === goal), [goal]);
  const template = templates[0];
  
  const suggestion = useMemo(() => {
    if (!raceDate || !template) return null;
    
    const weekNumber = getWeekNumberFromDate(raceDate, template.weeks.length);
    const week = template.weeks.find(w => w.weekNumber === weekNumber);
    
    if (!week) return null;
    
    const phase = parsePhaseFromWeek(week);
    const weeksToRace = differenceInWeeks(raceDate, new Date());
    
    return {
      week,
      weekNumber,
      phase,
      weeksToRace,
      templateName: template.name,
    };
  }, [raceDate, template]);

  if (!template) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Suggestion par date d'objectif
          <Badge variant="outline" className="text-[10px]">
            {goal === "IM" ? "Ironman" : "70.3"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
                  !raceDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {raceDate ? format(raceDate, "PPP", { locale: fr }) : "Date de course"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 bg-background" align="start">
              <Calendar
                mode="single"
                selected={raceDate}
                onSelect={(date) => {
                  setRaceDate(date);
                  setIsCalendarOpen(false);
                }}
                disabled={(date) => date < new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          
          {raceDate && (
            <Button variant="ghost" size="sm" onClick={() => setRaceDate(undefined)}>
              Effacer
            </Button>
          )}
        </div>
        
        {suggestion && (
          <div className="p-3 bg-background/80 rounded-lg border space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-sm">Semaine {suggestion.weekNumber}</span>
                <PhaseBadge phase={suggestion.phase} />
              </div>
              <Badge variant="secondary" className="text-xs">
                J-{suggestion.weeksToRace * 7}
              </Badge>
            </div>
            
            {suggestion.week.theme && (
              <p className="text-xs text-muted-foreground">{suggestion.week.theme}</p>
            )}
            
            <div className="flex items-center gap-2 pt-1">
              <WeekDetailDialog week={suggestion.week} templateName={suggestion.templateName} />
              {onWeekSelect && (
                <Button 
                  size="sm" 
                  variant="default"
                  className="h-7 text-xs"
                  onClick={() => onWeekSelect(suggestion.week, suggestion.templateName)}
                >
                  Utiliser cette semaine
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================
// WEEK CARD
// =============================================

function WeekCard({ week, templateName, isCurrentWeek }: { 
  week: TemplateWeek; 
  templateName: string;
  isCurrentWeek?: boolean;
}) {
  const phase = parsePhaseFromWeek(week);
  
  // Count sessions by sport
  const sportCounts = useMemo(() => {
    const counts = { swim: 0, bike: 0, run: 0, other: 0 };
    week.sessions.forEach(s => {
      const sport = (s.discipline || s.sport || "").toLowerCase();
      if (sport.includes("natation") || sport.includes("swim")) counts.swim++;
      else if (sport.includes("vélo") || sport.includes("bike")) counts.bike++;
      else if (sport.includes("cap") || sport.includes("run") || sport.includes("course")) counts.run++;
      else if (!sport.includes("repos")) counts.other++;
    });
    return counts;
  }, [week.sessions]);

  return (
    <Card className={cn(
      "hover:shadow-md transition-all cursor-pointer group",
      isCurrentWeek && "ring-2 ring-primary"
    )}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">S{week.weekNumber}</span>
            <PhaseBadge phase={phase} />
          </div>
          {isCurrentWeek && (
            <Badge className="bg-primary text-primary-foreground text-[10px]">
              Cette semaine
            </Badge>
          )}
        </div>
        
        {week.theme && (
          <p className="text-xs text-muted-foreground line-clamp-1">{week.theme}</p>
        )}
        
        {/* Sport distribution */}
        <div className="flex items-center gap-2 text-xs">
          {sportCounts.swim > 0 && (
            <span className="flex items-center gap-1 text-blue-600">
              <Waves className="h-3 w-3" />{sportCounts.swim}
            </span>
          )}
          {sportCounts.bike > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <Bike className="h-3 w-3" />{sportCounts.bike}
            </span>
          )}
          {sportCounts.run > 0 && (
            <span className="flex items-center gap-1 text-orange-600">
              <PersonStanding className="h-3 w-3" />{sportCounts.run}
            </span>
          )}
        </div>
        
        <div className="pt-1">
          <WeekDetailDialog week={week} templateName={templateName} />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function TriathlonTemplateGrid() {
  const [selectedGoal, setSelectedGoal] = useState<TriathlonGoal>("703");
  
  const templates = useMemo(() => getTriathlonTemplates(), []);
  const filteredTemplates = useMemo(
    () => templates.filter(t => t.target === selectedGoal),
    [templates, selectedGoal]
  );
  
  return (
    <div className="space-y-4">
      {/* Goal Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedGoal} onValueChange={(v) => setSelectedGoal(v as TriathlonGoal)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background">
            <SelectItem value="703">Ironman 70.3</SelectItem>
            <SelectItem value="IM">Ironman Full</SelectItem>
          </SelectContent>
        </Select>
        
        <Badge variant="secondary" className="text-xs">
          {filteredTemplates.reduce((acc, t) => acc + t.weeks.length, 0)} semaines
        </Badge>
      </div>
      
      {/* Date-based Suggester */}
      <GoalDateSuggester goal={selectedGoal} />
      
      {/* Templates Grid */}
      {filteredTemplates.map(template => (
        <div key={template.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{template.name}</span>
            <Badge variant="outline" className="text-xs">{template.weeks.length} sem.</Badge>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {template.weeks.map(week => (
              <WeekCard 
                key={week.weekNumber} 
                week={week} 
                templateName={template.name}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
