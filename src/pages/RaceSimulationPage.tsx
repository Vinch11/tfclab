/**
 * Race Simulation Page TFCL™
 * Page dédiée à la simulation de course
 * Intègre Pacing Envelope™, Briefing Jour J, Staff Report V2
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Calendar, FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { SidebarLayout } from '@/components/SidebarLayout';
import { RaceSimulationModule } from '@/components/RaceSimulationModule';
import { PacingEnvelopeCard } from '@/components/PacingEnvelopeCard';
import { NegativeSplitPreviewCard } from '@/components/NegativeSplitPreviewCard';
import { PacingRulesParityCard } from '@/components/PacingRulesParityCard';
import { PacingRulesSnapshotsCard } from '@/components/PacingRulesSnapshotsCard';
import { RaceDayBriefingMode } from '@/components/RaceDayBriefingMode';
import { StaffPacingReportV2 } from '@/components/StaffPacingReportV2';
import { CaffeineProtocolCard } from '@/components/CaffeineProtocolCard';
import { CarbLoadingCard } from '@/components/CarbLoadingCard';
import { GutTrainingCard } from '@/components/GutTrainingCard';
import { HydrationProtocolCard } from '@/components/HydrationProtocolCard';
import { RecoveryNutritionCard } from '@/components/RecoveryNutritionCard';
import { ErgogenicAidsCard } from '@/components/ErgogenicAidsCard';

import { useAthletes } from '@/contexts/AthleteContext';
import { useCloudData } from '@/hooks/useCloudData';
import { computeVLamaxEffectif, computeTTEEffectif } from '@/engines/diagnostic';
import { computeUnifiedReadiness } from '@/lib/readinessSource';
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
  
  const raceObjective: RaceObjective = React.useMemo(() => {
    if (objectif.includes('Marathon') && !objectif.includes('Semi')) return 'Marathon';
    if (objectif.includes('Semi')) return 'Semi';
    if (objectif.includes('10km') || objectif.includes('10k')) return '10km';
    if (objectif === '703' || objectif === '70.3' || objectif.includes('70.3')) return '70.3';
    return 'IM';
  }, [objectif]);

  // Triathlon → afficher pacing vélo ET course (segments séparés)
  const isTriathlon = raceObjective === 'IM' || raceObjective === '70.3';

  // Discipline "principale" pour modules legacy (simulation, nutrition…)
  const defaultRunObjective = raceObjective === 'Marathon' || raceObjective === 'Semi' || raceObjective === '10km';
  const [triDiscipline, setTriDiscipline] = useState<'bike' | 'run'>('bike');
  const discipline: 'bike' | 'run' = React.useMemo(() => {
    if (defaultRunObjective) return 'run';
    if (isTriathlon) return triDiscipline;
    return 'bike';
  }, [defaultRunObjective, isTriathlon, triDiscipline]);

  // Durée par segment (min) — utilisée par envelope, rules, scenarios
  const segmentDurationMin = React.useMemo(() => {
    if (raceObjective === 'IM') {
      return { bike: 300, run: 240 }; // ~5h vélo / 4h run (objectif 9-10h)
    }
    if (raceObjective === '70.3') {
      return { bike: 150, run: 105 }; // ~2h30 vélo / 1h45 run
    }
    return { bike: 180, run: 180 };
  }, [raceObjective]);

  const raceDurationMin = React.useMemo(() => {
    if (isTriathlon) return segmentDurationMin[discipline];
    switch (raceObjective) {
      case 'Marathon': return 210;
      case 'Semi': return 100;
      case '10km': return 45;
      default: return 180;
    }
  }, [raceObjective, isTriathlon, segmentDurationMin, discipline]);
  
  // Source de vérité unifiée — voir src/lib/readinessSource.ts
  const readiness = React.useMemo(() => computeUnifiedReadiness({
    objectif,
    vlamaxEffectif,
    tteEffectif,
    ftp: activeSnapshot?.ftp ?? null,
    weightKg: activeSnapshot?.weight_kg ?? null,
    athleteAge: (selectedAthlete as any)?.age ?? null,
    ambition: (selectedAthlete as any)?.ambition ?? undefined,
    tss7d: activeSnapshot?.tss_7d ?? null,
  }), [vlamaxEffectif, tteEffectif, objectif, activeSnapshot, selectedAthlete]);
  const potentielPhysiologiqueScore = readiness.score;
  
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
      ambition: (selectedAthlete as any)?.ambition ?? (selectedAthlete as any)?.refs?.ambition ?? null,
      tteMin: tteEffectif?.tte_min ?? null,
      fcMaxBpm: activeSnapshot?.fc_max ?? (selectedAthlete as any)?.fcMax ?? null,
      fatigueLevel: latestCheckin?.fatigue ?? null,
      liveSegments: null, // Pas de données live en mode pré-course
    });
  }, [envelope, vlamaxEffectif, raceObjective, discipline, potentielPhysiologiqueScore, selectedAthlete, tteEffectif, activeSnapshot, latestCheckin]);
  
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
              {selectedAthlete?.nom ?? 'Aucun athlète sélectionné'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5 h-8 text-xs sm:text-sm">
              <Link to="/race/pacing-audit">
                <FlaskConical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Audit pacing</span>
              </Link>
            </Button>
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
                    athleteName={selectedAthlete?.nom ?? 'Athlète'}
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
        </div>

        {/* Info banner - compact */}
        <Alert className="text-xs sm:text-sm py-2 sm:py-3">
          <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <AlertDescription className="text-[11px] sm:text-sm leading-relaxed">
            {SIMULATION_DEFINITIONS.official}
          </AlertDescription>
        </Alert>
        
        {/* ═══ Parcours guidé en 5 étapes ═══ */}
        <Accordion type="multiple" defaultValue={["step-1", "step-2"]} className="w-full space-y-2">

          {/* ÉTAPE 1 — TON PROFIL */}
          <AccordionItem value="step-1" className="border border-border rounded-lg px-3 sm:px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <Badge variant="default" className="h-7 w-7 rounded-full p-0 flex items-center justify-center text-xs shrink-0">1</Badge>
                <div>
                  <div className="text-sm sm:text-base font-semibold">Ton profil physiologique</div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground font-normal">
                    {staffMode ? "Données métaboliques effectives utilisées pour la simulation" : "Ce que la simulation sait de toi aujourd'hui"}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <ProfileTile label="VLamax" value={vlamaxEffectif?.value ? vlamaxEffectif.value.toFixed(2) : "—"} unit="mmol/L/s" confidence={vlamaxEffectif?.confidence} />
                <ProfileTile label="TTE" value={tteEffectif?.tte_min ? `${Math.round(tteEffectif.tte_min)}` : "—"} unit="min" confidence={tteEffectif?.confidence} />
                <ProfileTile label="FatMax" value={fatmax?.centerPctFTP ? `${Math.round(fatmax.centerPctFTP)}` : "—"} unit="% FTP" confidence={fatmax?.confidence} />
                <ProfileTile label="Disponibilité" value={`${Math.round(potentielPhysiologiqueScore)}`} unit="/100" />
              </div>
              {!staffMode ? (
                <Alert className="text-[11px] sm:text-xs py-2 bg-muted/40">
                  <Info className="h-3.5 w-3.5" />
                  <AlertDescription>
                    Plus ces 4 indicateurs sont fiables (mesurés, pas estimés), plus ta simulation est précise. La <strong>VLamax</strong> dit comment tu brûles le glycogène, la <strong>TTE</strong> combien de temps tu tiens au seuil, le <strong>FatMax</strong> ton rythme « tout-confort », la <strong>Disponibilité</strong> ta fraîcheur du jour.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="text-[11px] sm:text-xs py-2 bg-muted/40">
                  <Info className="h-3.5 w-3.5" />
                  <AlertDescription>
                    Confiance VLamax {vlamaxEffectif?.confidence != null ? `${Math.round((vlamaxEffectif.confidence) * 100)}%` : "—"} · TTE {tteEffectif?.confidence != null ? `${Math.round(tteEffectif.confidence * 100)}%` : "—"}. Sous 70 %, scénarios pondérés vers le robuste.
                  </AlertDescription>
                </Alert>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* ÉTAPE 2 — TA COURSE */}
          <AccordionItem value="step-2" className="border border-border rounded-lg px-3 sm:px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <Badge variant="default" className="h-7 w-7 rounded-full p-0 flex items-center justify-center text-xs shrink-0">2</Badge>
                <div>
                  <div className="text-sm sm:text-base font-semibold">Ta course & ton couloir de pacing</div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground font-normal">
                    {raceObjective}{isTriathlon ? ` — segment ${triDiscipline === 'bike' ? 'vélo' : 'course à pied'}` : ""} · durée prédite {`${Math.floor(raceDurationMin / 60)}h${String(Math.round(raceDurationMin % 60)).padStart(2, '0')}`}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {isTriathlon && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Segment :</span>
                  <div className="inline-flex rounded-md border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setTriDiscipline('bike')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        triDiscipline === 'bike' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      🚴 Vélo ({`${Math.floor(segmentDurationMin.bike / 60)}h${String(Math.round(segmentDurationMin.bike % 60)).padStart(2, '0')}`})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTriDiscipline('run')}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        triDiscipline === 'run' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      🏃 Course ({`${Math.floor(segmentDurationMin.run / 60)}h${String(Math.round(segmentDurationMin.run % 60)).padStart(2, '0')}`})
                    </button>
                  </div>
                </div>
              )}

              {!staffMode && (
                <Alert className="text-[11px] sm:text-xs py-2 bg-primary/5 border-primary/20">
                  <Info className="h-3.5 w-3.5" />
                  <AlertDescription>
                    Le <strong>couloir de pacing</strong>, c'est la zone d'effort où ton corps tient sans exploser. Reste dans le vert, flirte avec l'orange en deuxième partie, le rouge = casse glycogénique presque assurée.
                  </AlertDescription>
                </Alert>
              )}

              {envelope ? (
                <PacingEnvelopeCard
                  input={{
                    vlamaxEffectif, tteEffectif, fatmax, potentielPhysiologiqueScore,
                    fatigueIndex: null, raceObjective, sport: discipline,
                    ftp: activeSnapshot?.ftp, vma: activeSnapshot?.vma,
                    paceThreshold: activeSnapshot?.pace_threshold_sec_per_km,
                    weight: activeSnapshot?.weight_kg,
                  }}
                  raceDurationMin={raceDurationMin}
                  staffMode={staffMode}
                />
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">Données insuffisantes pour calculer l'enveloppe</div>
              )}

              {(raceObjective === 'Marathon' || raceObjective === '10km') && (
                <NegativeSplitPreviewCard
                  raceObjective={raceObjective}
                  vlamaxValue={vlamaxEffectif?.value ?? null}
                  tteMin={tteEffectif?.tte_min ?? null}
                  raceDurationMin={raceDurationMin}
                />
              )}

              {isTriathlon && (
                <Alert className="text-[11px] sm:text-xs py-2">
                  <Info className="h-3.5 w-3.5" />
                  <AlertDescription>
                    <strong>Stratégie {raceObjective} :</strong>{' '}
                    {triDiscipline === 'bike'
                      ? "Vélo conservateur — viser la cible basse / centre de l'enveloppe. Ne JAMAIS dépasser le centre dans les 90 premières minutes. Le vélo se gagne à l'arrivée du run, pas pendant."
                      : "Course en even / negative split — démarrer 3 à 5 % sous l'allure cible, puis progresser sur la 2e moitié. Cap glycogénique 20 %, surveiller le drift dès le 1er tiers."}
                  </AlertDescription>
                </Alert>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* ÉTAPE 3 — TON PLAN DE COURSE */}
          <AccordionItem value="step-3" className="border border-border rounded-lg px-3 sm:px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <Badge variant="default" className="h-7 w-7 rounded-full p-0 flex items-center justify-center text-xs shrink-0">3</Badge>
                <div>
                  <div className="text-sm sm:text-base font-semibold">Ton plan de course</div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground font-normal">
                    3 scénarios — Robuste, Ambitieux, Agressif — avec leurs risques
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {!staffMode && (
                <Alert className="text-[11px] sm:text-xs py-2 bg-primary/5 border-primary/20">
                  <Info className="h-3.5 w-3.5" />
                  <AlertDescription>
                    On simule 3 scénarios pour toi. <strong>Robuste</strong> = tu finis fort, marge de sécurité. <strong>Ambitieux</strong> = ton meilleur potentiel si tout se passe bien. <strong>Agressif</strong> = quitte ou double, risque de casse élevé.
                  </AlertDescription>
                </Alert>
              )}
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
                staffMode={staffMode}
              />
            </AccordionContent>
          </AccordionItem>

          {/* ÉTAPE 4 — TA NUTRITION */}
          <AccordionItem value="step-4" className="border border-border rounded-lg px-3 sm:px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <Badge variant="default" className="h-7 w-7 rounded-full p-0 flex items-center justify-center text-xs shrink-0">4</Badge>
                <div>
                  <div className="text-sm sm:text-base font-semibold">Ta nutrition pour tenir le plan</div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground font-normal">
                    Glucides, hydratation, caféine — calibrés sur ta VLamax et la durée
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              {!staffMode && (
                <Alert className="text-[11px] sm:text-xs py-2 bg-primary/5 border-primary/20">
                  <Info className="h-3.5 w-3.5" />
                  <AlertDescription>
                    Ta nutrition n'est pas générique : elle suit ta consommation réelle de glucides à l'allure cible. Les protocoles ci-dessous sont chiffrés sur <strong>ton</strong> métabolisme.
                  </AlertDescription>
                </Alert>
              )}
              {!activeSnapshot?.weight_kg ? (
                <div className="text-center py-6 text-sm text-muted-foreground">Poids athlète manquant — protocoles indisponibles</div>
              ) : (
                <>
                  <CarbLoadingCard weightKg={activeSnapshot.weight_kg} durationMin={raceDurationMin} />
                  <CaffeineProtocolCard weightKg={activeSnapshot.weight_kg} durationMin={raceDurationMin} sensitivity="unknown" habitualUser staffMode={staffMode} />
                  <HydrationProtocolCard
                    input={{
                      weightKg: activeSnapshot.weight_kg, durationMin: raceDurationMin,
                      sport: discipline === 'run' ? 'run' : 'bike', sweatLevel: 'average',
                      sodiumPhenotype: 'average', tempC: 22, humidity: 60,
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
                      weightKg: activeSnapshot.weight_kg, durationMin: raceDurationMin,
                      intensity: raceDurationMin >= 240 ? 'depleting' : 'high',
                      goal: 'full_recovery_48h', hotConditions: false,
                    }}
                    staffMode={staffMode}
                  />
                  <ErgogenicAidsCard
                    weightKg={activeSnapshot.weight_kg}
                    durationMin={raceDurationMin}
                    discipline={discipline}
                    hasRepeatedEfforts={(selectedAthlete as any)?.refs?.hasRepeatedEfforts ?? (discipline === 'bike' || raceDurationMin <= 60)}
                    bicarbTested={Boolean((selectedAthlete as any)?.refs?.bicarbTested)}
                    vegetarian={Boolean((selectedAthlete as any)?.refs?.vegetarian)}
                    staffMode={staffMode}
                  />
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* ÉTAPE 5 — TES RISQUES & RAPPORT STAFF */}
          <AccordionItem value="step-5" className="border border-border rounded-lg px-3 sm:px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <Badge variant="default" className="h-7 w-7 rounded-full p-0 flex items-center justify-center text-xs shrink-0">5</Badge>
                <div>
                  <div className="text-sm sm:text-base font-semibold">
                    {staffMode ? "Rapport staff & règles de pacing" : "Tes risques & règles d'or"}
                  </div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground font-normal">
                    {staffMode ? "Rapport coach complet, parité règles, snapshots de comparaison" : "Ce que tu ne dois surtout pas faire le jour J"}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {staffMode ? (
                <>
                  {envelope && rules && scenarios ? (
                    <StaffPacingReportV2
                      athleteName={selectedAthlete?.nom ?? 'Athlète'}
                      envelope={envelope} rules={rules} scenarios={scenarios}
                      vlamaxEffectif={vlamaxEffectif} tteEffectif={tteEffectif}
                      potentielPhysiologiqueScore={potentielPhysiologiqueScore}
                      raceObjective={raceObjective} raceDurationMin={raceDurationMin}
                    />
                  ) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">Données insuffisantes pour générer le rapport</div>
                  )}
                  {rules && <PacingRulesParityCard rules={rules} />}
                  {rules && (
                    <PacingRulesSnapshotsCard
                      rules={rules}
                      contextLabel={{ raceObjective, discipline, athleteName: selectedAthlete?.nom }}
                    />
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-lg border border-border p-3 bg-muted/30">
                    <div className="text-xs font-semibold mb-1">🟢 Premier tiers</div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">Reste sous le centre de ton couloir vert. Tu dois te sentir « trop facile ». C'est normal.</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 bg-muted/30">
                    <div className="text-xs font-semibold mb-1">🟠 Deuxième tiers</div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">Mange ta ration glucides (chiffrée à l'étape 4). Maintiens ton allure cible. Pas de relance brutale.</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 bg-muted/30">
                    <div className="text-xs font-semibold mb-1">🔴 Dernier tiers</div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">Tu peux flirter avec l'orange / rouge si glycogène encore disponible. C'est ici que tu fais la différence.</p>
                  </div>
                  <Alert className="text-[11px] sm:text-xs py-2 mt-3">
                    <Info className="h-3.5 w-3.5" />
                    <AlertDescription>
                      Pour la version coach détaillée (parité des règles, snapshots, audit complet), bascule en <strong>mode Staff</strong> en haut de page.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

        </Accordion>

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

function ProfileTile({ label, value, unit, confidence }: { label: string; value: string; unit?: string; confidence?: number | null }) {
  const conf = confidence == null ? null : Math.round(confidence * 100);
  const confColor =
    conf == null ? "text-muted-foreground" :
    conf >= 75 ? "text-emerald-600" :
    conf >= 50 ? "text-amber-600" : "text-red-600";
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-base sm:text-lg font-bold text-foreground">{value}</span>
        {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
      </div>
      {conf != null && (
        <div className={`text-[10px] mt-0.5 ${confColor}`}>fiab. {conf}%</div>
      )}
    </div>
  );
}
