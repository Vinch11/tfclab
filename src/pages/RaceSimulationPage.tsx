/**
 * Race Simulation Page TFCL™
 * Page dédiée à la simulation de course
 * Intègre Pacing Envelope™, Briefing Jour J, Staff Report V2
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Info, Calendar, FlaskConical, FileDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { SidebarLayout } from '@/components/SidebarLayout';
import { RaceStrategyPlanCard } from '@/components/RaceStrategyPlanCard';
import { ObjectiveStrategyCard } from '@/components/ObjectiveStrategyCard';
import { PlanVsSimulationPaceChart } from '@/components/charts/PlanVsSimulationPaceChart';
import { RaceTimeEstimateCard } from '@/components/RaceTimeEstimateCard';
import { TriathlonFullRaceSimulationCard } from '@/components/TriathlonFullRaceSimulationCard';
import { PacingEnvelopeCard } from '@/components/PacingEnvelopeCard';
import { NegativeSplitPreviewCard } from '@/components/NegativeSplitPreviewCard';
import { PacingRulesParityCard } from '@/components/PacingRulesParityCard';
import { PacingRulesSnapshotsCard } from '@/components/PacingRulesSnapshotsCard';
import { RaceDayBriefingMode } from '@/components/RaceDayBriefingMode';
import { StaffPacingReportV2 } from '@/components/StaffPacingReportV2';
import { RecoveryNutritionCard } from '@/components/RecoveryNutritionCard';
import { NutritionUnifiedCard } from '@/components/NutritionUnifiedCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAthletes } from '@/contexts/AthleteContext';
import { useCloudData } from '@/hooks/useCloudData';
import { getEffectiveSnapshot } from '@/lib/effectiveRefs';
import { useAthleteRaceGoals } from '@/hooks/useAthleteRaceGoals';
import { computeVLamaxEffectif, computeTTEEffectif } from '@/engines/diagnostic';
import { estimateFromRaceChronos } from '@/engines/diagnostic/raceTimeEstimator';
import { computeUnifiedReadiness } from '@/lib/readinessSource';
import { computeFatMaxTFCL } from '@/lib/v2/fatmaxTFCL';
import { computeDisponibiliteTFCL, TFCLReadinessInput } from '@/lib/v2/disponibiliteTFCL';
import { computePacingEnvelope } from '@/lib/v2/pacingEnvelopeEngine';
import { buildRaceChronosFromSnapshot } from '@/lib/v2/buildRaceChronosFromSnapshot';
import { generateDisciplineRules } from '@/lib/v2/pacingDisciplineRules';
import { simulatePacingScenarios } from '@/lib/v2/pacingScenarioSimulator';
import { SIMULATION_DEFINITIONS } from '@/lib/v2/raceSimulation';
import type { RaceObjective } from '@/lib/v2/pacingEnvelopeEngine';
import { supabase } from '@/integrations/supabase/client';
import { openPrintableHTML } from '@/lib/openPrintableHTML';
import { buildRaceSimulationHTML } from '@/lib/raceSimulation/buildRaceSimulationHTML';
import { computeBaseRateMader } from '@/lib/v2/nutritionUnified';


export default function RaceSimulationPage() {
  const navigate = useNavigate();
  const { currentAthlete: selectedAthlete, athletes } = useAthletes();
  const { snapshots, tests, checkins } = useCloudData();
  const [activeTab, setActiveTab] = useState("simulation");
  const [staffMode, setStaffMode] = useState(() => localStorage.getItem("vlab-staff-mode") === "true");
  const [searchParams] = useSearchParams();
  const requestedStep = searchParams.get("step");
  const initialAccordion = React.useMemo(() => {
    if (requestedStep) {
      const k = `step-${requestedStep}`;
      return Array.from(new Set(["step-1", "step-2", k]));
    }
    return ["step-1", "step-2"];
  }, [requestedStep]);
  const [openSteps, setOpenSteps] = useState<string[]>(initialAccordion);
  const [forceShowSimulation, setForceShowSimulation] = useState(false);
  const [heatLevel, setHeatLevel] = useState<'low' | 'moderate' | 'high'>(() => {
    const v = localStorage.getItem('vlab-heat-level');
    return v === 'low' || v === 'moderate' || v === 'high' ? v : 'moderate';
  });
  useEffect(() => { localStorage.setItem('vlab-heat-level', heatLevel); }, [heatLevel]);

  useEffect(() => {
    setOpenSteps(initialAccordion);
    if (requestedStep) {
      const id = `step-${requestedStep}`;
      // wait for accordion to expand
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
    }
  }, [initialAccordion, requestedStep]);

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
    return getEffectiveSnapshot(selectedAthlete as any, snapshots ?? []);
  }, [selectedAthlete, snapshots]);

  // ── What-if seuil run (override local, n'altère pas le snapshot) ──────────
  // Permet de simuler des allures cibles / temps avec un seuil hypothétique
  // (ex: tester 4:20/km au lieu de 4:37/km encodé).
  const [paceThresholdInput, setPaceThresholdInput] = useState<string>('');
  const paceThresholdOverrideSecKm = React.useMemo<number | null>(() => {
    const m = paceThresholdInput.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    if (sec >= 60) return null;
    const total = min * 60 + sec;
    if (total < 150 || total > 600) return null; // garde-fou 2:30–10:00/km
    return total;
  }, [paceThresholdInput]);
  const overrideActive = paceThresholdOverrideSecKm != null;
  const fmtMmSs = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;

  
  const tteEffectif = React.useMemo(() => {
    if (!activeSnapshot) return null;
    return computeTTEEffectif({
      ftp: activeSnapshot.ftp,
      tss_7d: activeSnapshot.tss_7d,
      tte_mode: activeSnapshot.tte_mode,
      tte_observed_min: activeSnapshot.tte_observed_min,
      objectif,
      age: (selectedAthlete as any)?.age ?? (selectedAthlete?.birth_date ? Math.floor((Date.now() - new Date(selectedAthlete.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000)) : null), // F33
    });
  }, [activeSnapshot, objectif, selectedAthlete]);

  // TTE CAP séparé (sport="run") — alimente la section run de la stratégie A/B
  // pour 70.3/IM/courses pures à pied. Évite que le TTE vélo serve de proxy.
  const tteEffectifRun = React.useMemo(() => {
    if (!activeSnapshot) return null;
    return computeTTEEffectif({
      ftp: activeSnapshot.ftp,
      tss_7d: activeSnapshot.tss_7d,
      tte_observed_min_run: (activeSnapshot as any).tte_observed_min_run ?? null,
      sport: "run",
      objectif,
      age: (selectedAthlete as any)?.age ?? (selectedAthlete?.birth_date ? Math.floor((Date.now() - new Date(selectedAthlete.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000)) : null),
    });
  }, [activeSnapshot, objectif, selectedAthlete]);

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
  
  const raceObjectiveRaw: RaceObjective = React.useMemo(() => {
    if (objectif.includes('Marathon') && !objectif.includes('Semi')) return 'Marathon';
    if (objectif.includes('Semi')) return 'Semi';
    if (objectif.includes('10km') || objectif.includes('10k')) return '10km';
    if (objectif === '703' || objectif === '70.3' || objectif.includes('70.3')) return '70.3';
    return 'IM';
  }, [objectif]);

  // ═══ DÉTECTION FORMAT LCW (Long Course Weekend — 3 jours éclatés) ═══
  // Cherche un objectif 70.3 LCW à venir pour l'athlète. Si trouvé, on bascule
  // en "mode 3 épreuves indépendantes" : chaque segment est simulé SOLO,
  // sans enchaînement, sans carry-over de fatigue ni de glycogène.
  const { raceGoals, addRaceGoal, updateRaceGoalFormat } = useAthleteRaceGoals(athleteId || null);

  const isTrailGoal = React.useMemo(() => {
    const obj = String((activeSnapshot as any)?.objectif || '').toLowerCase();
    return ['trail', 'ultra', 'montagne', 'mountain', 'skyrace', 'utmb', 'skytrail'].some(k => obj.includes(k));
  }, [activeSnapshot]);
  const lcwGoal = React.useMemo(() => {
    if (!raceGoals?.length) return null;
    const today = new Date().toISOString().slice(0, 10);
    // Uniquement les objectifs LCW À VENIR : un ancien objectif ne doit jamais
    // forcer le mode LCW de façon irréversible.
    return raceGoals.find(g => g.race_format === 'lcw_3day' && g.race_date >= today) ?? null;
  }, [raceGoals]);


  // Manual override (fallback) : permet à l'athlète d'activer LCW depuis la page
  // Simulation, même si aucun race_goal LCW n'est persisté en base (cas Cath :
  // objectif 70.3 défini sans passer par le sélecteur de format).
  const lcwManualKey = athleteId ? `lcw-manual-${athleteId}` : null;
  const [lcwManualEnabled, setLcwManualEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !lcwManualKey) return false;
    return window.localStorage.getItem(lcwManualKey) === 'true';
  });
  React.useEffect(() => {
    if (!lcwManualKey || typeof window === 'undefined') return;
    if (lcwManualEnabled) window.localStorage.setItem(lcwManualKey, 'true');
    else window.localStorage.removeItem(lcwManualKey);
  }, [lcwManualEnabled, lcwManualKey]);

  const lcwActive = raceObjectiveRaw === '70.3' && (lcwGoal !== null || lcwManualEnabled);
  const [lcwSegment, setLcwSegment] = useState<'swim' | 'bike' | 'run'>('bike');

  const handleEnableLcwAndPersist = React.useCallback(async () => {
    setLcwManualEnabled(true);
    // Persiste un race_goal si aucun objectif 70.3 LCW à venir n'est en base
    if (!lcwGoal && athleteId) {
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + 3);
      await addRaceGoal({
        athlete_id: athleteId,
        race_type: '703',
        race_name: '70.3 Long Course Weekend',
        race_date: defaultDate.toISOString().slice(0, 10),
        race_format: 'lcw_3day',
        plan_start_date: new Date().toISOString().slice(0, 10),
      });
    }
  }, [lcwGoal, athleteId, addRaceGoal]);

  // Désactivation réversible : coupe l'override local ET repasse l'objectif
  // persisté en format "continuous" (sinon le mode restait bloqué).
  const handleDisableLcw = React.useCallback(async () => {
    setLcwManualEnabled(false);
    if (lcwGoal) {
      try { await updateRaceGoalFormat(lcwGoal.id, 'continuous'); } catch { /* toast déjà émis */ }
    }
  }, [lcwGoal, updateRaceGoalFormat]);


  // raceObjective effectif : si LCW + segment run → Semi solo ; sinon inchangé.
  const raceObjective: RaceObjective = React.useMemo(() => {
    if (lcwActive && lcwSegment === 'run') return 'Semi';
    return raceObjectiveRaw;
  }, [lcwActive, lcwSegment, raceObjectiveRaw]);

  // Triathlon → afficher pacing vélo ET course (segments séparés)
  // En mode LCW, chaque segment est une épreuve SOLO → isTriathlon=false.
  const isTriathlon = !lcwActive && (raceObjective === 'IM' || raceObjective === '70.3');

  // Discipline "principale" pour modules legacy (simulation, nutrition…)
  const defaultRunObjective = raceObjective === 'Marathon' || raceObjective === 'Semi' || raceObjective === '10km';
  const [triDiscipline, setTriDiscipline] = useState<'bike' | 'run'>('bike');
  const discipline: 'bike' | 'run' = React.useMemo(() => {
    if (lcwActive) return lcwSegment === 'run' ? 'run' : 'bike'; // swim mappé sur bike (fallback)
    if (defaultRunObjective) return 'run';
    if (isTriathlon) return triDiscipline;
    return 'bike';
  }, [lcwActive, lcwSegment, defaultRunObjective, isTriathlon, triDiscipline]);

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
    const paceThr = paceThresholdOverrideSecKm
      ?? activeSnapshot?.pace_threshold_sec_per_km
      ?? raceChronoEstimate?.paceThreshold_sec_km
      ?? null; // sec/km au seuil
    // P1 — Pénalité glycolytique segment course basée sur la VLamax CAP (run), pas la bike.
    // F41 — insufficient-data guard : pas de fake 0.4. Si VLamax absente,
    // on n'applique aucune pénalité glyco (on ne devine pas un profil).
    const vlamaxRunVal = vlamaxRunEffectif?.value ?? vlamaxEffectif?.value ?? null;
    const vlamaxHigh = vlamaxRunVal != null && vlamaxRunVal >= 0.55;
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

    const fractions = vSeuilFractionByAmbition[ambition] ?? vSeuilFractionByAmbition.age_group;

    if (raceObjective === 'IM') {
      const runMin = computeRunMin(42.2, fractions.full) ?? 240;
      return { bike: 300, run: Math.round(runMin) };
    }
    if (raceObjective === '70.3') {
      const runMin = computeRunMin(21.1, fractions.half) ?? 105;
      return { bike: 150, run: Math.round(runMin) };
    }
    // Courses à pied pures — durée cohérente calculée (allure seuil × ambition),
    // plus de baseline 180/180 arbitraire qui contaminait nutrition & fiche route.
    if (raceObjective === 'Marathon') {
      const runMin = Math.round(computeRunMin(42.195, fractions.full) ?? 210);
      return { bike: runMin, run: runMin };
    }
    if (raceObjective === 'Semi') {
      const runMin = Math.round(computeRunMin(21.0975, fractions.half) ?? 100);
      return { bike: runMin, run: runMin };
    }
    if (raceObjective === '10km') {
      const runMin = Math.round(computeRunMin(10, Math.min(0.99, fractions.half + 0.05)) ?? 45);
      return { bike: runMin, run: runMin };
    }
    return { bike: 180, run: 180 };
  }, [raceObjective, activeSnapshot, vlamaxEffectif, vlamaxRunEffectif, raceChronoEstimate, selectedAthlete, paceThresholdOverrideSecKm]);

  const raceDurationMin = React.useMemo(() => {
    // LCW : chaque segment simulé SOLO, sans pénalité enchaînement.
    // Bike 90km TT solo : ~2h15-2h30 selon athlète ; on garde la baseline 150 min
    // (équivalente à la baseline 70.3, légèrement optimiste pour solo).
    // Run 21.1km SOLO fresh-start : on utilise le calcul Semi standard.
    // Swim 1.9km : ~30 min baseline (très athlète-dépendant).
    if (lcwActive) {
      if (lcwSegment === 'swim') return 30;
      if (lcwSegment === 'bike') return segmentDurationMin.bike; // 150 min baseline 70.3
      if (lcwSegment === 'run') return segmentDurationMin.run;   // Semi solo fresh calculé
    }
    if (isTriathlon) return segmentDurationMin[discipline];
    // Courses pures : la durée provient du même calcul que les segments → cohérence
    // garantie entre fiche route, nutrition et enveloppe de pacing.
    return segmentDurationMin.run;
  }, [lcwActive, lcwSegment, isTriathlon, segmentDurationMin, discipline]);


  // P0 — cible CHO canonique (Mader-Heck) par SEGMENT (vélo vs course à pied).
  // Le triathlon (IM / 70.3) et le Long Course Weekend ont deux cibles distinctes :
  // le vélo tolère nettement plus de glucides/h que la course à pied.
  const carbsTargetByLeg = React.useMemo(() => {
    const weight = activeSnapshot?.weight_kg ?? null;
    if (!weight) return { bike: null as number | null, run: null as number | null };
    const compute = (sport: 'velo' | 'cap', durationMin: number) => {
      const vla = sport === 'cap'
        ? (vlamaxRunEffectif?.value ?? vlamaxEffectif?.value ?? null)
        : (vlamaxEffectif?.value ?? null);
      const { baseRate } = computeBaseRateMader(
        weight,
        sport,
        activeSnapshot?.vo2max ?? null,
        vla,
        null,
        Math.max(0.25, durationMin / 60),
        heatLevel === 'high',
      );
      return baseRate;
    };
    const bikeMin = isTriathlon ? segmentDurationMin.bike : (discipline === 'bike' ? raceDurationMin : segmentDurationMin.bike);
    const runMin = isTriathlon ? segmentDurationMin.run : (discipline === 'run' ? raceDurationMin : segmentDurationMin.run);
    return { bike: compute('velo', bikeMin), run: compute('cap', runMin) };
  }, [activeSnapshot, vlamaxEffectif, vlamaxRunEffectif, raceDurationMin, segmentDurationMin, isTriathlon, discipline, heatLevel]);

  // Cible affichée pour le segment courant (plan de course, scénarios).
  const carbsTargetGH = discipline === 'run' ? carbsTargetByLeg.run : carbsTargetByLeg.bike;

  
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
    // Override what-if appliqué uniquement au segment course (le seuil run ne
    // sert pas pour la zone bike, qui pilote sur FTP/CP).
    const paceThresholdEffective = (discipline === 'run' ? paceThresholdOverrideSecKm : null)
      ?? activeSnapshot?.pace_threshold_sec_per_km
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
      // #4 — chronos & VMA depuis snapshot pour prédiction Riegel/Daniels
      raceChronos: buildRaceChronosFromSnapshot(activeSnapshot as any),
      vmaKmh: activeSnapshot?.vma ?? null,
      raceChrono: raceChronoEstimate ? {
        paceThreshold_sec_km: raceChronoEstimate.paceThreshold_sec_km ?? null,
        durabilityIndex: raceChronoEstimate.durabilityIndex ?? null,
        confidence: raceChronoEstimate.confidence,
      } : null,
    });
  }, [vlamaxEffectif, vlamaxRunEffectif, tteEffectif, fatmax, potentielPhysiologiqueScore, raceChronoEstimate, latestCheckin, raceObjective, discipline, activeSnapshot, selectedAthlete, paceThresholdOverrideSecKm]);

  // Stratégie objectif — pour les triathlons on calcule aussi l'enveloppe de l'autre segment,
  // de manière à présenter Plan A / Plan B sur les 2 segments en simultané.
  const envelopeBike = React.useMemo(() => {
    if (!isTriathlon && discipline !== 'bike') return null;
    if (discipline === 'bike') return envelope;
    const cpWkg = activeSnapshot?.ftp && activeSnapshot?.weight_kg
      ? (activeSnapshot.ftp * 0.95) / activeSnapshot.weight_kg : null;
    return computePacingEnvelope({
      vlamaxEffectif, tteEffectif, fatmax, potentielPhysiologiqueScore, fatigueIndex: null,
      raceObjective, sport: 'bike',
      ftp: activeSnapshot?.ftp, vma: activeSnapshot?.vma,
      paceThreshold: activeSnapshot?.pace_threshold_sec_per_km, weight: activeSnapshot?.weight_kg,
      ambition: (selectedAthlete as any)?.ambition ?? null, cpWkg, wPrimeJkg: null,
      predictedDurationMin: segmentDurationMin.bike,
      raceChronos: buildRaceChronosFromSnapshot(activeSnapshot as any),
      vmaKmh: activeSnapshot?.vma ?? null,
    });
  }, [isTriathlon, discipline, envelope, vlamaxEffectif, tteEffectif, fatmax, potentielPhysiologiqueScore, raceObjective, activeSnapshot, selectedAthlete, segmentDurationMin]);

  const envelopeRun = React.useMemo(() => {
    if (!isTriathlon && discipline !== 'run') return null;
    if (discipline === 'run') return envelope;
    const cpWkg = activeSnapshot?.ftp && activeSnapshot?.weight_kg
      ? (activeSnapshot.ftp * 0.95) / activeSnapshot.weight_kg : null;
    const paceThr = paceThresholdOverrideSecKm ?? activeSnapshot?.pace_threshold_sec_per_km ?? raceChronoEstimate?.paceThreshold_sec_km ?? null;
    return computePacingEnvelope({
      vlamaxEffectif: vlamaxRunEffectif ?? vlamaxEffectif, tteEffectif, fatmax,
      potentielPhysiologiqueScore, fatigueIndex: null,
      raceObjective, sport: 'run',
      ftp: activeSnapshot?.ftp, vma: activeSnapshot?.vma,
      paceThreshold: paceThr, weight: activeSnapshot?.weight_kg,
      ambition: (selectedAthlete as any)?.ambition ?? null, cpWkg, wPrimeJkg: null,
      predictedDurationMin: segmentDurationMin.run,
      raceChronos: buildRaceChronosFromSnapshot(activeSnapshot as any),
      vmaKmh: activeSnapshot?.vma ?? null,
    });
  }, [isTriathlon, discipline, envelope, vlamaxRunEffectif, vlamaxEffectif, tteEffectif, fatmax, potentielPhysiologiqueScore, raceObjective, activeSnapshot, selectedAthlete, segmentDurationMin, raceChronoEstimate, paceThresholdOverrideSecKm]);

  
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

  const handleExportReport = React.useCallback(() => {
    const html = buildRaceSimulationHTML({
      athleteName: selectedAthlete?.nom ?? 'Athlète',
      raceObjective: String(raceObjective),
      raceDurationMin,
      generatedAt: new Date().toLocaleString('fr-FR'),
      physio: {
        ftp: activeSnapshot?.ftp ?? null,
        vma: activeSnapshot?.vma ?? null,
        paceThresholdSecKm: paceThresholdOverrideSecKm ?? activeSnapshot?.pace_threshold_sec_per_km ?? null,
        vlamax: vlamaxEffectif?.value ?? null,
        vlamaxRun: vlamaxRunEffectif?.value ?? null,
        vo2max: activeSnapshot?.vo2max ?? null,
        tteMin: tteEffectif?.tte_min ?? null,
        tteMinRun: tteEffectifRun?.tte_min ?? null,
        weightKg: activeSnapshot?.weight_kg ?? null,
        potentielScore: potentielPhysiologiqueScore ?? null,
      },
      envelope: envelope ?? null,
      envelopeBike: envelopeBike ?? null,
      envelopeRun: envelopeRun ?? null,
      scenarios: scenarios ?? null,
    });
    openPrintableHTML(html, {
      filenameHint: `Simulation_${(selectedAthlete?.nom ?? 'athlete').replace(/\s+/g, '_')}_${raceObjective}`,
      autoPrint: false,
    });
  }, [selectedAthlete, raceObjective, raceDurationMin, activeSnapshot, paceThresholdOverrideSecKm, vlamaxEffectif, vlamaxRunEffectif, tteEffectif, tteEffectifRun, potentielPhysiologiqueScore, envelope, envelopeBike, envelopeRun, scenarios]);

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
            <Select value={heatLevel} onValueChange={(v) => setHeatLevel(v as any)}>
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🌤 Frais</SelectItem>
                <SelectItem value="moderate">🌡 Tempéré</SelectItem>
                <SelectItem value="high">🔥 Chaud</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild variant="outline" size="sm" className="gap-1.5 h-8 text-xs sm:text-sm">
              <Link to="/race/pacing-audit">
                <FlaskConical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Audit pacing</span>
              </Link>
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 h-8 text-xs sm:text-sm"
              onClick={handleExportReport}
              disabled={!selectedAthlete}
              title="Ouvrir une page imprimable / exporter en PDF"
            >
              <FileDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">📄 Exporter le rapport</span>
            </Button>

            {envelope && rules && scenarios && (
              <Dialog defaultOpen={searchParams.get('briefing') === '1'}>
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

        <NolioValidationCard
          athleteId={selectedAthlete?.id ?? null}
          raceObjective={raceObjective}
          simulationMin={raceDurationMin}
        />



        {isTrailGoal && !forceShowSimulation ? (
          <Card className="bg-card border-border">
            <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
                <span>🏔️</span>
                Simulation Trail TFCL™
              </CardTitle>
              <CardDescription>
                Module dédié trail : Minetti 2002 (coût énergétique pente), pacing GAP, glycogène ultra, fatigue neuromusculaire.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li>✅ Temps estimé selon D+ / D- / technicité</li>
                <li>✅ Gestion glycogène sur ultra</li>
                <li>✅ Stratégie allure montée/descente (GAP)</li>
                <li>✅ Plan nutritionnel par phase</li>
                <li>✅ Fatigue neuromusculaire {'>'}6h / {'>'}12h</li>
              </ul>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link to="/simulation/trail" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto">Ouvrir la simulation trail</Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => setForceShowSimulation(true)}
                  className="w-full sm:w-auto"
                >
                  Utiliser la simulation course à pied
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
        {/* Toggle manuel LCW (visible si objectif 70.3 mais pas encore activé) */}
        {raceObjectiveRaw === '70.3' && !lcwActive && (
          <Alert className="text-xs sm:text-sm py-2 sm:py-3 border-dashed">
            <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span className="text-[11px] sm:text-sm leading-relaxed flex-1">
                Cette course est-elle au format <strong>Long Course Weekend</strong> (3 jours indépendants : nage vendredi, vélo samedi, course dimanche) ?
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs shrink-0"
                onClick={handleEnableLcwAndPersist}
              >
                Activer le mode LCW
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Bouton désactiver (si LCW actif via toggle local, pas persisté) */}
        {lcwActive && lcwManualEnabled && !lcwGoal && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px] text-muted-foreground"
              onClick={() => setLcwManualEnabled(false)}
            >
              Désactiver le mode LCW
            </Button>
          </div>
        )}

        {/* ═══ BANNER + SÉLECTEUR LCW (Long Course Weekend — 3 jours éclatés) ═══ */}

        {lcwActive && (
          <Alert className="text-xs sm:text-sm py-2 sm:py-3 bg-primary/5 border-primary/30">
            <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <AlertDescription className="space-y-2">
              <div className="text-[11px] sm:text-sm leading-relaxed">
                <strong>Format LCW détecté</strong> — {lcwGoal?.race_name ?? '70.3 Long Course Weekend'} ({lcwGoal?.race_date}).
                Chaque épreuve est simulée comme un <strong>effort solo, jambes fraîches</strong> (pas d'enchaînement, pas de carry-over fatigue / glycogène).
              </div>
              <div className="inline-flex rounded-md border border-border overflow-hidden bg-background">
                {([
                  { key: 'swim', label: '🏊 Natation 1.9 km', day: 'Vendredi (J-2)' },
                  { key: 'bike', label: '🚴 Vélo 90 km', day: 'Samedi (J-1)' },
                  { key: 'run', label: '🏃 Course 21.1 km', day: 'Dimanche (J)' },
                ] as const).map(seg => (
                  <button
                    key={seg.key}
                    type="button"
                    onClick={() => setLcwSegment(seg.key)}
                    className={`px-3 py-1.5 text-[11px] sm:text-xs font-medium transition-colors border-r border-border last:border-r-0 ${
                      lcwSegment === seg.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                    }`}
                    title={seg.day}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Info banner - compact */}
        <Alert className="text-xs sm:text-sm py-2 sm:py-3">
          <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <AlertDescription className="text-[11px] sm:text-sm leading-relaxed">
            {SIMULATION_DEFINITIONS.official}
          </AlertDescription>
        </Alert>
        
        {/* ═══ Parcours guidé en 5 étapes ═══ */}
        <Accordion type="multiple" value={openSteps} onValueChange={setOpenSteps} className="w-full space-y-2">

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
              {!activeSnapshot && selectedAthlete && (
                <Alert variant="destructive" className="text-xs sm:text-sm">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <div>
                      <strong>Aucun snapshot rattaché à « {selectedAthlete.nom} ».</strong>
                      {" "}La simulation a besoin d'un snapshot (FTP, VLamax, TTE, VO₂max…) pour afficher ton profil et calculer un pacing fiable.
                    </div>
                    {(() => {
                      const homonyms = (athletes || []).filter(
                        (a: any) => a.nom === selectedAthlete.nom && a.id !== selectedAthlete.id
                      );
                      const withSnap = homonyms.find((a: any) =>
                        (snapshots || []).some(s => s.athlete_id === a.id)
                      );
                      if (withSnap) {
                        return (
                          <div className="text-[11px] sm:text-xs">
                            ⚠️ Une autre fiche « {selectedAthlete.nom} » existe et contient des snapshots.
                            <Button
                              variant="link"
                              size="sm"
                              className="px-1 h-auto text-[11px] sm:text-xs underline"
                              onClick={() => {
                                try {
                                  localStorage.setItem("vinceslab-selected-athlete", withSnap.id);
                                  sessionStorage.setItem("vinceslab-selected-athlete-session", withSnap.id);
                                } catch {}
                                window.location.reload();
                              }}
                            >
                              Basculer sur cette fiche
                            </Button>
                          </div>
                        );
                      }
                      return (
                        <div className="text-[11px] sm:text-xs">
                          <Link to="/diagnostic" className="underline">Encoder un snapshot dans Diagnostic →</Link>
                        </div>
                      );
                    })()}
                  </AlertDescription>
                </Alert>
              )}
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
              {lcwActive && lcwSegment === 'swim' ? (
                <LCWSwimSoloCard
                  weightKg={activeSnapshot?.weight_kg ?? null}
                  raceName={lcwGoal?.race_name ?? '70.3 LCW'}
                />
              ) : (<></>)}
              {lcwActive && lcwSegment === 'swim' ? null : (<>

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

              <Alert className="text-[11px] sm:text-xs py-2 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40">
                <Info className="h-3.5 w-3.5" />
                <AlertDescription>
                  <strong>💡 Pourquoi ce chiffre ?</strong> Le couloir vert est l'intensité optimale calculée depuis ton ratio FTP/VLamax : plus ta VLamax est élevée, plus tu brûles vite ton glycogène et plus le plafond est resserré. Ta TTE et ton potentiel physiologique du jour ajustent ensuite la largeur du couloir.
                </AlertDescription>
              </Alert>
              {envelope ? (

                <PacingEnvelopeCard
                  input={{
                    vlamaxEffectif, tteEffectif, fatmax, potentielPhysiologiqueScore,
                    fatigueIndex: null, raceObjective, sport: discipline,
                    ftp: activeSnapshot?.ftp, vma: activeSnapshot?.vma,
                    paceThreshold: (discipline === 'run' ? paceThresholdOverrideSecKm : null) ?? activeSnapshot?.pace_threshold_sec_per_km,
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
              </>)}
            </AccordionContent>
          </AccordionItem>

          {/* ÉTAPE 3 — TON PLAN DE COURSE */}
          <AccordionItem id="step-3" value="step-3" className="border border-border rounded-lg px-3 sm:px-4 bg-card scroll-mt-20">
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
              <Alert className="text-[11px] sm:text-xs py-2 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40">
                <Info className="h-3.5 w-3.5" />
                <AlertDescription>
                  <strong>💡 Pourquoi ce chiffre ?</strong> <em>Robuste</em> = on reste dans la moitié basse du couloir, risque physiologique minimal et marge pour finir fort. <em>Ambitieux</em> = on vise le centre, perf optimisée si la TTE le permet. <em>Agressif</em> = on flirte avec le plafond toléré, gain marginal mais risque réel d'effondrement glycogénique ou cardiaque dans le dernier tiers.
                </AlertDescription>
              </Alert>

              {lcwActive && lcwSegment === 'swim' ? (
                <Alert className="text-[11px] sm:text-xs py-2">
                  <Info className="h-3.5 w-3.5" />
                  <AlertDescription>
                    Le plan de course standard (vélo / course à pied) ne s'applique pas à la natation.
                    Consulte l'encart natation à l'étape 2 pour les consignes spécifiques (allure, sighting, drafting, sortie d'eau).
                  </AlertDescription>
                </Alert>
              ) : (<>

              {/* What-if seuil run — recalcule allures cibles & temps */}
              {(discipline === 'run' || isTriathlon) && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-0.5">
                      <Label htmlFor="pace-threshold-whatif" className="text-xs font-semibold">
                        Tester un autre seuil run (what-if)
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Seuil encodé : {activeSnapshot?.pace_threshold_sec_per_km
                          ? `${fmtMmSs(activeSnapshot.pace_threshold_sec_per_km)}/km`
                          : '—'} · format mm:ss
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="pace-threshold-whatif"
                        value={paceThresholdInput}
                        onChange={(e) => setPaceThresholdInput(e.target.value)}
                        placeholder="ex: 4:20"
                        className="h-8 w-24 text-xs"
                      />
                      <span className="text-[11px] text-muted-foreground">/km</span>
                      {overrideActive && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setPaceThresholdInput('')}
                        >
                          Réinitialiser
                        </Button>
                      )}
                    </div>
                  </div>
                  {overrideActive && paceThresholdOverrideSecKm && (
                    <div className="text-[11px] text-primary font-medium">
                      ✓ Recalculs actifs avec seuil = {fmtMmSs(paceThresholdOverrideSecKm)}/km
                      {activeSnapshot?.pace_threshold_sec_per_km && (
                        <span className="text-muted-foreground font-normal">
                          {' '}(Δ {paceThresholdOverrideSecKm < activeSnapshot.pace_threshold_sec_per_km ? '−' : '+'}
                          {fmtMmSs(Math.abs(paceThresholdOverrideSecKm - activeSnapshot.pace_threshold_sec_per_km))} vs encodé)
                        </span>
                      )}
                    </div>
                  )}
                  {paceThresholdInput.trim() !== '' && !overrideActive && (
                    <div className="text-[11px] text-destructive">
                      Format invalide — utilise mm:ss entre 2:30 et 10:00 (ex: 4:20).
                    </div>
                  )}
                </div>
              )}
              {/* Hiérarchie explicite des deux cartes de plan de course (P0) */}
              <Alert className="text-[11px] sm:text-xs py-2 bg-primary/5 border-primary/20">
                <Info className="h-3.5 w-3.5" />
                <AlertDescription>
                  <strong>1. Plan A / Plan B</strong> = ton choix stratégique global (objectif et repli).{' '}
                  <strong>2. Robuste / Ambitieux / Agressif</strong> = l'exécution détaillée, segment par segment.
                  En cas d'écart entre les deux, <strong>ce sont les scénarios détaillés qui font foi le jour J</strong>,
                  et la nutrition affichée partout vient du même moteur (étape 4).
                </AlertDescription>
              </Alert>
              {/* Stratégie Plan A & Plan B — toujours visible (mode athlète ET mode staff) */}
              <ObjectiveStrategyCard
                raceObjective={raceObjective}
                bikeEnvelope={envelopeBike}
                runEnvelope={envelopeRun}
                ftp={activeSnapshot?.ftp ?? null}
                paceThresholdSecKm={paceThresholdOverrideSecKm ?? activeSnapshot?.pace_threshold_sec_per_km ?? raceChronoEstimate?.paceThreshold_sec_km ?? null}
                weightKg={activeSnapshot?.weight_kg ?? null}
                vlamaxBike={vlamaxEffectif?.value ?? null}
                vlamaxRun={vlamaxRunEffectif?.value ?? vlamaxEffectif?.value ?? null}
                vo2max={activeSnapshot?.vo2max ?? null}
                tteMin={tteEffectif?.tte_min ?? null}
                tteMinRun={tteEffectifRun?.tte_min ?? null}
                bikeDurationMin={isTriathlon ? segmentDurationMin.bike : (discipline === 'bike' ? raceDurationMin : null)}
                runDurationMin={isTriathlon ? segmentDurationMin.run : (discipline === 'run' ? raceDurationMin : null)}
                athleteId={athleteId || null}
              />
              {/* Section #3 identique sur desktop / iPad / iPhone — toujours en vue athlète */}
              {envelope ? (
                <RaceStrategyPlanCard
                  envelope={envelope}
                  raceObjective={raceObjective}
                  discipline={discipline}
                  raceDurationMin={raceDurationMin}
                  ftp={activeSnapshot?.ftp}
                  paceThresholdSecKm={discipline === 'run' ? (paceThresholdOverrideSecKm ?? activeSnapshot?.pace_threshold_sec_per_km) : activeSnapshot?.pace_threshold_sec_per_km}
                  disponibiliteScore={disponibilite?.score}
                  carbsTargetGH={carbsTargetGH}
                />
              ) : null}
              {(discipline === 'run' || isTriathlon) && envelopeRun && (paceThresholdOverrideSecKm ?? activeSnapshot?.pace_threshold_sec_per_km) && (
                <PlanVsSimulationPaceChart
                  raceObjective={raceObjective}
                  runEnvelope={envelopeRun}
                  paceThresholdSecKm={(paceThresholdOverrideSecKm ?? activeSnapshot?.pace_threshold_sec_per_km)!}
                  vma={activeSnapshot?.vma ?? null}
                  vlamaxRun={vlamaxRunEffectif?.value ?? vlamaxEffectif?.value ?? null}
                  tteMinRun={tteEffectifRun?.tte_min ?? tteEffectif?.tte_min ?? null}
                  runDurationMin={isTriathlon ? segmentDurationMin.run : raceDurationMin}
                  weightKg={activeSnapshot?.weight_kg ?? null}
                />
              )}
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
              </>)}
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
                    Glucides et hydratation — calibrés sur ta VLamax et la durée
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              {!staffMode && (
                <Alert className="text-[11px] sm:text-xs py-2 bg-primary/5 border-primary/20">
                  <Info className="h-3.5 w-3.5" />
                  <AlertDescription>
                    Ta nutrition n'est pas générique : elle suit ta consommation réelle de glucides à l'allure cible. Le protocole ci-dessous est chiffré sur <strong>ton</strong> métabolisme.
                  </AlertDescription>
                </Alert>
              )}
              <Alert className="text-[11px] sm:text-xs py-2 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40">
                <Info className="h-3.5 w-3.5" />
                <AlertDescription>
                  <strong>💡 Pourquoi ce chiffre ?</strong> Les grammes de glucides par heure ne sont pas génériques : ils sont calculés depuis ta dépendance glycolytique mesurée par la VLamax (moteur unifié V3 — Mader-Heck + Jeukendrup). Plus la VLamax est haute, plus tu vides ton glycogène vite et plus la cible CHO/h monte. La durée de course module ensuite la bande recommandée.
                </AlertDescription>
              </Alert>

              {!activeSnapshot?.weight_kg ? (
                <div className="text-center py-6 text-sm text-muted-foreground">Poids athlète manquant — protocoles indisponibles</div>
              ) : (
                (() => {
                  const goalLabel = String((raceGoals?.[0]?.race_type) || (activeSnapshot as any)?.objectif || objectif || 'IM');
                  const vlaRun = vlamaxRunEffectif?.value ?? vlamaxEffectif?.value ?? null;
                  const vlaBike = vlamaxEffectif?.value ?? null;
                  const bikeMin = (isTriathlon || lcwActive || discipline === 'bike') ? (isTriathlon || lcwActive ? segmentDurationMin.bike : raceDurationMin) : segmentDurationMin.bike;
                  const runMin = (isTriathlon || lcwActive) ? segmentDurationMin.run : (discipline === 'run' ? raceDurationMin : segmentDurationMin.run);
                  const bikeCard = (
                    <NutritionUnifiedCard
                      vlamaxValue={vlaBike}
                      vlamaxConfidence={vlamaxEffectif?.confidence ?? 0.7}
                      vo2max={activeSnapshot?.vo2max ?? null}
                      tteMin={tteEffectif?.tte_min ?? null}
                      sport="velo"
                      objectif={goalLabel}
                      targetDurationHours={bikeMin / 60}
                      weightKg={activeSnapshot?.weight_kg ?? null}
                      heatCondition={heatLevel === 'high'}
                      staffMode={staffMode}
                    />
                  );
                  const runCard = (
                    <NutritionUnifiedCard
                      vlamaxValue={vlaRun}
                      vlamaxConfidence={vlamaxRunEffectif?.confidence ?? 0.7}
                      vo2max={activeSnapshot?.vo2max ?? null}
                      tteMin={tteEffectifRun?.tte_min ?? null}
                      sport="cap"
                      objectif={goalLabel}
                      targetDurationHours={runMin / 60}
                      weightKg={activeSnapshot?.weight_kg ?? null}
                      heatCondition={heatLevel === 'high'}
                      staffMode={staffMode}
                    />
                  );

                  // Triathlon (IM / 70.3) et Long Course Weekend : deux segments,
                  // deux tolérances digestives → deux protocoles distincts.
                  if (isTriathlon || lcwActive) {
                    return (
                      <div className="space-y-4">
                        <Alert className="text-[11px] sm:text-xs py-2 bg-primary/5 border-primary/20">
                          <Info className="h-3.5 w-3.5" />
                          <AlertDescription>
                            🚴 <strong>Vélo</strong> et 🏃 <strong>course à pied</strong> n'ont pas la même cible :
                            l'estomac tolère plus de glucides sur le vélo (position stable, pas d'impact).
                            Cible vélo <strong>{carbsTargetByLeg.bike ?? '—'} g/h</strong> ·
                            cible course <strong>{carbsTargetByLeg.run ?? '—'} g/h</strong>.
                            {' '}Charge donc l'essentiel sur le vélo, puis allège dès T2.
                          </AlertDescription>
                        </Alert>
                        {(!lcwActive || lcwSegment !== 'run') && (
                          <div className="space-y-2">
                            <div className="text-sm font-semibold">🚴 Segment vélo · {Math.round(bikeMin)} min</div>
                            {bikeCard}
                          </div>
                        )}
                        {(!lcwActive || lcwSegment === 'run') && (
                          <div className="space-y-2">
                            <div className="text-sm font-semibold">🏃 Segment course à pied · {Math.round(runMin)} min</div>
                            {runCard}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return discipline === 'run' ? runCard : bikeCard;
                })()
              )}

            </AccordionContent>
          </AccordionItem>

          {/* ÉTAPE 5 — RÉCUPÉRATION POST-COURSE */}
          <AccordionItem value="step-5" className="border border-border rounded-lg px-3 sm:px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <Badge variant="default" className="h-7 w-7 rounded-full p-0 flex items-center justify-center text-xs shrink-0">5</Badge>
                <div>
                  <div className="text-sm sm:text-base font-semibold">Récupération post-course</div>
                  <div className="text-[11px] sm:text-xs text-muted-foreground font-normal">
                    Fenêtres 4R : rehydrate, refuel, repair, rest
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4">
              {!activeSnapshot?.weight_kg ? (
                <div className="text-center py-6 text-sm text-muted-foreground">Poids athlète manquant — protocole indisponible</div>
              ) : (
                <RecoveryNutritionCard
                  input={{
                    weightKg: activeSnapshot.weight_kg,
                    durationMin: raceDurationMin,
                    intensity: raceDurationMin >= 150 ? 'depleting' : 'high',
                    goal: 'full_recovery_48h',
                    hotConditions: heatLevel === 'high',
                  }}
                  staffMode={staffMode}
                />
              )}
            </AccordionContent>
          </AccordionItem>

          {/* ÉTAPE 6 — TES RISQUES & RAPPORT STAFF */}
          <AccordionItem value="step-6" className="border border-border rounded-lg px-3 sm:px-4 bg-card">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 text-left">
                <Badge variant="default" className="h-7 w-7 rounded-full p-0 flex items-center justify-center text-xs shrink-0">6</Badge>
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
          </>
        )}
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

// ═══════════════════════════════════════════════════════════════════════════════
// LCW SWIM SOLO CARD
// Carte dédiée natation 1.9 km solo (vendredi) en format LCW.
// La majorité des modules existants pilotent sur FTP/pace seuil → non pertinents
// pour la nage. On affiche ici les consignes spécifiques OWS race-sim.
// ═══════════════════════════════════════════════════════════════════════════════
function LCWSwimSoloCard({
  weightKg,
  raceName,
}: {
  weightKg: number | null;
  raceName: string;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏊</span>
          <div>
            <h3 className="text-sm font-semibold">Natation 1.9 km — {raceName}</h3>
            <p className="text-[11px] text-muted-foreground">
              Effort solo · Vendredi (J-2) · Eau libre · Sortir frais pour le vélo de samedi
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
            Allure cible
          </div>
          <p className="text-[11px] leading-snug">
            <strong>Régulière, contrôlée.</strong> Démarrer 5 % sous l'allure CSS,
            puis stabiliser. Pas de sprint départ (risque hyperventilation, perte d'aspiration).
          </p>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
            Sighting & trajectoire
          </div>
          <p className="text-[11px] leading-snug">
            Lever la tête toutes les <strong>6–8 brasses</strong>. Viser les bouées les
            plus éloignées pour ligne droite. Drafting autorisé : se caler dans les pieds
            d'un nageur ~ même allure (économie 5–10 %).
          </p>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
            Sortie d'eau & T1
          </div>
          <p className="text-[11px] leading-snug">
            Accélérer 200 m avant la sortie (réveil cardiaque pour la T1). Combinaison
            descendue jusqu'à la taille en courant. Hydratation immédiate dès T1.
          </p>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">
            Récupération post-épreuve
          </div>
          <p className="text-[11px] leading-snug">
            <strong>Refeed agressif</strong> : 1.0 g CHO/kg dans les 30 min + protéines.
            {weightKg ? ` Pour toi : ~${Math.round(weightKg * 1.0)} g CHO post-nage.` : ''}
            {' '}Sieste 30–60 min l'après-midi. Nutrition normale au dîner pré-vélo.
          </p>
        </div>
      </div>

      <Alert className="text-[11px] sm:text-xs py-2 bg-amber-500/5 border-amber-500/30">
        <Info className="h-3.5 w-3.5" />
        <AlertDescription>
          <strong>Format LCW :</strong> cette épreuve est jugée seule. L'enjeu n'est pas le
          chrono natation mais de sortir <em>frais</em> pour les 90 km de vélo du lendemain.
          Marge de sécurité 5–8 % vs allure CSS solo.
        </AlertDescription>
      </Alert>
    </div>
  );
}


// ─── Nolio validation card ────────────────────────────────────────────────
function NolioValidationCard({
  athleteId, raceObjective, simulationMin,
}: { athleteId: string | null; raceObjective: string; simulationMin: number }) {
  const [records, setRecords] = React.useState<Array<{ item_seconds: number; value: number; record_type: string; date_recorded: string | null }>>([]);

  React.useEffect(() => {
    if (!athleteId) return;
    let c = false;
    (async () => {
      const { data } = await supabase
        .from("nolio_records" as any)
        .select("item_seconds, value, record_type, date_recorded, sport_id, cat")
        .eq("athlete_id", athleteId)
        .eq("cat", "par")
        .in("sport_id", [2, 52]);
      if (!c && data) setRecords(((data as unknown) as any[]).map(r => ({
        item_seconds: r.item_seconds, value: r.value, record_type: r.record_type, date_recorded: r.date_recorded,
      })));
    })();
    return () => { c = true; };
  }, [athleteId]);

  if (!athleteId || records.length === 0) return null;

  // target distance based on objective
  const targetKm = raceObjective === "Marathon" ? 42.195
    : raceObjective === "Semi" ? 21.1
    : raceObjective === "10km" ? 10 : null;
  if (!targetKm) return null;

  // ⚠️ Unités Nolio : value = vitesse (m/s).
  //   record_type='distance' → item_seconds = distance (m), temps = distance / vitesse
  //   record_type='time'     → item_seconds = durée (s),    distance = durée × vitesse
  const normalized = records
    .filter(r => Number.isFinite(r.value) && r.value > 0 && r.item_seconds > 0)
    .map(r => r.record_type === "distance"
      ? { distKm: r.item_seconds / 1000, timeSec: r.item_seconds / r.value, date_recorded: r.date_recorded }
      : { distKm: (r.item_seconds * r.value) / 1000, timeSec: r.item_seconds, date_recorded: r.date_recorded });

  const tol = 0.15;
  const matches = normalized.filter(r => Math.abs(r.distKm - targetKm) / targetKm < tol);
  if (matches.length === 0) return null;
  const best = matches.reduce((a, b) => (a.timeSec < b.timeSec ? a : b));
  const recordMin = best.timeSec / 60;
  const diffPct = ((simulationMin - recordMin) / recordMin) * 100;
  const fmtT = (m: number) => `${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, "0")}`;

  return (
    <Card className="bg-amber-50/40 dark:bg-amber-900/10 border-amber-300/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">🏆 Validation depuis records Nolio</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-1">
        <div>
          <b>Record réel :</b> {fmtT(recordMin)} — <b>Simulation :</b> {fmtT(simulationMin)} — <b>Écart :</b> {diffPct >= 0 ? "+" : ""}{diffPct.toFixed(1)}%
        </div>
        {Math.abs(diffPct) > 5 && (
          <div className="text-amber-700 dark:text-amber-400 font-semibold">
            ⚠️ Les paramètres physiologiques méritent d'être affinés.
          </div>
        )}
        {best.date_recorded && (
          <div className="text-[10px] text-muted-foreground">
            Record du {new Date(best.date_recorded).toLocaleDateString("fr-FR")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
