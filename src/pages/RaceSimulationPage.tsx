/**
 * Race Simulation Page TFCL™
 * Page dédiée à la simulation de course
 * Intègre le Pacing Envelope™ TFCL
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RaceSimulationModule } from '@/components/RaceSimulationModule';
import { PacingEnvelopeCard } from '@/components/PacingEnvelopeCard';
import { useAthletes } from '@/contexts/AthleteContext';
import { useCloudData } from '@/hooks/useCloudData';
import { computeVLamaxEffectif } from '@/lib/vlamaxEffectif';
import { computeTTEEffectif } from '@/lib/tteEffectif';
import { computeFatMaxTFCL } from '@/lib/v2/fatmaxTFCL';
import { computeDisponibiliteTFCL, TFCLReadinessInput } from '@/lib/v2/disponibiliteTFCL';
import { SIMULATION_ACADEMY, SIMULATION_ACADEMY_BASIC, SIMULATION_ACADEMY_PRO, SIMULATION_DEFINITIONS } from '@/lib/v2/raceSimulation';
import type { RaceObjective } from '@/lib/v2/pacingEnvelopeEngine';

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
  
  // Determine discipline and race objective
  const discipline: 'bike' | 'run' = React.useMemo(() => {
    const goal = selectedAthlete?.goal ?? '';
    if (goal.includes('Marathon') || goal.includes('Semi') || goal.includes('10km')) {
      return 'run';
    }
    return 'bike';
  }, [selectedAthlete?.goal]);
  
  // Normalize race objective for Pacing Envelope
  const raceObjective: RaceObjective = React.useMemo(() => {
    const goal = selectedAthlete?.goal ?? 'IM';
    if (goal.includes('Marathon') && !goal.includes('Semi')) return 'Marathon';
    if (goal.includes('Semi')) return 'Semi';
    if (goal.includes('10km') || goal.includes('10k')) return '10km';
    if (goal.includes('70.3') || goal.includes('703')) return '70.3';
    return 'IM';
  }, [selectedAthlete?.goal]);
  
  // Race duration estimation (for chart)
  const raceDurationMin = React.useMemo(() => {
    switch (raceObjective) {
      case 'IM': return 300;
      case '70.3': return 150;
      case 'Marathon': return 210;
      case 'Semi': return 100;
      case '10km': return 45;
      default: return 180;
    }
  }, [raceObjective]);
  
  // Compute Race Readiness Score for Pacing Envelope
  const raceReadinessScore = React.useMemo(() => {
    if (!disponibilite) return null;
    // Simple approximation based on disponibilité
    return disponibilite.score;
  }, [disponibilite]);
  
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
        
        {/* Tabs: Simulation vs Pacing Envelope */}
        <Tabs defaultValue="envelope" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="envelope" className="text-sm">Pacing Envelope™</TabsTrigger>
            <TabsTrigger value="simulation" className="text-sm">Simulation Fuel</TabsTrigger>
          </TabsList>
          
          <TabsContent value="envelope" className="mt-4">
            <PacingEnvelopeCard
              input={{
                vlamaxEffectif: vlamaxEffectif,
                tteEffectif: tteEffectif,
                fatmax: fatmax,
                raceReadinessScore: raceReadinessScore,
                fatigueIndex: latestCheckin?.fatigue ? latestCheckin.fatigue * 10 : null,
                raceObjective: raceObjective,
                sport: discipline,
                ftp: activeSnapshot?.ftp,
                vma: activeSnapshot?.vma,
                paceThreshold: activeSnapshot?.pace_threshold_sec_per_km,
                weight: activeSnapshot?.weight_kg,
              }}
              raceDurationMin={raceDurationMin}
              staffMode
            />
          </TabsContent>
          
          <TabsContent value="simulation" className="mt-4">
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
          </TabsContent>
        </Tabs>
        
        {/* Academy section - collapsible on mobile */}
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer list-none py-2 touch-manipulation">
            <h2 className="text-base sm:text-lg font-semibold">
              Academy — Pacing & Simulation
            </h2>
            <span className="text-muted-foreground text-sm group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 pt-3">
            <div className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="font-medium text-sm mb-2">Pacing Envelope™</h3>
              <p className="text-xs text-muted-foreground">
                Le couloir physiologique de pacing définit les limites sécurisées selon votre profil métabolique.
                TFCL ne prescrit pas une allure — il explique, simule et cadre la décision.
              </p>
            </div>
            <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-medium text-sm mb-2">Simulation Fuel & Risk</h3>
              <p className="text-xs text-muted-foreground">
                {SIMULATION_DEFINITIONS.methodology}
              </p>
            </div>
          </div>
        </details>
      </main>
    </div>
  );
}
