/**
 * Race-Day Mode Page — Route dédiée /race-day
 * Mode mobile fullscreen pour le jour de course
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RaceDayMode } from '@/components/RaceDayMode';
import { useAthletes } from '@/contexts/AthleteContext';
import { useCloudData } from '@/hooks/useCloudData';
import { computeVLamaxEffectif } from '@/lib/vlamaxEffectif';
import { computeTTEEffectif } from '@/lib/tteEffectif';
import { computeFatMaxTFCL } from '@/lib/v2/fatmaxTFCL';
import { computeDisponibiliteTFCL } from '@/lib/v2/disponibiliteTFCL';
import { computePacingEnvelope } from '@/lib/v2/pacingEnvelopeEngine';
import { generateDisciplineRules } from '@/lib/v2/pacingDisciplineRules';
import { simulatePacingScenarios } from '@/lib/v2/pacingScenarioSimulator';
import type { RaceObjective } from '@/lib/v2/pacingEnvelopeEngine';

export default function RaceDayModePage() {
  const navigate = useNavigate();
  const { currentAthlete: selectedAthlete } = useAthletes();
  const { snapshots, tests } = useCloudData();
  
  const athleteId = selectedAthlete?.id ?? '';
  const objectif = selectedAthlete?.goal ?? 'IM';
  const activeSnapshotId = selectedAthlete?.active_snapshot_id ?? null;
  const raceObjective = objectif as RaceObjective;
  const discipline = ["Marathon", "Semi", "10km"].includes(objectif) ? "run" as const : "bike" as const;
  
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

  const latestCheckin = null;

  const disponibilite = null;

  const raceReadinessScore = null;

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

  const rules = React.useMemo(() => {
    if (!envelope) return null;
    return generateDisciplineRules({
      envelope,
      vlamaxEffectif,
      raceObjective,
      sport: discipline,
      raceReadinessScore,
    });
  }, [envelope, vlamaxEffectif, raceObjective, discipline, raceReadinessScore]);

  const scenarios = React.useMemo(() => {
    if (!envelope) return null;
    return simulatePacingScenarios({
      envelope,
      raceObjective,
      vlamaxValue: vlamaxEffectif?.value ?? null,
      tteMin: tteEffectif?.tte_min ?? null,
      raceDistanceKm: 90,
      raceDurationMin: 180,
    });
  }, [envelope, raceObjective, vlamaxEffectif, tteEffectif]);

  // Si données manquantes
  if (!envelope || !rules || !scenarios) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Race-Day Mode™</p>
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
    <RaceDayMode
      athleteName={selectedAthlete?.name ?? 'Athlète'}
      envelope={envelope}
      rules={rules}
      scenarios={scenarios}
      raceObjective={raceObjective}
      raceReadinessScore={raceReadinessScore}
      onClose={() => navigate(-1)}
    />
  );
}
