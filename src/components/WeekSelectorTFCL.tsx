import { computePotentielEffectif, type PotentielPhysiologiqueEffectif } from "@/lib/potentielPhysiologiqueEffectif";
// =============================================
// WEEK SELECTOR TFCL™ - UI Component (Enhanced)
// Two For Coaching Lab
// =============================================

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, AlertTriangle, CheckCircle2, Info, Zap, Calendar, User, Activity, 
  Shield, TrendingUp, Clock, Flame, Heart, MapPin, ChevronRight, Dumbbell,
  BarChart3, Timer
} from "lucide-react";
import { normalizeRaceTypeForDisplay } from "@/lib/raceTypeNormalization";

import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { computeVLamaxEffectif, computeTTEEffectif, computeFatigueEffectif } from "@/engines/diagnostic";
import { computeRunInjuryRisk } from "@/lib/runInjuryRisk";
import { suggestTopWeeks, computePhaseFromDate } from "@/lib/templates/weekSelectorTFCL";
import { RUNNING_TEMPLATES, getWeeksByGoal, getWeekContext } from "@/lib/templates/runningTemplatesStore";
import type { 
  AthleteTruthRunning, 
  WeekSelectorContext, 
  WeekSuggestion,
  RunningGoal,
  AmbitionLevel,
  RunningPhase,
  RunningTemplate,
} from "@/types/runningTemplate";

interface WeekSelectorTFCLProps {
  onInsertWeek?: (suggestion: WeekSuggestion) => void;
  defaultRaceType?: RunningGoal;
}

// Helper to get template display info
function getTemplateDisplayInfo(templateId: string): { label: string; color: string } {
  if (templateId.includes("1h20")) return { label: "Semi 1h20", color: "bg-emerald-500" };
  if (templateId.includes("1h30")) return { label: "Semi 1h30", color: "bg-teal-500" };
  if (templateId.includes("1h40")) return { label: "Semi 1h40", color: "bg-cyan-500" };
  if (templateId.includes("2h30")) return { label: "Marathon 2h30", color: "bg-orange-500" };
  if (templateId.includes("4h")) return { label: "Marathon 4h", color: "bg-amber-500" };
  if (templateId === "marathon") return { label: "Marathon Std", color: "bg-red-500" };
  if (templateId === "semi") return { label: "Semi Std", color: "bg-blue-500" };
  return { label: templateId, color: "bg-gray-500" };
}

// Phase badge component
function PhaseBadge({ phase }: { phase: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    BASE: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300" },
    BUILD: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300" },
    SPECIFIC: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300" },
    TAPER: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  };
  const c = config[phase] || config.BASE;
  return <Badge variant="outline" className={`${c.bg} ${c.text} text-[10px]`}>{phase}</Badge>;
}

// Focus badge component
function FocusBadge({ focus }: { focus: string }) {
  const config: Record<string, { icon: React.ReactNode; color: string }> = {
    TTE: { icon: <Timer className="h-3 w-3" />, color: "text-orange-600" },
    VO2: { icon: <Flame className="h-3 w-3" />, color: "text-red-600" },
    ECONOMY: { icon: <TrendingUp className="h-3 w-3" />, color: "text-blue-600" },
    ENDURANCE: { icon: <Heart className="h-3 w-3" />, color: "text-green-600" },
    SPEED: { icon: <Zap className="h-3 w-3" />, color: "text-purple-600" },
  };
  const c = config[focus] || config.ENDURANCE;
  return (
    <Badge variant="outline" className="text-[10px] flex items-center gap-1">
      <span className={c.color}>{c.icon}</span>
      {focus}
    </Badge>
  );
}

// Load level indicator
function LoadIndicator({ level, label }: { level: number; label: string }) {
  const percentage = (level / 5) * 100;
  const color = level <= 2 ? "bg-green-500" : level <= 3 ? "bg-yellow-500" : level <= 4 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-16">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs font-mono w-4">{level}</span>
    </div>
  );
}

