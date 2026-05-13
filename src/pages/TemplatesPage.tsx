import { computePotentielEffectif, type PotentielPhysiologiqueEffectif } from "@/lib/potentielPhysiologiqueEffectif";
import { mapSnapshotToV2 } from "@/lib/mapSnapshotToV2";
/**
 * Templates de Programmation Page
 * Displays training templates with optional staff annotations
 * Supports multi-section documents (e.g., Finisher vs Elite plans)
 */
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronLeft, FileText, AlertTriangle, Copy, CheckCircle2, Loader2, User, Layers, Lightbulb, BookOpen, BarChart3, Target, ChevronDown, Info, Zap, Activity, ArrowLeftRight, Beaker, PersonStanding, Users } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

import { PROGRAM_TEMPLATES, getTemplateById } from "@/data/programTemplates";
import { 
  loadProgramTemplateFromDocx, 
  loadProgramSectionsFromDocx,
  clearTemplateCache,
  type TemplateWeek, 
  type TemplateSession,
  type ProgramSection 
} from "@/lib/templates/docxTemplateLoader";

// V2 annotation engine
import { 
  generateTemplateAnnotationsV2, 
  getSeverityColorV2, 
  getSeverityLabelV2,
  getRiskScoreColor,
  getScopeIcon,
  classifySession,
  type AnnotationV2,
  type AthleteSignalsV2,
} from "@/lib/annotationEngineV2";
import { getTemplateProfiles, getClosestProfile, type TemplateProfilePair } from "@/data/templateProfiles";

import { useCloudData, DbAthlete, DbSnapshot } from "@/contexts/CloudDataContext";
import { useAthletes } from "@/contexts/AthleteContext";
import { computeVLamaxEffectif, getSourceColor, getSourceBgColor, type VLamaxSource, computeTTEEffectif } from "@/engines/diagnostic";
import { PlanComparisonView } from "@/components/PlanComparisonView";
import { SessionOptionsDisplay } from "@/components/SessionOptionsDisplay";
import { processSessionOptions, type SessionContext, type OptionSport } from "@/lib/templates/optionValidator";
import { parseDurationFromText } from "@/lib/templates/durationParser";
import { 
  computeCAPInjuryRisk, 
  shouldShowCAPInjuryRisk,
  type CAPInjuryRiskResult 
} from "@/lib/capInjuryRisk";
import { CAPInjuryRiskBadge } from "@/components/CAPInjuryRiskBadge";
import { 
  interpretWahooSession, 
  isWahooLikeSession,
  getVLamaxThreshold,
  getTTETarget,
  type AthleteContext as WahooAthleteContext,
  type PhysiologicalReading,
} from "@/lib/wahoo/wahooWorkoutInterpreter";
import { WahooPhysiologicalReading } from "@/components/WahooPhysiologicalReading";
import { 
  generateWahooSuggestions,
  type SuggestionEngineInput,
  type SuggestionEngineOutput,
} from "@/lib/wahoo/wahooSuggestionEngine";
import { WahooSuggestionsPanel } from "@/components/WahooSuggestionsPanel";
import { WeekSelectorTFCL } from "@/components/WeekSelectorTFCL";
import { RunningTemplateGrid } from "@/components/RunningTemplateViewer";
import { QuickWeekComparisonPanel } from "@/components/QuickWeekComparisonPanel";
import { TriathlonTemplateGrid } from "@/components/TriathlonTemplateGrid";
import { GoalWeekSuggester } from "@/components/GoalWeekSuggester";
import { ExcelPlanImporter } from "@/components/ExcelPlanImporter";
import { RUNNING_TEMPLATES, getWeeksByGoal } from "@/lib/templates/runningTemplatesStore";
import type { RunningTemplate, RunningWeek, WeekSuggestion } from "@/types/runningTemplate";

function getSportBadgeColor(sport: string | undefined): string {
  if (!sport) return "bg-muted text-muted-foreground";
  const lower = sport.toLowerCase();
  if (lower.includes("natation") || lower.includes("swim") || lower.includes("piscine")) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  }
  if (lower.includes("vélo") || lower.includes("velo") || lower.includes("bike")) {
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  }
  if (lower.includes("cap") || lower.includes("course") || lower.includes("run") || lower.includes("c.a.p")) {
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  }
  if (lower.includes("repos") || lower.includes("off") || lower.includes("mobilité") || lower.includes("soins") || lower.includes("social") || lower.includes("plaisir") || lower.includes("bilan")) {
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  }
  if (lower.includes("brick") || lower.includes("vélo + cap") || lower.includes("vélo + run") || lower.includes("activ")) {
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  }
  if (lower.includes("ironman") || lower.includes("marche")) {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }
  return "bg-muted text-muted-foreground";
}

// Parse duration from session description (e.g., "1h30", "45'", "2h00")
function parseDurationMinutes(text: string): number {
  if (!text) return 0;
  
  // Match patterns like "1h30", "1h", "45'", "2h00", "1h15 HT"
  const hourMinMatch = text.match(/(\d+)h(\d+)?/i);
  if (hourMinMatch) {
    const hours = parseInt(hourMinMatch[1], 10);
    const minutes = hourMinMatch[2] ? parseInt(hourMinMatch[2], 10) : 0;
    return hours * 60 + minutes;
  }
  
  // Match patterns like "45'", "30'"
  const minOnlyMatch = text.match(/(\d+)['′]/);
  if (minOnlyMatch) {
    return parseInt(minOnlyMatch[1], 10);
  }
  
  return 0;
}

// Calculate weekly volume by discipline
function calculateWeeklyVolume(sessions: TemplateSession[]): { swim: number; bike: number; run: number; other: number } {
  let swim = 0;
  let bike = 0;
  let run = 0;
  let other = 0;

  sessions.forEach((session) => {
    const discipline = (session.discipline || session.sport || "").toLowerCase();
    const description = session.details || session.description || "";
    const duration = parseDurationMinutes(description);

    if (discipline.includes("natation") || discipline.includes("swim") || discipline.includes("piscine")) {
      swim += duration;
    } else if (discipline.includes("vélo") || discipline.includes("velo") || discipline.includes("bike")) {
      bike += duration;
    } else if (discipline.includes("c.a.p") || discipline.includes("cap") || discipline.includes("course") || discipline.includes("run")) {
      run += duration;
    } else if (discipline.includes("vélo + cap") || discipline.includes("vélo + run") || discipline.includes("brick")) {
      // Parse brick sessions - try to split or estimate
      const parts = description.split("+");
      if (parts.length >= 2) {
        bike += parseDurationMinutes(parts[0]);
        run += parseDurationMinutes(parts[1]);
      } else {
        // Estimate 70/30 split for brick
        bike += Math.round(duration * 0.7);
        run += Math.round(duration * 0.3);
      }
    } else if (!discipline.includes("repos") && !discipline.includes("off") && duration > 0) {
      other += duration;
    }
  });

  return { swim, bike, run, other };
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}'`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function formatHours(minutes: number): number {
  return Math.round(minutes / 60 * 10) / 10;
}

// Calculate volume data by phase for the chart
function calculatePhaseVolumeData(weeks: TemplateWeek[]): { phase: string; phaseShort: string; swim: number; bike: number; run: number; total: number; weeksCount: number }[] {
  const phaseMap = new Map<string, { swim: number; bike: number; run: number; weeksCount: number }>();
  const phaseOrder: string[] = [];
  
  weeks.forEach((week) => {
    const phase = week.phase || `Semaine ${week.weekNumber}`;
    const volume = calculateWeeklyVolume(week.sessions);
    
    if (!phaseMap.has(phase)) {
      phaseMap.set(phase, { swim: 0, bike: 0, run: 0, weeksCount: 0 });
      phaseOrder.push(phase);
    }
    
    const current = phaseMap.get(phase)!;
    current.swim += volume.swim;
    current.bike += volume.bike;
    current.run += volume.run;
    current.weeksCount += 1;
  });
  
  return phaseOrder.map((phase) => {
    const vol = phaseMap.get(phase)!;
    return {
      phase,
      phaseShort: phase.length > 20 ? phase.slice(0, 17) + "…" : phase,
      swim: formatHours(vol.swim),
      bike: formatHours(vol.bike),
      run: formatHours(vol.run),
      total: formatHours(vol.swim + vol.bike + vol.run),
      weeksCount: vol.weeksCount,
    };
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0]?.payload;
  
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="font-semibold text-sm text-foreground mb-2">{data?.phase}</p>
      <p className="text-xs text-muted-foreground mb-2">{data?.weeksCount} semaine(s)</p>
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">
              {entry.dataKey === 'swim' ? '🏊 Natation' : entry.dataKey === 'bike' ? '🚴 Vélo' : '🏃 CAP'}:
            </span>
            <span className="font-mono font-medium">{entry.value}h</span>
          </div>
        ))}
        <div className="border-t border-border pt-1 mt-1 flex items-center gap-2 text-sm font-semibold">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-mono">{data?.total}h</span>
        </div>
      </div>
    </div>
  );
};

