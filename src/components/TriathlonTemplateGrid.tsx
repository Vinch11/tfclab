// =============================================
// TRIATHLON TEMPLATE GRID - Interactive Plan Viewer
// Two For Coaching Lab
// Similar structure to RunningTemplateViewer
// =============================================

import { useState, useMemo, useCallback } from "react";
import { useCustomTemplates } from "@/hooks/useCustomTemplates";
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
  BarChart3, X, ArrowLeftRight, AlertTriangle, Activity, User, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeRaceTypeForDisplay } from "@/lib/raceTypeNormalization";
import { PROGRAM_TEMPLATES } from "@/data/programTemplates";
import type { TemplateWeek, TemplateSession } from "@/lib/templates/docxTemplateLoader";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { computeCAPInjuryRiskIndex, type CAPRiskLevel } from "@/lib/capInjuryRisk";
import { CSVTemplateImporter } from "@/components/CSVTemplateImporter";

// =============================================
// TYPES
// =============================================

type TriathlonGoal = "IM" | "703" | "Marathon" | "Semi";
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
          <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
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
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <div className="space-y-2 pb-4">
                {week.sessions.map((session, idx) => (
                  <SessionCard key={idx} session={session} />
                ))}
              </div>
            </div>
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
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function TemplateDetailDialog({ template, trigger, isOpen, onOpenChange }: TemplateDetailDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
                template.target === "IM" ? "bg-gradient-to-r from-red-500 to-orange-500 text-white" 
                  : template.target === "703" ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                  : template.target === "Marathon" ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white"
                  : "bg-gradient-to-r from-teal-500 to-emerald-500 text-white"
              )}
            >
              {template.target === "IM" ? "Ironman 140.6" : template.target === "703" ? "Ironman 70.3" : template.target === "Marathon" ? "Marathon" : "Semi-Marathon"}
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

