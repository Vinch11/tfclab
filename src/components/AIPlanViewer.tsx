/**
 * AIPlanViewer — Interactive structured view of a parsed AI training plan
 */
import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar, ChevronLeft, ChevronRight, Dumbbell, Waves, Bike,
  Footprints, Moon, FileText, Zap, Save, Loader2, CheckCircle2,
  RefreshCw, Printer, Target, ArrowRight, Sparkles, AlertTriangle, List,
} from "lucide-react";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { ParsedPlan, ParsedWeek, ParsedSession, StrategicRecap } from "@/lib/aiPlanParser";
import { getTrailSessionAlternatives } from "@/lib/trailSessionAlternatives";
import { getFicheForSession } from "@/lib/aiPlanWorkoutEnricher";
import { formatFicheText } from "@/lib/ficheTextFormatter";
import { mapSessionsToDates } from "@/lib/aiPlanParser";
import { exportAIPlanToPDF } from "@/lib/aiPlanPDFExport";
import { AIPlanVolumeChart } from "@/components/AIPlanVolumeChart";
import type { RaceGoal } from "@/hooks/useAITrainingPlan";
import { supabase } from "@/integrations/supabase/client";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { getEffectiveRefs } from "@/lib/effectiveRefs";
import { NolioSessionButton, sessionKey, type NolioCtx } from "@/components/NolioSessionButton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { findLibraryWorkoutForSession } from "@/lib/aiPlanWorkoutEnricher";

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
  nolioCtx?: NolioCtx | null;
}

