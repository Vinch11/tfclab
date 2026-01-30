/**
 * Live Decision Mode Page — Route dédiée /live-decision
 * Mode temps réel Coach Only
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LiveDecisionMode } from '@/components/LiveDecisionMode';
import { useAthletes } from '@/contexts/AthleteContext';
import { useCloudData } from '@/hooks/useCloudData';
import { computeVLamaxEffectif } from '@/lib/vlamaxEffectif';
import { computeTTEEffectif } from '@/lib/tteEffectif';
import { computeFatMaxTFCL } from '@/lib/v2/fatmaxTFCL';
import { computeDisponibiliteTFCL } from '@/lib/v2/disponibiliteTFCL';
import { computePacingEnvelope } from '@/lib/v2/pacingEnvelopeEngine';
import type { RaceObjective } from '@/lib/v2/pacingEnvelopeEngine';

// Race duration mapping
const RACE_DURATION_MAP: Record<string, number> = {
  IM: 540,
  "70.3": 270,
  Marathon: 210,
  Semi: 100,
  "10km": 45,
};

export default function LiveDecisionModePage() {
  const navigate = useNavigate();
  const { currentAthlete: selectedAthlete } = useAthletes();
  const { snapshots, tests, checkins } = useCloudData();
  
  const athleteId = selectedAthlete?.id ?? '';
  const objectif = selectedAthlete?.goal ?? 'IM';
  const activeSnapshotId = selectedAthlete?.active_snapshot_id ?? null;
  const raceObjective = objectif as RaceObjective;
  const discipline = ["Marathon", "Semi", "10km"].includes(objectif) ? "run" as const : "bike" as const;
  const raceDurationMin = RACE_DURATION_MAP[objectif] ?? 180;
  
  // Compute all effectifs
  const vlamaxEffectif = React.useMemo(() => {
    if (!athleteId) return null;
    return computeVLamaxEffectif({
      athleteId,
      objectif,
      activeSnapshotId,
      tests: tests ?? [],
      snapshots: snapshots ?? [],
    });
  }, [athleteId, objectif, activeSnapshotId, tests, snapshots]);
  
  const activeSnapshot = React.useMemo(() => {
    if (!snapshots || !athleteId) return null;
    const athleteSnapshots = snapshots.filter(s => s.athlete_id === athleteId);
    if (activeSnapshotId) {
      return athleteSnapshots.find(s => s.id === activeSnapshotId) ?? athleteSnapshots[0] ?? null;
    }
    return athleteSnapshots.sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  }, [snapshots, athleteId, activeSnapshotId]);
  
  const tteEffectif = React.useMemo(() => {
    if (!activeSnapshot) return null;
    return computeTTEEffectif({
      ftp: activeSnapshot.ftp,
      tss_7d: activeSnapshot.tss_7d,
      tte_mode: activeSnapshot.tte_mode,
      tte_observed_min: activeSnapshot.tte_observed_min,
      objectif,
    });
  }, [activeSnapshot, objectif]);
  
  const fatmax = React.useMemo(() => {
    if (!vlamaxEffectif?.value) return null;
    return computeFatMaxTFCL({
      vlamaxEffectif: vlamaxEffectif.value,
      vlamaxConfidence: vlamaxEffectif.confidence,
      vo2maxEffectif: activeSnapshot?.vo2max ?? null,
      tteEffectif: tteEffectif?.tte_min ?? null,
      tteConfidence: tteEffectif?.confidence ?? 0.5,
      fatigueIndex: null,
      objectif: objectif as any,
    });
  }, [vlamaxEffectif, tteEffectif, activeSnapshot, objectif]);

  const latestCheckin = React.useMemo(() => {
    if (!checkins || !athleteId) return null;
    const athleteCheckins = checkins.filter(c => c.athlete_id === athleteId);
    return athleteCheckins.sort((a, b) => b.date_iso.localeCompare(a.date_iso))[0] ?? null;
  }, [checkins, athleteId]);

  const disponibilite = React.useMemo(() => {
    if (!latestCheckin) return null;
    return computeDisponibiliteTFCL({
      fatigue: latestCheckin.fatigue ?? null,
      soreness: latestCheckin.soreness ?? null,
      sleep: latestCheckin.sleep ?? null,
      motivation: latestCheckin.motivation ?? null,
      stress: latestCheckin.stress ?? null,
      objective: {
        tss7d: activeSnapshot?.tss_7d ?? null,
      },
    });
  }, [latestCheckin, activeSnapshot]);

  const raceReadinessScore = disponibilite?.score ?? null;

  const envelope = React.useMemo(() => {
    return computePacingEnvelope({
      vlamaxEffectif,
      tteEffectif,
      fatmax,
      raceReadinessScore,
      fatigueIndex: latestCheckin?.fatigue ? latestCheckin.fatigue * 10 : null,
      raceObjective,
      sport: discipline,
      ftp: activeSnapshot?.ftp,
      vma: activeSnapshot?.vma,
      paceThreshold: activeSnapshot?.pace_threshold_sec_per_km,
      weight: activeSnapshot?.weight_kg,
    });
  }, [vlamaxEffectif, tteEffectif, fatmax, raceReadinessScore, latestCheckin, raceObjective, discipline, activeSnapshot]);

  // Si données manquantes
  if (!envelope) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Live Decision Mode™</p>
          <p className="text-sm text-muted-foreground">
            Sélectionne un athlète avec des données complètes pour activer ce mode.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="text-primary underline text-sm"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <LiveDecisionMode
      athleteName={selectedAthlete?.name ?? 'Athlète'}
      envelope={envelope}
      raceObjective={raceObjective}
      raceReadinessScore={raceReadinessScore}
      vlamaxValue={vlamaxEffectif?.value ?? null}
      tteMin={tteEffectif?.tte_min ?? null}
      targetPowerOrPace={activeSnapshot?.ftp ?? 250}
      targetHR={activeSnapshot?.fc_max ? Math.round(activeSnapshot.fc_max * 0.75) : null}
      totalExpectedDurationMin={raceDurationMin}
      onClose={() => navigate(-1)}
    />
  );
}