function TemplateCard({ template, isOpen, onOpenChange, isCustom, onDelete }: { template: TriathlonTemplate; isOpen: boolean; onOpenChange: (open: boolean) => void; isCustom?: boolean; onDelete?: () => void }) {
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
          <div className="flex items-center gap-1">
            {isCustom && (
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">CSV</Badge>
            )}
            <Badge className={cn(
              "border-0 text-[10px]",
              template.target === "IM" ? "bg-gradient-to-r from-red-500 to-orange-500 text-white" 
                : template.target === "703" ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                : template.target === "Marathon" ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white"
                : "bg-gradient-to-r from-teal-500 to-emerald-500 text-white"
            )}>
              {template.target === "IM" ? "140.6" : template.target === "703" ? "70.3" : template.target === "Marathon" ? "Marathon" : "Semi"}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <p className="text-[11px] text-muted-foreground line-clamp-2">{template.description}</p>
        
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{template.weeks.length} sem.</Badge>
          <Badge variant="outline" className="text-[10px]">{totalSessions} séances</Badge>
          <Badge variant="outline" className="text-[10px] font-mono">{formatDuration(totalVolume)}</Badge>
          {!isCustom && (
            <Badge 
              variant="outline" 
              className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            >
              TFCL™
            </Badge>
          )}
        </div>

        <TemplateDetailDialog 
          template={template}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          trigger={
            <Button variant="outline" size="sm" className="w-full text-xs h-8 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Eye className="h-3 w-3 mr-1.5" />
              Voir le plan complet
              <ChevronRight className="h-3 w-3 ml-auto" />
            </Button>
          }
        />
        {isCustom && onDelete && (
          <Button variant="ghost" size="sm" className="w-full text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onDelete}>
            <Trash2 className="h-3 w-3 mr-1.5" />
            Supprimer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================
// ATHLETE PROFILE BADGE
// =============================================

interface AthleteProfileData {
  name: string;
  vlamax: number | null;
  vlamaxConfidence: number;
  vlamaxSource: "test" | "snapshot" | "unknown";
  vlamaxDate: string | null;
  tte: number | null;
  tteConfidence: number;
  fatigueState: string;
  fatigueIndex: number;
  injuryRiskLevel: CAPRiskLevel;
  injuryRiskLabel: string;
  objectif: string;
}

function AthleteProfileBadge({ profile }: { profile: AthleteProfileData | null }) {
  if (!profile) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-dashed">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Aucun athlète sélectionné</span>
      </div>
    );
  }

  const getRiskColor = (level: CAPRiskLevel) => {
    switch (level) {
      case 0: return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300";
      case 1: return "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300";
      case 2: return "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300";
      case 3: return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300";
    }
  };

  const getFatigueColor = (index: number) => {
    if (index >= 70) return "text-red-600";
    if (index >= 55) return "text-amber-600";
    return "text-green-600";
  };

  const getSourceLabel = (source: "test" | "snapshot" | "unknown") => {
    switch (source) {
      case "test": return "Test terrain";
      case "snapshot": return "Mesure labo";
      default: return "Inconnue";
    }
  };

  const getSourceColor = (source: "test" | "snapshot" | "unknown") => {
    switch (source) {
      case "test": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "snapshot": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getDataFreshness = (dateStr: string | null): { label: string; color: string } => {
    if (!dateStr) return { label: "Date inconnue", color: "text-muted-foreground" };
    
    const date = new Date(dateStr);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) return { label: `${daysDiff}j`, color: "text-green-600" };
    if (daysDiff <= 30) return { label: `${Math.floor(daysDiff / 7)}sem`, color: "text-amber-600" };
    if (daysDiff <= 90) return { label: `${Math.floor(daysDiff / 30)}mois`, color: "text-orange-600" };
    return { label: `>${Math.floor(daysDiff / 30)}mois`, color: "text-red-600" };
  };

  const freshness = getDataFreshness(profile.vlamaxDate);

  return (
    <div className="p-3 bg-background rounded-lg border space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">{profile.name}</span>
          <Badge variant="outline" className="text-[10px]">{normalizeRaceTypeForDisplay(profile.objectif)}</Badge>
        </div>
        {/* Data freshness indicator */}
        {profile.vlamaxDate && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className={cn("text-[10px] font-medium", freshness.color)}>
              Données: {freshness.label}
            </span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* VLamax with source */}
        <div className="bg-muted/50 rounded p-2">
          <div className="flex items-center justify-between gap-1">
            <div className="text-[10px] text-muted-foreground uppercase">VLamax</div>
            {profile.vlamax !== null && (
              <Badge variant="outline" className={cn("text-[8px] px-1 py-0", getSourceColor(profile.vlamaxSource))}>
                {profile.vlamaxSource === "test" ? "Terrain" : profile.vlamaxSource === "snapshot" ? "Labo" : "?"}
              </Badge>
            )}
          </div>
          <div className="font-mono font-bold text-sm">
            {profile.vlamax !== null ? profile.vlamax.toFixed(2) : "—"}
          </div>
          {profile.vlamax !== null && (
            <div className="text-[10px] text-muted-foreground">
              {Math.round(profile.vlamaxConfidence * 100)}% conf.
            </div>
          )}
        </div>
        
        {/* TTE */}
        <div className="bg-muted/50 rounded p-2">
          <div className="text-[10px] text-muted-foreground uppercase">TTE</div>
          <div className="font-mono font-bold text-sm">
            {profile.tte !== null ? `${profile.tte}'` : "—"}
          </div>
          {profile.tte !== null && (
            <div className="text-[10px] text-muted-foreground">
              {Math.round(profile.tteConfidence * 100)}% conf.
            </div>
          )}
        </div>
        
        {/* Fatigue */}
        <div className="bg-muted/50 rounded p-2">
          <div className="text-[10px] text-muted-foreground uppercase">Fatigue</div>
          <div className={cn("font-mono font-bold text-sm", getFatigueColor(profile.fatigueIndex))}>
            {profile.fatigueIndex}%
          </div>
          <div className="text-[10px] text-muted-foreground capitalize">
            {profile.fatigueState}
          </div>
        </div>
        
        {/* Injury Risk */}
        <div className="bg-muted/50 rounded p-2">
          <div className="text-[10px] text-muted-foreground uppercase">Risque CAP</div>
          <Badge variant="outline" className={cn("text-[10px] font-medium", getRiskColor(profile.injuryRiskLevel))}>
            {profile.injuryRiskLabel}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// =============================================
// PERSONALIZED RECOMMENDATION PANEL
// =============================================

interface PersonalizedRecommendation {
  type: "info" | "warning" | "success";
  title: string;
  message: string;
}

function getPersonalizedRecommendations(
  profile: AthleteProfileData | null,
  phase: TriathlonPhase,
  goal: TriathlonGoal
): PersonalizedRecommendation[] {
  if (!profile) return [];
  
  const recommendations: PersonalizedRecommendation[] = [];
  
  // VLamax analysis
  if (profile.vlamax !== null) {
    const vlamaxThreshold = goal === "IM" ? 0.38 : 0.42;
    if (profile.vlamax > vlamaxThreshold + 0.1) {
      recommendations.push({
        type: "warning",
        title: "VLamax élevée",
        message: `VLamax de ${profile.vlamax.toFixed(2)} supérieure au seuil ${goal === "IM" ? "Ironman" : "70.3"} (${vlamaxThreshold}). Privilégier les séances Z2 longues vélo pour développer le profil aérobie.`
      });
    } else if (profile.vlamax <= vlamaxThreshold) {
      recommendations.push({
        type: "success",
        title: "Profil aérobie optimal",
        message: `VLamax bien adaptée pour ${goal === "IM" ? "l'Ironman" : "le 70.3"}. Maintenir le volume Z2 actuel.`
      });
    }
  }
  
  // TTE analysis
  if (profile.tte !== null) {
    const tteThreshold = goal === "IM" ? 55 : 50;
    if (profile.tte < tteThreshold - 5) {
      recommendations.push({
        type: "warning",
        title: "TTE insuffisant",
        message: `TTE de ${profile.tte}min inférieur à la cible ${goal === "IM" ? "Ironman" : "70.3"} (${tteThreshold}min). Intégrer des blocs tempo prolongés au seuil.`
      });
    } else if (profile.tte >= tteThreshold) {
      recommendations.push({
        type: "success",
        title: "Endurance seuil excellente",
        message: `TTE de ${profile.tte}min bien adapté pour la distance. Peut supporter les séances de haute qualité.`
      });
    }
  }
  
  // Fatigue analysis
  if (profile.fatigueIndex >= 70) {
    recommendations.push({
      type: "warning",
      title: "Fatigue élevée détectée",
      message: "Réduire le volume de 20-30% cette semaine. Privilégier récupération active et sommeil."
    });
  } else if (profile.fatigueIndex >= 55) {
    recommendations.push({
      type: "info",
      title: "Fatigue modérée",
      message: "Maintenir le volume mais réduire l'intensité des séances clés si nécessaire."
    });
  }
  
  // Injury risk analysis
  if (profile.injuryRiskLevel >= 2) {
    recommendations.push({
      type: "warning",
      title: "Risque blessure CAP",
      message: "Limiter les CAP longues. Transférer le volume sur le vélo pour préserver l'intégrité musculo-tendineuse."
    });
  }
  
  // Phase-specific recommendations
  if (phase === "TAPER" && profile.fatigueIndex < 40) {
    recommendations.push({
      type: "info",
      title: "Phase Affûtage",
      message: "Niveau de fatigue bas → peut maintenir quelques intensités courtes pour rester affûté."
    });
  }
  
  if (phase === "VO2MAX" && profile.injuryRiskLevel >= 2) {
    recommendations.push({
      type: "warning",
      title: "Phase VO2 risquée",
      message: "Risque blessure élevé incompatible avec les séances VO2 CAP. Réaliser les séances intensives à vélo."
    });
  }
  
  return recommendations;
}

function RecommendationPanel({ recommendations }: { recommendations: PersonalizedRecommendation[] }) {
  if (recommendations.length === 0) return null;
  
  return (
    <div className="space-y-2 pt-2 border-t border-dashed">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Activity className="h-3 w-3" />
        Recommandations personnalisées
      </div>
      <div className="space-y-1.5">
        {recommendations.map((rec, idx) => (
          <div 
            key={idx}
            className={cn(
              "p-2 rounded text-xs",
              rec.type === "warning" && "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800",
              rec.type === "success" && "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800",
              rec.type === "info" && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
            )}
          >
            <div className="flex items-start gap-2">
              {rec.type === "warning" && <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />}
              {rec.type === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />}
              {rec.type === "info" && <Lightbulb className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />}
              <div>
                <div className="font-medium">{rec.title}</div>
                <div className="text-muted-foreground">{rec.message}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================
// GOAL DATE SUGGESTER (with athlete profile)
// =============================================

function GoalDateSuggester() {
  const [raceDate, setRaceDate] = useState<Date | undefined>();
  const [selectedGoal, setSelectedGoal] = useState<TriathlonGoal>("703");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const { currentAthlete } = useAthletes();
  const { snapshots, tests } = useCloudDataContext();
  
  const templates = useMemo(() => getTriathlonTemplates(), []);
  const template = templates.find(t => t.target === selectedGoal);
  
  // Get active snapshot for current athlete
  const activeSnapshot = useMemo(() => {
    if (!currentAthlete) return null;
    const snapshotId = currentAthlete.active_snapshot_id;
    if (!snapshotId) return snapshots.find(s => s.athlete_id === currentAthlete.id) || null;
    return snapshots.find(s => s.id === snapshotId) || null;
  }, [currentAthlete, snapshots]);
  
  // Get athlete tests for VLamax
  const athleteTests = useMemo(() => {
    if (!currentAthlete) return [];
    return tests.filter(t => t.athlete_id === currentAthlete.id);
  }, [currentAthlete, tests]);
  
  // Compute athlete physiological profile
  const athleteProfile = useMemo((): AthleteProfileData | null => {
    if (!currentAthlete) return null;
    
    // Get VLamax: prioritize snapshot, then tests
    let vlamax: number | null = activeSnapshot?.vlamax ?? activeSnapshot?.vlamax_run ?? null;
    let vlamaxConfidence = 0;
    let vlamaxSource: "test" | "snapshot" | "unknown" = "unknown";
    let vlamaxDate: string | null = null;
    
    // If no VLamax in snapshot, check tests
    if (vlamax === null && athleteTests.length > 0) {
      // Find most recent test with VLamax
      const testsWithVlamax = athleteTests
        .filter(t => t.vlamax !== null && t.vlamax !== undefined)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (testsWithVlamax.length > 0) {
        vlamax = testsWithVlamax[0].vlamax;
        vlamaxConfidence = 0.75; // Test terrain
        vlamaxSource = "test";
        vlamaxDate = testsWithVlamax[0].date;
      }
    } else if (vlamax !== null) {
      vlamaxConfidence = 0.95; // Snapshot = mesure directe
      vlamaxSource = "snapshot";
      vlamaxDate = activeSnapshot?.date ?? null;
    }
    
    // Get TTE directly from snapshot
    const tte = activeSnapshot?.tte_observed_min ?? null;
    const tteConfidence = tte !== null ? 0.75 : 0;
    
    // Map fatigue state
    const fatigueState = (activeSnapshot as any)?.fatigue_state || "ok";
    let fatigueIndex = 40;
    if (fatigueState === "high" || fatigueState === "élevé") fatigueIndex = 70;
    else if (fatigueState === "low" || fatigueState === "faible") fatigueIndex = 20;
    else if (fatigueState === "ok" || fatigueState === "moderate") fatigueIndex = 45;
    
    // Compute CAP injury risk
    const injuryRisk = computeCAPInjuryRiskIndex({
      vlamaxValue: vlamax,
      tteValue: tte,
      objectif: currentAthlete.objectif || selectedGoal
    });
    
    return {
      name: currentAthlete.nom,
      vlamax,
      vlamaxConfidence,
      vlamaxSource,
      vlamaxDate,
      tte,
      tteConfidence,
      fatigueState,
      fatigueIndex,
      injuryRiskLevel: injuryRisk.level,
      injuryRiskLabel: injuryRisk.label,
      objectif: currentAthlete.objectif || selectedGoal
    };
  }, [currentAthlete, activeSnapshot, athleteTests, selectedGoal]);
  
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
  
  // Get personalized recommendations
  const recommendations = useMemo(() => {
    if (!suggestion) return [];
    return getPersonalizedRecommendations(athleteProfile, suggestion.phase, selectedGoal);
  }, [athleteProfile, suggestion, selectedGoal]);

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Suggestion par date d'objectif
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Athlete Profile Badge */}
        <AthleteProfileBadge profile={athleteProfile} />
        
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
            
            {/* Personalized recommendations */}
            <RecommendationPanel recommendations={recommendations} />
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
  const staticTemplates = useMemo(() => getTriathlonTemplates(), []);
  const { templates: customTemplates, addTemplate, deleteTemplate } = useCustomTemplates();
  
  // Merge static + custom into unified TriathlonTemplate[]
  const customAsTriathlon: TriathlonTemplate[] = useMemo(() => 
    customTemplates.map(ct => ({
      id: ct.id,
      name: ct.name,
      target: ct.target as TriathlonGoal,
      weeks: ct.weeks,
      description: ct.description || "Plan importé via CSV",
    })),
    [customTemplates]
  );

  const customIds = useMemo(() => new Set(customTemplates.map(c => c.id)), [customTemplates]);

  // Persist which template dialog is open
  const [openTemplateId, setOpenTemplateId] = useState<string | null>(() => {
    return localStorage.getItem("vlab-open-triathlon-template") || null;
  });

  const handleOpenChange = useCallback((templateId: string, open: boolean) => {
    if (open) {
      setOpenTemplateId(templateId);
      localStorage.setItem("vlab-open-triathlon-template", templateId);
    } else {
      setOpenTemplateId(null);
      localStorage.removeItem("vlab-open-triathlon-template");
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (confirm("Supprimer ce template ?")) {
      await deleteTemplate(id);
    }
  }, [deleteTemplate]);

  const allTemplates = [...staticTemplates, ...customAsTriathlon];
  const im703Templates = allTemplates.filter(t => t.target === "703");
  const imFullTemplates = allTemplates.filter(t => t.target === "IM");
  const marathonTemplates = allTemplates.filter(t => t.target === "Marathon");
  const semiTemplates = allTemplates.filter(t => t.target === "Semi");

  const renderSection = (title: string, icon: React.ReactNode, templates: TriathlonTemplate[]) => {
    if (templates.length === 0) return null;
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          {icon}
          {title}
          <Badge variant="outline" className="text-[10px]">{templates.length} plan(s)</Badge>
        </h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map(template => (
            <TemplateCard 
              key={template.id} 
              template={template} 
              isOpen={openTemplateId === template.id} 
              onOpenChange={(open) => handleOpenChange(template.id, open)}
              isCustom={customIds.has(template.id)}
              onDelete={customIds.has(template.id) ? () => handleDelete(template.id) : undefined}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <GoalDateSuggester />

      <div className="flex justify-end">
        <CSVTemplateImporter onImport={addTemplate} />
      </div>
      
      {renderSection("Ironman 70.3", <Zap className="h-4 w-4 text-blue-500" />, im703Templates)}
      {renderSection("Ironman (140.6)", <Flame className="h-4 w-4 text-red-500" />, imFullTemplates)}
      {renderSection("Marathon", <PersonStanding className="h-4 w-4 text-amber-500" />, marathonTemplates)}
      {renderSection("Semi-Marathon", <Activity className="h-4 w-4 text-teal-500" />, semiTemplates)}
    </div>
  );
}

export default TriathlonTemplateGrid;
