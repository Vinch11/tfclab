// =============================================
// GOAL WEEK SUGGESTER - Date-Based Week Selection
// Two For Coaching Lab
// =============================================

import { useState, useMemo } from "react";
import { format, differenceInWeeks, addWeeks } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Target, Lightbulb, CheckCircle2, AlertTriangle, ArrowRight, Zap, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { RUNNING_TEMPLATES, getWeeksByGoal } from "@/lib/templates/runningTemplatesStore";
import { computePhaseFromDate, suggestTopWeeks } from "@/lib/templates/weekSelectorTFCL";
import { WeekDetailDialog } from "@/components/RunningTemplateViewer";
import type { 
  RunningTemplate, 
  RunningWeek, 
  RunningGoal, 
  RunningPhase,
  AthleteTruthRunning,
  AmbitionLevel,
} from "@/types/runningTemplate";

// =============================================
// TYPES
// =============================================

interface SuggestedWeek {
  week: RunningWeek;
  templateName: string;
  reason: string;
  score: number;
  badge: "TOP" | "GOOD" | "CAUTION" | "PLANNED";
}

interface GoalWeekSuggesterProps {
  defaultGoal?: RunningGoal;
  athleteTruth?: AthleteTruthRunning;
  onWeekSelect?: (week: RunningWeek, templateName: string) => void;
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function getWeekNumberFromDate(raceDate: Date, templateWeeksCount: number, planStartDate?: Date): number {
  const today = planStartDate || new Date();
  const weeksToRace = differenceInWeeks(raceDate, today);
  
  if (weeksToRace < 0) return templateWeeksCount; // Past race = last week
  if (weeksToRace >= templateWeeksCount) return 1; // Far away = first week
  
  // Calculate current week (template goes from week 1 to race week)
  return templateWeeksCount - weeksToRace;
}

function getPhaseLabel(phase: RunningPhase): string {
  const labels: Record<RunningPhase, string> = {
    BASE: "Construction",
    BUILD: "Développement",
    SPECIFIC: "Spécifique",
    TAPER: "Affûtage",
  };
  return labels[phase] || phase;
}

function getPhaseColor(phase: RunningPhase): string {
  const colors: Record<RunningPhase, string> = {
    BASE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    BUILD: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    SPECIFIC: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    TAPER: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  };
  return colors[phase] || "bg-muted text-muted-foreground";
}

// Default athlete truth for scoring when no athlete data is available.
// Politique projet (insufficient-data-no-fake-defaults) : on N'INVENTE PAS
// de valeurs physio plausibles. On expose 0/confidence=0 pour que le scoring
// downstream applique la logique "Données insuffisantes" au lieu d'un choix biaisé.
function getDefaultAthleteTruth(): AthleteTruthRunning {
  return {
    vlamax_run: { value: 0, confidence: 0, source: "default" },
    tte_run: { value: 0, confidence: 0, source: "default" },
    fatigueIndex: 40,
    fatigueLevel: "MODERE",
    runInjuryRisk: { score: 30, level: "FAIBLE" },
    economy_run: { score: 60, label: "Moyenne" },
    age: null,
    sex: null,
    objectif: "marathon",
  };
}


// =============================================
// WEEK SUGGESTION CARD
// =============================================

interface WeekSuggestionCardProps {
  suggestion: SuggestedWeek;
  isPlanned?: boolean;
  onSelect?: () => void;
}

function WeekSuggestionCard({ suggestion, isPlanned = false, onSelect }: WeekSuggestionCardProps) {
  const { week, templateName, reason, score, badge } = suggestion;
  const totalDuration = week.sessions.reduce((sum, s) => sum + s.duration_min, 0);
  const keySessions = week.sessions.filter(s => s.isKey).length;

  const badgeConfig = {
    TOP: { bg: "bg-primary", text: "text-primary-foreground", label: "Recommandée" },
    GOOD: { bg: "bg-secondary", text: "text-secondary-foreground", label: "Compatible" },
    CAUTION: { bg: "bg-destructive/80", text: "text-destructive-foreground", label: "Avec réserves" },
    PLANNED: { bg: "bg-accent", text: "text-accent-foreground", label: "Planifiée" },
  };

  const config = badgeConfig[badge];

  const formatDuration = (min: number): string => {
    if (min >= 60) {
      const h = Math.floor(min / 60);
      const m = min % 60;
      return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
    }
    return `${min}'`;
  };

  return (
    <Card className={cn(
      "border-2 transition-all hover:shadow-md",
      isPlanned ? "border-purple-300 bg-purple-50/50 dark:bg-purple-900/10" : "border-border"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isPlanned && <Target className="h-4 w-4 text-purple-600 shrink-0" />}
              {!isPlanned && <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />}
              <span className="font-semibold text-sm">Semaine {week.week_number}</span>
              <Badge className={cn(config.bg, config.text, "text-[10px] border-0")}>
                {config.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{templateName}</p>
          </div>
          {score > 0 && (
            <Badge variant="outline" className="font-mono text-xs shrink-0">
              {score}%
            </Badge>
          )}
        </div>

        {/* Week Title */}
        <p className="text-sm font-medium">{week.title}</p>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <Badge className={cn(getPhaseColor(week.meta.phase), "text-[10px]")}>
            {getPhaseLabel(week.meta.phase)}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            Focus: {week.meta.focus}
          </Badge>
          <Badge variant={week.meta.injury_risk_tag === "HIGH" ? "destructive" : "outline"} className="text-[10px]">
            Risque: {week.meta.injury_risk_tag}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-sm font-bold font-mono">{formatDuration(totalDuration)}</div>
            <div className="text-[10px] text-muted-foreground">Volume</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-sm font-bold font-mono">{week.sessions.length}</div>
            <div className="text-[10px] text-muted-foreground">Séances</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-sm font-bold font-mono text-amber-600">{keySessions}</div>
            <div className="text-[10px] text-muted-foreground">Clés</div>
          </div>
        </div>

        {/* Reason */}
        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border border-dashed">
          💡 {reason}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <WeekDetailDialog
            week={week}
            templateName={templateName}
            trigger={
              <Button variant="outline" size="sm" className="flex-1 text-xs">
                Voir le détail
              </Button>
            }
          />
          {onSelect && (
            <Button size="sm" className="flex-1 text-xs" onClick={onSelect}>
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Sélectionner
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function GoalWeekSuggester({ defaultGoal = "marathon", athleteTruth, onWeekSelect }: GoalWeekSuggesterProps) {
  const [goalDate, setGoalDate] = useState<Date | undefined>(undefined);
  const [selectedGoal, setSelectedGoal] = useState<RunningGoal>(defaultGoal);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [ambition, setAmbition] = useState<AmbitionLevel>("PERF");

  // Filter templates by goal
  const availableTemplates = useMemo(() => {
    return RUNNING_TEMPLATES.filter(t => t.goal === selectedGoal);
  }, [selectedGoal]);

  // Auto-select first template if none selected
  useMemo(() => {
    if (!selectedTemplateId && availableTemplates.length > 0) {
      setSelectedTemplateId(availableTemplates[0].id);
    }
  }, [availableTemplates, selectedTemplateId]);

  const selectedTemplate = useMemo(() => {
    return availableTemplates.find(t => t.id === selectedTemplateId);
  }, [availableTemplates, selectedTemplateId]);

  // Calculate planned week based on date
  const plannedWeekData = useMemo((): SuggestedWeek | null => {
    if (!goalDate || !selectedTemplate) return null;

    const weekNumber = getWeekNumberFromDate(goalDate, selectedTemplate.weeks_count);
    const allWeeks = selectedTemplate.sections.flatMap(s => s.weeks);
    const week = allWeeks.find(w => w.week_number === weekNumber);

    if (!week) return null;

    const weeksToRace = differenceInWeeks(goalDate, new Date());
    const phase = computePhaseFromDate(goalDate.toISOString(), selectedTemplate.weeks_count);

    return {
      week,
      templateName: selectedTemplate.name,
      reason: `Semaine ${weekNumber}/${selectedTemplate.weeks_count} - ${weeksToRace} semaines avant l'objectif. Phase ${getPhaseLabel(phase)}.`,
      score: 0,
      badge: "PLANNED",
    };
  }, [goalDate, selectedTemplate]);

  // Calculate alternative suggestions using the scoring engine
  const alternativeSuggestion = useMemo((): SuggestedWeek | null => {
    if (!goalDate || !selectedTemplate) return null;

    const truth = athleteTruth || getDefaultAthleteTruth();
    const phase = computePhaseFromDate(goalDate.toISOString(), selectedTemplate.weeks_count);

    // Get all weeks from ALL templates for the same goal
    const allWeeks = getWeeksByGoal(selectedGoal);

    const result = suggestTopWeeks(allWeeks, truth, {
      raceType: selectedGoal,
      ambition,
      phase_manual: phase,
      race_date: goalDate.toISOString(),
    });

    if (result.suggestions.length === 0) return null;

    const topSuggestion = result.suggestions[0];
    
    // Find the template name for this suggestion
    const sourceTemplate = RUNNING_TEMPLATES.find(t => t.id === topSuggestion.template_id);
    const templateName = sourceTemplate?.name || "Template inconnu";

    // Check if the suggested week is the same as the planned week
    if (plannedWeekData && topSuggestion.week_id === plannedWeekData.week.week_id) {
      // If the best suggestion is the planned week, get the second best
      if (result.suggestions.length > 1) {
        const secondSuggestion = result.suggestions[1];
        const secondTemplate = RUNNING_TEMPLATES.find(t => t.id === secondSuggestion.template_id);
        
        return {
          week: {
            ...secondSuggestion.meta,
            template_id: secondSuggestion.template_id,
            section_id: secondSuggestion.section_id,
            week_id: secondSuggestion.week_id,
            week_number: secondSuggestion.week_number,
            title: secondSuggestion.week_title,
            summary: secondSuggestion.week_summary,
            sessions: secondSuggestion.sessions,
            meta: secondSuggestion.meta,
            coachAdvice: secondSuggestion.coachAdvice,
          } as RunningWeek,
          templateName: secondTemplate?.name || "Template inconnu",
          reason: secondSuggestion.why,
          score: secondSuggestion.match_score,
          badge: secondSuggestion.badge,
        };
      }
      return null; // No alternative needed
    }

    return {
      week: {
        template_id: topSuggestion.template_id,
        section_id: topSuggestion.section_id,
        week_id: topSuggestion.week_id,
        week_number: topSuggestion.week_number,
        title: topSuggestion.week_title,
        summary: topSuggestion.week_summary,
        sessions: topSuggestion.sessions,
        meta: topSuggestion.meta,
        coachAdvice: topSuggestion.coachAdvice,
      } as RunningWeek,
      templateName,
      reason: topSuggestion.why,
      score: topSuggestion.match_score,
      badge: topSuggestion.badge,
    };
  }, [goalDate, selectedTemplate, selectedGoal, ambition, athleteTruth, plannedWeekData]);

  const weeksToRace = goalDate ? differenceInWeeks(goalDate, new Date()) : null;
  const calculatedPhase = goalDate && selectedTemplate
    ? computePhaseFromDate(goalDate.toISOString(), selectedTemplate.weeks_count)
    : null;

  return (
    <Card className="border-2 border-dashed border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Suggestion par Date d'Objectif
          <Badge variant="outline" className="text-[10px] ml-auto">TFCL™</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuration Row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Goal Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Type d'objectif</label>
            <Select value={selectedGoal} onValueChange={(v) => {
              setSelectedGoal(v as RunningGoal);
              setSelectedTemplateId("");
            }}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="marathon">Marathon</SelectItem>
                <SelectItem value="semi">Semi-Marathon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Plan de référence</label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Choisir un plan" />
              </SelectTrigger>
              <SelectContent>
                {availableTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.weeks_count} sem.)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ambition */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Ambition</label>
            <Select value={ambition} onValueChange={(v) => setAmbition(v as AmbitionLevel)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FINISH">Finisher</SelectItem>
                <SelectItem value="PERF">Performance</SelectItem>
                <SelectItem value="SUB">Sub (chrono)</SelectItem>
                <SelectItem value="ELITE">Elite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date de la course</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-9 justify-start text-left font-normal",
                    !goalDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {goalDate ? format(goalDate, "d MMM yyyy", { locale: fr }) : "Choisir..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={goalDate}
                  onSelect={setGoalDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Athlete Profile Summary */}
        {athleteTruth && (
          <div className="p-3 bg-muted/30 rounded-lg border border-dashed space-y-1.5">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">Profil athlète</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-background rounded p-2">
                <div className="text-[10px] text-muted-foreground uppercase">VLamax</div>
                <div className="font-mono font-bold text-sm">
                  {athleteTruth.vlamax_run?.value != null ? athleteTruth.vlamax_run.value.toFixed(2) : "—"}
                </div>
                {athleteTruth.vlamax_run?.value != null && (
                  <div className="text-[10px] text-muted-foreground">
                    {Math.round((athleteTruth.vlamax_run.confidence || 0) * 100)}% conf.
                  </div>
                )}
              </div>
              <div className="bg-background rounded p-2">
                <div className="text-[10px] text-muted-foreground uppercase">TTE</div>
                <div className="font-mono font-bold text-sm">
                  {athleteTruth.tte_run?.value != null ? `${athleteTruth.tte_run.value}'` : "—"}
                </div>
                {athleteTruth.tte_run?.value != null && (
                  <div className="text-[10px] text-muted-foreground">
                    {Math.round((athleteTruth.tte_run.confidence || 0) * 100)}% conf.
                  </div>
                )}
              </div>
              <div className="bg-background rounded p-2">
                <div className="text-[10px] text-muted-foreground uppercase">Fatigue</div>
                <div className="font-mono font-bold text-sm">
                  {athleteTruth.fatigueIndex ?? "—"}
                </div>
                <div className="text-[10px] text-muted-foreground capitalize">
                  {athleteTruth.fatigueLevel || "—"}
                </div>
              </div>
              <div className="bg-background rounded p-2">
                <div className="text-[10px] text-muted-foreground uppercase">Risque CAP</div>
                <div className="text-xs font-medium">
                  {athleteTruth.runInjuryRisk?.level || "—"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Banner when date selected */}
        {goalDate && selectedTemplate && weeksToRace !== null && calculatedPhase && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Zap className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {weeksToRace <= 0 
                  ? "Course passée ou aujourd'hui"
                  : `${weeksToRace} semaine${weeksToRace > 1 ? "s" : ""} avant l'objectif`
                }
              </p>
              <p className="text-xs text-muted-foreground">
                Phase actuelle : <span className="font-medium">{getPhaseLabel(calculatedPhase)}</span> • 
                Plan : {selectedTemplate.name}
              </p>
            </div>
            <Badge className={cn(getPhaseColor(calculatedPhase), "text-xs")}>
              {calculatedPhase}
            </Badge>
          </div>
        )}

        {/* Suggestions Grid */}
        {goalDate && selectedTemplate && (plannedWeekData || alternativeSuggestion) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              Suggestions de semaine
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {/* Planned Week */}
              {plannedWeekData && (
                <WeekSuggestionCard
                  suggestion={plannedWeekData}
                  isPlanned
                  onSelect={onWeekSelect ? () => onWeekSelect(plannedWeekData.week, plannedWeekData.templateName) : undefined}
                />
              )}

              {/* Alternative Suggestion */}
              {alternativeSuggestion && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ArrowRight className="h-3 w-3" />
                    <span>Alternative suggérée</span>
                    {alternativeSuggestion.score > (plannedWeekData ? 50 : 0) && (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        Potentiellement meilleure
                      </Badge>
                    )}
                  </div>
                  <WeekSuggestionCard
                    suggestion={alternativeSuggestion}
                    onSelect={onWeekSelect ? () => onWeekSelect(alternativeSuggestion.week, alternativeSuggestion.templateName) : undefined}
                  />
                </div>
              )}

              {/* No alternative */}
              {!alternativeSuggestion && plannedWeekData && (
                <div className="flex items-center justify-center p-6 rounded-lg border border-dashed bg-muted/30">
                  <div className="text-center space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                    <p className="text-sm font-medium">Semaine planifiée optimale</p>
                    <p className="text-xs text-muted-foreground">
                      Pas de meilleure alternative identifiée pour ce profil
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!goalDate && (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sélectionnez une date de course pour obtenir une suggestion de semaine</p>
          </div>
        )}

        {/* Disclaimer */}
        {goalDate && selectedTemplate && (
          <p className="text-[10px] text-muted-foreground text-center pt-2 border-t border-dashed">
            ⚠️ Suggestions basées sur le moteur TFCL™. Le coach reste responsable du choix final.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default GoalWeekSuggester;
