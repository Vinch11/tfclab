import { fatigueStateToScoreOrDefault } from "@/lib/fatigueStateMapping";
import { type AvailabilityRun, computePotentielRun } from "@/lib/v2/potentielTypes";
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RUNNING PROFILE PAGE — Two For Coaching Lab™
 * 
 * Page dédiée au profil physiologique course à pied.
 * Affiche tous les composants CAP spécifiques au Running Focus Mode.
 * Supporte la réorganisation persistante des sections via SortableSectionsContainer.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Activity,
  Target,
  Zap,
  Heart,
  Timer,
  TrendingUp,
  Shield,
  Brain,
  AlertTriangle,
  Lock,
} from "lucide-react";

// Contextes et hooks
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { useRunningFocusMode } from "@/hooks/useRunningFocusMode";
import { useCalibrationEvidence } from "@/hooks/useCalibrationEvidence";

// Composants CAP
import { VLamaxCAPCard } from "@/components/VLamaxCAPCard";
import { RunningEconomyModule } from "@/components/RunningEconomyModule";
import { RunningEconomySummaryCard } from "@/components/RunningEconomySummaryCard";
import { RunningFocusModeIndicator } from "@/components/RunningFocusModeIndicator";
import { InjuryRiskCAPCard } from "@/components/InjuryRiskCAPCard";
import { VLamaxRunExplainedCard } from "@/components/VLamaxRunExplainedCard";
import { PacingEnvelopeRunCard } from "@/components/PacingEnvelopeRunCard";
import { VmaTargetsCard } from "@/components/VmaTargetsCard";
import { SortableSectionsContainer } from "@/components/SortableSectionsContainer";
import { MetabolicCompassCAP } from "@/components/charts";
import { RunMLSSCoherenceCard } from "@/components/RunMLSSCoherenceCard";
import { RunMLSSDriftDetectionCard } from "@/components/RunMLSSDriftDetectionCard";

// Logique et calculs
import { computeVLamaxEffectif, computeTTEEffectif } from "@/engines/diagnostic";
import { getEffectiveRefs } from "@/lib/effectiveRefs";
import { calculateAge } from "@/lib/ageAdjustment";
import { computeCAPInjuryRisk } from "@/lib/v2/injuryRiskUnified";
import { computeFatigueEffectif } from "@/engines/diagnostic";
import { computePacingEnvelopeRun, type RunningDistance } from "@/lib/v2/pacingEnvelopeRunning";
import { getAthleteAmbition } from "@/types/ambitionLevel";
import { getVLamaxRange } from "@/lib/physiologicalTargets";
import {
  predictRunMLSSPctFromVLaCE,
  crossValidateRunMLSS,
} from "@/lib/v2/runMLSSPredictor";
import {
  buildRunMLSSSignature,
  persistRunMLSSTrace,
} from "@/lib/v2/runMLSSTracePersistence";
import type { AthleteDiagnostic } from "@/engines/diagnostic";

