// =============================================
// TRIATHLON TEMPLATE GRID - Interactive Plan Viewer
// Two For Coaching Lab
// Similar structure to RunningTemplateViewer
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
import { 
  ChevronRight, Calendar as CalendarIcon, Flame, Heart, Timer, TrendingUp, Zap, 
  Target, Dumbbell, Clock, Eye, CheckCircle2, Lightbulb, Waves, Bike, PersonStanding, 
  BarChart3, X, ArrowLeftRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PROGRAM_TEMPLATES } from "@/data/programTemplates";
import type { TemplateWeek, TemplateSession } from "@/lib/templates/docxTemplateLoader";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

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
  description: string;
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
      description: t.target === "IM" 
        ? "Plan complet Ironman 140.6 - Méthodologie TFCL™" 
        : "Plan complet Ironman 70.3 - Méthodologie TFCL™",
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

function getSportIcon(sport: string) {
  const lower = (sport || "").toLowerCase();
  if (lower.includes("natation") || lower.includes("swim")) return <Waves className="h-3 w-3 text-blue-500" />;
  if (lower.includes("vélo") || lower.includes("bike")) return <Bike className="h-3 w-3 text-green-500" />;
  if (lower.includes("cap") || lower.includes("course") || lower.includes("run")) return <PersonStanding className="h-3 w-3 text-orange-500" />;
  if (lower.includes("brick") || lower.includes("+")) return <Zap className="h-3 w-3 text-purple-500" />;
  return <Clock className="h-3 w-3 text-muted-foreground" />;
}

