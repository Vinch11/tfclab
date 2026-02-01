/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RUNNING PROFILE PAGE — Two For Coaching Lab™
 * 
 * Page dédiée au profil physiologique course à pied.
 * Affiche tous les composants CAP spécifiques au Running Focus Mode.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback } from "react";
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
import { RaceReadinessRunCard } from "@/components/RaceReadinessRunCard";
import { RaceReadinessRunForm } from "@/components/RaceReadinessRunForm";

// Logique et calculs
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeTTEEffectif } from "@/lib/tteEffectif";
import { getEffectiveRefs } from "@/lib/effectiveRefs";
import { calculateAge } from "@/lib/ageAdjustment";
import { computeCAPInjuryRisk } from "@/lib/v2/injuryRiskUnified";
import { computeFatigueEffectif } from "@/lib/fatigueEffectif";
import { computeRaceReadinessRun, type AvailabilityRun } from "@/lib/v2/raceReadinessRunning";
import { computePacingEnvelopeRun, type RunningDistance } from "@/lib/v2/pacingEnvelopeRunning";
import { PacingEnvelopeRunCard } from "@/components/PacingEnvelopeRunCard";

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
    // Map context athlete to DbAthlete format for effectiveRefs
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
    
    // Active snapshot ou dernier
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

  // Fatigue Effectif
  const fatigueResult = useMemo(() => {
    const athleteCheckins = checkins.filter(c => c.athlete_id === currentAthlete?.id);
    const latestCheckin = athleteCheckins.length > 0 
      ? [...athleteCheckins].sort((a, b) => b.date_iso.localeCompare(a.date_iso))[0]
      : null;
    
    return computeFatigueEffectif({
      tss7d: effectiveCloudSnapshot?.tss_7d ?? null,
      tss7dHabituel: null,
      fatiguePercue: latestCheckin?.fatigue ?? null,
      tteEffectif: tteEffectif,
      raceReadiness: null,
      vlamaxEffectif: vlamaxEffectif,
      age: athleteAge,
      objectif: athleteGoal,
    });
  }, [checkins, currentAthlete?.id, effectiveCloudSnapshot, tteEffectif, vlamaxEffectif, athleteAge, athleteGoal]);

  // CAP Injury Risk
  const capInjuryRisk = useMemo(() => {
    return computeCAPInjuryRisk({
      vlamaxValue: vlamaxEffectif.value,
      economyLevel: effectiveCloudSnapshot?.run_economy_label ?? null,
      tteMin: tteEffectif.tte_min,
      fatiguePct: fatigueResult?.score ?? 40, // Fallback si fatigueResult est undefined
      tss7d: effectiveCloudSnapshot?.tss_7d ?? null,
      runLoad7d: null,
      age: athleteAge,
      objectif: athleteGoal,
    });
  }, [vlamaxEffectif, effectiveCloudSnapshot, tteEffectif, fatigueResult, athleteAge, athleteGoal]);

  // Race Readiness Running
  const raceReadiness = useMemo(() => {
    if (!currentAthlete) return null;
    
    // Get latest checkin for availability inputs
    const athleteCheckins = checkins.filter(c => c.athlete_id === currentAthlete.id);
    const latestCheckin = athleteCheckins.length > 0 
      ? [...athleteCheckins].sort((a, b) => b.date_iso.localeCompare(a.date_iso))[0]
      : null;
    
    // Build availability from latest checkin or defaults
    const availability: AvailabilityRun = {
      sleep_quality: latestCheckin?.sleep ?? 3,
      fatigue_level: latestCheckin?.fatigue ?? 3,
      muscle_soreness: latestCheckin?.soreness ?? 1,
      pain_flag: latestCheckin?.pain_flag ?? false,
      mental_stress: latestCheckin?.stress ?? 3,
      motivation: latestCheckin?.motivation ?? 3,
      hr_drift_flag: effectiveCloudSnapshot?.run_hr_drift_pct 
        ? effectiveCloudSnapshot.run_hr_drift_pct > 8 
        : undefined,
      recent_load_flag: effectiveCloudSnapshot?.tss_7d 
        ? effectiveCloudSnapshot.tss_7d > 500 
        : undefined,
    };
    
    // Build running physio profile (full RunningPhysioProfile structure)
    const objectiveDistance = raceType === "5K" ? "5K" 
      : raceType === "10K" ? "10K" 
      : raceType === "Semi" ? "Semi" 
      : raceType === "Marathon" ? "Marathon" 
      : "Trail";
    
    const now = new Date().toISOString();
    const profile = {
      athlete_id: currentAthlete.id,
      objective_distance: objectiveDistance as "5K" | "10K" | "Semi" | "Marathon" | "Trail",
      
      // Métriques physiologiques CAP verrouillées
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
      
      // Levier prioritaire
      priority_lever: "reduce_vlamax" as const,
      lever_rationale: "Focus marathon - réduction VLamax prioritaire",
      
      // Gestion verrouillage
      last_calibration_date: calibrationSnapshot?.date ?? now,
      lock_duration_days: 42,
      next_recalibration_date: now,
      locked: calibrationSnapshot?.is_locked ?? false,
      
      // Métadonnées
      created_at: now,
      updated_at: now,
      calibration_source: "auto" as const,
    };
    
    return computeRaceReadinessRun(profile, availability);
  }, [currentAthlete, checkins, effectiveCloudSnapshot, vlamaxEffectif, tteEffectif, calibrationSnapshot, raceType]);

  // Pacing Envelope Running
  const pacingEnvelope = useMemo(() => {
    if (!raceReadiness) return null;
    
    // Map raceType to RunningDistance
    const distanceMap: Record<string, RunningDistance> = {
      "10K": "10K",
      "Semi": "HM",
      "Marathon": "MARATHON",
      "Trail": "MARATHON", // Treat Trail like Marathon for pacing
    };
    const distance = distanceMap[raceType] ?? "MARATHON";
    
    // Calculate threshold pace from effectiveCloudSnapshot or estimate from VMA
    let thresholdPace: number | null = effectiveCloudSnapshot?.pace_threshold_sec_per_km ?? null;
    
    // If no threshold pace, estimate from VMA (threshold ≈ 85% VMA)
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
      race_readiness_state: raceReadiness.readiness_state,
      race_readiness_score: raceReadiness.readiness_score,
      athlete_experience: "MEDIUM", // Default, could be extended with athlete data
    });
  }, [raceReadiness, raceType, effectiveCloudSnapshot, vlamaxEffectif, tteEffectif, currentAthlete]);

  // Handler for availability form submission
  const handleAvailabilitySubmit = useCallback((availability: AvailabilityRun) => {
    if (!currentAthlete) return;
    
    const today = new Date().toISOString().split("T")[0];
    
    // Check if there's already a checkin for today
    const todayCheckin = checkins.find(
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
    
    if (todayCheckin) {
      // Update existing checkin
      updateCheckin(todayCheckin.id, checkinData);
    } else {
      // Add new checkin - use athlete's coach_id
      addCheckin({
        athlete_id: currentAthlete.id,
        coach_id: currentAthlete.coach_id || "",
        date_iso: today,
        ...checkinData,
      });
    }
  }, [currentAthlete, checkins, addCheckin, updateCheckin]);

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
      <div className="space-y-6 max-w-6xl mx-auto">
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

        {/* Grid principale */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonne gauche - VLamax CAP & Calibration */}
          <div className="space-y-6">
            {/* VLamax CAP Card */}
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

            {/* VLamax CAP Expliquée */}
            <VLamaxRunExplainedCard
              vlamax={vlamaxEffectif.value}
              age={athleteAge}
              objectif={athleteGoal}
              defaultCollapsed={false}
            />

            {/* Calibration Summary */}
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
          </div>

          {/* Colonne droite - Économie & Risque */}
          <div className="space-y-6">
            {/* Running Economy Module */}
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
            />

            {/* Running Economy Summary */}
            <RunningEconomySummaryCard
              snapshots={snapshots.filter(s => s.athlete_id === currentAthlete.id)}
              staffMode={staffMode}
            />

            {/* Injury Risk CAP Card */}
            <InjuryRiskCAPCard
              riskEnvelope={capInjuryRisk}
              isStaffMode={staffMode}
            />

            {/* Formulaire de disponibilité quotidienne */}
            <RaceReadinessRunForm
              onSubmit={handleAvailabilitySubmit}
              initialValues={{
                sleep_quality: checkins.find(c => 
                  c.athlete_id === currentAthlete.id && 
                  c.date_iso === new Date().toISOString().split("T")[0]
                )?.sleep ?? 3,
                fatigue_level: checkins.find(c => 
                  c.athlete_id === currentAthlete.id && 
                  c.date_iso === new Date().toISOString().split("T")[0]
                )?.fatigue ?? 3,
                muscle_soreness: checkins.find(c => 
                  c.athlete_id === currentAthlete.id && 
                  c.date_iso === new Date().toISOString().split("T")[0]
                )?.soreness ?? 0,
                pain_flag: checkins.find(c => 
                  c.athlete_id === currentAthlete.id && 
                  c.date_iso === new Date().toISOString().split("T")[0]
                )?.pain_flag ?? false,
                mental_stress: checkins.find(c => 
                  c.athlete_id === currentAthlete.id && 
                  c.date_iso === new Date().toISOString().split("T")[0]
                )?.stress ?? 3,
                motivation: checkins.find(c => 
                  c.athlete_id === currentAthlete.id && 
                  c.date_iso === new Date().toISOString().split("T")[0]
                )?.motivation ?? 3,
              }}
            />

            {/* Race Readiness Running Card */}
            <RaceReadinessRunCard
              readiness={raceReadiness}
              objective={raceLabel || athleteGoal}
              isStaffMode={staffMode}
            />

            {/* Pacing Envelope Running Card */}
            <PacingEnvelopeRunCard
              result={pacingEnvelope}
              isStaffMode={staffMode}
            />

            {/* Métriques clés */}
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

                {targets && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-xs text-muted-foreground mb-2">
                      Cibles {raceLabel}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        VLamax: {targets.vlamax.optimal.toFixed(2)}–{targets.vlamax.max.toFixed(2)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Durabilité: ≥{targets.durabilityMin}min
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Liens rapides */}
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
    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
      <div className="text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
      {badge && (
        <Badge variant="secondary" className="text-[10px] px-1">
          {badge}
        </Badge>
      )}
    </div>
  );
}
