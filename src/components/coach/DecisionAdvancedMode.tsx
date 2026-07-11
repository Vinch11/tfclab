/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DECISION ADVANCED MODE — Coach Only Dashboard
 * 
 * Vue avancée réservée aux coachs pour :
 * - Voir preuves et calibration
 * - Prendre des décisions hebdomadaires / jour J
 * - Justifier les overrides
 * 
 * MIGRÉ vers architecture 3 moteurs :
 * - computeDiagnostic() pour le diagnostic unifié
 * - computeDecision() pour la prescription
 * - Les panels reçoivent diagnostic + prescription en enrichissement
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhysiologicalProfilePanel } from "./panels/PhysiologicalProfilePanel";
import { EvidenceQualityPanel } from "./panels/EvidenceQualityPanel";
import { WeeklyDecisionPanel } from "./panels/WeeklyDecisionPanel";
import { RaceDecisionPanel } from "./panels/RaceDecisionPanel";
import { Badge } from "@/components/ui/badge";
import { Lock, Brain, Activity, Calendar, Flag } from "lucide-react";
import { useCalibrationEvidence } from "@/hooks/useCalibrationEvidence";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { cn } from "@/lib/utils";

// Engine imports
import { computeDiagnostic, type DiagnosticInput, type AthleteDiagnostic } from "@/engines/diagnostic";
import { computeDecision, type DecisionInput, type TrainingPrescription } from "@/engines/decision";
import { getEffectiveRefs, computeFtpKg } from "@/lib/effectiveRefs";
import { analyzeCriticalPower } from "@/lib/v2/criticalPowerModel";
import { calculateAge } from "@/lib/ageAdjustment";
import { getAthleteAmbition } from "@/types/ambitionLevel";
import type { AmbitionLevel } from "@/types/ambitionLevel";

