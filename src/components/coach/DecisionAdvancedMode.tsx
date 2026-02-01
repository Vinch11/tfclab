/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DECISION ADVANCED MODE — Coach Only Dashboard
 * 
 * Vue avancée réservée aux coachs pour :
 * - Voir preuves et calibration
 * - Prendre des décisions hebdomadaires / jour J
 * - Justifier les overrides
 * ═══════════════════════════════════════════════════════════════════════════════
 */

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

export function DecisionAdvancedMode() {
  const { currentAthlete } = useAthletes();
  const { snapshots: cloudSnapshots } = useCloudDataContext();
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
          />
        </TabsContent>

        <TabsContent value="race">
          <RaceDecisionPanel
            athleteId={athleteId!}
            liveCalibration={liveCalibration}
            activeSnapshot={activeSnapshot}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
