/**
 * Race Simulation Page TFCL™
 * Page dédiée à la simulation de course
 * Intègre Pacing Envelope™, Briefing Jour J, Staff Report V2
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { SidebarLayout } from '@/components/SidebarLayout';
import { RaceSimulationModule } from '@/components/RaceSimulationModule';
import { PacingEnvelopeCard } from '@/components/PacingEnvelopeCard';
import { RaceDayBriefingMode } from '@/components/RaceDayBriefingMode';
import { StaffPacingReportV2 } from '@/components/StaffPacingReportV2';
import { CaffeineProtocolCard } from '@/components/CaffeineProtocolCard';
import { CarbLoadingCard } from '@/components/CarbLoadingCard';
import { GutTrainingCard } from '@/components/GutTrainingCard';
import { HydrationProtocolCard } from '@/components/HydrationProtocolCard';
import { RecoveryNutritionCard } from '@/components/RecoveryNutritionCard';

import { useAthletes } from '@/contexts/AthleteContext';
import { useCloudData } from '@/hooks/useCloudData';
import { computeVLamaxEffectif, computeTTEEffectif } from '@/engines/diagnostic';
import { computeFatMaxTFCL } from '@/lib/v2/fatmaxTFCL';
import { computeDisponibiliteTFCL, TFCLReadinessInput } from '@/lib/v2/disponibiliteTFCL';
import { computePacingEnvelope } from '@/lib/v2/pacingEnvelopeEngine';
import { generateDisciplineRules } from '@/lib/v2/pacingDisciplineRules';
import { simulatePacingScenarios } from '@/lib/v2/pacingScenarioSimulator';
import { SIMULATION_DEFINITIONS } from '@/lib/v2/raceSimulation';
import type { RaceObjective } from '@/lib/v2/pacingEnvelopeEngine';

export default function RaceSimulationPage() {
  const navigate = useNavigate();
  const { currentAthlete: selectedAthlete } = useAthletes();
  const { snapshots, tests, checkins } = useCloudData();
  const [activeTab, setActiveTab] = useState("simulation");
  const [staffMode, setStaffMode] = useState(() => localStorage.getItem("vlab-staff-mode") === "true");

  useEffect(() => {
    localStorage.setItem("vlab-staff-mode", staffMode.toString());
  }, [staffMode]);
  
  // Compute effectifs
  const athleteId = selectedAthlete?.id ?? '';
  const objectif = selectedAthlete?.objectif ?? selectedAthlete?.goal ?? 'IM';
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
  
  const latestCheckin = React.useMemo(() => {
    if (!checkins || !athleteId) return null;
    const athleteCheckins = checkins.filter(c => c.athlete_id === athleteId);
    return athleteCheckins.sort((a, b) => b.date_iso.localeCompare(a.date_iso))[0] ?? null;
  }, [checkins, athleteId]);
  
  const disponibilite = React.useMemo(() => {
    const fatigueStateToScore: Record<string, number> = {
      fresh: 8, ok: 6, fatigued: 4, high: 2, injured: 1
    };
    const fatigueScore = fatigueStateToScore[activeSnapshot?.fatigue_state || "ok"] ?? 6;
    
    const input: TFCLReadinessInput = {
      sleep: null,
      fatigue: fatigueScore,
      soreness: null,
      stress: null,
      motivation: null,
      objective: {
        tss7d: activeSnapshot?.tss_7d ?? null,
        tssTarget: 400,
      },
    };
    return computeDisponibiliteTFCL(input);
  }, [activeSnapshot]);
  
  const discipline: 'bike' | 'run' = React.useMemo(() => {
    if (objectif.includes('Marathon') || objectif.includes('Semi') || objectif.includes('10km')) {
      return 'run';
    }
    return 'bike';
  }, [objectif]);
  
  const raceObjective: RaceObjective = React.useMemo(() => {
    if (objectif.includes('Marathon') && !objectif.includes('Semi')) return 'Marathon';
    if (objectif.includes('Semi')) return 'Semi';
    if (objectif.includes('10km') || objectif.includes('10k')) return '10km';
    if (objectif === '703' || objectif === '70.3' || objectif.includes('70.3')) return '70.3';
    return 'IM';
  }, [objectif]);
  
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
  
  const potentielPhysiologiqueScore = React.useMemo(() => {
    if (!disponibilite) return null;
    return disponibilite.score;
  }, [disponibilite]);
  
  const envelope = React.useMemo(() => {
    // CHANTIER A — durée prédite par objectif (fallback simple si pas de prediction TTE)
    const durationFallback: Record<string, number> = {
      "IM": 600, "70.3": 300, "Marathon": 210, "Semi": 105, "10km": 45,
    };
    const cpWkg = activeSnapshot?.ftp && activeSnapshot?.weight_kg
      ? (activeSnapshot.ftp * 0.95) / activeSnapshot.weight_kg
      : null;
    return computePacingEnvelope({
      vlamaxEffectif,
      tteEffectif,
      fatmax,
      potentielPhysiologiqueScore,
      fatigueIndex: null,
      raceObjective,
      sport: discipline,
      ftp: activeSnapshot?.ftp,
      vma: activeSnapshot?.vma,
      paceThreshold: activeSnapshot?.pace_threshold_sec_per_km,
      weight: activeSnapshot?.weight_kg,
      // CHANTIER A
      ambition: (selectedAthlete as any)?.ambition ?? null,
      cpWkg,
      wPrimeJkg: null,
      predictedDurationMin: durationFallback[raceObjective] ?? 180,
    });
  }, [vlamaxEffectif, tteEffectif, fatmax, potentielPhysiologiqueScore, latestCheckin, raceObjective, discipline, activeSnapshot, selectedAthlete]);
  
  const rules = React.useMemo(() => {
    if (!envelope) return null;
    return generateDisciplineRules({
      envelope,
      vlamaxEffectif,
      raceObjective,
      sport: discipline,
      potentielPhysiologiqueScore,
    });
  }, [envelope, vlamaxEffectif, raceObjective, discipline, potentielPhysiologiqueScore]);
  
  const scenarios = React.useMemo(() => {
    if (!envelope) return null;
    return simulatePacingScenarios({
      envelope,
      raceObjective,
      vlamaxValue: vlamaxEffectif?.value ?? null,
      tteMin: tteEffectif?.tte_min ?? null,
      raceDistanceKm: 90,
      raceDurationMin,
    });
  }, [envelope, raceObjective, vlamaxEffectif, tteEffectif, raceDurationMin]);
  
  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      staffMode={staffMode}
      onStaffModeChange={setStaffMode}
    >
      <div className="max-w-5xl mx-auto space-y-3 sm:space-y-6 animate-fade-in">
        {/* Sub-header with athlete name and briefing action */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">Simulation</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {selectedAthlete?.name ?? 'Aucun athlète sélectionné'}
            </p>
          </div>
          
          {envelope && rules && scenarios && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs sm:text-sm">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Briefing</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <RaceDayBriefingMode
                  athleteName={selectedAthlete?.name ?? 'Athlète'}
                  envelope={envelope}
                  rules={rules}
                  scenarios={scenarios}
                  raceObjective={raceObjective}
                  potentielPhysiologiqueScore={potentielPhysiologiqueScore}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Info banner - compact */}
        <Alert className="text-xs sm:text-sm py-2 sm:py-3">
          <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <AlertDescription className="text-[11px] sm:text-sm leading-relaxed">
            {SIMULATION_DEFINITIONS.official}
          </AlertDescription>
        </Alert>
        
        {/* Tabs */}
        <Tabs defaultValue="envelope" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-9 sm:h-10">
            <TabsTrigger value="envelope" className="text-[11px] sm:text-sm px-1">Envelope</TabsTrigger>
            <TabsTrigger value="simulation" className="text-[11px] sm:text-sm px-1">Simulation</TabsTrigger>
            <TabsTrigger value="nutrition" className="text-[11px] sm:text-sm px-1">Nutrition</TabsTrigger>
            <TabsTrigger value="staff" className="text-[11px] sm:text-sm px-1">Staff</TabsTrigger>
          </TabsList>
          
          <TabsContent value="envelope" className="mt-3 sm:mt-4">
            {envelope ? (
              <PacingEnvelopeCard
                input={{
                  vlamaxEffectif,
                  tteEffectif,
                  fatmax,
                  potentielPhysiologiqueScore,
                  fatigueIndex: null,
                  raceObjective,
                  sport: discipline,
                  ftp: activeSnapshot?.ftp,
                  vma: activeSnapshot?.vma,
                  paceThreshold: activeSnapshot?.pace_threshold_sec_per_km,
                  weight: activeSnapshot?.weight_kg,
                }}
                raceDurationMin={raceDurationMin}
                staffMode
              />
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Données insuffisantes pour calculer l'enveloppe
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="simulation" className="mt-3 sm:mt-4">
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

          <TabsContent value="nutrition" className="mt-3 sm:mt-4 space-y-4">
            {!activeSnapshot?.weight_kg ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Poids athlète manquant — protocoles nutritionnels indisponibles
              </div>
            ) : (
              <>
                <CarbLoadingCard
                  weightKg={activeSnapshot.weight_kg}
                  durationMin={raceDurationMin}
                />
                <CaffeineProtocolCard
                  weightKg={activeSnapshot.weight_kg}
                  durationMin={raceDurationMin}
                  sensitivity="unknown"
                  habitualUser
                  staffMode={staffMode}
                />
                <HydrationProtocolCard
                  input={{
                    weightKg: activeSnapshot.weight_kg,
                    durationMin: raceDurationMin,
                    sport: discipline === 'run' ? 'run' : 'bike',
                    sweatLevel: 'average',
                    sodiumPhenotype: 'average',
                    tempC: 22,
                    humidity: 60,
                  }}
                  staffMode={staffMode}
                />
                <GutTrainingCard
                  currentLevel="developing"
                  targetGph={raceDurationMin >= 240 ? 120 : raceDurationMin >= 150 ? 90 : 70}
                  weeksAvailable={8}
                  sport={discipline === 'run' ? 'cap' : 'velo'}
                  weightKg={activeSnapshot.weight_kg}
                  staffMode={staffMode}
                />
                <RecoveryNutritionCard
                  input={{
                    weightKg: activeSnapshot.weight_kg,
                    durationMin: raceDurationMin,
                    intensity: raceDurationMin >= 240 ? 'depleting' : 'high',
                    goal: 'full_recovery_48h',
                    hotConditions: false,
                  }}
                  staffMode={staffMode}
                />
              </>
            )}
          </TabsContent>
          
          <TabsContent value="staff" className="mt-3 sm:mt-4">
            {envelope && rules && scenarios ? (
              <StaffPacingReportV2
                athleteName={selectedAthlete?.name ?? 'Athlète'}
                envelope={envelope}
                rules={rules}
                scenarios={scenarios}
                vlamaxEffectif={vlamaxEffectif}
                tteEffectif={tteEffectif}
                potentielPhysiologiqueScore={potentielPhysiologiqueScore}
                raceObjective={raceObjective}
                raceDurationMin={raceDurationMin}
              />
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Données insuffisantes pour générer le rapport
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Academy section - collapsible */}
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer list-none py-2 touch-manipulation">
            <h2 className="text-sm sm:text-lg font-semibold">Academy — Pacing & Simulation</h2>
            <span className="text-muted-foreground text-xs sm:text-sm group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 pt-3">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="font-medium text-xs sm:text-sm mb-1.5">Pacing Envelope™</h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                Le couloir physiologique de pacing définit les limites sécurisées selon votre profil métabolique.
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-medium text-xs sm:text-sm mb-1.5">Simulation Fuel & Risk</h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                {SIMULATION_DEFINITIONS.methodology}
              </p>
            </div>
          </div>
        </details>
      </div>
    </SidebarLayout>
  );
}
