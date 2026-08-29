import { computePotentielEffectif, type PotentielPhysiologiqueEffectif } from "@/lib/potentielPhysiologiqueEffectif";
import { mapSnapshotToV2 } from "@/lib/mapSnapshotToV2";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Zap,
  Clock,
  Activity,
  Heart,
  Target,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Bike,
  PersonStanding,
  Sparkles,
  Star,
  TrendingUp,
  Info,
  Brain,
  Flame,
  Footprints,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";

// Engine imports
import {
  suggestWahooWorkouts,
  SuggestionEngineContext,
  SuggestionEngineOutput,
  WahooSuggestion,
  TemporalPhase,
  PHASE_LABELS,
  PHASE_DESCRIPTIONS,
  needToTargetAxis,
  WahooNeed,
  LowCRRJustification,
  LOW_CRR_JUSTIFICATION_LABELS,
  LOW_CRR_JUSTIFICATION_EFFECTS,
} from "@/lib/wahoo/wahooSuggestionEngine";
import { computeVLamaxEffectif, computeTTEEffectif, getTTETarget } from "@/engines/diagnostic";
import { computeCAPInjuryRiskIndex } from "@/lib/capInjuryRisk";
import { getRiskColor, getRiskLabel, findWahooWorkoutById } from "@/data/wahooMapping";
import { 
  getVLamaxRange, 
  getTTETarget as getCentralTTETarget, 
  getFtpKgTarget 
} from "@/lib/physiologicalTargets";

// =============================================
// TYPES & CONSTANTS
// =============================================

interface PhaseCardProps {
  phase: TemporalPhase;
  suggestions: WahooSuggestion[];
  isExpanded: boolean;
  onToggle: () => void;
}

const PHASE_COLORS: Record<TemporalPhase, string> = {
  1: "border-l-green-500 bg-green-500/5",
  2: "border-l-blue-500 bg-blue-500/5",
  3: "border-l-purple-500 bg-purple-500/5",
};

const PHASE_BADGE_COLORS: Record<TemporalPhase, string> = {
  1: "bg-green-500/20 text-green-500 border-green-500/30",
  2: "bg-blue-500/20 text-blue-500 border-blue-500/30",
  3: "bg-purple-500/20 text-purple-500 border-purple-500/30",
};

const AXIS_CONFIG: Record<string, { icon: typeof Zap; color: string; label: string }> = {
  VLAMAX: { icon: Zap, color: "text-amber-500", label: "VLamax ↓" },
  TTE: { icon: Clock, color: "text-blue-500", label: "TTE ↑" },
  FTP: { icon: Zap, color: "text-orange-500", label: "FTP ↑" },
  VMA: { icon: Footprints, color: "text-green-500", label: "VMA ↑" },       // ✅ Running
  ECONOMY: { icon: Target, color: "text-teal-500", label: "Économie CAP" }, // ✅ Running
  ENDURANCE: { icon: Heart, color: "text-green-500", label: "Endurance" },
  FRESHNESS: { icon: Activity, color: "text-purple-500", label: "Récupération" },
  VO2: { icon: TrendingUp, color: "text-red-500", label: "VO₂max ↑" },
};

// =============================================
// SUB-COMPONENTS
// =============================================