function SessionCard({ session, date, nolioCtx }: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const trailAlts = useMemo(
    () => getTrailSessionAlternatives({
      sport: session.sport,
      title: session.title,
      details: session.details,
    }),
    [session.sport, session.title, session.details]
  );

  const fiche = useMemo(
    () => session.isRest ? null : getFicheForSession({ title: session.title, details: session.details }),
    [session.isRest, session.title, session.details]
  );

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

  const selKey = nolioCtx ? sessionKey(nolioCtx.athleteId, session.weekNumber, session.dayIndex) : null;
  const isSent = !!(nolioCtx && selKey && nolioCtx.isSent(selKey));
  const isChecked = !!(nolioCtx && selKey && nolioCtx.isSelected(selKey));

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${getSportColor(session.sport)}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2">
        {nolioCtx && selKey && !session.isRest && session.dayIndex >= 0 && (
          <Checkbox
            checked={isChecked}
            disabled={isSent}
            onCheckedChange={() => nolioCtx.toggleSelected(selKey)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Sélectionner pour envoi groupé Nolio"
            className="shrink-0"
          />
        )}
        {getSportIcon(session.sport)}
        <span className="text-sm font-medium">{session.dayName}</span>
        {date && <span className="text-xs text-muted-foreground">{format(date, "d MMM", { locale: fr })}</span>}
        <Badge variant="outline" className="text-[10px] ml-auto">{session.sport}</Badge>
        {fiche && (
          <Badge variant="secondary" className="text-[9px] gap-1" title={`Fiche bibliothèque : ${fiche.id}`}>
            <FileText className="h-2.5 w-2.5" /> Fiche
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <p className="text-sm font-semibold flex-1">{session.title}</p>
        {nolioCtx && <NolioSessionButton session={session} ctx={nolioCtx} />}
      </div>
      {expanded && session.details && (
        <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed border-t border-current/10 pt-2">
          {session.details}
        </p>
      )}
      {expanded && fiche && (
        <div className="mt-2 border-t border-current/10 pt-2 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Fiche complète bibliothèque
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              <Badge variant="outline" className="text-[9px]">Cat {fiche.cat}</Badge>
              <Badge variant="outline" className="text-[9px]">{fiche.necessite}</Badge>
              <Badge variant="outline" className="text-[9px]">
                {fiche.durationMin[0]}-{fiche.durationMin[1]} min
              </Badge>
              <code className="text-[9px] px-1 py-0.5 rounded bg-muted/60 text-muted-foreground">
                {fiche.id}
              </code>
            </div>
          </div>

          <p className="text-[11px] italic text-foreground/80">🎯 {fiche.objectif}</p>

          <div className="space-y-2">
            {fiche.structure.map((s, i) => {
              const body = formatFicheText(s.text);
              const isBlock = /^<(ol|ul|p)\b/.test(body);
              return (
                <div key={i} className="text-[11px] leading-relaxed">
                  <div>
                    <span className="font-semibold">{s.part}</span>
                    {s.zones.length > 0 && (
                      <span className="ml-1.5 text-muted-foreground">[{s.zones.join(", ")}]</span>
                    )}
                    {!isBlock && (
                      <span
                        className="ml-1 text-foreground/90 fiche-body"
                        dangerouslySetInnerHTML={{ __html: `— ${body}` }}
                      />
                    )}
                  </div>
                  {isBlock && (
                    <div
                      className="mt-1 pl-2 border-l-2 border-current/15 text-foreground/90 fiche-body"
                      dangerouslySetInnerHTML={{ __html: body }}
                    />
                  )}
                </div>
              );
            })}
          </div>


          {fiche.wbalSummary && (
            <div className="text-[10.5px] leading-snug">
              <span className="font-semibold text-foreground/80">⚙️ Profil W'bal : </span>
              <span className="text-muted-foreground">{fiche.wbalSummary}</span>
            </div>
          )}

          {fiche.variants.length > 0 && (
            <div className="text-[10.5px] leading-snug">
              <span className="font-semibold text-foreground/80">🎯 Variantes par objectif :</span>
              <ul className="mt-0.5 ml-3 list-disc space-y-0.5 text-muted-foreground">
                {fiche.variants.map((v, i) => (
                  <li key={i}>
                    <span className="font-medium uppercase text-[9px]">{v.goal}</span> — {v.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {fiche.dPlusTargetM && (
            <div className="text-[10.5px] text-muted-foreground">
              <span className="font-semibold text-foreground/80">⛰ D+ cible :</span>{" "}
              {typeof fiche.dPlusTargetM === "number"
                ? `${fiche.dPlusTargetM} m`
                : `${fiche.dPlusTargetM.min}-${fiche.dPlusTargetM.max} m`}
            </div>
          )}

          {(fiche.when || fiche.avoid) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10.5px]">
              {fiche.when && (
                <div className="text-muted-foreground">
                  <span className="font-semibold text-green-700 dark:text-green-300">✓ Quand :</span> {fiche.when}
                </div>
              )}
              {fiche.avoid && (
                <div className="text-muted-foreground">
                  <span className="font-semibold text-red-700 dark:text-red-300">⚠ Éviter :</span> {fiche.avoid}
                </div>
              )}
            </div>
          )}

          {fiche.notes && (
            <p className="text-[10.5px] italic text-muted-foreground border-l-2 border-primary/30 pl-2">
              💡 {fiche.notes}
            </p>
          )}

          {fiche.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {fiche.tags.map((t) => (
                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
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
  nolioCtx?: NolioCtx | null;
}

function WeekView({ week, startDate, nolioCtx }: WeekViewProps) {
  const weekDates = useMemo(() => {
    if (!startDate) return null;
    const start = startOfWeek(startDate, { weekStartsOn: 1 });
    const base = addDays(start, (week.weekNumber - 1) * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(base, i));
  }, [startDate, week.weekNumber]);

  const activeSessions = week.sessions.filter(s => !s.isRest).length;

  // Bulk Nolio: keys of active (non-rest) sessions for this week
  const weekSelectableKeys = useMemo(() => {
    if (!nolioCtx) return [] as string[];
    return week.sessions
      .filter((s) => !s.isRest && s.dayIndex >= 0 && !nolioCtx.isSent(sessionKey(nolioCtx.athleteId, s.weekNumber, s.dayIndex)))
      .map((s) => sessionKey(nolioCtx.athleteId, s.weekNumber, s.dayIndex));
  }, [week.sessions, nolioCtx]);
  const weekSelectedCount = nolioCtx
    ? weekSelectableKeys.filter((k) => nolioCtx.isSelected(k)).length
    : 0;
  const allWeekSelected = weekSelectableKeys.length > 0 && weekSelectedCount === weekSelectableKeys.length;

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
        {nolioCtx && weekSelectableKeys.length > 0 && (
          <div className="flex items-center gap-2 pt-1.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => nolioCtx.setManySelected(weekSelectableKeys, !allWeekSelected)}
            >
              {allWeekSelected
                ? `Désélectionner la semaine ${week.weekNumber}`
                : `Tout sélectionner la semaine ${week.weekNumber}`}
            </Button>
            {weekSelectedCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {weekSelectedCount}/{weekSelectableKeys.length} sélectionnée(s)
              </Badge>
            )}
          </div>
        )}
        {week.volumeTarget && (
          <p className="text-xs text-muted-foreground">Volume cible : {week.volumeTarget}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {week.sessions.map((session, idx) => {
          const date = weekDates && session.dayIndex >= 0 ? weekDates[session.dayIndex] : undefined;
          return <SessionCard key={idx} session={session} date={date} nolioCtx={nolioCtx} />;
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
  athleteId?: string;
  currentWeekNumber?: number;
  adaptationProjections?: import("@/hooks/useAITrainingPlan").AdaptationProjection[];
}

export function AIPlanViewer({ plan, startDate, raceGoals, onSaveToPlan, isSaving, isSaved, onRegenerateWeek, onRegenerateFutureWeeks, isRegenerating, athleteName, athleteId, currentWeekNumber, adaptationProjections }: AIPlanViewerProps) {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [viewMode, setViewMode] = useState<"week" | "all">("week");

  // --- Nolio per-session sending context ---
  const { athletes, snapshots } = useCloudDataContext();
  const [nolioId, setNolioId] = useState<number | null>(null);
  const [sentKeys, setSentKeys] = useState<Set<string>>(() => new Set());
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!athleteId) { setNolioId(null); return; }
    let cancelled = false;
    supabase
      .from("athletes")
      .select("nolio_id")
      .eq("id", athleteId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const raw = (data as { nolio_id?: number | null } | null)?.nolio_id;
        setNolioId(typeof raw === "number" ? raw : null);
      });
    return () => { cancelled = true; };
  }, [athleteId]);

  useEffect(() => { setSentKeys(new Set()); setSelectedKeys(new Set()); }, [athleteId, plan]);

  const nolioRefs = useMemo(() => {
    if (!athleteId) return { ftp: null, vma: null, css: null, fcMax: null };
    const athlete = athletes.find((a) => a.id === athleteId) ?? null;
    const r = getEffectiveRefs(athlete, snapshots);
    return { ftp: r.ftp, vma: r.vma, css: r.css, fcMax: r.fcMax };
  }, [athletes, snapshots, athleteId]);

  const markSent = useCallback((key: string) => {
    setSentKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setSelectedKeys((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const toggleSelected = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const setManySelected = useCallback((keys: string[], value: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (value) keys.forEach((k) => next.add(k));
      else keys.forEach((k) => next.delete(k));
      return next;
    });
  }, []);

  const nolioCtx: NolioCtx | null = useMemo(() => {
    if (!athleteId || nolioId == null || !startDate) return null;
    return {
      athleteId,
      nolioId,
      planStartDate: startDate,
      refs: nolioRefs,
      isSent: (k: string) => sentKeys.has(k),
      markSent,
      isSelected: (k: string) => selectedKeys.has(k),
      toggleSelected,
      setManySelected,
    };
  }, [athleteId, nolioId, startDate, nolioRefs, sentKeys, markSent, selectedKeys, toggleSelected, setManySelected]);

  // Bulk send state
  const [bulkStartDate, setBulkStartDate] = useState<string>(() => {
    const today = new Date();
    const mon = startOfWeek(today, { weekStartsOn: 1 });
    const nextMon = mon <= today ? addDays(mon, 7) : mon;
    return format(nextMon, "yyyy-MM-dd");
  });
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  // Map selected keys → ParsedSession objects from current plan
  const selectedSessions = useMemo(() => {
    if (!nolioCtx) return [] as ParsedSession[];
    const out: ParsedSession[] = [];
    for (const w of plan.weeks) {
      for (const s of w.sessions) {
        if (s.isRest || s.dayIndex < 0) continue;
        const k = sessionKey(nolioCtx.athleteId, s.weekNumber, s.dayIndex);
        if (selectedKeys.has(k)) out.push(s);
      }
    }
    return out;
  }, [plan, selectedKeys, nolioCtx]);

  async function handleBulkSend() {
    if (!nolioCtx || selectedSessions.length === 0) return;
    setBulkSending(true);
    setBulkProgress({ done: 0, total: selectedSessions.length });

    const enriched = selectedSessions.map((s) => {
      const lib = findLibraryWorkoutForSession({ title: s.title, details: s.details });
      return {
        weekNumber: s.weekNumber,
        dayIndex: s.dayIndex,
        sport: s.sport ?? lib?.sport ?? null,
        title: s.title,
        id: lib?.id ?? null,
        details: s.details,
        isRest: false,
        structure: lib?.structure ?? null,
        wbalProfile: lib?.wbalProfile ?? null,
      };
    });

    // Calibre planStartDate côté serveur : choisi par l'utilisateur = lundi de la semaine 1.
    // Determine the smallest weekNumber among selection to anchor planStartDate so dates align.
    const minWeek = Math.min(...selectedSessions.map((s) => s.weekNumber));
    const anchorDt = new Date(`${bulkStartDate}T00:00:00Z`);
    // bulkStartDate corresponds to week 1 Monday; if selection starts at minWeek, planStartDate = bulkStartDate
    // (server computes addDays(planStartDate, (w-1)*7+d) which is correct from week 1 anchor)
    void minWeek;
    const computedStart = anchorDt.toISOString().slice(0, 10);

    // Indeterminate progress animation (single request)
    const interval = setInterval(() => {
      setBulkProgress((p) => {
        if (p.done >= p.total - 1) return p;
        return { ...p, done: p.done + 1 };
      });
    }, 350);

    try {
      const { data, error } = await supabase.functions.invoke("nolio-send-plan", {
        body: {
          athlete_id: nolioCtx.athleteId,
          nolio_athlete_id: nolioCtx.nolioId,
          planStartDate: computedStart,
          sessions: enriched,
          refs: nolioCtx.refs,
        },
      });
      clearInterval(interval);
      if (error) throw error;
      const result = data as { sent?: number; errors?: { status: number; detail?: string }[] } | null;
      const sentCount = result?.sent ?? 0;
      const errs = result?.errors ?? [];
      setBulkProgress({ done: sentCount, total: selectedSessions.length });

      if (sentCount > 0) {
        // Mark all as sent (best-effort: assume order matches enriched order; mark the first sentCount)
        enriched.slice(0, sentCount).forEach((s) => {
          markSent(sessionKey(nolioCtx.athleteId, s.weekNumber, s.dayIndex));
        });
      }

      if (errs.length === 0) {
        toast.success(`${sentCount} séances envoyées avec succès`);
      } else if (sentCount > 0) {
        toast.warning(
          `${sentCount} envoyées · ${errs.length} échec(s) — ${errs.slice(0, 2).map((e) => `${e.status} ${e.detail ?? ""}`).join(" | ")}`.slice(0, 240),
        );
      } else {
        toast.error(
          `Aucune séance envoyée — ${errs.slice(0, 2).map((e) => `${e.status} ${e.detail ?? ""}`).join(" | ")}`.slice(0, 240),
        );
      }
      setBulkConfirmOpen(false);
    } catch (e) {
      clearInterval(interval);
      toast.error(`Erreur Nolio : ${(e as Error).message ?? "inconnue"}`);
    } finally {
      setBulkSending(false);
    }
  }


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
    exportAIPlanToPDF({ ...plan, title: correctedTitle }, athleteName, startDate, adaptationProjections, "landscape", "full");
  };
  const handleExportPDFPortrait = () => {
    exportAIPlanToPDF({ ...plan, title: correctedTitle }, athleteName, startDate, adaptationProjections, "portrait", "full");
  };
  const handleExportPDFCompact = () => {
    exportAIPlanToPDF({ ...plan, title: correctedTitle }, athleteName, startDate, adaptationProjections, "portrait", "compact");
  };

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-base">{correctedTitle}</h3>
              <p className="text-xs text-muted-foreground">{plan.totalWeeks} semaines • {plan.phases.length} blocs</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Printer className="h-4 w-4 mr-1" /> PDF paysage
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDFPortrait}>
                <Printer className="h-4 w-4 mr-1" /> PDF portrait
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportPDFCompact}>
                <List className="h-4 w-4 mr-1" /> PDF condensé
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
          <WeekView week={currentWeek} startDate={startDate} nolioCtx={nolioCtx} />
        </>
      ) : (
        <div className="space-y-4">
          {plan.weeks.map((week, i) => (
            <WeekView key={i} week={week} startDate={startDate} nolioCtx={nolioCtx} />
          ))}
        </div>
      )}

      {/* Floating Nolio bulk-send bar */}
      {nolioCtx && selectedSessions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg">
          <div className="mx-auto max-w-5xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                {selectedSessions.length} séance(s) sélectionnée(s)
              </Badge>
              <div className="flex items-center gap-2 min-w-0">
                <Label htmlFor="nolio-bulk-start" className="text-xs whitespace-nowrap text-muted-foreground">
                  Début du plan
                </Label>
                <Input
                  id="nolio-bulk-start"
                  type="date"
                  value={bulkStartDate}
                  onChange={(e) => setBulkStartDate(e.target.value)}
                  className="h-8 w-[150px] text-xs"
                  disabled={bulkSending}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedKeys(new Set())}
                disabled={bulkSending}
              >
                Tout désélectionner
              </Button>
              <Button
                size="sm"
                onClick={() => setBulkConfirmOpen(true)}
                disabled={bulkSending}
              >
                <Send className="h-4 w-4 mr-2" />
                Envoyer {selectedSessions.length} séances vers Nolio
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk confirmation dialog */}
      <Dialog open={bulkConfirmOpen} onOpenChange={(v) => !bulkSending && setBulkConfirmOpen(v)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Confirmer l'envoi groupé vers Nolio</DialogTitle>
            <DialogDescription>
              {selectedSessions.length} séance(s) à envoyer. Début du plan :{" "}
              <span className="font-medium text-foreground">
                {format(new Date(`${bulkStartDate}T00:00:00`), "EEEE d MMMM yyyy", { locale: fr })}
              </span>
              . Les séances déjà envoyées (même <code className="px-1">id_partner</code>) ne seront pas dupliquées.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[300px] overflow-y-auto space-y-1 border rounded-md p-2 text-xs">
            {selectedSessions.map((s) => {
              const anchor = new Date(`${bulkStartDate}T00:00:00`);
              const dt = addDays(anchor, (s.weekNumber - 1) * 7 + s.dayIndex);
              return (
                <div
                  key={`${s.weekNumber}-${s.dayIndex}-${s.title}`}
                  className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground whitespace-nowrap">
                      S{s.weekNumber}
                    </span>
                    <span className="font-medium truncate">{s.title}</span>
                  </div>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {format(dt, "EEE d MMM", { locale: fr })}
                  </span>
                </div>
              );
            })}
          </div>

          {bulkSending && (
            <div className="space-y-2">
              <Progress value={(bulkProgress.done / Math.max(1, bulkProgress.total)) * 100} />
              <p className="text-xs text-center text-muted-foreground">
                {bulkProgress.done}/{bulkProgress.total} séances envoyées…
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirmOpen(false)} disabled={bulkSending}>
              Annuler
            </Button>
            <Button onClick={handleBulkSend} disabled={bulkSending || selectedSessions.length === 0}>
              {bulkSending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi…</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Confirmer l'envoi</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