function PhaseVolumeChart({ weeks }: { weeks: TemplateWeek[] }) {
  const data = useMemo(() => calculatePhaseVolumeData(weeks), [weeks]);
  
  if (data.length === 0) return null;

  const totalHours = data.reduce((acc, d) => acc + d.total, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Volume par Phase
          </CardTitle>
          <Badge variant="secondary" className="font-mono">
            {totalHours.toFixed(0)}h total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">
              {data.reduce((acc, d) => acc + d.swim, 0).toFixed(1)}h
            </div>
            <div className="text-xs text-muted-foreground">🏊 Natation</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-600 dark:text-green-400 font-mono">
              {data.reduce((acc, d) => acc + d.bike, 0).toFixed(1)}h
            </div>
            <div className="text-xs text-muted-foreground">🚴 Vélo</div>
          </div>
          <div className="bg-orange-500/10 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400 font-mono">
              {data.reduce((acc, d) => acc + d.run, 0).toFixed(1)}h
            </div>
            <div className="text-xs text-muted-foreground">🏃 CAP</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              margin={{ top: 10, right: 10, left: -10, bottom: 60 }}
              barCategoryGap="20%"
            >
              <XAxis 
                dataKey="phaseShort" 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                angle={-35}
                textAnchor="end"
                height={70}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                tickFormatter={(v) => `${v}h`}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }} />
              <Legend 
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-sm">
                    {value === 'swim' ? '🏊 Natation' : value === 'bike' ? '🚴 Vélo' : '🏃 CAP'}
                  </span>
                )}
              />
              <Bar 
                dataKey="swim" 
                stackId="a" 
                fill="hsl(217, 91%, 60%)" 
                name="swim" 
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="bike" 
                stackId="a" 
                fill="hsl(142, 71%, 45%)" 
                name="bike" 
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="run" 
                stackId="a" 
                fill="hsl(24, 95%, 53%)" 
                name="run" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}


