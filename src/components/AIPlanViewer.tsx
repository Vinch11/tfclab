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
  RefreshCw, Printer, Target, ArrowRight, Sparkles, AlertTriangle,
} from "lucide-react";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { ParsedPlan, ParsedWeek, ParsedSession, StrategicRecap } from "@/lib/aiPlanParser";
import { getTrailSessionAlternatives } from "@/lib/trailSessionAlternatives";
import { mapSessionsToDates } from "@/lib/aiPlanParser";
import { exportAIPlanToPDF } from "@/lib/aiPlanPDFExport";
import { AIPlanVolumeChart } from "@/components/AIPlanVolumeChart";
import type { RaceGoal } from "@/hooks/useAITrainingPlan";

function getSportIcon(sport: string) {
  const s = sport.toLowerCase();
  if (s.includes("natation") || s.includes("swim")) return <Waves className="h-4 w-4" />;
  if (s.includes("vélo") || s.includes("velo") || s.includes("bike")) return <Bike className="h-4 w-4" />;
  if (s.includes("cap") || s.includes("course") || s.includes("run")) return <Footprints className="h-4 w-4" />;
  if (s.includes("repos") || s.includes("rest")) return <Moon className="h-4 w-4" />;
  if (s.includes("muscu") || s.includes("force") || s.includes("renfo")) return <Dumbbell className="h-4 w-4" />;
  if (s.includes("brick") || s.includes("brique")) return <Zap className="h-4 w-4" />;
  return <Dumbbell className="h-4 w-4" />;
}

function getSportColor(sport: string): string {
  const s = sport.toLowerCase();
  if (s.includes("natation") || s.includes("swim")) return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
  if (s.includes("vélo") || s.includes("velo") || s.includes("bike")) return "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30";
  if (s.includes("cap") || s.includes("course") || s.includes("run")) return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
  if (s.includes("repos") || s.includes("rest")) return "bg-muted text-muted-foreground border-border";
  if (s.includes("brick") || s.includes("brique")) return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
  if (s.includes("muscu") || s.includes("force") || s.includes("renfo")) return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
  return "bg-muted text-muted-foreground border-border";
}

function getPhaseColor(phase: string): string {
  const p = phase.toLowerCase();
  if (p.includes("base") || p.includes("prépa") || p.includes("fondation")) return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
  if (p.includes("build") || p.includes("développement") || p.includes("chantier")) return "bg-green-500/15 text-green-700 dark:text-green-300";
  if (p.includes("spécifique") || p.includes("specific") || p.includes("race")) return "bg-purple-500/15 text-purple-700 dark:text-purple-300";
  if (p.includes("affûtage") || p.includes("taper")) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  if (p.includes("consolidation")) return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300";
  return "bg-muted text-muted-foreground";
}

function getStatusColor(status: string): string {
  if (status.includes("🔴") || status.toLowerCase().includes("critique")) return "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30";
  if (status.includes("🟡") || status.toLowerCase().includes("sous-optimal")) return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  if (status.includes("🟢") || status.toLowerCase().includes("optimal")) return "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30";
  return "bg-muted text-muted-foreground border-border";
}

/** Parse week range string like "S1-S4" or "1-4" into [start, end] */
function parseWeekRange(weeks: string): [number, number] | null {
  const m = weeks.match(/(\d+)\s*[-–—àa]\s*(\d+)/);
  if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
  const single = weeks.match(/(\d+)/);
  if (single) { const n = parseInt(single[1], 10); return [n, n]; }
  return null;
}

const GANTT_COLORS = [
  "bg-blue-500/80 text-white",
  "bg-green-500/80 text-white",
  "bg-purple-500/80 text-white",
  "bg-amber-500/80 text-white",
  "bg-cyan-500/80 text-white",
  "bg-rose-500/80 text-white",
  "bg-indigo-500/80 text-white",
];

