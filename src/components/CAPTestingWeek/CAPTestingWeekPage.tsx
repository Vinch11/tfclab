/**
 * CAP Testing Week Page
 * Main page for the CAP Reference Week protocol
 * Shows protocol days and records results for VLamax CAP calibration
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Info,
  Timer,
  Target,
  Zap,
  TrendingUp,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { CAP_TESTING_WEEK, computeCAPCompletion } from "@/data/capTestingWeek";
import { CAPDayCard } from "./CAPDayCard";
import { CAPTestSheet } from "./CAPTestSheet";
import { CAPCompletionSummary } from "./CAPCompletionSummary";
import { CAPGuide } from "./CAPGuide";
import { ThresholdPaceEstimator } from "../TFCLTestingWeek/ThresholdPaceEstimator";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { useAthletes } from "@/contexts/AthleteContext";

export function CAPTestingWeekPage() {
  const navigate = useNavigate();
  const { athletes, selectedAthleteId, setSelectedAthleteId } = useAthletes();
  const { snapshots, getSnapshotsForAthlete, tests } = useCloudDataContext();
  
  const [activeTestDay, setActiveTestDay] = useState<string | null>(null);

  const selectedAthlete = useMemo(
    () => athletes.find((a) => a.id === selectedAthleteId) || null,
    [athletes, selectedAthleteId]
  );

  const activeSnapshot = useMemo(() => {
    if (!selectedAthlete) return null;
    const athleteSnapshots = getSnapshotsForAthlete(selectedAthlete.id);
    if (selectedAthlete.active_snapshot_id) {
      return athleteSnapshots.find((s) => s.id === selectedAthlete.active_snapshot_id) || athleteSnapshots[0] || null;
    }
    return athleteSnapshots.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;
  }, [selectedAthlete, getSnapshotsForAthlete]);

  // Get CAP tests for this athlete
  const capTests = useMemo(() => {
    if (!selectedAthlete) return [];
    return tests
      .filter(t => t.athlete_id === selectedAthlete.id)
      .filter(t => {
        const raw = t.raw as Record<string, unknown> | null;
        return raw?.source === "CAP_TESTING_WEEK" || t.sport === "run";
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tests, selectedAthlete]);

  const completionStatus = useMemo(() => {
    if (!activeSnapshot) return null;
    const snapExt = activeSnapshot as unknown as {
      protocol_quality?: number | null;
    };
    return computeCAPCompletion({
      sprint_15s_distance: activeSnapshot.sprint_15s_distance,
      vma: activeSnapshot.vma,
      pace_threshold_sec_per_km: activeSnapshot.pace_threshold_sec_per_km,
      tte_observed_min: activeSnapshot.tte_observed_min,
      running_power_max: activeSnapshot.running_power_max,
      running_power_threshold: activeSnapshot.running_power_threshold,
      protocol_quality: snapExt.protocol_quality ?? null
    });
  }, [activeSnapshot]);

  // Calculate completion percentage
  const completionPct = useMemo(() => {
    if (!completionStatus) return 0;
    const total = 3; // Sprint, VMA, Allure seuil
    const done = [
      activeSnapshot?.sprint_15s_distance,
      activeSnapshot?.vma,
      activeSnapshot?.pace_threshold_sec_per_km
    ].filter(Boolean).length;
    return Math.round((done / total) * 100);
  }, [completionStatus, activeSnapshot]);

  // VLamax CAP affichée :
  //  - si un test labo (lactate) a renseigné `vlamax_run` avec source labo → on l'affiche comme "mesurée"
  //  - sinon on calcule une estimation rapide à partir de sprint_15s_distance (visualisation seule,
  //    cette valeur n'est plus écrite dans le snapshot — voir mémoire `cap-vlamax-unified-source`)
  const vlamaxDisplay = useMemo(() => {
    const stored = (activeSnapshot as any)?.vlamax_run as number | null | undefined;
    const source = (activeSnapshot as any)?.vlamax_source as string | null | undefined;
    const isLabMeasured = !!source && /lab|lactate/i.test(source);
    if (isLabMeasured && stored != null && stored > 0) {
      return { value: Math.round(stored * 100) / 100, source: "measured" as const };
    }
    const dist = activeSnapshot?.sprint_15s_distance;
    if (!dist || dist < 50 || dist > 120) return null;
    const normalized = (dist - 50) / 70;
    return {
      value: Math.round((0.30 + normalized * 0.40) * 100) / 100,
      source: "estimated" as const,
    };
  }, [activeSnapshot]);
  const estimatedVlamax = vlamaxDisplay?.value ?? null;

  const handleCloseTestSheet = () => {
    setActiveTestDay(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Timer className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-foreground">
                    {CAP_TESTING_WEEK.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Protocole de calibration VLamax CAP
                  </p>
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 pb-24 max-w-4xl space-y-6">
        {/* Athlete Selector */}
        {!selectedAthlete ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Sélectionnez un athlète depuis le tableau de bord pour commencer la semaine de tests CAP.
            </AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Athlète sélectionné
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Target className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{(selectedAthlete as any).nom || (selectedAthlete as any).name || "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    Objectif: {(selectedAthlete as any).objectif || (selectedAthlete as any).goal || "Non défini"}
                  </p>
                </div>
                {capTests.length > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Activity className="h-3 w-3" />
                    {capTests.length} test{capTests.length > 1 ? "s" : ""} CAP
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completion Summary with metrics */}
        {selectedAthlete && activeSnapshot && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Profil CAP — Données Actuelles
                </CardTitle>
                <Badge 
                  variant={completionPct === 100 ? "default" : "secondary"}
                  className={completionPct === 100 ? "bg-green-600" : ""}
                >
                  {completionPct}% complet
                </Badge>
              </div>
              <Progress value={completionPct} className="h-2 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Sprint 15s</div>
                  <div className="text-lg font-bold">
                    {activeSnapshot.sprint_15s_distance 
                      ? `${activeSnapshot.sprint_15s_distance}m` 
                      : "—"
                    }
                  </div>
                  {activeSnapshot.sprint_15s_distance && (
                    <div className="text-xs text-primary">D1 ✓</div>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-xs text-muted-foreground mb-1">VMA</div>
                  <div className="text-lg font-bold">
                    {activeSnapshot.vma 
                      ? `${activeSnapshot.vma} km/h` 
                      : "—"
                    }
                  </div>
                  {activeSnapshot.vma && (
                    <div className="text-xs text-primary">D3 ✓</div>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Allure Seuil</div>
                  <div className="text-lg font-bold">
                    {activeSnapshot.pace_threshold_sec_per_km 
                      ? `${Math.floor(activeSnapshot.pace_threshold_sec_per_km / 60)}:${(activeSnapshot.pace_threshold_sec_per_km % 60).toString().padStart(2, "0")}/km` 
                      : "—"
                    }
                  </div>
                  {activeSnapshot.pace_threshold_sec_per_km && (
                    <div className="text-xs text-primary">D5 ✓</div>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-xs text-muted-foreground mb-1">TTE</div>
                  <div className="text-lg font-bold">
                    {activeSnapshot.tte_observed_min 
                      ? `${activeSnapshot.tte_observed_min} min` 
                      : "—"
                    }
                  </div>
                  {activeSnapshot.tte_observed_min && (
                    <div className="text-xs text-green-600">Observé</div>
                  )}
                </div>
              </div>

              {/* Estimated VLamax CAP */}
              {vlamaxDisplay && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium">
                          {vlamaxDisplay.source === "measured"
                            ? "VLamax CAP mesurée"
                            : "VLamax CAP estimée"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {vlamaxDisplay.source === "measured"
                            ? "Valeur effective (moteur unifié : sprint + power + Modèle C)"
                            : `Estimation rapide depuis sprint 15s (${activeSnapshot.sprint_15s_distance}m)`}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {vlamaxDisplay.value.toFixed(2)} <span className="text-sm font-normal">mmol/L/s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* What's missing */}
              {completionStatus && completionStatus.missingData.length > 0 && (
                <Alert variant="default" className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm">
                    <span className="font-medium">Données manquantes:</span>{" "}
                    {completionStatus.missingData.join(", ")}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Original Completion Summary (if needed for extra info) */}
        {selectedAthlete && completionStatus && !activeSnapshot && (
          <CAPCompletionSummary 
            status={completionStatus} 
            snapshot={activeSnapshot}
          />
        )}

        {/* Interactive Guide */}
        <CAPGuide />

        {/* Threshold Pace Estimator for Day 5 */}
        {selectedAthlete && (
          <ThresholdPaceEstimator 
            defaultVma={activeSnapshot?.vma || null}
          />
        )}

        {/* Description */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {CAP_TESTING_WEEK.description}
          </AlertDescription>
        </Alert>

        {/* Prerequisites */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="prerequisites" className="border rounded-lg bg-card">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Prérequis et conditions de validité
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Équipement requis</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {CAP_TESTING_WEEK.prerequisites.equipment.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium text-sm mb-2">Conditions</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {CAP_TESTING_WEEK.prerequisites.conditions.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-blue-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-medium text-sm mb-2 text-amber-600">⚠️ Avertissements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {CAP_TESTING_WEEK.prerequisites.warnings.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Days */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Programme de la semaine
          </h2>
          
          <ScrollArea className="w-full">
            <div className="space-y-3">
              {CAP_TESTING_WEEK.days.map((day) => {
                // Check if this day has data
                let hasData = false;
                if (day.dayKey === "D1") hasData = !!activeSnapshot?.sprint_15s_distance;
                else if (day.dayKey === "D3") hasData = !!activeSnapshot?.vma;
                else if (day.dayKey === "D5") hasData = !!activeSnapshot?.pace_threshold_sec_per_km;
                
                return (
                  <CAPDayCard
                    key={day.dayKey}
                    day={day}
                    onStartTest={() => setActiveTestDay(day.dayKey)}
                    disabled={!selectedAthlete}
                    completed={hasData}
                  />
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </main>

      {/* Test Sheet Modal */}
      {activeTestDay && selectedAthlete && (
        <CAPTestSheet
          dayKey={activeTestDay}
          athlete={selectedAthlete}
          snapshot={activeSnapshot}
          onClose={handleCloseTestSheet}
          onSave={async (data) => {
            handleCloseTestSheet();
          }}
        />
      )}
    </div>
  );
}
