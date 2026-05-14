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
import { RaceStrategyPlanCard } from '@/components/RaceStrategyPlanCard';
import { RaceTimeEstimateCard } from '@/components/RaceTimeEstimateCard';
import { TriathlonFullRaceSimulationCard } from '@/components/TriathlonFullRaceSimulationCard';
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
import { estimateFromRaceChronos } from '@/engines/diagnostic/raceTimeEstimator';
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

  // P1 — VLamax CAP run dédiée (sport forcé "cap") pour les segments course,
  // y compris en triathlon où l'objectif global résout par défaut vers le vélo.
  const vlamaxRunEffectif = React.useMemo(() => {
    if (!athleteId) return null;
    return computeVLamaxEffectif({
      athleteId,
      objectif,
      activeSnapshotId,
      tests: tests ?? [],
      snapshots: snapshots ?? [],
      sportOverride: "cap",
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

  // P2 — Estimation depuis chronos course (Riegel + Daniels VDOT + ACSM + durabilité).
  // Sortie RAW, jamais effective : sert UNIQUEMENT de fallback (paceThreshold absent)
  // et d'overlay de risque via l'indice de durabilité.
  const raceChronoEstimate = React.useMemo(() => {
    if (!activeSnapshot) return null;
    return estimateFromRaceChronos(activeSnapshot as any);
  }, [activeSnapshot]);

  // Note: les paliers de risque depuis la durabilité (Riegel semi→marathon) sont
  // désormais portés par pacingEnvelopeEngine (input.raceChrono), plus besoin
  // d'ajustement manuel ici.
  
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

  // Durée par segment (min) — individualisée à partir du pace seuil de l'athlète.
  // Modèle TFCL™ — exprimé en % de la vitesse seuil (vSeuil) :
  //   pace_run = pace_seuil / (vSeuilFraction)   ⇔   vRun = vSeuilFraction × vSeuil
  //
  //   Calibration post-T2 par ambition (allure soutenable sur le segment course) :
  //     ┌──────────────┬────────── 70.3 (semi) ─┬───────── IM (marathon) ─┐
  //     │ elite        │ ~95% vSeuil            │ ~89% vSeuil             │
  //     │ competitor   │ ~88% vSeuil            │ ~82% vSeuil             │
  //     │ age_group    │ ~82% vSeuil            │ ~76% vSeuil             │
  //     │ finisher     │ ~75% vSeuil            │ ~70% vSeuil             │
  //     └──────────────┴────────────────────────┴─────────────────────────┘
  //   • Pénalité additionnelle −2 pts vSeuil si VLamax ≥ 0.55 (profil glycolytique → drift run accru)
  //   • Vélo : table de format (à individualiser via CP/FTP en v2)
  const segmentDurationMin = React.useMemo(() => {
    // P2 — Fallback paceThreshold via raceTimeEstimator si l'effective est absent.
    // Reste tag RAW : utilisé uniquement pour le calcul de durée prédite, pas en prescription.
    const paceThr = activeSnapshot?.pace_threshold_sec_per_km
      ?? raceChronoEstimate?.paceThreshold_sec_km
      ?? null; // sec/km au seuil
    // P1 — Pénalité glycolytique segment course basée sur la VLamax CAP (run), pas la bike.
    const vlamaxRunVal = vlamaxRunEffectif?.value ?? vlamaxEffectif?.value ?? 0.4;
    const vlamaxHigh = vlamaxRunVal >= 0.55;
    const vlamaxVSeuilPenalty = vlamaxHigh ? 0.02 : 0; // -2% vSeuil si glyco

    // P2 — Pénalité de durabilité observée chronos (Riegel semi→marathon)
    //   • idx ≤ 1.04 → 0%   • 1.04–1.08 → -1.5%   • >1.08 → -3%
    const durIdx = raceChronoEstimate?.durabilityIndex;
    const durabilityPenalty = durIdx == null ? 0
      : durIdx <= 1.04 ? 0
      : durIdx <= 1.08 ? 0.015
      : 0.03;

    const ambition = ((selectedAthlete as any)?.ambition ?? 'age_group') as
      | 'finisher' | 'age_group' | 'competitor' | 'elite';

    const vSeuilFractionByAmbition: Record<typeof ambition, { half: number; full: number }> = {
      elite:      { half: 0.95, full: 0.89 },
      competitor: { half: 0.88, full: 0.82 },
      age_group:  { half: 0.82, full: 0.76 },
      finisher:   { half: 0.75, full: 0.70 },
    };

    const computeRunMin = (distanceKm: number, vSeuilFraction: number): number | null => {
      if (!paceThr || paceThr <= 0) return null;
      const effectiveFraction = Math.max(0.5, vSeuilFraction - vlamaxVSeuilPenalty - durabilityPenalty);
      const paceRunSecKm = paceThr / effectiveFraction;
      return (paceRunSecKm * distanceKm) / 60;
    };

    if (raceObjective === 'IM') {
      const runMin = computeRunMin(42.2, vSeuilFractionByAmbition[ambition].full) ?? 240;
      return { bike: 300, run: Math.round(runMin) };
    }
    if (raceObjective === '70.3') {
      const runMin = computeRunMin(21.1, vSeuilFractionByAmbition[ambition].half) ?? 105;
      return { bike: 150, run: Math.round(runMin) };
    }
    return { bike: 180, run: 180 };
  }, [raceObjective, activeSnapshot, vlamaxEffectif, vlamaxRunEffectif, raceChronoEstimate, selectedAthlete]);

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
    const durationFallback: Record<string, number> = {
      "IM": 600, "70.3": 300, "Marathon": 210, "Semi": 105, "10km": 45,
    };
    const cpWkg = activeSnapshot?.ftp && activeSnapshot?.weight_kg
      ? (activeSnapshot.ftp * 0.95) / activeSnapshot.weight_kg
      : null;
    // P1 — Pour le segment course (CAP ou run du tri), on injecte la VLamax CAP run.
    const vlamaxForSport = discipline === 'run' ? (vlamaxRunEffectif ?? vlamaxEffectif) : vlamaxEffectif;
    // P2 — Fallback paceThreshold via raceTimeEstimator (RAW) si effective absent.
    const paceThresholdEffective = activeSnapshot?.pace_threshold_sec_per_km
      ?? raceChronoEstimate?.paceThreshold_sec_km
      ?? null;
    // Note: les paliers de risque durabilité sont désormais natifs au moteur
    // (pacingEnvelopeEngine reçoit raceChrono et applique readinessAdjustment).
    return computePacingEnvelope({
      vlamaxEffectif: vlamaxForSport,
      tteEffectif,
      fatmax,
      potentielPhysiologiqueScore,
      fatigueIndex: null,
      raceObjective,
      sport: discipline,
      ftp: activeSnapshot?.ftp,
      vma: activeSnapshot?.vma,
      paceThreshold: paceThresholdEffective,
      weight: activeSnapshot?.weight_kg,
      ambition: (selectedAthlete as any)?.ambition ?? null,
      cpWkg,
      wPrimeJkg: null,
      predictedDurationMin: durationFallback[raceObjective] ?? 180,
      raceChrono: raceChronoEstimate ? {
        paceThreshold_sec_km: raceChronoEstimate.paceThreshold_sec_km ?? null,
        durabilityIndex: raceChronoEstimate.durabilityIndex ?? null,
        confidence: raceChronoEstimate.confidence,
      } : null,
    });
  }, [vlamaxEffectif, vlamaxRunEffectif, tteEffectif, fatmax, potentielPhysiologiqueScore, raceChronoEstimate, latestCheckin, raceObjective, discipline, activeSnapshot, selectedAthlete]);
  
  const rules = React.useMemo(() => {
    if (!envelope) return null;
    const vlamaxForSport = discipline === 'run' ? (vlamaxRunEffectif ?? vlamaxEffectif) : vlamaxEffectif;
    return generateDisciplineRules({
      envelope,
      vlamaxEffectif: vlamaxForSport,
      raceObjective,
      sport: discipline,
      potentielPhysiologiqueScore,
      ambition: (selectedAthlete as any)?.ambition ?? (selectedAthlete as any)?.refs?.ambition ?? null,
      tteMin: tteEffectif?.tte_min ?? null,
      fcMaxBpm: activeSnapshot?.fc_max ?? (selectedAthlete as any)?.fcMax ?? null,
      fatigueLevel: latestCheckin?.fatigue ?? null,
      liveSegments: null, // Pas de données live en mode pré-course
    });
  }, [envelope, vlamaxEffectif, vlamaxRunEffectif, raceObjective, discipline, potentielPhysiologiqueScore, selectedAthlete, tteEffectif, activeSnapshot, latestCheckin]);
  
  const scenarios = React.useMemo(() => {
    if (!envelope) return null;
    // P1 — VLamax discipline-aware (run du tri = vlamax_run, pas vlamax bike).
    const vlamaxForSport = discipline === 'run' ? (vlamaxRunEffectif ?? vlamaxEffectif) : vlamaxEffectif;
    return simulatePacingScenarios({
      envelope,
      raceObjective,
      vlamaxValue: vlamaxForSport?.value ?? null,
      tteMin: tteEffectif?.tte_min ?? null,
      raceDistanceKm: 90,
      raceDurationMin,
    });
  }, [envelope, raceObjective, vlamaxEffectif, vlamaxRunEffectif, discipline, tteEffectif, raceDurationMin]);
  
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <ProfileTile
                  label="VLamax"
                  value={vlamaxEffectif?.value ? vlamaxEffectif.value.toFixed(2) : "—"}
                  unit="mmol/L/s"
                  confidence={vlamaxEffectif?.confidence}
                  staffMode={staffMode}
                  athleteHint={
                    vlamaxEffectif?.value == null ? "Non estimable — manque de données récentes."
                    : vlamaxEffectif.value >= 0.7 ? "Moteur explosif → tu brûles vite ton glycogène. Ravito sucré non négociable."
                    : vlamaxEffectif.value >= 0.5 ? "Profil mixte → bon compromis vitesse/endurance."
                    : "Profil endurant → tu économises ton glycogène, idéal pour le long."
                  }
                  staffHint="Vitesse de production lactique. ↑ = coût glucidique élevé, FatMax bas."
                />
                <ProfileTile
                  label="TTE (Time-To-Exhaustion)"
                  value={tteEffectif?.tte_min ? `${Math.round(tteEffectif.tte_min)}` : "—"}
                  unit="min au seuil"
                  confidence={tteEffectif?.confidence}
                  staffMode={staffMode}
                  athleteHint={
                    tteEffectif?.tte_min == null ? "Non observé — un test 20–40 min améliorerait la fiabilité."
                    : tteEffectif.tte_min >= 50 ? "Très bonne tenue au seuil → tu peux pousser longtemps sans casser."
                    : tteEffectif.tte_min >= 35 ? "Tenue correcte → reste prudent en première moitié de course."
                    : "Tenue limitée → privilégier scénario robuste."
                  }
                  staffHint="Durée soutenable au CP/MLSS. Cap glycogénique = TTE × 0.7 par défaut."
                />
                <ProfileTile
                  label="FatMax"
                  value={fatmax?.centerPctFTP ? `${Math.round(fatmax.centerPctFTP)}` : "—"}
                  unit="% FTP"
                  confidence={fatmax?.confidence}
                  staffMode={staffMode}
                  athleteHint={
                    fatmax?.centerPctFTP == null ? "Non calculable sans VLamax fiable."
                    : `À ${Math.round(fatmax.centerPctFTP)}% FTP, ton corps brûle un max de gras → c'est ton « rythme tout confort » sur très longue distance.`
                  }
                  staffHint="Centre de la zone d'oxydation lipidique. Cible IM = ±5%."
                />
                <ProfileTile
                  label="Disponibilité"
                  value={`${Math.round(potentielPhysiologiqueScore)}`}
                  unit="/100 aujourd'hui"
                  staffMode={staffMode}
                  athleteHint={
                    potentielPhysiologiqueScore >= 75 ? "Tu es frais → tu peux viser ton scénario ambitieux."
                    : potentielPhysiologiqueScore >= 55 ? "Forme correcte → reste sur le scénario robuste."
                    : "Fatigue / charge élevée → obligatoirement scénario robuste."
                  }
                  staffHint="Readiness unifiée (fatigue × charge × récup)."
                />
              </div>
              {staffMode && (
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
                <div className="space-y-2">
                  <Alert className="text-[11px] sm:text-xs py-2 bg-primary/5 border-primary/20">
                    <Info className="h-3.5 w-3.5" />
                    <AlertDescription>
                      {isTriathlon ? (
                        <>
                          Le <strong>couloir de pacing</strong>, c'est la fourchette d'effort que tu dois tenir sur <strong>ce segment uniquement</strong> ({triDiscipline === 'bike' ? '🚴 vélo' : '🏃 course à pied'}).
                          {triDiscipline === 'bike'
                            ? " En triathlon, le vélo prépare le run : chaque watt gagné ici = des minutes perdues au run si tu sors trop chaud."
                            : " Le run est jugé sur ce qu'il te reste après le vélo. Ton couloir tient compte de la fatigue accumulée en amont."}
                        </>
                      ) : (
                        <>Le <strong>couloir de pacing</strong>, c'est la zone d'effort où ton corps tient sans exploser sur la durée totale prévue.</>
                      )}
                    </AlertDescription>
                  </Alert>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2">
                      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">🟢 Vert</div>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        {isTriathlon
                          ? (triDiscipline === 'bike'
                              ? "Cible vélo. Tu dois pouvoir parler. Sortir du vélo avec des jambes fraîches."
                              : "Allure relâchée des 3 premiers km, le temps que les jambes se libèrent.")
                          : "Sécurisé. Tu dois te sentir « trop facile » au départ."}
                      </p>
                    </div>
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
                      <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">🟠 Orange</div>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        {isTriathlon
                          ? (triDiscipline === 'bike'
                              ? "Toléré uniquement sur les bosses courtes. Jamais en continu."
                              : "Allure de croisière du 2e tiers, une fois la transition digérée.")
                          : "Tenable mais coûteux. Réservé à la 2e moitié."}
                      </p>
                    </div>
                    <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2">
                      <div className="text-[11px] font-semibold text-red-700 dark:text-red-400">🔴 Rouge</div>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        {isTriathlon
                          ? (triDiscipline === 'bike'
                              ? "Interdit avant T2. Tu paies cash au run (crampes, perte d'allure)."
                              : "Réservé au sprint final (5 derniers km / dernier kilomètre).")
                          : "Casse glycogénique quasi assurée si maintenu."}
                      </p>
                    </div>
                  </div>
                  {isTriathlon && (
                    <div className="rounded-md border border-border bg-muted/30 p-2.5 text-[11px] leading-snug">
                      <div className="font-semibold mb-1">📍 Comment lire ton couloir en course</div>
                      {triDiscipline === 'bike' ? (
                        <ul className="space-y-0.5 text-muted-foreground list-disc pl-4">
                          <li><strong>1er tiers</strong> : reste collé à la borne basse du 🟢 vert. C'est contre-intuitif mais c'est là que se gagne le run.</li>
                          <li><strong>2e tiers</strong> : autorisé à monter au centre du 🟢 vert. 🟠 orange uniquement sur les bosses {'<'} 2 min.</li>
                          <li><strong>Dernier tiers</strong> : reviens en bas du 🟢 vert. Objectif : descendre du vélo sans avoir tapé dans tes réserves de glycogène.</li>
                        </ul>
                      ) : (
                        <ul className="space-y-0.5 text-muted-foreground list-disc pl-4">
                          <li><strong>3 premiers km</strong> : 🟢 vert bas, le temps de retrouver la foulée après le vélo.</li>
                          <li><strong>Milieu de course</strong> : centre du 🟢 vert, on installe l'allure cible.</li>
                          <li><strong>Dernier tiers</strong> : autorisé à mordre sur le 🟠 orange si les sensations le permettent. 🔴 rouge uniquement sur le dernier km.</li>
                        </ul>
                      )}
                    </div>
                  )}
                </div>
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
              {!staffMode ? (
                <>
                  {envelope ? (
                    <RaceStrategyPlanCard
                      envelope={envelope}
                      raceObjective={raceObjective}
                      discipline={discipline}
                      raceDurationMin={raceDurationMin}
                      ftp={activeSnapshot?.ftp}
                      paceThresholdSecKm={activeSnapshot?.pace_threshold_sec_per_km}
                      disponibiliteScore={disponibilite?.score}
                    />
                  ) : null}
                  {(discipline === 'run' || isTriathlon) && activeSnapshot && (
                    <RaceTimeEstimateCard chronos={activeSnapshot as any} />
                  )}
                  {!envelope && (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      Données insuffisantes pour générer ton plan de course
                    </div>
                  )}
                  {isTriathlon && (
                    <>
                      <Alert className="text-[11px] sm:text-xs py-2 bg-amber-500/5 border-amber-500/30">
                        <Info className="h-3.5 w-3.5" />
                        <AlertDescription>
                          <strong>Triathlon :</strong> les 3 plans ci-dessus simulent uniquement le segment{' '}
                          <strong>{discipline === 'bike' ? '🚴 vélo' : '🏃 course à pied'}</strong>. La simulation
                          ci-dessous combine les 2 segments pour estimer ta course complète.
                        </AlertDescription>
                      </Alert>
                      <TriathlonFullRaceSimulationCard
                        raceObjective={raceObjective as 'IM' | '70.3'}
                        bikeBaselineMin={segmentDurationMin.bike}
                        runBaselineMin={segmentDurationMin.run}
                        disponibiliteScore={disponibilite?.score}
                        vlamaxValue={vlamaxEffectif?.value ?? null}
                        fatigueState={(activeSnapshot?.fatigue_state as any) ?? null}
                      />
                    </>
                  )}
                </>
              ) : (
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
                  defaultRaceType={raceObjective}
                />
              )}
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

function ProfileTile({
  label, value, unit, confidence, staffMode, athleteHint, staffHint,
}: {
  label: string;
  value: string;
  unit?: string;
  confidence?: number | null;
  staffMode?: boolean;
  athleteHint?: string;
  staffHint?: string;
}) {
  const conf = confidence == null ? null : Math.round(confidence * 100);
  const confLabel =
    conf == null ? null :
    conf >= 75 ? "Fiable" :
    conf >= 50 ? "Modérée" : "Indicative";
  const confColor =
    conf == null ? "text-muted-foreground" :
    conf >= 75 ? "text-emerald-600" :
    conf >= 50 ? "text-amber-600" : "text-red-600";
  const dot =
    conf == null ? "bg-muted-foreground/40" :
    conf >= 75 ? "bg-emerald-500" :
    conf >= 50 ? "bg-amber-500" : "bg-red-500";
  const hint = staffMode ? staffHint : athleteHint;
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
        {confLabel && (
          <div className={`flex items-center gap-1 text-[10px] ${confColor}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
            {confLabel}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold text-foreground">{value}</span>
        {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
      </div>
      {hint && (
        <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