function SuggestionCard({ suggestion }: { suggestion: WahooSuggestion }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const axisConfig = AXIS_CONFIG[suggestion.targetAxis];
  const AxisIcon = axisConfig?.icon || Target;
  const workout = findWahooWorkoutById(suggestion.wahoo_id);

  return (
    <Card className="bg-card/50 hover:border-primary/30 transition-colors">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-3 cursor-pointer">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className={cn("text-xs", axisConfig?.color && `bg-${axisConfig.color.split('-')[1]}-500/20`)}>
                    <AxisIcon className={cn("h-3 w-3 mr-1", axisConfig?.color)} />
                    {axisConfig?.label}
                  </Badge>
                  {workout?.sport === "run" ? (
                    <PersonStanding className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Bike className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Badge variant="outline" className={cn("text-xs", getRiskColor(suggestion.riskLevel))}>
                    {getRiskLabel(suggestion.riskLevel)}
                  </Badge>
                </div>
                <p className="font-semibold text-sm">{suggestion.wahoo_name}</p>
                {suggestion.frequencyPerWeek && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📅 {suggestion.frequencyPerWeek}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
            </div>

            {/* Expected effects */}
            <div className="flex flex-wrap gap-1 mt-2">
              {suggestion.expected_effects.map((effect, idx) => (
                <Badge key={idx} variant="secondary" className="text-[10px]">
                  {effect}
                </Badge>
              ))}
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
            {/* Why this workout */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Pourquoi cette séance ?
              </p>
              <p className="text-sm">{suggestion.why}</p>
            </div>

            {/* Staff annotation */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Annotation Staff
              </p>
              <p className="text-sm text-muted-foreground">{suggestion.staffAnnotation}</p>
            </div>

            {/* Cautions */}
            {suggestion.cautions.length > 0 && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <span className="text-xs font-medium text-amber-500">Précautions</span>
                </div>
                <ul className="text-xs text-muted-foreground list-disc list-inside">
                  {suggestion.cautions.map((c, idx) => (
                    <li key={idx}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confidence */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Confiance:</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-3 w-3",
                      i <= Math.round(suggestion.confidence * 5)
                        ? "text-amber-500 fill-amber-500"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function PhaseSection({ phase, suggestions, isExpanded, onToggle }: PhaseCardProps) {
  if (suggestions.length === 0) return null;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className={cn("border-l-4", PHASE_COLORS[phase])}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={PHASE_BADGE_COLORS[phase]}>Phase {phase}</Badge>
                <div>
                  <CardTitle className="text-sm">{PHASE_LABELS[phase]}</CardTitle>
                  <p className="text-xs text-muted-foreground">{PHASE_DESCRIPTIONS[phase]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {suggestions.length} séance{suggestions.length > 1 ? "s" : ""}
                </Badge>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-2">
            {suggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function WahooPersonalizedRecommendations() {
  const { currentAthlete } = useAthletes();
  const { snapshots, tests, checkins, updateSnapshot } = useCloudDataContext();
  const [expandedPhases, setExpandedPhases] = useState<Set<TemporalPhase>>(new Set([1]));

  // Check if current athlete has low TSS7j (< 250) to show justification selector
  const activeSnapshot = useMemo(() => {
    if (!currentAthlete) return null;
    const athleteSnapshots = snapshots.filter((s) => s.athlete_id === currentAthlete.id);
    let snapshot = athleteSnapshots.find((s) => s.id === currentAthlete.active_snapshot_id);
    if (!snapshot && athleteSnapshots.length > 0) {
      snapshot = [...athleteSnapshots].sort((a, b) => b.date.localeCompare(a.date))[0];
    }
    return snapshot;
  }, [currentAthlete, snapshots]);

  // Initialize states from persisted snapshot values
  const [lowCRRJustification, setLowCRRJustification] = useState<LowCRRJustification | undefined>(
    activeSnapshot?.low_crr_justification as LowCRRJustification | undefined
  );
  const [forceDevelopmentMode, setForceDevelopmentMode] = useState(
    activeSnapshot?.force_development_mode ?? false
  );

  // Sync local state when active snapshot changes
  useMemo(() => {
    const persistedJustification = activeSnapshot?.low_crr_justification as LowCRRJustification | undefined;
    setLowCRRJustification(persistedJustification);
    setForceDevelopmentMode(activeSnapshot?.force_development_mode ?? false);
  }, [activeSnapshot?.id, activeSnapshot?.low_crr_justification, activeSnapshot?.force_development_mode]);

  // Handler to update justification and persist to database
  const handleJustificationChange = async (value: string) => {
    const newValue = value === "none" ? null : value;
    setLowCRRJustification(newValue as LowCRRJustification | undefined);
    
    if (activeSnapshot) {
      await updateSnapshot(activeSnapshot.id, { low_crr_justification: newValue });
    }
  };

  // Handler to update force development mode and persist to database
  const handleForceDevelopmentModeChange = async (checked: boolean) => {
    setForceDevelopmentMode(checked);
    
    if (activeSnapshot) {
      await updateSnapshot(activeSnapshot.id, { force_development_mode: checked });
    }
  };

  const hasLowCRR = activeSnapshot?.tss_7d !== null && activeSnapshot?.tss_7d !== undefined && activeSnapshot.tss_7d < 250;

  // Build context and compute suggestions
  const recommendations = useMemo((): SuggestionEngineOutput | null => {
    if (!currentAthlete) return null;

    const athleteId = currentAthlete.id;
    const objectif = currentAthlete.objectif || "IM";
    const activeSnapshotId = currentAthlete.active_snapshot_id;

    // Get active snapshot
    const athleteSnapshots = snapshots.filter((s) => s.athlete_id === athleteId);
    let activeSnapshot = athleteSnapshots.find((s) => s.id === activeSnapshotId);
    if (!activeSnapshot && athleteSnapshots.length > 0) {
      activeSnapshot = [...athleteSnapshots].sort((a, b) => b.date.localeCompare(a.date))[0];
    }

    if (!activeSnapshot) return null;

    // Compute VLamax Effectif
    const vlamaxEffectif = computeVLamaxEffectif({
      athleteId,
      objectif,
      activeSnapshotId: activeSnapshot.id,
      tests: tests.map((t) => ({
        athlete_id: t.athlete_id,
        vlamax: t.vlamax,
        date: t.date,
        type: t.type,
        name: t.name,
      })),
      snapshots: athleteSnapshots.map(mapSnapshotToV2),
    });

    // Compute TTE Effectif
    const tteEffectif = computeTTEEffectif({
      ftp: activeSnapshot.ftp,
      tss_7d: activeSnapshot.tss_7d,
      tte_mode: activeSnapshot.tte_mode,
      tte_observed_min: activeSnapshot.tte_observed_min,
      tte_observed_min_run: (activeSnapshot as any).tte_observed_min_run ?? null,
      objectif,
    });

    // Compute Potentiel Physiologique
    // Calculer l'âge
    const athleteAge = currentAthlete?.birth_date ? (() => {
      const birthDate = new Date(currentAthlete.birth_date);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    })() : null;
    
    const potentielPhysiologique = computePotentielEffectif({
      objectif,
      vlamaxEffectif,
      tteEffectif,
      ftp: activeSnapshot.ftp ?? null,
      poids: activeSnapshot.weight_kg ?? null,
      fatigue_ok: true,
      seance_specifique_validee: false,
      // ✅ Ajout âge pour uniformisation avec Compass
      athleteAge,
    });

    // Determine sport focus based on objective
    let sportFocus: "run" | "bike" | "tri" = "bike";
    if (["Marathon", "Semi", "Trail", "TrailLong", "TrailCourt", "Ultra", "Course"].includes(objectif)) {
      sportFocus = "run";
    } else if (["IM", "Ironman", "703", "70.3", "Half", "Olympic", "Sprint"].includes(objectif)) {
      sportFocus = "tri";
    }

    // Compute injury risk for runners using the correct API
    let injuryRiskRun = undefined;
    if (sportFocus === "run" || sportFocus === "tri") {
      const capRisk = computeCAPInjuryRiskIndex({
        vlamaxValue: vlamaxEffectif.value,
        tteValue: tteEffectif.tte_min,
        objectif,
      });
      const levelMap: Record<number, "faible" | "modéré" | "élevé"> = {
        0: "faible",
        1: "faible",
        2: "modéré",
        3: "élevé",
      };
      injuryRiskRun = {
        level: levelMap[capRisk.level] || "faible",
        score: capRisk.totalScore,
      };
    }

    // Source: fatigue_state du snapshot uniquement (pas de check-in quotidien)
    const fatigueStateToScore: Record<string, number> = {
      fresh: 2, ok: 4, fatigued: 6, high: 8, injured: 10
    };
    const fatigueScore = fatigueStateToScore[(activeSnapshot as any)?.fatigue_state || "ok"] ?? 4;

    // Compute FTP/kg
    const ftpKg = (activeSnapshot.ftp && activeSnapshot.weight_kg) 
      ? activeSnapshot.ftp / activeSnapshot.weight_kg 
      : null;

    // Build context
    const context: SuggestionEngineContext = {
      objectif,
      sportFocus,
      vlamaxEffectif: {
        value: vlamaxEffectif.value,
        confidence: vlamaxEffectif.confidence,
        source: vlamaxEffectif.source,
      },
      tteEffectif: {
        value: tteEffectif.tte_min,
        confidence: tteEffectif.confidence,
        source: tteEffectif.source,
      },
      ftpKg,
      potentielPhysiologique: {
        score: potentielPhysiologique.score,
        details: potentielPhysiologique.details,
      },
      CRR: {
        value: activeSnapshot.tss_7d ?? null,
        confidence: activeSnapshot.tss_7d ? 0.8 : 0.3,
      },
      injuryRiskRun,
      fatigueScore,
      forceDevelopmentMode,
      lowCRRJustification,
    };

    return suggestWahooWorkouts(context);
  }, [currentAthlete, snapshots, tests, checkins, forceDevelopmentMode, lowCRRJustification]);

  const togglePhase = (phase: TemporalPhase) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  };

  // =============================================
  // RENDER: NO DATA
  // =============================================

  if (!currentAthlete) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Sélectionnez un athlète pour voir les recommandations personnalisées
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Ajoutez un snapshot pour {currentAthlete.nom} afin de générer des recommandations
          </p>
        </CardContent>
      </Card>
    );
  }

  const { phasedSuggestions, needAnalysis, diagnosticSummary, primaryConcern } = recommendations;
  const totalSuggestions =
    phasedSuggestions.phase1.length + phasedSuggestions.phase2.length + phasedSuggestions.phase3.length;

  // =============================================
  // RENDER: MAIN
  // =============================================

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Recommandations Personnalisées</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          {totalSuggestions} séances Wahoo SYSTM adaptées au profil de {currentAthlete.nom}
        </p>
      </div>

      {/* Force Development Mode Toggle */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Flame className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <div className="min-w-0">
                <Label htmlFor="force-dev-mode" className="text-sm font-medium cursor-pointer">
                  Forcer développement
                </Label>
                <p className="text-xs text-muted-foreground truncate">
                  Afficher les séances intenses même avec fatigue modérée
                </p>
              </div>
            </div>
            <Switch
              id="force-dev-mode"
              checked={forceDevelopmentMode}
              onCheckedChange={handleForceDevelopmentModeChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Low CRR Justification Selector - only show if TSS7j < 250 */}
      {hasLowCRR && (
        <Card className="bg-amber-500/5 border-amber-500/30">
          <CardContent className="py-3 px-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-1" />
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-sm font-medium text-amber-500">
                    TSS7j faible ({activeSnapshot?.tss_7d ?? 0})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Indiquez la raison pour adapter les suggestions
                  </p>
                </div>
                <Select
                  value={lowCRRJustification || "none"}
                  onValueChange={handleJustificationChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionnez une raison..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Aucune justification</span>
                    </SelectItem>
                    {(Object.keys(LOW_CRR_JUSTIFICATION_LABELS) as LowCRRJustification[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span>{LOW_CRR_JUSTIFICATION_LABELS[key]}</span>
                          <span className="text-xs text-muted-foreground">
                            {LOW_CRR_JUSTIFICATION_EFFECTS[key]}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Priority Indicators - Primary and Secondary */}
      {needAnalysis.priorityOrder.length > 0 && (() => {
        const priorities = needAnalysis.priorityOrder.slice(0, 4);
        const priorityLabels = ["1ère priorité", "2ème priorité", "3ème priorité", "4ème priorité"];
        const objectif = currentAthlete.objectif || "IM";
        const vlamaxRange = getVLamaxRange(objectif);
        const tteTarget = getCentralTTETarget(objectif);
        const ftpKgTarget = getFtpKgTarget(objectif);
        
        // Helper to build tooltip with thresholds
        const buildTooltipContent = (need: WahooNeed) => {
          const rationales = needAnalysis.rationaleByNeed[need] || [];
          const rationaleText = rationales.join(" ") || "Priorité détectée";
          
          // Add threshold info based on the need type
          let thresholdInfo = "";
          if (need === "NEED_VLAMAX_DOWN") {
            thresholdInfo = `\n\n📊 Seuils ${objectif} :\n• VLamax acceptable : ${vlamaxRange.min.toFixed(2)} - ${vlamaxRange.max.toFixed(2)}\n• VLamax optimal : ${vlamaxRange.optimal.toFixed(2)}`;
          } else if (need === "NEED_TTE_UP") {
            thresholdInfo = `\n\n📊 Seuil ${objectif} :\n• TTE minimum : ${tteTarget} min`;
          } else if (need === "NEED_FTP_UP") {
            thresholdInfo = `\n\n📊 Seuil ${objectif} :\n• FTP/kg minimum : ${ftpKgTarget.toFixed(1)} W/kg`;
          }
          
          return rationaleText + thresholdInfo;
        };
        
        return (
          <div className="space-y-3">
            {/* Primary Priority - Large Card */}
            {priorities[0] && (() => {
              const targetAxis = needToTargetAxis(priorities[0]);
              const axisConfig = AXIS_CONFIG[targetAxis];
              const PriorityIcon = axisConfig?.icon || Target;
              const colorClass = axisConfig?.color || "text-primary";
              const bgColorClass = colorClass.replace("text-", "bg-").replace("-500", "-500/15");
              const borderColorClass = colorClass.replace("text-", "border-").replace("-500", "-500/50");
              const tooltipContent = buildTooltipContent(priorities[0]);
              
              return (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className={cn("border-2 cursor-help", borderColorClass, bgColorClass)}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-3 rounded-xl", bgColorClass.replace("/15", "/30"))}>
                                <PriorityIcon className={cn("h-6 w-6", colorClass)} />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  {priorityLabels[0]}
                                </p>
                                <p className={cn("text-lg font-bold", colorClass)}>
                                  {axisConfig?.label || targetAxis}
                                </p>
                              </div>
                            </div>
                            <Badge className={cn("text-sm px-3 py-1", colorClass, bgColorClass.replace("/15", "/30"))}>
                              <Target className="h-4 w-4 mr-1.5" />
                              Focus
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-sm whitespace-pre-line">
                      <p className="text-sm">{tooltipContent}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })()}
            
            {/* Secondary Priorities - Smaller Cards Grid */}
            {priorities.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {priorities.slice(1, 4).map((need, idx) => {
                  const targetAxis = needToTargetAxis(need);
                  const axisConfig = AXIS_CONFIG[targetAxis];
                  const PriorityIcon = axisConfig?.icon || Target;
                  const colorClass = axisConfig?.color || "text-primary";
                  const bgColorClass = colorClass.replace("text-", "bg-").replace("-500", "-500/10");
                  const borderColorClass = colorClass.replace("text-", "border-").replace("-500", "-500/30");
                  const tooltipContent = buildTooltipContent(need);
                  
                  return (
                    <TooltipProvider key={need}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Card className={cn("border cursor-help", borderColorClass, bgColorClass)}>
                            <CardContent className="p-3">
                              <div className="flex items-center gap-2">
                                <div className={cn("p-2 rounded-lg", bgColorClass.replace("/10", "/20"))}>
                                  <PriorityIcon className={cn("h-4 w-4", colorClass)} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                    {priorityLabels[idx + 1]}
                                  </p>
                                  <p className={cn("text-sm font-semibold truncate", colorClass)}>
                                    {axisConfig?.label || targetAxis}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-sm whitespace-pre-line">
                          <p className="text-sm">{tooltipContent}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Diagnostic Summary */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Analyse du profil
              </p>
              <p className="text-sm leading-relaxed">{diagnosticSummary}</p>

              {/* Needs analysis */}
              {needAnalysis.rationale.length > 0 && (
                <div className="mt-3 space-y-1">
                  {needAnalysis.rationale.slice(0, 3).map((r, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary">•</span>
                      {r}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phased Suggestions */}
      <ScrollArea className="h-[50vh]">
        <div className="space-y-3 pr-4">
          <PhaseSection
            phase={1}
            suggestions={phasedSuggestions.phase1}
            isExpanded={expandedPhases.has(1)}
            onToggle={() => togglePhase(1)}
          />
          <PhaseSection
            phase={2}
            suggestions={phasedSuggestions.phase2}
            isExpanded={expandedPhases.has(2)}
            onToggle={() => togglePhase(2)}
          />
          <PhaseSection
            phase={3}
            suggestions={phasedSuggestions.phase3}
            isExpanded={expandedPhases.has(3)}
            onToggle={() => togglePhase(3)}
          />
        </div>
      </ScrollArea>

      {/* Footer note */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground text-center">
            💡 Ces recommandations sont générées automatiquement à partir du profil métabolique,
            de l'objectif course, et de l'état de fatigue. Elles ne remplacent pas l'expertise du coach.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}