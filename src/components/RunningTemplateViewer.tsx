// =============================================
// RUNNING TEMPLATE VIEWER - Interactive Plan Viewer
// Two For Coaching Lab
// =============================================

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChevronRight, Calendar, Flame, Heart, Timer, TrendingUp, Zap, 
  Target, AlertTriangle, Dumbbell, Clock, MapPin, X, ArrowLeftRight,
  Eye, Layers, CheckCircle2, BarChart3, Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RUNNING_TEMPLATES } from "@/lib/templates/runningTemplatesStore";
import type { 
  RunningTemplate, 
  RunningWeek, 
  RunningSession, 
  RunningPhase, 
  WeekFocus,
  TrainingMethodology,
} from "@/types/runningTemplate";

// =============================================
// HELPER COMPONENTS
// =============================================

function PhaseBadge({ phase, size = "sm" }: { phase: RunningPhase; size?: "sm" | "md" }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    BASE: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", icon: <Dumbbell className="h-3 w-3" /> },
    BUILD: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", icon: <TrendingUp className="h-3 w-3" /> },
    SPECIFIC: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", icon: <Target className="h-3 w-3" /> },
    TAPER: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", icon: <CheckCircle2 className="h-3 w-3" /> },
  };
  const c = config[phase] || config.BASE;
  const sizeClass = size === "md" ? "text-xs px-2 py-1" : "text-[10px] px-1.5 py-0.5";
  return (
    <Badge variant="outline" className={`${c.bg} ${c.text} ${sizeClass} flex items-center gap-1`}>
      {c.icon}
      {phase}
    </Badge>
  );
}

function FocusBadge({ focus, size = "sm" }: { focus: WeekFocus; size?: "sm" | "md" }) {
  const config: Record<string, { icon: React.ReactNode; color: string }> = {
    TTE: { icon: <Timer className="h-3 w-3" />, color: "text-orange-600 dark:text-orange-400" },
    VO2: { icon: <Flame className="h-3 w-3" />, color: "text-red-600 dark:text-red-400" },
    ECONOMY: { icon: <TrendingUp className="h-3 w-3" />, color: "text-blue-600 dark:text-blue-400" },
    ENDURANCE: { icon: <Heart className="h-3 w-3" />, color: "text-green-600 dark:text-green-400" },
    SPEED: { icon: <Zap className="h-3 w-3" />, color: "text-purple-600 dark:text-purple-400" },
  };
  const c = config[focus] || config.ENDURANCE;
  const sizeClass = size === "md" ? "text-xs px-2 py-1" : "text-[10px] px-1.5 py-0.5";
  return (
    <Badge variant="outline" className={`${sizeClass} flex items-center gap-1`}>
      <span className={c.color}>{c.icon}</span>
      {focus}
    </Badge>
  );
}

// =============================================
// METHODOLOGY JUSTIFICATIONS
// =============================================

interface MethodologyJustification {
  label: string;
  description: string;
  keyPrinciples: string[];
  templateJustification: string;
  references: string[];
  bg: string;
  text: string;
}

