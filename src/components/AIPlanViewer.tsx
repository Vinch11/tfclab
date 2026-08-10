/**
 * AIPlanViewer — Interactive structured view of a parsed AI training plan
 */
import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
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
import { getFicheForSession, maybeDowngradeBikeSession } from "@/lib/aiPlanWorkoutEnricher";
import { formatFicheText } from "@/lib/ficheTextFormatter";
import { mapSessionsToDates } from "@/lib/aiPlanParser";
import { parseSessionTitle } from "@/lib/parseSessionTitle";
import { exportAIPlanToPDF } from "@/lib/aiPlanPDFExport";
import { AIPlanVolumeChart } from "@/components/AIPlanVolumeChart";
import { GapAmbitionPanel } from "@/components/GapAmbitionPanel";
import { formatTime as formatRaceTime } from "@/lib/raceAnalysis";
import { deriveRaceTargets, mapObjectiveToSport } from "@/lib/deriveRaceTargets";
import type { RaceGoal } from "@/hooks/useAITrainingPlan";
import { AMBITION_DEFINITIONS, type AmbitionLevel } from "@/types/ambitionLevel";
import { supabase } from "@/integrations/supabase/client";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { getEffectiveRefs } from "@/lib/effectiveRefs";
import { buildTargetTable } from "@/lib/plan/targetTable";
import { buildPhaseLabelMap, displayPhase } from "@/lib/plan/phaseDisplayLabel";
import { derivePhasesFromWeeks } from "@/engines/plan/planValidator";
import { enrichWithAbsoluteValues, type SportKind } from "@/lib/plan/renderIntensities";
import { TargetTableProvider, useTargetTable } from "@/components/plan/TargetTableContext";
import { NolioSessionButton, sessionKey, type NolioCtx } from "@/components/NolioSessionButton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Send, Repeat } from "lucide-react";
import { toast } from "sonner";
import { findLibraryWorkoutForSession } from "@/lib/aiPlanWorkoutEnricher";
import { SessionReplaceDialog, libSportToPlanSport } from "@/components/SessionReplaceDialog";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import { WeekPicker, mondayOf } from "@/components/ui/week-picker";
import { sanitizeWhenField } from "@/lib/plan/sanitizeWhenField";
import { RegenerationConstraintsDialog, type RegenerationScope } from "@/components/plan/RegenerationConstraintsDialog";



type NolioScope = "selected" | "single" | "range" | "all";

function getSportIcon(sport: string) {
  const s = sport.toLowerCase().trim();
  if (s === "nat" || s.includes("natation") || s.includes("swim")) return <Waves className="h-4 w-4" />;
  if (s === "velo" || s === "vélo" || s.includes("vélo") || s.includes("velo") || s.includes("bike")) return <Bike className="h-4 w-4" />;
  if (s === "cap" || s.includes("course") || s.includes("run")) return <Footprints className="h-4 w-4" />;
  if (s === "repos" || s.includes("repos") || s.includes("rest")) return <Moon className="h-4 w-4" />;
  if (s === "renfo" || s.includes("muscu") || s.includes("force") || s.includes("renfo")) return <Dumbbell className="h-4 w-4" />;
  if (s.includes("brick") || s.includes("brique")) return <Zap className="h-4 w-4" />;
  return <Dumbbell className="h-4 w-4" />;
}

function getSportColor(sport: string): string {
  const s = sport.toLowerCase().trim();
  if (s === "nat" || s.includes("natation") || s.includes("swim")) return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
  if (s === "velo" || s === "vélo" || s.includes("vélo") || s.includes("velo") || s.includes("bike")) return "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30";
  if (s === "cap" || s.includes("course") || s.includes("run")) return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
  if (s === "repos" || s.includes("repos") || s.includes("rest")) return "bg-muted text-muted-foreground border-border";
  if (s.includes("brick") || s.includes("brique")) return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
  if (s === "renfo" || s.includes("muscu") || s.includes("force") || s.includes("renfo")) return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
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
    <CollapsibleCard
      className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
      defaultOpen={false}
      storageKey="ai_plan_strategic_recap"
      icon={<Target className="h-4 w-4 text-primary" />}
      title={<span className="text-sm">Récapitulatif Stratégique</span>}
    >
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
      </CollapsibleCard>
  );
}