export function WeekSelectorTFCL({ onInsertWeek, defaultRaceType }: WeekSelectorTFCLProps) {
  const { athletes, snapshots, tests, getSnapshotsForAthlete } = useCloudDataContext();
  
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [raceType, setRaceType] = useState<RunningGoal>(defaultRaceType || "semi");
  const [ambition, setAmbition] = useState<AmbitionLevel>("PERF");
  const [phaseManual, setPhaseManual] = useState<RunningPhase | "">("");
  const [raceDate, setRaceDate] = useState<string>("");
  const [showResults, setShowResults] = useState(false);
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState<string>("all");

  // Get templates filtered by goal
  const filteredTemplates = useMemo(() => {
    return RUNNING_TEMPLATES.filter(t => t.goal === raceType);
  }, [raceType]);

  // Get selected athlete and snapshot
  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
  const athleteSnapshots = selectedAthleteId ? getSnapshotsForAthlete(selectedAthleteId) : [];
  const activeSnapshot = athleteSnapshots.find(s => s.id === selectedAthlete?.active_snapshot_id) || athleteSnapshots[0];

  // Build athlete truth
  const athleteTruth = useMemo<AthleteTruthRunning | null>(() => {
    if (!selectedAthlete || !activeSnapshot) return null;

    const objectif = selectedAthlete.goal || "Semi";
    
    // VLamax
    const vlamaxResult = computeVLamaxEffectif({
      athleteId: selectedAthlete.id,
      objectif,
      activeSnapshotId: selectedAthlete.active_snapshot_id,
      tests,
      snapshots,
    });

    // TTE
    const tteResult = computeTTEEffectif({
      ftp: activeSnapshot.ftp,
      tss_7d: activeSnapshot.tss_7d,
      tte_mode: activeSnapshot.tte_mode,
      tte_observed_min: activeSnapshot.tte_observed_min,
      objectif,
    });

    // Potentiel Physiologique (for fatigue calc)
    const readinessResult = computePotentielEffectif({
      objectif,
      vlamaxEffectif: vlamaxResult,
      tteEffectif: tteResult,
      ftp: activeSnapshot.ftp ?? null,
      poids: activeSnapshot.weight_kg ?? null,
    });

    // Fatigue
    const fatigueResult = computeFatigueEffectif({
      tss7d: activeSnapshot.tss_7d,
      tteEffectif: tteResult,
      potentielPhysiologique: readinessResult,
      vlamaxEffectif: vlamaxResult,
      objectif,
    });

    // Run Injury Risk
    const injuryResult = computeRunInjuryRisk({
      fatigueEffectif: fatigueResult,
      vlamaxEffectif: vlamaxResult,
      tteEffectif: tteResult,
      tss7d: activeSnapshot.tss_7d,
      objectif,
    });

    return {
      vlamax_run: {
        value: vlamaxResult.value,
        confidence: vlamaxResult.confidence,
        source: vlamaxResult.source,
      },
      tte_run: {
        value: tteResult.tte_min,
        confidence: tteResult.confidence,
        source: tteResult.source,
      },
      fatigueIndex: fatigueResult.score,
      fatigueLevel: fatigueResult.level.label,
      runInjuryRisk: {
        score: injuryResult.score,
        level: injuryResult.level,
      },
      economy_run: activeSnapshot.run_economy_score ? {
        score: activeSnapshot.run_economy_score,
        label: activeSnapshot.run_economy_label || "",
      } : undefined,
      age: selectedAthlete.birth_date 
        ? Math.floor((Date.now() - new Date(selectedAthlete.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null,
      sex: null,
      objectif,
    };
  }, [selectedAthlete, activeSnapshot, tests, snapshots]);

  // Build context and get suggestions
  const suggestions = useMemo(() => {
    if (!athleteTruth || !showResults) return null;

    // Get weeks, optionally filtered by template
    let weeks = getWeeksByGoal(raceType);
    
    if (selectedTemplateFilter !== "all") {
      weeks = weeks.filter(w => w.template_id === selectedTemplateFilter);
    }
    
    const context: WeekSelectorContext = {
      raceType,
      ambition,
      race_date: raceDate || undefined,
      phase_manual: phaseManual || (raceDate ? computePhaseFromDate(raceDate) : undefined),
    };

    return suggestTopWeeks(weeks, athleteTruth, context);
  }, [athleteTruth, raceType, ambition, phaseManual, raceDate, showResults, selectedTemplateFilter]);

  const handleSuggest = () => {
    // console.log("[WeekSelectorTFCL] handleSuggest called", {
    //   selectedAthleteId,
    //   athleteTruth,
    //   raceType,
    //   ambition
    // });
    
    if (selectedAthleteId && athleteTruth) {
      setShowResults(true);
    } else {
      console.warn("[WeekSelectorTFCL] Cannot suggest: missing athlete or athleteTruth", {
        hasAthleteId: !!selectedAthleteId,
        hasAthleteTruth: !!athleteTruth
      });
    }
  };

  const getBadgeClass = (badge: string) => {
    switch (badge) {
      case "TOP": return "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0";
      case "GOOD": return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0";
      case "CAUTION": return "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0";
      default: return "";
    }
  };

  const getRiskColor = (score: number) => {
    if (score <= 30) return "text-green-600";
    if (score <= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getFatigueColor = (score: number) => {
    if (score <= 40) return "text-green-600";
    if (score <= 70) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 overflow-hidden">
      <CardHeader className="pb-4 bg-gradient-to-r from-primary/10 to-transparent">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          Week Selector TFCL™
          <Badge variant="outline" className="ml-auto text-xs bg-background/50">
            {RUNNING_TEMPLATES.length} templates • {getWeeksByGoal(raceType).length} semaines
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Suggestion intelligente de semaine basée sur le profil physiologique. Le coach décide.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Configuration Section */}
        <div className="grid gap-4 p-4 rounded-lg bg-muted/30 border border-border/50">
          {/* Athlete Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-primary" />
              Athlète
            </Label>
            <Select value={selectedAthleteId} onValueChange={(v) => { setSelectedAthleteId(v); setShowResults(false); }}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Sélectionner un athlète..." />
              </SelectTrigger>
              <SelectContent>
                {athletes.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <div className="flex items-center gap-2">
                      <span>{a.name}</span>
                      {a.goal && <Badge variant="outline" className="text-[10px]">{normalizeRaceTypeForDisplay(a.goal)}</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Race Type & Ambition */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Objectif Course</Label>
              <Select value={raceType} onValueChange={(v) => { setRaceType(v as RunningGoal); setShowResults(false); setSelectedTemplateFilter("all"); }}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marathon">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-orange-500" />
                      Marathon (42K)
                    </div>
                  </SelectItem>
                  <SelectItem value="semi">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 text-blue-500" />
                      Semi-Marathon (21K)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Ambition</Label>
              <Select value={ambition} onValueChange={(v) => { setAmbition(v as AmbitionLevel); setShowResults(false); }}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FINISH">🏃 Finisher</SelectItem>
                  <SelectItem value="PERF">🎯 Performance</SelectItem>
                  <SelectItem value="SUB">⏱️ Sub (Chrono)</SelectItem>
                  <SelectItem value="ELITE">🏆 Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Template Filter */}
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Filtrer par Template (optionnel)
            </Label>
            <Select value={selectedTemplateFilter} onValueChange={(v) => { setSelectedTemplateFilter(v); setShowResults(false); }}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les templates {raceType === "marathon" ? "Marathon" : "Semi"}</SelectItem>
                {filteredTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.weeks_count} sem.)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Phase */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Phase (optionnel)
            </Label>
            <Select value={phaseManual || "auto"} onValueChange={(v) => { setPhaseManual(v === "auto" ? "" : v as RunningPhase); setShowResults(false); }}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Auto (selon profil)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">🔄 Auto</SelectItem>
                <SelectItem value="BASE">🏗️ Base / Construction</SelectItem>
                <SelectItem value="BUILD">📈 Build / Développement</SelectItem>
                <SelectItem value="SPECIFIC">🎯 Spécifique</SelectItem>
                <SelectItem value="TAPER">✨ Affûtage</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Athlete Profile Preview (when selected) */}
        {athleteTruth && !showResults && (
          <div className="p-4 rounded-lg border bg-card">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Profil Physiologique
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-lg font-bold font-mono text-primary">
                  {athleteTruth.vlamax_run.value?.toFixed(2) || "—"}
                </div>
                <div className="text-[10px] text-muted-foreground">VLamax</div>
                <div className="text-[9px] text-muted-foreground/70">{athleteTruth.vlamax_run.source === "estimation" ? "📐 Estimation" : athleteTruth.vlamax_run.source === "test_terrain" ? "🏃 Test terrain" : athleteTruth.vlamax_run.source === "test_labo" ? "🧪 Labo" : athleteTruth.vlamax_run.source}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-lg font-bold font-mono text-primary">
                  {athleteTruth.tte_run.value || "—"}<span className="text-xs">min</span>
                </div>
                <div className="text-[10px] text-muted-foreground">TTE</div>
                <div className="text-[9px] text-muted-foreground/70">{athleteTruth.tte_run.source === "observed" ? "📋 Observé" : athleteTruth.tte_run.source === "estimation" ? "📐 Estimation" : athleteTruth.tte_run.source}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className={`text-lg font-bold font-mono ${getFatigueColor(athleteTruth.fatigueIndex)}`}>
                  {athleteTruth.fatigueIndex}%
                </div>
                <div className="text-[10px] text-muted-foreground">Fatigue</div>
                <div className="text-[9px] text-muted-foreground/70">{athleteTruth.fatigueLevel}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className={`text-lg font-bold font-mono ${getRiskColor(athleteTruth.runInjuryRisk.score)}`}>
                  {athleteTruth.runInjuryRisk.score}%
                </div>
                <div className="text-[10px] text-muted-foreground">Risque CAP</div>
                <div className="text-[9px] text-muted-foreground/70">{athleteTruth.runInjuryRisk.level}</div>
              </div>
            </div>
          </div>
        )}

        {/* Suggest Button */}
        <Button 
          onClick={handleSuggest} 
          className="w-full h-12 text-base font-semibold"
          disabled={!selectedAthleteId || !athleteTruth}
          size="lg"
        >
          <Zap className="h-5 w-5 mr-2" />
          Suggérer une semaine
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
        
        {/* Debug info when no athleteTruth */}
        {selectedAthleteId && !athleteTruth && (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Aucun snapshot actif pour cet athlète. Créez d'abord un snapshot avec des données physiologiques.
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {suggestions && (
          <div className="space-y-4 pt-4 border-t">
            {/* Warnings */}
            {suggestions.warnings.length > 0 && (
              <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {suggestions.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Compact Athlete Profile */}
            {athleteTruth && (
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  <div className="font-mono font-bold text-sm">{athleteTruth.vlamax_run.value?.toFixed(2) || "—"}</div>
                  <div className="text-[10px] text-muted-foreground">VLamax</div>
                </div>
                <div className="p-2 rounded bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                  <div className="font-mono font-bold text-sm">{athleteTruth.tte_run.value || "—"}′</div>
                  <div className="text-[10px] text-muted-foreground">TTE</div>
                </div>
                <div className="p-2 rounded bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20">
                  <div className={`font-mono font-bold text-sm ${getFatigueColor(athleteTruth.fatigueIndex)}`}>
                    {athleteTruth.fatigueIndex}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">Fatigue</div>
                </div>
                <div className="p-2 rounded bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
                  <div className={`font-mono font-bold text-sm ${getRiskColor(athleteTruth.runInjuryRisk.score)}`}>
                    {athleteTruth.runInjuryRisk.score}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">Risque</div>
                </div>
              </div>
            )}

            {/* Suggestions Header */}
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Top 3 Suggestions
              </h4>
              <Badge variant="outline" className="text-xs">
                Fiabilité: {suggestions.confidenceLabel}
              </Badge>
            </div>

            {/* Suggestions List */}
            <Accordion type="single" collapsible className="space-y-2">
              {suggestions.suggestions.map((suggestion, idx) => {
                const context = getWeekContext(suggestion as any);
                const templateInfo = getTemplateDisplayInfo(suggestion.template_id);
                
                return (
                  <AccordionItem 
                    key={suggestion.week_id} 
                    value={suggestion.week_id}
                    className="border rounded-lg overflow-hidden bg-card"
                  >
                    <AccordionTrigger className="hover:no-underline px-4 py-3 hover:bg-muted/50">
                      <div className="flex items-center gap-3 text-left w-full">
                        <Badge className={`${getBadgeClass(suggestion.badge)} px-2 py-1`}>
                          #{idx + 1}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">S{suggestion.week_number}</span>
                            <Badge variant="outline" className={`text-[9px] ${templateInfo.color} text-white border-0`}>
                              {templateInfo.label}
                            </Badge>
                            <PhaseBadge phase={suggestion.meta?.phase || "BASE"} />
                            <FocusBadge focus={suggestion.meta?.focus || "ENDURANCE"} />
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {suggestion.week_title} • {suggestion.match_score}%
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 pt-2 space-y-3">
                      {/* Week Meta */}
                      {suggestion.meta && (
                        <div className="p-3 rounded-lg bg-muted/30 space-y-2">
                          <LoadIndicator level={suggestion.meta.load_level} label="Charge" />
                          <LoadIndicator level={suggestion.meta.intensity_density} label="Intensité" />
                          <LoadIndicator level={suggestion.meta.longrun_level} label="Long Run" />
                          <div className="flex items-center justify-between pt-1 text-xs">
                            <span className="text-muted-foreground">Risque blessure:</span>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] ${
                                suggestion.meta.injury_risk_tag === "LOW" ? "bg-green-100 text-green-700" :
                                suggestion.meta.injury_risk_tag === "MED" ? "bg-amber-100 text-amber-700" :
                                "bg-red-100 text-red-700"
                              }`}
                            >
                              {suggestion.meta.injury_risk_tag}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Why */}
                      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200/50 dark:border-green-800/50">
                        <div className="flex items-start gap-2 text-sm">
                          <Info className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{suggestion.why}</span>
                        </div>
                      </div>

                      {/* Watchouts */}
                      {suggestion.watchouts.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200/50 dark:border-amber-800/50">
                          <div className="flex items-start gap-2 text-sm">
                            <Shield className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="font-medium text-amber-800 dark:text-amber-300">Garde-fous:</span>
                              <ul className="list-disc list-inside mt-1 space-y-0.5">
                                {suggestion.watchouts.map((w, i) => (
                                  <li key={i} className="text-muted-foreground text-xs">{w}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Adjustments */}
                      {suggestion.suggested_adjustments.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200/50 dark:border-blue-800/50">
                          <div className="flex items-start gap-2 text-sm">
                            <Dumbbell className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="font-medium text-blue-800 dark:text-blue-300">Ajustements suggérés:</span>
                              <ul className="list-disc list-inside mt-1 space-y-0.5">
                                {suggestion.suggested_adjustments.map((a, i) => (
                                  <li key={i} className="text-muted-foreground text-xs">{a}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sessions Preview */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 rounded p-2">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {suggestion.sessions.filter(s => s.type !== "REST").length} séances
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="h-3 w-3 text-orange-500" />
                          {suggestion.sessions.filter(s => s.isKey).length} séances clés
                        </span>
                      </div>

                      {onInsertWeek && (
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => onInsertWeek(suggestion)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Insérer dans Plan Coach
                        </Button>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground italic text-center px-4 py-2 bg-muted/30 rounded">
              {suggestions.disclaimer}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
