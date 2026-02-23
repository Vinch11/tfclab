/**
 * AIPlanViewer — Interactive structured view of a parsed AI training plan
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar, ChevronLeft, ChevronRight, Dumbbell, Waves, Bike,
  Footprints, Moon, FileText, Zap, Save, Loader2, CheckCircle2,
  RefreshCw, Printer,
} from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";
import { mapSessionsToDates } from "@/lib/aiPlanParser";
import { exportAIPlanToPDF } from "@/lib/aiPlanPDFExport";

function getSportIcon(sport: string) {
  const s = sport.toLowerCase();
  if (s.includes("natation") || s.includes("swim")) return <Waves className="h-4 w-4" />;
  if (s.includes("vélo") || s.includes("velo") || s.includes("bike")) return <Bike className="h-4 w-4" />;
  if (s.includes("cap") || s.includes("course") || s.includes("run")) return <Footprints className="h-4 w-4" />;
  if (s.includes("repos") || s.includes("rest")) return <Moon className="h-4 w-4" />;
  if (s.includes("muscu") || s.includes("force") || s.includes("renfo")) return <Dumbbell className="h-4 w-4" />;
  return <Dumbbell className="h-4 w-4" />;
}

function getSportColor(sport: string): string {
  const s = sport.toLowerCase();
  if (s.includes("natation") || s.includes("swim")) return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
  if (s.includes("vélo") || s.includes("velo") || s.includes("bike")) return "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30";
  if (s.includes("cap") || s.includes("course") || s.includes("run")) return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
  if (s.includes("repos") || s.includes("rest")) return "bg-muted text-muted-foreground border-border";
  if (s.includes("brick")) return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function getPhaseColor(phase: string): string {
  const p = phase.toLowerCase();
  if (p.includes("base") || p.includes("prépa")) return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
  if (p.includes("build") || p.includes("développement")) return "bg-green-500/15 text-green-700 dark:text-green-300";
  if (p.includes("spécifique") || p.includes("specific")) return "bg-purple-500/15 text-purple-700 dark:text-purple-300";
  if (p.includes("affûtage") || p.includes("taper")) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

interface SessionCardProps {
  session: ParsedSession;
  date?: Date;
}

function SessionCard({ session, date }: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (session.isRest) {
    return (
      <div className="p-3 rounded-lg border border-dashed border-border bg-muted/30 flex items-center gap-2">
        <Moon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{session.dayName}</span>
        {date && <span className="text-xs text-muted-foreground ml-auto">{format(date, "d MMM", { locale: fr })}</span>}
        <Badge variant="outline" className="text-[10px] ml-1">Repos</Badge>
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${getSportColor(session.sport)}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2">
        {getSportIcon(session.sport)}
        <span className="text-sm font-medium">{session.dayName}</span>
        {date && <span className="text-xs text-muted-foreground">{format(date, "d MMM", { locale: fr })}</span>}
        <Badge variant="outline" className="text-[10px] ml-auto">{session.sport}</Badge>
      </div>
      <p className="text-sm font-semibold mt-1">{session.title}</p>
      {expanded && session.details && (
        <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed border-t border-current/10 pt-2">
          {session.details}
        </p>
      )}
    </div>
  );
}

interface WeekViewProps {
  week: ParsedWeek;
  startDate?: Date;
}

function WeekView({ week, startDate }: WeekViewProps) {
  const weekDates = useMemo(() => {
    if (!startDate) return null;
    const start = startOfWeek(startDate, { weekStartsOn: 1 });
    const base = addDays(start, (week.weekNumber - 1) * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(base, i));
  }, [startDate, week.weekNumber]);

  const activeSessions = week.sessions.filter(s => !s.isRest).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Semaine {week.weekNumber} — {week.theme}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={`text-[10px] ${getPhaseColor(week.phase)}`}>{week.phase}</Badge>
            <Badge variant="secondary" className="text-[10px]">{activeSessions} séances</Badge>
          </div>
        </div>
        {week.volumeTarget && (
          <p className="text-xs text-muted-foreground">Volume cible : {week.volumeTarget}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {week.sessions.map((session, idx) => {
          const date = weekDates && session.dayIndex >= 0 ? weekDates[session.dayIndex] : undefined;
          return <SessionCard key={idx} session={session} date={date} />;
        })}
        {week.coachNotes && (
          <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs font-semibold text-primary flex items-center gap-1 mb-1">
              <Zap className="h-3 w-3" /> Consignes Coach
            </p>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{week.coachNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface AIPlanViewerProps {
  plan: ParsedPlan;
  startDate?: Date;
  onSaveToPlan?: () => void;
  isSaving?: boolean;
  isSaved?: boolean;
  onRegenerateWeek?: (weekNumber: number) => void;
  isRegenerating?: boolean;
  athleteName?: string;
}

export function AIPlanViewer({ plan, startDate, onSaveToPlan, isSaving, isSaved, onRegenerateWeek, isRegenerating, athleteName }: AIPlanViewerProps) {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [viewMode, setViewMode] = useState<"week" | "all">("week");

  const currentWeek = plan.weeks[selectedWeek];

  const handleExportPDF = () => {
    exportAIPlanToPDF(plan, athleteName);
  };

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-base">{plan.title}</h3>
              <p className="text-xs text-muted-foreground">{plan.totalWeeks} semaines • {plan.phases.length} phases</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Printer className="h-4 w-4 mr-1" /> PDF
              </Button>
              {onSaveToPlan && (
                <Button size="sm" onClick={onSaveToPlan} disabled={isSaving || isSaved}>
                  {isSaved ? (
                    <><CheckCircle2 className="h-4 w-4 mr-1" /> Sauvegardé</>
                  ) : isSaving ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Sauvegarde...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-1" /> Sauvegarder au planning</>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Phase overview */}
          <div className="flex flex-wrap gap-2">
            {plan.phases.map((phase, i) => (
              <Badge key={i} className={`text-[10px] ${getPhaseColor(phase.name)}`}>
                {phase.name} {phase.weeks && `(S${phase.weeks})`}
              </Badge>
            ))}
          </div>

          {plan.diagnostic && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Diagnostic TFCL™
              </p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{plan.diagnostic}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Controls */}
      <div className="flex items-center gap-2">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "week" | "all")} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="week">Par semaine</TabsTrigger>
            <TabsTrigger value="all">Vue globale</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === "week" && currentWeek ? (
        <>
          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost" size="sm"
              disabled={selectedWeek === 0}
              onClick={() => setSelectedWeek(s => s - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Précédente
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {selectedWeek + 1} / {plan.weeks.length}
              </span>
              {onRegenerateWeek && (
                <Button
                  variant="outline" size="sm"
                  onClick={() => onRegenerateWeek(currentWeek.weekNumber)}
                  disabled={isRegenerating}
                  className="text-xs"
                >
                  {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                  Régénérer
                </Button>
              )}
            </div>
            <Button
              variant="ghost" size="sm"
              disabled={selectedWeek >= plan.weeks.length - 1}
              onClick={() => setSelectedWeek(s => s + 1)}
            >
              Suivante <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <WeekView week={currentWeek} startDate={startDate} />
        </>
      ) : (
        <div className="space-y-4">
          {plan.weeks.map((week, i) => (
            <WeekView key={i} week={week} startDate={startDate} />
          ))}
        </div>
      )}
    </div>
  );
}