function parseDurationMinutes(text: string): number {
  if (!text) return 0;
  const hourMinMatch = text.match(/(\d+)h(\d+)?/i);
  if (hourMinMatch) {
    const hours = parseInt(hourMinMatch[1], 10);
    const minutes = hourMinMatch[2] ? parseInt(hourMinMatch[2], 10) : 0;
    return hours * 60 + minutes;
  }
  const minOnlyMatch = text.match(/(\d+)['′]/);
  if (minOnlyMatch) return parseInt(minOnlyMatch[1], 10);
  return 0;
}

function formatDuration(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
  }
  return `${min}'`;
}

function getWeekNumberFromDate(raceDate: Date, templateWeeksCount: number): number {
  const today = new Date();
  const weeksToRace = differenceInWeeks(raceDate, today);
  if (weeksToRace < 0) return templateWeeksCount;
  if (weeksToRace >= templateWeeksCount) return 1;
  return templateWeeksCount - weeksToRace;
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
// VOLUME BY PHASE CHART
// =============================================

function VolumeByPhaseChart({ weeks }: { weeks: TemplateWeek[] }) {
  const data = useMemo(() => {
    const phaseVolumes: Record<string, { swim: number; bike: number; run: number; phase: string }> = {};
    
    weeks.forEach(week => {
      const phase = week.phase || "Autre";
      if (!phaseVolumes[phase]) {
        phaseVolumes[phase] = { swim: 0, bike: 0, run: 0, phase };
      }
      
      week.sessions.forEach(session => {
        const discipline = (session.discipline || session.sport || "").toLowerCase();
        const description = session.details || session.description || "";
        const duration = parseDurationMinutes(description);
        
        if (discipline.includes("natation") || discipline.includes("swim")) {
          phaseVolumes[phase].swim += duration;
        } else if (discipline.includes("vélo") || discipline.includes("bike")) {
          phaseVolumes[phase].bike += duration;
        } else if (discipline.includes("cap") || discipline.includes("run") || discipline.includes("course")) {
          phaseVolumes[phase].run += duration;
        } else if (discipline.includes("brick") || discipline.includes("+")) {
          // Split brick sessions
          phaseVolumes[phase].bike += duration * 0.7;
          phaseVolumes[phase].run += duration * 0.3;
        }
      });
    });

    return Object.values(phaseVolumes).map(p => ({
      phase: p.phase.replace(/^.*Phase \d+\s*:\s*/i, "").slice(0, 15),
      swim: Math.round(p.swim / 60 * 10) / 10,
      bike: Math.round(p.bike / 60 * 10) / 10,
      run: Math.round(p.run / 60 * 10) / 10,
    }));
  }, [weeks]);

  const totalHours = data.reduce((acc, d) => acc + d.swim + d.bike + d.run, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Volume par Phase
        </h4>
        <Badge variant="secondary" className="font-mono text-xs">
          {totalHours.toFixed(0)}h total
        </Badge>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-500/10 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
            {data.reduce((acc, d) => acc + d.swim, 0).toFixed(1)}h
          </div>
          <div className="text-[10px] text-muted-foreground">🏊 Natation</div>
        </div>
        <div className="bg-green-500/10 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-green-600 dark:text-green-400 font-mono">
            {data.reduce((acc, d) => acc + d.bike, 0).toFixed(1)}h
          </div>
          <div className="text-[10px] text-muted-foreground">🚴 Vélo</div>
        </div>
        <div className="bg-orange-500/10 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-orange-600 dark:text-orange-400 font-mono">
            {data.reduce((acc, d) => acc + d.run, 0).toFixed(1)}h
          </div>
          <div className="text-[10px] text-muted-foreground">🏃 CAP</div>
        </div>
      </div>
      
      {/* Chart */}
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
            <XAxis 
              dataKey="phase" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
              angle={-35}
              textAnchor="end"
              height={50}
              interval={0}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
              tickFormatter={(v) => `${v}h`}
              width={35}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--background))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            <Bar dataKey="swim" stackId="a" fill="hsl(217, 91%, 60%)" name="Natation" />
            <Bar dataKey="bike" stackId="a" fill="hsl(142, 71%, 45%)" name="Vélo" />
            <Bar dataKey="run" stackId="a" fill="hsl(24, 95%, 53%)" name="CAP" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// =============================================
// SESSION CARD
// =============================================

function SessionCard({ session, expanded = false }: { session: TemplateSession; expanded?: boolean }) {
  const [isOpen, setIsOpen] = useState(expanded);
  const duration = parseDurationMinutes(session.details || session.description || "");
  
  return (
    <div className={cn(
      "rounded-lg border text-sm transition-all bg-card"
    )}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-start justify-between gap-2 text-left hover:bg-muted/50 transition-colors rounded-lg"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono bg-background shrink-0">
              {session.day}
            </Badge>
            {getSportIcon(session.discipline || session.sport || "")}
            <span className="font-medium text-sm">{session.title || session.discipline}</span>
          </div>
          {!isOpen && (session.details || session.description) && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {session.details || session.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {duration > 0 && (
            <Badge variant="secondary" className="text-[10px] font-mono">
              {formatDuration(duration)}
            </Badge>
          )}
          <ChevronRight className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen && "rotate-90"
          )} />
        </div>
      </button>
      
      {isOpen && (
        <div className="px-3 pb-3 space-y-2 border-t border-dashed">
          {(session.details || session.description) && (
            <div className="pt-2">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Contenu de la séance
              </div>
              <p className="text-sm bg-muted/50 p-2 rounded border font-mono whitespace-pre-wrap">
                {session.details || session.description}
              </p>
            </div>
          )}
          
          {session.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-200">{session.notes}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================
// WEEK CARD
// =============================================

function WeekCard({ week, templateName }: { week: TemplateWeek; templateName: string }) {
  const phase = parsePhaseFromWeek(week);
  const [isOpen, setIsOpen] = useState(false);
  
  const sportCounts = useMemo(() => {
    const counts = { swim: 0, bike: 0, run: 0 };
    week.sessions.forEach(s => {
      const sport = (s.discipline || s.sport || "").toLowerCase();
      if (sport.includes("natation") || sport.includes("swim")) counts.swim++;
      else if (sport.includes("vélo") || sport.includes("bike")) counts.bike++;
      else if (sport.includes("cap") || sport.includes("run") || sport.includes("course")) counts.run++;
    });
    return counts;
  }, [week.sessions]);

  const totalDuration = week.sessions.reduce((sum, s) => {
    return sum + parseDurationMinutes(s.details || s.description || "");
  }, 0);

  return (
    <Card className="border transition-all hover:border-primary/30">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">S{week.weekNumber}</span>
            <PhaseBadge phase={phase} />
          </div>
          <Badge variant="secondary" className="text-[10px] font-mono">
            {formatDuration(totalDuration)}
          </Badge>
        </div>
        
        {week.theme && (
          <p className="text-xs text-muted-foreground line-clamp-1">{week.theme}</p>
        )}
        
        <div className="flex items-center gap-3 text-xs">
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
          <span className="text-muted-foreground">• {week.sessions.length} séances</span>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full text-xs h-7">
              <Eye className="h-3 w-3 mr-1" />
              Voir les séances
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
            <div className="flex-shrink-0 p-6 pb-4 border-b">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Semaine {week.weekNumber} - {week.theme || "Programme"}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">{templateName}</p>
              </DialogHeader>
              <div className="flex flex-wrap gap-2 mt-4">
                <PhaseBadge phase={phase} size="md" />
                <Badge variant="outline" className="text-xs">{week.sessions.length} séances</Badge>
                <Badge variant="outline" className="text-xs font-mono">{formatDuration(totalDuration)}</Badge>
              </div>
            </div>
            <ScrollArea className="flex-1 p-6 pt-4">
              <div className="space-y-2">
                {week.sessions.map((session, idx) => (
                  <SessionCard key={idx} session={session} />
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// =============================================
// TEMPLATE DETAIL DIALOG
// =============================================

interface TemplateDetailDialogProps {
  template: TriathlonTemplate;
  trigger: React.ReactNode;
}

function TemplateDetailDialog({ template, trigger }: TemplateDetailDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <div className="flex-shrink-0 p-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              {template.name}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{template.description}</p>
          </DialogHeader>
          
          <div className="flex gap-3 flex-wrap mt-4">
            <Badge 
              className={cn(
                "border-0 text-xs",
                template.target === "IM" 
                  ? "bg-gradient-to-r from-red-500 to-orange-500 text-white" 
                  : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
              )}
            >
              {template.target === "IM" ? "Ironman 140.6" : "Ironman 70.3"}
            </Badge>
            <Badge variant="outline">{template.weeks.length} semaines</Badge>
            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              TFCL™
            </Badge>
          </div>
        </div>
        
        <ScrollArea className="flex-1 p-6 pt-4">
          <div className="space-y-6">
            {/* Volume Chart */}
            <VolumeByPhaseChart weeks={template.weeks} />
            
            {/* Weeks Grid */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Toutes les semaines
              </h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {template.weeks.map(week => (
                  <WeekCard 
                    key={week.weekNumber} 
                    week={week} 
                    templateName={template.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// TEMPLATE CARD
// =============================================

function TemplateCard({ template }: { template: TriathlonTemplate }) {
  const totalSessions = template.weeks.reduce((sum, w) => sum + w.sessions.length, 0);
  
  // Calculate total volume
  const totalVolume = template.weeks.reduce((sum, week) => {
    return sum + week.sessions.reduce((wSum, s) => {
      return wSum + parseDurationMinutes(s.details || s.description || "");
    }, 0);
  }, 0);

  return (
    <Card className="border hover:border-primary/50 transition-colors group">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="truncate">{template.name}</span>
          <Badge className={cn(
            "border-0 text-[10px]",
            template.target === "IM" 
              ? "bg-gradient-to-r from-red-500 to-orange-500 text-white" 
              : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
          )}>
            {template.target === "IM" ? "140.6" : "70.3"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <p className="text-[11px] text-muted-foreground line-clamp-2">{template.description}</p>
        
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{template.weeks.length} sem.</Badge>
          <Badge variant="outline" className="text-[10px]">{totalSessions} séances</Badge>
          <Badge variant="outline" className="text-[10px] font-mono">{formatDuration(totalVolume)}</Badge>
          <Badge 
            variant="outline" 
            className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          >
            TFCL™
          </Badge>
        </div>

        <TemplateDetailDialog 
          template={template}
          trigger={
            <Button variant="outline" size="sm" className="w-full text-xs h-8 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Eye className="h-3 w-3 mr-1.5" />
              Voir le plan complet
              <ChevronRight className="h-3 w-3 ml-auto" />
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}

// =============================================
// GOAL DATE SUGGESTER
// =============================================

function GoalDateSuggester() {
  const [raceDate, setRaceDate] = useState<Date | undefined>();
  const [selectedGoal, setSelectedGoal] = useState<TriathlonGoal>("703");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const templates = useMemo(() => getTriathlonTemplates(), []);
  const template = templates.find(t => t.target === selectedGoal);
  
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

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Suggestion par date d'objectif
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={selectedGoal} onValueChange={(v) => setSelectedGoal(v as TriathlonGoal)}>
            <TabsList className="h-8">
              <TabsTrigger value="703" className="text-xs px-3 h-7">70.3</TabsTrigger>
              <TabsTrigger value="IM" className="text-xs px-3 h-7">Ironman</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[180px] justify-start text-left font-normal h-8 text-xs",
                  !raceDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
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
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setRaceDate(undefined)}>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function TriathlonTemplateGrid() {
  const templates = useMemo(() => getTriathlonTemplates(), []);
  
  const im703Templates = templates.filter(t => t.target === "703");
  const imFullTemplates = templates.filter(t => t.target === "IM");

  return (
    <div className="space-y-6">
      {/* Date-based Suggester */}
      <GoalDateSuggester />
      
      {/* Ironman 70.3 Templates */}
      {im703Templates.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            Ironman 70.3
            <Badge variant="outline" className="text-[10px]">{im703Templates.length} plan(s)</Badge>
          </h4>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {im703Templates.map(template => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </div>
      )}

      {/* Ironman Full Templates */}
      {imFullTemplates.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-500" />
            Ironman (140.6)
            <Badge variant="outline" className="text-[10px]">{imFullTemplates.length} plan(s)</Badge>
          </h4>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {imFullTemplates.map(template => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TriathlonTemplateGrid;