const METHODOLOGY_CONFIG: Record<TrainingMethodology, MethodologyJustification> = {
  TFCL: { 
    bg: "bg-gradient-to-r from-emerald-500 to-teal-500", 
    text: "text-white", 
    label: "TFCL",
    description: "Two For Coaching Lab™ - Approche métabolique VLamax-centrée",
    keyPrinciples: [
      "Modulation VLamax selon l'objectif (↓ pour endurance, ↑ pour explosivité)",
      "Séances TTE (Time To Exhaustion) pour développer l'endurance au seuil",
      "Zones d'intensité basées sur le modèle physiologique (VO2, VLamax, seuils)",
      "Périodisation non-linéaire avec blocs métaboliques ciblés"
    ],
    templateJustification: "Ce template intègre des séances spécifiques TTE, du travail à allure marathon/semi contrôlé, et une structure de phases guidée par les indicateurs métaboliques (VLamax, économie de course).",
    references: ["Mader 2003", "San-Millán 2018", "Methodology TFCL 2024"]
  },
  CLASSIQUE: { 
    bg: "bg-gradient-to-r from-slate-500 to-gray-600", 
    text: "text-white", 
    label: "Classique",
    description: "Friel / Périodisation linéaire traditionnelle",
    keyPrinciples: [
      "Périodisation linéaire: Base → Build → Peak → Taper",
      "Volume élevé en phase de base, réduction progressive",
      "Augmentation graduelle de l'intensité spécifique",
      "Semaines de récupération structurées (3:1 ou 4:1)"
    ],
    templateJustification: "Ce template suit la progression linéaire classique avec une phase de base volumineuse, un développement progressif de l'intensité spécifique, et un affûtage traditionnel.",
    references: ["Joe Friel - Training Bible", "Tudor Bompa - Periodization"]
  },
  INVERSE: { 
    bg: "bg-gradient-to-r from-violet-500 to-purple-600", 
    text: "text-white", 
    label: "Inversé",
    description: "Canova / Périodisation inversée - Spécificité précoce",
    keyPrinciples: [
      "Travail à allure spécifique dès les premières semaines",
      "Longues sorties avec finales à allure cible précoces",
      "Réduction du volume d'intensité près de la course",
      "Moins de travail de base, plus de spécificité continue"
    ],
    templateJustification: "Ce template introduit l'allure spécifique dès le début du cycle avec des séances AS42/AS21 précoces et des finales progressives en long run.",
    references: ["Renato Canova - Marathon Training", "Brad Hudson - Run Faster"]
  },
  POLARISEE: { 
    bg: "bg-gradient-to-r from-sky-500 to-blue-600", 
    text: "text-white", 
    label: "Polarisée",
    description: "Modèle 80/20 - Low Intensity + High Intensity",
    keyPrinciples: [
      "80% du volume en Zone 1-2 (très facile)",
      "20% en Zone 4-5 (haute intensité)",
      "Évitement de la Zone 3 (tempo)",
      "Récupération maximisée entre les séances clés"
    ],
    templateJustification: "Ce template applique le modèle polarisé avec un volume majoritaire en endurance fondamentale, des séances VMA/VO2 ciblées, et peu de travail au seuil.",
    references: ["Stephen Seiler", "Norwegian Model", "Stöggl & Sperlich 2014"]
  },
  LORANG: { 
    bg: "bg-gradient-to-r from-amber-500 to-orange-600", 
    text: "text-white", 
    label: "Lorang",
    description: "Olav Alexander Bu / Norwegian Double-Threshold Model",
    keyPrinciples: [
      "Doubles séances seuil (matin + soir) plusieurs fois/semaine",
      "Intensité modérée mais volume d'intensité élevé",
      "Récupération courte entre les blocs seuil",
      "Développement du seuil par accumulation de temps"
    ],
    templateJustification: "Ce template inclut des doubles journées seuil, un volume important de travail à intensité modérée-haute, et une structure permettant l'accumulation de minutes au seuil.",
    references: ["Olav Alexander Bu", "Marius Bakken", "Ingebrigtsen Training"]
  },
};