export default function RunningProfilePage() {
  const navigate = useNavigate();
  const { currentAthlete } = useAthletes();
  const { snapshots, tests, checkins, addCheckin, updateCheckin } = useCloudDataContext();
  const { isRunningOnly, raceType, raceLabel, targets, distanceKm } = useRunningFocusMode();

  // État local pour SidebarLayout
  const [activeTab, setActiveTab] = useState("running-profile");
  const [staffMode, setStaffMode] = useState(() => {
    const saved = localStorage.getItem("vlab-staff-mode");
    return saved === "true";
  });

  // Données athlète
  const athleteId = currentAthlete?.id ?? null;
  const athleteGoal = currentAthlete?.objectif ?? "Marathon";
  const athleteAge = calculateAge(currentAthlete?.dateNaissance);

  // Calibration Evidence
  const {
    windowEvidences,
    latestSnapshot: calibrationSnapshot,
    isLocked,
  } = useCalibrationEvidence(athleteId);

  // Effective Refs
  const effectiveRefs = useMemo(() => {
    if (!currentAthlete) return { ftp: null, fcMax: null, weightKg: null, vo2max: null };
    const dbAthlete = {
      id: currentAthlete.id,
      name: currentAthlete.nom,
      goal: currentAthlete.objectif,
      refs: currentAthlete.refs,
      vo2max: currentAthlete.vo2max,
      active_snapshot_id: currentAthlete.active_snapshot_id,
      birth_date: currentAthlete.dateNaissance,
      coach_id: "",
      created_at: "",
      sex: null,
    };
    return getEffectiveRefs(dbAthlete, snapshots);
  }, [currentAthlete, snapshots]);

  // Effective Cloud Snapshot
  const effectiveCloudSnapshot = useMemo(() => {
    if (!currentAthlete) return null;
    const athleteSnapshots = snapshots.filter(s => s.athlete_id === currentAthlete.id);
    if (athleteSnapshots.length === 0) return null;
    
    if (currentAthlete.active_snapshot_id) {
      const active = athleteSnapshots.find(s => s.id === currentAthlete.active_snapshot_id);
      if (active) return active;
    }
    return [...athleteSnapshots].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  }, [currentAthlete, snapshots]);

  // VLamax Effectif
  const vlamaxEffectif = useMemo(() => {
    if (!currentAthlete) {
      return { value: null, source: "unknown" as const, confidence: 0, label: "" };
    }
    return computeVLamaxEffectif({
      athleteId: currentAthlete.id,
      objectif: athleteGoal,
      activeSnapshotId: currentAthlete.active_snapshot_id,
      tests: tests.map(t => ({
        athlete_id: t.athlete_id,
        vlamax: t.vlamax,
        date: t.date,
        type: t.type,
        name: t.name,
      })),
      snapshots: snapshots.map(s => ({
        id: s.id,
        athlete_id: s.athlete_id,
        date: s.date,
        vlamax: s.vlamax,
        ftp: s.ftp,
        pmax_5s: s.pmax_5s,
        weight_kg: s.weight_kg,
        sport_main: s.sport_main,
        p30s_w: s.p30s_w,
        p60s_w: s.p60s_w,
        map5min_w: s.map5min_w,
        tte_observed_min: s.tte_observed_min,
        protocol_quality: s.protocol_quality,
        objectif: s.objectif,
        vo2max: s.vo2max,
        vma: (s as any).vma ?? null,
        pace_threshold_sec_per_km: (s as any).pace_threshold_sec_per_km ?? null,
        running_power_threshold: (s as any).running_power_threshold ?? null,
        running_power_max: (s as any).running_power_max ?? null,
        running_power_1s: (s as any).running_power_1s ?? null,
        running_power_5s: (s as any).running_power_5s ?? null,
        running_power_30s: (s as any).running_power_30s ?? null,
        running_power_60s: (s as any).running_power_60s ?? null,
        running_power_5min: (s as any).running_power_5min ?? null,
        // ✅ VLamax CAP mesurée (sprint lactate / test terrain)
        vlamax_run: (s as any).vlamax_run ?? null,
        vlamax_source: (s as any).vlamax_source ?? null,
        vlamax_protocol: (s as any).vlamax_protocol ?? null,
        sprint_15s_distance: (s as any).sprint_15s_distance ?? null,
      })),
    });
  }, [currentAthlete, tests, snapshots, athleteGoal]);

  // TTE Effectif
  const tteEffectif = useMemo(() => {
    return computeTTEEffectif({
      tte_mode: effectiveCloudSnapshot?.tte_mode ?? null,
      tte_observed_min: effectiveCloudSnapshot?.tte_observed_min ?? null,
      ftp: effectiveRefs.ftp,
      objectif: athleteGoal,
    });
  }, [effectiveCloudSnapshot, effectiveRefs, athleteGoal]);

  // Fatigue Effectif — snapshot-centric (fatigue_state → score numérique)
  const fatigueResult = useMemo(() => {
    const fatiguePercue = fatigueStateToScoreOrDefault(effectiveCloudSnapshot?.fatigue_state);
    
    return computeFatigueEffectif({
      tss7d: effectiveCloudSnapshot?.tss_7d ?? null,
      tss7dHabituel: null,
      fatiguePercue,
      tteEffectif: tteEffectif,
      potentielPhysiologique: null,
      vlamaxEffectif: vlamaxEffectif,
      age: athleteAge,
      objectif: athleteGoal,
    });
  }, [effectiveCloudSnapshot, tteEffectif, vlamaxEffectif, athleteAge, athleteGoal]);

  // CAP Injury Risk
  const capInjuryRisk = useMemo(() => {
    return computeCAPInjuryRisk({
      vlamaxValue: vlamaxEffectif.value,
      economyLevel: effectiveCloudSnapshot?.run_economy_label ?? null,
      tteMin: tteEffectif.tte_min,
      fatiguePct: fatigueResult?.score ?? 40,
      tss7d: effectiveCloudSnapshot?.tss_7d ?? null,
      runLoad7d: null,
      age: athleteAge,
      objectif: athleteGoal,
    });
  }, [vlamaxEffectif, effectiveCloudSnapshot, tteEffectif, fatigueResult, athleteAge, athleteGoal]);

  // Potentiel Physiologique Running — snapshot-centric
  const potentielPhysiologique = useMemo(() => {
    if (!currentAthlete) return null;
    
    // Mapper fatigue_state du snapshot vers les valeurs de disponibilité
    const fatigueStateMap: Record<string, { fatigue: number; soreness: number; sleep: number; stress: number; motivation: number }> = {
      fresh:    { fatigue: 1, soreness: 1, sleep: 4, stress: 2, motivation: 5 },
      ok:       { fatigue: 3, soreness: 2, sleep: 3, stress: 3, motivation: 3 },
      fatigued: { fatigue: 5, soreness: 3, sleep: 2, stress: 4, motivation: 2 },
      high:     { fatigue: 7, soreness: 5, sleep: 2, stress: 5, motivation: 2 },
      injured:  { fatigue: 8, soreness: 8, sleep: 2, stress: 6, motivation: 1 },
    };
    const stateValues = fatigueStateMap[effectiveCloudSnapshot?.fatigue_state || "ok"] ?? fatigueStateMap.ok;
    
    const availability: AvailabilityRun = {
      sleep_quality: stateValues.sleep,
      fatigue_level: stateValues.fatigue,
      muscle_soreness: stateValues.soreness,
      pain_flag: effectiveCloudSnapshot?.fatigue_state === "injured",
      mental_stress: stateValues.stress,
      motivation: stateValues.motivation,
      hr_drift_flag: effectiveCloudSnapshot?.run_hr_drift_pct 
        ? effectiveCloudSnapshot.run_hr_drift_pct > 8 
        : undefined,
      recent_load_flag: effectiveCloudSnapshot?.tss_7d 
        ? effectiveCloudSnapshot.tss_7d > 500 
        : undefined,
    };
    
    const objectiveDistance = raceType === "5K" ? "5K" 
      : raceType === "10K" ? "10K" 
      : raceType === "Semi" ? "Semi" 
      : raceType === "Marathon" ? "Marathon" 
      : "Trail";
    
    const now = new Date().toISOString();
    const profile = {
      athlete_id: currentAthlete.id,
      objective_distance: objectiveDistance as "5K" | "10K" | "Semi" | "Marathon" | "Trail",
      vo2max_run: {
        value: effectiveCloudSnapshot?.vo2max ?? currentAthlete.vo2max ?? 50,
        confidence: 0.7,
        source: "snapshot" as const,
      },
      vlamax_run: {
        value: vlamaxEffectif.value ?? 0.4,
        confidence: vlamaxEffectif.confidence,
        source: vlamaxEffectif.source === "test" ? "field_test" as const : "estimation" as const,
      },
      durability_run: {
        value: tteEffectif.tte_min,
        confidence: tteEffectif.source === "observed" ? 0.9 : 0.6,
        source: tteEffectif.source === "observed" ? "field_test" as const : "estimation" as const,
      },
      economy_run: effectiveCloudSnapshot?.run_economy_score ? {
        value: effectiveCloudSnapshot.run_economy_score,
        confidence: 0.7,
        source: "snapshot" as const,
      } : undefined,
      priority_lever: "reduce_vlamax" as const,
      lever_rationale: "Focus marathon - réduction VLamax prioritaire",
      last_calibration_date: calibrationSnapshot?.date ?? now,
      lock_duration_days: 42,
      next_recalibration_date: now,
      locked: calibrationSnapshot?.is_locked ?? false,
      created_at: now,
      updated_at: now,
      calibration_source: "auto" as const,
    };
    
    return computePotentielRun(profile, availability);
  }, [currentAthlete, effectiveCloudSnapshot, vlamaxEffectif, tteEffectif, calibrationSnapshot, raceType]);

  // Pacing Envelope Running
  const pacingEnvelope = useMemo(() => {
    if (!potentielPhysiologique) return null;
    
    const distanceMap: Record<string, RunningDistance> = {
      "10K": "10K",
      "Semi": "HM",
      "Marathon": "MARATHON",
      "Trail": "MARATHON",
    };
    const distance = distanceMap[raceType] ?? "MARATHON";
    
    let thresholdPace: number | null = effectiveCloudSnapshot?.pace_threshold_sec_per_km ?? null;
    
    if (!thresholdPace && effectiveCloudSnapshot?.vma) {
      const vmaKmh = effectiveCloudSnapshot.vma;
      const thresholdKmh = vmaKmh * 0.85;
      thresholdPace = Math.round(3600 / thresholdKmh);
    }
    
    return computePacingEnvelopeRun({
      distance,
      vlamax_run_v2: vlamaxEffectif.value,
      vo2max_run: effectiveCloudSnapshot?.vo2max ?? currentAthlete?.vo2max ?? null,
      threshold_pace: thresholdPace,
      durability_index: tteEffectif.tte_min,
      race_readiness_state: potentielPhysiologique.readiness_state,
      race_readiness_score: potentielPhysiologique.readiness_score,
      athlete_experience: "MEDIUM",
      // CHANTIER C — pont moteur unifié
      ambition: (currentAthlete as any)?.ambition ?? null,
      vma: effectiveCloudSnapshot?.vma ?? null,
    });
  }, [potentielPhysiologique, raceType, effectiveCloudSnapshot, vlamaxEffectif, tteEffectif, currentAthlete]);

  // Today's checkin for form
  const todayCheckin = useMemo(() => {
    if (!currentAthlete) return null;
    const today = new Date().toISOString().split("T")[0];
    return checkins.find(c => 
      c.athlete_id === currentAthlete.id && c.date_iso === today
    ) ?? null;
  }, [checkins, currentAthlete]);

  // Handler for availability form submission
  const handleAvailabilitySubmit = useCallback((availability: AvailabilityRun) => {
    if (!currentAthlete) return;
    
    const today = new Date().toISOString().split("T")[0];
    const existingCheckin = checkins.find(
      c => c.athlete_id === currentAthlete.id && c.date_iso === today
    );
    
    const checkinData = {
      sleep: availability.sleep_quality,
      fatigue: availability.fatigue_level,
      soreness: availability.muscle_soreness,
      pain_flag: availability.pain_flag,
      stress: availability.mental_stress,
      motivation: availability.motivation,
      notes: availability.pain_location || null,
    };
    
    if (existingCheckin) {
      updateCheckin(existingCheckin.id, checkinData);
    } else {
      addCheckin({
        athlete_id: currentAthlete.id,
        coach_id: currentAthlete.coach_id || "",
        date_iso: today,
        ...checkinData,
      });
    }
  }, [currentAthlete, checkins, addCheckin, updateCheckin]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SECTIONS RENDERERS — Pour SortableSectionsContainer
  // ═══════════════════════════════════════════════════════════════════════════════

  // Run MLSS (Modèle C calibré N=14+3) — observed + predicted + cross-validation
  const runMLSS = useMemo<AthleteDiagnostic["runMLSS"]>(() => {
    const vlamaxRun = effectiveCloudSnapshot?.vlamax_run ?? null;
    const ce = effectiveCloudSnapshot?.run_economy_score ?? null;
    const paceSec = effectiveCloudSnapshot?.pace_threshold_sec_per_km ?? null;
    const vmaKmh = effectiveCloudSnapshot?.vma ?? null;

    let observedPct: number | null = null;
    if (paceSec && paceSec > 0 && vmaKmh && vmaKmh > 0) {
      const speedKmh = 3600 / paceSec;
      const ratio = (speedKmh / vmaKmh) * 100;
      if (ratio >= 50 && ratio <= 100) observedPct = Number(ratio.toFixed(1));
    }
    const prediction = predictRunMLSSPctFromVLaCE(vlamaxRun, ce);
    const crossValidation =
      observedPct !== null && prediction
        ? crossValidateRunMLSS(observedPct, vlamaxRun, ce)
        : null;

    let effectivePct: number | null = null;
    let effectiveSource: "observed" | "predicted" | "none" = "none";
    if (observedPct !== null) {
      effectivePct = observedPct;
      effectiveSource = "observed";
    } else if (prediction) {
      effectivePct = prediction.mlssPct;
      effectiveSource = "predicted";
    }

    if (observedPct === null && prediction === null) return null;
    return { observedPct, prediction, crossValidation, effectivePct, effectiveSource };
  }, [effectiveCloudSnapshot]);

  // ─── Persistance auto Run MLSS Modèle C → calibration_evidence ────────────
  // Dédup intra-session via ref (signature) + dédup intra-jour via DB.
  const persistedRunMLSSSigRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentAthlete?.id || !currentAthlete?.coach_id) return;
    if (!runMLSS || runMLSS.effectiveSource === "none" || runMLSS.effectivePct == null) return;

    const inputs = {
      vlamaxRun: effectiveCloudSnapshot?.vlamax_run ?? null,
      runningEconomy: effectiveCloudSnapshot?.run_economy_score ?? null,
      paceThresholdSecPerKm: effectiveCloudSnapshot?.pace_threshold_sec_per_km ?? null,
      vmaKmh: effectiveCloudSnapshot?.vma ?? null,
    };
    const signature = buildRunMLSSSignature(inputs, runMLSS);
    if (persistedRunMLSSSigRef.current === signature) return;
    persistedRunMLSSSigRef.current = signature;

    persistRunMLSSTrace({
      athleteId: currentAthlete.id,
      coachId: currentAthlete.coach_id,
      inputs,
      diag: runMLSS,
    })
      .then((res) => {
        if (res && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("runmlss-trace-persisted", {
              detail: { athleteId: currentAthlete.id },
            }),
          );
        }
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.error("[RunMLSS persist] failed", err);
      });
  }, [currentAthlete?.id, currentAthlete?.coach_id, runMLSS, effectiveCloudSnapshot]);

  const sectionRenderers = useMemo(() => {
    if (!currentAthlete) return [];

    return [
      {
        id: "compass-cap",
        render: () => (
          <MetabolicCompassCAP
            data={{
              vo2max: effectiveCloudSnapshot?.vo2max ?? currentAthlete.vo2max ?? null,
              vma: effectiveCloudSnapshot?.vma ?? null,
              vlamaxCap: vlamaxEffectif.value,
              paceThresholdSecPerKm: effectiveCloudSnapshot?.pace_threshold_sec_per_km ?? null,
              paceEnduranceSecPerKm: effectiveCloudSnapshot?.run_pace_ref_sec_per_km ?? null,
              tteMin: tteEffectif.tte_min,
              hrDriftPct: effectiveCloudSnapshot?.run_hr_drift_pct ?? null,
              economyIndex: effectiveCloudSnapshot?.run_economy_score ?? null,
              economyLevel: effectiveCloudSnapshot?.run_economy_label ?? null,
              fcMax: effectiveRefs.fcMax ?? null,
              fcEndurance: effectiveCloudSnapshot?.run_hr_ref_bpm ?? null,
              sprint15sDistance: effectiveCloudSnapshot?.sprint_15s_distance ?? null,
              runningPowerMax: effectiveCloudSnapshot?.running_power_max ?? null,
              objectif: raceType || athleteGoal,
              ambition: getAthleteAmbition(currentAthlete),
              athleteAge: athleteAge,
            }}
            staffMode={staffMode}
          />
        ),
      },
      {
        id: "vlamax-cap-card",
        render: () => (
          <VLamaxCAPCard
            athleteId={currentAthlete.id}
            vlamaxValue={vlamaxEffectif.value}
            vlamaxSource={
              vlamaxEffectif.source === "test" 
                ? "test" 
                : vlamaxEffectif.source === "snapshot" 
                  ? "snapshot" 
                  : "estimation"
            }
            vlamaxConfidence={vlamaxEffectif.confidence}
            vo2max={effectiveCloudSnapshot?.vo2max ?? currentAthlete.vo2max ?? null}
            economyScore={effectiveCloudSnapshot?.run_economy_score ?? null}
          />
        ),
      },
      {
        id: "vlamax-cap-explained",
        render: () => (
          <VLamaxRunExplainedCard
            vlamax={vlamaxEffectif.value}
            age={athleteAge}
            objectif={athleteGoal}
            defaultCollapsed={false}
            traceInput={{
              runPowerThreshold: effectiveCloudSnapshot?.running_power_threshold ?? 0,
              runPower1s: effectiveCloudSnapshot?.running_power_1s ?? null,
              runPower5s: effectiveCloudSnapshot?.running_power_5s ?? null,
              runPower30s: effectiveCloudSnapshot?.running_power_30s ?? null,
              runPower60s: effectiveCloudSnapshot?.running_power_60s ?? null,
              runPower5min: effectiveCloudSnapshot?.running_power_5min ?? null,
              tteMin: effectiveCloudSnapshot?.tte_observed_min ?? null,
              weightKg: effectiveCloudSnapshot?.weight_kg ?? null,
              protocolQuality: (effectiveCloudSnapshot?.protocol_quality as 1|2|3|4|5) ?? 3,
              vma: effectiveCloudSnapshot?.vma ?? null,
              paceThresholdSecPerKm: effectiveCloudSnapshot?.pace_threshold_sec_per_km ?? null,
            }}
          />
        ),
      },
      ...(runMLSS
        ? [
            {
              id: "run-mlss-coherence",
              render: () => <RunMLSSCoherenceCard runMLSS={runMLSS} variant="card" />,
            },
            {
              id: "run-mlss-drift",
              render: () => (
                <RunMLSSDriftDetectionCard athleteId={currentAthlete.id} />
              ),
            },
          ]
        : []),
      {
        id: "calibration-summary",
        render: () => (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="h-4 w-4 text-primary" />
                Calibration Continue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {windowEvidences.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Preuves (42j)
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {calibrationSnapshot?.confidence 
                      ? `${Math.round(calibrationSnapshot.confidence * 100)}%` 
                      : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Confiance
                  </div>
                </div>
              </div>

              {calibrationSnapshot?.recalibration_recommended && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Recalibration recommandée
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 text-xs">
                      {calibrationSnapshot.recalibration_reason || 
                        "Les données suggèrent une mise à jour du profil."}
                    </p>
                  </div>
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => navigate("/cap-testing-week")}
              >
                <Zap className="h-4 w-4 mr-2" />
                Semaine de Tests CAP
              </Button>
            </CardContent>
          </Card>
        ),
      },
      {
        id: "running-economy-module",
        render: () => (
          <RunningEconomyModule
            athleteId={currentAthlete.id}
            fcMax={effectiveRefs.fcMax ?? null}
            fcMoyenneEndurance={effectiveCloudSnapshot?.run_hr_ref_bpm ?? null}
            allureEndurance={effectiveCloudSnapshot?.run_pace_ref_sec_per_km ?? null}
            deriveCardiaque={effectiveCloudSnapshot?.run_hr_drift_pct ?? null}
            tteMin={tteEffectif.tte_min}
            objectif={athleteGoal}
            vlamax={vlamaxEffectif.value}
            sport="run"
            staffMode={staffMode}
            weightKg={effectiveCloudSnapshot?.weight_kg ?? null}
            powerEndurance={effectiveCloudSnapshot?.running_power_threshold ?? null}
          />
        ),
      },
      {
        id: "running-economy-summary",
        render: () => (
          <RunningEconomySummaryCard
            snapshots={snapshots.filter(s => s.athlete_id === currentAthlete.id)}
            staffMode={staffMode}
          />
        ),
      },
      {
        id: "injury-risk-cap",
        render: () => (
          <InjuryRiskCAPCard
            riskEnvelope={capInjuryRisk}
            isStaffMode={staffMode}
          />
        ),
      },
      {
        id: "vma-targets",
        render: () => (
          <VmaTargetsCard
            objectif={athleteGoal}
            age={athleteAge}
            currentVma={effectiveCloudSnapshot?.vma ?? null}
            vo2max={effectiveCloudSnapshot?.vo2max ?? currentAthlete?.vo2max ?? null}
            vlamax={vlamaxEffectif.value}
          />
        ),
      },
      {
        id: "availability-form",
        render: () => (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Formulaire disponibilité</p>
            </CardContent>
          </Card>
        ),
      },
      {
        id: "pacing-envelope-run",
        render: () => (
          <PacingEnvelopeRunCard
            result={pacingEnvelope}
            isStaffMode={staffMode}
            simulationInputs={pacingEnvelope && potentielPhysiologique ? {
              vlamax_run_v2: vlamaxEffectif.value,
              vo2max_run: effectiveCloudSnapshot?.vo2max ?? currentAthlete?.vo2max ?? null,
              durability_index: tteEffectif.tte_min,
              fatmax_intensity: null,
              race_readiness_state: potentielPhysiologique.readiness_state,
              race_readiness_score: potentielPhysiologique.readiness_score,
              athlete_weight_kg: effectiveCloudSnapshot?.weight_kg ?? null,
            } : null}
          />
        ),
      },
      {
        id: "key-metrics-run",
        render: () => (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-primary" />
                Métriques Clés Running
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <MetricItem
                  icon={<Heart className="h-4 w-4" />}
                  label="FC Max"
                  value={effectiveRefs.fcMax ? `${effectiveRefs.fcMax} bpm` : "—"}
                />
                <MetricItem
                  icon={<Activity className="h-4 w-4" />}
                  label="VO2max"
                  value={
                    effectiveCloudSnapshot?.vo2max 
                      ? `${effectiveCloudSnapshot.vo2max.toFixed(1)} ml/kg/min`
                      : "—"
                  }
                />
                <MetricItem
                  icon={<Timer className="h-4 w-4" />}
                  label="TTE"
                  value={`${tteEffectif.tte_min} min`}
                  badge={tteEffectif.source === "observed" ? "Obs" : "Est"}
                />
                <MetricItem
                  icon={<Zap className="h-4 w-4" />}
                  label="VLamax CAP"
                  value={
                    vlamaxEffectif.value 
                      ? `${vlamaxEffectif.value.toFixed(2)} mmol/L/s`
                      : "—"
                  }
                />
              </div>

              {targets && (() => {
                const ambitionLvl = getAthleteAmbition(currentAthlete);
                const vlamaxUnified = getVLamaxRange(athleteGoal, ambitionLvl, "cap");
                return (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs text-muted-foreground mb-2">
                    Cibles {raceLabel} · {ambitionLvl}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      VLamax: {vlamaxUnified.optimal.toFixed(2)}–{vlamaxUnified.max.toFixed(2)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Durabilité: ≥{targets.durabilityMin}min
                    </Badge>
                  </div>
                </div>
                );
              })()}
            </CardContent>
          </Card>
        ),
      },
      {
        id: "quick-links",
        render: () => (
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/cap-testing-week")}>
                  <Activity className="h-4 w-4 mr-2" />
                  Semaine Tests CAP
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/running-guidance")}>
                  <Target className="h-4 w-4 mr-2" />
                  Guidage Hebdo
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/race-day")}>
                  <Shield className="h-4 w-4 mr-2" />
                  Mode Race Day
                </Button>
              </div>
            </CardContent>
          </Card>
        ),
      },
    ];
  }, [
    currentAthlete, vlamaxEffectif, effectiveCloudSnapshot, athleteAge, athleteGoal,
    windowEvidences, calibrationSnapshot, navigate, effectiveRefs, tteEffectif,
    staffMode, snapshots, capInjuryRisk, handleAvailabilitySubmit, todayCheckin,
    potentielPhysiologique, raceLabel, pacingEnvelope, targets, runMLSS,
  ]);

  // Redirect si pas en Running Focus Mode
  if (!isRunningOnly) {
    return (
      <SidebarLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        staffMode={staffMode}
        onStaffModeChange={setStaffMode}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Mode Course non actif</h1>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Cette page est réservée aux athlètes avec un objectif de course à pied 
            (5K, 10K, Semi-Marathon, Marathon, Trail).
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au Dashboard
          </Button>
        </div>
      </SidebarLayout>
    );
  }

  if (!currentAthlete) {
    return (
      <SidebarLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        staffMode={staffMode}
        onStaffModeChange={setStaffMode}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <Activity className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-xl font-bold mb-2">Aucun athlète sélectionné</h1>
          <p className="text-muted-foreground mb-4">
            Sélectionnez un athlète pour voir son profil course à pied.
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au Dashboard
          </Button>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      staffMode={staffMode}
      onStaffModeChange={setStaffMode}
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{currentAthlete.nom}</h1>
                <RunningFocusModeIndicator showDetails />
              </div>
              <p className="text-muted-foreground">
                Profil Physiologique Course à Pied
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isLocked && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Profil Verrouillé
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Target className="h-3 w-3" />
              {raceLabel} ({distanceKm}km)
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Activity className="h-3 w-3" />
              {windowEvidences.length} preuves terrain
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Sections réorganisables */}
        <SortableSectionsContainer
          tabId="running-profile"
          tabLabel="Profil Running"
          sections={sectionRenderers}
          className="grid-layout-running"
        />
      </div>
    </SidebarLayout>
  );
}

// Composant utilitaire pour les métriques
function MetricItem({ 
  icon, 
  label, 
  value, 
  badge 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
      <div className="text-muted-foreground shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
      {badge && (
        <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">
          {badge}
        </Badge>
      )}
    </div>
  );
}