// ─── Résolution unique ambition + objectif (source de vérité affichage) ───
function resolveAmbitionLabel(amb?: string | null): string {
  if (!amb) return "—";
  const raw = amb.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const map: Record<string, AmbitionLevel> = {
    finisher: "finisher", decouverte: "finisher", finish: "finisher",
    age_group: "age_group", "age-group": "age_group", ageGroup: "age_group" as any,
    perf: "age_group", confirme: "age_group", confirmé: "age_group" as any,
    competitor: "competitor", compet: "competitor", competiteur: "competitor",
    elite: "elite", qualifiable: "elite", pro: "elite",
    world_class: "world_class", worldclass: "world_class", world: "world_class", mondial: "world_class",
  };
  const key = map[raw] ?? (raw in AMBITION_DEFINITIONS ? (raw as AmbitionLevel) : null);
  if (key) return AMBITION_DEFINITIONS[key].label;
  // fallback : capitalise sans exposer d'enum brut
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Format temps sans les secondes : "1h38" ou "45min" */
function formatRaceTimeHM(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}

interface SessionCardProps {
  session: ParsedSession;
  date?: Date;
  nolioCtx?: NolioCtx | null;
  onReplaceClick?: (session: ParsedSession) => void;
  sessionIndex?: number;
  objectifEffectif?: string | null;
  planTotalWeeks?: number;
}

function SessionCard({ session: rawSession, date, nolioCtx, onReplaceClick, sessionIndex = 0, objectifEffectif, planTotalWeeks }: SessionCardProps) {

  const [expanded, setExpanded] = useState(false);
  const targetTable = useTargetTable();

  const session = useMemo(
    () => maybeDowngradeBikeSession(rawSession, objectifEffectif),
    [rawSession, objectifEffectif]
  );

  // PHASE 2B v2 — annote les intensités relatives (zones/%FTP/%VMA/CSS±s) avec les valeurs absolues athlète.
  const displayTitle = useMemo(
    () => enrichWithAbsoluteValues(session.title ?? "", targetTable, session.sport as SportKind),
    [session.title, session.sport, targetTable]
  );
  const displayDetails = useMemo(
    () => enrichWithAbsoluteValues(session.details ?? "", targetTable, session.sport as SportKind),
    [session.details, session.sport, targetTable]
  );

  const trailAlts = useMemo(
    () => getTrailSessionAlternatives({
      sport: session.sport,
      title: session.title,
      details: session.details,
    }),
    [session.sport, session.title, session.details]
  );

  const fiche = useMemo(
    () => session.isRest ? null : getFicheForSession({ title: session.title, details: session.details }, objectifEffectif),
    [session.isRest, session.title, session.details, objectifEffectif]
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

  const selKey = nolioCtx ? sessionKey(nolioCtx.athleteId, session.weekNumber, session.dayIndex, sessionIndex) : null;
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
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {(() => {
          const parsed = parseSessionTitle(session.title);
          const SPORT_TOKENS = new Set([
            "BIKE","VÉLO","VELO","RUN","CAP","COURSE","SWIM","NATATION",
            "TR","TRI","BR","BRICK","STR","RENFO","MIXED",
          ]);
          const displayTags = parsed.tags.filter(
            (t) => !SPORT_TOKENS.has(t.toUpperCase()) && t !== parsed.catalogId
          );
          const lorangColor: Record<string,string> = {
            A: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
            B: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
            C: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
            D: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30",
          };
          return (
            <>
              {parsed.lorangCategory && (
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${lorangColor[parsed.lorangCategory]}`}>
                  {parsed.lorangCategory}
                </Badge>
              )}
              {displayTags.filter((t) => !/^[A-D]$/.test(t)).map((t) => (
                <Badge key={t} variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground">
                  {t}
                </Badge>
              ))}
              <p className="text-sm font-semibold flex-1" title={parsed.catalogId ?? undefined}>
                {(() => {
                  const clean = parsed.cleanTitle.trim();
                  const looksLikeId = clean.length >= 4 && !/\s/.test(clean) && /^[A-Z0-9_]+$/.test(clean);
                  if (looksLikeId && fiche?.objectif) return fiche.objectif;
                  return displayTitle || clean || session.title;
                })()}
              </p>
            </>
          );
        })()}
        {onReplaceClick && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={(e) => { e.stopPropagation(); onReplaceClick(session); }}
            title="Remplacer cette séance par une séance de la bibliothèque"
          >
            <Repeat className="h-3.5 w-3.5 mr-1" /> Remplacer
          </Button>
        )}
        {nolioCtx && <NolioSessionButton session={session} ctx={nolioCtx} sessionIndex={sessionIndex} />}
      </div>

      {expanded && session.details && (
        <div
          className="text-xs text-muted-foreground mt-2 leading-relaxed border-t border-current/10 pt-2 fiche-body whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: formatFicheText(displayDetails) }}
        />
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

          {(() => {
            const sanitizedWhen = sanitizeWhenField(fiche.when, planTotalWeeks ?? 999);
            if (!sanitizedWhen && !fiche.avoid) return null;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10.5px]">
                {sanitizedWhen && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold text-green-700 dark:text-green-300">✓ Quand :</span> {sanitizedWhen}
                  </div>
                )}
                {fiche.avoid && (
                  <div className="text-muted-foreground">
                    <span className="font-semibold text-red-700 dark:text-red-300">⚠ Éviter :</span> {fiche.avoid}
                  </div>
                )}
              </div>
            );
          })()}



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
  onReplaceClick?: (session: ParsedSession) => void;
  objectifEffectif?: string | null;
  planTotalWeeks?: number;
  phaseLabelMap?: Record<string, string>;
  raceGoals?: RaceGoal[];
}

function WeekView({ week, startDate, nolioCtx, onReplaceClick, objectifEffectif, planTotalWeeks, phaseLabelMap = {}, raceGoals }: WeekViewProps) {



  const weekDates = useMemo(() => {
    if (!startDate) return null;
    const start = startOfWeek(startDate, { weekStartsOn: 1 });
    const base = addDays(start, (week.weekNumber - 1) * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(base, i));
  }, [startDate, week.weekNumber]);

  // Plage calendaire de la semaine ("12 – 18 mai") — ancrage visuel du plan.
  const weekRangeLabel = useMemo(() => {
    if (!weekDates) return null;
    const a = weekDates[0];
    const b = weekDates[6];
    const sameMonth = a.getMonth() === b.getMonth();
    return sameMonth
      ? `${format(a, "d", { locale: fr })} – ${format(b, "d MMM", { locale: fr })}`
      : `${format(a, "d MMM", { locale: fr })} – ${format(b, "d MMM", { locale: fr })}`;
  }, [weekDates]);

  // Course(s) tombant dans cette semaine → badge « 🏁 Course A · 12 juil. »
  const racesThisWeek = useMemo(() => {
    if (!weekDates || !raceGoals?.length) return [];
    const a = weekDates[0];
    const b = weekDates[6];
    return raceGoals
      .filter(g => !!g.raceDate)
      .map(g => ({ g, d: parseISO(g.raceDate as string) }))
      .filter(({ d }) => !isNaN(d.getTime()) && d >= a && d <= addDays(b, 1));
  }, [weekDates, raceGoals]);


  const activeSessions = week.sessions.filter(s => !s.isRest).length;

  // Map ParsedSession → slot index (occurrence within its day) so 2+ sessions
  // sharing the same dayIndex can be selected/sent individually.
  const slotMap = useMemo(() => {
    const counters = new Map<number, number>();
    const map = new Map<ParsedSession, number>();
    for (const s of week.sessions) {
      if (s.isRest || s.dayIndex < 0) continue;
      const c = counters.get(s.dayIndex) ?? 0;
      map.set(s, c);
      counters.set(s.dayIndex, c + 1);
    }
    return map;
  }, [week.sessions]);

  // Bulk Nolio: keys of active (non-rest) sessions for this week
  const weekSelectableKeys = useMemo(() => {
    if (!nolioCtx) return [] as string[];
    const out: string[] = [];
    for (const s of week.sessions) {
      if (s.isRest || s.dayIndex < 0) continue;
      const slot = slotMap.get(s) ?? 0;
      const k = sessionKey(nolioCtx.athleteId, s.weekNumber, s.dayIndex, slot);
      if (!nolioCtx.isSent(k)) out.push(k);
    }
    return out;
  }, [week.sessions, nolioCtx, slotMap]);
  const weekSelectedCount = nolioCtx
    ? weekSelectableKeys.filter((k) => nolioCtx.isSelected(k)).length
    : 0;
  const allWeekSelected = weekSelectableKeys.length > 0 && weekSelectedCount === weekSelectableKeys.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-primary" />
            Semaine {week.weekNumber} — {week.theme}
            {weekRangeLabel && (
              <span className="text-[11px] font-normal text-muted-foreground">({weekRangeLabel})</span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {racesThisWeek.map(({ g, d }, i) => (
              <Badge key={i} className="text-[10px] bg-primary text-primary-foreground">
                🏁 Course {g.priority} · {g.raceName || g.objective} · {format(d, "EEE d MMM", { locale: fr })}
              </Badge>
            ))}
            <WeekQualityBadge week={week} />
            <Badge className={`text-[10px] ${getPhaseColor(week.phase)}`}>{displayPhase(week.phase, phaseLabelMap)}</Badge>
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
        {(week.volumeTarget || week.computedVolumeStr) && (
          <p className="text-xs text-muted-foreground">
            {week.volumeTarget && <span>Volume cible : {week.volumeTarget}</span>}
            {week.computedVolumeStr && week.computedVolumeMin && week.computedVolumeMin > 0 && week.computedVolumeStr !== week.volumeTarget && (
              <span className={week.volumeTarget ? "ml-2" : ""}>
                {week.volumeTarget ? "· " : ""}Volume réel calculé : <strong>{week.computedVolumeStr}</strong>
              </span>
            )}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {week.sessions.map((session, idx) => {
          const date = weekDates && session.dayIndex >= 0 ? weekDates[session.dayIndex] : undefined;
          const slot = slotMap.get(session) ?? 0;
          return <SessionCard key={idx} session={session} date={date} nolioCtx={nolioCtx} onReplaceClick={onReplaceClick} sessionIndex={slot} objectifEffectif={objectifEffectif} planTotalWeeks={planTotalWeeks} />;
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
  onRegenerateWeek?: (weekNumber: number, extraConstraints?: string) => void;
  onRegenerateFutureWeeks?: (extraConstraints?: string) => void;
  onRegenerateAll?: (extraConstraints?: string) => void;
  isRegenerating?: boolean;
  athleteName?: string;
  athleteId?: string;
  currentWeekNumber?: number;
  loadedFromCacheAt?: string | null;
  adaptationProjections?: import("@/hooks/useAITrainingPlan").AdaptationProjection[];
  /** Contexte pour GapAmbitionPanel (100% frontend, déterministe). */
  gapContext?: {
    ambition?: string | null;
    /** Ambition effective si déclassement appliqué (min(saisie, max(niveau))). */
    ambitionEffective?: string | null;
    objective?: string | null;
    weeklyHours?: number | null;
    vmaKmh?: number | null;
    thresholdPaceSecPerKm?: number | null;
  };
}

export function AIPlanViewer({ plan: planProp, startDate, raceGoals, onSaveToPlan, isSaving, isSaved, onRegenerateWeek, onRegenerateFutureWeeks, onRegenerateAll, isRegenerating, athleteName, athleteId, currentWeekNumber, loadedFromCacheAt, adaptationProjections, gapContext }: AIPlanViewerProps) {
  // Régénération avec contraintes ponctuelles (imprévus : piscine fermée, etc.)
  const [regenDialog, setRegenDialog] = useState<null | { scope: RegenerationScope; label: string; run: (extra: string) => void }>(null);
  // Persist selected week per athlete (restored on mount/athlete change)
  const weekStorageKey = athleteId ? `plan_current_week_${athleteId}` : null;
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    if (!weekStorageKey) return 0;
    try {
      const raw = localStorage.getItem(weekStorageKey);
      const n = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch { return 0; }
  });
  const [viewMode, setViewMode] = useState<"week" | "all">("week");

  // Restore selected week when athlete changes
  useEffect(() => {
    if (!weekStorageKey) { setSelectedWeek(0); return; }
    try {
      const raw = localStorage.getItem(weekStorageKey);
      const n = raw ? parseInt(raw, 10) : 0;
      setSelectedWeek(Number.isFinite(n) && n >= 0 ? n : 0);
    } catch { setSelectedWeek(0); }
  }, [weekStorageKey]);

  // Persist selected week
  useEffect(() => {
    if (!weekStorageKey) return;
    try { localStorage.setItem(weekStorageKey, String(selectedWeek)); } catch {}
  }, [weekStorageKey, selectedWeek]);

  // --- Local plan state (allows in-UI session replacements without touching saved plan) ---
  const [plan, setPlan] = useState<ParsedPlan>(planProp);
  const [replacementCount, setReplacementCount] = useState(0);
  useEffect(() => { setPlan(planProp); setReplacementCount(0); }, [planProp]);

  // Libellés de phase orientés limiteur (couche affichage uniquement).
  // Si le bloc "Phases" du plan est absent/incomplet, on le reconstruit depuis
  // les semaines — sinon la table reste vide et on retombe sur "Fondation" brut.
  const effectivePhases = useMemo(() => {
    if (plan.phases && plan.phases.length >= 2) return plan.phases;
    const derived = derivePhasesFromWeeks(plan);
    return derived && derived.length > 0 ? derived : plan.phases;
  }, [plan]);

  const phaseLabelMap = useMemo(
    () => buildPhaseLabelMap(effectivePhases, plan.strategicRecap?.limiters),
    [effectivePhases, plan.strategicRecap],
  );

  // --- Replace dialog state ---
  const [replaceTarget, setReplaceTarget] = useState<ParsedSession | null>(null);

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

  useEffect(() => { setSentKeys(new Set()); setSelectedKeys(new Set()); }, [athleteId, planProp]);

  const handleReplaceClick = useCallback((s: ParsedSession) => {
    setReplaceTarget(s);
  }, []);

  const applyReplacement = useCallback((w: LibraryWorkout) => {
    const target = replaceTarget;
    if (!target) return;
    const newSport = libSportToPlanSport(w.sport);
    const newTitle = `${w.objectif || w.id}`;
    const structureText = (w.structure || [])
      .map((p) => `${p.part}${p.zones.length ? ` [${p.zones.join(", ")}]` : ""} — ${p.text}`)
      .join("\n");
    const newDetails = `[ID: ${w.id}] ${structureText}`.trim();

    setPlan((prev) => ({
      ...prev,
      weeks: prev.weeks.map((wk) => {
        if (wk.weekNumber !== target.weekNumber) return wk;
        return {
          ...wk,
          sessions: wk.sessions.map((s) => {
            if (s.dayIndex !== target.dayIndex || s.title !== target.title) return s;
            return { ...s, sport: newSport, title: newTitle, details: newDetails, isRest: false };
          }),
        };
      }),
    }));
    setReplacementCount((c) => c + 1);

    // Reset "sent" badge for any slot on this (week, day) — replacement targets all matching sessions
    if (athleteId) {
      const prefix = `${athleteId}:${target.weekNumber}:${target.dayIndex}:`;
      setSentKeys((prev) => {
        let changed = false;
        const next = new Set(prev);
        prev.forEach((k) => { if (k.startsWith(prefix)) { next.delete(k); changed = true; } });
        return changed ? next : prev;
      });
    }

    toast.success(`Séance remplacée par ${w.id}`);
    setReplaceTarget(null);
  }, [replaceTarget, athleteId]);



  const nolioRefs = useMemo(() => {
    if (!athleteId) return { ftp: null, vma: null, css: null, fcMax: null };
    const athlete = athletes.find((a) => a.id === athleteId) ?? null;
    const r = getEffectiveRefs(athlete, snapshots);
    return { ftp: r.ftp, vma: r.vma, css: r.css, fcMax: r.fcMax };
  }, [athletes, snapshots, athleteId]);

  // PHASE 2B v2 — TargetTable pour annoter les intensités relatives à l'affichage
  const targetTable = useMemo(() => {
    if (!nolioRefs.ftp && !nolioRefs.vma && !nolioRefs.css) return null;
    try {
      return buildTargetTable({
        ftp: nolioRefs.ftp,
        vma: nolioRefs.vma,
        css: nolioRefs.css,
        fcMax: nolioRefs.fcMax,
        objective: gapContext?.objective ?? null,
        ambition: gapContext?.ambition ?? null,
      });
    } catch {
      return null;
    }
  }, [nolioRefs, gapContext?.objective, gapContext?.ambition]);

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

  // Scope selector
  const allWeekNums = useMemo(
    () => Array.from(new Set(plan.weeks.map((w) => w.weekNumber))).sort((a, b) => a - b),
    [plan.weeks],
  );
  const [scope, setScope] = useState<NolioScope>("all");
  const [scopeWeek, setScopeWeek] = useState<number>(() => allWeekNums[0] ?? 1);
  const [scopeFrom, setScopeFrom] = useState<number>(() => allWeekNums[0] ?? 1);
  const [scopeTo, setScopeTo] = useState<number>(() => allWeekNums[allWeekNums.length - 1] ?? 1);
  useEffect(() => {
    if (allWeekNums.length === 0) return;
    if (!allWeekNums.includes(scopeWeek)) setScopeWeek(allWeekNums[0]);
    if (!allWeekNums.includes(scopeFrom)) setScopeFrom(allWeekNums[0]);
    if (!allWeekNums.includes(scopeTo)) setScopeTo(allWeekNums[allWeekNums.length - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allWeekNums.join(",")]);

  // Per-week slot map: ParsedSession → occurrence index within its dayIndex.
  // Lets us disambiguate the selection/sent key when 2+ sessions share the same day.
  const planSlotMap = useMemo(() => {
    const map = new Map<ParsedSession, number>();
    for (const w of plan.weeks) {
      const counters = new Map<number, number>();
      for (const s of w.sessions) {
        if (s.isRest || s.dayIndex < 0) continue;
        const c = counters.get(s.dayIndex) ?? 0;
        map.set(s, c);
        counters.set(s.dayIndex, c + 1);
      }
    }
    return map;
  }, [plan]);

  // Map selected keys → ParsedSession objects from current plan
  const selectedSessions = useMemo(() => {
    if (!nolioCtx) return [] as ParsedSession[];
    const out: ParsedSession[] = [];
    for (const w of plan.weeks) {
      for (const s of w.sessions) {
        if (s.isRest || s.dayIndex < 0) continue;
        const slot = planSlotMap.get(s) ?? 0;
        const k = sessionKey(nolioCtx.athleteId, s.weekNumber, s.dayIndex, slot);
        if (selectedKeys.has(k)) out.push(s);
      }
    }
    return out;
  }, [plan, selectedKeys, nolioCtx, planSlotMap]);

  // Sessions effectively targeted by the current scope (used for top panel + confirm modal + send)
  const targetSessions = useMemo(() => {
    if (!nolioCtx) return [] as ParsedSession[];
    if (scope === "selected") return selectedSessions;
    const lo = Math.min(scopeFrom, scopeTo);
    const hi = Math.max(scopeFrom, scopeTo);
    const inScope = (n: number) => {
      if (scope === "all") return true;
      if (scope === "single") return n === scopeWeek;
      return n >= lo && n <= hi;
    };
    const out: ParsedSession[] = [];
    for (const w of plan.weeks) {
      if (!inScope(w.weekNumber)) continue;
      for (const s of w.sessions) {
        if (s.isRest || s.dayIndex < 0) continue;
        out.push(s);
      }
    }
    return out;
  }, [scope, scopeWeek, scopeFrom, scopeTo, plan, selectedSessions, nolioCtx]);

  const targetWeekNumbers = useMemo(
    () => Array.from(new Set(targetSessions.map((s) => s.weekNumber))).sort((a, b) => a - b),
    [targetSessions],
  );

  // Première séance du périmètre (par semaine puis dayIndex) → ancrage de la date saisie
  const anchorSession = useMemo(() => {
    if (targetSessions.length === 0) return null;
    return [...targetSessions].sort(
      (a, b) => (a.weekNumber - b.weekNumber) || (a.dayIndex - b.dayIndex),
    )[0];
  }, [targetSessions]);

  const anchorWeek = anchorSession?.weekNumber
    ?? (plan.weeks.length > 0 ? Math.min(...plan.weeks.map((w) => w.weekNumber)) : 1);
  const anchorDay = anchorSession?.dayIndex ?? 0;

  // bulkStartDate = lundi de la semaine `anchorWeek` choisi par le coach.
  // Lundi semaine 1 = bulkStartDate - (anchorWeek-1)*7.
  const computedPlanStart = useMemo(() => {
    try {
      const dt = new Date(`${bulkStartDate}T00:00:00Z`);
      dt.setUTCDate(dt.getUTCDate() - (anchorWeek - 1) * 7);
      return dt.toISOString().slice(0, 10);
    } catch { return bulkStartDate; }
  }, [bulkStartDate, anchorWeek]);

  const bulkAnchorMonday = useMemo(() => {
    const [y, m, d] = bulkStartDate.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }, [bulkStartDate]);

  const planStartMondayDate = useMemo(() => {
    const [y, m, d] = computedPlanStart.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }, [computedPlanStart]);

  const setBulkAnchorFromDate = useCallback((d: Date) => {
    const mon = mondayOf(d);
    const iso = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
    setBulkStartDate(iso);
  }, []);

  const alreadySentInScope = useMemo(() => {
    if (!nolioCtx) return 0;
    return targetSessions.filter((s) => {
      const slot = planSlotMap.get(s) ?? 0;
      return sentKeys.has(sessionKey(nolioCtx.athleteId, s.weekNumber, s.dayIndex, slot));
    }).length;
  }, [targetSessions, sentKeys, nolioCtx, planSlotMap]);

  async function handleBulkSend() {
    if (!nolioCtx || targetSessions.length === 0) return;
    setBulkSending(true);
    setBulkProgress({ done: 0, total: targetSessions.length });

    const dayCounters = new Map<string, number>();
    const enriched = targetSessions.map((s) => {
      const dayKey = `${s.weekNumber}:${s.dayIndex}`;
      const sessionIndex = dayCounters.get(dayKey) ?? 0;
      dayCounters.set(dayKey, sessionIndex + 1);
      const lib = findLibraryWorkoutForSession({ title: s.title, details: s.details });
      const alternatives = getTrailSessionAlternatives({
        sport: s.sport ?? lib?.sport ?? "",
        title: s.title,
        details: s.details,
      }).map((a) => ({ icon: a.icon, label: a.label, hint: a.hint }));
      return {
        weekNumber: s.weekNumber,
        dayIndex: s.dayIndex,
        sessionIndex,
        sport: s.sport ?? lib?.sport ?? null,
        title: s.title,
        id: lib?.id ?? null,
        details: s.details,
        isRest: false,
        structure: lib?.structure ?? null,
        wbalProfile: lib?.wbalProfile ?? null,
        avoid: lib?.avoid ?? undefined,
        notes: lib?.notes ?? undefined,
        objectif: lib?.objectif ?? undefined,
        alternatives: alternatives.length > 0 ? alternatives : undefined,
      };
    });

    // bulkStartDate = lundi de la semaine `anchorWeek`. planStart = bulkStartDate - (anchorWeek-1)*7.
    const anchorDt = new Date(`${bulkStartDate}T00:00:00Z`);
    const planStartDt = new Date(anchorDt);
    planStartDt.setUTCDate(planStartDt.getUTCDate() - (anchorWeek - 1) * 7);
    const computedStart = planStartDt.toISOString().slice(0, 10);

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
      setBulkProgress({ done: sentCount, total: targetSessions.length });

      if (sentCount > 0) {
        enriched.slice(0, sentCount).forEach((s) => {
          markSent(sessionKey(nolioCtx.athleteId, s.weekNumber, s.dayIndex, s.sessionIndex ?? 0));
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

  // Nombre de blocs affiché : si le bloc "Phases" du plan est absent/incomplet,
  // on le reconstruit depuis les semaines (même logique que la carte Benchmark).
  const headerPhasesCount = useMemo(() => {
    if (plan.phases && plan.phases.length >= 2) return plan.phases.length;
    const derived = derivePhasesFromWeeks(plan);
    return derived && derived.length > 0 ? derived.length : (plan.phases?.length ?? 0);
  }, [plan]);

  // Corrige une distance hallucinée dans le titre IA + applique le nouveau format canonique
  // "{Objectif} — Structure {Ambition} — Objectif {tempsSnapshot}"
  const correctedTitle = useMemo(() => {
    const t = plan.title || "";
    if (/Plan TFCL™\s*—\s*70\.3\s*LCW\s*—\s*\d+\s*semaines?/i.test(t)) return t;
    const primary = (raceGoals || []).find((g) => g.priority === "A" && typeof g.distanceKm === "number" && (g.distanceKm as number) > 0)
      || (raceGoals || []).find((g) => typeof g.distanceKm === "number" && (g.distanceKm as number) > 0);
    const km = primary?.distanceKm;
    // Nouveau format canonique si on a le contexte (ambition + objectif + snapshot)
    // Le titre reflète l'ambition EFFECTIVE (structure réellement appliquée), pas la saisie.
    if (gapContext?.ambition && gapContext?.objective) {
      const ambForTitle = gapContext.ambitionEffective || gapContext.ambition;
      const sportForTitle = mapObjectiveToSport(gapContext.objective);
      const derivedTitle = deriveRaceTargets({
        vmaKmh: gapContext.vmaKmh ?? null,
        thresholdPaceSecPerKm: gapContext.thresholdPaceSecPerKm ?? null,
        objective: gapContext.objective,
        ambition: ambForTitle,
        weeklyHours: gapContext.weeklyHours ?? null,
        sport: sportForTitle,
      });
      const ambLabel = resolveAmbitionLabel(ambForTitle);
      // Pour les objectifs triathlon (tri_70_3, ironman), la projection temps course
      // à partir de la VMA seule n'est pas pertinente (swim+bike+run). On omet le suffixe.
      if (derivedTitle.raceTimeSec) {
        const tempsStr = formatRaceTimeHM(derivedTitle.raceTimeSec);
        return `Plan TFCL™ — ${gapContext.objective} — Structure ${ambLabel} — Objectif ${tempsStr}`;
      }
      return `Plan TFCL™ — ${gapContext.objective} — Structure ${ambLabel}`;
    }
    if (!km) return t;
    const kmRegex = /\(\s*\d{1,3}\s*km\s*\)/i;
    if (kmRegex.test(t)) return t.replace(kmRegex, `(${km}km)`);
    return t.replace(/—\s*([^—]+?)(\s+—|$)/, (_m, name, tail) => `— ${name.trim()} (${km}km)${tail}`);
  }, [plan.title, raceGoals, gapContext]);

  const handleExportPDF = () => {
    exportAIPlanToPDF({ ...plan, title: correctedTitle }, athleteName, startDate, adaptationProjections, "landscape", "full", gapContext);
  };
  const handleExportPDFPortrait = () => {
    exportAIPlanToPDF({ ...plan, title: correctedTitle }, athleteName, startDate, adaptationProjections, "portrait", "full", gapContext);
  };
  const handleExportPDFCompact = () => {
    exportAIPlanToPDF({ ...plan, title: correctedTitle }, athleteName, startDate, adaptationProjections, "portrait", "compact", gapContext);
  };


  return (
    <TargetTableProvider value={targetTable}>
    <div className="space-y-4">
      {replacementCount > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ Plan modifié — {replacementCount} séance(s) remplacée(s) localement. Pensez à sauvegarder pour conserver vos modifications.
          </AlertDescription>
        </Alert>
      )}

      {/* Nolio — Top sending panel (unified scopes) */}
      {nolioCtx && (
        <CollapsibleCard
          className="border-primary/30"
          defaultOpen={false}
          storageKey="ai_plan_nolio_send"
          icon={<Send className="h-4 w-4 text-primary" />}
          title={<span className="text-sm">Envoyer vers Nolio</span>}
          rightSlot={
            <Badge variant="secondary" className="text-[10px]">
              athlète lié #{nolioCtx.nolioId}
            </Badge>
          }
        >

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Quand commence la semaine S{anchorWeek} ?
                </Label>
                <WeekPicker
                  selectedMonday={bulkAnchorMonday}
                  onChange={setBulkAnchorFromDate}
                  planStartDate={anchorWeek > 1 ? planStartMondayDate : null}
                  anchorLabel={`📅 Cette semaine du plan (S${anchorWeek}) commence le :`}
                  planStartLabel="→ Le plan complet débute donc le :"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Périmètre d'envoi</Label>
                <RadioGroup
                  value={scope}
                  onValueChange={(v) => setScope(v as NolioScope)}
                  className="grid grid-cols-2 gap-1.5 text-xs"
                >
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="selected" id="scope-selected" />
                    <span>Séances sélectionnées ({selectedSessions.length})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="single" id="scope-single" />
                    <span>Une semaine</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="range" id="scope-range" />
                    <span>Plage de semaines</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="all" id="scope-all" />
                    <span>Plan complet ({allWeekNums.length} sem.)</span>
                  </label>
                </RadioGroup>
              </div>
            </div>

            {scope === "single" && (
              <div className="flex items-center gap-2">
                <Label className="text-xs whitespace-nowrap">Semaine :</Label>
                <Select value={String(scopeWeek)} onValueChange={(v) => setScopeWeek(Number(v))}>
                  <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allWeekNums.map((n) => (
                      <SelectItem key={n} value={String(n)}>Semaine {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope === "range" && (
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-xs whitespace-nowrap">De :</Label>
                <Select value={String(scopeFrom)} onValueChange={(v) => setScopeFrom(Number(v))}>
                  <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allWeekNums.map((n) => (
                      <SelectItem key={n} value={String(n)}>Semaine {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label className="text-xs whitespace-nowrap">jusqu'à :</Label>
                <Select value={String(scopeTo)} onValueChange={(v) => setScopeTo(Number(v))}>
                  <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allWeekNums.map((n) => (
                      <SelectItem key={n} value={String(n)}>Semaine {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {targetSessions.length} séance(s) à envoyer
                {targetWeekNumbers.length > 0 && ` · semaines ${targetWeekNumbers.join(", ")}`}
                {alreadySentInScope > 0 && ` · ${alreadySentInScope} déjà envoyée(s)`}
              </p>
              <Button
                size="sm"
                onClick={() => setBulkConfirmOpen(true)}
                disabled={targetSessions.length === 0 || bulkSending}
              >
                <Send className="h-4 w-4 mr-2" />
                Envoyer vers Nolio
              </Button>
            </div>
        </CollapsibleCard>

      )}

      {/* Plan Header */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-base">{correctedTitle}</h3>
              <p className="text-xs text-muted-foreground">{plan.totalWeeks} semaines • {headerPhasesCount} blocs</p>
              {loadedFromCacheAt && (
                <p className="text-[10px] text-muted-foreground/80 italic mt-0.5">
                  Plan chargé depuis la sauvegarde locale — {(() => {
                    try { return format(parseISO(loadedFromCacheAt), "d MMM yyyy 'à' HH:mm", { locale: fr }); }
                    catch { return loadedFromCacheAt; }
                  })()}
                </p>
              )}
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
              {(onRegenerateWeek || onRegenerateFutureWeeks || onRegenerateAll) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isRegenerating}>
                      {isRegenerating ? (
                        <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Régénération...</>
                      ) : (
                        <><RefreshCw className="h-4 w-4 mr-1" /> Régénérer…</>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[340px]">
                    <DropdownMenuLabel>Que voulez-vous régénérer ?</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {onRegenerateWeek && (
                      <DropdownMenuItem
                        className="flex-col items-start gap-0.5 py-2"
                        onSelect={() => onRegenerateWeek(currentWeek.weekNumber)}
                      >
                        <span className="font-medium">
                          Uniquement la semaine affichée (S{currentWeek.weekNumber})
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Rapide. Le reste du plan reste identique.
                        </span>
                      </DropdownMenuItem>
                    )}
                    {onRegenerateFutureWeeks && (
                      <DropdownMenuItem
                        className="flex-col items-start gap-0.5 py-2"
                        disabled={!currentWeekNumber || currentWeekNumber >= plan.totalWeeks}
                        onSelect={() => onRegenerateFutureWeeks()}
                      >
                        <span className="font-medium">
                          À partir d'aujourd'hui
                          {currentWeekNumber && currentWeekNumber < plan.totalWeeks
                            ? ` (S${currentWeekNumber + 1} → S${plan.totalWeeks})`
                            : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {currentWeekNumber && currentWeekNumber < plan.totalWeeks
                            ? (currentWeekNumber === 1
                                ? "La semaine 1 déjà entamée est conservée."
                                : `Les semaines 1 à ${currentWeekNumber} déjà réalisées sont conservées.`)
                            : "Indisponible : aucune semaine future par rapport à la date du jour."}
                        </span>
                      </DropdownMenuItem>
                    )}
                    {onRegenerateAll && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="flex-col items-start gap-0.5 py-2"
                          onSelect={() => onRegenerateAll()}
                        >
                          <span className="font-medium">
                            Tout le plan (S1 → S{plan.totalWeeks})
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Repart de zéro depuis la date de début. Remplace le plan actuel.
                          </span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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
                {displayPhase(phase.name, phaseLabelMap)} {phase.weeks && `(S${phase.weeks})`}
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

      {/* Gap Ambition Panel — DÉTERMINISTE, calculé côté frontend.
          Réservé aux objectifs course à pied (5K/10K/Semi/Marathon/Trail).
          Non pertinent pour triathlon (swim+bike+run non projetable depuis VMA seule). */}
      {gapContext && (gapContext.ambition || gapContext.objective) && (() => {
        const sport = mapObjectiveToSport(gapContext.objective || "");
        if (sport === "tri_70_3" || sport === "ironman") return null;
        return (
          <GapAmbitionPanel
            vmaKmh={gapContext.vmaKmh}
            thresholdPaceSecPerKm={gapContext.thresholdPaceSecPerKm}
            ambition={gapContext.ambition}
            ambitionEffective={gapContext.ambitionEffective}
            objective={gapContext.objective}
            weeklyHours={gapContext.weeklyHours}
          />
        );
      })()}


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
                  Régénérer cette semaine
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
          <WeekView week={currentWeek} raceGoals={raceGoals} startDate={startDate} nolioCtx={nolioCtx} onReplaceClick={handleReplaceClick} objectifEffectif={gapContext?.objective} planTotalWeeks={plan.totalWeeks} phaseLabelMap={phaseLabelMap} />
        </>
      ) : (
        <div className="space-y-4">
          {plan.weeks.map((week, i) => (
            <WeekView key={i} week={week} raceGoals={raceGoals} startDate={startDate} nolioCtx={nolioCtx} onReplaceClick={handleReplaceClick} objectifEffectif={gapContext?.objective} planTotalWeeks={plan.totalWeeks} phaseLabelMap={phaseLabelMap} />
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
              <div className="text-xs text-muted-foreground whitespace-nowrap hidden sm:block">
                S{anchorWeek} : {format(bulkAnchorMonday, "EEE d MMM", { locale: fr })}
                {anchorWeek > 1 && (
                  <span className="ml-1 opacity-70">
                    (plan : {format(planStartMondayDate, "d MMM", { locale: fr })})
                  </span>
                )}
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
            <DialogTitle>Confirmer l'envoi vers Nolio</DialogTitle>
            <DialogDescription>
              Périmètre :{" "}
              <span className="font-medium text-foreground">
                {scope === "selected" && `Séances sélectionnées (${selectedSessions.length})`}
                {scope === "single" && `Semaine ${scopeWeek}`}
                {scope === "range" && `Semaines ${Math.min(scopeFrom, scopeTo)} à ${Math.max(scopeFrom, scopeTo)}`}
                {scope === "all" && `Plan complet (${allWeekNums.length} semaines)`}
              </span>
              {" · "}Semaine S{anchorWeek} commence le :{" "}
              <span className="font-medium text-foreground">
                {format(bulkAnchorMonday, "EEEE d MMMM yyyy", { locale: fr })}
              </span>
              {anchorWeek > 1 && (
                <>
                  {" · "}
                  <span className="text-muted-foreground">
                    → Le plan complet débute le{" "}
                    <span className="font-medium text-foreground">
                      {format(planStartMondayDate, "EEEE d MMMM yyyy", { locale: fr })}
                    </span>
                  </span>
                </>
              )}
              .
            </DialogDescription>
          </DialogHeader>

          {targetWeekNumbers.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Semaines concernées :{" "}
              {targetWeekNumbers.map((n) => {
                const ps = parseISO(`${computedPlanStart}T00:00:00Z`);
                const dt = addDays(ps, (n - 1) * 7);
                return `S${n} (lun ${format(dt, "d MMM", { locale: fr })})`;
              }).join(" · ")}
            </div>
          )}

          <div className="text-sm">
            <span className="font-medium">{targetSessions.length}</span> séance(s) à envoyer (hors repos).
          </div>

          {alreadySentInScope > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {alreadySentInScope} séance(s) de ce périmètre ont déjà été envoyées sur Nolio.
                Elles seront supprimées et recréées côté Nolio.
              </AlertDescription>
            </Alert>
          )}

          <div className="max-h-[260px] overflow-y-auto space-y-1 border rounded-md p-2 text-xs">
            {targetSessions.map((s) => {
              const ps = parseISO(`${computedPlanStart}T00:00:00Z`);
              const dt = addDays(ps, (s.weekNumber - 1) * 7 + s.dayIndex);
              return (
                <div
                  key={`${s.weekNumber}-${s.dayIndex}-${s.title}`}
                  className="flex items-center justify-between gap-2 py-1 border-b border-border/40 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground whitespace-nowrap">S{s.weekNumber}</span>
                    <span className="font-medium truncate">{(() => {
                      const p = parseSessionTitle(s.title);
                      const c = p.cleanTitle.trim();
                      const isId = c.length >= 4 && !/\s/.test(c) && /^[A-Z0-9_]+$/.test(c);
                      if (isId) {
                        const w = findLibraryWorkoutForSession({ title: s.title, details: s.details });
                        if (w?.objectif) return w.objectif;
                      }
                      return c || s.title;
                    })()}</span>
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
            <Button onClick={handleBulkSend} disabled={bulkSending || targetSessions.length === 0}>
              {bulkSending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi…</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Confirmer l'envoi</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace session dialog */}
      <SessionReplaceDialog
        open={!!replaceTarget}
        onOpenChange={(o) => { if (!o) setReplaceTarget(null); }}
        currentSport={replaceTarget?.sport ?? ""}
        currentTitle={replaceTarget?.title ?? ""}
        onChoose={applyReplacement}
      />
    </div>
    </TargetTableProvider>
  );
}

