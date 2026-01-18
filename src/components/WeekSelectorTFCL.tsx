// =============================================
// WEEK SELECTOR TFCL™ - UI Component
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
import { Target, AlertTriangle, CheckCircle2, Info, Zap, Calendar, User, Activity, Shield } from "lucide-react";

import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeTTEEffectif } from "@/lib/tteEffectif";
import { computeFatigueEffectif } from "@/lib/fatigueEffectif";
import { computeRaceReadinessEffectif } from "@/lib/raceReadinessEffectif";
import { computeRunInjuryRisk } from "@/lib/runInjuryRisk";
import { suggestTopWeeks, computePhaseFromDate } from "@/lib/templates/weekSelectorTFCL";
import { getWeeksByGoal, getWeekContext } from "@/lib/templates/runningTemplatesStore";
import type { 
  AthleteTruthRunning, 
  WeekSelectorContext, 
  WeekSuggestion,
  RunningGoal,
  AmbitionLevel,
  RunningPhase,
} from "@/types/runningTemplate";

interface WeekSelectorTFCLProps {
  onInsertWeek?: (suggestion: WeekSuggestion) => void;
}

export function WeekSelectorTFCL({ onInsertWeek }: WeekSelectorTFCLProps) {
  const { athletes, snapshots, tests, getSnapshotsForAthlete } = useCloudDataContext();
  
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [raceType, setRaceType] = useState<RunningGoal>("semi");
  const [ambition, setAmbition] = useState<AmbitionLevel>("PERF");
  const [phaseManual, setPhaseManual] = useState<RunningPhase | "">("");
  const [raceDate, setRaceDate] = useState<string>("");
  const [showResults, setShowResults] = useState(false);

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

    // Race Readiness (for fatigue calc)
    const readinessResult = computeRaceReadinessEffectif({
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
      raceReadiness: readinessResult,
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
      sex: null, // Sex not stored in DbAthlete yet
      objectif,
    };
  }, [selectedAthlete, activeSnapshot, tests, snapshots]);

  // Build context and get suggestions
  const suggestions = useMemo(() => {
    if (!athleteTruth || !showResults) return null;

    const weeks = getWeeksByGoal(raceType);
    
    const context: WeekSelectorContext = {
      raceType,
      ambition,
      race_date: raceDate || undefined,
      phase_manual: phaseManual || (raceDate ? computePhaseFromDate(raceDate) : undefined),
    };

    return suggestTopWeeks(weeks, athleteTruth, context);
  }, [athleteTruth, raceType, ambition, phaseManual, raceDate, showResults]);

  const handleSuggest = () => {
    if (selectedAthleteId) {
      setShowResults(true);
    }
  };

  const getBadgeVariant = (badge: string) => {
    switch (badge) {
      case "TOP": return "default";
      case "GOOD": return "secondary";
      case "CAUTION": return "outline";
      default: return "outline";
    }
  };

  const getBadgeClass = (badge: string) => {
    switch (badge) {
      case "TOP": return "bg-green-500 text-white";
      case "GOOD": return "bg-blue-500 text-white";
      case "CAUTION": return "bg-amber-500 text-white";
      default: return "";
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Week Selector TFCL™
          <Badge variant="outline" className="ml-2 text-xs">Beta</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Suggestion de semaine basée sur le profil physiologique. Le coach décide.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Athlete Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Athlète
          </Label>
          <Select value={selectedAthleteId} onValueChange={(v) => { setSelectedAthleteId(v); setShowResults(false); }}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un athlète" />
            </SelectTrigger>
            <SelectContent>
              {athletes.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Race Type & Ambition */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Objectif</Label>
            <Select value={raceType} onValueChange={(v) => { setRaceType(v as RunningGoal); setShowResults(false); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="marathon">Marathon</SelectItem>
                <SelectItem value="semi">Semi-Marathon</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ambition</Label>
            <Select value={ambition} onValueChange={(v) => { setAmbition(v as AmbitionLevel); setShowResults(false); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FINISH">Finisher</SelectItem>
                <SelectItem value="PERF">Performance</SelectItem>
                <SelectItem value="SUB">Sub (Chrono)</SelectItem>
                <SelectItem value="ELITE">Elite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Phase */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Phase (optionnel)
          </Label>
          <Select value={phaseManual} onValueChange={(v) => { setPhaseManual(v as RunningPhase | ""); setShowResults(false); }}>
            <SelectTrigger>
              <SelectValue placeholder="Auto (selon date course)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Auto</SelectItem>
              <SelectItem value="BASE">Base / Construction</SelectItem>
              <SelectItem value="BUILD">Build / Développement</SelectItem>
              <SelectItem value="SPECIFIC">Spécifique</SelectItem>
              <SelectItem value="TAPER">Affûtage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Suggest Button */}
        <Button 
          onClick={handleSuggest} 
          className="w-full"
          disabled={!selectedAthleteId}
        >
          <Zap className="h-4 w-4 mr-2" />
          Suggérer une semaine
        </Button>

        {/* Results */}
        {suggestions && (
          <div className="space-y-4 pt-4 border-t">
            {/* Warnings */}
            {suggestions.warnings.length > 0 && (
              <Alert variant="destructive" className="bg-amber-50 border-amber-200 dark:bg-amber-950/30">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm">
                    {suggestions.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Athlete Profile Summary */}
            {athleteTruth && (
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-muted/50 rounded p-2">
                  <div className="font-mono font-bold">{athleteTruth.vlamax_run.value?.toFixed(2) || "—"}</div>
                  <div className="text-muted-foreground">VLamax</div>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <div className="font-mono font-bold">{athleteTruth.tte_run.value || "—"}</div>
                  <div className="text-muted-foreground">TTE</div>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <div className="font-mono font-bold">{athleteTruth.fatigueIndex}%</div>
                  <div className="text-muted-foreground">Fatigue</div>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <div className="font-mono font-bold">{athleteTruth.runInjuryRisk.score}%</div>
                  <div className="text-muted-foreground">Risque</div>
                </div>
              </div>
            )}

            {/* Suggestions */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Top 3 Suggestions
                <Badge variant="outline" className="text-xs">
                  Confiance: {suggestions.confidenceLabel}
                </Badge>
              </h4>

              <Accordion type="single" collapsible>
                {suggestions.suggestions.map((suggestion, idx) => {
                  const context = getWeekContext(suggestion as any);
                  return (
                    <AccordionItem key={suggestion.week_id} value={suggestion.week_id}>
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-3 text-left">
                          <Badge className={getBadgeClass(suggestion.badge)}>
                            #{idx + 1} {suggestion.badge}
                          </Badge>
                          <div>
                            <div className="font-medium text-sm">
                              S{suggestion.week_number}: {suggestion.week_title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {suggestion.week_summary} • {suggestion.match_score}%
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2">
                        {/* Why */}
                        <div className="bg-green-50 dark:bg-green-950/30 rounded p-3">
                          <div className="flex items-start gap-2 text-sm">
                            <Info className="h-4 w-4 text-green-600 mt-0.5" />
                            <span>{suggestion.why}</span>
                          </div>
                        </div>

                        {/* Watchouts */}
                        {suggestion.watchouts.length > 0 && (
                          <div className="bg-amber-50 dark:bg-amber-950/30 rounded p-3">
                            <div className="flex items-start gap-2 text-sm">
                              <Shield className="h-4 w-4 text-amber-600 mt-0.5" />
                              <div>
                                <span className="font-medium">Garde-fous:</span>
                                <ul className="list-disc list-inside mt-1">
                                  {suggestion.watchouts.map((w, i) => (
                                    <li key={i} className="text-muted-foreground">{w}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Adjustments */}
                        {suggestion.suggested_adjustments.length > 0 && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-3">
                            <div className="flex items-start gap-2 text-sm">
                              <Activity className="h-4 w-4 text-blue-600 mt-0.5" />
                              <div>
                                <span className="font-medium">Ajustements suggérés (non imposés):</span>
                                <ul className="list-disc list-inside mt-1">
                                  {suggestion.suggested_adjustments.map((a, i) => (
                                    <li key={i} className="text-muted-foreground">{a}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Sessions Preview */}
                        <div className="text-xs text-muted-foreground">
                          {suggestion.sessions.filter(s => s.type !== "REST").length} séances actives • 
                          {suggestion.sessions.filter(s => s.isKey).length} séances clés
                        </div>

                        {onInsertWeek && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full"
                            onClick={() => onInsertWeek(suggestion)}
                          >
                            Insérer dans Plan Coach
                          </Button>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground italic text-center">
              {suggestions.disclaimer}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