// Methodology Badge Component with Tooltip Justification
function MethodologyBadge({ 
  methodology, 
  size = "sm",
  showTooltip = true,
}: { 
  methodology?: TrainingMethodology; 
  size?: "sm" | "md";
  showTooltip?: boolean;
}) {
  if (!methodology) return null;
  
  const config = METHODOLOGY_CONFIG[methodology];
  const sizeClass = size === "md" ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5";
  
  const badge = (
    <Badge 
      className={`${config.bg} ${config.text} ${sizeClass} border-0 font-semibold cursor-help`}
    >
      {config.label}
    </Badge>
  );
  
  if (!showTooltip) return badge;
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        {badge}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={`${config.bg} ${config.text} text-sm px-3 py-1 border-0`}>
              {config.label}
            </Badge>
            <span className="text-base">{config.description}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {/* Principes clés */}
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2 text-primary">
              <Target className="h-4 w-4" />
              Principes clés de cette méthodologie
            </h4>
            <ul className="space-y-1.5 pl-6">
              {config.keyPrinciples.map((principle, i) => (
                <li key={i} className="text-muted-foreground list-disc">
                  {principle}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Justification du tag */}
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Pourquoi ce template est tagué "{config.label}"
            </h4>
            <p className="text-muted-foreground bg-muted/50 p-3 rounded-lg border border-dashed">
              {config.templateJustification}
            </p>
          </div>
          
          {/* Références */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center">
              <span className="font-medium">Références:</span>
              {config.references.map((ref, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">
                  {ref}
                </Badge>
              ))}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LoadBar({ level, label }: { level: number; label: string }) {
  const percentage = (level / 5) * 100;
  const color = level <= 2 ? "bg-green-500" : level <= 3 ? "bg-yellow-500" : level <= 4 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-14">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-[10px] font-mono w-4">{level}</span>
    </div>
  );
}

function SessionTypeIcon({ type }: { type: string }) {
  const config: Record<string, { icon: React.ReactNode; color: string }> = {
    Z2: { icon: <Heart className="h-3 w-3" />, color: "text-green-500" },
    TEMPO: { icon: <Timer className="h-3 w-3" />, color: "text-yellow-600" },
    THRESHOLD: { icon: <Zap className="h-3 w-3" />, color: "text-orange-500" },
    VO2: { icon: <Flame className="h-3 w-3" />, color: "text-red-500" },
    LONGRUN: { icon: <MapPin className="h-3 w-3" />, color: "text-blue-500" },
    RECOVERY: { icon: <Heart className="h-3 w-3" />, color: "text-teal-500" },
    SPRINT: { icon: <Zap className="h-3 w-3" />, color: "text-purple-500" },
    HILLS: { icon: <TrendingUp className="h-3 w-3" />, color: "text-amber-600" },
    REST: { icon: <Clock className="h-3 w-3" />, color: "text-gray-400" },
  };
  const c = config[type] || { icon: <Clock className="h-3 w-3" />, color: "text-gray-500" };
  return <span className={c.color}>{c.icon}</span>;
}

function formatDuration(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
  }
  return `${min}'`;
}

// =============================================
// SESSION CARD - Detailed View
// =============================================

function SessionCard({ session, expanded = false }: { session: RunningSession; expanded?: boolean }) {
  const [isOpen, setIsOpen] = useState(expanded);
  
  return (
    <div className={cn(
      "rounded-lg border text-sm transition-all",
      session.isKey ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border/50"
    )}>
      {/* Header - always visible */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-start justify-between gap-2 text-left hover:bg-muted/50 transition-colors rounded-lg"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono bg-background shrink-0">
              {session.day}
            </Badge>
            <SessionTypeIcon type={session.type} />
            <span className="font-medium text-sm">{session.title}</span>
            {session.isKey && (
              <Badge className="bg-primary/20 text-primary text-[9px] px-1.5 py-0.5">CLÉ</Badge>
            )}
          </div>
          {!isOpen && session.details && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{session.details}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-[10px] font-mono">
            {formatDuration(session.duration_min)}
          </Badge>
          <ChevronRight className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen && "rotate-90"
          )} />
        </div>
      </button>
      
      {/* Expanded content */}
      {isOpen && (
        <div className="px-3 pb-3 space-y-2 border-t border-dashed">
          {/* Details - Main workout description */}
          {session.details && (
            <div className="pt-2">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Contenu de la séance
              </div>
              <p className="text-sm bg-background p-2 rounded border font-mono whitespace-pre-wrap">
                {session.details}
              </p>
            </div>
          )}
          
          {/* Intensity hint */}
          {session.intensity_hint && (
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-amber-500" />
              <span className="text-xs text-muted-foreground">Intensité:</span>
              <Badge variant="outline" className="text-[10px]">{session.intensity_hint}</Badge>
            </div>
          )}
          
          {/* Coach notes */}
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
// WEEK DETAIL DIALOG
// =============================================

interface WeekDetailDialogProps {
  week: RunningWeek;
  templateName: string;
  trigger: React.ReactNode;
}

export function WeekDetailDialog({ week, templateName, trigger }: WeekDetailDialogProps) {
  const totalDuration = week.sessions.reduce((sum, s) => sum + s.duration_min, 0);
  const keySessions = week.sessions.filter(s => s.isKey);
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Semaine {week.week_number} - {week.title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{templateName}</p>
          </DialogHeader>
          
          {/* Meta Info */}
          <div className="flex flex-wrap gap-2 mt-4">
            <PhaseBadge phase={week.meta.phase} size="md" />
            <FocusBadge focus={week.meta.focus} size="md" />
            <Badge variant={week.meta.injury_risk_tag === "HIGH" ? "destructive" : "outline"} className="text-xs">
              Risque: {week.meta.injury_risk_tag}
            </Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center p-3 rounded-lg bg-card border">
              <div className="text-lg font-bold font-mono text-primary">{formatDuration(totalDuration)}</div>
              <div className="text-[10px] text-muted-foreground">Volume total</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-card border">
              <div className="text-lg font-bold font-mono">{week.sessions.length}</div>
              <div className="text-[10px] text-muted-foreground">Séances</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-card border">
              <div className="text-lg font-bold font-mono text-amber-600">{keySessions.length}</div>
              <div className="text-[10px] text-muted-foreground">Séances clés</div>
            </div>
          </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <div className="space-y-4 pb-4">
            {/* Summary */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm">{week.summary}</p>
              {week.coachAdvice && (
                <p className="text-xs text-muted-foreground mt-2 italic">💡 {week.coachAdvice}</p>
              )}
            </div>

            {/* Load Indicators */}
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border">
              <LoadBar level={week.meta.load_level} label="Charge" />
              <LoadBar level={week.meta.intensity_density} label="Intensité" />
              <LoadBar level={week.meta.longrun_level} label="Long run" />
            </div>

            {/* Sessions */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                <Layers className="h-4 w-4" />
                Séances de la semaine ({week.sessions.length})
              </h4>
              <div className="space-y-2">
                {week.sessions.map((session, idx) => (
                  <SessionCard key={idx} session={session} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// TEMPLATE DETAIL DIALOG
// =============================================

interface TemplateDetailDialogProps {
  template: RunningTemplate;
  trigger: React.ReactNode;
  onSelectWeekForComparison?: (week: RunningWeek, templateName: string) => void;
  comparisonWeeks?: string[];
}

export function TemplateDetailDialog({ 
  template, 
  trigger, 
  onSelectWeekForComparison,
  comparisonWeeks = []
}: TemplateDetailDialogProps) {
  const [selectedSection, setSelectedSection] = useState(template.sections[0]?.id || "");
  
  const currentSection = template.sections.find(s => s.id === selectedSection) || template.sections[0];
  const allWeeks = template.sections.flatMap(s => s.weeks);
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Target className="h-5 w-5 text-primary" />
              {template.name}
              <Badge className={cn(
                "ml-2",
                template.goal === "marathon" 
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white border-0" 
                  : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0"
              )}>
                {template.goal === "marathon" ? "42K" : "21K"}
              </Badge>
              <MethodologyBadge methodology={template.methodology} size="md" />
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{template.description}</p>
          </DialogHeader>
          
          {template.sections.length > 1 && (
            <Tabs value={selectedSection} onValueChange={setSelectedSection} className="mt-4">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${template.sections.length}, 1fr)` }}>
                {template.sections.map(section => (
                  <TabsTrigger key={section.id} value={section.id} className="text-xs">
                    {section.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          
          {/* Stats Bar */}
          <div className="flex gap-3 flex-wrap mt-4">
            <Badge variant="outline">{currentSection?.weeks.length || allWeeks.length} semaines</Badge>
            {currentSection?.ambition && (
              <Badge variant="outline" className={cn(
                currentSection.ambition === "ELITE" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30" :
                currentSection.ambition === "SUB" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30" :
                currentSection.ambition === "PERF" ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                "bg-gray-100 text-gray-700"
              )}>
                {currentSection.ambition}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {/* Weeks Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
            {(currentSection?.weeks || allWeeks).map(week => (
              <WeekCard 
                key={week.week_id} 
                week={week} 
                templateName={template.name}
                onSelectForComparison={onSelectWeekForComparison}
                isSelectedForComparison={comparisonWeeks.includes(week.week_id)}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================
// WEEK CARD (for template detail)
// =============================================

interface WeekCardProps {
  week: RunningWeek;
  templateName: string;
  onSelectForComparison?: (week: RunningWeek, templateName: string) => void;
  isSelectedForComparison?: boolean;
}

function WeekCard({ week, templateName, onSelectForComparison, isSelectedForComparison }: WeekCardProps) {
  const totalDuration = week.sessions.reduce((sum, s) => sum + s.duration_min, 0);
  const keySessions = week.sessions.filter(s => s.isKey);

  return (
    <Card className={cn(
      "border transition-all",
      isSelectedForComparison && "ring-2 ring-primary border-primary"
    )}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium text-sm flex items-center gap-2">
              S{week.week_number}
              <span className="text-muted-foreground font-normal text-xs truncate max-w-[120px]">
                {week.title}
              </span>
            </div>
          </div>
          {onSelectForComparison && (
            <Checkbox 
              checked={isSelectedForComparison}
              onCheckedChange={() => onSelectForComparison(week, templateName)}
              className="shrink-0"
            />
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          <PhaseBadge phase={week.meta.phase} />
          <FocusBadge focus={week.meta.focus} />
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{formatDuration(totalDuration)} • {week.sessions.length} séances</span>
          <span className="text-amber-600">{keySessions.length} clés</span>
        </div>

        <div className="flex gap-1">
          <WeekDetailDialog 
            week={week} 
            templateName={templateName}
            trigger={
              <Button variant="outline" size="sm" className="flex-1 text-xs h-7">
                <Eye className="h-3 w-3 mr-1" />
                Voir
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================
// WEEK COMPARISON VIEW - Enhanced
// =============================================

interface WeekComparisonProps {
  weeks: Array<{ week: RunningWeek; templateName: string }>;
  onRemove: (weekId: string) => void;
  onClear: () => void;
}

export function WeekComparisonView({ weeks, onRemove, onClear }: WeekComparisonProps) {
  const [viewMode, setViewMode] = useState<"overview" | "sessions" | "metrics">("overview");
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  
  if (weeks.length === 0) return null;

  // Calculate aggregate metrics for comparison
  const getWeekStats = (week: RunningWeek) => {
    const totalDuration = week.sessions.reduce((sum, s) => sum + s.duration_min, 0);
    const keySessions = week.sessions.filter(s => s.isKey).length;
    const sessionTypes = week.sessions.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return { totalDuration, keySessions, sessionTypes, sessionCount: week.sessions.length };
  };

  const allStats = weeks.map(w => ({ ...w, stats: getWeekStats(w.week) }));
  const maxDuration = Math.max(...allStats.map(w => w.stats.totalDuration));

  const toggleSession = (weekId: string, sessionIdx: number) => {
    const key = `${weekId}-${sessionIdx}`;
    setExpandedSessions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Comparaison de semaines
            <Badge variant="secondary" className="text-xs">{weeks.length}/4</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* View Mode Tabs */}
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("overview")}
                className={cn(
                  "px-3 py-1 text-xs transition-colors",
                  viewMode === "overview" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                Vue d'ensemble
              </button>
              <button
                onClick={() => setViewMode("sessions")}
                className={cn(
                  "px-3 py-1 text-xs transition-colors border-x",
                  viewMode === "sessions" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                Séances
              </button>
              <button
                onClick={() => setViewMode("metrics")}
                className={cn(
                  "px-3 py-1 text-xs transition-colors",
                  viewMode === "metrics" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                Métriques
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={onClear} className="text-xs h-7">
              <X className="h-3 w-3 mr-1" />
              Effacer
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overview Mode */}
        {viewMode === "overview" && (
          <div className="overflow-x-auto">
            <div className="flex gap-4 pb-2" style={{ minWidth: `${weeks.length * 300}px` }}>
              {allStats.map(({ week, templateName, stats }) => (
                <div 
                  key={week.week_id} 
                  className="w-[280px] shrink-0 p-4 rounded-lg border bg-card shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-sm">S{week.week_number} - {week.title}</div>
                      <div className="text-[10px] text-muted-foreground">{templateName}</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 hover:bg-destructive/20"
                      onClick={() => onRemove(week.week_id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    <PhaseBadge phase={week.meta.phase} size="md" />
                    <FocusBadge focus={week.meta.focus} size="md" />
                  </div>

                  {/* Volume bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Volume</span>
                      <span className="font-mono font-medium">{formatDuration(stats.totalDuration)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                        style={{ width: `${(stats.totalDuration / maxDuration) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <LoadBar level={week.meta.load_level} label="Charge" />
                    <LoadBar level={week.meta.intensity_density} label="Intensité" />
                    <LoadBar level={week.meta.longrun_level} label="Long run" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-lg font-bold">{stats.sessionCount}</div>
                      <div className="text-[10px] text-muted-foreground">Séances</div>
                    </div>
                    <div className="p-2 rounded bg-amber-100 dark:bg-amber-900/30">
                      <div className="text-lg font-bold text-amber-700 dark:text-amber-400">{stats.keySessions}</div>
                      <div className="text-[10px] text-muted-foreground">Clés</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sessions Mode - Side by side comparison */}
        {viewMode === "sessions" && (
          <div className="overflow-x-auto">
            <div className="flex gap-4 pb-2" style={{ minWidth: `${weeks.length * 320}px` }}>
              {weeks.map(({ week, templateName }) => (
                <div 
                  key={week.week_id} 
                  className="w-[300px] shrink-0 space-y-2"
                >
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg sticky top-0">
                    <div>
                      <div className="font-semibold text-sm">S{week.week_number}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{templateName}</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={() => onRemove(week.week_id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {week.sessions.map((session, idx) => {
                      const isExpanded = expandedSessions[`${week.week_id}-${idx}`];
                      return (
                        <div 
                          key={idx}
                          className={cn(
                            "rounded-lg border text-sm transition-all",
                            session.isKey ? "bg-primary/5 border-primary/30" : "bg-card"
                          )}
                        >
                          <button
                            onClick={() => toggleSession(week.week_id, idx)}
                            className="w-full p-2 flex items-center gap-2 text-left hover:bg-muted/50 transition-colors rounded-lg"
                          >
                            <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                              {session.day.slice(0, 3)}
                            </Badge>
                            <SessionTypeIcon type={session.type} />
                            <span className="flex-1 text-xs truncate">{session.title}</span>
                            {session.isKey && (
                              <Badge className="bg-primary/20 text-primary text-[8px] px-1">CLÉ</Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {formatDuration(session.duration_min)}
                            </span>
                            <ChevronRight className={cn(
                              "h-3 w-3 text-muted-foreground transition-transform",
                              isExpanded && "rotate-90"
                            )} />
                          </button>
                          
                          {isExpanded && (
                            <div className="px-2 pb-2 space-y-2 border-t border-dashed">
                              {session.details && (
                                <div className="pt-2">
                                  <p className="text-[11px] bg-muted/50 p-2 rounded font-mono">
                                    {session.details}
                                  </p>
                                </div>
                              )}
                              {session.notes && (
                                <div className="flex items-start gap-1.5 bg-amber-50 dark:bg-amber-900/20 p-1.5 rounded">
                                  <Lightbulb className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                                  <p className="text-[10px] text-amber-800 dark:text-amber-200">{session.notes}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metrics Mode - Table comparison */}
        {viewMode === "metrics" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium text-muted-foreground">Métrique</th>
                  {weeks.map(({ week, templateName }) => (
                    <th key={week.week_id} className="text-center p-2 min-w-[120px]">
                      <div className="font-semibold">S{week.week_number}</div>
                      <div className="text-[10px] text-muted-foreground font-normal truncate max-w-[100px] mx-auto">
                        {templateName.split(' ')[0]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">Phase</td>
                  {weeks.map(({ week }) => (
                    <td key={week.week_id} className="text-center p-2">
                      <PhaseBadge phase={week.meta.phase} size="md" />
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">Focus</td>
                  {weeks.map(({ week }) => (
                    <td key={week.week_id} className="text-center p-2">
                      <FocusBadge focus={week.meta.focus} size="md" />
                    </td>
                  ))}
                </tr>
                <tr className="border-b bg-muted/30">
                  <td className="p-2 text-muted-foreground font-medium">Volume total</td>
                  {allStats.map(({ week, stats }) => (
                    <td key={week.week_id} className="text-center p-2 font-mono font-bold">
                      {formatDuration(stats.totalDuration)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">Nb séances</td>
                  {allStats.map(({ week, stats }) => (
                    <td key={week.week_id} className="text-center p-2 font-mono">
                      {stats.sessionCount}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">Séances clés</td>
                  {allStats.map(({ week, stats }) => (
                    <td key={week.week_id} className="text-center p-2">
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {stats.keySessions}
                      </Badge>
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">Charge</td>
                  {weeks.map(({ week }) => (
                    <td key={week.week_id} className="text-center p-2">
                      <div className="flex items-center justify-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "w-2 h-2 rounded-full",
                              i < week.meta.load_level ? "bg-primary" : "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">Intensité</td>
                  {weeks.map(({ week }) => (
                    <td key={week.week_id} className="text-center p-2">
                      <div className="flex items-center justify-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "w-2 h-2 rounded-full",
                              i < week.meta.intensity_density ? "bg-orange-500" : "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 text-muted-foreground">Risque blessure</td>
                  {weeks.map(({ week }) => (
                    <td key={week.week_id} className="text-center p-2">
                      <Badge variant={week.meta.injury_risk_tag === "HIGH" ? "destructive" : "outline"} className="text-[10px]">
                        {week.meta.injury_risk_tag}
                      </Badge>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Quick add hint */}
        {weeks.length < 4 && (
          <p className="text-[10px] text-muted-foreground text-center mt-3 pt-3 border-t border-dashed">
            💡 Cliquez sur les checkboxes dans les plans pour ajouter des semaines à comparer (max 4)
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================
// MAIN TEMPLATE GRID
// =============================================

interface RunningTemplateGridProps {
  goal?: "marathon" | "semi";
}

export function RunningTemplateGrid({ goal }: RunningTemplateGridProps) {
  const [comparisonWeeks, setComparisonWeeks] = useState<Array<{ week: RunningWeek; templateName: string }>>([]);

  const templates = useMemo(() => {
    if (goal) return RUNNING_TEMPLATES.filter(t => t.goal === goal);
    return RUNNING_TEMPLATES;
  }, [goal]);

  const marathonTemplates = templates.filter(t => t.goal === "marathon");
  const semiTemplates = templates.filter(t => t.goal === "semi");

  const handleSelectWeekForComparison = (week: RunningWeek, templateName: string) => {
    setComparisonWeeks(prev => {
      const exists = prev.find(w => w.week.week_id === week.week_id);
      if (exists) {
        return prev.filter(w => w.week.week_id !== week.week_id);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), { week, templateName }];
      }
      return [...prev, { week, templateName }];
    });
  };

  const handleRemoveFromComparison = (weekId: string) => {
    setComparisonWeeks(prev => prev.filter(w => w.week.week_id !== weekId));
  };

  const comparisonWeekIds = comparisonWeeks.map(w => w.week.week_id);

  return (
    <div className="space-y-6">
      {/* Comparison Panel */}
      <WeekComparisonView 
        weeks={comparisonWeeks}
        onRemove={handleRemoveFromComparison}
        onClear={() => setComparisonWeeks([])}
      />

      {/* Marathon Templates */}
      {(!goal || goal === "marathon") && marathonTemplates.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-orange-500" />
            Marathon (42K)
            <Badge variant="outline" className="text-[10px]">{marathonTemplates.length} plans</Badge>
          </h4>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {marathonTemplates.map(template => (
              <TemplateCard 
                key={template.id} 
                template={template}
                onSelectWeekForComparison={handleSelectWeekForComparison}
                comparisonWeeks={comparisonWeekIds}
              />
            ))}
          </div>
        </div>
      )}

      {/* Semi Templates */}
      {(!goal || goal === "semi") && semiTemplates.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            Semi-Marathon (21K)
            <Badge variant="outline" className="text-[10px]">{semiTemplates.length} plans</Badge>
          </h4>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {semiTemplates.map(template => (
              <TemplateCard 
                key={template.id} 
                template={template}
                onSelectWeekForComparison={handleSelectWeekForComparison}
                comparisonWeeks={comparisonWeekIds}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// TEMPLATE CARD
// =============================================

interface TemplateCardProps {
  template: RunningTemplate;
  onSelectWeekForComparison?: (week: RunningWeek, templateName: string) => void;
  comparisonWeeks?: string[];
}

function TemplateCard({ template, onSelectWeekForComparison, comparisonWeeks = [] }: TemplateCardProps) {
  const allWeeks = template.sections.flatMap(s => s.weeks);
  const totalSessions = allWeeks.reduce((sum, w) => sum + w.sessions.length, 0);

  return (
    <Card className="border hover:border-primary/50 transition-colors group">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="truncate">{template.name}</span>
          <Badge className={cn(
            "border-0 text-[10px]",
            template.goal === "marathon" 
              ? "bg-gradient-to-r from-orange-500 to-red-500 text-white" 
              : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
          )}>
            {template.goal === "marathon" ? "42K" : "21K"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <p className="text-[11px] text-muted-foreground line-clamp-2">{template.description}</p>
        
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{template.weeks_count} sem.</Badge>
          <Badge variant="outline" className="text-[10px]">{totalSessions} séances</Badge>
          {template.sections[0]?.ambition && (
            <Badge 
              variant="outline" 
              className={cn("text-[10px]",
                template.sections[0].ambition === "ELITE" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30" :
                template.sections[0].ambition === "SUB" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30" :
                template.sections[0].ambition === "PERF" ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                "bg-gray-100 text-gray-700"
              )}
            >
              {template.sections[0].ambition}
            </Badge>
          )}
          <MethodologyBadge methodology={template.methodology} />
        </div>

        <TemplateDetailDialog 
          template={template}
          onSelectWeekForComparison={onSelectWeekForComparison}
          comparisonWeeks={comparisonWeeks}
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

export default RunningTemplateGrid;