/** Mini Gantt chart for metabolic blocks */
function MiniGantt({ phases, totalWeeks }: { phases: { name: string; weeks: string }[]; totalWeeks: number }) {
  const maxWeek = useMemo(() => {
    let max = totalWeeks;
    phases.forEach(p => {
      const r = parseWeekRange(p.weeks);
      if (r && r[1] > max) max = r[1];
    });
    return max || 12;
  }, [phases, totalWeeks]);

  // Generate week tick labels
  const ticks = Array.from({ length: maxWeek }, (_, i) => i + 1);

  return (
    <div className="space-y-1.5">
      {/* Week header */}
      <div className="flex items-end gap-0 ml-[120px]">
        {ticks.map(w => (
          <div key={w} className="text-[9px] text-muted-foreground text-center" style={{ width: `${100 / maxWeek}%` }}>
            {w % 2 === 1 || maxWeek <= 16 ? `S${w}` : ""}
          </div>
        ))}
      </div>

      {/* Bars */}
      {phases.map((phase, idx) => {
        const range = parseWeekRange(phase.weeks);
        if (!range) return null;
        const [start, end] = range;
        const leftPct = ((start - 1) / maxWeek) * 100;
        const widthPct = ((end - start + 1) / maxWeek) * 100;
        const color = GANTT_COLORS[idx % GANTT_COLORS.length];
        // Shorten name for display
        const shortName = phase.name
          .replace(/^(Phase|Bloc)\s*\d+\s*[:\-–—]\s*/i, "")
          .slice(0, 20);

        return (
          <div key={idx} className="flex items-center gap-0 h-6">
            {/* Label */}
            <div className="w-[120px] flex-shrink-0 text-[10px] font-medium truncate text-right pr-2 text-muted-foreground" title={phase.name}>
              {shortName}
            </div>
            {/* Track */}
            <div className="flex-1 relative h-full bg-muted/30 rounded-sm overflow-hidden">
              <div
                className={`absolute top-0.5 bottom-0.5 rounded-sm flex items-center justify-center text-[9px] font-semibold ${color}`}
                style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 3)}%` }}
              >
                {end - start + 1 >= 2 && `S${start}-S${end}`}
              </div>
            </div>
          </div>
        );
      })}

      {/* Today marker area - bottom scale */}
      <div className="flex items-start gap-0 ml-[120px]">
        <div className="flex-1 relative h-2 border-t border-border/50">
          {ticks.map(w => (
            <div
              key={w}
              className="absolute top-0 w-px h-1.5 bg-border/40"
              style={{ left: `${((w - 0.5) / maxWeek) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Build a complete list of all blocks from phases + limiter blocks for the Gantt */
function buildAllGanttPhases(phases: { name: string; weeks: string }[], recap?: StrategicRecap): { name: string; weeks: string }[] {
  const seen = new Set<string>();
  const result: { name: string; weeks: string }[] = [];

  // Add top-level phases first
  for (const p of phases) {
    const key = `${p.name}::${p.weeks}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }

  // Add limiter blocks that aren't already represented
  if (recap) {
    for (const limiter of recap.limiters) {
      const key = `${limiter.block}::${limiter.weeks}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ name: limiter.block, weeks: limiter.weeks });
      }
    }
  }

  // Sort by start week
  result.sort((a, b) => {
    const ra = parseWeekRange(a.weeks);
    const rb = parseWeekRange(b.weeks);
    if (!ra) return 1;
    if (!rb) return -1;
    return ra[0] - rb[0];
  });

  return result;
}

/** Strategic Recap visual component */
function StrategicRecapView({ recap, phases, totalWeeks }: { recap: StrategicRecap; phases: { name: string; weeks: string }[]; totalWeeks: number }) {
  const allGanttPhases = useMemo(() => buildAllGanttPhases(phases, recap), [phases, recap]);
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Récapitulatif Stratégique
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mini Gantt */}
        {phases.length > 0 && (
          <div className="p-3 rounded-lg bg-background/80 border border-border/50">
            <p className="text-xs font-semibold mb-2 flex items-center gap-1 text-foreground/80">
              <Calendar className="h-3 w-3 text-primary" /> Périodisation — Timeline
            </p>
            <MiniGantt phases={allGanttPhases} totalWeeks={totalWeeks} />
          </div>
        )}

        {/* Limiter → Block → Key Sessions flow */}
        <div className="space-y-2">
          {recap.limiters.map((limiter, idx) => (
            <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-background/80 border border-border/50">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                {limiter.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold">{limiter.name}</span>
                  <Badge className={`text-[10px] ${getStatusColor(limiter.status)}`}>
                    {limiter.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">{limiter.block}</span>
                  <ArrowRight className="h-3 w-3 text-primary/60 flex-shrink-0" />
                  <Badge variant="outline" className="text-[10px] py-0">{limiter.weeks}</Badge>
                  <ArrowRight className="h-3 w-3 text-primary/60 flex-shrink-0" />
                  <span className="text-[11px]">🔑 {limiter.keySessions}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Synergies */}
        {recap.synergies.length > 0 && (
          <div className="p-2.5 rounded-lg bg-green-500/5 border border-green-500/20">
            <p className="text-xs font-semibold text-green-700 dark:text-green-300 flex items-center gap-1 mb-1.5">
              <Sparkles className="h-3 w-3" /> Synergies Exploitées
            </p>
            <div className="space-y-1">
              {recap.synergies.map((s, i) => (
                <p key={i} className="text-[11px] text-muted-foreground">→ {s}</p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
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

  const trailAlts = getTrailSessionAlternatives({
    sport: session.sport,
    title: session.title,
    details: session.details,
  });

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
      {expanded && trailAlts.length > 0 && (
        <div className="mt-2 border-t border-current/10 pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Alternatives terrain
          </p>
          <div className="space-y-1">
            {trailAlts.map((alt) => (
              <div key={alt.kind} className="flex items-start gap-1.5 text-[11px] leading-snug">
                <span className="shrink-0" aria-hidden>{alt.icon}</span>
                <span>
                  <span className="font-medium">{alt.label}</span>
                  <span className="text-muted-foreground"> — {alt.hint}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Compute a quality score (0-100) for a week based on session distribution and key sessions */
function computeWeekQuality(week: ParsedWeek): { score: number; label: string; icon: string; details: string[] } {
  const active = week.sessions.filter(s => !s.isRest);
  const details: string[] = [];
  let score = 100;

  // 1. Penalize if sessions are grouped Thu-Sun (dayIndex 3-6)
  if (active.length >= 3) {
    const lateCount = active.filter(s => s.dayIndex >= 3).length;
    const ratio = lateCount / active.length;
    if (ratio > 0.75) {
      const penalty = Math.round((ratio - 0.5) * 60);
      score -= penalty;
      details.push(`Regroupement fin de semaine (${lateCount}/${active.length})`);
    }
  }

  // 2. Check for key sessions (🔑)
  const hasKeySessions = active.some(s => s.title.includes("🔑") || s.details?.includes("🔑"));
  if (!hasKeySessions && active.length > 0) {
    score -= 15;
    details.push("Aucune séance clé 🔑 identifiée");
  }

  // 3. Check rest days
  const restDays = week.sessions.filter(s => s.isRest).length;
  if (restDays === 0 && active.length >= 6) {
    score -= 20;
    details.push("Pas de jour de repos");
  }

  // 4. Sport variety (for multi-sport plans)
  const sports = new Set(active.map(s => s.sport.toLowerCase()));
  if (active.length >= 4 && sports.size < 2) {
    score -= 10;
    details.push("Faible diversité sportive");
  }

  score = Math.max(0, Math.min(100, score));
  if (score >= 75) return { score, label: "✅", icon: "good", details };
  if (score >= 50) return { score, label: "⚠️", icon: "warn", details };
  return { score, label: "❌", icon: "bad", details };
}

function WeekQualityBadge({ week }: { week: ParsedWeek }) {
  const quality = useMemo(() => computeWeekQuality(week), [week]);
  const colorClass = quality.icon === "good"
    ? "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30"
    : quality.icon === "warn"
    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
    : "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30";

  return (
    <Badge
      className={`text-[10px] gap-1 cursor-help ${colorClass}`}
      title={quality.details.length > 0 ? quality.details.join(" • ") : "Qualité OK"}
    >
      {quality.label} {quality.score}/100
    </Badge>
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
            <WeekQualityBadge week={week} />
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
  raceGoals?: RaceGoal[];
  onSaveToPlan?: () => void;
  isSaving?: boolean;
  isSaved?: boolean;
  onRegenerateWeek?: (weekNumber: number) => void;
  onRegenerateFutureWeeks?: () => void;
  isRegenerating?: boolean;
  athleteName?: string;
  currentWeekNumber?: number;
  adaptationProjections?: import("@/hooks/useAITrainingPlan").AdaptationProjection[];
}

export function AIPlanViewer({ plan, startDate, raceGoals, onSaveToPlan, isSaving, isSaved, onRegenerateWeek, onRegenerateFutureWeeks, isRegenerating, athleteName, currentWeekNumber, adaptationProjections }: AIPlanViewerProps) {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [viewMode, setViewMode] = useState<"week" | "all">("week");

  const currentWeek = plan.weeks[selectedWeek];
  const sortedRaceGoals = useMemo(
    () => [...(raceGoals || [])].sort((a, b) => (a.raceDate || "").localeCompare(b.raceDate || "")),
    [raceGoals]
  );

  // Corrige une distance hallucinée dans le titre IA en utilisant la distance réelle de l'objectif trail
  const correctedTitle = useMemo(() => {
    const t = plan.title || "";
    const primary = (raceGoals || []).find((g) => g.priority === "A" && typeof g.distanceKm === "number" && (g.distanceKm as number) > 0)
      || (raceGoals || []).find((g) => typeof g.distanceKm === "number" && (g.distanceKm as number) > 0);
    const km = primary?.distanceKm;
    if (!km) return t;
    const kmRegex = /\(\s*\d{1,3}\s*km\s*\)/i;
    if (kmRegex.test(t)) return t.replace(kmRegex, `(${km}km)`);
    return t.replace(/—\s*([^—]+?)(\s+—|$)/, (_m, name, tail) => `— ${name.trim()} (${km}km)${tail}`);
  }, [plan.title, raceGoals]);

  const handleExportPDF = () => {
    exportAIPlanToPDF({ ...plan, title: correctedTitle }, athleteName, startDate, adaptationProjections);
  };

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-base">{plan.title}</h3>
              <p className="text-xs text-muted-foreground">{plan.totalWeeks} semaines • {plan.phases.length} blocs</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Printer className="h-4 w-4 mr-1" /> PDF
              </Button>
              {onRegenerateFutureWeeks && currentWeekNumber && currentWeekNumber < plan.totalWeeks && (
                <Button variant="outline" size="sm" onClick={onRegenerateFutureWeeks} disabled={isRegenerating}>
                  {isRegenerating ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Régénération...</>
                  ) : (
                    <><RefreshCw className="h-4 w-4 mr-1" /> Régénérer S{currentWeekNumber + 1}+</>
                  )}
                </Button>
              )}
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

          {sortedRaceGoals.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1">
                <Target className="h-3 w-3 text-primary" /> Jalons objectifs
              </p>
              <div className="space-y-1.5">
                {sortedRaceGoals.map((goal, index) => (
                  <div key={`${goal.priority}-${goal.raceDate}-${index}`} className="flex items-center justify-between gap-2 text-xs flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">
                        Objectif {goal.priority}
                      </Badge>
                      <span className="font-medium text-foreground">
                        {goal.objective}{goal.raceName ? ` — ${goal.raceName}` : ""}
                      </span>
                    </div>
                    {goal.raceDate && (
                      <span className="text-muted-foreground">
                        {format(parseISO(goal.raceDate), "EEE d MMM yyyy", { locale: fr })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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

      {/* Strategic Recap */}
      {plan.strategicRecap && (
        <StrategicRecapView recap={plan.strategicRecap} phases={plan.phases} totalWeeks={plan.totalWeeks} />
      )}

      {/* Volume Evolution Chart */}
      <AIPlanVolumeChart plan={plan} />

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
