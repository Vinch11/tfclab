/**
 * Race Simulation Page TFCL™
 * Page dédiée à la simulation de course
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RaceSimulationModule } from '@/components/RaceSimulationModule';
import { useAthletes } from '@/contexts/AthleteContext';
import { useCloudData } from '@/hooks/useCloudData';
import { computeVLamaxEffectif } from '@/lib/vlamaxEffectif';
import { computeTTEEffectif } from '@/lib/tteEffectif';
import { computeFatMaxTFCL } from '@/lib/v2/fatmaxTFCL';
import { computeDisponibiliteTFCL, TFCLReadinessInput } from '@/lib/v2/disponibiliteTFCL';
import { SIMULATION_ACADEMY, SIMULATION_ACADEMY_BASIC, SIMULATION_ACADEMY_PRO, SIMULATION_DEFINITIONS } from '@/lib/v2/raceSimulation';

export default function RaceSimulationPage() {
  const navigate = useNavigate();
  const { currentAthlete: selectedAthlete } = useAthletes();
  const { snapshots, tests, checkins } = useCloudData();
  
  // Compute effectifs
  const athleteId = selectedAthlete?.id ?? '';
  const objectif = selectedAthlete?.goal ?? 'IM';
  const activeSnapshotId = selectedAthlete?.active_snapshot_id ?? null;
  
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
  
  // Disponibilité depuis checkins
  const latestCheckin = React.useMemo(() => {
    if (!checkins || !athleteId) return null;
    const athleteCheckins = checkins.filter(c => c.athlete_id === athleteId);
    return athleteCheckins.sort((a, b) => b.date_iso.localeCompare(a.date_iso))[0] ?? null;
  }, [checkins, athleteId]);
  
  const disponibilite = React.useMemo(() => {
    if (!latestCheckin) return null;
    const input: TFCLReadinessInput = {
      sleep: latestCheckin.sleep,
      fatigue: latestCheckin.fatigue,
      soreness: latestCheckin.soreness,
      stress: latestCheckin.stress,
      motivation: latestCheckin.motivation,
      objective: {
        tss7d: activeSnapshot?.tss_7d ?? null,
        tssTarget: 400,
      },
    };
    return computeDisponibiliteTFCL(input);
  }, [latestCheckin, activeSnapshot]);
  
  // Determine discipline
  const discipline: 'bike' | 'run' = React.useMemo(() => {
    const goal = selectedAthlete?.goal ?? '';
    if (goal.includes('Marathon') || goal.includes('Semi') || goal.includes('10km')) {
      return 'run';
    }
    return 'bike';
  }, [selectedAthlete?.goal]);
  
  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Header - iOS optimized with safe area */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b pt-safe">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="min-w-[44px] min-h-[44px] touch-manipulation"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate">
              Simulation de Course TFCL™
            </h1>
            <p className="text-sm text-muted-foreground truncate">
              {selectedAthlete?.name ?? 'Aucun athlète sélectionné'}
            </p>
          </div>
        </div>
      </header>
      
      {/* Content - iOS optimized spacing */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Info banner - compact on mobile */}
        <Alert className="text-sm">
          <Info className="h-4 w-4 flex-shrink-0" />
          <AlertDescription className="text-xs sm:text-sm leading-relaxed">
            {SIMULATION_DEFINITIONS.official}
          </AlertDescription>
        </Alert>
        
        {/* Module principal */}
        <RaceSimulationModule
          vlamaxEffectif={vlamaxEffectif?.value}
          vlamaxConfidence={vlamaxEffectif?.confidence ?? 0.5}
          vlamaxDiscipline={discipline}
          tteMin={tteEffectif?.tte_min}
          tteConfidence={tteEffectif?.confidence ?? 0.5}
          fatmax={fatmax}
          disponibiliteScore={disponibilite?.score}
          disponibiliteLevel={disponibilite?.level}
          ftp={activeSnapshot?.ftp}
          vma={activeSnapshot?.vma}
          paceThreshold={activeSnapshot?.pace_threshold_sec_per_km}
          weight={activeSnapshot?.weight_kg}
          staffMode
        />
        
        {/* Academy section - versions BASIC et PRO - collapsible on mobile */}
        <details className="group" open>
          <summary className="flex items-center justify-between cursor-pointer list-none py-2 touch-manipulation">
            <h2 className="text-base sm:text-lg font-semibold">
              Academy — Simulation BASIC vs PRO
            </h2>
            <span className="text-muted-foreground text-sm group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 pt-3">
            {SIMULATION_ACADEMY_BASIC.sections.slice(0, 2).map((section, i) => (
              <div key={`basic-${i}`} className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-0.5 bg-green-200 dark:bg-green-800 rounded">BASIC</span>
                  <h3 className="font-medium text-xs sm:text-sm">{section.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            ))}
            {SIMULATION_ACADEMY_PRO.sections.slice(0, 2).map((section, i) => (
              <div key={`pro-${i}`} className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-0.5 bg-blue-200 dark:bg-blue-800 rounded">PRO</span>
                  <h3 className="font-medium text-xs sm:text-sm">{section.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
        </details>
      </main>
    </div>
  );
}