export function DecisionAdvancedMode() {
  const { currentAthlete } = useAthletes();
  const { snapshots: cloudSnapshots, getSnapshotsForAthlete } = useCloudDataContext();
  const athleteId = currentAthlete?.id ?? null;
  
  // Get active snapshot from cloud data
  const activeSnapshot = athleteId
    ? cloudSnapshots.find(s => s.id === currentAthlete?.active_snapshot_id) 
      ?? cloudSnapshots.filter(s => s.athlete_id === athleteId).sort((a, b) => b.date.localeCompare(a.date))[0]
      ?? null
    : null;
  
  const {
    evidences,
    snapshots: calibrationSnapshots,
    overrides,
    loading,
    latestSnapshot,
    isLocked,
    windowEvidences,
    liveCalibration,
    addEvidence,
    createCalibrationSnapshot,
    addCoachOverride,
  } = useCalibrationEvidence(athleteId);

  // ═══════════════════════════════════════════════════════════════════════════
  // ENGINE INTEGRATION — Compute diagnostic + prescription
  // ═══════════════════════════════════════════════════════════════════════════

  const engineResults = useMemo((): { diagnostic: AthleteDiagnostic; prescription: TrainingPrescription } | null => {
    if (!currentAthlete || !activeSnapshot) return null;

    try {
      const athleteSnapshots = getSnapshotsForAthlete(currentAthlete.id);
      const refs = getEffectiveRefs(currentAthlete, athleteSnapshots);
      const ftpKg = computeFtpKg(refs);
      const age = currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null;
      const ambition = getAthleteAmbition(currentAthlete) as AmbitionLevel;

      // Compute W' for diagnostic
      const cpResult = analyzeCriticalPower({
        pmax_5s: activeSnapshot.pmax_5s ?? null,
        p30s_w: activeSnapshot.p30s_w ?? null,
        p60s_w: activeSnapshot.p60s_w ?? null,
        map5min_w: activeSnapshot.map5min_w ?? null,
        ftp: refs.ftp,
      });

      const diagnosticInput: DiagnosticInput = {
        athleteId: currentAthlete.id,
        athleteName: currentAthlete.name,
        age,
        sex: (currentAthlete.sex === "M" || currentAthlete.sex === "F") ? currentAthlete.sex : null,
        weightKg: refs.weightKg,
        objectif: currentAthlete.goal || "IM",
        ambition,
        sportFocus: activeSnapshot.sport_main === "run" ? "run" : "bike",
        vo2max: refs.vo2max,
        ftp: refs.ftp,
        ftpKg,
        pmax5s: activeSnapshot.pmax_5s ?? null,
        p30sW: activeSnapshot.p30s_w ?? null,
        p60sW: activeSnapshot.p60s_w ?? null,
        map5minW: activeSnapshot.map5min_w ?? null,
        vma: refs.vma,
        css: refs.css,
        vlamax: activeSnapshot.vlamax ?? null,
        vlamaxRun: activeSnapshot.vlamax_run ?? null,
        vlamaxSource: activeSnapshot.vlamax_source ?? null,
        vlamaxProtocol: activeSnapshot.vlamax_protocol ?? null,
        vlamaxIsReference: activeSnapshot.vlamax_is_reference ?? false,
        tteObservedMin: activeSnapshot.tte_observed_min ?? null,
        tteObservedMinRun: (activeSnapshot as any).tte_observed_min_run ?? null,
        tteMode: activeSnapshot.tte_mode ?? null,
        tss7d: activeSnapshot.tss_7d ?? null,
        fatigueState: activeSnapshot.fatigue_state ?? null,
        runEconomyScore: activeSnapshot.run_economy_score ?? null,
        runHrDriftPct: activeSnapshot.run_hr_drift_pct ?? null,
        paceThresholdSecPerKm: activeSnapshot.pace_threshold_sec_per_km ?? null,
        runningPower1s: activeSnapshot.running_power_1s ?? null,
        runningPower5s: activeSnapshot.running_power_5s ?? null,
        runningPower30s: activeSnapshot.running_power_30s ?? null,
        runningPower60s: activeSnapshot.running_power_60s ?? null,
        runningPower5min: activeSnapshot.running_power_5min ?? null,
        runningPowerThreshold: activeSnapshot.running_power_threshold ?? null,
        sprint15sDistance: activeSnapshot.sprint_15s_distance ?? null,
        bikeCadenceRpm: activeSnapshot.bike_cadence_rpm ?? null,
        bikeHrDriftFlag: activeSnapshot.bike_hr_drift_flag ?? false,
        protocolQuality: activeSnapshot.protocol_quality ?? null,
        wprimeKj: cpResult?.wprimeKJ ?? null,
        cpDataQuality: cpResult?.dataQuality ?? null,
        fatmax: null,
        forceDevMode: activeSnapshot.force_development_mode ?? false,
        giIssuesFlag: activeSnapshot.gi_issues_flag ?? false,
      };

      const diagnostic = computeDiagnostic(diagnosticInput);

      const decisionInput: DecisionInput = {
        diagnostic,
        context: {
          daysToRace: null,
          isRaceWeek: false,
          currentPhase: "build",
        },
        load: {
          tss7d: activeSnapshot.tss_7d ?? null,
          tss28d: activeSnapshot.tss_7d ? (activeSnapshot.tss_7d) * 4 : null,
        },
      };

      const prescription = computeDecision(decisionInput);

      return { diagnostic, prescription };
    } catch (e) {
      console.error("[DecisionAdvancedMode] Engine computation failed:", e);
      return null;
    }
  }, [currentAthlete, activeSnapshot, getSnapshotsForAthlete]);

  if (!currentAthlete) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Sélectionnez un athlète pour accéder au mode décision avancé.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Decision Advanced Mode
              <Badge variant="outline" className="text-xs font-normal">
                Coach Only
              </Badge>
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentAthlete.name} — Vue calibration & décision
            </p>
          </div>
        </div>

        {/* Lock Status */}
        <div className="flex items-center gap-2">
          {isLocked ? (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Profil verrouillé
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
              Profil ouvert
            </Badge>
          )}
          
          {liveCalibration?.recalibration_recommended && (
            <Badge variant="destructive" className="animate-pulse">
              Recalibration recommandée
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs with 4 Panels */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Profil Physio</span>
            <span className="sm:hidden">Profil</span>
          </TabsTrigger>
          <TabsTrigger value="evidence" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Preuves</span>
            <span className="sm:hidden">Preuves</span>
            {windowEvidences.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {windowEvidences.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Décision Semaine</span>
            <span className="sm:hidden">Semaine</span>
          </TabsTrigger>
          <TabsTrigger value="race" className="gap-2">
            <Flag className="h-4 w-4" />
            <span className="hidden sm:inline">Décision Course</span>
            <span className="sm:hidden">Course</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <PhysiologicalProfilePanel
            athleteId={athleteId!}
            latestSnapshot={latestSnapshot}
            liveCalibration={liveCalibration}
            activeSnapshot={activeSnapshot}
            isLocked={isLocked}
            onCreateSnapshot={createCalibrationSnapshot}
            diagnostic={engineResults?.diagnostic ?? null}
          />
        </TabsContent>

        <TabsContent value="evidence">
          <EvidenceQualityPanel
            athleteId={athleteId!}
            evidences={evidences}
            windowEvidences={windowEvidences}
            loading={loading}
            onAddEvidence={addEvidence}
            onForceRecalibration={async (reason) => {
              await addCoachOverride(
                "CALIBRATION",
                "FORCE_RECALIBRATION",
                reason,
                { locked: isLocked },
                { recalibrated: true }
              );
              if (latestSnapshot?.vlamax_modelled) {
                await createCalibrationSnapshot(
                  latestSnapshot.vlamax_modelled,
                  latestSnapshot.confidence,
                  false
                );
              }
            }}
            isLocked={isLocked}
          />
        </TabsContent>

        <TabsContent value="weekly">
          <WeeklyDecisionPanel
            athleteId={athleteId!}
            liveCalibration={liveCalibration}
            overrides={overrides}
            onAddOverride={addCoachOverride}
            prescription={engineResults?.prescription ?? null}
          />
        </TabsContent>

        <TabsContent value="race">
          <RaceDecisionPanel
            athleteId={athleteId!}
            liveCalibration={liveCalibration}
            activeSnapshot={activeSnapshot}
            diagnostic={engineResults?.diagnostic ?? null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