function getPhaseForWeek(weekNumber: number, totalWeeks: number): { name: string; color: string } {
  const ratio = weekNumber / totalWeeks;
  
  // Last 2 weeks = Taper
  if (weekNumber > totalWeeks - 2) {
    return { name: "Affûtage", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
  }
  
  // First 30% = Préparation (base building)
  if (ratio <= 0.3) {
    return { name: "Préparation", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" };
  }
  
  // 30-70% = Build
  if (ratio <= 0.7) {
    return { name: "Build", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };
  }
  
  // 70-90% = Spécifique
  return { name: "Spécifique", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" };
}

function SessionCard({ 
  session, 
  sessionAnnotations, 
  staffMode = false, 
  weekPhase,
  capInjuryRisk,
  wahooContext,
  sessionId,
  isExpanded,
  onToggleExpand,
}: { 
  session: TemplateSession; 
  sessionAnnotations: AnnotationV2[]; 
  staffMode?: boolean; 
  weekPhase?: string;
  capInjuryRisk?: CAPInjuryRiskResult | null;
  wahooContext?: WahooAthleteContext | null;
  sessionId: string;
  isExpanded: boolean;
  onToggleExpand: (sessionId: string) => void;
}) {
  const classification = classifySession(session);

  const displayDetails = session.details || session.description || "";
  const displayNotes = session.notes || "";
  
  const hasAnnotations = sessionAnnotations.length > 0;
  const maxSeverity = hasAnnotations ? Math.max(...sessionAnnotations.map(a => a.severity)) : 0;
  
  // v6: Check for sanity warnings from parsing
  const hasParsingWarnings = staffMode && session._warnings && session._warnings.length > 0;
  
  // v7: Process options with sport-contextualized validation
  const processedOptions = useMemo(() => {
    if (!displayDetails) return null;
    
    const sportText = (session.sport || session.discipline || "").toLowerCase();
    let sport: OptionSport = "UNKNOWN";
    if (sportText.includes("vélo") || sportText.includes("bike")) sport = "VÉLO";
    else if (sportText.includes("cap") || sportText.includes("run") || sportText.includes("course")) sport = "CAP";
    else if (sportText.includes("natation") || sportText.includes("swim")) sport = "NATATION";
    else if (sportText.includes("brick")) sport = "BRICK";
    
    const durationText = session.title || displayDetails;
    const parsedDuration = parseDurationFromText(durationText);
    
    const context: SessionContext = {
      sport,
      durationMin: session.durationMin || parsedDuration?.target || 60,
      sessionType: session.type || session.title,
      phase: weekPhase,
      isLongSession: /long|sortie\s*longue/i.test((session.title || "") + " " + displayDetails),
    };
    
    return processSessionOptions(displayDetails, context);
  }, [displayDetails, session, weekPhase]);
  
  const hasValidOptions = processedOptions && processedOptions.validOptions.length > 0;
  const hasBlockedOptions = processedOptions && (processedOptions.blockedOptions.length > 0 || processedOptions.genericOptions.length > 0);
  
  // v8: Determine if CAP injury risk should be shown for this session
  const sportText = (session.sport || session.discipline || "").toLowerCase();
  const isCAP = sportText.includes("cap") || sportText.includes("run") || sportText.includes("course");
  const sessionDurationMin = session.durationMin || 0;
  const hasLongCAPOption = processedOptions?.hasLongCAPOption || false;
  const showCAPInjuryRisk = staffMode && isCAP && capInjuryRisk && 
    shouldShowCAPInjuryRisk(sportText, sessionDurationMin, hasLongCAPOption);

  // v9: Wahoo SYSTM physiological reading
  const wahooReading = useMemo<PhysiologicalReading | null>(() => {
    if (!staffMode || !wahooContext) return null;
    // Only interpret if it looks like a Wahoo session or staff mode is on
    const looksLikeWahoo = isWahooLikeSession(session);
    if (!looksLikeWahoo) return null;
    return interpretWahooSession(session, wahooContext);
  }, [session, staffMode, wahooContext]);

  return (
    <div className={`border rounded-lg p-3 bg-card ${hasAnnotations ? "border-l-4 " + (maxSeverity >= 2 ? "border-l-amber-500" : "border-l-blue-400") : ""}`}>
      <div className="flex items-start gap-2">
        <Badge className={`shrink-0 text-xs ${getSportBadgeColor(session.discipline || session.sport)}`}>
          {session.discipline || session.sport || "—"}
        </Badge>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground">{session.day}</span>
            {session.title && (
              <span className="text-sm text-muted-foreground">• {session.title}</span>
            )}
            {classification.isKey && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                Clé
              </Badge>
            )}
            {session.durationMin && (
              <Badge variant="outline" className="text-[10px] font-mono">
                {session.durationMin}'
              </Badge>
            )}
          </div>
          {displayDetails && (
            <>
              {displayDetails.length > 80 ? (
                <div className="mt-1">
                  <p className="text-xs text-muted-foreground">
                    {isExpanded ? displayDetails : displayDetails.slice(0, 80) + "..."}
                  </p>
                  <button
                    onClick={() => onToggleExpand(sessionId)}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    {isExpanded ? "Réduire" : "Voir détails"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">{displayDetails}</p>
              )}
            </>
          )}
          {displayNotes && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">
              💡 {displayNotes}
            </p>
          )}
          
          {/* v8: CAP Injury Risk Badge (staff only, for long CAP sessions) */}
          {showCAPInjuryRisk && capInjuryRisk && (
            <div className="mt-2">
              <CAPInjuryRiskBadge risk={capInjuryRisk} staffMode={staffMode} />
            </div>
          )}
          
          {/* v9: Wahoo SYSTM Physiological Reading (staff mode only) */}
          {wahooReading && wahooReading.isWahooSession && (
            <WahooPhysiologicalReading 
              reading={wahooReading} 
              staffMode={staffMode}
              athleteMode={!staffMode}
            />
          )}
          
          {/* v7: Sport-contextualized options display */}
          {(hasValidOptions || (staffMode && hasBlockedOptions)) && processedOptions && (
            <SessionOptionsDisplay
              validOptions={processedOptions.validOptions}
              blockedOptions={processedOptions.blockedOptions}
              genericOptionsRemoved={processedOptions.genericOptions}
              staffMode={staffMode}
              capInjuryRisk={isCAP ? capInjuryRisk : null}
            />
          )}
          
          {/* v6: Staff-only parsing warnings */}
          {hasParsingWarnings && (
            <div className="mt-1">
              {session._warnings!.map((w, i) => (
                <Badge key={i} variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300">
                  ⚠️ {w.message.slice(0, 50)}...
                </Badge>
              ))}
            </div>
          )}
          
          {/* Session-level annotations */}
          {hasAnnotations && (
            <div className="mt-2 space-y-1">
              {sessionAnnotations.map((ann) => (
                <SessionAnnotationBadge key={ann.id} annotation={ann} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionAnnotationBadge({ annotation }: { annotation: AnnotationV2 }) {
  const [showOptions, setShowOptions] = useState(false);
  
  return (
    <div className="text-xs bg-muted/50 rounded p-2 space-y-1">
      <div className="flex items-center gap-2">
        <Badge className={`text-[10px] ${getSeverityColorV2(annotation.severity)}`}>
          {getSeverityLabelV2(annotation.severity)}
        </Badge>
        <span className={`font-mono text-[10px] ${getRiskScoreColor(annotation.riskScore)}`}>
          R:{annotation.riskScore}
        </span>
        <span className="font-medium">{annotation.title}</span>
      </div>
      <p className="text-muted-foreground">{annotation.message}</p>
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="text-primary hover:underline flex items-center gap-1"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${showOptions ? "rotate-180" : ""}`} />
        Options coach
      </button>
      {showOptions && (
        <ul className="list-disc list-inside text-muted-foreground pl-2 space-y-0.5">
          {annotation.options.map((opt, i) => (
            <li key={i}>{opt}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CoachAdviceCard({ advice }: { advice: string }) {
  return (
    <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-amber-900 dark:text-amber-200 mb-2">
              Conseils du Coach
            </p>
            <div className="text-sm text-amber-800 dark:text-amber-300 whitespace-pre-line">
              {advice}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WeekVolumeBar({ volume }: { volume: { swim: number; bike: number; run: number; other: number } }) {
  const total = volume.swim + volume.bike + volume.run + volume.other;
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      {volume.swim > 0 && (
        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
          🏊 {formatDuration(volume.swim)}
        </span>
      )}
      {volume.bike > 0 && (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          🚴 {formatDuration(volume.bike)}
        </span>
      )}
      {volume.run > 0 && (
        <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
          🏃 {formatDuration(volume.run)}
        </span>
      )}
      <span className="text-muted-foreground ml-1">
        = {formatDuration(total)}
      </span>
    </div>
  );
}

function WeekRiskSummary({ weekAnnotations }: { weekAnnotations: AnnotationV2[] }) {
  const criticals = weekAnnotations.filter(a => a.severity === 3).length;
  const warnings = weekAnnotations.filter(a => a.severity === 2).length;
  const notes = weekAnnotations.filter(a => a.severity <= 1).length;
  
  if (criticals === 0 && warnings === 0 && notes === 0) return null;
  
  return (
    <div className="flex items-center gap-2 text-xs">
      {criticals > 0 && (
        <Badge variant="destructive" className="text-[10px]">
          {criticals} risque{criticals > 1 ? "s" : ""}
        </Badge>
      )}
      {warnings > 0 && (
        <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          {warnings} attention
        </Badge>
      )}
      {notes > 0 && criticals === 0 && warnings === 0 && (
        <Badge variant="secondary" className="text-[10px]">
          {notes} note{notes > 1 ? "s" : ""}
        </Badge>
      )}
    </div>
  );
}

function WeekSection({ week, annotations, totalWeeks, staffMode, capInjuryRisk, wahooContext, expandedSessions, onToggleSessionExpand }: { week: TemplateWeek; annotations: AnnotationV2[]; totalWeeks: number; staffMode: boolean; capInjuryRisk?: CAPInjuryRiskResult | null; wahooContext?: WahooAthleteContext | null; expandedSessions: Set<string>; onToggleSessionExpand: (sessionId: string) => void }) {
  const weekAnnotations = annotations.filter((a) => a.scope === "WEEK" && a.weekNumber === week.weekNumber);
  const sessionAnnotationsMap = useMemo(() => {
    const map: Record<string, AnnotationV2[]> = {};
    annotations.filter(a => a.scope === "SESSION" && a.weekNumber === week.weekNumber).forEach(ann => {
      const key = `${ann.day}-${ann.sessionTitle || ""}`;
      if (!map[key]) map[key] = [];
      map[key].push(ann);
    });
    return map;
  }, [annotations, week.weekNumber]);
  
  const phase = week.phase || getPhaseForWeek(week.weekNumber, totalWeeks).name;
  const phaseStyle = week.phase ? "bg-muted text-muted-foreground" : getPhaseForWeek(week.weekNumber, totalWeeks).color;
  const volume = calculateWeeklyVolume(week.sessions);

  return (
    <AccordionItem value={`week-${week.weekNumber}`} className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex flex-col items-start gap-2 w-full">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-semibold">Semaine {week.weekNumber}</span>
            {week.theme && (
              <span className="text-sm text-muted-foreground">— {week.theme}</span>
            )}
            <Badge className={`text-xs ${phaseStyle}`}>
              {phase}
            </Badge>
            {week.coachAdvice && (
              <Lightbulb className="h-4 w-4 text-amber-500" />
            )}
            {staffMode && <WeekRiskSummary weekAnnotations={weekAnnotations} />}
          </div>
          <WeekVolumeBar volume={volume} />
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3 pt-2 pb-4">
          {/* Week-level annotations */}
          {staffMode && weekAnnotations.length > 0 && (
            <div className="space-y-2 mb-4">
              {weekAnnotations.map((ann) => (
                <AnnotationCardV2 key={ann.id} annotation={ann} compact />
              ))}
            </div>
          )}
          
          {week.sessions.map((session, idx) => {
            const key = `${session.day}-${session.title || ""}`;
            const sessionAnns = sessionAnnotationsMap[key] || [];
            const sessionId = `week-${week.weekNumber}-session-${idx}`;
            return (
              <SessionCard 
                key={idx} 
                session={session} 
                sessionAnnotations={staffMode ? sessionAnns : []}
                staffMode={staffMode}
                weekPhase={phase}
                capInjuryRisk={capInjuryRisk}
                wahooContext={wahooContext}
                sessionId={sessionId}
                isExpanded={expandedSessions.has(sessionId)}
                onToggleExpand={onToggleSessionExpand}
              />
            );
          })}
          
          {/* Coach Advice Card */}
          {week.coachAdvice && (
            <CoachAdviceCard advice={week.coachAdvice} />
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function AnnotationCardV2({ annotation, compact = false }: { annotation: AnnotationV2; compact?: boolean }) {
  const [showWhy, setShowWhy] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  return (
    <Card className={`border-l-4 ${annotation.severity >= 3 ? "border-l-red-500" : annotation.severity >= 2 ? "border-l-amber-500" : "border-l-blue-500"}`}>
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <Badge className={`text-xs ${getSeverityColorV2(annotation.severity)}`}>
              {getSeverityLabelV2(annotation.severity)}
            </Badge>
            <span className={`font-mono text-xs font-semibold ${getRiskScoreColor(annotation.riskScore)}`}>
              {annotation.riskScore}
            </span>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm">{getScopeIcon(annotation.scope)}</span>
              <p className="font-medium text-sm text-foreground">{annotation.title}</p>
              {annotation.weekNumber && annotation.scope !== "PLAN" && (
                <Badge variant="outline" className="text-[10px]">S{annotation.weekNumber}</Badge>
              )}
              {annotation.day && (
                <Badge variant="outline" className="text-[10px]">{annotation.day}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{annotation.message}</p>
            
            <div className="flex gap-3 text-xs">
              <button
                onClick={() => setShowWhy(!showWhy)}
                className="text-primary hover:underline flex items-center gap-1"
              >
                <Info className="h-3 w-3" />
                Pourquoi ?
              </button>
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="text-primary hover:underline flex items-center gap-1"
              >
                <Zap className="h-3 w-3" />
                Options ({annotation.options.length})
              </button>
            </div>
            
            {showWhy && (
              <p className="text-xs text-muted-foreground/80 italic bg-muted/30 rounded p-2">
                {annotation.why}
              </p>
            )}
            
            {showOptions && (
              <div className="bg-muted/30 rounded p-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Options Coach :</p>
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                  {annotation.options.map((opt, i) => (
                    <li key={i}>{opt}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AthleteProfilePanel({
  athlete,
  snapshot,
  vlamaxEffectif,
  tteEffectif,
  potentielScore,
  tss7d,
}: {
  athlete: DbAthlete;
  snapshot: DbSnapshot | null;
  vlamaxEffectif: { value: number | null; source: string; confidence: number };
  tteEffectif: { value: number | null; source: string; confidence: number };
  potentielScore: number | null;
  tss7d: number | null;
}) {
  const ftpKg = snapshot?.ftp && snapshot?.weight_kg 
    ? (snapshot.ftp / snapshot.weight_kg).toFixed(2) 
    : null;
    
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Profil Athlète Actuel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{athlete.name}</span>
          <Badge variant="outline">{athlete.goal || "IM"}</Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <MetricBox 
            label="VLamax" 
            value={vlamaxEffectif.value?.toFixed(2) || "—"} 
            unit="mmol/L/s"
            source={vlamaxEffectif.source}
            confidence={vlamaxEffectif.confidence}
          />
          <MetricBox 
            label="TTE" 
            value={tteEffectif.value?.toFixed(0) || "—"} 
            unit="min"
            source={tteEffectif.source}
            confidence={tteEffectif.confidence}
          />
          <MetricBox 
            label="FTP/kg" 
            value={ftpKg || "—"} 
            unit="W/kg"
          />
          <MetricBox 
            label="Readiness" 
            value={potentielScore?.toFixed(0) || "—"} 
            unit="%"
          />
        </div>
        
        {tss7d && (
          <div className="text-xs text-muted-foreground">
            TSS 7j: <span className="font-mono font-medium">{tss7d.toFixed(0)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getSourceLabel(source: VLamaxSource): string {
  switch (source) {
    case "test": return "test";
    case "snapshot": return "mesuré";
    case "estimated": return "estimé";
    case "unknown": return "inconnu";
    default: return source;
  }
}

function MetricBox({ label, value, unit, source, confidence }: { 
  label: string; 
  value: string; 
  unit?: string;
  source?: VLamaxSource | string;
  confidence?: number;
}) {
  const isVLamaxSource = source && ["test", "snapshot", "estimated", "unknown"].includes(source);
  
  return (
    <div className="bg-background/60 rounded-lg p-2 text-center relative">
      <div className="flex items-center justify-center gap-1.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        {isVLamaxSource && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${getSourceBgColor(source as VLamaxSource)} ${getSourceColor(source as VLamaxSource)}`}>
            {getSourceLabel(source as VLamaxSource)}
          </span>
        )}
      </div>
      <p className="font-mono text-lg font-bold">{value}</p>
      {unit && <p className="text-[10px] text-muted-foreground">{unit}</p>}
      {source && (
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
          {source === "test_labo" ? "🧪 Labo" : source === "test_terrain" ? "🏃 Terrain" : source === "observed" ? "📋 Observé" : "📐 Estim."}
        </p>
      )}
    </div>
  );
}

function TemplateProfilesPanel({ 
  profiles, 
  athleteMatch,
  selectedComparison,
  onComparisonChange,
}: { 
  profiles: TemplateProfilePair; 
  athleteMatch: { closest: "PERFORMANCE" | "INTERMEDIAIRE"; score: number; details: string };
  selectedComparison: "PERFORMANCE" | "INTERMEDIAIRE";
  onComparisonChange: (v: "PERFORMANCE" | "INTERMEDIAIRE") => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Profils Cibles du Template
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Match indicator */}
        <div className={`rounded-lg p-3 ${athleteMatch.closest === "PERFORMANCE" ? "bg-green-500/10 border border-green-500/30" : "bg-amber-500/10 border border-amber-500/30"}`}>
          <div className="flex items-center gap-2">
            <Activity className={`h-4 w-4 ${athleteMatch.closest === "PERFORMANCE" ? "text-green-600" : "text-amber-600"}`} />
            <span className="text-sm font-medium">
              Athlète plus proche de : <strong>{athleteMatch.closest}</strong> ({athleteMatch.score}%)
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{athleteMatch.details}</p>
        </div>
        
        {/* Profile cards */}
        <div className="grid gap-3">
          <ProfileCard 
            profile={profiles.performance} 
            isSelected={selectedComparison === "PERFORMANCE"}
            onClick={() => onComparisonChange("PERFORMANCE")}
          />
          <ProfileCard 
            profile={profiles.intermediaire} 
            isSelected={selectedComparison === "INTERMEDIAIRE"}
            onClick={() => onComparisonChange("INTERMEDIAIRE")}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileCard({ 
  profile, 
  isSelected, 
  onClick 
}: { 
  profile: { name: string; targetTime: string; description: string; targets: any }; 
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg p-3 border transition-all ${isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:border-primary/50"}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm">{profile.name}</span>
        <Badge variant="outline" className="text-xs">{profile.targetTime}</Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{profile.description}</p>
      <div className="flex flex-wrap gap-2 text-[10px]">
        <span className="bg-muted px-1.5 py-0.5 rounded">
          VLa: {profile.targets.vlamax_min.toFixed(2)}-{profile.targets.vlamax_max.toFixed(2)}
        </span>
        <span className="bg-muted px-1.5 py-0.5 rounded">
          TTE: ≥{profile.targets.tte_min}'
        </span>
        <span className="bg-muted px-1.5 py-0.5 rounded">
          FTP/kg: ≥{profile.targets.ftpkg_min}
        </span>
      </div>
    </button>
  );
}

function AnnotationsPanelV2({ annotations }: { annotations: AnnotationV2[] }) {
  const planAnnotations = annotations.filter(a => a.scope === "PLAN");
  const weekAnnotations = annotations.filter(a => a.scope === "WEEK");
  const sessionAnnotations = annotations.filter(a => a.scope === "SESSION");
  
  if (annotations.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 border rounded-lg bg-muted/30">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span>Aucune alerte détectée pour ce template.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PLAN annotations */}
      {planAnnotations.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <span className="text-lg">📋</span> Annotations Plan Global
            <Badge variant="secondary" className="text-xs">{planAnnotations.length}</Badge>
          </h4>
          {planAnnotations.map((ann) => (
            <AnnotationCardV2 key={ann.id} annotation={ann} />
          ))}
        </div>
      )}
      
      {/* WEEK annotations summary */}
      {weekAnnotations.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 font-semibold text-sm w-full justify-between hover:text-primary transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span> Annotations par Semaine
              <Badge variant="secondary" className="text-xs">{weekAnnotations.length}</Badge>
            </div>
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-3">
            {weekAnnotations.map((ann) => (
              <AnnotationCardV2 key={ann.id} annotation={ann} compact />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
      
      {/* SESSION annotations summary */}
      {sessionAnnotations.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 font-semibold text-sm w-full justify-between hover:text-primary transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏃</span> Annotations par Séance
              <Badge variant="secondary" className="text-xs">{sessionAnnotations.length}</Badge>
            </div>
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-3">
            {sessionAnnotations.map((ann) => (
              <AnnotationCardV2 key={ann.id} annotation={ann} compact />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { snapshots, tests, loading: cloudLoading } = useCloudDataContext();
  
  // ✅ Utiliser AthleteContext pour synchroniser avec le Dashboard
  const { athletes, selectedAthleteId, setSelectedAthleteId } = useAthletes();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    return localStorage.getItem("vlab-selected-template") || PROGRAM_TEMPLATES[0]?.id || "";
  });
  const [weeks, setWeeks] = useState<TemplateWeek[]>([]);
  const [sections, setSections] = useState<ProgramSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(() => {
    return localStorage.getItem("vlab-template-loaded") === "true";
  });
  const [staffMode, setStaffMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("vlab-templates-staff-mode");
    return saved === "true";
  });
  
  // Persist staff mode to localStorage
  useEffect(() => {
    localStorage.setItem("vlab-templates-staff-mode", staffMode.toString());
  }, [staffMode]);
  const [comparisonProfile, setComparisonProfile] = useState<"PERFORMANCE" | "INTERMEDIAIRE">("PERFORMANCE");
  const [showComparisonMode, setShowComparisonMode] = useState(false);
  
  // Persist accordion open state with associated template/section context
  const [openWeekAccordion, setOpenWeekAccordion] = useState<string | undefined>(() => {
    const saved = localStorage.getItem("vlab-open-week-accordion");
    if (saved) {
      try {
        return JSON.parse(saved).weekId;
      } catch {
        return undefined;
      }
    }
    return undefined;
  });
  
  // Store the template/section context along with the accordion state
  const savedAccordionContext = useRef<{ templateId: string; sectionId: string | null } | null>(
    (() => {
      const saved = localStorage.getItem("vlab-open-week-accordion");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { templateId: parsed.templateId, sectionId: parsed.sectionId };
        } catch {
          return null;
        }
      }
      return null;
    })()
  );
  
  // Persist accordion state to localStorage with context
  useEffect(() => {
    if (openWeekAccordion && selectedSectionId) {
      localStorage.setItem("vlab-open-week-accordion", JSON.stringify({
        weekId: openWeekAccordion,
        templateId: selectedTemplateId,
        sectionId: selectedSectionId
      }));
    }
  }, [openWeekAccordion, selectedTemplateId, selectedSectionId]);
  
  // Check if context changed and reset accordion if needed
  const hasCheckedContext = useRef(false);
  useEffect(() => {
    if (!selectedSectionId || hasCheckedContext.current) return;
    
    // Only check once when selectedSectionId becomes available
    hasCheckedContext.current = true;
    
    const savedContext = savedAccordionContext.current;
    if (savedContext) {
      // If context doesn't match, clear the accordion
      if (savedContext.templateId !== selectedTemplateId || savedContext.sectionId !== selectedSectionId) {
        setOpenWeekAccordion(undefined);
        localStorage.removeItem("vlab-open-week-accordion");
        setExpandedSessions(new Set());
        localStorage.removeItem("vlab-expanded-sessions");
      }
    }
  }, [selectedSectionId, selectedTemplateId]);
  
  // Track template/section changes after initial load
  const prevTemplateId = useRef<string | null>(null);
  const prevSectionId = useRef<string | null>(null);
  
  useEffect(() => {
    // Skip if sectionId not yet loaded
    if (!selectedSectionId) return;
    
    // Initialize refs on first valid state
    if (prevTemplateId.current === null) {
      prevTemplateId.current = selectedTemplateId;
      prevSectionId.current = selectedSectionId;
      return;
    }
    
    // Reset only if template or section actually changed by user
    if (prevTemplateId.current !== selectedTemplateId || prevSectionId.current !== selectedSectionId) {
      setOpenWeekAccordion(undefined);
      localStorage.removeItem("vlab-open-week-accordion");
      setExpandedSessions(new Set());
      localStorage.removeItem("vlab-expanded-sessions");
      prevTemplateId.current = selectedTemplateId;
      prevSectionId.current = selectedSectionId;
    }
  }, [selectedTemplateId, selectedSectionId]);
  
  // Persist expanded sessions state
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("vlab-expanded-sessions");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  const handleToggleSessionExpand = useCallback((sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      localStorage.setItem("vlab-expanded-sessions", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const selectedTemplate = useMemo(
    () => getTemplateById(selectedTemplateId),
    [selectedTemplateId]
  );

  // ✅ L'athlète sélectionné est maintenant géré par AthleteContext
  // et synchronisé avec le Dashboard automatiquement

  // Persist selected section per template
  useEffect(() => {
    if (selectedTemplate && sections.length > 0) {
      const cacheKey = `selectedSection_${selectedTemplate.docxPath}`;
      const saved = localStorage.getItem(cacheKey);
      if (saved && sections.some((s) => s.sectionId === saved)) {
        setSelectedSectionId(saved);
      } else {
        setSelectedSectionId(sections[0].sectionId);
      }
    }
  }, [selectedTemplate, sections]);

  // Save selected section to localStorage
  useEffect(() => {
    if (selectedTemplate && selectedSectionId) {
      const cacheKey = `selectedSection_${selectedTemplate.docxPath}`;
      localStorage.setItem(cacheKey, selectedSectionId);
    }
  }, [selectedTemplate, selectedSectionId]);

  // Persist selected template ID
  useEffect(() => {
    localStorage.setItem("vlab-selected-template", selectedTemplateId);
  }, [selectedTemplateId]);

  // Persist loaded state
  useEffect(() => {
    localStorage.setItem("vlab-template-loaded", isLoaded ? "true" : "false");
  }, [isLoaded]);


  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.id === selectedAthleteId) || null,
    [athletes, selectedAthleteId]
  );

  const selectedSnapshot = useMemo(() => {
    if (!selectedAthlete) return null;
    const athleteSnapshots = snapshots.filter((s) => s.athlete_id === selectedAthlete.id);
    if (selectedAthlete.active_snapshot_id) {
      return athleteSnapshots.find((s) => s.id === selectedAthlete.active_snapshot_id) || athleteSnapshots[0] || null;
    }
    return athleteSnapshots.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;
  }, [selectedAthlete, snapshots]);

  // Get weeks to display (from selected section or flat weeks)
  const displayedWeeks = useMemo(() => {
    if (sections.length > 1 && selectedSectionId) {
      const section = sections.find((s) => s.sectionId === selectedSectionId);
      return section?.weeks || [];
    }
    return weeks;
  }, [sections, selectedSectionId, weeks]);

  // Get briefing from current section
  const currentBriefing = useMemo(() => {
    if (sections.length > 0) {
      if (selectedSectionId) {
        const section = sections.find((s) => s.sectionId === selectedSectionId);
        return section?.briefing || null;
      }
      return sections[0]?.briefing || null;
    }
    return null;
  }, [sections, selectedSectionId]);

  // Get template profiles
  const templateProfiles = useMemo(() => {
    return getTemplateProfiles(selectedTemplateId);
  }, [selectedTemplateId]);

  // Compute athlete metrics
  const athleteMetrics = useMemo(() => {
    if (!selectedAthlete || !selectedSnapshot) {
      return { 
        vlamaxEffectif: { value: null, source: "unknown", confidence: 0 }, 
        tteEffectif: { value: null, source: "unknown", confidence: 0 }, 
        potentielScore: null, 
        tss7d: null,
        ftpKg: null,
        signals: null,
      };
    }

    // VLamax effectif - use all tests and snapshots for accurate calculation
    const athleteTests = tests.filter(t => t.athlete_id === selectedAthlete.id);
    const athleteSnapshots = snapshots.filter(s => s.athlete_id === selectedAthlete.id);
    
    const vlamaxEffectif = computeVLamaxEffectif({
      athleteId: selectedAthlete.id,
      objectif: selectedAthlete.goal || "IM",
      activeSnapshotId: selectedAthlete.active_snapshot_id,
      tests: athleteTests.map(t => ({
        athlete_id: t.athlete_id,
        vlamax: t.vlamax,
        date: t.date,
        type: t.type,
        name: t.name,
      })),
      snapshots: athleteSnapshots.map(mapSnapshotToV2),
    });

    // TTE effectif
    const tteEffectif = computeTTEEffectif({
      ftp: selectedSnapshot.ftp,
      tss_7d: selectedSnapshot.tss_7d,
      tte_mode: selectedSnapshot.tte_mode,
      tte_observed_min: selectedSnapshot.tte_observed_min,
      objectif: selectedAthlete.goal || "IM",
    });

    // Potentiel Physiologique effectif
    const potentielEffectif = computePotentielEffectif({
      objectif: selectedAthlete.goal || "IM",
      vlamaxEffectif,
      tteEffectif,
      ftp: selectedSnapshot.ftp,
      poids: selectedSnapshot.weight_kg,
    });

    const ftpKg = selectedSnapshot.ftp && selectedSnapshot.weight_kg 
      ? selectedSnapshot.ftp / selectedSnapshot.weight_kg 
      : null;

    const signals: AthleteSignalsV2 = {
      objectif: selectedAthlete.goal || "IM",
      sportPrincipal: (selectedSnapshot as any).sport_main || undefined,
      vlamax: vlamaxEffectif.value != null 
        ? { value: vlamaxEffectif.value, source: vlamaxEffectif.source, confidence: vlamaxEffectif.confidence }
        : null,
      tte: tteEffectif.tte_min != null 
        ? { value: tteEffectif.tte_min, source: tteEffectif.source, confidence: tteEffectif.confidence }
        : null,
      ftpKg,
      tss7d: selectedSnapshot.tss_7d,
      fatigueState: (selectedSnapshot as any).fatigue_state,
      poids: selectedSnapshot.weight_kg,
    };

    return {
      vlamaxEffectif: { 
        value: vlamaxEffectif.value, 
        source: vlamaxEffectif.source, 
        confidence: vlamaxEffectif.confidence 
      },
      tteEffectif: { 
        value: tteEffectif.tte_min, 
        source: tteEffectif.source, 
        confidence: tteEffectif.confidence 
      },
      potentielScore: potentielEffectif.score,
      tss7d: selectedSnapshot.tss_7d,
      ftpKg,
      signals,
    };
  }, [selectedAthlete, selectedSnapshot]);

  // Compute profile match
  const profileMatch = useMemo(() => {
    if (!templateProfiles || !athleteMetrics.signals) {
      return { closest: "INTERMEDIAIRE" as const, score: 50, details: "" };
    }
    return getClosestProfile(
      athleteMetrics.vlamaxEffectif.value,
      athleteMetrics.tteEffectif.value,
      athleteMetrics.ftpKg,
      templateProfiles
    );
  }, [templateProfiles, athleteMetrics]);

  // Build AthleteTruthRunning for GoalWeekSuggester synchronization
  const athleteTruthRunning = useMemo(() => {
    if (!selectedAthlete || !selectedSnapshot) return undefined;
    
    // Calculate age from birth_date
    let age: number | null = null;
    if (selectedAthlete.birth_date) {
      const birthDate = new Date(selectedAthlete.birth_date);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Map fatigue state to index and level
    const fatigueState = (selectedSnapshot as any)?.fatigue_state;
    let fatigueIndex = 40;
    let fatigueLevel = "MODERE";
    if (fatigueState === "high" || fatigueState === "élevé") {
      fatigueIndex = 70;
      fatigueLevel = "ELEVE";
    } else if (fatigueState === "low" || fatigueState === "faible") {
      fatigueIndex = 20;
      fatigueLevel = "FAIBLE";
    } else if (fatigueState === "ok" || fatigueState === "moderate") {
      fatigueIndex = 45;
      fatigueLevel = "MODERE";
    }

    // Compute CAP injury risk locally (to avoid circular dependency)
    const localInjuryRisk = computeCAPInjuryRisk({
      vlamaxValue: athleteMetrics.vlamaxEffectif.value,
      tteValue: athleteMetrics.tteEffectif.value,
      objectif: selectedAthlete.goal || "marathon",
    });

    return {
      vlamax_run: {
        value: athleteMetrics.vlamaxEffectif.value,
        confidence: athleteMetrics.vlamaxEffectif.confidence || 0.5,
        source: athleteMetrics.vlamaxEffectif.source || "unknown",
      },
      tte_run: {
        value: athleteMetrics.tteEffectif.value,
        confidence: athleteMetrics.tteEffectif.confidence || 0.5,
        source: athleteMetrics.tteEffectif.source || "unknown",
      },
      fatigueIndex,
      fatigueLevel,
      runInjuryRisk: {
        score: localInjuryRisk.totalScore,
        level: localInjuryRisk.label,
      },
      economy_run: selectedSnapshot.run_economy_score ? {
        score: selectedSnapshot.run_economy_score,
        label: selectedSnapshot.run_economy_label || "Moyenne",
      } : undefined,
      age,
      sex: selectedAthlete.sex,
      objectif: selectedAthlete.goal || "marathon",
    };
  }, [selectedAthlete, selectedSnapshot, athleteMetrics]);

  // Generate V2 annotations
  const annotationsV2 = useMemo(() => {
    if (!staffMode || !athleteMetrics.signals || displayedWeeks.length === 0) return [];
    return generateTemplateAnnotationsV2({
      templateId: selectedTemplateId,
      athleteSignals: athleteMetrics.signals,
      weeks: displayedWeeks,
    });
  }, [staffMode, athleteMetrics.signals, displayedWeeks, selectedTemplateId]);

  // Compute CAP Injury Risk
  const capInjuryRisk = useMemo(() => {
    if (!staffMode || !selectedAthlete) return null;
    return computeCAPInjuryRisk({
      vlamaxValue: athleteMetrics.vlamaxEffectif.value,
      tteValue: athleteMetrics.tteEffectif.value,
      objectif: selectedAthlete.goal || "IM",
    });
  }, [staffMode, selectedAthlete, athleteMetrics.vlamaxEffectif.value, athleteMetrics.tteEffectif.value]);

  // v9: Wahoo Context for session interpretation
  const wahooContext = useMemo<WahooAthleteContext | null>(() => {
    if (!selectedAthlete) return null;
    return {
      vlamaxEffectif: athleteMetrics.vlamaxEffectif.value,
      vlamaxSeuil: getVLamaxThreshold(selectedAthlete.goal),
      tteEffectif: athleteMetrics.tteEffectif.value,
      tteTarget: getTTETarget(selectedAthlete.goal),
      fatigueState: (selectedSnapshot as any)?.fatigue_state || null,
      sportPrincipal: (selectedSnapshot as any)?.sport_main,
      objectif: selectedAthlete.goal,
    };
  }, [selectedAthlete, athleteMetrics, selectedSnapshot]);

  // v9: Wahoo Suggestions Engine
  const wahooSuggestions = useMemo<SuggestionEngineOutput | null>(() => {
    if (!selectedAthlete || !staffMode) return null;
    
    const fatigueState = (selectedSnapshot as any)?.fatigue_state;
    let fatigueStatus: "low" | "moderate" | "high" | "unknown" = "unknown";
    if (fatigueState === "high" || fatigueState === "élevé") fatigueStatus = "high";
    else if (fatigueState === "moderate" || fatigueState === "modéré") fatigueStatus = "moderate";
    else if (fatigueState === "low" || fatigueState === "faible") fatigueStatus = "low";

    // Compute CAP injury risk locally to avoid TDZ issues
    const localCapRisk = computeCAPInjuryRisk({
      vlamaxValue: athleteMetrics.vlamaxEffectif.value,
      tteValue: athleteMetrics.tteEffectif.value,
      objectif: selectedAthlete.goal || "IM",
    });

    const input: SuggestionEngineInput = {
      vlamaxEffectif: athleteMetrics.vlamaxEffectif.value,
      vlamaxConfidence: athleteMetrics.vlamaxEffectif.confidence,
      tteEffectif: athleteMetrics.tteEffectif.value,
      tteConfidence: athleteMetrics.tteEffectif.confidence,
      potentielPhysiologiqueScore: athleteMetrics.potentielScore,
      fatigueStatus,
      capInjuryRisk: localCapRisk?.level as any,
      sport: "TRI",
      objectif: selectedAthlete.goal || "IM",
    };

    return generateWahooSuggestions(input);
  }, [selectedAthlete, staffMode, athleteMetrics, selectedSnapshot]);

  const handleLoadTemplate = async () => {
    const template = getTemplateById(selectedTemplateId);
    if (!template) {
      toast.error("Template introuvable");
      return;
    }

    setIsLoading(true);
    setSections([]);
    setWeeks([]);
    setSelectedSectionId(null);

    try {
      // Handle static templates (pre-loaded data)
      if (template.source === "static" && template.weeks.length > 0) {
        setWeeks(template.weeks);
        setSections([{
          sectionId: "section-1",
          sectionTitle: "Plan principal",
          weeks: template.weeks,
        }]);
        setIsLoaded(true);
        toast.success(`Template chargé: ${template.weeks.length} semaines`);
      } else if (template.multiSections) {
        // Load with multi-section support - pass staffMode for sanity checks
        const loadedSections = await loadProgramSectionsFromDocx(template.docxPath, staffMode);
        setSections(loadedSections);
        
        // Flatten for fallback
        const allWeeks = loadedSections.flatMap((s) => s.weeks);
        setWeeks(allWeeks);
        
        if (loadedSections.length > 0) {
          setSelectedSectionId(loadedSections[0].sectionId);
        }
        
        setIsLoaded(true);
        toast.success(`Template chargé: ${loadedSections.length} plan(s), ${allWeeks.length} semaines`);
      } else {
        // Load as single section (legacy mode) - pass staffMode for sanity checks
        const loadedWeeks = await loadProgramTemplateFromDocx(template.docxPath, staffMode);
        setWeeks(loadedWeeks);
        setSections([{
          sectionId: "section-1",
          sectionTitle: "Plan principal",
          weeks: loadedWeeks,
        }]);
        setIsLoaded(true);
        toast.success(`Template chargé: ${loadedWeeks.length} semaines`);
      }
    } catch (err) {
      console.error("Error loading template:", err);
      toast.error("Erreur lors du chargement du template");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load template on mount if previously loaded
  useEffect(() => {
    const wasLoaded = localStorage.getItem("vlab-template-loaded") === "true";
    const savedTemplate = localStorage.getItem("vlab-selected-template");
    if (wasLoaded && savedTemplate && weeks.length === 0 && !isLoading) {
      handleLoadTemplate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyWeek = (week: TemplateWeek) => {
    const text = `Semaine ${week.weekNumber}\n\n` + 
      week.sessions.map((s) => `${s.day} - ${s.sport} - ${s.title}\n${s.details}`).join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Semaine copiée !");
  };

  const handleCopyAll = () => {
    const weeksToExport = displayedWeeks;
    const sectionTitle = sections.length > 1 
      ? sections.find((s) => s.sectionId === selectedSectionId)?.sectionTitle || "Plan"
      : "Plan";
    
    const text = `=== ${sectionTitle} ===\n\n` + weeksToExport.map((week) => 
      `=== Semaine ${week.weekNumber} ===\n\n` + 
      week.sessions.map((s) => `${s.day} - ${s.sport} - ${s.title}\n${s.details}`).join("\n\n")
    ).join("\n\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Plan copié !");
  };

  const handleClearCache = () => {
    clearTemplateCache();
    setWeeks([]);
    setSections([]);
    setSelectedSectionId(null);
    setIsLoaded(false);
    toast.success("Cache vidé");
  };

  return (
    <div className="min-h-screen bg-background pb-24 safe-area-inset-bottom">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl safe-area-inset-top">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 max-w-7xl">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0 touch-target">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg lg:text-xl font-bold text-foreground truncate">Templates de Programmation</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Plans staff-grade avec annotations V2</p>
            </div>
            
            {/* Athlete Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <Users className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Select
                value={selectedAthleteId || undefined}
                onValueChange={(id) => setSelectedAthleteId(id)}
              >
                <SelectTrigger className="w-[140px] sm:w-[180px] h-9 bg-secondary/50">
                  <SelectValue placeholder="Athlète..." />
                </SelectTrigger>
                <SelectContent>
                  {athletes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{a.nom || `Athlète ${a.id.slice(0, 6)}`}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 max-w-7xl">
        {/* Template Selection - Collapsible with Running Templates */}
        <Collapsible defaultOpen={!isLoaded}>
          <Card className="overflow-hidden">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="pb-3 flex flex-row items-center justify-between hover:bg-muted/30 transition-colors">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Bibliothèque de Templates
                  <Badge variant="outline" className="ml-2">
                    {PROGRAM_TEMPLATES.length + RUNNING_TEMPLATES.length} plans
                  </Badge>
                </CardTitle>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6 pt-0">
                {/* AI Plan Generator CTA */}
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">Plan IA TFCL™</p>
                      <p className="text-xs text-muted-foreground">Génération personnalisée par IA basée sur vos limiteurs</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => navigate("/ai-plan")} className="gap-2">
                    <Zap className="h-4 w-4" />
                    Générer un Plan IA
                  </Button>
                </div>

                {/* Triathlon/Ironman Templates - Grid View like Running */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Templates Triathlon / Ironman</span>
                    <Badge variant="secondary" className="text-xs">
                      {PROGRAM_TEMPLATES.filter(t => t.target === "IM" || t.target === "703").length} plans
                    </Badge>
                  </div>
                  
                  {/* Interactive Triathlon Templates Grid with Date Suggester */}
                  <TriathlonTemplateGrid />
                </div>

                {/* Divider */}
                <div className="border-t border-dashed pt-4">
                  {/* Running Templates */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <PersonStanding className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-semibold">Running Templates</span>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200">
                        {RUNNING_TEMPLATES.length} plans
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {RUNNING_TEMPLATES.filter(t => t.goal === "marathon").length} Marathon • {RUNNING_TEMPLATES.filter(t => t.goal === "semi").length} Semi
                      </Badge>
                    </div>

                    {/* Goal Week Suggester - Date-based suggestions */}
                    <GoalWeekSuggester 
                      athleteTruth={athleteTruthRunning}
                      defaultGoal={selectedAthlete?.goal === "semi" || selectedAthlete?.goal?.toLowerCase().includes("semi") ? "semi" : "marathon"}
                    />
                    
                    {/* Quick Week Comparison Panel - Dropdown-based */}
                    <QuickWeekComparisonPanel />
                    
                    {/* Interactive Running Templates Grid with Comparison */}
                    <RunningTemplateGrid />

                    {/* Week Selector TFCL - Collapsible */}
                    <Collapsible defaultOpen={false}>
                      <div className="pt-4 border-t border-dashed">
                        <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-muted/50 rounded-lg px-2 transition-colors">
                          <div className="flex items-center gap-2">
                            <Beaker className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Week Selector TFCL™</span>
                            <Badge variant="outline" className="text-[10px]">Suggestion IA</Badge>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pt-2">
                            <WeekSelectorTFCL />
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Section Selection (if multi-section) */}
        {isLoaded && sections.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Choisir un plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedSectionId || ""} onValueChange={setSelectedSectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un plan" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.sectionId} value={s.sectionId}>
                      {s.sectionTitle} ({s.weeks.length} semaines)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* Staff Mode Toggle - always visible when template selected */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Switch id="staff-mode" checked={staffMode} onCheckedChange={setStaffMode} />
                <Label htmlFor="staff-mode" className="text-sm font-medium">Mode Staff V2 (Annotations précises)</Label>
              </div>
              
              {isLoaded && staffMode && annotationsV2.length > 0 && (
                  <Button 
                    variant={showComparisonMode ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setShowComparisonMode(!showComparisonMode)}
                    className="gap-2"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    {showComparisonMode ? "Fermer comparaison" : "Comparer Plan Brut / Conseillé"}
                  </Button>
                )}
              </div>

              {staffMode && athletes.length > 0 && (
                <div className="space-y-4">
                  <Select value={selectedAthleteId || ""} onValueChange={setSelectedAthleteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un athlète" />
                    </SelectTrigger>
                    <SelectContent>
                      {athletes.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nom} ({a.objectif || "IM"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedAthlete && selectedSnapshot && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <AthleteProfilePanel
                        athlete={selectedAthlete}
                        snapshot={selectedSnapshot}
                        vlamaxEffectif={athleteMetrics.vlamaxEffectif}
                        tteEffectif={athleteMetrics.tteEffectif}
                        potentielScore={athleteMetrics.potentielScore}
                        tss7d={athleteMetrics.tss7d}
                      />
                      
                      {templateProfiles && (
                        <TemplateProfilesPanel
                          profiles={templateProfiles}
                          athleteMatch={profileMatch}
                          selectedComparison={comparisonProfile}
                          onComparisonChange={setComparisonProfile}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {staffMode && !athletes.length && (
                <p className="text-sm text-muted-foreground">Aucun athlète disponible pour les annotations.</p>
              )}
            </CardContent>
          </Card>

        {/* Comparison View (Plan Brut vs Plan Conseillé) */}
        {isLoaded && staffMode && showComparisonMode && selectedAthlete && annotationsV2.length > 0 && (
          <PlanComparisonView
            originalWeeks={displayedWeeks}
            annotations={annotationsV2}
            onClose={() => setShowComparisonMode(false)}
          />
        )}

        {/* Annotations Panel V2 */}
        {isLoaded && staffMode && selectedAthlete && annotationsV2.length > 0 && !showComparisonMode && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Annotations Staff V2
              <Badge>{annotationsV2.length}</Badge>
            </h3>
            <AnnotationsPanelV2 annotations={annotationsV2} />
          </div>
        )}

        {/* v9: Wahoo SYSTM Suggestions Panel */}
        {isLoaded && staffMode && selectedAthlete && wahooSuggestions && (
          <WahooSuggestionsPanel 
            output={wahooSuggestions}
            staffMode={staffMode}
            athleteName={selectedAthlete.name}
          />
        )}

        {/* Briefing Card */}
        {isLoaded && currentBriefing && (
          <Card className="border-l-4 border-l-primary bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Briefing du Programme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {currentBriefing}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Advanced Mode - Load Full Template (ALL templates) */}
        <Card className="border-dashed">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Charger template complet (mode avancé)
                    <Badge variant="outline" className="text-[10px]">
                      {PROGRAM_TEMPLATES.length} plans
                    </Badge>
                  </CardTitle>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 space-y-6">
                {/* Excel Plan Importer */}
                <ExcelPlanImporter />
                
                <div className="border-t pt-4 space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Ou sélectionnez un template préinstallé pour afficher le graphique de volume par phase.
                  </p>
                
                <Select 
                  value={selectedTemplateId} 
                  onValueChange={(v) => {
                    setSelectedTemplateId(v);
                    setIsLoaded(false);
                    setWeeks([]);
                    setSections([]);
                    setSelectedSectionId(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un template" />
                  </SelectTrigger>
                  <SelectContent className="bg-background max-h-80">
                    {/* Triathlon Templates */}
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b">
                      🏊 Triathlon
                    </div>
                    {PROGRAM_TEMPLATES
                      .filter(t => t.target === "IM" || t.target === "703")
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.target})
                          {t.multiSections && " 📑"}
                        </SelectItem>
                      ))}
                    
                    {/* Running Templates */}
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b border-t mt-1">
                      🏃 Running
                    </div>
                    {PROGRAM_TEMPLATES
                      .filter(t => t.target === "Marathon" || t.target === "Semi")
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.target})
                          {t.multiSections && " 📑"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleLoadTemplate} disabled={isLoading || !selectedTemplateId}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Charger le template
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/tfcl-testing-week")}
                    className="gap-2"
                  >
                    <Beaker className="h-4 w-4" />
                    Semaine TFCL
                  </Button>
                  {isLoaded && (
                    <>
                      <Button variant="outline" onClick={handleCopyAll}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copier tout
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleClearCache}>
                        Vider le cache
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => {
                          setIsLoaded(false);
                          setWeeks([]);
                          setSections([]);
                          setSelectedSectionId(null);
                          localStorage.removeItem("vlab-template-loaded");
                          toast.success("Template fermé");
                        }}
                      >
                        Fermer
                      </Button>
                    </>
                  )}
                </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Phase Volume Chart */}
        {isLoaded && displayedWeeks.length > 0 && !showComparisonMode && (
          <PhaseVolumeChart weeks={displayedWeeks} />
        )}

        {/* Weeks Accordion */}
        {isLoaded && displayedWeeks.length > 0 && !showComparisonMode && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {sections.length > 1 && selectedSectionId 
                  ? sections.find((s) => s.sectionId === selectedSectionId)?.sectionTitle 
                  : `${displayedWeeks.length} semaines`}
              </h3>
              {sections.length <= 1 && (
                <Badge variant="outline" className="text-xs">
                  {displayedWeeks.length} semaines
                </Badge>
              )}
            </div>
            <Accordion 
              type="single" 
              collapsible 
              className="space-y-2"
              value={openWeekAccordion}
              onValueChange={setOpenWeekAccordion}
            >
              {displayedWeeks.map((week) => (
                <WeekSection 
                  key={week.weekNumber} 
                  week={week} 
                  annotations={annotationsV2} 
                  totalWeeks={displayedWeeks.length}
                  staffMode={staffMode}
                  capInjuryRisk={capInjuryRisk}
                  wahooContext={wahooContext}
                  expandedSessions={expandedSessions}
                  onToggleSessionExpand={handleToggleSessionExpand}
                />
              ))}
            </Accordion>
          </div>
        )}

        {/* Empty state */}
        {!isLoaded && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Sélectionnez et chargez un template pour commencer.</p>
          </div>
        )}
      </main>
    </div>
  );
}
